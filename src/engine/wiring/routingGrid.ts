import type { Box, Point } from './geometry';

export const DEFAULT_SNAP_GRID_SIZE = 10;
export const DEFAULT_MAJOR_GRID_SIZE = 40;

/**
 * Snaps a 1D scalar coordinate to the nearest grid step
 */
export function snapToGrid(value: number, gridSize: number = DEFAULT_SNAP_GRID_SIZE): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snaps a 2D point (x, y) to the nearest grid coordinates
 */
export function snapPointToGrid(point: Point, gridSize: number = DEFAULT_SNAP_GRID_SIZE): Point {
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  };
}

/**
 * Snaps a bounding box origin and dimensions to the grid
 */
export function snapBoxToGrid(box: Box, gridSize: number = DEFAULT_SNAP_GRID_SIZE): Box {
  const x = snapToGrid(box.x, gridSize);
  const y = snapToGrid(box.y, gridSize);
  const width = Math.max(gridSize, snapToGrid(box.width, gridSize));
  const height = Math.max(gridSize, snapToGrid(box.height, gridSize));
  return { x, y, width, height };
}

/**
 * Computes an aligned offset lane for parallel routing channels
 */
export function alignToLane(
  baseCoord: number,
  laneIndex: number,
  laneSpacing: number = 10
): number {
  return snapToGrid(baseCoord + laneIndex * laneSpacing, DEFAULT_SNAP_GRID_SIZE);
}
