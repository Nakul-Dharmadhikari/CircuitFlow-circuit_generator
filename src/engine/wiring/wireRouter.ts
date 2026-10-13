import type { CircuitComponent, Pin } from '../../types/circuit';
import type { Box, PinEndpoint, Point, Vector2D } from './geometry';
import {
  isPathClear,
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
 * Computes exact Manhattan length of an orthogonal polyline.
 */
export function getPathManhattanLength(points: Point[]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y);
  }
  return len;
}

/**
 * Counts bends (direction changes between H and V) along an orthogonal polyline.
 */
export function getPathBends(points: Point[]): number {
  const simplified = simplifyOrthogonalPoints(points);
  if (simplified.length <= 2) return 0;
  let bends = 0;
  for (let i = 1; i < simplified.length - 1; i++) {
    const d1x = simplified[i].x - simplified[i - 1].x;
    const d2x = simplified[i + 1].x - simplified[i].x;
    const isD1H = d1x !== 0;
    const isD2H = d2x !== 0;
    if (isD1H !== isD2H) {
      bends++;
    }
  }
  return bends;
}

/**
 * Checks if a route was flagged as unroutable/blocked.
 */
export function isRouteBlocked(route: Point[]): boolean {
  return Boolean((route as any)?.isBlocked);
}

/**
 * Binary min-heap priority queue for optimal A* search.
 */
class PriorityQueue<T> {
  private items: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  get length(): number {
    return this.items.length;
  }

  push(item: T): void {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const bottom = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = bottom;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      if (this.compare(this.items[idx], this.items[parentIdx]) < 0) {
        const temp = this.items[idx];
        this.items[idx] = this.items[parentIdx];
        this.items[parentIdx] = temp;
        idx = parentIdx;
      } else {
        break;
      }
    }
  }

  private bubbleDown(idx: number): void {
    const len = this.items.length;
    while (true) {
      const leftIdx = (idx << 1) + 1;
      const rightIdx = leftIdx + 1;
      let smallest = idx;

      if (leftIdx < len && this.compare(this.items[leftIdx], this.items[smallest]) < 0) {
        smallest = leftIdx;
      }
      if (rightIdx < len && this.compare(this.items[rightIdx], this.items[smallest]) < 0) {
        smallest = rightIdx;
      }
      if (smallest !== idx) {
        const temp = this.items[idx];
        this.items[idx] = this.items[smallest];
        this.items[smallest] = temp;
        idx = smallest;
      } else {
        break;
      }
    }
  }
}

/**
 * Helper to deduplicate and sort 1D coordinate numbers (merging identical coordinates)
 */
function deduplicateCoordinates(coords: number[]): number[] {
  const sorted = [...coords].filter((v) => !isNaN(v) && isFinite(v)).sort((a, b) => a - b);
  const result: number[] = [];
  for (const c of sorted) {
    if (result.length === 0 || Math.abs(c - result[result.length - 1]) > 0.5) {
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
  gLen: number;
  gBends: number;
  fLen: number;
  parent: AStarState | null;
}

function compareAStarStates(a: AStarState, b: AStarState): number {
  // Strict Lexicographic Objective:
  // 1. Exact Manhattan length first
  if (a.fLen !== b.fLen) {
    return a.fLen - b.fLen;
  }
  // 2. Minimum bends only among routes with equal length
  if (a.gBends !== b.gBends) {
    return a.gBends - b.gBends;
  }
  // 3. Tie-breaker: favor states with higher gLen (closer to goal)
  return b.gLen - a.gLen;
}

/**
 * Internal Orthogonal Channel Graph A* Search Router.
 * Implements strict lexicographic shortest-path search:
 * exact Manhattan length first, bend count second.
 */
export function routeDetourWithAStar(
  startStub: Point,
  endStub: Point,
  obstacles: Box[],
  laneOffset: number = 0,
  extraMargin: number = 0,
  startDir?: Vector2D,
  endDir?: Vector2D
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
  rawXs.push(Math.round((startStub.x + endStub.x) / 2));
  rawYs.push(Math.round((startStub.y + endStub.y) / 2));
  if (laneOffset !== 0) {
    rawXs.push(Math.round((startStub.x + endStub.x) / 2) + laneOffset);
    rawYs.push(Math.round((startStub.y + endStub.y) / 2) + laneOffset);
  }

  // Add boundary detour channels for every corridor obstacle
  for (const obs of corridorObstacles) {
    if (laneOffset !== 0) {
      rawXs.push(obs.x - clearance - Math.abs(laneOffset));
      rawXs.push(obs.x + obs.width + clearance + Math.abs(laneOffset));
      rawYs.push(obs.y - clearance - Math.abs(laneOffset));
      rawYs.push(obs.y + obs.height + clearance + Math.abs(laneOffset));
    } else {
      rawXs.push(obs.x - clearance);
      rawXs.push(obs.x + obs.width + clearance);
      rawYs.push(obs.y - clearance);
      rawYs.push(obs.y + obs.height + clearance);
    }
  }

  // Add inter-obstacle gap channels (corridors between adjacent chips)
  for (let i = 0; i < corridorObstacles.length; i++) {
    for (let j = i + 1; j < corridorObstacles.length; j++) {
      const o1 = corridorObstacles[i];
      const o2 = corridorObstacles[j];
      const left = o1.x < o2.x ? o1 : o2;
      const right = o1.x < o2.x ? o2 : o1;
      if (right.x > left.x + left.width) {
        rawXs.push(Math.round((left.x + left.width + right.x) / 2) + laneOffset);
      }
      const top = o1.y < o2.y ? o1 : o2;
      const bottom = o1.y < o2.y ? o2 : o1;
      if (bottom.y > top.y + top.height) {
        rawYs.push(Math.round((top.y + top.height + bottom.y) / 2) + laneOffset);
      }
    }
  }

  // Add localized clear bypass highways around corridor obstacles (not canvas-wide!)
  if (corridorObstacles.length > 0) {
    const minObsY = Math.min(...corridorObstacles.map((o) => o.y));
    const maxObsY = Math.max(...corridorObstacles.map((o) => o.y + o.height));
    if (laneOffset !== 0) {
      rawYs.push(minObsY - clearance - 14 - Math.abs(laneOffset));
      rawYs.push(maxObsY + clearance + 14 + Math.abs(laneOffset));
    } else {
      rawYs.push(minObsY - clearance - 14);
      rawYs.push(maxObsY + clearance + 14);
    }

    const minObsX = Math.min(...corridorObstacles.map((o) => o.x));
    const maxObsX = Math.max(...corridorObstacles.map((o) => o.x + o.width));
    if (laneOffset !== 0) {
      rawXs.push(minObsX - clearance - 14 - Math.abs(laneOffset));
      rawXs.push(maxObsX + clearance + 14 + Math.abs(laneOffset));
    } else {
      rawXs.push(minObsX - clearance - 14);
      rawXs.push(maxObsX + clearance + 14);
    }
  }

  const xs = deduplicateCoordinates(rawXs);
  const ys = deduplicateCoordinates(rawYs);

  if (xs.length < 2 || ys.length < 2) return null;

  const startIx = findClosestIndex(xs, startStub.x);
  const startIy = findClosestIndex(ys, startStub.y);
  const endIx = findClosestIndex(xs, endStub.x);
  const endIy = findClosestIndex(ys, endStub.y);

  const startDirType: 'H' | 'V' | 'NONE' =
    startDir && startDir.dx !== 0 ? 'H' : startDir && startDir.dy !== 0 ? 'V' : 'NONE';
  const finalDir: 'H' | 'V' | 'NONE' =
    endDir && endDir.dx !== 0 ? 'H' : endDir && endDir.dy !== 0 ? 'V' : 'NONE';

  // 3. Priority Queue for Lexicographic A* Search
  const openQueue = new PriorityQueue<AStarState>(compareAStarStates);
  const bestVisited = new Map<string, { gLen: number; gBends: number }>();

  const targetPoint = { x: xs[endIx], y: ys[endIy] };
  const initialHLen = Math.abs(targetPoint.x - xs[startIx]) + Math.abs(targetPoint.y - ys[startIy]);

  const startState: AStarState = {
    ix: startIx,
    iy: startIy,
    dir: startDirType,
    gLen: 0,
    gBends: 0,
    fLen: initialHLen,
    parent: null,
  };

  openQueue.push(startState);
  bestVisited.set(`${startIx},${startIy},${startDirType}`, { gLen: 0, gBends: 0 });

  let iterations = 0;
  const MAX_ITERATIONS = 4000;

  while (openQueue.length > 0 && iterations++ < MAX_ITERATIONS) {
    const current = openQueue.pop()!;

    // Check goal reached
    if (current.ix === endIx && current.iy === endIy) {
      const path: Point[] = [];
      let curr: AStarState | null = current;
      while (curr) {
        path.push({ x: xs[curr.ix], y: ys[curr.iy] });
        curr = curr.parent;
      }
      path.reverse();
      return path;
    }

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
      const isTurn = current.dir !== 'NONE' && current.dir !== nb.moveDir;
      const isFinalTurn =
        nb.ix === endIx && nb.iy === endIy && finalDir !== 'NONE' && nb.moveDir !== finalDir ? 1 : 0;

      const tentativeGLen = current.gLen + stepDist;
      const tentativeGBends = current.gBends + (isTurn ? 1 : 0) + isFinalTurn;

      const nbKey = `${nb.ix},${nb.iy},${nb.moveDir}`;
      const prev = bestVisited.get(nbKey);
      if (prev) {
        if (tentativeGLen > prev.gLen) {
          continue;
        }
        if (tentativeGLen === prev.gLen && tentativeGBends >= prev.gBends) {
          continue;
        }
      }
      bestVisited.set(nbKey, { gLen: tentativeGLen, gBends: tentativeGBends });

      const hLen = Math.abs(targetPoint.x - nextPoint.x) + Math.abs(targetPoint.y - nextPoint.y);
      const nextState: AStarState = {
        ix: nb.ix,
        iy: nb.iy,
        dir: nb.moveDir,
        gLen: tentativeGLen,
        gBends: tentativeGBends,
        fLen: tentativeGLen + hLen,
        parent: current,
      };

      openQueue.push(nextState);
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
 * Follows the strict lexicographic optimization:
 *   1. Shortest valid Manhattan length first.
 *   2. Minimum bends only among routes with equal length.
 * 
 * Guarantees that EVERY wire segment does not intersect any component keep-out rectangle.
 * If all paths are physically blocked, reports isBlocked: true without corrupting connectivity.
 */
export function calculateOrthogonalWireRoute(
  start: PinEndpoint | { x: number; y: number; compId?: string; dir?: Vector2D; pinId?: string },
  end: PinEndpoint | { x: number; y: number; compId?: string; dir?: Vector2D; pinId?: string },
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
    activeObstacles = getComponentObstacles(components, [start.compId || '', end.compId || '']);
  }

  // Also prevent wires from cutting through the body of start and end components
  if (components && Array.isArray(components)) {
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
  const startDir: Vector2D = start.dir || { dx: 1, dy: 0 };
  const pStubStart = computeSafeStub(p0, startDir, leadLength, activeObstacles);

  const pN: Point = { x: end.x, y: end.y };
  const endDir: Vector2D = end.dir || { dx: -1, dy: 0 };
  const pStubEnd = computeSafeStub(pN, endDir, leadLength, activeObstacles);

  // Theoretical lower bound Manhattan distance for any collision-free route respecting stubs
  const minPossibleLength =
    Math.abs(pStubStart.x - p0.x) +
    Math.abs(pStubStart.y - p0.y) +
    Math.abs(pStubEnd.x - pStubStart.x) +
    Math.abs(pStubEnd.y - pStubStart.y) +
    Math.abs(pN.x - pStubEnd.x) +
    Math.abs(pN.y - pStubEnd.y);

  // 3. Fast-Path Direct Orthogonal Candidate Routes
  // If wireIndex === 0 and direct candidates achieve theoretical minimum length without collision,
  // evaluate the candidate with minimal bends.
  const directCandidates: Point[][] = [];

  // Case 1: Both pins vertical
  if (startDir.dy !== 0 && endDir.dy !== 0) {
    if (startDir.dy > 0 && endDir.dy > 0) {
      // Both exit DOWN
      const channelY = Math.max(pStubStart.y, pStubEnd.y) + Math.abs(laneOffset);
      directCandidates.push([
        p0,
        pStubStart,
        { x: pStubStart.x, y: channelY },
        { x: pStubEnd.x, y: channelY },
        pStubEnd,
        pN,
      ]);
    } else if (startDir.dy < 0 && endDir.dy < 0) {
      // Both exit UP
      const channelY = Math.min(pStubStart.y, pStubEnd.y) - Math.abs(laneOffset);
      directCandidates.push([
        p0,
        pStubStart,
        { x: pStubStart.x, y: channelY },
        { x: pStubEnd.x, y: channelY },
        pStubEnd,
        pN,
      ]);
    } else {
      // Opposite vertical directions
      const midY = Math.round((pStubStart.y + pStubEnd.y) / 2) + laneOffset;
      directCandidates.push([
        p0,
        pStubStart,
        { x: pStubStart.x, y: midY },
        { x: pStubEnd.x, y: midY },
        pStubEnd,
        pN,
      ]);
    }
  }
  // Case 2: Both pins horizontal
  else if (startDir.dx !== 0 && endDir.dx !== 0) {
    if (startDir.dx > 0 && endDir.dx < 0 && pStubStart.x <= pStubEnd.x) {
      // Standard forward left-to-right corridor
      const midX = Math.round((pStubStart.x + pStubEnd.x) / 2) + laneOffset;
      directCandidates.push([
        p0,
        pStubStart,
        { x: midX, y: pStubStart.y },
        { x: midX, y: pStubEnd.y },
        pStubEnd,
        pN,
      ]);
    } else if (startDir.dx > 0 && endDir.dx > 0) {
      const channelX = Math.max(pStubStart.x, pStubEnd.x) + ROUTING_CONFIG.MIN_CLEARANCE + Math.abs(laneOffset);
      directCandidates.push([
        p0,
        pStubStart,
        { x: channelX, y: pStubStart.y },
        { x: channelX, y: pStubEnd.y },
        pStubEnd,
        pN,
      ]);
    } else if (startDir.dx < 0 && endDir.dx < 0) {
      const channelX = Math.min(pStubStart.x, pStubEnd.x) - ROUTING_CONFIG.MIN_CLEARANCE - Math.abs(laneOffset);
      directCandidates.push([
        p0,
        pStubStart,
        { x: channelX, y: pStubStart.y },
        { x: channelX, y: pStubEnd.y },
        pStubEnd,
        pN,
      ]);
    }
  }
  // Case 3: Mixed orientations
  else if (startDir.dx !== 0 && endDir.dy !== 0) {
    directCandidates.push([p0, pStubStart, { x: pStubEnd.x, y: pStubStart.y }, pStubEnd, pN]);
  } else if (startDir.dy !== 0 && endDir.dx !== 0) {
    directCandidates.push([p0, pStubStart, { x: pStubStart.x, y: pStubEnd.y }, pStubEnd, pN]);
  }

  // Check if any direct candidate achieves theoretical minimum length and is completely clear
  if (wireIndex === 0) {
    let bestClearCandidate: Point[] | null = null;
    let minCandidateBends = Infinity;

    for (const cand of directCandidates) {
      if (isPathClear(cand, activeObstacles)) {
        const len = getPathManhattanLength(cand);
        if (len === minPossibleLength) {
          const bends = getPathBends(cand);
          if (bends < minCandidateBends) {
            minCandidateBends = bends;
            bestClearCandidate = cand;
          }
        }
      }
    }

    if (bestClearCandidate) {
      return simplifyOrthogonalPoints(bestClearCandidate);
    }
  }

  // 4. Strict Lexicographic Channel Graph A* Search
  // Searches candidate corridor channels for the route of minimal Manhattan length,
  // breaking ties strictly with minimum bend count.
  const detour = routeDetourWithAStar(
    pStubStart,
    pStubEnd,
    activeObstacles,
    laneOffset,
    0,
    startDir,
    endDir
  );
  if (detour && detour.length > 0) {
    const fullRoute: Point[] = [p0, ...detour, pN];
    if (isPathClear(fullRoute, activeObstacles)) {
      return simplifyOrthogonalPoints(fullRoute);
    }
  }

  // Retry with expanded clearance margin if narrow channels are tight
  const wideDetour = routeDetourWithAStar(
    pStubStart,
    pStubEnd,
    activeObstacles,
    laneOffset,
    20,
    startDir,
    endDir
  );
  if (wideDetour && wideDetour.length > 0) {
    const wideFullRoute: Point[] = [p0, ...wideDetour, pN];
    if (isPathClear(wideFullRoute, activeObstacles)) {
      return simplifyOrthogonalPoints(wideFullRoute);
    }
  }

  // 5. Localized Corridor Obstacle Bypass Fallback
  // Bypasses the obstacles directly blocking this corridor (never canvas-wide minimums)
  const corridorObstacles = activeObstacles.filter((obs) => {
    const minX = Math.min(pStubStart.x, pStubEnd.x) - 60;
    const maxX = Math.max(pStubStart.x, pStubEnd.x) + 60;
    const minY = Math.min(pStubStart.y, pStubEnd.y) - 60;
    const maxY = Math.max(pStubStart.y, pStubEnd.y) + 60;
    return !(
      obs.x + obs.width < minX ||
      obs.x > maxX ||
      obs.y + obs.height < minY ||
      obs.y > maxY
    );
  });
  const bypassObstacles = corridorObstacles.length > 0 ? corridorObstacles : activeObstacles;

  const buildSafePerimeterRoute = (goAbove: boolean): Point[] => {
    const clearance = ROUTING_CONFIG.MIN_CLEARANCE + 14;
    const bypassY = goAbove
      ? Math.min(...bypassObstacles.map((o) => o.y), pStubStart.y, pStubEnd.y) -
        clearance -
        Math.abs(laneOffset)
      : Math.max(...bypassObstacles.map((o) => o.y + o.height), pStubStart.y, pStubEnd.y) +
        clearance +
        Math.abs(laneOffset);

    let startEscX = pStubStart.x;
    for (const obs of bypassObstacles) {
      if (segmentIntersectsBox(pStubStart, { x: startEscX, y: bypassY }, obs)) {
        startEscX =
          pStubStart.x < obs.x + obs.width / 2
            ? obs.x - clearance - Math.abs(laneOffset)
            : obs.x + obs.width + clearance + Math.abs(laneOffset);
      }
    }

    let endEscX = pStubEnd.x;
    for (const obs of bypassObstacles) {
      if (segmentIntersectsBox({ x: endEscX, y: bypassY }, pStubEnd, obs)) {
        endEscX =
          pStubEnd.x < obs.x + obs.width / 2
            ? obs.x - clearance - Math.abs(laneOffset)
            : obs.x + obs.width + clearance + Math.abs(laneOffset);
      }
    }

    const route: Point[] = [p0, pStubStart];
    if (startEscX !== pStubStart.x) {
      route.push({ x: startEscX, y: pStubStart.y });
    }
    route.push({ x: startEscX, y: bypassY });
    route.push({ x: endEscX, y: bypassY });
    if (endEscX !== pStubEnd.x) {
      route.push({ x: endEscX, y: pStubEnd.y });
    }
    route.push(pStubEnd, pN);

    return route;
  };

  const preferAbove = startDir.dy <= 0 || endDir.dy <= 0;
  const primaryRoute = buildSafePerimeterRoute(preferAbove);
  if (isPathClear(primaryRoute, activeObstacles)) {
    return simplifyOrthogonalPoints(primaryRoute);
  }

  const secondaryRoute = buildSafePerimeterRoute(!preferAbove);
  if (isPathClear(secondaryRoute, activeObstacles)) {
    return simplifyOrthogonalPoints(secondaryRoute);
  }

  // 6. Blocked / Unroutable State Reporting
  // If all local corridors and bypass channels are physically blocked,
  // return an unroutable state without penetrating any component keep-out box.
  const blockedRoute: Point[] = [p0, pStubStart];
  (blockedRoute as any).isBlocked = true;
  return blockedRoute;
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
