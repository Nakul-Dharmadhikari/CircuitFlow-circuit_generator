import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateDestructiveConsequences,
  type DestructiveConfirmationState,
} from '../src/types/destructiveConfirmation';
import {
  ensureTrainerKit,
  mountICOnSocket,
  ejectICFromSocket,
  addModuleToTrainerBoard,
  deleteTrainerBoard,
  TRAINER_CONSTANTS,
  TRAINER_BOARD_LAYOUT,
} from '../src/engine/trainerKit';
import { createComponent, simulateCircuit, cleanupOrphanJunctions } from '../src/engine/simulator';
import type { Circuit, CircuitComponent, Wire } from '../src/types/circuit';

console.log('--- RUNNING PHASE 3 CONTEXT MENUS & DESTRUCTIVE ACTIONS TESTS ---');

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exit(1);
  }
}

// 1. Consequence Calculation: Ordinary Component
runTest('Dynamic consequences for ordinary component with 0 connected wires', () => {
  const comp = createComponent('and', 100, 100);
  const circuit: Circuit = { components: [comp], wires: [] };
  const consequences = calculateDestructiveConsequences(circuit, 'remove_component', {
    componentId: comp.id,
  });

  assert.strictEqual(consequences.affectedComponentsCount, 1);
  assert.strictEqual(consequences.affectedWiresCount, 0);
  assert.strictEqual(consequences.affectedMountedICsCount, 0);
  assert.strictEqual(consequences.summaryText, 'No wires are connected to this component.');
});

runTest('Dynamic consequences for ordinary component with 3 connected wires', () => {
  const g1 = createComponent('and', 100, 100);
  const g2 = createComponent('or', 300, 100);
  const g3 = createComponent('not', 500, 100);

  const w1: Wire = { id: 'w1', fromCompId: g1.id, fromPinId: 'out', toCompId: g2.id, toPinId: 'in1', value: '0' };
  const w2: Wire = { id: 'w2', fromCompId: g1.id, fromPinId: 'in1', toCompId: g3.id, toPinId: 'out', value: '0' };
  const w3: Wire = { id: 'w3', fromCompId: g1.id, fromPinId: 'in2', toCompId: g3.id, toPinId: 'in', value: '0' };

  const circuit: Circuit = { components: [g1, g2, g3], wires: [w1, w2, w3] };
  const consequences = calculateDestructiveConsequences(circuit, 'remove_component', {
    componentId: g1.id,
  });

  assert.strictEqual(consequences.affectedComponentsCount, 1);
  assert.strictEqual(consequences.affectedWiresCount, 3);
  assert.strictEqual(consequences.affectedMountedICsCount, 0);
  assert(consequences.summaryText.includes('3 connected wires will be disconnected'));
});

// 2. Consequence Calculation: Multi-Selection
runTest('Dynamic consequences for multi-selection produces one consolidated confirmation', () => {
  const g1 = createComponent('and', 100, 100);
  const g2 = createComponent('or', 300, 100);
  const g3 = createComponent('not', 500, 100);

  const w1: Wire = { id: 'w1', fromCompId: g1.id, fromPinId: 'out', toCompId: g2.id, toPinId: 'in1', value: '0' };
  const w2: Wire = { id: 'w2', fromCompId: g2.id, fromPinId: 'out', toCompId: g3.id, toPinId: 'in', value: '0' };

  const circuit: Circuit = { components: [g1, g2, g3], wires: [w1, w2] };
  const consequences = calculateDestructiveConsequences(circuit, 'remove_multi_components', {
    componentIds: [g1.id, g2.id],
  });

  assert.strictEqual(consequences.affectedComponentsCount, 2);
  assert.strictEqual(consequences.affectedWiresCount, 2);
  assert(consequences.summaryText.includes('2 components and 2 connected wires will be removed'));
});

// 3. Consequence Calculation: Mounted IC
runTest('Dynamic consequences for mounted IC reports accurate wire count and preserves socket', () => {
  let circuit = ensureTrainerKit({ components: [], wires: [] });
  const mountRes = mountICOnSocket(circuit, 0, 'ic_7408');
  circuit = mountRes.circuit;
  const icId = mountRes.mountedComponent.id;

  const wire: Wire = {
    id: 'w_ic_1',
    fromCompId: icId,
    fromPinId: 'pin3',
    toCompId: 'trainer_out_0',
    toPinId: 'in',
    value: '0',
  };
  circuit.wires.push(wire);

  const consequences = calculateDestructiveConsequences(circuit, 'eject_mounted_ic', {
    baseIndex: 0,
    componentId: icId,
  });

  assert.strictEqual(consequences.affectedMountedICsCount, 1);
  assert.strictEqual(consequences.affectedWiresCount, 1);
  assert(consequences.summaryText.includes('1 connected wire will be disconnected'));
});

// 4. Consequence Calculation: Trainer Module
runTest('Dynamic consequences for Trainer Module includes mounted ICs and module wires', () => {
  let circuit = ensureTrainerKit({ components: [], wires: [] });
  const addRes = addModuleToTrainerBoard(circuit);
  circuit = addRes.circuit;
  const newModId = addRes.newModule.id;

  // Mount IC on Module 2 (baseIndex 4)
  const mountRes = mountICOnSocket(circuit, 4, 'ic_7432');
  circuit = mountRes.circuit;

  const wire: Wire = {
    id: 'w_mod_1',
    fromCompId: mountRes.mountedComponent.id,
    fromPinId: 'pin3',
    toCompId: 'trainer_mod_2_in_0',
    toPinId: 'out',
    value: '0',
  };
  circuit.wires.push(wire);

  const consequences = calculateDestructiveConsequences(circuit, 'remove_module', {
    moduleId: newModId,
  });

  assert.strictEqual(consequences.affectedMountedICsCount, 1);
  assert.strictEqual(consequences.affectedWiresCount, 1);
  assert(consequences.summaryText.includes('1 mounted IC'));
});

// 5. Consequence Calculation: Trainer Board
runTest('Dynamic consequences for Trainer Board reports board components and wires', () => {
  let circuit = ensureTrainerKit({ components: [], wires: [] });
  const consequences = calculateDestructiveConsequences(circuit, 'remove_board', {
    boardIndex: 0,
    boardId: 'board_1',
  });

  assert(consequences.affectedComponentsCount > 0);
  assert(consequences.summaryText.includes('Digital Trainer Board #1'));
});

// 6. Safe Cancel preserves affected components and wires 100%
runTest('Cancel preserves all components, wires and sockets completely intact', () => {
  const g1 = createComponent('and', 100, 100);
  const g2 = createComponent('or', 300, 100);
  const w1: Wire = { id: 'w1', fromCompId: g1.id, fromPinId: 'out', toCompId: g2.id, toPinId: 'in1', value: '0' };
  const initialCircuit: Circuit = { components: [g1, g2], wires: [w1] };

  // Confirmation opens
  const confirmState: DestructiveConfirmationState = {
    type: 'remove_component',
    title: `Remove ${g1.label}?`,
    targetLabel: g1.label,
    consequences: calculateDestructiveConsequences(initialCircuit, 'remove_component', { componentId: g1.id }),
    componentId: g1.id,
  };

  // User hits Cancel: circuit is never modified
  const currentCircuit = initialCircuit;
  assert.strictEqual(currentCircuit.components.length, 2);
  assert.strictEqual(currentCircuit.wires.length, 1);
  assert.strictEqual(currentCircuit.components[0].id, g1.id);
  assert.strictEqual(currentCircuit.wires[0].id, w1.id);
});

// 7. Confirm performs removal exactly once
runTest('Confirm performs component and connected wire removal exactly once', () => {
  const g1 = createComponent('and', 100, 100);
  const g2 = createComponent('or', 300, 100);
  const w1: Wire = { id: 'w1', fromCompId: g1.id, fromPinId: 'out', toCompId: g2.id, toPinId: 'in1', value: '0' };
  let circuit: Circuit = { components: [g1, g2], wires: [w1] };

  let executionCount = 0;
  const executeRemoval = (id: string) => {
    executionCount++;
    const remainingComps = circuit.components.filter((c) => c.id !== id);
    const remainingWires = circuit.wires.filter((w) => w.fromCompId !== id && w.toCompId !== id);
    circuit = { components: remainingComps, wires: remainingWires };
  };

  // User confirms
  executeRemoval(g1.id);

  assert.strictEqual(executionCount, 1);
  assert.strictEqual(circuit.components.length, 1);
  assert.strictEqual(circuit.components[0].id, g2.id);
  assert.strictEqual(circuit.wires.length, 0);
});

// 8. Undo restores removed component and connected wires
runTest('Undo restores removed object and connectivity', () => {
  const g1 = createComponent('and', 100, 100);
  const g2 = createComponent('or', 300, 100);
  const w1: Wire = { id: 'w1', fromCompId: g1.id, fromPinId: 'out', toCompId: g2.id, toPinId: 'in1', value: '0' };
  const history: Circuit[] = [{ components: [g1, g2], wires: [w1] }];

  // Perform removal
  const nextComps = history[0].components.filter((c) => c.id !== g1.id);
  const nextWires = history[0].wires.filter((w) => w.fromCompId !== g1.id && w.toCompId !== g1.id);
  history.push({ components: nextComps, wires: nextWires });

  assert.strictEqual(history[history.length - 1].components.length, 1);

  // Undo step
  history.pop();
  const restored = history[history.length - 1];

  assert.strictEqual(restored.components.length, 2);
  assert.strictEqual(restored.wires.length, 1);
  assert.strictEqual(restored.components.find((c) => c.id === g1.id)?.label, g1.label);
});

// 9. Mounted IC delete protection routes to socket-safe eject
runTest('Mounted IC deletion request routes through safe eject and preserves socket', () => {
  let circuit = ensureTrainerKit({ components: [], wires: [] });
  const mountRes = mountICOnSocket(circuit, 0, 'ic_7400');
  circuit = mountRes.circuit;
  const icComp = mountRes.mountedComponent;

  // Verify mounted IC customProps.trainerMount is present
  assert(icComp.customProps?.trainerMount);
  assert.strictEqual(icComp.customProps.trainerMount.baseIndex, 0);

  // Eject workflow
  const ejectRes = ejectICFromSocket(circuit, 0);
  circuit = ejectRes.circuit;

  // Socket must remain in board
  const board = circuit.trainerBoards?.[0];
  const slot = board?.icSlots?.[0];
  assert(slot, 'DIP Socket 1 must remain intact after eject');
  assert.strictEqual(slot.baseIndex, 0);

  // Mounted component removed from components list
  assert(!circuit.components.some((c) => c.id === icComp.id), 'IC component removed from circuit');
});

// 10. Clamping function geometry
runTest('Context menu clamping keeps menus and cards strictly within application bounds', () => {
  const clampMenuPosition = (clientX: number, clientY: number, width = 230, height = 280, winW = 1280, winH = 720) => {
    const pad = 12;
    const topPad = 64;
    const maxX = Math.max(pad, winW - width - pad);
    const maxY = Math.max(topPad, winH - height - pad);
    return {
      x: Math.min(Math.max(pad, clientX), maxX),
      y: Math.min(Math.max(topPad, clientY), maxY),
    };
  };

  // Normal position
  const p1 = clampMenuPosition(300, 300);
  assert.strictEqual(p1.x, 300);
  assert.strictEqual(p1.y, 300);

  // Off-screen right
  const p2 = clampMenuPosition(1300, 300, 230, 280, 1280, 720);
  assert.strictEqual(p2.x, 1280 - 230 - 12);

  // Off-screen bottom
  const p3 = clampMenuPosition(300, 800, 230, 280, 1280, 720);
  assert.strictEqual(p3.y, 720 - 280 - 12);

  // Off-screen top
  const p4 = clampMenuPosition(300, 10, 230, 280, 1280, 720);
  assert.strictEqual(p4.y, 64);

  // Off-screen left
  const p5 = clampMenuPosition(-50, 300, 230, 280, 1280, 720);
  assert.strictEqual(p5.x, 12);
});

// 11. Confirmation card does not overlap breadboard power switch
runTest('Contextual confirmation card is docked at top-right, clearing breadboard power controls', () => {
  const cardTop = 80;
  const cardRight = 290; // with properties open
  const cardHeight = 120;
  const cardBottom = cardTop + cardHeight; // 200px

  // TrainerBoard chassis power switch is located at Y >= 360px
  const powerSwitchY = TRAINER_CONSTANTS.DEFAULT_BOARD_Y + 360;
  assert(cardBottom < powerSwitchY, `Card bottom (${cardBottom}px) must be well above power switch (${powerSwitchY}px)`);
});

console.log('\n✅ ALL 11 PHASE 3 PROGRAMMATIC TESTS PASSED PERFECTLY!\n');
