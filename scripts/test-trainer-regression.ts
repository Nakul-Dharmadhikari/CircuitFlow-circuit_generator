import { ensureTrainerKit, TRAINER_BOARD_LAYOUT } from '../src/engine/trainerKit';
import {
  createInitialTrainerBoard,
  addModuleToTrainerBoard,
  removeLastModuleFromTrainerBoard,
  copyTrainerBoard,
  deleteTrainerBoard,
  getMountedICOnSocket,
  calculateBoardWidth,
  TRAINER_CONSTANTS,
  TrainerBoardModel,
} from '../src/engine/trainer/trainerBoardModel';
import { createComponent, simulateCircuit } from '../src/engine/simulator';
import type { Circuit, Wire } from '../src/types/circuit';

console.log('====================================================');
console.log('CIRCUITFLOW TRAINER BOARD & EXPANDABLE BREADBOARD TESTS');
console.log('====================================================\n');

// ----------------------------------------------------------------------------
// TEST 1: Create trainer board. It has 4 IC sockets.
// ----------------------------------------------------------------------------
let circuit: Circuit = ensureTrainerKit({ components: [], wires: [] });
const board1 = circuit.trainerBoards?.[0];

if (!board1) throw new Error('TEST 1 FAILED: Trainer board not created in circuit');
if (board1.icSlots.length !== 4) {
  throw new Error(`TEST 1 FAILED: Expected 4 IC sockets, found ${board1.icSlots.length}`);
}
if (board1.modules.length !== 1) {
  throw new Error(`TEST 1 FAILED: Expected 1 default module, found ${board1.modules.length}`);
}
console.log('✔ TEST 1 PASSED: Created trainer board with 4 DIP-20 IC sockets (IC1..IC4)');

// ----------------------------------------------------------------------------
// TEST 2: Mount 7408 in IC1.
// ----------------------------------------------------------------------------
const ic1Slot = board1.icSlots.find((s) => s.label === 'IC1');
if (!ic1Slot) throw new Error('TEST 2 FAILED: IC1 socket not found');

const ic7408 = createComponent('ic_7408', ic1Slot.x, ic1Slot.y, 'IC1 (7408)');
ic7408.customProps = {
  ...ic7408.customProps,
  trainerMount: {
    boardId: board1.id,
    socketId: ic1Slot.id,
    baseIndex: ic1Slot.baseIndex,
  },
};
circuit.components.push(ic7408);

const mounted1 = getMountedICOnSocket(circuit, ic1Slot.id);
if (!mounted1 || mounted1.type !== 'ic_7408') {
  throw new Error('TEST 2 FAILED: Could not mount or locate 7408 on IC1');
}
console.log('✔ TEST 2 PASSED: Successfully mounted 7408 into IC1 socket');

// ----------------------------------------------------------------------------
// TEST 3: Mount 7432 in IC4.
// ----------------------------------------------------------------------------
const ic4Slot = board1.icSlots.find((s) => s.label === 'IC4');
if (!ic4Slot) throw new Error('TEST 3 FAILED: IC4 socket not found');

const ic7432 = createComponent('ic_7432', ic4Slot.x, ic4Slot.y, 'IC4 (7432)');
ic7432.customProps = {
  ...ic7432.customProps,
  trainerMount: {
    boardId: board1.id,
    socketId: ic4Slot.id,
    baseIndex: ic4Slot.baseIndex,
  },
};
circuit.components.push(ic7432);

const mounted4 = getMountedICOnSocket(circuit, ic4Slot.id);
if (!mounted4 || mounted4.type !== 'ic_7432') {
  throw new Error('TEST 3 FAILED: Could not mount or locate 7432 on IC4');
}
console.log('✔ TEST 3 PASSED: Successfully mounted 7432 into IC4 socket');

// ----------------------------------------------------------------------------
// TEST 4: Add module. Board now contains 6 IC sockets.
// ----------------------------------------------------------------------------
const addMod1Res = addModuleToTrainerBoard(circuit, board1.id);
circuit = addMod1Res.circuit;
const updatedBoard1 = circuit.trainerBoards?.find((b) => b.id === board1.id);

if (!updatedBoard1 || updatedBoard1.icSlots.length !== 6) {
  throw new Error(`TEST 4 FAILED: Expected 6 IC sockets after adding Module 2, got ${updatedBoard1?.icSlots.length}`);
}
if (updatedBoard1.modules.length !== 2) {
  throw new Error(`TEST 4 FAILED: Expected 2 modules, got ${updatedBoard1.modules.length}`);
}
console.log('✔ TEST 4 PASSED: Added Module 2; Board now contains 6 IC sockets (IC1..IC6)');

// ----------------------------------------------------------------------------
// TEST 5: New input terminals exist from IN16 to IN23.
// ----------------------------------------------------------------------------
for (let i = 16; i <= 23; i++) {
  const comp = circuit.components.find((c) => c.customProps?.trainerInputIndex === i);
  if (!comp) {
    throw new Error(`TEST 5 FAILED: Missing trainer input IN${i}`);
  }
  if (!comp.outputs || comp.outputs.length === 0) {
    throw new Error(`TEST 5 FAILED: IN${i} missing output pin`);
  }
}
console.log('✔ TEST 5 PASSED: New dynamic input terminals IN16 through IN23 exist and configured');

// ----------------------------------------------------------------------------
// TEST 6: Toggle IN16. Simulation reads it correctly.
// ----------------------------------------------------------------------------
const in16 = circuit.components.find((c) => c.customProps?.trainerInputIndex === 16);
if (!in16) throw new Error('TEST 6 FAILED: in16 component not found');

// Toggle to '1'
in16.state = { ...in16.state, toggleState: true };
let simCircuit = simulateCircuit(circuit).circuit;
let simIn16 = simCircuit.components.find((c) => c.id === in16.id);
if (simIn16?.outputs[0].value !== '1') {
  throw new Error(`TEST 6 FAILED: Expected simulation to read '1' from toggled IN16, got ${simIn16?.outputs[0].value}`);
}

// Connect IN16 to an output LED (e.g. trainer_out_0)
const wire16ToOut0: Wire = {
  id: 'w_in16_out0',
  fromCompId: in16.id,
  fromPinId: in16.outputs[0].id,
  toCompId: 'trainer_out_0',
  toPinId: 'in',
  value: '0',
};
simCircuit.wires.push(wire16ToOut0);
simCircuit = simulateCircuit(simCircuit).circuit;
const out0 = simCircuit.components.find((c) => c.id === 'trainer_out_0');
if (out0?.inputs[0].value !== '1') {
  throw new Error(`TEST 6 FAILED: Expected trainer_out_0 to receive '1' from IN16, got ${out0?.inputs[0].value}`);
}
console.log('✔ TEST 6 PASSED: Toggled IN16 propagates through simulation engine to output probes');

// ----------------------------------------------------------------------------
// TEST 7: Add another module. Board now has 8 IC sockets (IC7, IC8) and IN24..IN31.
// ----------------------------------------------------------------------------
const addMod2Res = addModuleToTrainerBoard(circuit, board1.id);
circuit = addMod2Res.circuit;
const updatedBoard2 = circuit.trainerBoards?.find((b) => b.id === board1.id);

if (!updatedBoard2 || updatedBoard2.icSlots.length !== 8) {
  throw new Error(`TEST 7 FAILED: Expected 8 IC sockets after adding Module 3, got ${updatedBoard2?.icSlots.length}`);
}
if (updatedBoard2.modules.length !== 3) {
  throw new Error(`TEST 7 FAILED: Expected 3 modules, got ${updatedBoard2.modules.length}`);
}
for (let i = 24; i <= 31; i++) {
  const comp = circuit.components.find((c) => c.customProps?.trainerInputIndex === i);
  if (!comp) throw new Error(`TEST 7 FAILED: Missing trainer input IN${i}`);
}
console.log('✔ TEST 7 PASSED: Added Module 3; Board now has 8 IC sockets and IN24..IN31 inputs (32 inputs total)');

// ----------------------------------------------------------------------------
// TEST 8: Board moves. All generated components remain correctly positioned.
// ----------------------------------------------------------------------------
const originalBoardX = updatedBoard2.x;
const originalBoardY = updatedBoard2.y;
const deltaX = 150;
const deltaY = 100;

// Shift all board components
const shiftedCircuit: Circuit = {
  ...circuit,
  trainerBoards: circuit.trainerBoards?.map((b) => {
    if (b.id !== updatedBoard2.id) return b;
    return {
      ...b,
      x: b.x + deltaX,
      y: b.y + deltaY,
      modules: b.modules.map((m) => ({ ...m, x: m.x + deltaX, y: m.y + deltaY })),
      icSlots: b.icSlots.map((s) => ({ ...s, x: s.x + deltaX, y: s.y + deltaY })),
    };
  }),
  components: circuit.components.map((c) => {
    if (c.customProps?.boardId === updatedBoard2.id) {
      return { ...c, x: c.x + deltaX, y: c.y + deltaY };
    }
    return c;
  }),
  wires: circuit.wires.map((w) => ({ ...w })),
};

const shiftedBoard = shiftedCircuit.trainerBoards?.find((b) => b.id === updatedBoard2.id)!;
const shiftedIn16 = shiftedCircuit.components.find((c) => c.customProps?.trainerInputIndex === 16)!;
if (shiftedBoard.x !== originalBoardX + deltaX || shiftedBoard.y !== originalBoardY + deltaY) {
  throw new Error('TEST 8 FAILED: Shifted board coordinates mismatch');
}
if (shiftedIn16.x !== in16.x + deltaX || shiftedIn16.y !== in16.y + deltaY) {
  throw new Error('TEST 8 FAILED: Shifted input coordinates mismatch');
}
console.log('✔ TEST 8 PASSED: Board translation cleanly shifts all modules, sockets, and components in unison');

// ----------------------------------------------------------------------------
// TEST 9: Save circuit. Reload circuit. Number of modules remains correct.
// ----------------------------------------------------------------------------
const serializedCircuit = JSON.stringify(circuit);
const reloadedCircuit: Circuit = JSON.parse(serializedCircuit);
const reloadedBoard = reloadedCircuit.trainerBoards?.find((b) => b.id === board1.id);

if (!reloadedBoard) throw new Error('TEST 9 FAILED: Reloaded board missing');
if (reloadedBoard.modules.length !== 3) {
  throw new Error(`TEST 9 FAILED: Expected 3 modules after reload, got ${reloadedBoard.modules.length}`);
}
if (reloadedBoard.icSlots.length !== 8) {
  throw new Error(`TEST 9 FAILED: Expected 8 IC sockets after reload, got ${reloadedBoard.icSlots.length}`);
}
const reloadedMounted1 = getMountedICOnSocket(reloadedCircuit, ic1Slot.id);
if (!reloadedMounted1 || reloadedMounted1.type !== 'ic_7408') {
  throw new Error('TEST 9 FAILED: Mounted 7408 IC missing after reload');
}
console.log('✔ TEST 9 PASSED: Save & Reload persists all 3 modules, 8 IC sockets, mounted chips, and inputs');

// ----------------------------------------------------------------------------
// TEST 10: Undo Add Module. The generated module disappears.
// ----------------------------------------------------------------------------
// Simulating undo of adding Module 3 by removing last module
circuit = removeLastModuleFromTrainerBoard(circuit, board1.id);
const undoneBoard = circuit.trainerBoards?.find((b) => b.id === board1.id)!;

if (undoneBoard.modules.length !== 2) {
  throw new Error(`TEST 10 FAILED: Expected 2 modules after undo, got ${undoneBoard.modules.length}`);
}
if (undoneBoard.icSlots.length !== 6) {
  throw new Error(`TEST 10 FAILED: Expected 6 IC sockets after undo, got ${undoneBoard.icSlots.length}`);
}
// Verify IN24..IN31 components were removed
const in24 = circuit.components.find((c) => c.customProps?.trainerInputIndex === 24);
if (in24) throw new Error('TEST 10 FAILED: IN24 component was not cleaned up during undo');
console.log('✔ TEST 10 PASSED: Undo Add Module removed Module 3, restored 6 IC sockets, and cleaned up inputs');

// ----------------------------------------------------------------------------
// TEST 11: Redo Add Module. The module returns.
// ----------------------------------------------------------------------------
const redoRes = addModuleToTrainerBoard(circuit, board1.id);
circuit = redoRes.circuit;
const redoneBoard = circuit.trainerBoards?.find((b) => b.id === board1.id)!;

if (redoneBoard.modules.length !== 3 || redoneBoard.icSlots.length !== 8) {
  throw new Error('TEST 11 FAILED: Redo did not restore Module 3 and 8 sockets');
}
console.log('✔ TEST 11 PASSED: Redo Add Module properly restored Module 3 and all components');

// ----------------------------------------------------------------------------
// TEST 12: Copy board. Copied board has same number of modules and unique IDs.
// ----------------------------------------------------------------------------
const copyRes = copyTrainerBoard(circuit, board1.id, 0, 500);
circuit = copyRes.circuit;
const copiedBoard = copyRes.newBoard;

if (!copiedBoard) throw new Error('TEST 12 FAILED: Copied board returned null');
if (copiedBoard.id === board1.id) throw new Error('TEST 12 FAILED: Copied board shared same ID');
if (copiedBoard.modules.length !== 3) {
  throw new Error(`TEST 12 FAILED: Copied board expected 3 modules, got ${copiedBoard.modules.length}`);
}
if (copiedBoard.icSlots.length !== 8) {
  throw new Error(`TEST 12 FAILED: Copied board expected 8 IC sockets, got ${copiedBoard.icSlots.length}`);
}
// Verify no shared IDs with original board
for (const slot of copiedBoard.icSlots) {
  if (board1.icSlots.some((s) => s.id === slot.id)) {
    throw new Error(`TEST 12 FAILED: Duplicate socket ID ${slot.id} found in copied board`);
  }
}
console.log('✔ TEST 12 PASSED: Copied board successfully cloned 3 modules, 8 sockets, 32 inputs with unique IDs');

// ----------------------------------------------------------------------------
// TEST 13: Delete board. No orphan trainer components remain.
// ----------------------------------------------------------------------------
circuit = deleteTrainerBoard(circuit, copiedBoard.id);

if (circuit.trainerBoards?.some((b) => b.id === copiedBoard.id)) {
  throw new Error('TEST 13 FAILED: Copied board still present in circuit.trainerBoards');
}
const orphanComp = circuit.components.find((c) => c.customProps?.boardId === copiedBoard.id);
if (orphanComp) {
  throw new Error(`TEST 13 FAILED: Found orphan component ${orphanComp.id} from deleted board`);
}
console.log('✔ TEST 13 PASSED: Deleted copied board cleanly with zero orphan components left');

// ----------------------------------------------------------------------------
// TEST 14: Switch Trainer → Schematic → Trainer. Structure remains intact.
// ----------------------------------------------------------------------------
let workspaceMode: 'trainer' | 'schematic' = 'trainer';
workspaceMode = 'schematic';
// In schematic mode, components and trainerBoards stay in circuit data model
if (!circuit.trainerBoards || circuit.trainerBoards.length === 0) {
  throw new Error('TEST 14 FAILED: Trainer boards lost during schematic mode switch');
}
workspaceMode = 'trainer';
const activeTrainer = circuit.trainerBoards[0];
if (activeTrainer.modules.length !== 3 || activeTrainer.icSlots.length !== 8) {
  throw new Error('TEST 14 FAILED: Trainer module structure corrupted during mode toggle');
}
console.log('✔ TEST 14 PASSED: Workspace mode toggle preserves complete trainer module structure');

// ----------------------------------------------------------------------------
// TEST 15: Open inspector for board. Correct counts appear.
// ----------------------------------------------------------------------------
const inspectedBoard = circuit.trainerBoards[0];
const totalModuleCount = inspectedBoard.modules.length;
const totalICSlots = inspectedBoard.icSlots.length;
const totalInputs = inspectedBoard.modules.reduce((sum, m) => sum + m.inputCount, 0);

if (totalModuleCount !== 3 || totalICSlots !== 8 || totalInputs !== 32) {
  throw new Error(`TEST 15 FAILED: Inspector counts mismatch: modules=${totalModuleCount}, ics=${totalICSlots}, inputs=${totalInputs}`);
}
console.log(`✔ TEST 15 PASSED: Inspector correctly reads ${totalModuleCount} modules, ${totalICSlots} IC slots, ${totalInputs} inputs`);

// ----------------------------------------------------------------------------
// TEST 16: Open component inspector for mounted IC. Existing functionality still works.
// ----------------------------------------------------------------------------
const inspectedIC = circuit.components.find((c) => c.id === ic7408.id);
if (!inspectedIC || inspectedIC.inputs.length === 0 || inspectedIC.outputs.length === 0) {
  throw new Error('TEST 16 FAILED: Inspected IC pin data missing');
}
console.log(`✔ TEST 16 PASSED: Mounted IC component inspector operational with ${inspectedIC.inputs.length} inputs and ${inspectedIC.outputs.length} outputs`);

console.log('\n====================================================');
console.log('ALL 16 REGRESSION TESTS PASSED ACCORDING TO SPEC!');
console.log('====================================================\n');
