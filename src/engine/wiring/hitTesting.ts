import type { CircuitComponent, Pin, Wire } from '../../types/circuit';
import type { Box, Point } from './geometry';
import { distance } from './geometry';

export const WIRE_INTERACTION_HITBOX_WIDTH = 14;
export const PIN_SNAP_RADIUS = 24;
export const JUNCTION_HITBOX_RADIUS = 12;

/**
 * Checks if a point is near an orthogonal line segment within a specified tolerance
 */
export function isPointNearSegment(p: Point, p1: Point, p2: Point, tolerance: number): boolean {
  const minX = Math.min(p1.x, p2.x) - tolerance;
  const maxX = Math.max(p1.x, p2.x) + tolerance;
  const minY = Math.min(p1.y, p2.y) - tolerance;
  const maxY = Math.max(p1.y, p2.y) + tolerance;

  if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
    return false;
  }

  // Horizontal segment
  if (Math.abs(p1.y - p2.y) < 0.1) {
    return Math.abs(p.y - p1.y) <= tolerance && p.x >= Math.min(p1.x, p2.x) && p.x <= Math.max(p1.x, p2.x);
  }

  // Vertical segment
  if (Math.abs(p1.x - p2.x) < 0.1) {
    return Math.abs(p.x - p1.x) <= tolerance && p.y >= Math.min(p1.y, p2.y) && p.y <= Math.max(p1.y, p2.y);
  }

  // General line segment distance
  const l2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
  if (l2 === 0) return distance(p, p1) <= tolerance;

  const t = Math.max(0, Math.min(1, ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / l2));
  const projection = {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };

  return distance(p, projection) <= tolerance;
}

/**
 * Checks if a point is near any segment of a routed wire
 */
export function isPointNearWire(point: Point, wirePoints: Point[], tolerance: number = WIRE_INTERACTION_HITBOX_WIDTH / 2): boolean {
  if (wirePoints.length < 2) return false;

  for (let i = 0; i < wirePoints.length - 1; i++) {
    if (isPointNearSegment(point, wirePoints[i], wirePoints[i + 1], tolerance)) {
      return true;
    }
  }

  return false;
}

/**
 * Finds the nearest pin to a world coordinate within a snapping distance
 */
export function findNearestPin(
  worldPos: Point,
  components: CircuitComponent[],
  maxDist: number = PIN_SNAP_RADIUS,
  excludeCompId?: string,
  excludePinId?: string
): { compId: string; pin: Pin; x: number; y: number; dist: number } | null {
  let nearest: { compId: string; pin: Pin; x: number; y: number; dist: number } | null = null;

  for (const comp of components) {
    if (comp.id === excludeCompId && !excludePinId) continue;
    const allPins = [...comp.inputs, ...comp.outputs];

    for (const pin of allPins) {
      if (comp.id === excludeCompId && pin.id === excludePinId) continue;
      const pinWorldX = comp.x + pin.x;
      const pinWorldY = comp.y + pin.y;
      const d = Math.hypot(worldPos.x - pinWorldX, worldPos.y - pinWorldY);

      if (d < maxDist && (!nearest || d < nearest.dist)) {
        nearest = { compId: comp.id, pin, x: pinWorldX, y: pinWorldY, dist: d };
      }
    }
  }

  return nearest;
}

/**
 * Performs marquee rectangle selection in world space
 * Returns IDs of components and wires that fall inside or intersect the selection box
 */
export function selectObjectsInBox(
  box: Box,
  components: CircuitComponent[],
  wires: Wire[],
  wireRoutesMap?: Map<string, Point[]>
): { componentIds: string[]; wireIds: string[] } {
  const minX = Math.min(box.x, box.x + box.width);
  const maxX = Math.max(box.x, box.x + box.width);
  const minY = Math.min(box.y, box.y + box.height);
  const maxY = Math.max(box.y, box.y + box.height);

  const selectedCompIds: string[] = [];
  const selectedWireIds: string[] = [];

  // Components: select if center or bounding box overlaps marquee
  for (const comp of components) {
    if (comp.isTrainerFixed) continue; // Don't select fixed trainer kit chassis parts
    const compCenterX = comp.x + comp.width / 2;
    const compCenterY = comp.y + comp.height / 2;

    const inX = compCenterX >= minX && compCenterX <= maxX;
    const inY = compCenterY >= minY && compCenterY <= maxY;

    if (inX && inY) {
      selectedCompIds.push(comp.id);
    }
  }

  // Wires: select if all or some route points fall inside marquee
  if (wireRoutesMap) {
    for (const wire of wires) {
      const pts = wireRoutesMap.get(wire.id);
      if (pts && pts.length > 0) {
        const anyInside = pts.some((p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
        if (anyInside) {
          selectedWireIds.push(wire.id);
        }
      }
    }
  }

  return {
    componentIds: selectedCompIds,
    wireIds: selectedWireIds,
  };
}
