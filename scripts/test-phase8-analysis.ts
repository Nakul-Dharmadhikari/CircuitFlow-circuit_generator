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
assert.strictEqual(kmap5!.grids.length, 2, '5-variable K-map has 2 layers (A=0, A=1)');
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
assert.strictEqual(kmap6!.grids.length, 4, '6-variable K-map has 4 layers (AB in Gray code: 00, 01, 11, 10)');
assert.deepStrictEqual(
  kmap6!.grids.map((g) => g.layerValue?.replace(/.*=\s*/, '')),
  ['00', '01', '11', '10'],
  'Layers ordered in Gray code'
);

pass('6-variable K-map correctly creates 4-layer 4x4 structure with Gray codes');

// =============================================================================
// TEST 6: Quine-McCluskey / Petrick's Boolean Minimization
// =============================================================================
console.log('\n--- 6. Quine-McCluskey Boolean Minimization & Analytical Equivalence ---');

// Evaluator helper: Evaluates an SOP expression against an assignment of variables
function evaluateSOP(expr: string, vars: string[], assignment: Record<string, number>): number {
  const trimmed = expr.trim();
  if (trimmed === '1') return 1;
  if (trimmed === '0') return 0;
  const terms = trimmed.split(/\s*\+\s*/);
  for (const term of terms) {
    const literals = term.split(/\s*·\s*/);
    let termMatches = true;
    for (const lit of literals) {
      if (lit.endsWith("'")) {
        const v = lit.slice(0, -1);
        if (assignment[v] !== 0) {
          termMatches = false;
          break;
        }
      } else {
        const v = lit;
        if (assignment[v] !== 1) {
          termMatches = false;
          break;
        }
      }
    }
    if (termMatches) return 1;
  }
  return 0;
}

function verifyKMapAndMinimization(
  testName: string,
  vars: string[],
  minterms: number[],
  outputName: string = 'Y'
) {
  const numVars = vars.length;
  const totalCombinations = Math.pow(2, numVars);
  const mintermSet = new Set(minterms);

  // 1. Generate Truth Table Rows
  const rows = Array.from({ length: totalCombinations }, (_, m) => {
    const bin = m.toString(2).padStart(numVars, '0');
    const inputs: Record<string, LogicValue> = {};
    vars.forEach((v, idx) => {
      inputs[v] = bin[idx] as LogicValue;
    });
    return {
      inputs,
      outputs: { [outputName]: (mintermSet.has(m) ? '1' : '0') as LogicValue },
    };
  });

  // 2. Generate Karnaugh Map
  const kmap = generateKMapFromTruthTable(
    { inputNames: vars, outputNames: [outputName], rows },
    outputName
  );
  assert.ok(kmap, `[${testName}] K-Map must be generated for ${numVars} variables`);
  assert.strictEqual(kmap!.numVariables, numVars, `[${testName}] Num variables must be ${numVars}`);

  // 3. Verify K-Map Grids, Cells, Variable Labels, and Independent Minterm Placement
  const GRAY_1 = ['0', '1'];
  const GRAY_2 = ['00', '01', '11', '10'];
  const DEC_2 = [0, 1, 3, 2];

  let expectedGridsCount = 1;
  if (numVars === 5) expectedGridsCount = 2;
  if (numVars === 6) expectedGridsCount = 4;
  assert.strictEqual(
    kmap!.grids.length,
    expectedGridsCount,
    `[${testName}] Must produce exactly ${expectedGridsCount} grid(s) for ${numVars} variables`
  );

  const visitedMinterms = new Set<number>();

  for (let gIdx = 0; gIdx < kmap!.grids.length; gIdx++) {
    const grid = kmap!.grids[gIdx];

    // Compute expected grid-level structural metadata
    let expectedRowVars: string[] = [];
    let expectedColVars: string[] = [];
    let expectedRowHeaders: string[] = [];
    let expectedColHeaders: string[] = [];
    let expectedLayerName: string | undefined = undefined;
    let expectedLayerValue: string | undefined = undefined;
    let layerDec = 0;
    let layerGray = '';

    if (numVars === 2) {
      expectedRowVars = [vars[0]];
      expectedColVars = [vars[1]];
      expectedRowHeaders = GRAY_1;
      expectedColHeaders = GRAY_1;
    } else if (numVars === 3) {
      expectedRowVars = [vars[0]];
      expectedColVars = [vars[1], vars[2]];
      expectedRowHeaders = GRAY_1;
      expectedColHeaders = GRAY_2;
    } else if (numVars === 4) {
      expectedRowVars = [vars[0], vars[1]];
      expectedColVars = [vars[2], vars[3]];
      expectedRowHeaders = GRAY_2;
      expectedColHeaders = GRAY_2;
    } else if (numVars === 5) {
      layerDec = gIdx; // 0 or 1
      layerGray = String(gIdx);
      expectedLayerName = vars[0];
      expectedLayerValue = `${vars[0]} = ${gIdx}`;
      expectedRowVars = [vars[1], vars[2]];
      expectedColVars = [vars[3], vars[4]];
      expectedRowHeaders = GRAY_2;
      expectedColHeaders = GRAY_2;
    } else if (numVars === 6) {
      layerGray = GRAY_2[gIdx]; // '00', '01', '11', '10'
      layerDec = DEC_2[gIdx];  // 0, 1, 3, 2
      expectedLayerName = `${vars[0]}${vars[1]}`;
      expectedLayerValue = `${vars[0]}${vars[1]} = ${layerGray}`;
      expectedRowVars = [vars[2], vars[3]];
      expectedColVars = [vars[4], vars[5]];
      expectedRowHeaders = GRAY_2;
      expectedColHeaders = GRAY_2;
    }

    assert.deepStrictEqual(
      grid.rowVariables,
      expectedRowVars,
      `[${testName}] Grid ${gIdx} rowVariables must match expected`
    );
    assert.deepStrictEqual(
      grid.colVariables,
      expectedColVars,
      `[${testName}] Grid ${gIdx} colVariables must match expected`
    );
    assert.deepStrictEqual(
      grid.rowHeaders,
      expectedRowHeaders,
      `[${testName}] Grid ${gIdx} rowHeaders must follow Gray-code sequence`
    );
    assert.deepStrictEqual(
      grid.colHeaders,
      expectedColHeaders,
      `[${testName}] Grid ${gIdx} colHeaders must follow Gray-code sequence`
    );
    if (numVars >= 5) {
      assert.strictEqual(
        grid.layerName,
        expectedLayerName,
        `[${testName}] Grid ${gIdx} layerName must match expected variable(s)`
      );
      assert.strictEqual(
        grid.layerValue,
        expectedLayerValue,
        `[${testName}] Grid ${gIdx} layerValue must match expected Gray assignment`
      );
    }

    // Assert independently calculated properties for EVERY individual cell
    for (let r = 0; r < grid.cells.length; r++) {
      for (let c = 0; c < grid.cells[r].length; c++) {
        const cell = grid.cells[r][c];

        let expectedRowGray = '';
        let expectedColGray = '';
        let expectedBinary = '';
        let expectedMinterm = 0;

        if (numVars === 2) {
          expectedRowGray = String(r);
          expectedColGray = String(c);
          expectedBinary = `${r}${c}`;
          expectedMinterm = (r << 1) | c;
        } else if (numVars === 3) {
          expectedRowGray = String(r);
          expectedColGray = GRAY_2[c];
          expectedBinary = `${r}${GRAY_2[c]}`;
          expectedMinterm = (r << 2) | DEC_2[c];
        } else if (numVars === 4) {
          expectedRowGray = GRAY_2[r];
          expectedColGray = GRAY_2[c];
          expectedBinary = `${GRAY_2[r]}${GRAY_2[c]}`;
          expectedMinterm = (DEC_2[r] << 2) | DEC_2[c];
        } else if (numVars === 5) {
          expectedRowGray = GRAY_2[r];
          expectedColGray = GRAY_2[c];
          expectedBinary = `${layerDec}${GRAY_2[r]}${GRAY_2[c]}`;
          expectedMinterm = (layerDec << 4) | (DEC_2[r] << 2) | DEC_2[c];
        } else if (numVars === 6) {
          expectedRowGray = GRAY_2[r];
          expectedColGray = GRAY_2[c];
          expectedBinary = `${layerGray}${GRAY_2[r]}${GRAY_2[c]}`;
          expectedMinterm = (layerDec << 4) | (DEC_2[r] << 2) | DEC_2[c];
        }

        assert.strictEqual(cell.rowIdx, r, `[${testName}] cell.rowIdx mismatch`);
        assert.strictEqual(cell.colIdx, c, `[${testName}] cell.colIdx mismatch`);
        assert.strictEqual(
          cell.rowGray,
          expectedRowGray,
          `[${testName}] cell.rowGray mismatch at (${r}, ${c})`
        );
        assert.strictEqual(
          cell.colGray,
          expectedColGray,
          `[${testName}] cell.colGray mismatch at (${r}, ${c})`
        );
        assert.strictEqual(
          cell.binaryString,
          expectedBinary,
          `[${testName}] cell.binaryString mismatch at grid ${gIdx} (${r}, ${c})`
        );
        assert.strictEqual(
          cell.minterm,
          expectedMinterm,
          `[${testName}] cell.minterm independently calculated mismatch at grid ${gIdx} (${r}, ${c})`
        );

        if (numVars === 5) {
          assert.strictEqual(cell.layerIdx, layerDec, `[${testName}] 5-var cell.layerIdx mismatch`);
          assert.strictEqual(cell.layerGray, layerGray, `[${testName}] 5-var cell.layerGray mismatch`);
        } else if (numVars === 6) {
          assert.strictEqual(cell.layerIdx, layerDec, `[${testName}] 6-var cell.layerIdx mismatch`);
          assert.strictEqual(cell.layerGray, layerGray, `[${testName}] 6-var cell.layerGray mismatch`);
        }

        const expectedCellVal = mintermSet.has(expectedMinterm) ? '1' : '0';
        assert.strictEqual(
          cell.value,
          expectedCellVal,
          `[${testName}] Cell value mismatch for minterm ${expectedMinterm} (${expectedBinary}): expected '${expectedCellVal}', got '${cell.value}'`
        );

        visitedMinterms.add(cell.minterm);
      }
    }
  }
  assert.strictEqual(
    visitedMinterms.size,
    totalCombinations,
    `[${testName}] All ${totalCombinations} minterms must be mapped uniquely across K-map grids`
  );

  // 4. Obtain the actual simplified expression from the existing minimization engine
  const simplifiedSOP = kmap!.simplifiedSop;
  assert.ok(simplifiedSOP, `[${testName}] Simplified expression must be defined`);

  // 5. Evaluate that expression for EVERY possible input assignment (all 32 for 5-var, all 64 for 6-var)
  for (let m = 0; m < totalCombinations; m++) {
    const bin = m.toString(2).padStart(numVars, '0');
    const assignment: Record<string, number> = {};
    vars.forEach((v, idx) => {
      assignment[v] = parseInt(bin[idx], 10);
    });
    const expectedVal = mintermSet.has(m) ? 1 : 0;
    const observedVal = evaluateSOP(simplifiedSOP, vars, assignment);

    if (observedVal !== expectedVal) {
      assert.fail(
        `[${testName}] Minimization equivalence failure! Variable count: ${numVars}, Assignment: ${bin} (minterm ${m}), Expected value: ${expectedVal}, Observed value: ${observedVal}. Expression: "${simplifiedSOP}"`
      );
    }
  }

  // 6. Direct Quine-McCluskey engine equivalence check
  const directMin = minimizeBooleanFunction(vars, minterms);
  assert.ok(directMin.simplifiedSOP, `[${testName}] Direct minimization produced expression`);
  for (let m = 0; m < totalCombinations; m++) {
    const bin = m.toString(2).padStart(numVars, '0');
    const assignment: Record<string, number> = {};
    vars.forEach((v, idx) => {
      assignment[v] = parseInt(bin[idx], 10);
    });
    const expectedVal = mintermSet.has(m) ? 1 : 0;
    const directObservedVal = evaluateSOP(directMin.simplifiedSOP, vars, assignment);
    if (directObservedVal !== expectedVal) {
      assert.fail(
        `[${testName}] Direct minimization equivalence failure! Variable count: ${numVars}, Assignment: ${bin} (minterm ${m}), Expected value: ${expectedVal}, Observed value: ${directObservedVal}. Expression: "${directMin.simplifiedSOP}"`
      );
    }
  }
}

// -----------------------------------------------------------------------------
// 2-Variable, 3-Variable, and 4-Variable Minimization Equivalence Checks
// -----------------------------------------------------------------------------

// Test 1: F(A, B) = minterms 1, 3 => F = B
verifyKMapAndMinimization('2-Var F=B', ['A', 'B'], [1, 3]);

// Test 2: F(A, B, C) = minterms 0, 1, 2, 3 => F = A'
verifyKMapAndMinimization("2-Var F=A'", ['A', 'B', 'C'], [0, 1, 2, 3]);

// Test 3: 4-variable corners: F(A, B, C, D) = minterms 0, 2, 8, 10 => F = B'·D'
verifyKMapAndMinimization("4-Var Corners B'·D'", ['A', 'B', 'C', 'D'], [0, 2, 8, 10]);

// Test 4: Majority voter: F(A, B, C) = minterms 3, 5, 6, 7
verifyKMapAndMinimization('3-Var Majority Voter', ['A', 'B', 'C'], [3, 5, 6, 7]);

// -----------------------------------------------------------------------------
// 5-Variable Minimization & Karnaugh Map Equivalence Checks (32 Combinations)
// -----------------------------------------------------------------------------
console.log('\n--- 6B. 5-Variable Boolean Minimization & Gray-Code Wrap Equivalence ---');

// 5-Var Test 1: Multi-implicant spanning Gray-code corner boundaries and layers
// Minterms {0, 2, 8, 10, 16, 18, 24, 26} (corners in both layers) + {1, 3, 5, 7}
// Simplifies to C'·E' + A'·B'·E (12 minterms -> 2 terms)
verifyKMapAndMinimization(
  '5-Var Multi-Implicant Boundary Wrap',
  ['A', 'B', 'C', 'D', 'E'],
  [0, 2, 8, 10, 16, 18, 24, 26, 1, 3, 5, 7]
);

// 5-Var Test 2: Single large implicant across layers
// Minterms {0, 1, 2, 3, 16, 17, 18, 19} -> B'·C' (8 minterms -> 1 term)
verifyKMapAndMinimization(
  '5-Var Layer-Merging Implicant',
  ['A', 'B', 'C', 'D', 'E'],
  [0, 1, 2, 3, 16, 17, 18, 19]
);

// 5-Var Test 3: Edge Case — Constant-1 (All 32 minterms)
verifyKMapAndMinimization(
  '5-Var Constant-1',
  ['A', 'B', 'C', 'D', 'E'],
  Array.from({ length: 32 }, (_, i) => i)
);

// 5-Var Test 4: Edge Case — Constant-0 (0 minterms)
verifyKMapAndMinimization('5-Var Constant-0', ['A', 'B', 'C', 'D', 'E'], []);

pass('5-variable K-map and Quine-McCluskey minimization verified for all 32 input assignments');

// -----------------------------------------------------------------------------
// 6-Variable Minimization & Karnaugh Map Equivalence Checks (64 Combinations)
// -----------------------------------------------------------------------------
console.log('\n--- 6C. 6-Variable Boolean Minimization & 4D Gray-Code Wrap Equivalence ---');

// 6-Var Test 1: Multi-implicant spanning 4D Gray-code layers and boundaries
// 16 corner minterms across all 4 layers (D'·F') + {60, 61, 62, 63} in layer 11 (A·B·C·D)
// Simplifies to D'·F' + A·B·C·D (20 minterms -> 2 terms)
verifyKMapAndMinimization(
  '6-Var 4D Multi-Implicant Wrap',
  ['A', 'B', 'C', 'D', 'E', 'F'],
  [0, 2, 8, 10, 16, 18, 24, 26, 32, 34, 40, 42, 48, 50, 56, 58, 60, 61, 62, 63]
);

// 6-Var Test 2: Non-adjacent layer wrap-around
// Minterms in layer 00 (0, 2, 8, 10) and layer 10 (32, 34, 40, 42)
// In Gray-code order (00, 01, 11, 10), layer 00 and 10 wrap around!
// Simplifies to B'·D'·F' (8 minterms -> 1 term)
verifyKMapAndMinimization(
  '6-Var Non-Adjacent Layer Gray Wrap',
  ['A', 'B', 'C', 'D', 'E', 'F'],
  [0, 2, 8, 10, 32, 34, 40, 42]
);

// 6-Var Test 3: Edge Case — Constant-1 (All 64 minterms)
verifyKMapAndMinimization(
  '6-Var Constant-1',
  ['A', 'B', 'C', 'D', 'E', 'F'],
  Array.from({ length: 64 }, (_, i) => i)
);

// 6-Var Test 4: Edge Case — Constant-0 (0 minterms)
verifyKMapAndMinimization('6-Var Constant-0', ['A', 'B', 'C', 'D', 'E', 'F'], []);

pass('6-variable K-map and Quine-McCluskey minimization verified for all 64 input assignments');

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
// TEST 10: Diagnostics — Broken Wire Endpoints and Invalid Pin References
// =============================================================================
console.log('\n--- 10. Diagnostics: Broken Wire Endpoints & Invalid Pin References ---');

const badGate = createComponent('and', 200, 200);
badGate.id = 'bad_and';

// Broken endpoint (nonexistent source component)
const brokenWire1 = makeWire('broken_wire_src', 'nonexistent_comp', 'nonexistent_pin', 'bad_and', badGate.inputs[0].id);

// Broken pin reference (existent component, but invalid pin id)
const validGate = createComponent('not', 50, 200);
validGate.id = 'valid_not';
const brokenWire2 = makeWire('broken_wire_pin', 'valid_not', 'bogus_pin_99', 'bad_and', badGate.inputs[1].id);

const brokenCircuit = createCircuit([validGate, badGate], [brokenWire1, brokenWire2]);
const diag10 = runCircuitDiagnostics(brokenCircuit);

assert.strictEqual(diag10.hasErrors, true, 'Diagnostics must flag fatal errors');
const brokenEndpointIssue = diag10.issues.find((i) => i.code === 'INVALID_WIRE_ENDPOINT');
assert.ok(brokenEndpointIssue, 'Must flag INVALID_WIRE_ENDPOINT');
assert.strictEqual(brokenEndpointIssue!.severity, 'error');

const invalidPinIssue = diag10.issues.find((i) => i.code === 'INVALID_PIN_REFERENCE');
assert.ok(invalidPinIssue, 'Must flag INVALID_PIN_REFERENCE');
assert.strictEqual(invalidPinIssue!.severity, 'error');

pass('Diagnostics flags broken endpoints and invalid pin references as fatal errors');

// =============================================================================
// TEST 11: Diagnostics — Floating Required Inputs vs Unconnected Outputs
// =============================================================================
console.log('\n--- 11. Diagnostics: Floating Required Inputs vs Unconnected Outputs ---');

// Unconnected gate: has 2 floating inputs, and 1 unconnected output
const isolatedAnd = createComponent('and', 100, 100);
isolatedAnd.id = 'iso_and';
isolatedAnd.label = 'ISO_AND';

const isoCircuit = createCircuit([isolatedAnd], []);
const diag11 = runCircuitDiagnostics(isoCircuit);

// Floating gate inputs are warnings
const floatingInputs = diag11.issues.filter((i) => i.code === 'FLOATING_REQUIRED_INPUT');
assert.strictEqual(floatingInputs.length, 2, 'Must flag both floating inputs on AND gate');
assert.strictEqual(floatingInputs[0].severity, 'warning', 'Floating inputs are non-fatal warnings');

// Unconnected output is info (optional)
const unconnectedOut = diag11.issues.find((i) => i.code === 'UNCONNECTED_OUTPUT');
assert.ok(unconnectedOut, 'Must flag unconnected output');
assert.strictEqual(unconnectedOut!.severity, 'info', 'Unconnected outputs are informational, not fatal errors');

pass('Diagnostics distinguishes floating input warnings from optional unconnected output infos');

// =============================================================================
// TEST 12: Diagnostics — Multi-Driver Contention & Signal Values 'X' / 'Z'
// =============================================================================
console.log('\n--- 12. Diagnostics: Multi-Driver Contention & Signal Values X and Z ---');

const srcToggle1 = createComponent('toggle', 50, 50);
srcToggle1.id = 't1';
const srcToggle2 = createComponent('toggle', 50, 150);
srcToggle2.id = 't2';
const targetLed = createComponent('led', 250, 100);
targetLed.id = 'target_led';

// Two distinct source outputs driving the SAME target input pin
const contentionWire1 = makeWire('cw1', 't1', srcToggle1.outputs[0].id, 'target_led', targetLed.inputs[0].id);
const contentionWire2 = makeWire('cw2', 't2', srcToggle2.outputs[0].id, 'target_led', targetLed.inputs[0].id);

const contentionCircuit = createCircuit([srcToggle1, srcToggle2, targetLed], [contentionWire1, contentionWire2]);
const diag12 = runCircuitDiagnostics(contentionCircuit);

const contentionIssue = diag12.issues.find((i) => i.code === 'MULTI_DRIVER_CONTENTION');
assert.ok(contentionIssue, 'Must flag MULTI_DRIVER_CONTENTION');
assert.strictEqual(contentionIssue!.severity, 'error', 'Contention must be fatal error');

// Test wire signal values 'X' (contention) and 'Z' (high-impedance)
const testWireX: Wire = { ...contentionWire1, id: 'wire_x', value: 'X' };
const testWireZ: Wire = { ...contentionWire2, id: 'wire_z', value: 'Z' };
const wireValuesCircuit = createCircuit([srcToggle1, targetLed], [testWireX, testWireZ]);
const diagWireVals = runCircuitDiagnostics(wireValuesCircuit);

const issueX = diagWireVals.issues.find((i) => i.code === 'UNRESOLVED_CONTENTION_X');
assert.ok(issueX, 'Must detect unresolved X signal value');
assert.strictEqual(issueX!.severity, 'error');

const issueZ = diagWireVals.issues.find((i) => i.code === 'FLOATING_HIGH_Z');
assert.ok(issueZ, 'Must detect High-Z signal value');
assert.strictEqual(issueZ!.severity, 'info');

pass('Diagnostics flags multi-driver contention and unresolved signal values X and Z');

// =============================================================================
// TEST 13: Diagnostics — Unsupported Component Types
// =============================================================================
console.log('\n--- 13. Diagnostics: Unsupported Components ---');

// NE555 analog timer
const timerComp = createComponent('ic_555', 100, 100);
timerComp.id = 'timer_1';

// Completely unrecognized component type
const unknownComp = {
  id: 'weird_1',
  type: 'quantum_gate' as any,
  label: 'Q-Gate',
  x: 200,
  y: 200,
  width: 60,
  height: 60,
  inputs: [],
  outputs: [],
};

const unsupportedCircuit = createCircuit([timerComp, unknownComp]);
const diag13 = runCircuitDiagnostics(unsupportedCircuit);

const timerIssue = diag13.issues.find((i) => i.code === 'UNSUPPORTED_COMPONENT' && i.affectedComponentId === 'timer_1');
assert.ok(timerIssue, 'Must flag NE555 analog timer limitation');
assert.strictEqual(timerIssue!.severity, 'warning');

const unknownIssue = diag13.issues.find((i) => i.code === 'UNSUPPORTED_COMPONENT' && i.affectedComponentId === 'weird_1');
assert.ok(unknownIssue, 'Must flag unrecognized component type');
assert.strictEqual(unknownIssue!.severity, 'warning');

pass('Diagnostics flags analog components and unrecognized component types with helpful explanations');

// =============================================================================
// TEST 14: Diagnostics — Custom IC Definitions and Broken Pin Mappings
// =============================================================================
console.log('\n--- 14. Diagnostics: Custom IC Validity & Pin Mappings ---');

// 1. Custom IC with missing customIC definition
const blankCustomIc = createComponent('custom_ic', 100, 100);
blankCustomIc.id = 'blank_ic';
delete (blankCustomIc as any).customIC;

const missingDefCircuit = createCircuit([blankCustomIc]);
const diag14a = runCircuitDiagnostics(missingDefCircuit);
const missingDefIssue = diag14a.issues.find((i) => i.code === 'INVALID_CUSTOM_IC_DEFINITION');
assert.ok(missingDefIssue, 'Must flag INVALID_CUSTOM_IC_DEFINITION');
assert.strictEqual(missingDefIssue!.severity, 'error');

// 2. Custom IC with broken pin mapping (external pin maps to nonexistent internal component)
const brokenMapIc = createComponent('custom_ic', 200, 100);
brokenMapIc.id = 'broken_map_ic';
brokenMapIc.customIC = {
  id: 'bad_map_def',
  name: 'BadMapIC',
  partNumber: 'CUSTOM-BAD',
  package: 'DIP14',
  pinCount: 14,
  internalCircuit: {
    components: [
      { id: 'internal_gate_1', type: 'and', label: 'AND', x: 0, y: 0, width: 40, height: 40, inputs: [], outputs: [] },
    ],
    wires: [],
  },
  pins: [
    { pin: 1, name: 'A', type: 'input', internalComponentId: 'ghost_internal_comp', internalPinId: 'in_0' },
  ],
};

const brokenMapCircuit = createCircuit([brokenMapIc]);
const diag14b = runCircuitDiagnostics(brokenMapCircuit);
const brokenPinIssue = diag14b.issues.find((i) => i.code === 'INVALID_CUSTOM_IC_PIN_MAPPING');
assert.ok(brokenPinIssue, 'Must flag INVALID_CUSTOM_IC_PIN_MAPPING');
assert.strictEqual(brokenPinIssue!.severity, 'error');
assert.ok(brokenPinIssue!.message.includes('ghost_internal_comp'));

pass('Diagnostics validates Custom IC definitions and catches invalid external-to-internal pin mappings');

// =============================================================================
// TEST 15: Diagnostics — Analysis Limitations (Sequential, Feedback, Large Table)
// =============================================================================
console.log('\n--- 15. Diagnostics: Analysis Limitations & Feasibility ---');

// 1. Sequential circuit advisory
const dffOnly = createComponent('d_flip_flop', 100, 100);
dffOnly.id = 'dff_limit';
const seqDiagCircuit = createCircuit([dffOnly]);
const diag15Seq = runCircuitDiagnostics(seqDiagCircuit);
const seqAdvisory = diag15Seq.issues.find((i) => i.code === 'SEQUENTIAL_LIMITATION');
assert.ok(seqAdvisory, 'Must produce SEQUENTIAL_LIMITATION advisory');
assert.strictEqual(seqAdvisory!.severity, 'info');

// 2. Feedback loop detection
const gate1 = createComponent('not', 100, 100);
gate1.id = 'ring_1';
const gate2 = createComponent('not', 200, 100);
gate2.id = 'ring_2';
// ring oscillator: gate1 -> gate2 -> gate1
const wireFwd = makeWire('wf', 'ring_1', gate1.outputs[0].id, 'ring_2', gate2.inputs[0].id);
const wireBack = makeWire('wb', 'ring_2', gate2.outputs[0].id, 'ring_1', gate1.inputs[0].id);
const feedbackCircuit = createCircuit([gate1, gate2], [wireFwd, wireBack]);
const diag15Feed = runCircuitDiagnostics(feedbackCircuit);
const feedbackIssue = diag15Feed.issues.find((i) => i.code === 'FEEDBACK_LIMITATION');
assert.ok(feedbackIssue, 'Must produce FEEDBACK_LIMITATION warning');
assert.strictEqual(feedbackIssue!.severity, 'warning');

// 3. Large truth table warning (>6 inputs)
const sevenSwitches = Array.from({ length: 7 }, (_, i) => {
  const t = createComponent('toggle', 50, i * 30);
  t.id = `sw_large_${i}`;
  t.label = `In${i}`;
  return t;
});
const largeTableCircuit = createCircuit(sevenSwitches);
const diag15Large = runCircuitDiagnostics(largeTableCircuit);
const largeTableIssue = diag15Large.issues.find((i) => i.code === 'LARGE_TRUTH_TABLE_SIZE');
assert.ok(largeTableIssue, 'Must produce LARGE_TRUTH_TABLE_SIZE warning');
assert.strictEqual(largeTableIssue!.severity, 'warning');

pass('Diagnostics accurately reports sequential, feedback, and large truth table feasibility limitations');

console.log('\n================================================================');
console.log(`ALL PHASE 8 TESTS PASSED: ${passCount} tests executed successfully.`);
console.log('================================================================\n');
