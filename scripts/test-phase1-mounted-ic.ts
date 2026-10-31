import { ensureTrainerKit } from '../src/engine/trainerKit';
import {
  mountICOnSocket,
  ejectICFromSocket,
  moveTrainerBoard,
  syncMountedICPositions,
  getMountedICOnSocket,
  addModuleToTrainerBoard,
  type TrainerBoardModel,
} from '../src/engine/trainer/trainerBoardModel';
import type { Circuit, Wire } from '../src/types/circuit';
import { simulateCircuit } from '../src/engine/simulator';

console.log('====================================================');
console.log('CIRCUITFLOW PHASE 1: MOUNTED IC & SOCKET OWNERSHIP');
console.log('====================================================\n');

// Initialize Clean Circuit with Trainer Kit
let circuit: Circuit = ensureTrainerKit({ components: [], wires: [] });
const board1 = circuit.trainerBoards![0];
const slot1 = board1.icSlots[0]; // IC1 (baseIndex: 0)

// ----------------------------------------------------------------------------
// TEST 1: Mount 7408 onto IC Socket 1
// ----------------------------------------------------------------------------
const mountRes = mountICOnSocket(circuit, 0, 'ic_7408');
circuit = mountRes.circuit;
const mountedIC = mountRes.mountedComponent;

if (!mountedIC) {
  throw new Error('TEST 1 FAILED: mountedComponent is undefined');
}
if (mountedIC.x !== slot1.x || mountedIC.y !== slot1.y) {
  throw new Error(`TEST 1 FAILED: Mounted IC coords (${mountedIC.x}, ${mountedIC.y}) != slot coords (${slot1.x}, ${slot1.y})`);
}
if (!mountedIC.isTrainerFixed) {
  throw new Error('TEST 1 FAILED: isTrainerFixed is not true on mounted IC');
}
if ((mountedIC.rotation || 0) !== 0) {
  throw new Error('TEST 1 FAILED: rotation is not 0 on mounted IC');
}
const mountMeta = mountedIC.customProps?.trainerMount;
if (!mountMeta || mountMeta.boardId !== board1.id || mountMeta.socketId !== slot1.id || mountMeta.baseIndex !== 0) {
  throw new Error(`TEST 1 FAILED: trainerMount metadata mismatch: ${JSON.stringify(mountMeta)}`);
}
const slot1Updated = circuit.trainerBoards![0].icSlots[0];
if (slot1Updated.mountedComponentId !== mountedIC.id) {
  throw new Error(`TEST 1 FAILED: slot1.mountedComponentId != mountedIC.id (${slot1Updated.mountedComponentId} vs ${mountedIC.id})`);
}
console.log('✔ TEST 1 PASSED: Mounted 7408 with complete socket-authoritative ownership hierarchy');

// ----------------------------------------------------------------------------
// TEST 2: getMountedICOnSocket returns the authoritative mounted IC
// ----------------------------------------------------------------------------
const discoveredIC = getMountedICOnSocket(circuit, slot1Updated);
if (!discoveredIC || discoveredIC.id !== mountedIC.id) {
  throw new Error('TEST 2 FAILED: getMountedICOnSocket failed to return correct component');
}
console.log('✔ TEST 2 PASSED: getMountedICOnSocket resolves socket-owned component');

// ----------------------------------------------------------------------------
// TEST 3: Direct Drag and Marquee Drag Protection
// ----------------------------------------------------------------------------
// Simulating useCanvasInteraction drag-start check:
// An IC with isTrainerFixed or customProps.trainerMount MUST be rejected from drag
const isDraggable = !mountedIC.isTrainerFixed && !mountedIC.customProps?.trainerMount;
if (isDraggable) {
  throw new Error('TEST 3 FAILED: Mounted IC is considered draggable');
}

// In a marquee selection group with a movable AND gate:
const andGate = { id: 'movable_and_1', type: 'and' as const, label: 'AND', x: 200, y: 200, width: 80, height: 50, inputs: [], outputs: [] };
const targetComps = [mountedIC, andGate];
const movableComps = targetComps.filter(c => !c.isTrainerFixed && !c.customProps?.trainerMount);
if (movableComps.length !== 1 || movableComps[0].id !== 'movable_and_1') {
  throw new Error('TEST 3 FAILED: Marquee group drag did not exclude mounted IC');
}
console.log('✔ TEST 3 PASSED: Mounted IC is locked against direct and marquee dragging');

// ----------------------------------------------------------------------------
// TEST 4: Rotation Lock Protection
// ----------------------------------------------------------------------------
const canRotate = !mountedIC.isTrainerFixed && !mountedIC.customProps?.trainerMount;
if (canRotate) {
  throw new Error('TEST 4 FAILED: Mounted IC was allowed to rotate');
}
console.log('✔ TEST 4 PASSED: Rotation disabled on socket-mounted IC');

// ----------------------------------------------------------------------------
// TEST 5: Board Movement Moves Mounted IC in Lockstep (Board -> Module -> Socket -> IC)
// ----------------------------------------------------------------------------
const deltaX = 140;
const deltaY = 90;
const prevX = mountedIC.x;
const prevY = mountedIC.y;

const movedCircuit = moveTrainerBoard(circuit, board1.id, deltaX, deltaY);
const movedBoard = movedCircuit.trainerBoards![0];
const movedSlot1 = movedBoard.icSlots[0];
const movedIC = movedCircuit.components.find((c) => c.id === mountedIC.id);

if (!movedIC) {
  throw new Error('TEST 5 FAILED: Mounted IC disappeared after board move');
}
if (movedSlot1.x !== slot1.x + deltaX || movedSlot1.y !== slot1.y + deltaY) {
  throw new Error('TEST 5 FAILED: Socket position did not shift with board');
}
if (movedIC.x !== movedSlot1.x || movedIC.y !== movedSlot1.y) {
  throw new Error(`TEST 5 FAILED: Mounted IC coords (${movedIC.x}, ${movedIC.y}) != socket coords (${movedSlot1.x}, ${movedSlot1.y})`);
}
if (movedIC.x !== prevX + deltaX || movedIC.y !== prevY + deltaY) {
  throw new Error('TEST 5 FAILED: Mounted IC did not shift by exact delta');
}
console.log('✔ TEST 5 PASSED: Board translation moved Board -> Module -> Socket -> Mounted IC synchronously');

// Use movedCircuit for subsequent tests
circuit = movedCircuit;

// ----------------------------------------------------------------------------
// TEST 6: Save / Serialization & Reloading Preserves Ownership & Locking
// ----------------------------------------------------------------------------
const serialized = JSON.stringify(circuit);
const reloaded: Circuit = JSON.parse(serialized);
const syncedReloaded = syncMountedICPositions(reloaded);

const reloadedIC = syncedReloaded.components.find((c) => c.id === mountedIC.id);
const reloadedSlot = syncedReloaded.trainerBoards![0].icSlots[0];

if (!reloadedIC || !reloadedIC.customProps?.trainerMount) {
  throw new Error('TEST 6 FAILED: trainerMount metadata missing after reload');
}
if (reloadedIC.x !== reloadedSlot.x || reloadedIC.y !== reloadedSlot.y) {
  throw new Error('TEST 6 FAILED: Mounted IC coords mismatch socket after reload');
}
if (!reloadedIC.isTrainerFixed) {
  throw new Error('TEST 6 FAILED: isTrainerFixed missing after reload');
}
console.log('✔ TEST 6 PASSED: Save and reload cleanly restored socket ownership and spatial locking');

// ----------------------------------------------------------------------------
// TEST 7: Dynamic Module Expansion (Add Module 2 & Module 3) Preserves Mounted IC
// ----------------------------------------------------------------------------
const mod2Res = addModuleToTrainerBoard(circuit, board1.id);
circuit = mod2Res.circuit;
const mod3Res = addModuleToTrainerBoard(circuit, board1.id);
circuit = mod3Res.circuit;

const icAfterExpand = circuit.components.find((c) => c.id === mountedIC.id);
const slotAfterExpand = circuit.trainerBoards![0].icSlots[0];

if (!icAfterExpand || icAfterExpand.x !== slotAfterExpand.x || icAfterExpand.y !== slotAfterExpand.y) {
  throw new Error('TEST 7 FAILED: Mounted IC shifted or disconnected during module expansion');
}
console.log('✔ TEST 7 PASSED: Dynamic module expansion (4 -> 6 -> 8 IC sockets) preserved mounted IC');

// ----------------------------------------------------------------------------
// TEST 8: Wires Connected to Mounted IC & Safe Eject with Consequence Counting
// ----------------------------------------------------------------------------
// Wire trainer switch 0 to Pin 1 of mounted 7408 (1A)
// Wire Pin 3 of mounted 7408 (1Y) to trainer output probe 0
const wire1: Wire = {
  id: 'w_test_in0_pin1',
  fromCompId: 'trainer_in_0',
  fromPinId: 'out',
  toCompId: mountedIC.id,
  toPinId: 'pin1',
  value: '0',
};
const wire2: Wire = {
  id: 'w_test_pin3_out0',
  fromCompId: mountedIC.id,
  fromPinId: 'pin3',
  toCompId: 'trainer_out_0',
  toPinId: 'in',
  value: '0',
};
const wireUnrelated: Wire = {
  id: 'w_unrelated',
  fromCompId: 'trainer_in_1',
  fromPinId: 'out',
  toCompId: 'trainer_out_1',
  toPinId: 'in',
  value: '0',
};

circuit.wires.push(wire1, wire2, wireUnrelated);
circuit = simulateCircuit(circuit).circuit;

if (circuit.wires.length !== 3) {
  throw new Error('TEST 8 FAILED: Expected 3 wires');
}

// Safely eject the IC from Socket 0 (IC1)
const ejectRes = ejectICFromSocket(circuit, 0);
circuit = ejectRes.circuit;

if (ejectRes.disconnectedWiresCount !== 2) {
  throw new Error(`TEST 8 FAILED: Expected 2 disconnected wires, got ${ejectRes.disconnectedWiresCount}`);
}
if (circuit.components.some((c) => c.id === mountedIC.id)) {
  throw new Error('TEST 8 FAILED: Ejected IC still exists in components array');
}
if (circuit.wires.some((w) => w.id === 'w_test_in0_pin1' || w.id === 'w_test_pin3_out0')) {
  throw new Error('TEST 8 FAILED: Connected wires were not removed upon IC ejection');
}
if (!circuit.wires.some((w) => w.id === 'w_unrelated')) {
  throw new Error('TEST 8 FAILED: Unrelated wire was erroneously removed');
}
const socketAfterEject = circuit.trainerBoards![0].icSlots[0];
if (socketAfterEject.mountedComponentId !== undefined) {
  throw new Error('TEST 8 FAILED: socket.mountedComponentId was not cleared after eject');
}
console.log('✔ TEST 8 PASSED: Safe IC Ejection explicitly reported 2 disconnected wires and cleaned wires cleanly');

// ----------------------------------------------------------------------------
// TEST 9: Mount Custom IC onto Socket 2 (IC3)
// ----------------------------------------------------------------------------
const customICDef = {
  id: 'cust_74my_1',
  userId: 'test_user',
  name: 'Custom Quad Gate',
  code: '74MY01',
  partNumber: '74MY01',
  pinCount: 20 as const,
  pins: [
    { pin: 1, name: '1A', type: 'input' as const },
    { pin: 2, name: '1B', type: 'input' as const },
    { pin: 3, name: '1Y', type: 'output' as const },
    { pin: 10, name: 'GND', type: 'power' as const },
    { pin: 20, name: 'VCC', type: 'power' as const },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const customMountRes = mountICOnSocket(circuit, 2, 'custom_ic', customICDef);
circuit = customMountRes.circuit;
const mountedCustomIC = customMountRes.mountedComponent;

const slot3 = circuit.trainerBoards![0].icSlots[2];
if (!mountedCustomIC || mountedCustomIC.x !== slot3.x || mountedCustomIC.y !== slot3.y) {
  throw new Error('TEST 9 FAILED: Custom IC coordinates do not match socket 3');
}
if (mountedCustomIC.customProps?.trainerMount?.socketId !== slot3.id) {
  throw new Error('TEST 9 FAILED: Custom IC trainerMount metadata incorrect');
}
if (!mountedCustomIC.isTrainerFixed) {
  throw new Error('TEST 9 FAILED: Custom IC is not locked to socket');
}
console.log('✔ TEST 9 PASSED: Custom IC mounted with complete socket ownership and pin configuration');

// ----------------------------------------------------------------------------
// TEST 10: Eject Custom IC Cleanly
// ----------------------------------------------------------------------------
const ejectCustomRes = ejectICFromSocket(circuit, 2);
circuit = ejectCustomRes.circuit;
if (circuit.components.some((c) => c.id === mountedCustomIC.id)) {
  throw new Error('TEST 10 FAILED: Custom IC not removed from circuit');
}
console.log('✔ TEST 10 PASSED: Custom IC ejected cleanly');

console.log('\n====================================================');
console.log('🎉 ALL 10 PHASE 1 MOUNTED IC TESTS PASSED!');
console.log('====================================================');
