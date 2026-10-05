export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Vector2D {
  dx: number;
  dy: number;
}

export interface PinEndpoint {
  x: number;
  y: number;
  dir: Vector2D; // Outward normal departure direction: e.g. {dx: 0, dy: -1} for UP
  compId: string;
  pinId: string;
}

/**
 * Calculates Euclidean distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Calculates Manhattan distance between two points
 */
export function manhattanDistance(p1: Point, p2: Point): number {
  return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
}

/**
 * Checks if a point lies inside a bounding box
 */
export function pointInBox(p: Point, box: Box, margin = 0): boolean {
  return (
    p.x >= box.x - margin &&
    p.x <= box.x + box.width + margin &&
    p.y >= box.y - margin &&
    p.y <= box.y + box.height + margin
  );
}

/**
 * Checks if two bounding boxes intersect
 */
export function boxesIntersect(b1: Box, b2: Box): boolean {
  return !(
    b1.x + b1.width < b2.x ||
    b2.x + b2.width < b1.x ||
    b1.y + b1.height < b2.y ||
    b2.y + b2.height < b1.y
  );
}

/**
 * Checks if an orthogonal line segment between p1 and p2 intersects a bounding box
 */
export function segmentIntersectsBox(p1: Point, p2: Point, box: Box): boolean {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  const boxMinX = box.x;
  const boxMaxX = box.x + box.width;
  const boxMinY = box.y;
  const boxMaxY = box.y + box.height;

  // No bounding box overlap
  if (maxX < boxMinX || minX > boxMaxX || maxY < boxMinY || minY > boxMaxY) {
    return false;
  }

  // Horizontal segment
  if (p1.y === p2.y) {
    return p1.y >= boxMinY && p1.y <= boxMaxY && !(maxX < boxMinX || minX > boxMaxX);
  }

  // Vertical segment
  if (p1.x === p2.x) {
    return p1.x >= boxMinX && p1.x <= boxMaxX && !(maxY < boxMinY || minY > boxMaxY);
  }

  // Diagonal segment (bounding box overlap check)
  return true;
}

/**
 * Eliminates redundant collinear points and zero-length segments from an orthogonal path
 */
export function simplifyOrthogonalPoints(points: Point[]): Point[] {
  if (points.length <= 2) return points;

  const result: Point[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];

    // Skip zero-length segments
    if (prev.x === curr.x && prev.y === curr.y) {
      continue;
    }

    // If 3 consecutive points are collinear, collapse the middle point
    if (result.length >= 2) {
      const prevPrev = result[result.length - 2];
      const isCollinearX = prevPrev.x === prev.x && prev.x === curr.x;
      const isCollinearY = prevPrev.y === prev.y && prev.y === curr.y;

      if (isCollinearX || isCollinearY) {
        result[result.length - 1] = curr;
        continue;
      }
    }

    result.push(curr);
  }

  return result;
}

/**
 * Converts a sequence of orthogonal points into a crisp SVG path with optional 4px rounded corner fillets
 */
export function pointsToSvgPath(points: Point[], cornerRadius: number = 4): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2 || cornerRadius <= 0) {
    return `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const pPrev = points[i - 1];
    const pCurr = points[i];
    const pNext = points[i + 1];

    const len1 = Math.hypot(pCurr.x - pPrev.x, pCurr.y - pPrev.y);
    const len2 = Math.hypot(pNext.x - pCurr.x, pNext.y - pCurr.y);
    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);

    if (r <= 0) {
      d += ` L ${pCurr.x} ${pCurr.y}`;
      continue;
    }

    // Direction vectors
    const d1x = (pCurr.x - pPrev.x) / len1;
    const d1y = (pCurr.y - pPrev.y) / len1;
    const d2x = (pNext.x - pCurr.x) / len2;
    const d2y = (pNext.y - pCurr.y) / len2;

    const startArcX = pCurr.x - d1x * r;
    const startArcY = pCurr.y - d1y * r;
    const endArcX = pCurr.x + d2x * r;
    const endArcY = pCurr.y + d2y * r;

    d += ` L ${startArcX} ${startArcY}`;
    d += ` Q ${pCurr.x} ${pCurr.y}, ${endArcX} ${endArcY}`;
  }

  d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  return d;
}
