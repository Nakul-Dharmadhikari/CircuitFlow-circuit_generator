import type { Wire } from '../../types/circuit';

export const DEFAULT_LANE_SPACING = 10;
export const MAX_LANES = 9;

/**
 * Computes a symmetric lane offset around the corridor center
 * For index 0: 0
 * For index 1: +10
 * For index 2: -10
 * For index 3: +20
 * For index 4: -20
 * and so on.
 */
export function getSymmetricLaneOffset(index: number, spacing: number = DEFAULT_LANE_SPACING): number {
  if (index === 0) return 0;
  const magnitude = Math.ceil(index / 2) * spacing;
  const sign = index % 2 === 1 ? 1 : -1;
  return sign * magnitude;
}

/**
 * Generates an index-based lane offset for a wire in a corridor
 */
export function getLaneOffset(
  wireIndex: number,
  maxLanes: number = MAX_LANES,
  spacing: number = DEFAULT_LANE_SPACING
): number {
  const laneIndex = wireIndex % maxLanes;
  return ((laneIndex % maxLanes) - Math.floor(maxLanes / 2)) * spacing;
}

/**
 * Groups wires by their approximate routing channel and assigns unique lane indices
 */
export function allocateWireLanes(
  wires: Wire[],
  spacing: number = DEFAULT_LANE_SPACING
): Map<string, number> {
  const laneMap = new Map<string, number>();

  // Group wires that connect between similar component corridors
  const corridorGroups = new Map<string, Wire[]>();

  for (const wire of wires) {
    const key = [wire.fromCompId, wire.toCompId].sort().join('<->');
    const list = corridorGroups.get(key) || [];
    list.push(wire);
    corridorGroups.set(key, list);
  }

  corridorGroups.forEach((group) => {
    group.forEach((wire, idx) => {
      laneMap.set(wire.id, getSymmetricLaneOffset(idx, spacing));
    });
  });

  return laneMap;
}
