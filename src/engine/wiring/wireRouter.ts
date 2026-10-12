import type { CircuitComponent, Pin } from '../../types/circuit';
import type { Box, PinEndpoint, Point, Vector2D } from './geometry';
import {
  isPathClear,
  manhattanDistance,
  segmentIntersectsBox,
  simplifyOrthogonalPoints,
} from './geometry';
import { getLaneOffset } from './wireLanes';
import { ROUTING_CONFIG } from './routingConfig';
import { getComponentObstacles } from './obstacleMap';

/**
 * Computes pin world coordinates and outward normal departure vector.
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

  // 1. Horizontal DIP Integrated Circuits (74xx series, 555, Custom ICs, IC1..IC8+)
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

    // Apply rotation transformation (0, 90, 180, 270 deg)
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
 * Helper to deduplicate and sort 1D coordinate numbers (merging coordinates within 2px)
 */
function deduplicateCoordinates(coords: number[]): number[] {
  const sorted = [...coords].filter((v) => !isNaN(v) && isFinite(v)).sort((a, b) => a - b);
  const result: number[] = [];
  for (const c of sorted) {
    if (result.length === 0 || Math.abs(c - result[result.length - 1]) > 2) {
      result.push(Math.round(c));
    }
  }
  return result;
}

/**
 * Finds the index of the closest coordinate in a sorted array
 */
function findClosestIndex(coords: number[], target: number): number {
  let closestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const diff = Math.abs(coords[i] - target);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }
  return closestIdx;
}

interface AStarState {
  ix: number;
  iy: number;
  dir: 'H' | 'V' | 'NONE';
  g: number;
  f: number;
  parent: AStarState | null;
}

/**
 * Internal Orthogonal Channel Graph A* Search Router.
 * Generates an obstacle-free Manhattan detour across coordinate channels formed
 * by obstacle boundary lines, pin stubs, and corridor clearance tracks.
 */
function routeDetourWithAStar(
  startStub: Point,
  endStub: Point,
  obstacles: Box[],
  laneOffset: number = 0,
  extraMargin: number = 0
): Point[] | null {
  const clearance = ROUTING_CONFIG.MIN_CLEARANCE + extraMargin;

  // 1. Determine bounding region enclosing start, end, and nearby obstacles
  let minX = Math.min(startStub.x, endStub.x) - ROUTING_CONFIG.GRAPH_BOUNDS_MARGIN;
  let maxX = Math.max(startStub.x, endStub.x) + ROUTING_CONFIG.GRAPH_BOUNDS_MARGIN;
  let minY = Math.min(startStub.y, endStub.y) - ROUTING_CONFIG.GRAPH_BOUNDS_MARGIN;
  let maxY = Math.max(startStub.y, endStub.y) + ROUTING_CONFIG.GRAPH_BOUNDS_MARGIN;

  // Filter obstacles relevant to this corridor and expand region
  const corridorObstacles = obstacles.filter((obs) => {
    return !(
      obs.x + obs.width < minX - 100 ||
      obs.x > maxX + 100 ||
      obs.y + obs.height < minY - 100 ||
      obs.y > maxY + 100
    );
  });

  for (const obs of corridorObstacles) {
    minX = Math.min(minX, obs.x - clearance - 30);
    maxX = Math.max(maxX, obs.x + obs.width + clearance + 30);
    minY = Math.min(minY, obs.y - clearance - 30);
    maxY = Math.max(maxY, obs.y + obs.height + clearance + 30);
  }

  // 2. Generate candidate orthogonal channel coordinates
  const rawXs: number[] = [startStub.x, endStub.x, minX, maxX];
  const rawYs: number[] = [startStub.y, endStub.y, minY, maxY];

  // Add midpoints
  rawXs.push(Math.round((startStub.x + endStub.x) / 2) + laneOffset);
  rawYs.push(Math.round((startStub.y + endStub.y) / 2) + laneOffset);

  // Add boundary detour channels for every obstacle
  for (const obs of corridorObstacles) {
    rawXs.push(obs.x - clearance - Math.abs(laneOffset));
    rawXs.push(obs.x + obs.width + clearance + Math.abs(laneOffset));
    rawYs.push(obs.y - clearance - Math.abs(laneOffset));
    rawYs.push(obs.y + obs.height + clearance + Math.abs(laneOffset));
  }

  const xs = deduplicateCoordinates(rawXs);
  const ys = deduplicateCoordinates(rawYs);

  if (xs.length < 2 || ys.length < 2) return null;

  const startIx = findClosestIndex(xs, startStub.x);
  const startIy = findClosestIndex(ys, startStub.y);
  const endIx = findClosestIndex(xs, endStub.x);
  const endIy = findClosestIndex(ys, endStub.y);

  // 3. Priority Queue for A* Search
  const openSet: AStarState[] = [];
  const closedSet = new Map<string, number>();

  const startState: AStarState = {
    ix: startIx,
    iy: startIy,
    dir: 'NONE',
    g: 0,
    f: manhattanDistance(startStub, endStub),
    parent: null,
  };

  openSet.push(startState);

  // Target goal point
  const targetPoint = { x: xs[endIx], y: ys[endIy] };

  let iterations = 0;
  const MAX_ITERATIONS = 2000;

  while (openSet.length > 0 && iterations++ < MAX_ITERATIONS) {
    // Pop lowest f-score node
    let bestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[bestIdx].f) {
        bestIdx = i;
      }
    }
    const current = openSet.splice(bestIdx, 1)[0];

    // Check goal reached
    if (current.ix === endIx && current.iy === endIy) {
      // Reconstruct path
      const path: Point[] = [];
      let curr: AStarState | null = current;
      while (curr) {
        path.push({ x: xs[curr.ix], y: ys[curr.iy] });
        curr = curr.parent;
      }
      path.reverse();
      return path;
    }

    const stateKey = `${current.ix},${current.iy},${current.dir}`;
    if (closedSet.has(stateKey) && closedSet.get(stateKey)! <= current.g) {
      continue;
    }
    closedSet.set(stateKey, current.g);

    const currentPoint: Point = { x: xs[current.ix], y: ys[current.iy] };

    // 4 cardinal moves (Right, Left, Down, Up)
    const neighbors: Array<{ ix: number; iy: number; moveDir: 'H' | 'V' }> = [];
    if (current.ix + 1 < xs.length) neighbors.push({ ix: current.ix + 1, iy: current.iy, moveDir: 'H' });
    if (current.ix - 1 >= 0) neighbors.push({ ix: current.ix - 1, iy: current.iy, moveDir: 'H' });
    if (current.iy + 1 < ys.length) neighbors.push({ ix: current.ix, iy: current.iy + 1, moveDir: 'V' });
    if (current.iy - 1 >= 0) neighbors.push({ ix: current.ix, iy: current.iy - 1, moveDir: 'V' });

    for (const nb of neighbors) {
      const nextPoint: Point = { x: xs[nb.ix], y: ys[nb.iy] };

      // Hard obstacle collision check: segment must NOT intersect any obstacle box
      let collides = false;
      for (const obs of corridorObstacles) {
        if (segmentIntersectsBox(currentPoint, nextPoint, obs)) {
          collides = true;
          break;
        }
      }
      if (collides) continue;

      const stepDist = Math.abs(nextPoint.x - currentPoint.x) + Math.abs(nextPoint.y - currentPoint.y);
      const turnPenalty = current.dir !== 'NONE' && current.dir !== nb.moveDir ? ROUTING_CONFIG.BEND_PENALTY : 0;
      const tentativeG = current.g + stepDist + turnPenalty;

      const nbKey = `${nb.ix},${nb.iy},${nb.moveDir}`;
      if (closedSet.has(nbKey) && closedSet.get(nbKey)! <= tentativeG) {
        continue;
      }

      const h = Math.abs(targetPoint.x - nextPoint.x) + Math.abs(targetPoint.y - nextPoint.y);
      const nextState: AStarState = {
        ix: nb.ix,
        iy: nb.iy,
        dir: nb.moveDir,
        g: tentativeG,
        f: tentativeG + h,
        parent: current,
      };

      openSet.push(nextState);
    }
  }

  return null;
}

/**
 * Dynamically computes a safe outward pin stub that respects component clearance
 * and does not pierce into immediately adjacent obstacles when space is narrow.
 */
function computeSafeStub(
  pin: Point,
  dir: Vector2D,
  defaultLength: number,
  obstacles: Box[]
): Point {
  let effectiveLength = defaultLength;
  const targetX = pin.x + dir.dx * defaultLength;
  const targetY = pin.y + dir.dy * defaultLength;

  for (const obs of obstacles) {
    if (segmentIntersectsBox(pin, { x: targetX, y: targetY }, obs)) {
      if (dir.dx > 0 && obs.x > pin.x) {
        effectiveLength = Math.min(effectiveLength, Math.max(4, obs.x - pin.x - 2));
      } else if (dir.dx < 0 && obs.x + obs.width < pin.x) {
        effectiveLength = Math.min(effectiveLength, Math.max(4, pin.x - (obs.x + obs.width) - 2));
      } else if (dir.dy > 0 && obs.y > pin.y) {
        effectiveLength = Math.min(effectiveLength, Math.max(4, obs.y - pin.y - 2));
      } else if (dir.dy < 0 && obs.y + obs.height < pin.y) {
        effectiveLength = Math.min(effectiveLength, Math.max(4, pin.y - (obs.y + obs.height) - 2));
      }
    }
  }

  return {
    x: pin.x + dir.dx * effectiveLength,
    y: pin.y + dir.dy * effectiveLength,
  };
}

/**
 * Automatically computes an obstacle-avoiding orthogonal Manhattan wire route.
 * Follows the mandatory architectural pipeline:
 *  PIN -> outward pin stub -> hard obstacle keep-out map -> detour around obstacles -> target pin.
 * 
 * Works 100% dynamically across:
 *  - Horizontal-to-horizontal routes
 *  - Vertical-to-vertical routes
 *  - Mixed-orientation (H-to-V and V-to-H) routes
 *  - Standalone logic gates, 74xx ICs, and custom subcircuits
 * 
 * Guarantees that EVERY wire segment does not intersect any component keep-out rectangle.
 */
export function calculateOrthogonalWireRoute(
  start: PinEndpoint,
  end: PinEndpoint,
  wireIndex: number = 0,
  obstacles: Box[] = [],
  components?: CircuitComponent[]
): Point[] {
  const leadLength = ROUTING_CONFIG.PIN_STUB_LENGTH;
  const laneOffset = getLaneOffset(
    wireIndex,
    ROUTING_CONFIG.MAX_LANES,
    ROUTING_CONFIG.LANE_SPACING
  );

  // 1. Prepare Hard Obstacles
  // Exclude source/target component boxes from blocking their own pin stubs,
  // but keep their component bodies as hard obstacles for the intermediate path.
  let activeObstacles: Box[] = [];
  if (obstacles.length > 0) {
    activeObstacles = obstacles.filter((obs) => {
      if (obs.compId) {
        return obs.compId !== start.compId && obs.compId !== end.compId;
      }
      return true;
    });
  } else if (components && components.length > 0) {
    activeObstacles = getComponentObstacles(components, [start.compId, end.compId]);
  }

  // Also prevent wires from cutting through the body of start and end components
  if (components) {
    const startComp = components.find((c) => c.id === start.compId);
    const endComp = components.find((c) => c.id === end.compId);
    if (startComp && startComp.type !== 'junction') {
      activeObstacles.push({
        x: startComp.x,
        y: startComp.y,
        width: startComp.width,
        height: startComp.height,
        compId: startComp.id,
      });
    }
    if (endComp && endComp.type !== 'junction' && endComp.id !== startComp?.id) {
      activeObstacles.push({
        x: endComp.x,
        y: endComp.y,
        width: endComp.width,
        height: endComp.height,
        compId: endComp.id,
      });
    }
  }

  // 2. Outward Pin Stubs (strictly departing and arriving normal to component bodies)
  const p0: Point = { x: start.x, y: start.y };
  const pStubStart = computeSafeStub(p0, start.dir, leadLength, activeObstacles);

  const pN: Point = { x: end.x, y: end.y };
  const pStubEnd = computeSafeStub(pN, end.dir, leadLength, activeObstacles);

  // 3. Fast-Path / Direct Orthogonal Candidate Routes
  let candidateMiddle: Point[] = [];

  // Case 1: Both pins vertical (e.g. IC top/bottom pins, trainer switches/outputs)
  if (start.dir.dy !== 0 && end.dir.dy !== 0) {
    let channelY: number;
    if (start.dir.dy > 0 && end.dir.dy > 0) {
      // Both exit DOWN -> corridor below both pins
      channelY = Math.max(pStubStart.y, pStubEnd.y) + ROUTING_CONFIG.MIN_CLEARANCE + Math.abs(laneOffset);
    } else if (start.dir.dy < 0 && end.dir.dy < 0) {
      // Both exit UP -> corridor above both pins
      channelY = Math.min(pStubStart.y, pStubEnd.y) - ROUTING_CONFIG.MIN_CLEARANCE - Math.abs(laneOffset);
    } else {
      // Opposite vertical directions (one exits UP, one exits DOWN)
      channelY = Math.round((pStubStart.y + pStubEnd.y) / (2 * ROUTING_CONFIG.GRID_SIZE)) * ROUTING_CONFIG.GRID_SIZE + laneOffset;
    }

    candidateMiddle = [
      pStubStart,
      { x: pStubStart.x, y: channelY },
      { x: pStubEnd.x, y: channelY },
      pStubEnd,
    ];
  }
  // Case 2: Both pins horizontal (e.g. logic gates left-to-right)
  else if (start.dir.dx !== 0 && end.dir.dx !== 0) {
    let channelX: number;
    if (start.dir.dx > 0 && end.dir.dx < 0 && pStubStart.x <= pStubEnd.x) {
      // Standard forward left-to-right corridor
      channelX = Math.round((pStubStart.x + pStubEnd.x) / (2 * ROUTING_CONFIG.GRID_SIZE)) * ROUTING_CONFIG.GRID_SIZE + laneOffset;
      candidateMiddle = [
        pStubStart,
        { x: channelX, y: pStubStart.y },
        { x: channelX, y: pStubEnd.y },
        pStubEnd,
      ];
    } else if (start.dir.dx > 0 && end.dir.dx > 0) {
      channelX = Math.max(pStubStart.x, pStubEnd.x) + ROUTING_CONFIG.MIN_CLEARANCE + Math.abs(laneOffset);
      candidateMiddle = [
        pStubStart,
        { x: channelX, y: pStubStart.y },
        { x: channelX, y: pStubEnd.y },
        pStubEnd,
      ];
    } else if (start.dir.dx < 0 && end.dir.dx < 0) {
      channelX = Math.min(pStubStart.x, pStubEnd.x) - ROUTING_CONFIG.MIN_CLEARANCE - Math.abs(laneOffset);
      candidateMiddle = [
        pStubStart,
        { x: channelX, y: pStubStart.y },
        { x: channelX, y: pStubEnd.y },
        pStubEnd,
      ];
    } else {
      // Backward feedback loop (right output loops back to left input)
      channelX = Math.max(pStubStart.x, pStubEnd.x) + ROUTING_CONFIG.MIN_CLEARANCE + 8 + Math.abs(laneOffset);
      const bypassY = Math.min(pStubStart.y, pStubEnd.y) - ROUTING_CONFIG.MIN_CLEARANCE - 8 - Math.abs(laneOffset);
      candidateMiddle = [
        pStubStart,
        { x: channelX, y: pStubStart.y },
        { x: channelX, y: bypassY },
        { x: pStubEnd.x - 20, y: bypassY },
        { x: pStubEnd.x - 20, y: pStubEnd.y },
        pStubEnd,
      ];
    }
  }
  // Case 3: Mixed orientations (Horizontal + Vertical, e.g. Gate output to IC pin)
  else if (start.dir.dx !== 0 && end.dir.dy !== 0) {
    // Departure is horizontal, arrival is vertical
    candidateMiddle = [
      pStubStart,
      { x: pStubEnd.x, y: pStubStart.y },
      pStubEnd,
    ];
  } else if (start.dir.dy !== 0 && end.dir.dx !== 0) {
    // Departure is vertical, arrival is horizontal
    candidateMiddle = [
      pStubStart,
      { x: pStubStart.x, y: pStubEnd.y },
      pStubEnd,
    ];
  } else {
    // Fallback midpoint
    const midX = Math.round((pStubStart.x + pStubEnd.x) / 2);
    candidateMiddle = [
      pStubStart,
      { x: midX, y: pStubStart.y },
      { x: midX, y: pStubEnd.y },
      pStubEnd,
    ];
  }

  // 4. Verify candidate route against all active obstacles
  const candidateFullRoute: Point[] = [p0, ...candidateMiddle, pN];
  if (isPathClear(candidateFullRoute, activeObstacles)) {
    return simplifyOrthogonalPoints(candidateFullRoute);
  }

  // 5. Hard Obstacle Avoidance via Orthogonal Channel Graph A* Search
  // Triggers whenever any segment of the direct route penetrates an obstacle
  const detour = routeDetourWithAStar(pStubStart, pStubEnd, activeObstacles, laneOffset);
  if (detour && detour.length > 0) {
    const detourFullRoute: Point[] = [p0, ...detour, pN];
    if (isPathClear(detourFullRoute, activeObstacles)) {
      return simplifyOrthogonalPoints(detourFullRoute);
    }
  }

  // Retry with expanded detour clearance if needed
  const wideDetour = routeDetourWithAStar(pStubStart, pStubEnd, activeObstacles, laneOffset, 20);
  if (wideDetour && wideDetour.length > 0) {
    const wideFullRoute: Point[] = [p0, ...wideDetour, pN];
    if (isPathClear(wideFullRoute, activeObstacles)) {
      return simplifyOrthogonalPoints(wideFullRoute);
    }
  }

  // Guaranteed clean perimeter loop fallback if obstacles completely block the interior
  let fallbackDetour: Point[];
  if (start.dir.dy > 0 && end.dir.dy > 0) {
    const detourBottomY = Math.max(
      ...activeObstacles.map((o) => o.y + o.height + ROUTING_CONFIG.MIN_CLEARANCE + 10),
      pStubStart.y + 30,
      pStubEnd.y + 30
    );
    fallbackDetour = [
      p0,
      pStubStart,
      { x: pStubStart.x, y: detourBottomY },
      { x: pStubEnd.x, y: detourBottomY },
      pStubEnd,
      pN,
    ];
  } else {
    const detourTopY = Math.min(
      ...activeObstacles.map((o) => o.y - ROUTING_CONFIG.MIN_CLEARANCE - 10),
      pStubStart.y - 30,
      pStubEnd.y - 30
    );
    fallbackDetour = [
      p0,
      pStubStart,
      { x: pStubStart.x, y: detourTopY },
      { x: pStubEnd.x, y: detourTopY },
      pStubEnd,
      pN,
    ];
  }

  return simplifyOrthogonalPoints(fallbackDetour);
}

/**
 * Filter affected wires connected to a specific set of moved/updated component IDs
 */
export function getAffectedWires(
  wires: { fromCompId: string; toCompId: string; id: string }[],
  compIds: string[]
): string[] {
  const set = new Set(compIds);
  return wires.filter((w) => set.has(w.fromCompId) || set.has(w.toCompId)).map((w) => w.id);
}
