import {
  calculateOrthogonalWireRoute,
  pointsToSvgPath,
  simplifyOrthogonalPoints,
  type PinEndpoint,
} from '../src/engine/wireRouter';

console.log('--- TEST: Manhattan Orthogonal Wire Routing Engine ---');

// Test 1: Vertical departure from switch UP to IC pin DOWN
const startEndpoint: PinEndpoint = {
  x: 100,
  y: 400,
  dir: { dx: 0, dy: -1 }, // switch exits UP
  compId: 'trainer_in_0',
  pinId: 'out',
};

const endEndpoint: PinEndpoint = {
  x: 250,
  y: 280,
  dir: { dx: 0, dy: 1 }, // IC bottom pin exits DOWN
  compId: 'ic_7408',
  pinId: 'pin1',
};

const routePoints = calculateOrthogonalWireRoute(startEndpoint, endEndpoint, 0);
console.log('Test 1 Route Points (Switch to IC):', routePoints);

if (routePoints.length < 4) {
  console.error('FAILED Test 1: Expected valid orthogonal route');
  process.exit(1);
}

// Check that every consecutive segment is strictly horizontal or vertical (Manhattan)
for (let i = 0; i < routePoints.length - 1; i++) {
  const p1 = routePoints[i];
  const p2 = routePoints[i + 1];
  const isOrthogonal = p1.x === p2.x || p1.y === p2.y;
  if (!isOrthogonal) {
    console.error(`FAILED Test 1: Non-orthogonal segment between (${p1.x}, ${p1.y}) and (${p2.x}, ${p2.y})`);
    process.exit(1);
  }
}

// Test 2: Multi-lane separation check (Parallel wires must not have identical intermediate points)
const routePointsLane0 = calculateOrthogonalWireRoute(startEndpoint, endEndpoint, 0);
const routePointsLane1 = calculateOrthogonalWireRoute(startEndpoint, endEndpoint, 1);
const routePointsLane2 = calculateOrthogonalWireRoute(startEndpoint, endEndpoint, 2);

console.log('Lane 0 channel Y:', routePointsLane0[2]?.y);
console.log('Lane 1 channel Y:', routePointsLane1[2]?.y);
console.log('Lane 2 channel Y:', routePointsLane2[2]?.y);

if (routePointsLane0[2]?.y === routePointsLane1[2]?.y) {
  console.error('FAILED Test 2: Parallel lanes must have distinct channel offsets to prevent overlap');
  process.exit(1);
}

// Test 3: SVG Path generation
const svgPath = pointsToSvgPath(routePoints);
console.log('Test 3 SVG Path:', svgPath);
if (!svgPath.startsWith('M ') || !svgPath.includes('Q ')) {
  console.error('FAILED Test 3: SVG path with corner fillets not produced');
  process.exit(1);
}

console.log('\n🎉 ALL ORTHOGONAL ROUTER TESTS PASSED SUCCESSFULLY!');
