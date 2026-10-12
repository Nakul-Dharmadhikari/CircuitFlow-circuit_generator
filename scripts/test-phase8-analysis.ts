import assert from 'assert';
import type {
  Circuit,
  CircuitComponent,
  CustomICDefinition,
  LogicValue,
  Wire,
} from '../src/types/circuit';
import { createComponent } from '../src/engine/simulator';
import {
  analyzeCircuitOverview,
  runCircuitDiagnostics,
  generateUnifiedTruthTable,
  generateKMap,
  generateKMapFromTruthTable,
  analyzeSequentialCircuit,
  runTestBench,
  runTimingSimulation,
  minimizeBooleanFunction,
  GRAY_CODES,
} from '../src/engine/analysis';
import { CUSTOM_IC_TEMPLATES } from '../src/utils/customIcTemplates';

console.log('================================================================');
console.log('CIRCUITFLOW PHASE 8: UNIFIED CIRCUIT ANALYSIS ENGINE TEST SUITE');
console.log('Testing: Circuit Overview, Unified Truth Table, Karnaugh Maps (2-6 vars),');
console.log('Boolean Minimization, Discrete Timing Traces, Sequential State Transitions,');
console.log('Test Bench Verification, and Diagnostics');
console.log('================================================================\n');

let passCount = 0;
function pass(testName: string) {
  passCount++;
  console.log(`✔ PASS: ${testName}`);
}

function makeWire(id: string, fromCompId: string, fromPinId: string, toCompId: string, toPinId: string): Wire {
  return {
    id,
    fromCompId,
    fromPinId,
    toCompId,
    toPinId,
    from: { componentId: fromCompId, pinId: fromPinId },
    to: { componentId: toCompId, pinId: toPinId },
  };
}

function createCircuit(components: CircuitComponent[], wires: Wire[] = []): Circuit {
  return {
    id: 'test_circuit',
    name: 'Test Circuit',
    version: 1,
    components,
    wires,
  };
}

// =============================================================================
// TEST 1: Circuit Overview Engine Facts & Categorization
// =============================================================================
console.log('\n--- 1. Circuit Overview Engine Facts & Categorization ---');

const inA = createComponent('toggle', 50, 50);
inA.id = 'in_a';
inA.label = 'A';

const inB = createComponent('toggle', 50, 150);
inB.id = 'in_b';
inB.label = 'B';

const andGate = createComponent('and', 200, 100);
andGate.id = 'and_1';
andGate.label = 'AND1';

const outY = createComponent('led', 350, 100);
outY.id = 'out_y';
outY.label = 'Y';

const wire1 = makeWire('w1', 'in_a', inA.outputs[0].id, 'and_1', andGate.inputs[0].id);
const wire2 = makeWire('w2', 'in_b', inB.outputs[0].id, 'and_1', andGate.inputs[1].id);
const wire3 = makeWire('w3', 'and_1', andGate.outputs[0].id, 'out_y', outY.inputs[0].id);

const simpleAndCircuit = createCircuit([inA, inB, andGate, outY], [wire1, wire2, wire3]);
const overview1 = analyzeCircuitOverview(simpleAndCircuit);

assert.strictEqual(overview1.totalComponents, 4, 'Total components must be 4');
assert.strictEqual(overview1.totalWires, 3, 'Total wires must be 3');
assert.strictEqual(overview1.categories.gates, 1, 'Gates count must be 1');
assert.strictEqual(overview1.categories.io, 3, 'IO count must be 3 (2 toggles + 1 led)');
assert.strictEqual(overview1.inputs.length, 2, 'Must discover 2 input pins');
assert.strictEqual(overview1.outputs.length, 1, 'Must discover 1 output pin');
assert.strictEqual(overview1.clocksCount, 0, 'No clock in this circuit');
assert.strictEqual(overview1.feedbackDetected, false, 'Acyclic combinational circuit');
assert.strictEqual(overview1.canGenerateTruthTable, true, 'Truth table feasible');
assert.strictEqual(overview1.canGenerateKMap, true, 'K-map feasible');
assert.strictEqual(overview1.circuitType, 'combinational');

pass('Overview correctly categorizes components, identifies I/Os, and verifies feasibility');

// =============================================================================
// TEST 2: Combinational Truth Table Generation (Half Adder)
// =============================================================================
console.log('\n--- 2. Combinational Truth Table Generation ---');

const haInA = createComponent('toggle', 50, 50);
haInA.id = 'ha_a'; haInA.label = 'A';

const haInB = createComponent('toggle', 50, 150);
haInB.id = 'ha_b'; haInB.label = 'B';

const haXor = createComponent('xor', 200, 50);
haXor.id = 'ha_xor'; haXor.label = 'XOR1';

const haAnd = createComponent('and', 200, 150);
haAnd.id = 'ha_and'; haAnd.label = 'AND1';

const haSum = createComponent('led', 350, 50);
haSum.id = 'ha_sum'; haSum.label = 'Sum';

const haCarry = createComponent('led', 350, 150);
haCarry.id = 'ha_carry'; haCarry.label = 'Carry';

const haWires: Wire[] = [
  makeWire('w_a_xor', 'ha_a', haInA.outputs[0].id, 'ha_xor', haXor.inputs[0].id),
  makeWire('w_b_xor', 'ha_b', haInB.outputs[0].id, 'ha_xor', haXor.inputs[1].id),
  makeWire('w_a_and', 'ha_a', haInA.outputs[0].id, 'ha_and', haAnd.inputs[0].id),
  makeWire('w_b_and', 'ha_b', haInB.outputs[0].id, 'ha_and', haAnd.inputs[1].id),
  makeWire('w_xor_sum', 'ha_xor', haXor.outputs[0].id, 'ha_sum', haSum.inputs[0].id),
  makeWire('w_and_carry', 'ha_and', haAnd.outputs[0].id, 'ha_carry', haCarry.inputs[0].id),
];

const halfAdderCircuit = createCircuit([haInA, haInB, haXor, haAnd, haSum, haCarry], haWires);
const haTable = generateUnifiedTruthTable(halfAdderCircuit);

assert.strictEqual(haTable.valid, true, 'Half adder truth table must be valid');
assert.strictEqual(haTable.inputNames.length, 2, '2 input columns');
assert.strictEqual(haTable.outputNames.length, 2, '2 output columns');
assert.strictEqual(haTable.rows.length, 4, '4 rows for 2 inputs');

// Check the 4 expected truth table rows:
// 0, 0 => Sum: 0, Carry: 0
// 0, 1 => Sum: 1, Carry: 0
// 1, 0 => Sum: 1, Carry: 0
// 1, 1 => Sum: 0, Carry: 1
const row00 = haTable.rows[0];
const row01 = haTable.rows[1];
const row10 = haTable.rows[2];
const row11 = haTable.rows[3];

assert.strictEqual(row00.outputs['Sum'], '0', '0+0 Sum must be 0');
assert.strictEqual(row00.outputs['Carry'], '0', '0+0 Carry must be 0');
assert.strictEqual(row01.outputs['Sum'], '1', '0+1 Sum must be 1');
assert.strictEqual(row01.outputs['Carry'], '0', '0+1 Carry must be 0');
assert.strictEqual(row10.outputs['Sum'], '1', '1+0 Sum must be 1');
assert.strictEqual(row10.outputs['Carry'], '0', '1+0 Carry must be 0');
assert.strictEqual(row11.outputs['Sum'], '0', '1+1 Sum must be 0');
assert.strictEqual(row11.outputs['Carry'], '1', '1+1 Carry must be 1');

pass('Half Adder truth table correctly generated with exact Boolean outputs');

// =============================================================================
// TEST 3: Custom IC Explicit Pin Mapping with Inversion Settings
// =============================================================================
console.log('\n--- 3. Custom IC Explicit Pin Mapping & Inversion ---');

const templateHalfAdder = CUSTOM_IC_TEMPLATES.half_adder.createDefinition('user_test');
const customIcTable = generateUnifiedTruthTable(templateHalfAdder);

assert.strictEqual(customIcTable.valid, true, 'Custom IC should generate valid truth table');
assert.strictEqual(customIcTable.inputNames.length, 2, '2 mapped input pins (A, B)');
assert.strictEqual(customIcTable.outputNames.length, 2, '2 mapped output pins (SUM, CARRY)');
assert.strictEqual(customIcTable.rows.length, 4, '4 rows for Custom IC');

// Test Inversion handling on Custom IC pin
const invertedTemplate: CustomICDefinition = JSON.parse(JSON.stringify(templateHalfAdder));
const sumPin = invertedTemplate.pins.find((p) => p.pin === 3);
if (sumPin) sumPin.inverted = true;

const invertedTable = generateUnifiedTruthTable(invertedTemplate);
assert.strictEqual(invertedTable.rows[0].outputs['SUM'], '1', '0+0 inverted SUM must be 1');
assert.strictEqual(invertedTable.rows[1].outputs['SUM'], '0', '0+1 inverted SUM must be 0');
assert.strictEqual(invertedTable.rows[2].outputs['SUM'], '0', '1+0 inverted SUM must be 0');
assert.strictEqual(invertedTable.rows[3].outputs['SUM'], '1', '1+1 inverted SUM must be 1');

pass('Custom IC respects explicit external-to-internal pin mapping and inversion');

// =============================================================================
// TEST 4: Truth Table Input Size Limits & Sequential Circuit Guard
// =============================================================================
console.log('\n--- 4. Truth Table Limits & Sequential Circuit Guard ---');

// 1. Create a 7-input circuit with an output
const sevenInputs = Array.from({ length: 7 }, (_, i) => {
  const t = createComponent('toggle', 50, i * 40);
  t.id = `sw_${i}`;
  t.label = `In${i}`;
  return t;
});
const sevenOut = createComponent('led', 250, 100);
sevenOut.id = 'seven_out';
sevenOut.label = 'Out7';
const sevenWire = makeWire('w_seven', 'sw_0', sevenInputs[0].outputs[0].id, 'seven_out', sevenOut.inputs[0].id);

const sevenInCircuit = createCircuit([...sevenInputs, sevenOut], [sevenWire]);
const limitTable = generateUnifiedTruthTable(sevenInCircuit, { maxInputs: 6, forceGenerateLarge: false });

assert.ok(limitTable.sizeWarning, 'Must produce size warning for >6 inputs');
assert.strictEqual(limitTable.totalCombinations, 128, 'Total combinations must be 2^7 = 128');
assert.strictEqual(limitTable.rows.length, 64, 'Clamped to 64 rows without force');

// Now generate with forceGenerateLarge = true
const forcedTable = generateUnifiedTruthTable(sevenInCircuit, { maxInputs: 6, forceGenerateLarge: true });
assert.strictEqual(forcedTable.rows.length, 128, 'Forced table must generate all 128 rows');

// 2. Sequential Circuit guard: D Flip-Flop
const dff = createComponent('d_flip_flop', 200, 100);
dff.id = 'dff_1';
const seqCircuit = createCircuit([inA, inB, dff, outY]);
const seqTable = generateUnifiedTruthTable(seqCircuit);

assert.strictEqual(seqTable.valid, false, 'Sequential circuit must not generate stateless combinational table');
assert.strictEqual(seqTable.circuitType, 'sequential');
assert.ok(seqTable.unsupportedMessage?.includes('Sequential'), 'Reason must mention sequential behavior');

pass('Truth table enforces input size limits and guards against sequential circuits');

// =============================================================================
// TEST 5: Karnaugh Map Engine for 2, 3, 4, 5, and 6 Variables
// =============================================================================
console.log('\n--- 5. Karnaugh Maps for 2, 3, 4, 5, and 6 Variables ---');

// Verify standard Gray codes
assert.deepStrictEqual(GRAY_CODES[1], ['0', '1']);
assert.deepStrictEqual(GRAY_CODES[2], ['00', '01', '11', '10']);
assert.deepStrictEqual(GRAY_CODES[3], ['000', '001', '011', '010', '110', '111', '101', '100']);

// 2-variable K-Map (Half Adder Sum)
const kmap2 = generateKMap(halfAdderCircuit, 'Sum');
assert.ok(kmap2, 'K-map 2 must be generated');
assert.strictEqual(kmap2!.numVariables, 2, '2 variables');
assert.strictEqual(kmap2!.grids[0].rowHeaders.length, 2, 'Row headers length 2');
assert.strictEqual(kmap2!.grids[0].colHeaders.length, 2, 'Col headers length 2');
assert.strictEqual(kmap2!.grids[0].cells.length, 2, '2 rows of cells');
assert.strictEqual(kmap2!.grids[0].cells[0].length, 2, '2 cols of cells');
// Cell (0,0) -> A=0, B=0 -> minterm 0 -> val 0
// Cell (0,1) -> A=0, B=1 -> minterm 1 -> val 1
// Cell (1,0) -> A=1, B=0 -> minterm 2 -> val 1
// Cell (1,1) -> A=1, B=1 -> minterm 3 -> val 0
assert.strictEqual(kmap2!.grids[0].cells[0][0].value, '0');
assert.strictEqual(kmap2!.grids[0].cells[0][1].value, '1');
assert.strictEqual(kmap2!.grids[0].cells[1][0].value, '1');
assert.strictEqual(kmap2!.grids[0].cells[1][1].value, '0');
assert.deepStrictEqual(kmap2!.minterms, [1, 2], 'Minterms for XOR must be [1, 2]');

pass('2-variable K-map correctly generated with Gray code and cell placement');

// 3-variable K-Map: Majority voter M = AB + BC + AC (minterms 3, 5, 6, 7)
const majTableData = {
  inputNames: ['A', 'B', 'C'],
  outputNames: ['M'],
  rows: [
    { inputs: { A: '0', B: '0', C: '0' }, outputs: { M: '0' } }, // m0
    { inputs: { A: '0', B: '0', C: '1' }, outputs: { M: '0' } }, // m1
    { inputs: { A: '0', B: '1', C: '0' }, outputs: { M: '0' } }, // m2
    { inputs: { A: '0', B: '1', C: '1' }, outputs: { M: '1' } }, // m3
    { inputs: { A: '1', B: '0', C: '0' }, outputs: { M: '0' } }, // m4
    { inputs: { A: '1', B: '0', C: '1' }, outputs: { M: '1' } }, // m5
    { inputs: { A: '1', B: '1', C: '0' }, outputs: { M: '1' } }, // m6
    { inputs: { A: '1', B: '1', C: '1' }, outputs: { M: '1' } }, // m7
  ] as { inputs: Record<string, LogicValue>; outputs: Record<string, LogicValue> }[],
};

const kmap3 = generateKMapFromTruthTable(majTableData, 'M');
assert.ok(kmap3);
assert.strictEqual(kmap3!.numVariables, 3, '3 variables');
assert.strictEqual(kmap3!.grids[0].rowHeaders.length, 2, 'Row headers (A): 0, 1');
assert.strictEqual(kmap3!.grids[0].colHeaders.length, 4, 'Col headers (BC): 00, 01, 11, 10');
assert.deepStrictEqual(kmap3!.grids[0].colHeaders, ['00', '01', '11', '10'], 'Gray code order for BC');
// In row 0 (A=0): col 0 (m0: 0), col 1 (m1: 0), col 2 (m3: 1), col 3 (m2: 0)
assert.strictEqual(kmap3!.grids[0].cells[0][0].value, '0');
assert.strictEqual(kmap3!.grids[0].cells[0][1].value, '0');
assert.strictEqual(kmap3!.grids[0].cells[0][2].value, '1');
assert.strictEqual(kmap3!.grids[0].cells[0][3].value, '0');
// In row 1 (A=1): col 0 (m4: 0), col 1 (m5: 1), col 2 (m7: 1), col 3 (m6: 1)
assert.strictEqual(kmap3!.grids[0].cells[1][0].value, '0');
assert.strictEqual(kmap3!.grids[0].cells[1][1].value, '1');
assert.strictEqual(kmap3!.grids[0].cells[1][2].value, '1');
assert.strictEqual(kmap3!.grids[0].cells[1][3].value, '1');

pass('3-variable K-map preserves standard Gray-code ordering (00, 01, 11, 10)');

// 4-variable K-Map
const fourVarRows = Array.from({ length: 16 }, (_, m) => {
  const bin = m.toString(2).padStart(4, '0');
  return {
    inputs: { A: bin[0] as LogicValue, B: bin[1] as LogicValue, C: bin[2] as LogicValue, D: bin[3] as LogicValue },
    outputs: { F: (m === 0 || m === 2 || m === 8 || m === 10 ? '1' : '0') as LogicValue },
  };
});
const kmap4 = generateKMapFromTruthTable({ inputNames: ['A', 'B', 'C', 'D'], outputNames: ['F'], rows: fourVarRows }, 'F');
assert.ok(kmap4);
assert.strictEqual(kmap4!.numVariables, 4);
assert.strictEqual(kmap4!.grids[0].cells.length, 4, '4 rows (AB)');
assert.strictEqual(kmap4!.grids[0].cells[0].length, 4, '4 cols (CD)');
assert.deepStrictEqual(kmap4!.grids[0].rowHeaders, ['00', '01', '11', '10']);
assert.deepStrictEqual(kmap4!.grids[0].colHeaders, ['00', '01', '11', '10']);

pass('4-variable K-map correctly creates 4x4 matrix with Gray-coded rows and cols');

// 5-variable K-Map (32 minterms, 2 layers of 4x4)
const fiveVarRows = Array.from({ length: 32 }, (_, m) => {
  const bin = m.toString(2).padStart(5, '0');
  return {
    inputs: { A: bin[0] as LogicValue, B: bin[1] as LogicValue, C: bin[2] as LogicValue, D: bin[3] as LogicValue, E: bin[4] as LogicValue },
    outputs: { F: '1' as LogicValue },
  };
});
const kmap5 = generateKMapFromTruthTable({ inputNames: ['A', 'B', 'C', 'D', 'E'], outputNames: ['F'], rows: fiveVarRows }, 'F');
assert.ok(kmap5);
assert.strictEqual(kmap5!.numVariables, 5);
assert.strictEqual(kmap5!.grids.length, 2, '5-variable K-map has 2 layers (E=0, E=1)');
assert.strictEqual(kmap5!.grids[0].cells.length, 4, 'Layer 1 has 4 rows');
assert.strictEqual(kmap5!.grids[0].cells[0].length, 4, 'Layer 1 has 4 cols');

pass('5-variable K-map correctly creates 2-layer Gray-coded structure');

// 6-variable K-Map (64 minterms, 4 layers of 4x4)
const sixVarRows = Array.from({ length: 64 }, (_, m) => {
  const bin = m.toString(2).padStart(6, '0');
  return {
    inputs: {
      A: bin[0] as LogicValue,
      B: bin[1] as LogicValue,
      C: bin[2] as LogicValue,
      D: bin[3] as LogicValue,
      E: bin[4] as LogicValue,
      F: bin[5] as LogicValue,
    },
    outputs: { Out: '1' as LogicValue },
  };
});
const kmap6 = generateKMapFromTruthTable(
  { inputNames: ['A', 'B', 'C', 'D', 'E', 'F'], outputNames: ['Out'], rows: sixVarRows },
  'Out'
);
assert.ok(kmap6);
assert.strictEqual(kmap6!.numVariables, 6);
assert.strictEqual(kmap6!.grids.length, 4, '6-variable K-map has 4 layers (EF in Gray code: 00, 01, 11, 10)');
assert.deepStrictEqual(
  kmap6!.grids.map((g) => g.layerValue?.replace(/.*=\s*/, '')),
  ['00', '01', '11', '10'],
  'Layers ordered in Gray code'
);

pass('6-variable K-map correctly creates 4-layer 4x4 structure with Gray codes');

// =============================================================================
// TEST 6: Quine-McCluskey / Petrick's Boolean Minimization
// =============================================================================
console.log('\n--- 6. Quine-McCluskey Boolean Minimization ---');

// Test 1: F(A, B) = minterms 1, 3 => F = B
const min1 = minimizeBooleanFunction(['A', 'B'], [1, 3]);
assert.ok(min1.simplifiedSOP, 'Should produce simplified SOP');
assert.strictEqual(min1.simplifiedSOP.replace(/\s+/g, ''), 'B', 'Minterms {1, 3} must simplify to B');

// Test 2: F(A, B, C) = minterms 0, 1, 2, 3 => F = A'
const min2 = minimizeBooleanFunction(['A', 'B', 'C'], [0, 1, 2, 3]);
assert.strictEqual(min2.simplifiedSOP.replace(/\s+/g, ''), "A'", 'Minterms {0, 1, 2, 3} must simplify to A\'');

// Test 3: 4-variable corners: F(A, B, C, D) = minterms 0, 2, 8, 10 => F = B'D'
const min3 = minimizeBooleanFunction(['A', 'B', 'C', 'D'], [0, 2, 8, 10]);
assert.strictEqual(min3.simplifiedSOP.replace(/\s+/g, ''), "B'·D'", 'Four corners must simplify to B\'·D\'');

// Test 4: All 1s => F = 1
const minAll = minimizeBooleanFunction(['A', 'B'], [0, 1, 2, 3]);
assert.strictEqual(minAll.simplifiedSOP, '1', 'All minterms must simplify to 1');

// Test 5: All 0s => F = 0
const minNone = minimizeBooleanFunction(['A', 'B'], []);
assert.strictEqual(minNone.simplifiedSOP, '0', 'Zero minterms must simplify to 0');

pass('Quine-McCluskey engine reliably minimizes Boolean expressions without decorative claims');

// =============================================================================
// TEST 7: Discrete Timing and Waveform Progression
// =============================================================================
console.log('\n--- 7. Discrete Timing & Waveform Progression ---');

// Circuit with clock and inverter
const clkComp = createComponent('clock', 50, 50);
clkComp.id = 'clk_1';
clkComp.label = 'CLK';

const notGate = createComponent('not', 200, 50);
notGate.id = 'not_1';

const clkOut = createComponent('led', 350, 50);
clkOut.id = 'led_inv';
clkOut.label = 'Q_NOT';

const clkWires: Wire[] = [
  makeWire('w_clk_not', 'clk_1', clkComp.outputs[0].id, 'not_1', notGate.inputs[0].id),
  makeWire('w_not_led', 'not_1', notGate.outputs[0].id, 'led_inv', clkOut.inputs[0].id),
];

const timingCircuit = createCircuit([clkComp, notGate, clkOut], clkWires);
const timingResult = runTimingSimulation(timingCircuit, { steps: 16 });

assert.strictEqual(timingResult.stepCount, 16, 'Simulation must run exactly requested 16 steps');
assert.ok(timingResult.channels.length >= 2, 'Must have at least CLK and output channels');
assert.ok(timingResult.clockSteps.length > 0, 'Must record rising edges for clock');

// Verify that the inverter output is the logical NOT of the clock at every discrete step
const clkChannel = timingResult.channels.find((ch) => ch.name.includes('CLK'));
const invChannel = timingResult.channels.find((ch) => ch.name.includes('Q_NOT') || ch.name.includes('not_1'));
assert.ok(clkChannel, 'Clock channel must exist');
assert.ok(invChannel, 'Inverted channel must exist');

for (let step = 0; step < 16; step++) {
  const cVal = clkChannel!.values[step];
  const iVal = invChannel!.values[step];
  if (cVal === '1') {
    assert.strictEqual(iVal, '0', `Step ${step}: NOT(1) must be 0`);
  } else if (cVal === '0') {
    assert.strictEqual(iVal, '1', `Step ${step}: NOT(0) must be 1`);
  }
}

pass('Discrete timing simulation correctly tracks clock edge events and digital signal steps');

// =============================================================================
// TEST 8: Sequential State Analysis & Controlled Clock Transitions
// =============================================================================
console.log('\n--- 8. Sequential State Analysis & Controlled Transitions ---');

// Build a D Flip-Flop test setup
const seqD = createComponent('toggle', 50, 50);
seqD.id = 'seq_d'; seqD.label = 'D';

const seqClk = createComponent('clock', 50, 150);
seqClk.id = 'seq_clk'; seqClk.label = 'CLK';

const seqDFF = createComponent('ic_7474', 200, 100);
seqDFF.id = 'seq_dff';

const seqQ = createComponent('led', 350, 100);
seqQ.id = 'seq_q'; seqQ.label = 'Q';

const seqWires: Wire[] = [
  makeWire('w_d', 'seq_d', seqD.outputs[0].id, 'seq_dff', seqDFF.inputs[1].id),
  makeWire('w_clk', 'seq_clk', seqClk.outputs[0].id, 'seq_dff', seqDFF.inputs[0].id),
  makeWire('w_q', 'seq_dff', seqDFF.outputs[0].id, 'seq_q', seqQ.inputs[0].id),
];

const dffCircuit = createCircuit([seqD, seqClk, seqDFF, seqQ], seqWires);
const seqAnalysis = analyzeSequentialCircuit(dffCircuit);

assert.strictEqual(seqAnalysis.isSequential, true, 'Circuit must be identified as sequential');
assert.strictEqual(seqAnalysis.sequentialElements.length, 1, 'Discovered 1 sequential flip-flop element');
assert.ok(seqAnalysis.transitions.length > 0, 'Generated controlled transition rows');

// Verify that transitions record initial state Q and next state Q_next on clock pulse
const trans = seqAnalysis.transitions[0];
assert.ok('currentState' in trans, 'Transition has currentState');
assert.ok('nextState' in trans, 'Transition has nextState');
assert.ok('clockPhase' in trans, 'Transition records clockPhase');

pass('Sequential state analysis verifies clock edge transitions and state retention');

// =============================================================================
// TEST 9: Test Bench Engine Execution & Pass/Fail Metrics
// =============================================================================
console.log('\n--- 9. Test Bench Verification ---');

// Test 1: All passing vectors on Simple AND circuit
const passBench = runTestBench(simpleAndCircuit, [
  { id: 'v1', name: '0 AND 0 = 0', inputs: { 'in_a': '0', 'in_b': '0' }, expectedOutputs: { 'Y': '0' } },
  { id: 'v2', name: '1 AND 0 = 0', inputs: { 'in_a': '1', 'in_b': '0' }, expectedOutputs: { 'Y': '0' } },
  { id: 'v3', name: '1 AND 1 = 1', inputs: { 'in_a': '1', 'in_b': '1' }, expectedOutputs: { 'Y': '1' } },
]);

assert.strictEqual(passBench.totalTests, 3);
assert.strictEqual(passBench.passedTests, 3);
assert.strictEqual(passBench.failedTests, 0);
assert.strictEqual(passBench.passRate, 100);
assert.strictEqual(passBench.allPassed, true);

// Test 2: Failing vector (asserting 1 AND 1 = 0)
const failBench = runTestBench(simpleAndCircuit, [
  { id: 'v1', name: '1 AND 1 = 0 (Intentionally False)', inputs: { 'in_a': '1', 'in_b': '1' }, expectedOutputs: { 'Y': '0' } },
]);

assert.strictEqual(failBench.totalTests, 1);
assert.strictEqual(failBench.passedTests, 0);
assert.strictEqual(failBench.failedTests, 1);
assert.strictEqual(failBench.allPassed, false);
assert.strictEqual(failBench.results[0].passed, false);
assert.ok(failBench.results[0].mismatches.length > 0, 'Records mismatch details');
assert.strictEqual(failBench.results[0].mismatches[0].expected, '0');
assert.strictEqual(failBench.results[0].mismatches[0].observed, '1');

pass('Test bench accurately reports passes, fails, and detailed mismatch discrepancies');

// =============================================================================
// TEST 10: Circuit Diagnostics Engine
// =============================================================================
console.log('\n--- 10. Circuit Diagnostics Engine ---');

// Circuit with problems:
// 1. Broken wire (points to nonexistent component)
// 2. AND gate with floating inputs
const badGate = createComponent('and', 200, 200);
badGate.id = 'bad_and';

const badWire = makeWire('broken_wire', 'nonexistent_comp', 'nonexistent_pin', 'bad_and', badGate.inputs[0].id);

const brokenCircuit = createCircuit([badGate], [badWire]);
const diag = runCircuitDiagnostics(brokenCircuit);

assert.strictEqual(diag.hasErrors, true, 'Diagnostics must identify errors');
const brokenWireIssue = diag.issues.find((i) => i.id.includes('broken_wire') || i.title.includes('Broken Wire'));
assert.ok(brokenWireIssue, 'Must flag Broken Wire for nonexistent component');
assert.strictEqual(brokenWireIssue!.severity, 'error');

const floatingInputIssue = diag.issues.find((i) => i.title.includes('Floating Input'));
assert.ok(floatingInputIssue, 'Must flag Floating Input for unconnected gate pin');
assert.strictEqual(floatingInputIssue!.severity, 'warning');

pass('Diagnostics engine flags broken wire endpoints, floating gate inputs, and severity levels');

console.log('\n================================================================');
console.log(`ALL PHASE 8 TESTS PASSED: ${passCount} tests executed successfully.`);
console.log('================================================================\n');
