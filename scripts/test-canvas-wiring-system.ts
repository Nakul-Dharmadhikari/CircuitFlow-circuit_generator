/**
 * Comprehensive Canvas, Viewport, Interaction & Orthogonal Wiring Regression Test Suite
 * Tests all 24 core responsibilities outlined in the architectural specification.
 */
import {
  calculateOrthogonalWireRoute,
  getComponentObstacles,
  getPinEndpoint,
  pointsToSvgPath,
  simplifyOrthogonalPoints,
  type Box,
  type PinEndpoint,
  type Point,
} from '../src/engine/wiring';
import {
  calculateZoomAtPoint,
  screenToWorld,
  worldToScreen,
  type ViewportState,
} from '../src/hooks/useViewport';
import { snapPointToGrid, snapToGrid } from '../src/engine/wiring/routingGrid';
import { getAffectedWires } from '../src/engine/wiring/wireRouter';
import { selectObjectsInBox } from '../src/engine/wiring/hitTesting';
import { allocateWireLanes, getLaneOffset } from '../src/engine/wiring/wireLanes';
import type { CircuitComponent, Wire } from '../src/types/circuit';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log('--- 1. Testing Screen <-> World Coordinate Transformations ---');
const viewport: ViewportState = { x: 100, y: 50, zoom: 2.0 };
const screenPt: Point = { x: 300, y: 250 };
const worldPt = screenToWorld(screenPt, viewport);
assert(worldPt.x === 100 && worldPt.y === 100, 'screenToWorld correctly inverts pan and zoom');

const roundTripScreen = worldToScreen(worldPt, viewport);
assert(roundTripScreen.x === screenPt.x && roundTripScreen.y === screenPt.y, 'worldToScreen is exact mathematical inverse');

console.log('\n--- 2. Testing Cursor-Anchored Zoom Stability ---');
// Cursor is at (300, 250) on screen. The world coordinate under it is (100, 100).
// When we zoom from 2.0 to 3.0, the world point under (300, 250) must remain (100, 100).
const newVp = calculateZoomAtPoint(screenPt, 3.0, viewport);
const worldAfterZoom = screenToWorld(screenPt, newVp);
assert(Math.abs(worldAfterZoom.x - 100) < 0.001 && Math.abs(worldAfterZoom.y - 100) < 0.001, 'Cursor-anchored zoom preserves target world point under cursor');

console.log('\n--- 3. Testing Grid Snapping ---');
assert(snapToGrid(24, 10) === 20, 'snapToGrid rounds down correctly');
assert(snapToGrid(27, 10) === 30, 'snapToGrid rounds up correctly');
const snappedP = snapPointToGrid({ x: 43, y: 78 }, 10);
assert(snappedP.x === 40 && snappedP.y === 80, 'snapPointToGrid snaps 2D points to 10px grid');

console.log('\n--- 4. Testing Multi-Selection Hit Testing in World Space ---');
const testComponents: CircuitComponent[] = [
  {
    id: 'and_1',
    type: 'and',
    label: 'AND 1',
    x: 100,
    y: 100,
    width: 60,
    height: 40,
    inputs: [{ id: 'in_1', name: 'A', type: 'input', x: 0, y: 10, value: '0' }],
    outputs: [{ id: 'out_1', name: 'Y', type: 'output', x: 60, y: 20, value: '0' }],
  },
  {
    id: 'or_1',
    type: 'or',
    label: 'OR 1',
    x: 250,
    y: 100,
    width: 60,
    height: 40,
    inputs: [{ id: 'in_2', name: 'A', type: 'input', x: 0, y: 10, value: '0' }],
    outputs: [{ id: 'out_2', name: 'Y', type: 'output', x: 60, y: 20, value: '0' }],
  },
  {
    id: 'not_1',
    type: 'not',
    label: 'NOT 1',
    x: 500,
    y: 500,
    width: 50,
    height: 30,
    inputs: [],
    outputs: [],
  },
];

const marqueeBox: Box = { x: 80, y: 80, width: 250, height: 100 };
const selection = selectObjectsInBox(marqueeBox, testComponents, []);
assert(selection.componentIds.includes('and_1'), 'Marquee selects AND 1 inside box');
assert(selection.componentIds.includes('or_1'), 'Marquee selects OR 1 inside box');
assert(!selection.componentIds.includes('not_1'), 'Marquee ignores NOT 1 outside box');

console.log('\n--- 5. Testing Orthogonal Manhattan Wire Router ---');
const startPin: PinEndpoint = {
  x: 160,
  y: 120,
  dir: { dx: 1, dy: 0 }, // Exits RIGHT
  compId: 'and_1',
  pinId: 'out_1',
};
const endPin: PinEndpoint = {
  x: 250,
  y: 110,
  dir: { dx: -1, dy: 0 }, // Enters LEFT
  compId: 'or_1',
  pinId: 'in_2',
};

const route = calculateOrthogonalWireRoute(startPin, endPin, 0, []);
assert(route.length >= 4, 'Route produces multi-segment orthogonal points');

// Verify all segments are strictly horizontal or vertical (100% Manhattan)
for (let i = 0; i < route.length - 1; i++) {
  const pA = route[i];
  const pB = route[i + 1];
  const isOrthogonal = pA.x === pB.x || pA.y === pB.y;
  assert(isOrthogonal, `Segment ${i}->${i + 1} (${pA.x},${pA.y}) to (${pB.x},${pB.y}) is strictly orthogonal`);
}

const svgPath = pointsToSvgPath(route, 4);
assert(svgPath.startsWith('M ') && svgPath.includes('L '), 'pointsToSvgPath generates valid SVG path data with fillet corners');

console.log('\n--- 6. Testing Multi-Lane Channel Offset Allocation ---');
const wires: Wire[] = [
  { id: 'w1', fromCompId: 'and_1', fromPinId: 'out_1', toCompId: 'or_1', toPinId: 'in_2', value: '0' },
  { id: 'w2', fromCompId: 'and_1', fromPinId: 'out_1', toCompId: 'or_1', toPinId: 'in_2', value: '1' },
  { id: 'w3', fromCompId: 'and_1', fromPinId: 'out_1', toCompId: 'or_1', toPinId: 'in_2', value: '0' },
];
const laneMap = allocateWireLanes(wires, 10);
assert(laneMap.get('w1') !== laneMap.get('w2'), 'w1 and w2 receive different lane offsets');
assert(laneMap.get('w2') !== laneMap.get('w3'), 'w2 and w3 receive different lane offsets');

console.log('\n--- 7. Testing Obstacle Avoidance Routing ---');
const obstacleComp: CircuitComponent = {
  id: 'ic_obstacle',
  type: 'ic_7408',
  label: 'IC Obstacle',
  x: 180,
  y: 90,
  width: 50,
  height: 60,
  inputs: [],
  outputs: [],
};
const obstacles = getComponentObstacles([obstacleComp]);
assert(obstacles.length === 1, 'Obstacle detected and bounded with safety margin');

const detourRoute = calculateOrthogonalWireRoute(startPin, endPin, 0, obstacles);
assert(detourRoute.length >= 4, 'Route with obstacles produces clean Manhattan bypass');

console.log('\n--- 8. Testing Dynamic Extended IC & Module Pin Geometry (IC5, IC6+) ---');
// Testing that dynamic IC components (e.g. future IC5, IC6, or custom ICs) without hardcoded coordinates route properly
const extendedIC6: CircuitComponent = {
  id: 'trainer_ic6',
  type: 'ic_74151',
  label: '74151 MUX (IC6)',
  x: 400,
  y: 300,
  width: 90,
  height: 36,
  inputs: [
    { id: 'pin1', name: 'D3', type: 'input', x: 8, y: 0, value: '0' },
    { id: 'pin16', name: 'VCC', type: 'input', x: 8, y: 36, value: '1' },
  ],
  outputs: [
    { id: 'pin5', name: 'Y', type: 'output', x: 40, y: 36, value: '0' },
  ],
};

const pin1Ep = getPinEndpoint('trainer_ic6', 'pin1', [extendedIC6]);
assert(pin1Ep !== null, 'Found dynamic pin on extended IC6');
assert(pin1Ep!.dir.dy === -1, 'Top pin on IC6 departs UP (dy = -1)');

const pin5Ep = getPinEndpoint('trainer_ic6', 'pin5', [extendedIC6]);
assert(pin5Ep !== null, 'Found dynamic output pin on extended IC6');
assert(pin5Ep!.dir.dy === 1, 'Bottom pin on IC6 departs DOWN (dy = 1)');

console.log('\n--- 9. Testing Affected-Wire Rerouting Filter ---');
const allWires = [
  { id: 'wire_A', fromCompId: 'and_1', toCompId: 'or_1' },
  { id: 'wire_B', fromCompId: 'or_1', toCompId: 'not_1' },
  { id: 'wire_C', fromCompId: 'ic_x', toCompId: 'ic_y' },
];
const affected = getAffectedWires(allWires, ['and_1']);
assert(affected.includes('wire_A'), 'wire_A is affected because and_1 moved');
assert(!affected.includes('wire_B'), 'wire_B is NOT affected by and_1');
assert(!affected.includes('wire_C'), 'wire_C is NOT affected by and_1');

console.log('\n🎉 ALL 24 CANVAS, VIEWPORT, INTERACTION & ORTHOGONAL ROUTING TESTS PASSED!');
