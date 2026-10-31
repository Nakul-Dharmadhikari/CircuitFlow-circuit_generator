import assert from 'assert';
import type {
  Circuit,
  CustomICDefinition,
  CustomICPinMapping,
  InternalGateUnit,
  LogicValue,
} from '../src/types/circuit';
import { createComponent, simulateCircuit } from '../src/engine/simulator';
import {
  validateCustomIC,
  validateCustomICDefinition,
  validateCustomICJSON,
  detectCycle,
} from '../src/utils/customIcValidator';
import {
  simulateCustomICInputs,
  generateCustomICTruthTable,
  runTruthTableOrSequentialTest,
  isSequentialCircuit,
} from '../src/utils/customIcSimulator';
import { CUSTOM_IC_TEMPLATES } from '../src/utils/customIcTemplates';
import {
  createInitialTrainerBoard,
  mountICOnSocket,
  syncMountedICPositions,
  getMountedICOnSocket,
} from '../src/engine/trainer/trainerBoardModel';

console.log('================================================================');
console.log('CIRCUITFLOW PHASE 7: CUSTOM IC STUDIO TEST SUITE');
console.log('Testing: Internal Circuit, Explicit Pin Mapping, Truth Tables,');
console.log('Sequential State, Legacy Compatibility, Validation, Cycling & Trainer Mounting');
console.log('================================================================\n');

let passCount = 0;
function pass(testName: string) {
  passCount++;
  console.log(`✔ PASS: ${testName}`);
}

// =============================================================================
// TEST 1: Starter Templates Topology & Explicit Pin Mappings
// =============================================================================
console.log('\n--- 1. Starter Templates & Explicit Pin Mappings ---');

const halfAdderDef = CUSTOM_IC_TEMPLATES.half_adder.createDefinition('user_test');
assert.strictEqual(halfAdderDef.pinCount, 14, 'Half Adder must be 14-pin DIP');
assert.strictEqual(halfAdderDef.vccPin, 14, 'Half Adder VCC must be pin 14');
assert.strictEqual(halfAdderDef.gndPin, 7, 'Half Adder GND must be pin 7');
assert.ok(halfAdderDef.internalCircuit, 'Half Adder must have internalCircuit');
assert.strictEqual(halfAdderDef.internalCircuit.components.length, 6, 'Half Adder has 6 components');
assert.strictEqual(halfAdderDef.internalCircuit.wires.length, 6, 'Half Adder has 6 wires');

// Verify explicit pin mappings: externalPin -> internalComponentId -> internalPinId
const pinA = halfAdderDef.pins.find((p) => p.pin === 1);
const pinB = halfAdderDef.pins.find((p) => p.pin === 2);
const pinSum = halfAdderDef.pins.find((p) => p.pin === 3);
const pinCarry = halfAdderDef.pins.find((p) => p.pin === 4);

assert.ok(pinA?.internalComponentId, 'Pin 1 must explicitly map to internalComponentId');
assert.strictEqual(pinA?.internalPinId, 'out', 'Pin 1 must map to pin "out"');
assert.ok(pinB?.internalComponentId, 'Pin 2 must explicitly map to internalComponentId');
assert.ok(pinSum?.internalComponentId, 'Pin 3 must explicitly map to internalComponentId');
assert.ok(pinCarry?.internalComponentId, 'Pin 4 must explicitly map to internalComponentId');
pass('Starter templates have complete internalCircuit and explicit external pin mappings');

// =============================================================================
// TEST 2: Combinational Truth Table Generation (Half Adder)
// =============================================================================
console.log('\n--- 2. Combinational Truth Tables (Half Adder) ---');

const haResult = generateCustomICTruthTable(halfAdderDef);
assert.strictEqual(haResult.circuitType, 'combinational', 'Half Adder must be combinational');
assert.strictEqual(haResult.totalCombinations, 4, '2 inputs must yield 4 combinations');
assert.strictEqual(haResult.rows.length, 4, 'Must have 4 truth table rows');

// Verify truth table values:
// 0,0 -> SUM:0, CARRY:0
// 0,1 -> SUM:1, CARRY:0
// 1,0 -> SUM:1, CARRY:0
// 1,1 -> SUM:0, CARRY:1
const haRow0 = haResult.rows[0];
const haRow1 = haResult.rows[1];
const haRow2 = haResult.rows[2];
const haRow3 = haResult.rows[3];

assert.strictEqual(haRow0.outputs['3'], '0', '0+0 SUM must be 0');
assert.strictEqual(haRow0.outputs['4'], '0', '0+0 CARRY must be 0');

assert.strictEqual(haRow1.outputs['3'], '1', '0+1 SUM must be 1');
assert.strictEqual(haRow1.outputs['4'], '0', '0+1 CARRY must be 0');

assert.strictEqual(haRow2.outputs['3'], '1', '1+0 SUM must be 1');
assert.strictEqual(haRow2.outputs['4'], '0', '1+0 CARRY must be 0');

assert.strictEqual(haRow3.outputs['3'], '0', '1+1 SUM must be 0');
assert.strictEqual(haRow3.outputs['4'], '1', '1+1 CARRY must be 1');
pass('Half Adder automated truth table matches theoretical Boolean logic');

// =============================================================================
// TEST 3: Non-Default Component and Pin Ordering (Explicit Mapping)
// =============================================================================
console.log('\n--- 3. Non-Default Component & Pin Ordering ---');

// Build an inverted/swapped custom IC:
// Pin 1 -> Gate 2 (OR) Input B
// Pin 2 -> Gate 2 (OR) Input A
// Pin 3 -> Gate 1 (AND) Input B
// Pin 4 -> Gate 1 (AND) Input A
// Pin 5 -> Gate 2 Output Y (OR output)
// Pin 6 -> Gate 1 Output Y (AND output)
// This deliberately reverses array ordering, component order, and pin letters.
const andGate = createComponent('and', 100, 100, 'INTERNAL_AND');
const orGate = createComponent('or', 100, 200, 'INTERNAL_OR');

const swappedIC: CustomICDefinition = {
  id: 'custom_ic_swapped',
  userId: 'user_test',
  name: 'Swapped Mapping IC',
  code: '74SWAP',
  pinCount: 14,
  vccPin: 14,
  gndPin: 7,
  internalCircuit: {
    // Array order: OR gate comes FIRST in array, but Pin 3/4 map to AND gate!
    components: [orGate, andGate],
    wires: [],
  },
  pins: [
    { pin: 1, name: 'OR_IN_B', type: 'input', internalComponentId: orGate.id, internalPinId: 'b' },
    { pin: 2, name: 'OR_IN_A', type: 'input', internalComponentId: orGate.id, internalPinId: 'a' },
    { pin: 3, name: 'AND_IN_B', type: 'input', internalComponentId: andGate.id, internalPinId: 'b' },
    { pin: 4, name: 'AND_IN_A', type: 'input', internalComponentId: andGate.id, internalPinId: 'a' },
    { pin: 5, name: 'OR_OUT', type: 'output', internalComponentId: orGate.id, internalPinId: 'out' },
    { pin: 6, name: 'AND_OUT', type: 'output', internalComponentId: andGate.id, internalPinId: 'out' },
    { pin: 7, name: 'GND', type: 'power' },
    { pin: 8, name: 'NC', type: 'nc' },
    { pin: 9, name: 'NC', type: 'nc' },
    { pin: 10, name: 'NC', type: 'nc' },
    { pin: 11, name: 'NC', type: 'nc' },
    { pin: 12, name: 'NC', type: 'nc' },
    { pin: 13, name: 'NC', type: 'nc' },
    { pin: 14, name: 'VCC', type: 'power' },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Test with AND inputs = (1, 1), OR inputs = (0, 0)
const simSwapped = simulateCustomICInputs(swappedIC, {
  1: '0', // OR_IN_B
  2: '0', // OR_IN_A
  3: '1', // AND_IN_B
  4: '1', // AND_IN_A
});

assert.strictEqual(simSwapped[5], '0', 'OR output (Pin 5) must be 0 for (0, 0)');
assert.strictEqual(simSwapped[6], '1', 'AND output (Pin 6) must be 1 for (1, 1)');

// Now swap inputs: OR inputs = (1, 0), AND inputs = (1, 0)
const simSwapped2 = simulateCustomICInputs(swappedIC, {
  1: '1', // OR_IN_B
  2: '0', // OR_IN_A
  3: '1', // AND_IN_B
  4: '0', // AND_IN_A
});

assert.strictEqual(simSwapped2[5], '1', 'OR output (Pin 5) must be 1 for (1, 0)');
assert.strictEqual(simSwapped2[6], '0', 'AND output (Pin 6) must be 0 for (1, 0)');
pass('Electrical behavior is strictly determined by explicit pin mapping, not array order');

// =============================================================================
// TEST 4: 2-to-1 Multiplexer Simulation
// =============================================================================
console.log('\n--- 4. MSI Multiplexer Logic ---');

const muxDef = CUSTOM_IC_TEMPLATES.mux_2to1.createDefinition('user_test');
const muxResult = generateCustomICTruthTable(muxDef);
assert.strictEqual(muxResult.rows.length, 8, '3 inputs (D0, D1, S) must produce 8 rows');

// Permute select S:
// When S=0 (Pin 3 = '0'), Output Y (Pin 4) must equal D0 (Pin 1)
// When S=1 (Pin 3 = '1'), Output Y (Pin 4) must equal D1 (Pin 2)
muxResult.rows.forEach((row) => {
  const d0 = row.inputs['1'];
  const d1 = row.inputs['2'];
  const s = row.inputs['3'];
  const y = row.outputs['4'];

  const expectedY = s === '1' ? d1 : d0;
  assert.strictEqual(y, expectedY, `MUX output for D0=${d0}, D1=${d1}, S=${s} must equal ${expectedY}`);
});
pass('2-to-1 Multiplexer internal circuit correctly routes data based on select input');

// =============================================================================
// TEST 5: Supported Sequential Circuit & Controlled Stepping (D Flip-Flop)
// =============================================================================
console.log('\n--- 5. Sequential Circuit & Clock Stepper ---');

const dffDef = CUSTOM_IC_TEMPLATES.d_flipflop.createDefinition('user_test');
assert.strictEqual(isSequentialCircuit(dffDef.internalCircuit), true, 'Must detect sequential circuit');

const seqTestResult = runTruthTableOrSequentialTest(dffDef);
assert.strictEqual(seqTestResult.circuitType, 'sequential', 'Test runner must classify as sequential');
assert.ok(seqTestResult.rows.length >= 4, 'Sequential runner must generate clock steps');
assert.ok(seqTestResult.passed, 'Sequential runner must pass');
pass('Sequential circuit detected and tested via controlled clock stepper');

// =============================================================================
// TEST 6: Legacy gateUnits Backward Compatibility
// =============================================================================
console.log('\n--- 6. Legacy gateUnits Backward Compatibility ---');

const legacyGateUnits: InternalGateUnit[] = [
  { id: 'u1', type: 'and_2', inputPins: [1, 2], outputPins: [3] },
  { id: 'u2', type: 'or_2', inputPins: [4, 5], outputPins: [6] },
  { id: 'u3', type: 'not', inputPins: [8], outputPins: [9] },
];

const legacyIC: CustomICDefinition = {
  id: 'custom_ic_legacy_7400',
  userId: 'user_test',
  name: 'Legacy Gate Units IC',
  code: '74LEGACY',
  pinCount: 14,
  vccPin: 14,
  gndPin: 7,
  gateUnits: legacyGateUnits,
  // Empty internal circuit to verify legacy fallback
  internalCircuit: { components: [], wires: [] },
  pins: [
    { pin: 1, name: '1A', type: 'input' },
    { pin: 2, name: '1B', type: 'input' },
    { pin: 3, name: '1Y', type: 'output' },
    { pin: 4, name: '2A', type: 'input' },
    { pin: 5, name: '2B', type: 'input' },
    { pin: 6, name: '2Y', type: 'output' },
    { pin: 7, name: 'GND', type: 'power' },
    { pin: 8, name: '3A', type: 'input' },
    { pin: 9, name: '3Y', type: 'output' },
    { pin: 14, name: 'VCC', type: 'power' },
  ],
  createdAt: Date.now() - 100000,
  updatedAt: Date.now() - 100000,
};

// Create a component using the legacy custom IC
const legacyComp = createComponent('custom_ic', 100, 100, 'LEGACY_IC', { customIC: legacyIC });
const toggle1 = createComponent('toggle', 20, 100, 'T1');
const toggle2 = createComponent('toggle', 20, 140, 'T2');
toggle1.outputs[0].value = '1';
if (toggle1.state) toggle1.state.toggleState = true;
toggle2.outputs[0].value = '1';
if (toggle2.state) toggle2.state.toggleState = true;

const legacyCircuit: Circuit = {
  components: [toggle1, toggle2, legacyComp],
  wires: [
    { id: 'lw1', fromCompId: toggle1.id, fromPinId: 'out', toCompId: legacyComp.id, toPinId: '1', value: '1' },
    { id: 'lw2', fromCompId: toggle2.id, fromPinId: 'out', toCompId: legacyComp.id, toPinId: '2', value: '1' },
  ],
};

const simLegacy = simulateCircuit(legacyCircuit);
const simulatedLegacyComp = simLegacy.circuit.components.find((c) => c.id === legacyComp.id);
const pin3Output = simulatedLegacyComp?.outputs.find((p) => p.id === 'pin3' || p.id === '3');
assert.strictEqual(pin3Output?.value, '1', 'Legacy AND gate 1 must evaluate 1 & 1 = 1');
pass('Legacy gateUnits custom ICs continue to simulate correctly with full backward compatibility');

// =============================================================================
// TEST 7: Validation Failures & Actionable Errors
// =============================================================================
console.log('\n--- 7. Architectural Validation Failures ---');

// 7.1 Missing Name & Code
const missingName = validateCustomIC({ pinCount: 14 });
assert.strictEqual(missingName.isValid, false, 'Missing name must be invalid');
assert.ok(missingName.errors.some((e) => e.field === 'name'), 'Must report name error');
assert.ok(missingName.errors.some((e) => e.field === 'partNumber'), 'Must report partNumber error');

// 7.2 Invalid Pin Count
const invalidPinCount = validateCustomIC({ name: 'Test', code: 'T1', pinCount: 18 as any });
assert.strictEqual(invalidPinCount.isValid, false, 'Invalid pin count must be invalid');
assert.ok(invalidPinCount.errors.some((e) => e.field === 'pinCount'), 'Must report pinCount error');

// 7.3 VCC / GND Range & Collision
const collisionVccGnd = validateCustomIC({
  name: 'Test',
  code: 'T1',
  pinCount: 14,
  vccPin: 7,
  gndPin: 7,
});
assert.strictEqual(collisionVccGnd.isValid, false, 'Colliding VCC/GND must be invalid');
assert.ok(collisionVccGnd.errors.some((e) => e.field === 'vccPin' || e.field === 'gndPin'), 'Must report collision error');

// 7.4 Broken Reference to Nonexistent Internal Component
const brokenCompRef = validateCustomIC({
  name: 'Test',
  code: 'T1',
  pinCount: 14,
  vccPin: 14,
  gndPin: 7,
  internalCircuit: {
    components: [andGate],
    wires: [],
  },
  pins: [
    { pin: 1, name: 'IN', type: 'input', internalComponentId: 'nonexistent_component_123', internalPinId: 'a' },
    { pin: 7, name: 'GND', type: 'power' },
    { pin: 14, name: 'VCC', type: 'power' },
  ],
});
assert.strictEqual(brokenCompRef.isValid, false, 'Broken component reference must be invalid');
assert.ok(brokenCompRef.errors.some((e) => e.field === 'pinMapping' && e.message.includes('nonexistent internal component')), 'Must flag nonexistent component');

// 7.5 Broken Reference to Nonexistent Internal Pin
const brokenPinRef = validateCustomIC({
  name: 'Test',
  code: 'T1',
  pinCount: 14,
  vccPin: 14,
  gndPin: 7,
  internalCircuit: {
    components: [andGate],
    wires: [],
  },
  pins: [
    { pin: 1, name: 'IN', type: 'input', internalComponentId: andGate.id, internalPinId: 'nonexistent_pin_xyz' },
    { pin: 7, name: 'GND', type: 'power' },
    { pin: 14, name: 'VCC', type: 'power' },
  ],
});
assert.strictEqual(brokenPinRef.isValid, false, 'Broken internal pin reference must be invalid');
assert.ok(brokenPinRef.errors.some((e) => e.field === 'pinMapping' && e.message.includes('nonexistent internal pin')), 'Must flag nonexistent internal pin');

// 7.6 Broken Wire in Internal Circuit
const brokenWireCircuit = validateCustomIC({
  name: 'Test',
  code: 'T1',
  pinCount: 14,
  vccPin: 14,
  gndPin: 7,
  internalCircuit: {
    components: [andGate],
    wires: [
      { id: 'w_broken', fromCompId: andGate.id, fromPinId: 'out', toCompId: 'ghost_comp', toPinId: 'in', value: '0' },
    ],
  },
  pins: [
    { pin: 1, name: 'A', type: 'input', internalComponentId: andGate.id, internalPinId: 'a' },
    { pin: 2, name: 'B', type: 'input', internalComponentId: andGate.id, internalPinId: 'b' },
    { pin: 3, name: 'Y', type: 'output', internalComponentId: andGate.id, internalPinId: 'out' },
    { pin: 7, name: 'GND', type: 'power' },
    { pin: 14, name: 'VCC', type: 'power' },
  ],
});
assert.strictEqual(brokenWireCircuit.isValid, false, 'Broken wire endpoint must be invalid');
assert.ok(brokenWireCircuit.errors.some((e) => e.field === 'internalCircuit' && e.message.includes('w_broken')), 'Must report broken wire');
pass('Architectural validation correctly identifies and explains all error conditions');

// =============================================================================
// TEST 8: Recursive References & Cycle Detection
// =============================================================================
console.log('\n--- 8. Recursive References & Cycle Detection ---');

// 8.1 Direct Self-Reference
const selfRefComp = createComponent('custom_ic', 50, 50, 'SELF_IC', {
  customProps: { customIcId: 'ic_alpha' },
});
const selfReferencingIC: CustomICDefinition = {
  id: 'ic_alpha',
  userId: 'user_test',
  name: 'Self Referencing IC',
  code: '74SELF',
  pinCount: 14,
  vccPin: 14,
  gndPin: 7,
  internalCircuit: {
    components: [selfRefComp],
    wires: [],
  },
  pins: [
    { pin: 7, name: 'GND', type: 'power' },
    { pin: 14, name: 'VCC', type: 'power' },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const selfCycleResult = detectCycle(selfReferencingIC, []);
assert.strictEqual(selfCycleResult.hasCycle, true, 'Direct self-reference must be detected');
assert.ok(selfCycleResult.cyclePath?.includes('ic_alpha'), 'Cycle path must contain self ID');

// 8.2 Indirect Cycle: A -> B -> A
const compRefB = createComponent('custom_ic', 50, 50, 'IC_B', {
  customProps: { customIcId: 'ic_beta' },
});
const compRefA = createComponent('custom_ic', 50, 50, 'IC_A', {
  customProps: { customIcId: 'ic_alpha' },
});

const icAlpha: CustomICDefinition = {
  id: 'ic_alpha',
  userId: 'user_test',
  name: 'IC Alpha',
  code: '74ALPHA',
  pinCount: 14,
  internalCircuit: { components: [compRefB], wires: [] },
  pins: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const icBeta: CustomICDefinition = {
  id: 'ic_beta',
  userId: 'user_test',
  name: 'IC Beta',
  code: '74BETA',
  pinCount: 14,
  internalCircuit: { components: [compRefA], wires: [] },
  pins: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const indirectCycle = detectCycle(icAlpha, [icBeta]);
assert.strictEqual(indirectCycle.hasCycle, true, 'Indirect cycle A -> B -> A must be detected');
assert.ok(indirectCycle.message?.includes('Circular dependency detected'), 'Must output circular dependency error message');
pass('DFS cycle detection prevents direct self-references and recursive library loops');

// =============================================================================
// TEST 9: Safe JSON Export and Import Round Trip
// =============================================================================
console.log('\n--- 9. JSON Export / Import Round Trip ---');

const exportJSON = JSON.stringify(halfAdderDef, null, 2);
const importResult = validateCustomICJSON(exportJSON);
assert.strictEqual(importResult.valid, true, 'Exported JSON must be valid on import');
assert.strictEqual(importResult.ic?.id, halfAdderDef.id, 'Imported IC ID must match');
assert.strictEqual(importResult.ic?.pinCount, 14, 'Imported pin count must match');
assert.strictEqual(importResult.ic?.internalCircuit?.components.length, 6, 'Imported components count must match');

// Test rejection of malformed JSON
const malformedResult = validateCustomICJSON('{"id": "bad", broken json');
assert.strictEqual(malformedResult.valid, false, 'Malformed JSON must be rejected');
assert.ok(malformedResult.error?.includes('Malformed JSON'), 'Must report malformed JSON error');

// Test rejection of non-object JSON
const arrayJSON = validateCustomICJSON('[1, 2, 3]');
assert.strictEqual(arrayJSON.valid, false, 'Array root JSON must be rejected');
pass('JSON export/import round-trips cleanly and rejects malformed inputs');

// =============================================================================
// TEST 10: Canvas Placement & External Wire Propagation
// =============================================================================
console.log('\n--- 10. Canvas Placement & External Wire Propagation ---');

// Instantiate Half Adder custom IC component on main schematic canvas
const placedHAComp = createComponent('custom_ic', 200, 100, 'MY_HA', {
  customIC: halfAdderDef,
});

const switchA = createComponent('toggle', 50, 80, 'SWITCH_A');
const switchB = createComponent('toggle', 50, 160, 'SWITCH_B');
const probeSum = createComponent('probe', 400, 80, 'PROBE_SUM');
const probeCarry = createComponent('probe', 400, 160, 'PROBE_CARRY');

// Set inputs: A=1, B=0
switchA.outputs[0].value = '1';
if (switchA.state) switchA.state.toggleState = true;
switchB.outputs[0].value = '0';
if (switchB.state) switchB.state.toggleState = false;

const schematicCircuit: Circuit = {
  components: [switchA, switchB, placedHAComp, probeSum, probeCarry],
  wires: [
    // Switch A to HA Pin 1
    { id: 'w_in1', fromCompId: switchA.id, fromPinId: 'out', toCompId: placedHAComp.id, toPinId: 'pin1', value: '1' },
    // Switch B to HA Pin 2
    { id: 'w_in2', fromCompId: switchB.id, fromPinId: 'out', toCompId: placedHAComp.id, toPinId: 'pin2', value: '0' },
    // HA Pin 3 (SUM) to probeSum
    { id: 'w_out1', fromCompId: placedHAComp.id, fromPinId: 'pin3', toCompId: probeSum.id, toPinId: 'in', value: '0' },
    // HA Pin 4 (CARRY) to probeCarry
    { id: 'w_out2', fromCompId: placedHAComp.id, fromPinId: 'pin4', toCompId: probeCarry.id, toPinId: 'in', value: '0' },
  ],
};

const simSchematic = simulateCircuit(schematicCircuit);
const simulatedSumProbe = simSchematic.circuit.components.find((c) => c.id === probeSum.id);
const simulatedCarryProbe = simSchematic.circuit.components.find((c) => c.id === probeCarry.id);

assert.strictEqual(simulatedSumProbe?.inputs[0].value, '1', 'External SUM probe must receive HIGH (1)');
assert.strictEqual(simulatedCarryProbe?.inputs[0].value, '0', 'External CARRY probe must receive LOW (0)');

// Change inputs: A=1, B=1 -> SUM=0, CARRY=1
switchB.outputs[0].value = '1';
if (switchB.state) switchB.state.toggleState = true;
const wireIn2 = schematicCircuit.wires.find((w) => w.id === 'w_in2');
if (wireIn2) wireIn2.value = '1';

const simSchematic2 = simulateCircuit(schematicCircuit);
const simulatedSumProbe2 = simSchematic2.circuit.components.find((c) => c.id === probeSum.id);
const simulatedCarryProbe2 = simSchematic2.circuit.components.find((c) => c.id === probeCarry.id);

assert.strictEqual(simulatedSumProbe2?.inputs[0].value, '0', '1+1 SUM probe must receive LOW (0)');
assert.strictEqual(simulatedCarryProbe2?.inputs[0].value, '1', '1+1 CARRY probe must receive HIGH (1)');
pass('Custom IC placed on canvas propagates signals through external wires matching internal logic');

// =============================================================================
// TEST 11: Trainer Board Socket Mounting Compatibility
// =============================================================================
console.log('\n--- 11. Trainer Board Socket Mounting Compatibility ---');

const trainerInit = createInitialTrainerBoard('board_1', 100, 100);
const trainerCircuit: Circuit = {
  components: trainerInit.components,
  wires: [],
  trainerBoards: [trainerInit.board],
};

// Mount the Custom IC onto Socket 0 (Base Index 0)
const mountResult = mountICOnSocket(trainerCircuit, 0, 'custom_ic', halfAdderDef, 'board_1');
const mountedComp = mountResult.mountedComponent;

assert.strictEqual(mountedComp.type, 'custom_ic', 'Mounted component type must be custom_ic');
assert.strictEqual(mountedComp.isTrainerFixed, true, 'Mounted IC must have isTrainerFixed set to true');
assert.strictEqual(mountedComp.customProps?.trainerMount?.baseIndex, 0, 'trainerMount baseIndex must be 0');
assert.strictEqual(mountedComp.customProps?.customIC?.partNumber, halfAdderDef.partNumber, 'customIC definition preserved');

// Verify socket has authoritative mountedComponentId
const updatedSlot = mountResult.circuit.trainerBoards?.[0].icSlots.find((s) => s.baseIndex === 0);
assert.strictEqual(updatedSlot?.mountedComponentId, mountedComp.id, 'Socket must hold authoritative mountedComponentId');

// Verify getMountedICOnSocket finds the mounted Custom IC
const foundMounted = getMountedICOnSocket(mountResult.circuit, updatedSlot!);
assert.strictEqual(foundMounted?.id, mountedComp.id, 'getMountedICOnSocket must locate mounted Custom IC');

// Verify board movement synchronizes mounted IC
const movedCircuit: Circuit = {
  ...mountResult.circuit,
  trainerBoards: mountResult.circuit.trainerBoards!.map((b) => ({
    ...b,
    x: b.x + 150,
    y: b.y + 100,
    icSlots: b.icSlots.map((s) => ({ ...s, x: s.x + 150, y: s.y + 100 })),
  })),
};
const syncedCircuit = syncMountedICPositions(movedCircuit);
const syncedMountedComp = syncedCircuit.components.find((c) => c.id === mountedComp.id);
assert.strictEqual(syncedMountedComp?.x, updatedSlot!.x + 150, 'Mounted IC position tracks board movement');
pass('Socket-authoritative mounting and board movement seamlessly support Custom ICs');

console.log('\n================================================================');
console.log(`ALL PHASE 7 CUSTOM IC TESTS PASSED! (${passCount}/${passCount})`);
console.log('================================================================\n');
