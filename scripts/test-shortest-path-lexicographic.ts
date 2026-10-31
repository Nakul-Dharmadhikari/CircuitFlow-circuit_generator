import assert from 'node:assert';
import {
  calculateOrthogonalWireRoute,
  getPathManhattanLength,
  getPathBends,
  isRouteBlocked,
} from '../src/engine/wiring/wireRouter';
import { isPathClear, segmentIntersectsBox } from '../src/engine/wiring/geometry';
import type { Box, Point, PinEndpoint } from '../src/engine/wiring/geometry';

console.log('================================================================');
console.log('TEST SUITE: SHORTEST PATH LEXICOGRAPHIC ROUTING ENGINE');
console.log('Testing: Shortest Manhattan Length First, Minimum Bends Second,');
console.log('         Localized Detours, Reference Dijkstra Comparison & Blocked State');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Reference Shortest-Path Implementation (Lexicographic Dijkstra on Grid)
// -----------------------------------------------------------------------------
interface RefState {
  x: number;
  y: number;
  dir: 'H' | 'V' | 'NONE';
  len: number;
  bends: number;
  parent: RefState | null;
}

function referenceDijkstra(
  start: Point,
  end: Point,
  obstacles: Box[],
  gridStep = 4,
  boundsMargin = 120
): { path: Point[]; length: number; bends: number } | null {
  const minX = Math.min(start.x, end.x) - boundsMargin;
  const maxX = Math.max(start.x, end.x) + boundsMargin;
  const minY = Math.min(start.y, end.y) - boundsMargin;
  const maxY = Math.max(start.y, end.y) + boundsMargin;

  const queue: RefState[] = [];
  const visited = new Map<string, { len: number; bends: number }>();

  queue.push({
    x: start.x,
    y: start.y,
    dir: 'NONE',
    len: 0,
    bends: 0,
    parent: null,
  });
  visited.set(`${start.x},${start.y},NONE`, { len: 0, bends: 0 });

  let bestGoal: RefState | null = null;

  while (queue.length > 0) {
    // Pop best state (len first, bends second)
    let bestIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (
        queue[i].len < queue[bestIdx].len ||
        (queue[i].len === queue[bestIdx].len && queue[i].bends < queue[bestIdx].bends)
      ) {
        bestIdx = i;
      }
    }
    const curr = queue.splice(bestIdx, 1)[0];

    if (curr.x === end.x && curr.y === end.y) {
      if (
        !bestGoal ||
        curr.len < bestGoal.len ||
        (curr.len === bestGoal.len && curr.bends < bestGoal.bends)
      ) {
        bestGoal = curr;
      }
      break;
    }

    const deltas: Array<{ dx: number; dy: number; dir: 'H' | 'V' }> = [
      { dx: gridStep, dy: 0, dir: 'H' },
      { dx: -gridStep, dy: 0, dir: 'H' },
      { dx: 0, dy: gridStep, dir: 'V' },
      { dx: 0, dy: -gridStep, dir: 'V' },
    ];

    for (const d of deltas) {
      const nx = curr.x + d.dx;
      const ny = curr.y + d.dy;
      if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;

      let collides = false;
      for (const obs of obstacles) {
        if (segmentIntersectsBox({ x: curr.x, y: curr.y }, { x: nx, y: ny }, obs)) {
          collides = true;
          break;
        }
      }
      if (collides) continue;

      const nLen = curr.len + gridStep;
      const nBends = curr.bends + (curr.dir !== 'NONE' && curr.dir !== d.dir ? 1 : 0);
      const key = `${nx},${ny},${d.dir}`;

      const prev = visited.get(key);
      if (prev) {
        if (nLen > prev.len) continue;
        if (nLen === prev.len && nBends >= prev.bends) continue;
      }
      visited.set(key, { len: nLen, bends: nBends });

      queue.push({
        x: nx,
        y: ny,
        dir: d.dir,
        len: nLen,
        bends: nBends,
        parent: curr,
      });
    }
  }

  if (!bestGoal) return null;

  const pts: Point[] = [];
  let c: RefState | null = bestGoal;
  while (c) {
    pts.push({ x: c.x, y: c.y });
    c = c.parent;
  }
  pts.reverse();
  return { path: pts, length: bestGoal.len, bends: bestGoal.bends };
}

// -----------------------------------------------------------------------------
// TEST 1: Equal-Length Alternatives (Assert Minimal Bend Selection)
// -----------------------------------------------------------------------------
console.log('--- Test 1: Equal-Length Alternatives (Minimal Bend Selection) ---');
{
  const start: PinEndpoint = {
    x: 100,
    y: 200,
    dir: { dx: 1, dy: 0 }, // Exits RIGHT
    compId: 'src',
    pinId: 'out',
  };
  const end: PinEndpoint = {
    x: 300,
    y: 100,
    dir: { dx: 0, dy: 1 }, // Enters DOWN
    compId: 'dst',
    pinId: 'in',
  };

  const route = calculateOrthogonalWireRoute(start, end, 0, []);
  assert.ok(route.length >= 2, 'Route generated');

  const len = getPathManhattanLength(route);
  const bends = getPathBends(route);

  // Theoretical minimal length from (100,200) to (300,100):
  // 16 stub right -> (116, 200)
  // 16 stub down -> (300, 116)
  // Distance: (300 - 100) + (200 - 100) = 300px Manhattan distance.
  assert.strictEqual(len, 300, `Manhattan length must be exact theoretical minimum (300px, got ${len}px)`);
  assert.ok(bends <= 2, `Bends must be minimal for mixed orientation (got ${bends})`);
  console.log(`✔ PASS: Route selected minimal length (${len}px) and minimal bends (${bends}).`);
}

// -----------------------------------------------------------------------------
// TEST 2: Manhattan Length is Strictly Primary (No Longer Route Defeats Shorter)
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: Strict Lexicographic Order (Shorter Length Always Wins) ---');
{
  // Source at (100, 200), Destination at (400, 200).
  // A narrow obstacle at (220, 170, 60x60) blocks the center line.
  // Router must choose the detour of minimal Manhattan length, not an overly wide detour.
  const obstacle: Box = { x: 220, y: 170, width: 60, height: 60 };
  const start: PinEndpoint = {
    x: 100,
    y: 200,
    dir: { dx: 1, dy: 0 },
    compId: 'comp_a',
    pinId: 'out',
  };
  const end: PinEndpoint = {
    x: 400,
    y: 200,
    dir: { dx: -1, dy: 0 },
    compId: 'comp_b',
    pinId: 'in',
  };

  const route = calculateOrthogonalWireRoute(start, end, 0, [obstacle]);
  assert.ok(isPathClear(route, [obstacle]), 'Route does not intersect obstacle');

  const len = getPathManhattanLength(route);
  // Straight line is 300px. Obstacle extends 30px above and below center (y=170 to y=230).
  // With 12px clearance, detour around y=158 or y=242 adds 2 * 42px = 84px -> Total length ~384px.
  assert.ok(len <= 390, `Router chose shortest detour (length ${len}px <= 390px, no arbitrary relaxation)`);
  console.log(`✔ PASS: Router selected shortest Manhattan detour (${len}px).`);
}

// -----------------------------------------------------------------------------
// TEST 3: Adjacent IC Pins Routing (Localized Corridors vs Board Jump)
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: Adjacent IC Pins Routing (Local Corridors) ---');
{
  // Two adjacent bottom-row IC pins 22px apart on the same chip
  // Pin 1 at (200, 185), Pin 2 at (222, 185), both exiting DOWN
  const icBox: Box = { x: 190, y: 100, width: 240, height: 85, compId: 'ic_main' };
  const pin1: PinEndpoint = {
    x: 200,
    y: 185,
    dir: { dx: 0, dy: 1 },
    compId: 'ic_main',
    pinId: 'pin1',
  };
  const pin2: PinEndpoint = {
    x: 222,
    y: 185,
    dir: { dx: 0, dy: 1 },
    compId: 'ic_main',
    pinId: 'pin2',
  };

  const route = calculateOrthogonalWireRoute(pin1, pin2, 0, [icBox]);
  const len = getPathManhattanLength(route);

  // Direct U-channel at stub line: 16 down + 22 across + 16 up = 54px.
  // Old faulty router jumped all the way around the entire canvas (> 400px).
  assert.ok(len <= 65, `Adjacent pin route must be strictly localized (got ${len}px, expected <= 65px)`);
  assert.ok(isPathClear(route, [icBox]), 'Route does not intersect IC body');
  console.log(`✔ PASS: Adjacent IC pins route via local corridor (${len}px vs >400px board loop).`);
}

// -----------------------------------------------------------------------------
// TEST 4: Comparison Against Trusted Reference Dijkstra Algorithm
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: Trusted Reference Dijkstra Comparison ---');
{
  const obstacle: Box = { x: 200, y: 160, width: 80, height: 80 };
  const startPt: Point = { x: 120, y: 200 };
  const endPt: Point = { x: 360, y: 200 };

  const startEp: PinEndpoint = {
    x: startPt.x,
    y: startPt.y,
    dir: { dx: 1, dy: 0 },
    compId: 'start',
    pinId: 'out',
  };
  const endEp: PinEndpoint = {
    x: endPt.x,
    y: endPt.y,
    dir: { dx: -1, dy: 0 },
    compId: 'end',
    pinId: 'in',
  };

  const routerRoute = calculateOrthogonalWireRoute(startEp, endEp, 0, [obstacle]);
  const routerLen = getPathManhattanLength(routerRoute);

  // Compute reference Dijkstra with the same 12px clearance margin
  const clearance = 12;
  const clearanceObstacle: Box = {
    x: obstacle.x - clearance,
    y: obstacle.y - clearance,
    width: obstacle.width + clearance * 2,
    height: obstacle.height + clearance * 2,
  };
  const ref = referenceDijkstra(startPt, endPt, [clearanceObstacle], 2);
  assert.ok(ref !== null, 'Reference Dijkstra found a valid path');
  const refTotalLen = ref.length;

  // The router must match the clearance-optimal reference path
  assert.strictEqual(
    routerLen,
    refTotalLen,
    `Router length (${routerLen}px) must exactly match reference Dijkstra (${refTotalLen}px)`
  );
  console.log(`✔ PASS: Wire router length (${routerLen}px) exactly matches reference Dijkstra (${refTotalLen}px).`);
}

// -----------------------------------------------------------------------------
// TEST 5: Narrow Corridor Between Adjacent Obstacles
// -----------------------------------------------------------------------------
console.log('\n--- Test 5: Narrow Corridor Navigation Between Obstacles ---');
{
  // Obstacle A at (200, 100, 80x80) -> Y: 100 to 180
  // Obstacle B at (200, 220, 80x80) -> Y: 220 to 300
  // Gap between them is Y: 180 to 220 (40px open channel at Y=200)
  const obsA: Box = { x: 200, y: 100, width: 80, height: 80 };
  const obsB: Box = { x: 200, y: 220, width: 80, height: 80 };

  const start: PinEndpoint = {
    x: 100,
    y: 200,
    dir: { dx: 1, dy: 0 },
    compId: 'src',
    pinId: 'out',
  };
  const end: PinEndpoint = {
    x: 380,
    y: 200,
    dir: { dx: -1, dy: 0 },
    compId: 'dst',
    pinId: 'in',
  };

  const route = calculateOrthogonalWireRoute(start, end, 0, [obsA, obsB]);
  assert.ok(isPathClear(route, [obsA, obsB]), 'Route does not intersect either obstacle');

  const len = getPathManhattanLength(route);
  // Straight path through the 40px corridor at Y=200 is 280px.
  // Routing outside obsA (Y < 88) or obsB (Y > 312) would take > 450px.
  assert.strictEqual(len, 280, `Router must take straight corridor through gap (280px, got ${len}px)`);
  console.log(`✔ PASS: Router successfully navigated narrow 40px corridor (${len}px).`);
}

// -----------------------------------------------------------------------------
// TEST 6: Zero Intersections with Component Keep-Out Boxes
// -----------------------------------------------------------------------------
console.log('\n--- Test 6: Zero Keep-Out Box Intersections ---');
{
  const boxes: Box[] = [
    { x: 150, y: 120, width: 90, height: 70 },
    { x: 280, y: 180, width: 70, height: 90 },
  ];
  const start: PinEndpoint = {
    x: 80,
    y: 160,
    dir: { dx: 1, dy: 0 },
    compId: 's',
    pinId: 'out',
  };
  const end: PinEndpoint = {
    x: 420,
    y: 220,
    dir: { dx: -1, dy: 0 },
    compId: 'e',
    pinId: 'in',
  };

  const route = calculateOrthogonalWireRoute(start, end, 0, boxes);
  assert.ok(isPathClear(route, boxes), 'Route must have zero intersections with obstacle keep-out boxes');
  console.log('✔ PASS: Zero intersections with keep-out rectangles.');
}

// -----------------------------------------------------------------------------
// TEST 7: Fully Blocked Route Reports isBlocked: true Without Obstacle Penetration
// -----------------------------------------------------------------------------
console.log('\n--- Test 7: Fully Blocked Route Reporting ---');
{
  // Solid obstacle completely enclosing the destination pin
  const wall: Box = { x: 250, y: 100, width: 200, height: 200 };
  const start: PinEndpoint = {
    x: 100,
    y: 200,
    dir: { dx: 1, dy: 0 },
    compId: 'src',
    pinId: 'out',
  };
  const end: PinEndpoint = {
    x: 300, // Inside wall box!
    y: 200,
    dir: { dx: -1, dy: 0 },
    compId: 'dst',
    pinId: 'in',
  };

  const route = calculateOrthogonalWireRoute(start, end, 0, [wall]);
  assert.ok(isRouteBlocked(route), 'Blocked route must report isBlocked: true');
  assert.ok(isPathClear(route, [wall]), 'Blocked route must not penetrate obstacle body');
  console.log('✔ PASS: Unroutable state correctly flagged without cutting through obstacle.');
}

console.log('\n================================================================');
console.log('🎉 ALL LEXICOGRAPHIC SHORTEST-PATH ROUTER CHECKS PASSED (7/7)!');
console.log('================================================================');
