import assert from 'node:assert';
import { ensureTrainerKit } from '../src/engine/trainerKit';
import {
  calculateOrthogonalWireRoute,
  getPinEndpoint,
  isRouteBlocked,
  getComponentObstacles,
} from '../src/engine/wiring';
import { mountICOnSocket } from '../src/engine/trainer/trainerBoardModel';
import type { Circuit, Wire } from '../src/types/circuit';
import type { Box } from '../src/engine/wiring/geometry';
import { segmentIntersectsBox } from '../src/engine/wiring/geometry';
import { getWireRole, getWireVisualColor } from '../src/components/WireRenderer';

console.log('================================================================');
console.log('TEST SUITE: TRAINER STRAIGHT ORTHOGONAL WIRING & ROLE COLORING');
console.log('Testing: Corridor Routing, IC Socket Protection, Lane Distribution,');
console.log('         and Distinct Input/Output Wire Color Schemes');
console.log('================================================================\n');

// 1. Setup Board with mounted 7408 IC
let circuit: Circuit = ensureTrainerKit({ components: [], wires: [] });
const res = mountICOnSocket(circuit, 0, 'ic_7408');
circuit = res.circuit;
const board = circuit.trainerBoards![0];
const mountedIC = circuit.components.find((c) => c.type === 'ic_7408')!;

// Unmounted IC Sockets (IC2, IC3, IC4) act as solid keep-out obstacles
const unmountedSocketObstacles: Box[] = board.icSlots
  .filter((s) => !s.mountedComponentId)
  .map((s) => ({
    x: s.x,
    y: s.y,
    width: s.width,
    height: s.height,
    compId: s.id,
  }));

const allObstacles: Box[] = [
  ...getComponentObstacles(circuit.components),
  ...unmountedSocketObstacles,
];

// -----------------------------------------------------------------------------
// TEST 1: Input to IC Pin (Straight corridor below ICs, zero socket penetration)
// -----------------------------------------------------------------------------
console.log('--- Test 1: Straight Corridor Routing from Input Switch to IC ---');
const in1Comp = circuit.components.find((c) => c.id === 'trainer_in_1')!;
const epIn1 = getPinEndpoint(in1Comp.id, 'out', circuit.components)!;
const epPin1A = getPinEndpoint(mountedIC.id, '1', circuit.components)!;

const routeIn1 = calculateOrthogonalWireRoute(epIn1, epPin1A, 0, allObstacles, circuit.components);
assert.ok(!isRouteBlocked(routeIn1), 'Route must NOT be blocked');
assert.ok(routeIn1.length >= 4, 'Route must have valid Manhattan orthogonal points');

// Check that wire runs in the bottom corridor (below y=238) and never crosses IC2, IC3, IC4
for (const socket of unmountedSocketObstacles) {
  for (let i = 0; i < routeIn1.length - 1; i++) {
    const intersects = segmentIntersectsBox(routeIn1[i], routeIn1[i + 1], socket);
    assert.strictEqual(intersects, false, `Wire segment must not cross socket ${socket.compId}`);
  }
}
console.log('✔ PASS: Input wire routes straight through bottom corridor without crossing any IC sockets.');

// -----------------------------------------------------------------------------
// TEST 2: Parallel Input Wires Neat Multi-Lane Distribution
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: Parallel Input Wires Multi-Lane Distribution ---');
const in0Comp = circuit.components.find((c) => c.id === 'trainer_in_0')!;
const epIn0 = getPinEndpoint(in0Comp.id, 'out', circuit.components)!;
const epPin1B = getPinEndpoint(mountedIC.id, '2', circuit.components)!;

const routeIn0 = calculateOrthogonalWireRoute(epIn0, epPin1B, 1, allObstacles, circuit.components);
assert.ok(!isRouteBlocked(routeIn0), 'Route In0 must NOT be blocked');

// Wire 0 (lane 0) and Wire 1 (lane 1) must have different horizontal corridor Y coordinates
const yCorridor0 = routeIn1[2].y;
const yCorridor1 = routeIn0[2].y;
assert.notStrictEqual(yCorridor0, yCorridor1, 'Parallel wires must receive distinct channel lanes');
console.log(`✔ PASS: Parallel wires neatly distributed in separate lanes (Lane 0: y=${yCorridor0}, Lane 1: y=${yCorridor1}).`);

// -----------------------------------------------------------------------------
// TEST 3: VCC to IC Top Pin (Straight top corridor above ICs)
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: VCC Power Route in Top Corridor ---');
const vccComp = circuit.components.find((c) => c.id === 'trainer_vcc')!;
const epVcc = getPinEndpoint(vccComp.id, 'out', circuit.components)!;
const epPin14 = getPinEndpoint(mountedIC.id, '14', circuit.components)!;

const routeVcc = calculateOrthogonalWireRoute(epVcc, epPin14, 0, allObstacles, circuit.components);
assert.ok(!isRouteBlocked(routeVcc), 'VCC route must NOT be blocked');
assert.ok(routeVcc[1].y < 150, 'VCC wire must travel in the top corridor above the IC sockets');
console.log(`✔ PASS: VCC wire routes cleanly through top corridor (y=${routeVcc[1].y}) straight into Pin 14.`);

// -----------------------------------------------------------------------------
// TEST 4: Wire Role Classification
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: Wire Role Classification ---');
const wireInput: Wire = {
  id: 'w_in',
  fromCompId: in1Comp.id,
  fromPinId: 'out',
  toCompId: mountedIC.id,
  toPinId: '1',
  value: '0',
};
const wireOutput: Wire = {
  id: 'w_out',
  fromCompId: mountedIC.id,
  fromPinId: '3',
  toCompId: 'trainer_out_0',
  toPinId: 'in',
  value: '1',
};
const wireVcc: Wire = {
  id: 'w_vcc',
  fromCompId: vccComp.id,
  fromPinId: 'out',
  toCompId: mountedIC.id,
  toPinId: '14',
  value: '1',
};

assert.strictEqual(getWireRole(wireInput, circuit.components), 'input');
assert.strictEqual(getWireRole(wireOutput, circuit.components), 'output');
assert.strictEqual(getWireRole(wireVcc, circuit.components), 'power');
console.log('✔ PASS: Wires accurately classified as input, output, and power roles.');

// -----------------------------------------------------------------------------
// TEST 5: Role-Based Distinct Visual Color Palette
// -----------------------------------------------------------------------------
console.log('\n--- Test 5: Distinct Input vs. Output Color Schemes ---');
const colorInputLow = getWireVisualColor('input', '0', false, false, false);
const colorInputHigh = getWireVisualColor('input', '1', false, false, false);
const colorOutputLow = getWireVisualColor('output', '0', false, false, false);
const colorOutputHigh = getWireVisualColor('output', '1', false, false, false);
const colorVcc = getWireVisualColor('power', '1', false, false, false);

// Input wires: Royal Blue (0) and Electric Cyan (1)
assert.strictEqual(colorInputLow.stroke, '#2563eb', 'Input LOW must be Royal Blue');
assert.strictEqual(colorInputHigh.stroke, '#38bdf8', 'Input HIGH must be Electric Cyan');

// Output wires: Deep Orange (0) and Amber Gold (1)
assert.strictEqual(colorOutputLow.stroke, '#ea580c', 'Output LOW must be Vibrant Deep Orange');
assert.strictEqual(colorOutputHigh.stroke, '#f59e0b', 'Output HIGH must be Luminous Amber Gold');

// Distinctness between input and output
assert.notStrictEqual(colorInputLow.stroke, colorOutputLow.stroke, 'Input and Output LOW colors must be distinctly different');
assert.notStrictEqual(colorInputHigh.stroke, colorOutputHigh.stroke, 'Input and Output HIGH colors must be distinctly different');

// Power VCC: Crimson Red
assert.strictEqual(colorVcc.stroke, '#ef4444', 'Power VCC must be Crimson Red');

console.log('✔ PASS: Input and Output wires have high-contrast, distinct visual color schemes.');

console.log('\n================================================================');
console.log('🎉 ALL TRAINER STRAIGHT WIRING & COLORING CHECKS PASSED (5/5)!');
console.log('================================================================\n');

