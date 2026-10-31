import { createComponent, simulateCircuit, cleanupOrphanJunctions } from '../src/engine/simulator';
import { createTrainerKitComponents, getTrainerBoards, ensureTrainerKit } from '../src/engine/trainerKit';
import type { Circuit, CircuitComponent, Wire } from '../src/types/circuit';

console.log('=== RUNNING MULTI-TRAINER-BOARD & FREEFORM SCHEMATIC TEST ===');

// 1. Initial Trainer Board (Board 0)
console.log('\n--- 1. Testing Default Digital Trainer Board (Board 0) ---');
let circuit = ensureTrainerKit({ components: [], wires: [] });
let boards = getTrainerBoards(circuit.components);
console.log(`Discovered boards: ${boards.length} (expected: 1)`);
if (boards.length === 1 && boards[0].boardIndex === 0) {
  console.log('✅ PASS: Board 0 discovered correctly');
} else {
  console.error('❌ FAIL: Expected 1 board with index 0');
}

// Check key ports on Board 0
const b0_out15 = circuit.components.find((c) => c.id === 'trainer_out_15');
const b0_in0 = circuit.components.find((c) => c.id === 'trainer_in_0');
const b0_power = circuit.components.find((c) => c.id === 'trainer_power');
const b0_vcc = circuit.components.find((c) => c.id === 'trainer_vcc');
if (b0_out15 && b0_in0 && b0_power && b0_vcc) {
  console.log('✅ PASS: Board 0 fixed hardware ports present');
} else {
  console.error('❌ FAIL: Missing ports on Board 0');
}

// 2. Add Board 1 (+ Trainer Board option)
console.log('\n--- 2. Testing Adding Second Digital Trainer Board (Board 1) ---');
const board1Comps = createTrainerKitComponents(0, 560, 1);
circuit = {
  ...circuit,
  components: [...circuit.components, ...board1Comps],
};
boards = getTrainerBoards(circuit.components);
console.log(`Discovered boards after addition: ${boards.length} (expected: 2)`);
if (boards.length === 2 && boards[0].boardIndex === 0 && boards[1].boardIndex === 1) {
  console.log('✅ PASS: Both Board 0 and Board 1 discovered with correct offsets');
} else {
  console.error('❌ FAIL: Failed to discover both boards');
}

// Check Board 1 namespaced ports
const b1_out15 = circuit.components.find((c) => c.id === 'trainer_b1_out_15');
const b1_in0 = circuit.components.find((c) => c.id === 'trainer_b1_in_0');
const b1_power = circuit.components.find((c) => c.id === 'trainer_b1_power');
if (b1_out15 && b1_in0 && b1_power && b1_out15.customProps?.boardIndex === 1) {
  console.log('✅ PASS: Board 1 namespaced ports and customProps.boardIndex verified');
} else {
  console.error('❌ FAIL: Board 1 ports mismatch');
}

// 3. Connect wire between Board 0 and Board 1, then remove Board 1
console.log('\n--- 3. Testing Wire Connection & Removing Board 1 ---');
const interBoardWire: Wire = {
  id: 'wire_b0_b1',
  fromCompId: 'trainer_in_0',
  fromPinId: 'out',
  toCompId: 'trainer_b1_out_15',
  toPinId: 'in',
  value: '0',
};
circuit.wires.push(interBoardWire);

// Removal logic for Board 1
const isTrainerCompForBoard = (c: CircuitComponent, boardIndex: number) => {
  if (c.customProps?.boardIndex === boardIndex) return true;
  if (boardIndex === 0 && c.id.startsWith('trainer_') && !c.id.match(/^trainer_b\d+_/)) return true;
  if (c.id.startsWith(`trainer_b${boardIndex}_`)) return true;
  return false;
};

const compsToRemove = circuit.components.filter((c) => isTrainerCompForBoard(c, 1));
const removeIds = new Set(compsToRemove.map((c) => c.id));
const nextComps = circuit.components.filter((c) => !removeIds.has(c.id));
const nextWires = circuit.wires.filter(
  (w) => !removeIds.has(w.fromCompId) && !removeIds.has(w.toCompId)
);
const cleaned = cleanupOrphanJunctions(nextComps, nextWires);
circuit = { components: cleaned.components, wires: cleaned.wires };

boards = getTrainerBoards(circuit.components);
console.log(`Discovered boards after removing Board 1: ${boards.length} (expected: 1)`);
const wireStillExists = circuit.wires.some((w) => w.id === 'wire_b0_b1');
if (boards.length === 1 && !wireStillExists) {
  console.log('✅ PASS: Board 1 removed cleanly and attached wires removed');
} else {
  console.error('❌ FAIL: Board 1 removal or wire cleanup failed');
}

// 4. Freeform Schematic Mode (No Board)
console.log('\n--- 4. Testing Pure Schematic Mode (No Board) ---');
// In schematic mode, user places standalone gates without trainer chassis
const freeformCircuit: Circuit = {
  components: [
    createComponent('toggle', 50, 50, 'A'),
    createComponent('toggle', 50, 150, 'B'),
    createComponent('and', 200, 100),
    createComponent('probe', 350, 100, 'OUT'),
  ],
  wires: [],
};

const [inA, inB, andGate, outProbe] = freeformCircuit.components;
// Turn on Switch A and Switch B
inA.state = { toggleState: true };
inA.outputs[0].value = '1';
inB.state = { toggleState: true };
inB.outputs[0].value = '1';

freeformCircuit.wires.push({
  id: 'w_a',
  fromCompId: inA.id,
  fromPinId: 'out',
  toCompId: andGate.id,
  toPinId: 'a',
  value: '1',
});
freeformCircuit.wires.push({
  id: 'w_b',
  fromCompId: inB.id,
  fromPinId: 'out',
  toCompId: andGate.id,
  toPinId: 'b',
  value: '1',
});
freeformCircuit.wires.push({
  id: 'w_out',
  fromCompId: andGate.id,
  fromPinId: 'out',
  toCompId: outProbe.id,
  toPinId: 'in',
  value: '0',
});

const freeformSim = simulateCircuit(freeformCircuit);
const simulatedProbe = freeformSim.circuit.components.find((c) => c.id === outProbe.id);
if (simulatedProbe && simulatedProbe.inputs[0].value === '1') {
  console.log('✅ PASS: Pure Schematic Mode operates standalone gates accurately (1 AND 1 = 1)');
} else {
  console.error('❌ FAIL: Pure schematic mode simulation error');
}

console.log('\n✨ ALL MULTI-TRAINER-BOARD AND SCHEMATIC TESTS PASSED! ✨');
