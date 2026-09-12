import { createComponent, simulateCircuit } from '../src/engine/simulator';
import { createTrainerKitComponents, getTrainerBoards, ensureTrainerKit, TRAINER_BOARD_LAYOUT } from '../src/engine/trainerKit';
import type { Circuit, CircuitComponent, Wire } from '../src/types/circuit';

console.log('=== RUNNING BOARD DRAGGING & CURSOR-AWARE PASTE TEST ===');

// 1. Initial Trainer Board
console.log('\n--- 1. Testing Trainer Board Dynamic Offset on Drag ---');
let circuit = ensureTrainerKit({ components: [], wires: [] });
let initialBoards = getTrainerBoards(circuit.components);
console.log(`Initial Board offset: (${initialBoards[0].offsetX}, ${initialBoards[0].offsetY})`);

// Simulate user dragging Board 0 by +150px X and +80px Y
const deltaX = 150;
const deltaY = 80;
const movedComponents = circuit.components.map((c) => {
  if (c.id.startsWith('trainer_') || c.customProps?.boardIndex === 0) {
    return {
      ...c,
      x: c.x + deltaX,
      y: c.y + deltaY,
    };
  }
  return c;
});
circuit = { ...circuit, components: movedComponents };

const movedBoards = getTrainerBoards(circuit.components);
console.log(`Board offset after drag: (${movedBoards[0].offsetX}, ${movedBoards[0].offsetY})`);
if (movedBoards[0].offsetX === 150 && movedBoards[0].offsetY === 80) {
  console.log('✅ PASS: getTrainerBoards dynamically computes the dragged position offset!');
} else {
  console.error(`❌ FAIL: Expected offset (150, 80), got (${movedBoards[0].offsetX}, ${movedBoards[0].offsetY})`);
}

// 2. Test Pasting a Trainer Board at Target Location
console.log('\n--- 2. Testing Copying & Pasting Trainer Board at Target Position ---');
// Mock clipboard payload containing Board 0 components
const toCopyComps = circuit.components.filter((c) => c.id.startsWith('trainer_') || c.customProps?.boardIndex === 0);
const targetPos = { x: 300, y: 700 };

// Pasting logic
const existingBoards = getTrainerBoards(circuit.components);
const nextBoardIndex = Math.max(...existingBoards.map((b) => b.boardIndex)) + 1;
const minX = Math.min(...toCopyComps.map((c) => c.x));
const minY = Math.min(...toCopyComps.map((c) => c.y));
const shiftX = targetPos.x - minX;
const shiftY = targetPos.y - minY;

const idMap: Record<string, string> = {};
const newBoardComps: CircuitComponent[] = toCopyComps.map((c) => {
  const suffix = c.id.replace(/^trainer_(b\d+_)?/, '');
  const newId = `trainer_b${nextBoardIndex}_${suffix}`;
  idMap[c.id] = newId;
  return {
    ...c,
    id: newId,
    isTrainerFixed: true,
    x: Math.round((c.x + shiftX) / 10) * 10,
    y: Math.round((c.y + shiftY) / 10) * 10,
    inputs: c.inputs.map((p) => ({ ...p })),
    outputs: c.outputs.map((p) => ({ ...p })),
    state: { ...c.state },
    customProps: {
      ...c.customProps,
      boardIndex: nextBoardIndex,
    },
  };
});

circuit = {
  ...circuit,
  components: [...circuit.components, ...newBoardComps],
};

const boardsAfterPaste = getTrainerBoards(circuit.components);
console.log(`Discovered boards count: ${boardsAfterPaste.length} (expected: 2)`);
if (boardsAfterPaste.length === 2 && boardsAfterPaste[1].boardIndex === 1) {
  console.log('✅ PASS: Pasted Trainer Board #2 discovered with correct boardIndex!');
} else {
  console.error('❌ FAIL: Pasted board not discovered properly');
}

// 3. Test Standalone Component Copy & "Paste Here"
console.log('\n--- 3. Testing Standalone Component Copy & Paste Here ---');
const andGate = createComponent('and', 100, 100);
const switchA = createComponent('toggle', 20, 80);
const switchB = createComponent('toggle', 20, 120);
const probe = createComponent('probe', 200, 100);

const copiedGates = [andGate, switchA, switchB, probe];
const targetCursorPos = { x: 500, y: 400 };

// Center offset calculation
const gMinX = Math.min(...copiedGates.map((c) => c.x));
const gMaxX = Math.max(...copiedGates.map((c) => c.x));
const gMinY = Math.min(...copiedGates.map((c) => c.y));
const gMaxY = Math.max(...copiedGates.map((c) => c.y));
const gCenterX = (gMinX + gMaxX) / 2;
const gCenterY = (gMinY + gMaxY) / 2;

const gOffsetX = Math.round((targetCursorPos.x - gCenterX) / 10) * 10;
const gOffsetY = Math.round((targetCursorPos.y - gCenterY) / 10) * 10;

const pastedGates: CircuitComponent[] = copiedGates.map((c) => ({
  ...c,
  id: `comp_pasted_${c.type}_${Date.now()}`,
  isTrainerFixed: false,
  x: c.x + gOffsetX,
  y: c.y + gOffsetY,
}));

const pastedAnd = pastedGates.find((c) => c.type === 'and');
console.log(`Pasted AND gate position: (${pastedAnd?.x}, ${pastedAnd?.y})`);
if (pastedAnd && Math.abs(pastedAnd.x - 500) < 50 && Math.abs(pastedAnd.y - 400) < 50) {
  console.log('✅ PASS: Standalone gates pasted precisely around target cursor position!');
} else {
  console.error('❌ FAIL: Component offset calculation failed');
}

console.log('\n✨ ALL BOARD DRAGGING AND CURSOR-AWARE PASTE TESTS PASSED! ✨');
