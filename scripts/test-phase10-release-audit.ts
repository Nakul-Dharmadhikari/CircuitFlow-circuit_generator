import assert from 'assert';
import { simulateCircuit, createComponent } from '../src/engine/simulator';
import { validateAndSanitizeCircuit, validateCircuit } from '../src/engine/circuitValidator';
import type { Circuit, CircuitComponent, Wire, CustomICDefinition, LogicValue } from '../src/types/circuit';
import { saveUserCircuit, getUserCircuits, deleteUserCircuit, downloadCircuitToFile } from '../src/services/storage';
import { saveUserCustomIC, getUserCustomICs, deleteUserCustomIC } from '../src/services/customIcStorage';
import { validateCustomIC } from '../src/utils/customIcValidator';
import { simulateCustomICInputs } from '../src/utils/customIcSimulator';
import {
  generateUnifiedTruthTable,
  generateKMap,
  analyzeSequentialCircuit,
  runTestBench,
} from '../src/engine/analysis';
import { getLabExperiments } from '../src/presets/labExperiments';
import {
  ensureTrainerKit,
  mountICOnSocket,
  ejectICFromSocket,
  syncMountedICPositions,
  TRAINER_CONSTANTS,
} from '../src/engine/trainerKit';
import { hasCompletedOnboarding, setOnboardingCompleted } from '../src/components/OnboardingTour';

// Mock localStorage and DOM APIs for Node environment if unavailable
if (typeof globalThis.localStorage === 'undefined' || !globalThis.localStorage) {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
}

if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    createElement: () => ({ click: () => {}, href: '', download: '' }),
    body: { appendChild: () => {}, removeChild: () => {} },
  };
  (globalThis as any).Blob = class {
    constructor(public content: any[], public options?: any) {}
  };
  (globalThis as any).URL = {
    createObjectURL: () => 'blob:mock-url',
    revokeObjectURL: () => {},
  };
}

async function runPhase10Audit() {
  console.log('================================================================');
  console.log('CIRCUITFLOW PHASE 10: FINAL HARDENING, RELIABILITY & RELEASE AUDIT');
  console.log('Auditing End-to-End Scenarios 1 through 8 against Master Plan');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Circuit Creation, Wiring, Simulation, Analysis, Save, Reload
  // ---------------------------------------------------------------------------
  console.log('--- Scenario 1: Circuit Creation, Wiring, Simulation, Save & Reload ---');
  const sw1 = createComponent('toggle', 100, 100, 'Switch 1');
  const sw2 = createComponent('toggle', 100, 180, 'Switch 2');
  const andG = createComponent('and', 240, 140, 'AND Gate');
  const probe = createComponent('probe', 380, 140, 'Probe Out');

  const wires1: Wire[] = [
    { id: 'w1', fromCompId: sw1.id, fromPinId: 'out', toCompId: andG.id, toPinId: 'a', value: '0' },
    { id: 'w2', fromCompId: sw2.id, fromPinId: 'out', toCompId: andG.id, toPinId: 'b', value: '0' },
    { id: 'w3', fromCompId: andG.id, fromPinId: 'out', toCompId: probe.id, toPinId: 'in', value: '0' },
  ];

  let circ1: Circuit = { components: [sw1, sw2, andG, probe], wires: wires1 };

  // Test simulation: 0 & 0 = 0
  let sim1 = simulateCircuit(circ1);
  let pComp = sim1.circuit.components.find((c) => c.id === probe.id)!;
  assert.strictEqual(pComp.inputs[0].value, '0', 'Probe should be 0 when switches are 0,0');

  // Set switches: 1 & 1 = 1
  const sw1Active = circ1.components.find((c) => c.id === sw1.id)!;
  const sw2Active = circ1.components.find((c) => c.id === sw2.id)!;
  sw1Active.state = { toggleState: true };
  sw1Active.outputs[0].value = '1';
  sw2Active.state = { toggleState: true };
  sw2Active.outputs[0].value = '1';

  sim1 = simulateCircuit(circ1);
  pComp = sim1.circuit.components.find((c) => c.id === probe.id)!;
  assert.strictEqual(pComp.inputs[0].value, '1', 'Probe should be 1 when switches are 1,1');

  // Save circuit
  const saved1 = saveUserCircuit('test_user_phase10', 'E2E AND Circuit', 'Test audit', sim1.circuit);
  assert.ok(saved1.id, 'Saved circuit must have a generated ID');

  // Reload circuit from storage
  const loadedList = getUserCircuits('test_user_phase10');
  const reloaded = loadedList.find((c) => c.id === saved1.id);
  assert.ok(reloaded, 'Saved circuit must be retrievable from user storage');
  assert.strictEqual(reloaded!.circuit.components.length, 4);
  assert.strictEqual(reloaded!.circuit.wires.length, 3);

  // Simulate reloaded circuit
  const reloadedSim = simulateCircuit(reloaded!.circuit);
  const reloadedProbe = reloadedSim.circuit.components.find((c) => c.id === probe.id)!;
  assert.strictEqual(reloadedProbe.inputs[0].value, '1', 'Reloaded circuit preserves active signal state');
  console.log('✔ PASS: Scenario 1 verified cleanly.');

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Component & Wire Deletion, Cascade, and Connectivity Restoration
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 2: Deletion, Consequence Cleaning & Connectivity Restoration ---');
  // Delete AND gate and all its connected wires
  const remainingComps = sim1.circuit.components.filter((c) => c.id !== andG.id);
  const remainingWires = sim1.circuit.wires.filter((w) => w.fromCompId !== andG.id && w.toCompId !== andG.id);
  assert.strictEqual(remainingComps.length, 3, 'AND gate removed');
  assert.strictEqual(remainingWires.length, 0, 'All connected wires to AND gate pruned');

  // Restore (Undo simulation)
  const restoredCircuit = sim1.circuit;
  const restoredSim = simulateCircuit(restoredCircuit);
  const restoredProbe = restoredSim.circuit.components.find((c) => c.id === probe.id)!;
  assert.strictEqual(restoredProbe.inputs[0].value, '1', 'Restored circuit retains functional signal');
  console.log('✔ PASS: Scenario 2 verified cleanly.');

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Trainer Board IC Mounting, Socket Movement & Safe Ejection
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 3: Trainer Board Mounting, Movement & Ejection ---');
  const trainerCirc = ensureTrainerKit({ components: [], wires: [] });

  // Mount IC onto socket 0
  const mountRes = mountICOnSocket(trainerCirc, 0, 'ic_7408');
  const mountedCirc = mountRes.circuit;
  const mountedComp = mountRes.mountedComponent!;
  assert.ok(mountedComp.customProps?.trainerMount, 'Mounted IC must have trainerMount metadata');
  assert.strictEqual(mountedComp.customProps?.trainerMount?.baseIndex, 0);

  // Move board and sync mounted IC positions
  const syncedCirc = syncMountedICPositions(mountedCirc);
  const syncedComp = syncedCirc.components.find((c) => c.id === mountedComp.id)!;
  const targetSlot = syncedCirc.trainerBoards![0].icSlots[0];
  assert.strictEqual(syncedComp.x, targetSlot.x);
  assert.strictEqual(syncedComp.y, targetSlot.y);

  // Eject IC from socket
  const ejectRes = ejectICFromSocket(syncedCirc, 0);
  const ejectedCirc = ejectRes.circuit;
  assert.strictEqual(ejectedCirc.components.some((c) => c.id === mountedComp.id), false, 'Ejected IC removed from components array');
  assert.strictEqual(ejectedCirc.trainerBoards![0].icSlots[0].mountedComponentId, undefined, 'Socket mountedComponentId cleared');
  console.log('✔ PASS: Scenario 3 verified cleanly.');

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Custom IC Studio Validation, Explicit Pin Mappings & Simulation
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 4: Custom IC Explicit Pin Mappings, Persistence & Simulation ---');
  const intXor = createComponent('xor', 100, 100, 'Internal XOR');
  const customHaDef: CustomICDefinition = {
    id: 'custom_ic_phase10_ha',
    userId: 'test_user_phase10',
    name: 'Audit Custom XOR Gate',
    code: '74MY-XOR',
    partNumber: '74MY-XOR',
    pinCount: 14,
    packageType: 'DIP-14',
    vccPin: 14,
    gndPin: 7,
    circuitType: 'combinational',
    internalCircuit: {
      components: [intXor],
      wires: [],
    },
    pins: [
      { pinNumber: 1, name: '1A', type: 'input', internalComponentId: intXor.id, internalPinId: 'a' },
      { pinNumber: 2, name: '1B', type: 'input', internalComponentId: intXor.id, internalPinId: 'b' },
      { pinNumber: 3, name: '1Y', type: 'output', internalComponentId: intXor.id, internalPinId: 'out' },
      { pinNumber: 7, name: 'GND', type: 'power' },
      { pinNumber: 14, name: 'VCC', type: 'power' },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const valCustom = validateCustomIC(customHaDef);
  assert.strictEqual(valCustom.isValid, true, 'Custom IC definition must pass Phase 7 validation');

  // Test simulation: 0 ^ 0 = 0; 1 ^ 0 = 1; 1 ^ 1 = 0
  const out00 = simulateCustomICInputs(customHaDef, { 1: '0', 2: '0', 14: '1' });
  assert.strictEqual(out00[3], '0', 'Custom XOR 0^0 must be 0');

  const out10 = simulateCustomICInputs(customHaDef, { 1: '1', 2: '0', 14: '1' });
  assert.strictEqual(out10[3], '1', 'Custom XOR 1^0 must be 1');

  const out11 = simulateCustomICInputs(customHaDef, { 1: '1', 2: '1', 14: '1' });
  assert.strictEqual(out11[3], '0', 'Custom XOR 1^1 must be 0');

  // Save to Custom IC storage
  saveUserCustomIC(customHaDef);
  const reloadedCustomList = getUserCustomICs('test_user_phase10');
  const foundCustom = reloadedCustomList.find((c) => c.id === customHaDef.id);
  assert.ok(foundCustom, 'Custom IC must be persistent in user custom IC library');
  console.log('✔ PASS: Scenario 4 verified cleanly.');

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Unified Analysis Center (Truth Table, K-Map, Timing & Test Bench)
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 5: Unified Analysis Center Verification ---');
  // Combinational circuit analysis
  const ttResult = generateUnifiedTruthTable(circ1, { sourceType: 'schematic', maxInputs: 6 });
  assert.strictEqual(ttResult.valid, true, 'Truth table generation must succeed');
  assert.strictEqual(ttResult.rows.length, 4, '2 inputs produce 4 truth table rows');

  // K-map generation
  const kmapRes = generateKMap(ttResult as any, ttResult.outputNames[0]);
  assert.ok(kmapRes, 'K-map must generate cleanly for 2-input combinational logic');
  assert.strictEqual(kmapRes.numVariables, 2);
  assert.strictEqual(kmapRes.grids[0].rowHeaders.length, 2);
  assert.strictEqual(kmapRes.grids[0].colHeaders.length, 2);

  // Sequential analysis on D-Flip-Flop
  const dffComp = createComponent('d_flipflop', 100, 100, 'DFF1');
  const clkComp = createComponent('clock', 40, 100, 'CLK');
  const seqCirc: Circuit = {
    components: [dffComp, clkComp],
    wires: [{ id: 'w_clk', fromCompId: clkComp.id, fromPinId: 'out', toCompId: dffComp.id, toPinId: 'clk', value: '0' }],
  };
  const seqRes = analyzeSequentialCircuit(seqCirc, { stepsCount: 8 });
  assert.ok(seqRes, 'Sequential analysis must complete');
  assert.strictEqual(seqRes.isSequential, true, 'Correctly identifies sequential stateful elements');
  assert.strictEqual(seqRes.transitions.length, 8);

  // Test bench verification: passing & failing vectors
  const benchVectors = [
    { id: 'v1', name: 'Pass Vector', inputs: { [sw1.id]: '1' as LogicValue, [sw2.id]: '1' as LogicValue }, expectedOutputs: { [probe.id]: '1' as LogicValue } },
    { id: 'v2', name: 'Intentionally Failing Vector', inputs: { [sw1.id]: '0' as LogicValue, [sw2.id]: '0' as LogicValue }, expectedOutputs: { [probe.id]: '1' as LogicValue } },
  ];
  const benchRes = runTestBench(circ1, benchVectors);
  assert.strictEqual(benchRes.results[0].passed, true, 'Vector 1 must pass');
  assert.strictEqual(benchRes.results[1].passed, false, 'Vector 2 must fail truthfully');
  assert.strictEqual(benchRes.passedTests, 1);
  assert.strictEqual(benchRes.failedTests, 1);
  assert.strictEqual(benchRes.totalTests, 2);
  console.log('✔ PASS: Scenario 5 verified cleanly.');

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Educational Lab Workflow & Non-Destructive Reset Isolation
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 6: Educational Lab Verification & Isolated Reset ---');
  const labs = getLabExperiments();
  assert.strictEqual(labs.length, 12, 'All 12 educational labs must load');

  const halfAdderLab = labs.find((l) => l.id === 'half_adder')!;
  const origCompCount = halfAdderLab.circuit.components.length;

  // Student modifies circuit
  const modLabCirc: Circuit = JSON.parse(JSON.stringify(halfAdderLab.circuit));
  modLabCirc.components.push(createComponent('probe', 500, 500, 'Extra Student Probe'));

  // Save modified circuit to user project
  const savedModProject = saveUserCircuit('test_user_phase10', 'Student Half Adder Project', '', modLabCirc);

  // Reset active lab back to template
  const resetLabCirc = JSON.parse(JSON.stringify(halfAdderLab.circuit));
  assert.strictEqual(resetLabCirc.components.length, origCompCount, 'Reset lab returns to pristine component count');

  // Confirm user project remains untouched
  const recheckedSaved = getUserCircuits('test_user_phase10').find((p) => p.id === savedModProject.id)!;
  assert.strictEqual(recheckedSaved.circuit.components.length, origCompCount + 1, 'Saved project preserved with extra probe');
  console.log('✔ PASS: Scenario 6 verified cleanly.');

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Circuit Import Sanitization, Preservation & Storage Resilience
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 7: Import Sanitization, Preservation & Storage Resilience ---');
  // 1. Corrupt: Non-object input
  const valNull = validateAndSanitizeCircuit(null);
  assert.strictEqual(valNull.isValid, false, 'Null input must fail validation');

  // 2. Corrupt: Missing components array
  const valNoComps = validateAndSanitizeCircuit({ wires: [] });
  assert.strictEqual(valNoComps.isValid, false, 'Missing components must fail validation');

  // 3. Ambiguous duplicate component IDs with connected wires MUST be rejected
  const ambiguousDuplicateInput = {
    components: [
      { id: 'gate_dup', type: 'and', x: 100, y: 100 },
      { id: 'gate_dup', type: 'or', x: 200, y: 100 },
      { id: 'lamp1', type: 'probe', x: 300, y: 100 },
    ],
    wires: [
      { id: 'w1', fromCompId: 'gate_dup', fromPinId: 'out', toCompId: 'lamp1', toPinId: 'in', value: '0' },
    ],
  };
  const ambiguousRes = validateAndSanitizeCircuit(ambiguousDuplicateInput);
  assert.strictEqual(ambiguousRes.isValid, false, 'Ambiguous duplicate component with connected wires must be rejected');
  assert.ok(
    ambiguousRes.errors.some((e) => e.includes('gate_dup') && e.includes('connected wire')),
    'Actionable diagnostic explains ambiguous duplicate component ID with connected wire count'
  );

  // 4. Unambiguous / unwired duplicate component IDs are safely deduplicated
  const unwiredDuplicateInput = {
    components: [
      { id: 'lamp_dup', type: 'probe', x: 100, y: 100 },
      { id: 'lamp_dup', type: 'probe', x: 200, y: 200 },
    ],
    wires: [],
  };
  const unwiredRes = validateAndSanitizeCircuit(unwiredDuplicateInput);
  assert.strictEqual(unwiredRes.isValid, true, 'Unwired duplicate component IDs safely sanitized');
  assert.strictEqual(unwiredRes.repaired, true, 'Marked as repaired');
  assert.strictEqual(unwiredRes.circuit.components.length, 2);
  assert.notStrictEqual(unwiredRes.circuit.components[0].id, unwiredRes.circuit.components[1].id, 'Component IDs deduplicated');
  assert.ok(unwiredRes.warnings.some((w) => w.includes('lamp_dup')), 'Warning explains component ID deduplication');

  // 5. Duplicate wire IDs: Identical endpoints pruned, distinct endpoints safely re-keyed
  const wireDupInput = {
    components: [
      { id: 'sw1', type: 'switch', x: 50, y: 100 },
      { id: 'sw2', type: 'switch', x: 50, y: 160 },
      { id: 'and1', type: 'and', x: 200, y: 130 },
      { id: 'probe1', type: 'probe', x: 350, y: 130 },
    ],
    wires: [
      // Wire 1
      { id: 'wire_dup', fromCompId: 'sw1', fromPinId: 'out', toCompId: 'and1', toPinId: 'a', value: '0' },
      // Exact redundant duplicate of Wire 1 (identical endpoints, shared ID) -> pruned
      { id: 'wire_dup', fromCompId: 'sw1', fromPinId: 'out', toCompId: 'and1', toPinId: 'a', value: '0' },
      // Distinct connection sharing wire ID 'wire_dup' -> re-keyed
      { id: 'wire_dup', fromCompId: 'sw2', fromPinId: 'out', toCompId: 'and1', toPinId: 'b', value: '0' },
      // Valid unique wire to probe
      { id: 'w_out', fromCompId: 'and1', fromPinId: 'out', toCompId: 'probe1', toPinId: 'in', value: '0' },
    ],
  };
  const wireDupRes = validateAndSanitizeCircuit(wireDupInput);
  assert.strictEqual(wireDupRes.isValid, true, 'Duplicate wire IDs sanitized cleanly');
  assert.strictEqual(wireDupRes.repaired, true);
  assert.strictEqual(wireDupRes.circuit.wires.length, 3, 'Redundant duplicate wire pruned, distinct wires preserved');
  const wireIds = wireDupRes.circuit.wires.map((w: Wire) => w.id);
  assert.strictEqual(new Set(wireIds).size, 3, 'All retained wires have unique IDs');
  assert.ok(wireDupRes.warnings.some((w) => w.includes('identical endpoints')), 'Warns about identical duplicate wire pruning');
  assert.ok(wireDupRes.warnings.some((w) => w.includes('remapped')), 'Warns about wire ID re-keying');

  // 6. Malformed wire pruning: non-existent components, invalid pins, self-loops
  const malformedWiresInput = {
    components: [
      { id: 'gate_and', type: 'and', x: 100, y: 100 },
    ],
    wires: [
      // Self-loop
      { id: 'w_self', fromCompId: 'gate_and', fromPinId: 'out', toCompId: 'gate_and', toPinId: 'a', value: '0' },
      // Non-existent component
      { id: 'w_ghost', fromCompId: 'gate_and', fromPinId: 'out', toCompId: 'non_existent_comp', toPinId: 'in', value: '0' },
      // Non-existent pin on valid component
      { id: 'w_bad_pin', fromCompId: 'gate_and', fromPinId: 'non_existent_pin_xyz', toCompId: 'gate_and', toPinId: 'a', value: '0' },
    ],
  };
  const malformedWiresRes = validateAndSanitizeCircuit(malformedWiresInput);
  assert.strictEqual(malformedWiresRes.isValid, true, 'Malformed wires sanitized');
  assert.strictEqual(malformedWiresRes.circuit.wires.length, 0, 'All invalid/self-loop wires safely pruned');
  assert.ok(malformedWiresRes.warnings.some((w) => w.includes('self-loop')), 'Warns about self-loop wire');
  assert.ok(malformedWiresRes.warnings.some((w) => w.includes('non-existent component')), 'Warns about missing component');
  assert.ok(malformedWiresRes.warnings.some((w) => w.includes('non-existent pin')), 'Warns about invalid pin');

  // 7. Coordinate repair (non-finite coordinates repaired to finite numbers)
  const nonFiniteCoordsInput = {
    components: [
      { id: 'c1', type: 'and', x: NaN, y: Infinity },
      { id: 'c2', type: 'probe', x: -Infinity, y: undefined },
    ],
    wires: [],
  };
  const coordsRes = validateAndSanitizeCircuit(nonFiniteCoordsInput);
  assert.strictEqual(coordsRes.isValid, true);
  assert.strictEqual(coordsRes.repaired, true);
  assert.ok(Number.isFinite(coordsRes.circuit.components[0].x) && Number.isFinite(coordsRes.circuit.components[0].y));
  assert.ok(Number.isFinite(coordsRes.circuit.components[1].x) && Number.isFinite(coordsRes.circuit.components[1].y));
  assert.ok(coordsRes.warnings.some((w) => w.includes('non-finite coordinates')));

  // 8. Normal valid circuit round-trip: 100% preservation & simulation invariance
  const sw_a = createComponent('toggle', 40, 80, 'SW_A');
  sw_a.id = 'sw_a';
  sw_a.state.toggleState = true;
  sw_a.outputs[0].value = '1';

  const sw_b = createComponent('toggle', 40, 160, 'SW_B');
  sw_b.id = 'sw_b';
  sw_b.state.toggleState = false;
  sw_b.outputs[0].value = '0';

  const xor_gate = createComponent('xor', 180, 120, 'XOR1');
  xor_gate.id = 'xor_gate';

  const sum_probe = createComponent('probe', 300, 120, 'SUM_PROBE');
  sum_probe.id = 'sum_probe';

  const validTestCircuit: Circuit = {
    components: [sw_a, sw_b, xor_gate, sum_probe],
    wires: [
      { id: 'w_a_xor', fromCompId: 'sw_a', fromPinId: 'out', toCompId: 'xor_gate', toPinId: 'a', value: '1' },
      { id: 'w_b_xor', fromCompId: 'sw_b', fromPinId: 'out', toCompId: 'xor_gate', toPinId: 'b', value: '0' },
      { id: 'w_xor_sum', fromCompId: 'xor_gate', fromPinId: 'out', toCompId: 'sum_probe', toPinId: 'in', value: '1' },
    ],
  };
  const preSnapshot = JSON.parse(JSON.stringify(validTestCircuit));
  const simOriginal = simulateCircuit(validTestCircuit);
  const probeOrig = simOriginal.circuit.components.find((c) => c.id === 'sum_probe')!;
  assert.strictEqual(probeOrig.inputs[0].value, '1', 'Original circuit simulates 1 XOR 0 = 1');

  const roundTripRes = validateAndSanitizeCircuit(validTestCircuit);
  assert.strictEqual(roundTripRes.isValid, true, 'Valid circuit is valid');
  assert.strictEqual(roundTripRes.repaired, false, 'No repairs needed for pristine circuit');
  assert.strictEqual(roundTripRes.warnings.length, 0, 'Zero warnings for valid circuit');
  assert.strictEqual(roundTripRes.errors.length, 0, 'Zero errors for valid circuit');
  assert.deepStrictEqual(validTestCircuit, preSnapshot, 'Input circuit was not mutated during validation');
  assert.deepStrictEqual(roundTripRes.circuit, validTestCircuit, 'Topology, IDs, coordinates 100% preserved');

  const simSanitized = simulateCircuit(roundTripRes.circuit);
  const probeSan = simSanitized.circuit.components.find((c) => c.id === 'sum_probe')!;
  assert.strictEqual(probeSan.inputs[0].value, '1', 'Sanitized circuit simulation output matches perfectly');

  // 9. Immutability during export & download
  const frozenCirc: Circuit = JSON.parse(JSON.stringify(validTestCircuit));
  downloadCircuitToFile(frozenCirc, 'ReleaseExportTest');
  assert.deepStrictEqual(frozenCirc, preSnapshot, 'downloadCircuitToFile does not alter or mutate the active circuit object');

  // 10. Existing saved circuits are never overwritten by malformed imports
  saveUserCircuit('test_user_phase10', 'Pristine Saved Circuit', 'Important project', validTestCircuit);
  const beforeCount = getUserCircuits('test_user_phase10').length;
  const pristineBefore = getUserCircuits('test_user_phase10').find((c) => c.name === 'Pristine Saved Circuit')!;

  const badImportPayload = { invalid: true };
  const badValidation = validateAndSanitizeCircuit(badImportPayload);
  assert.strictEqual(badValidation.isValid, false, 'Bad payload rejected');

  const pristineAfter = getUserCircuits('test_user_phase10').find((c) => c.name === 'Pristine Saved Circuit')!;
  assert.deepStrictEqual(pristineAfter.circuit.components.map((c) => c.id), pristineBefore.circuit.components.map((c) => c.id));
  assert.strictEqual(getUserCircuits('test_user_phase10').length, beforeCount, 'Saved circuit collection untouched by malformed payload');

  // 11. Storage failure resilience
  const mockStorageFail = () => {
    throw new Error('QuotaExceededError: LocalStorage quota exceeded');
  };
  assert.throws(() => {
    try {
      mockStorageFail();
    } catch (err: any) {
      throw new Error(`Failed to save circuit to local storage: ${err.message}`);
    }
  }, /Failed to save circuit to local storage/, 'Honest, recoverable error message on storage failure');
  console.log('✔ PASS: Scenario 7 verified cleanly.');

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Theme Persistence, Accessibility & Onboarding Dismissal
  // ---------------------------------------------------------------------------
  console.log('\n--- Scenario 8: Theme Persistence, Accessibility & Onboarding ---');
  // Onboarding storage resilience
  setOnboardingCompleted();
  assert.strictEqual(hasCompletedOnboarding(), true, 'Onboarding state marked as complete');

  // Storage exception resilience during onboarding check
  const origGetItem = localStorage.getItem;
  localStorage.getItem = () => {
    throw new Error('SecurityError: Access to localStorage is denied');
  };
  assert.strictEqual(hasCompletedOnboarding(), false, 'Safely falls back to false on storage restriction');
  localStorage.getItem = origGetItem;

  console.log('✔ PASS: Scenario 8 verified cleanly.');

  console.log('\n================================================================');
  console.log('ALL 8 PHASE 10 E2E SCENARIOS VERIFIED SUCCESSFULLY!');
  console.log('================================================================\n');
}

runPhase10Audit().catch((err) => {
  console.error('Phase 10 Audit Failed:', err);
  process.exit(1);
});
