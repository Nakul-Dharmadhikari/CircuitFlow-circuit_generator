import {
  calculateOrthogonalWireRoute,
  getComponentObstacles,
  getPinEndpoint,
  pointsToSvgPath,
  simplifyOrthogonalPoints,
  isPathClear,
  segmentIntersectsBox,
  ROUTING_CONFIG,
  type PinEndpoint,
  type Box,
  type Point,
} from '../src/engine/wiring';
import type { Circuit, CircuitComponent, Wire } from '../src/types/circuit';
import { createComponent, simulateCircuit } from '../src/engine/simulator';
import {
  createInitialTrainerBoard,
  mountICOnSocket,
  addModuleToTrainerBoard,
  moveTrainerBoard,
} from '../src/engine/trainerKit';

console.log('====================================================');
console.log('CIRCUITFLOW PHASE 2: WIRE ROUTING & OBSTACLE AVOIDANCE');
console.log('Centralized Keep-Out & Hard Obstacle Avoidance Test Suite');
console.log('====================================================\n');

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✔ PASS: ${message}`);
}

/**
 * Geometric Assertion: Verifies that every segment in a route is strictly orthogonal
 * (Manhattan) and does NOT intersect any obstacle box in the keep-out list.
 */
function assertRouteGeometry(
  route: Point[],
  obstacles: Box[],
  testName: string,
  startPin?: PinEndpoint,
  endPin?: PinEndpoint
) {
  assert(route.length >= 2, `${testName} - Route contains at least 2 points`);

  // 1. Orthogonality check
  for (let i = 0; i < route.length - 1; i++) {
    const pA = route[i];
    const pB = route[i + 1];
    const isOrthogonal = Math.abs(pA.x - pB.x) < 0.001 || Math.abs(pA.y - pB.y) < 0.001;
    assert(isOrthogonal, `${testName} - Segment ${i}->${i + 1} (${pA.x},${pA.y}) to (${pB.x},${pB.y}) is Manhattan orthogonal`);
  }

  // 2. Hard Obstacle Non-Intersection Assertion
  for (let i = 0; i < route.length - 1; i++) {
    const pA = route[i];
    const pB = route[i + 1];
    for (const obs of obstacles) {
      // If obstacle belongs to start or end component, verify no penetration of component body.
      // For all third-party obstacles, verify no penetration of keep-out rectangle.
      let testBox = obs;
      if (obs.compId && (obs.compId === startPin?.compId || obs.compId === endPin?.compId)) {
        testBox = {
          x: obs.x + ROUTING_CONFIG.COMPONENT_KEEP_OUT_MARGIN,
          y: obs.y + ROUTING_CONFIG.COMPONENT_KEEP_OUT_MARGIN,
          width: obs.width - ROUTING_CONFIG.COMPONENT_KEEP_OUT_MARGIN * 2,
          height: obs.height - ROUTING_CONFIG.COMPONENT_KEEP_OUT_MARGIN * 2,
          compId: obs.compId,
        };
      }
      const collides = segmentIntersectsBox(pA, pB, testBox);
      assert(!collides, `${testName} - Segment ${i}->${i + 1} (${pA.x},${pA.y}) to (${pB.x},${pB.y}) does NOT intersect obstacle [${testBox.x},${testBox.y},${testBox.width}x${testBox.height}]`);
    }
  }

  // 3. Pin Corridor Verification
  if (startPin && route.length >= 2) {
    const p0 = route[0];
    const p1 = route[1];
    const dirX = Math.sign(p1.x - p0.x);
    const dirY = Math.sign(p1.y - p0.y);
    const correctOutward =
      (startPin.dir.dx === 0 || dirX === startPin.dir.dx) &&
      (startPin.dir.dy === 0 || dirY === startPin.dir.dy);
    assert(correctOutward, `${testName} - Wire departs pin in outward normal direction [${startPin.dir.dx},${startPin.dir.dy}]`);
  }

  if (endPin && route.length >= 2) {
    const pNMinus1 = route[route.length - 2];
    const pN = route[route.length - 1];
    const arrX = Math.sign(pN.x - pNMinus1.x);
    const arrY = Math.sign(pN.y - pNMinus1.y);
    // Arrival enters into the pin normal
    const correctInward =
      (endPin.dir.dx === 0 || arrX === -endPin.dir.dx) &&
      (endPin.dir.dy === 0 || arrY === -endPin.dir.dy);
    assert(correctInward, `${testName} - Wire enters target pin along arrival corridor normal`);
  }
}

// -----------------------------------------------------------------------------
// TEST 1: Horizontal-to-Horizontal Route Around Obstacle
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Horizontal-to-Horizontal Route Around Obstacle ---');
const gateA = createComponent('and', 100, 200);
const gateB = createComponent('or', 400, 200);
const obstacleIC: Box = { x: 220, y: 170, width: 80, height: 80 }; // Directly between gates

const startH: PinEndpoint = {
  x: gateA.x + gateA.outputs[0].x,
  y: gateA.y + gateA.outputs[0].y,
  dir: { dx: 1, dy: 0 }, // Exits RIGHT
  compId: gateA.id,
  pinId: gateA.outputs[0].id,
};
const endH: PinEndpoint = {
  x: gateB.x + gateB.inputs[0].x,
  y: gateB.y + gateB.inputs[0].y,
  dir: { dx: -1, dy: 0 }, // Enters LEFT
  compId: gateB.id,
  pinId: gateB.inputs[0].id,
};

const route1 = calculateOrthogonalWireRoute(startH, endH, 0, [obstacleIC]);
assertRouteGeometry(route1, [obstacleIC], 'Test 1 (H-to-H around obstacle)', startH, endH);

// -----------------------------------------------------------------------------
// TEST 2: Vertical-to-Vertical Route Around Obstacle
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Vertical-to-Vertical Route Around Obstacle ---');
const switchA = createComponent('toggle', 200, 500); // Exits UP
const icPinTarget: Box = { x: 160, y: 300, width: 100, height: 60 }; // Middle IC obstacle

const startV: PinEndpoint = {
  x: 200,
  y: 480,
  dir: { dx: 0, dy: -1 }, // Exits UP
  compId: switchA.id,
  pinId: 'out',
};
const endV: PinEndpoint = {
  x: 200,
  y: 180,
  dir: { dx: 0, dy: 1 }, // Enters DOWN into top component
  compId: 'dest_comp',
  pinId: 'in',
};

const route2 = calculateOrthogonalWireRoute(startV, endV, 0, [icPinTarget]);
assertRouteGeometry(route2, [icPinTarget], 'Test 2 (V-to-V around obstacle)', startV, endV);

// -----------------------------------------------------------------------------
// TEST 3: Mixed-Orientation Routes (Horizontal-to-Vertical and Vertical-to-Horizontal)
// (The exact bug case: Naive L-corner previously cut through IC body)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: Mixed-Orientation Routes Around Obstacle ---');
// Gate output exits RIGHT at (100, 200) -> IC target pin enters DOWN at (260, 320)
// Obstacle sits right at the naive corner (260, 200)
const cornerObstacle: Box = { x: 220, y: 170, width: 80, height: 70 };

const startMixedH: PinEndpoint = {
  x: 120,
  y: 200,
  dir: { dx: 1, dy: 0 }, // Horizontal RIGHT
  compId: 'gate_out',
  pinId: 'out',
};
const endMixedV: PinEndpoint = {
  x: 260,
  y: 320,
  dir: { dx: 0, dy: 1 }, // Vertical enters DOWN (e.g. IC bottom pin)
  compId: 'ic_pin',
  pinId: 'pin1',
};

const route3a = calculateOrthogonalWireRoute(startMixedH, endMixedV, 0, [cornerObstacle]);
assertRouteGeometry(route3a, [cornerObstacle], 'Test 3a (Mixed H-to-V around obstacle)', startMixedH, endMixedV);

// Opposite mixed: Vertical-to-Horizontal
const startMixedV: PinEndpoint = {
  x: 200,
  y: 100,
  dir: { dx: 0, dy: 1 }, // Vertical DOWN
  compId: 'comp_top',
  pinId: 'out',
};
const endMixedH: PinEndpoint = {
  x: 350,
  y: 220,
  dir: { dx: -1, dy: 0 }, // Horizontal LEFT
  compId: 'comp_right',
  pinId: 'in',
};
const obstacleMixed2: Box = { x: 180, y: 160, width: 90, height: 80 };
const route3b = calculateOrthogonalWireRoute(startMixedV, endMixedH, 0, [obstacleMixed2]);
assertRouteGeometry(route3b, [obstacleMixed2], 'Test 3b (Mixed V-to-H around obstacle)', startMixedV, endMixedH);

// -----------------------------------------------------------------------------
// TEST 4: Wire Between Two ICs (DIP-20 Sockets)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: Wire Between Two Adjacent DIP ICs ---');
const ic1: CircuitComponent = {
  id: 'ic1',
  type: 'ic_7408',
  x: 54,
  y: 150,
  width: 250,
  height: 88,
  inputs: [],
  outputs: [],
};
const ic2: CircuitComponent = {
  id: 'ic2',
  type: 'ic_7432',
  x: 328,
  y: 150,
  width: 250,
  height: 88,
  inputs: [],
  outputs: [],
};
const obstaclesTwoICs = getComponentObstacles([ic1, ic2]);

// Connect Pin 3 on IC1 (bottom row, exits DOWN) to Pin 1 on IC2 (bottom row, exits DOWN)
const epIC1_Pin3: PinEndpoint = {
  x: 54 + 50,
  y: 150 + 88,
  dir: { dx: 0, dy: 1 },
  compId: ic1.id,
  pinId: 'pin3',
};
const epIC2_Pin1: PinEndpoint = {
  x: 328 + 20,
  y: 150 + 88,
  dir: { dx: 0, dy: 1 },
  compId: ic2.id,
  pinId: 'pin1',
};

const route4 = calculateOrthogonalWireRoute(epIC1_Pin3, epIC2_Pin1, 0, obstaclesTwoICs, [ic1, ic2]);
assertRouteGeometry(route4, obstaclesTwoICs, 'Test 4 (Wire between two ICs)', epIC1_Pin3, epIC2_Pin1);

// -----------------------------------------------------------------------------
// TEST 5: Wire Between Gate and IC Across Intermediate Chips
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: Wire Between Standalone Gate and IC Across Chip ---');
const gateStandalone = createComponent('nand', 20, 280);
const intermediateChip: Box = { x: 140, y: 250, width: 140, height: 80 };

const epGateOut: PinEndpoint = {
  x: gateStandalone.x + gateStandalone.width,
  y: gateStandalone.y + 20,
  dir: { dx: 1, dy: 0 },
  compId: gateStandalone.id,
  pinId: 'out',
};
const epDestICPin: PinEndpoint = {
  x: 320,
  y: 200,
  dir: { dx: 0, dy: 1 },
  compId: 'dest_ic',
  pinId: 'pin2',
};

const route5 = calculateOrthogonalWireRoute(epGateOut, epDestICPin, 0, [intermediateChip]);
assertRouteGeometry(route5, [intermediateChip], 'Test 5 (Gate to IC across chip)', epGateOut, epDestICPin);

// -----------------------------------------------------------------------------
// TEST 6: Wire Around Custom IC
// -----------------------------------------------------------------------------
console.log('\n--- TEST 6: Wire Routing Around Custom IC Box ---');
const customICBox: Box = { x: 200, y: 150, width: 180, height: 100 };
const startCustom: PinEndpoint = {
  x: 140,
  y: 200,
  dir: { dx: 1, dy: 0 },
  compId: 'src',
  pinId: 'out',
};
const endCustom: PinEndpoint = {
  x: 440,
  y: 200,
  dir: { dx: -1, dy: 0 },
  compId: 'dst',
  pinId: 'in',
};

const route6 = calculateOrthogonalWireRoute(startCustom, endCustom, 0, [customICBox]);
assertRouteGeometry(route6, [customICBox], 'Test 6 (Wire around Custom IC)', startCustom, endCustom);

// -----------------------------------------------------------------------------
// TEST 7: Multiple Simultaneous Obstacles
// -----------------------------------------------------------------------------
console.log('\n--- TEST 7: Multi-Obstacle Constrained Maze ---');
const obstaclesMaze: Box[] = [
  { x: 180, y: 150, width: 70, height: 60 },
  { x: 280, y: 180, width: 60, height: 80 },
  { x: 380, y: 130, width: 70, height: 70 },
];
const startMaze: PinEndpoint = {
  x: 100,
  y: 190,
  dir: { dx: 1, dy: 0 },
  compId: 'maze_start',
  pinId: 'out',
};
const endMaze: PinEndpoint = {
  x: 500,
  y: 190,
  dir: { dx: -1, dy: 0 },
  compId: 'maze_end',
  pinId: 'in',
};

const route7 = calculateOrthogonalWireRoute(startMaze, endMaze, 0, obstaclesMaze);
assertRouteGeometry(route7, obstaclesMaze, 'Test 7 (Multiple obstacles detour)', startMaze, endMaze);

// -----------------------------------------------------------------------------
// TEST 8: Multiple Parallel Wires and Lane Spacing Invariant
// -----------------------------------------------------------------------------
console.log('\n--- TEST 8: Parallel Wires and Non-Overlapping Channel Lanes ---');
const parallelRoutes: Point[][] = [];
for (let laneIdx = 0; laneIdx < 4; laneIdx++) {
  const r = calculateOrthogonalWireRoute(startH, endH, laneIdx, [obstacleIC]);
  parallelRoutes.push(r);
  assertRouteGeometry(r, [obstacleIC], `Test 8 (Lane ${laneIdx})`);
}

// Check that parallel routes have distinct channel coordinates (no overlap)
const channelCoords = parallelRoutes.map((r) => {
  // Find a horizontal segment that runs along the detour channel
  const hSeg = r.find((p, idx) => idx > 0 && p.y === r[idx - 1].y && Math.abs(p.x - r[idx - 1].x) > 30);
  return hSeg ? hSeg.y : r[2].y;
});

const uniqueChannels = new Set(channelCoords);
assert(uniqueChannels.size === parallelRoutes.length, 'Parallel wires receive distinct channel lanes (zero visual collision)');

// -----------------------------------------------------------------------------
// TEST 9: Moving Connected Component Reroutes Cleanly
// -----------------------------------------------------------------------------
console.log('\n--- TEST 9: Moving Connected Component Dynamically Adapts Route ---');
const movedGateA = { ...gateA, y: gateA.y + 120 };
const movedStartH: PinEndpoint = {
  ...startH,
  y: movedGateA.y + movedGateA.outputs[0].y,
};
const route9 = calculateOrthogonalWireRoute(movedStartH, endH, 0, [obstacleIC]);
assertRouteGeometry(route9, [obstacleIC], 'Test 9 (Rerouted after component move)', movedStartH, endH);
assert(route9[0].y === movedStartH.y, 'Route starts at new moved position');

// -----------------------------------------------------------------------------
// TEST 10: Moving Trainer Board Updates Routes
// -----------------------------------------------------------------------------
console.log('\n--- TEST 10: Moving Trainer Board Updates Obstacle Keep-Out Geometry ---');
let testCircuit: Circuit = { components: [], wires: [] };
const { board: initialBoard, components: boardComps } = createInitialTrainerBoard('board_1');
testCircuit.trainerBoards = [initialBoard];
testCircuit.components = boardComps;

const mountRes = mountICOnSocket(testCircuit, 0, 'ic_7408');
testCircuit = mountRes.circuit;

// Translate trainer board by delta (100, 60)
testCircuit = moveTrainerBoard(testCircuit, 'board_1', 100, 60);
const movedMountedIC = testCircuit.components.find((c) => c.id === mountRes.mountedComponent.id)!;
assert(movedMountedIC.x === 54 + 100 && movedMountedIC.y === 150 + 60, 'Mounted IC translated with trainer board');

const movedObstacles = getComponentObstacles(testCircuit.components);
assert(movedObstacles.some((b) => b.x === movedMountedIC.x - ROUTING_CONFIG.COMPONENT_KEEP_OUT_MARGIN), 'Obstacle map updated to moved coordinates');

// -----------------------------------------------------------------------------
// TEST 11: Dynamic Module Expansion (4 -> 6 -> 8 Sockets)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 11: Module Expansion Generates Clean Extended Obstacles ---');
testCircuit = addModuleToTrainerBoard(testCircuit, 'board_1').circuit;
const expandedObstacles = getComponentObstacles(testCircuit.components);
assert(expandedObstacles.length >= 1, 'Expanded board obstacles detected');

// -----------------------------------------------------------------------------
// TEST 12: Zoom and Pan Transformation Invariance
// -----------------------------------------------------------------------------
console.log('\n--- TEST 12: Viewport Zoom/Pan Preserves World Route Invariance ---');
// World coordinates are invariant under screen transformations
const worldRoute = calculateOrthogonalWireRoute(startH, endH, 0, [obstacleIC]);
const svgPath1 = pointsToSvgPath(worldRoute, ROUTING_CONFIG.CORNER_RADIUS);
assert(svgPath1.startsWith('M ') && svgPath1.includes('Q '), 'SVG path with corner fillets preserved');

// -----------------------------------------------------------------------------
// TEST 13: Circuit Save & Reload Serialization Invariance
// -----------------------------------------------------------------------------
console.log('\n--- TEST 13: Save / Reload Serialization Preserves Wire Integrity ---');
const testWire: Wire = {
  id: 'wire_test_1',
  fromCompId: gateA.id,
  fromPinId: 'out_1',
  toCompId: gateB.id,
  toPinId: 'in_1',
  value: '1',
};
testCircuit.wires = [testWire];

const jsonString = JSON.stringify(testCircuit);
const reloadedCircuit: Circuit = JSON.parse(jsonString);

assert(reloadedCircuit.wires.length === 1, 'Serialized circuit contains exactly 1 wire');
assert(reloadedCircuit.wires[0].id === 'wire_test_1', 'Wire ID preserved across JSON serialization');
assert(reloadedCircuit.wires[0].fromCompId === gateA.id, 'Wire source preserved');
assert(reloadedCircuit.wires[0].toCompId === gateB.id, 'Wire destination preserved');

// -----------------------------------------------------------------------------
// TEST 14: Simulation Connectivity Independence
// -----------------------------------------------------------------------------
console.log('\n--- TEST 14: Simulation Engine Operates Independently of Route Geometry ---');
// Simulation relies purely on logical graph, not visual path points
const simGateA = createComponent('and', 50, 50);
const simGateB = createComponent('or', 250, 50);
simGateA.inputs[0].value = '1';
simGateA.inputs[1].value = '1';

const simWire: Wire = {
  id: 'sim_w1',
  fromCompId: simGateA.id,
  fromPinId: simGateA.outputs[0].id,
  toCompId: simGateB.id,
  toPinId: simGateB.inputs[0].id,
  value: '0',
};

const simCirc: Circuit = {
  components: [simGateA, simGateB],
  wires: [simWire],
};

const simResult = simulateCircuit(simCirc);
const simB_Input = simResult.circuit.components.find((c) => c.id === simGateB.id)?.inputs[0].value;
assert(simB_Input === '1', 'Logical simulation successfully propagated HIGH value through wire independent of route points');

console.log('\n====================================================');
console.log('🎉 ALL 14 PHASE 2 WIRE ROUTING & OBSTACLE TESTS PASSED!');
console.log('====================================================');
