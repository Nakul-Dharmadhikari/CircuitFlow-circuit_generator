import type { CircuitComponent, Pin } from '../../types/circuit';
import type { Box, PinEndpoint, Point, Vector2D } from './geometry';
import { simplifyOrthogonalPoints } from './geometry';
import { getLaneOffset } from './wireLanes';

/**
 * Computes pin world coordinates and outward normal departure vector
 * Accounts for component position, width, height, rotation, and pin orientation.
 * Fully dynamic: supports standard gates, ICs (14/16/20/24 pin), custom ICs, and trainer ports.
 */
export function getPinEndpoint(
  compId: string,
  pinId: string,
  components: CircuitComponent[]
): PinEndpoint | null {
  const comp = components.find((c) => c.id === compId);
  if (!comp) return null;

  const pin: Pin | undefined =
    comp.inputs.find((p) => p.id === pinId) ||
    comp.outputs.find((p) => p.id === pinId);

  if (!pin) return null;

  const worldX = comp.x + pin.x;
  const worldY = comp.y + pin.y;

  let dir: Vector2D = { dx: 0, dy: 1 };

  // 1. Horizontal DIP Integrated Circuits (e.g. 74xx, 555, Custom ICs, IC1..IC8+)
  if (comp.type.startsWith('ic_') || comp.type === 'custom_ic') {
    if (pin.y === 0 || pin.y <= 6) {
      dir = { dx: 0, dy: -1 }; // Top row pins route UP
    } else {
      dir = { dx: 0, dy: 1 }; // Bottom row pins route DOWN
    }
  }
  // 2. Trainer Kit Hardware Ports
  else if (comp.customProps?.isTrainerOutput) {
    dir = { dx: 0, dy: 1 }; // Output probe lamps route DOWN towards breadboard
  } else if (
    comp.customProps?.isTrainerInput ||
    comp.customProps?.isTrainerClock ||
    comp.customProps?.isTrainerGnd
  ) {
    dir = { dx: 0, dy: -1 }; // Input switches & clock route UP towards breadboard
  } else if (comp.customProps?.isTrainerVcc) {
    dir = { dx: 0, dy: 1 };
  }
  // 3. Logic Gates & MSI Modules (Respecting optional component rotation)
  else {
    const rotation = comp.rotation || 0;
    let baseDir: Vector2D;

    if (pin.x <= 4) {
      baseDir = { dx: -1, dy: 0 }; // Left-facing pins
    } else if (pin.x >= comp.width - 4) {
      baseDir = { dx: 1, dy: 0 }; // Right-facing pins
    } else if (pin.y <= 4) {
      baseDir = { dx: 0, dy: -1 }; // Top-facing pins
    } else {
      baseDir = { dx: 0, dy: 1 }; // Bottom-facing pins
    }

    // Apply rotation transformation if component is rotated (90, 180, 270 deg)
    if (rotation === 90) {
      dir = { dx: -baseDir.dy, dy: baseDir.dx };
    } else if (rotation === 180) {
      dir = { dx: -baseDir.dx, dy: -baseDir.dy };
    } else if (rotation === 270) {
      dir = { dx: baseDir.dy, dy: -baseDir.dx };
    } else {
      dir = baseDir;
    }
  }

  return {
    x: worldX,
    y: worldY,
    dir,
    compId,
    pinId,
  };
}

/**
 * Automatically computes an obstacle-avoiding orthogonal Manhattan wire route
 * Inputs:
 *  - start: departure pin endpoint
 *  - end: arrival pin endpoint
 *  - wireIndex: index for multi-lane spacing
 *  - obstacles: bounding boxes of intermediate components
 * Output:
 *  - Array of orthogonal points (90-degree turns only, no curved loops)
 */
export function calculateOrthogonalWireRoute(
  start: PinEndpoint,
  end: PinEndpoint,
  wireIndex: number = 0,
  obstacles: Box[] = []
): Point[] {
  const leadLength = 16;
  const laneOffset = getLaneOffset(wireIndex, 9, 10);

  // Stub points extending normal to pins
  const p0: Point = { x: start.x, y: start.y };
  const p1: Point = {
    x: start.x + start.dir.dx * leadLength,
    y: start.y + start.dir.dy * leadLength,
  };

  const pN: Point = { x: end.x, y: end.y };
  const pNMinus1: Point = {
    x: end.x + end.dir.dx * leadLength,
    y: end.y + end.dir.dy * leadLength,
  };

  // Case 1: Both pins vertical
  if (start.dir.dy !== 0 && end.dir.dy !== 0) {
    let channelY: number;

    if (start.dir.dy > 0 && end.dir.dy > 0) {
      // Both exit DOWN -> loop below both pins
      channelY = Math.max(p1.y, pNMinus1.y) + 18 + Math.abs(laneOffset);
    } else if (start.dir.dy < 0 && end.dir.dy < 0) {
      // Both exit UP -> loop above both pins
      channelY = Math.min(p1.y, pNMinus1.y) - 18 - Math.abs(laneOffset);
    } else {
      // One exits UP, one exits DOWN
      channelY = Math.round((p1.y + pNMinus1.y) / 20) * 10 + laneOffset;
    }

    // Check if channel segment collides with any obstacles
    for (const obs of obstacles) {
      const segMinX = Math.min(p1.x, pNMinus1.x);
      const segMaxX = Math.max(p1.x, pNMinus1.x);

      if (
        channelY >= obs.y &&
        channelY <= obs.y + obs.height &&
        segMaxX >= obs.x &&
        segMinX <= obs.x + obs.width
      ) {
        // Detour channel outside obstacle
        if (start.dir.dy < 0) {
          channelY = Math.min(channelY, obs.y - 14);
        } else {
          channelY = Math.max(channelY, obs.y + obs.height + 14);
        }
      }
    }

    const route: Point[] = [
      p0,
      p1,
      { x: p1.x, y: channelY },
      { x: pNMinus1.x, y: channelY },
      pNMinus1,
      pN,
    ];

    return simplifyOrthogonalPoints(route);
  }

  // Case 2: Both pins horizontal
  if (start.dir.dx !== 0 && end.dir.dx !== 0) {
    let channelX: number;

    if (start.dir.dx > 0 && end.dir.dx < 0 && p1.x <= pNMinus1.x) {
      // Standard left-to-right flow
      channelX = Math.round((p1.x + pNMinus1.x) / 20) * 10 + laneOffset;
    } else if (start.dir.dx > 0 && end.dir.dx > 0) {
      channelX = Math.max(p1.x, pNMinus1.x) + 18 + Math.abs(laneOffset);
    } else if (start.dir.dx < 0 && end.dir.dx < 0) {
      channelX = Math.min(p1.x, pNMinus1.x) - 18 - Math.abs(laneOffset);
    } else {
      // Feedback loop (right output loops back to left input)
      channelX = Math.max(p1.x, pNMinus1.x) + 24 + Math.abs(laneOffset);
      const bypassY = Math.min(p1.y, pNMinus1.y) - 24 - Math.abs(laneOffset);

      const route: Point[] = [
        p0,
        p1,
        { x: channelX, y: p1.y },
        { x: channelX, y: bypassY },
        { x: pNMinus1.x - 20, y: bypassY },
        { x: pNMinus1.x - 20, y: pNMinus1.y },
        pNMinus1,
        pN,
      ];
      return simplifyOrthogonalPoints(route);
    }

    // Obstacle avoidance for vertical channel
    for (const obs of obstacles) {
      const segMinY = Math.min(p1.y, pNMinus1.y);
      const segMaxY = Math.max(p1.y, pNMinus1.y);

      if (
        channelX >= obs.x &&
        channelX <= obs.x + obs.width &&
        segMaxY >= obs.y &&
        segMinY <= obs.y + obs.height
      ) {
        if (start.dir.dx > 0) {
          channelX = Math.max(channelX, obs.x + obs.width + 14);
        } else {
          channelX = Math.min(channelX, obs.x - 14);
        }
      }
    }

    const route: Point[] = [
      p0,
      p1,
      { x: channelX, y: p1.y },
      { x: channelX, y: pNMinus1.y },
      pNMinus1,
      pN,
    ];

    return simplifyOrthogonalPoints(route);
  }

  // Case 3: Mixed orientations (Horizontal + Vertical)
  if (start.dir.dx !== 0 && end.dir.dy !== 0) {
    const corner: Point = { x: pNMinus1.x, y: p1.y };
    const route: Point[] = [p0, p1, corner, pNMinus1, pN];
    return simplifyOrthogonalPoints(route);
  }

  if (start.dir.dy !== 0 && end.dir.dx !== 0) {
    const corner: Point = { x: p1.x, y: pNMinus1.y };
    const route: Point[] = [p0, p1, corner, pNMinus1, pN];
    return simplifyOrthogonalPoints(route);
  }

  // Safe fallback Manhattan route
  const midX = Math.round((start.x + end.x) / 2);
  const fallbackRoute: Point[] = [
    p0,
    { x: midX, y: start.y },
    { x: midX, y: end.y },
    pN,
  ];

  return simplifyOrthogonalPoints(fallbackRoute);
}

/**
 * Filter affected wires connected to a specific set of moved/updated component IDs
 */
export function getAffectedWires(wires: { fromCompId: string; toCompId: string; id: string }[], compIds: string[]): string[] {
  const set = new Set(compIds);
  return wires.filter((w) => set.has(w.fromCompId) || set.has(w.toCompId)).map((w) => w.id);
}
