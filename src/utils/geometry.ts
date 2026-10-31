import type { CircuitComponent, Pin } from '../types/circuit';

export type RotationDegree = 0 | 90 | 180 | 270;

/**
 * Calculates absolute world coordinates of a component pin taking rotation into account
 */
export function getRotatedPinCoords(comp: CircuitComponent, pin: Pin): { x: number; y: number } {
  const rotation = (comp.rotation || 0) as RotationDegree;
  if (!rotation) {
    return {
      x: comp.x + pin.x,
      y: comp.y + pin.y,
    };
  }

  // Rotate around center of component bounding box
  const cx = comp.x + comp.width / 2;
  const cy = comp.y + comp.height / 2;

  const dx = pin.x - comp.width / 2;
  const dy = pin.y - comp.height / 2;

  let rx = dx;
  let ry = dy;

  if (rotation === 90) {
    rx = -dy;
    ry = dx;
  } else if (rotation === 180) {
    rx = -dx;
    ry = -dy;
  } else if (rotation === 270) {
    rx = dy;
    ry = -dx;
  }

  return {
    x: cx + rx,
    y: cy + ry,
  };
}

/**
 * Rotates a 2D normal direction vector by a given angle in degrees
 */
export function rotateVector(
  v: { dx: number; dy: number },
  rotation: RotationDegree
): { dx: number; dy: number } {
  if (!rotation) return v;
  if (rotation === 90) return { dx: -v.dy, dy: v.dx };
  if (rotation === 180) return { dx: -v.dx, dy: -v.dy };
  if (rotation === 270) return { dx: v.dy, dy: -v.dx };
  return v;
}

/**
 * Gets the exit normal vector of a pin, rotated with the component
 */
export function getRotatedPinDirection(
  comp: CircuitComponent,
  pinId: string
): { dx: number; dy: number } {
  const pin =
    comp.inputs.find((p) => p.id === pinId) ||
    comp.outputs.find((p) => p.id === pinId);
  if (!pin) return { dx: 1, dy: 0 };

  // Determine base normal vector relative to component boundary
  let baseDir: { dx: number; dy: number } = { dx: 1, dy: 0 };

  if (comp.type.startsWith('ic_') || comp.type === 'custom_ic') {
    baseDir = pin.y === 0 ? { dx: 0, dy: -1 } : { dx: 0, dy: 1 };
  } else if (comp.customProps?.isTrainerOutput) {
    baseDir = { dx: 0, dy: 1 };
  } else if (comp.customProps?.isTrainerInput || comp.customProps?.isTrainerClock || comp.customProps?.isTrainerGnd) {
    baseDir = { dx: 0, dy: -1 };
  } else if (comp.customProps?.isTrainerVcc) {
    baseDir = { dx: 0, dy: 1 };
  } else {
    // Basic gates and logic parts
    if (pin.x <= 5) baseDir = { dx: -1, dy: 0 };
    else if (pin.x >= comp.width - 5) baseDir = { dx: 1, dy: 0 };
    else if (pin.y <= 5) baseDir = { dx: 0, dy: -1 };
    else baseDir = { dx: 0, dy: 1 };
  }

  const rot = (comp.rotation || 0) as RotationDegree;
  return rotateVector(baseDir, rot);
}

/**
 * Returns the next rotation step (+90 degrees clockwise)
 */
export function getNextRotation(currentRotation = 0): RotationDegree {
  const next = (currentRotation + 90) % 360;
  if (next === 90 || next === 180 || next === 270) return next;
  return 0;
}

/**
 * Creates clean orthogonal wire route path with Manhattan doglegs
 */
export function createOrthogonalPath(
  x1: number,
  y1: number,
  v1: { dx: number; dy: number },
  x2: number,
  y2: number,
  v2: { dx: number; dy: number }
): string {
  const stubLength = 18;

  // Stubs extending outward from ports
  const startStubX = x1 + v1.dx * stubLength;
  const startStubY = y1 + v1.dy * stubLength;

  const endStubX = x2 + v2.dx * stubLength;
  const endStubY = y2 + v2.dy * stubLength;

  // If pins face horizontally
  if (v1.dx !== 0 && v2.dx !== 0) {
    const midX = (startStubX + endStubX) / 2;
    return `M ${x1} ${y1} L ${startStubX} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${endStubX} ${y2} L ${x2} ${y2}`;
  }

  // If pins face vertically
  if (v1.dy !== 0 && v2.dy !== 0) {
    const midY = (startStubY + endStubY) / 2;
    return `M ${x1} ${y1} L ${x1} ${startStubY} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${endStubY} L ${x2} ${y2}`;
  }

  // Mixed horizontal/vertical (e.g. gate output to trainer output lamp)
  if (v1.dx !== 0) {
    return `M ${x1} ${y1} L ${endStubX} ${y1} L ${endStubX} ${y2} L ${x2} ${y2}`;
  }

  return `M ${x1} ${y1} L ${x1} ${endStubY} L ${x2} ${endStubY} L ${x2} ${y2}`;
}
