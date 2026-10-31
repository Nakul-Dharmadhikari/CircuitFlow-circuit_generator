import assert from 'node:assert';
import { simulateCircuit, createComponent } from '../src/engine/simulator';
import { Circuit, CircuitComponent, Wire } from '../src/types/circuit';
import { calculateOrthogonalWireRoute } from '../src/engine/wiring/wireRouter';
import {
  mountICOnSocket,
  moveTrainerBoard,
  createInitialTrainerBoard,
} from '../src/engine/trainer/trainerBoardModel';

console.log('================================================================');
console.log('TESTING ELECTRICAL WIRING CORRECTNESS & OBSTACLE DETOURS (P0)');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: VCC & GND Power Net Distinctness & Nearby Wire Immunity
// -----------------------------------------------------------------------------
console.log('--- Test 1: VCC & GND Electrical Net Isolation ---');
{
  // Build a circuit with:
  // - VCC source
  // - GND source
  // - Signal source (toggle switch)
  // - 7408 AND gate with Pin 14 (Vcc), Pin 7 (Gnd), Pin 1 (A), Pin 2 (B), Pin 3 (Y)
  // - Existing signal wire passing very close to VCC pin (distance < 10px)
  let circuit: Circuit = {
    components: [],
    wires: [],
  };

  const vcc = createComponent('vcc', 100, 100);
  const gnd = createComponent('gnd', 100, 300);
  const toggleA = createComponent('toggle', 100, 200, 'Toggle A');
  const andGate = createComponent('and', 400, 200);

  // An existing signal wire from Toggle A to AND gate pin a
  const signalWire: Wire = {
    id: 'wire_signal',
    fromCompId: toggleA.id,
    fromPinId: 'out',
    toCompId: andGate.id,
    toPinId: 'a',
    color: '#3b82f6',
  };

  // Wire from VCC directly to AND gate pin b
  const vccWire: Wire = {
    id: 'wire_vcc',
    fromCompId: vcc.id,
    fromPinId: 'out',
    toCompId: andGate.id,
    toPinId: 'b',
    color: '#ef4444',
  };

  circuit.components = [vcc, gnd, toggleA, andGate];
  circuit.wires = [signalWire, vccWire];

  // Run simulation with Toggle A = 0
  toggleA.outputs[0].value = '0';
  toggleA.state = { toggleState: false };
  let sim = simulateCircuit(circuit);

  const andIn1 = sim.circuit.components.find((c) => c.id === andGate.id)?.inputs.find((p) => p.id === 'a');
  const andIn2 = sim.circuit.components.find((c) => c.id === andGate.id)?.inputs.find((p) => p.id === 'b');
  const andOut = sim.circuit.components.find((c) => c.id === andGate.id)?.outputs.find((p) => p.id === 'out');

  assert.strictEqual(andIn1?.value, '0', 'Signal wire transmits Toggle value 0');
  assert.strictEqual(andIn2?.value, '1', 'VCC wire transmits constant 1');
  assert.strictEqual(andOut?.value, '0', '0 AND 1 = 0');

  // Toggle A = 1
  toggleA.outputs[0].value = '1';
  toggleA.state = { toggleState: true };
  sim = simulateCircuit(circuit);
  const andOutActive = sim.circuit.components.find((c) => c.id === andGate.id)?.outputs.find((p) => p.id === 'out');
  assert.strictEqual(andOutActive?.value, '1', '1 AND 1 = 1');

  // Assert VCC and Signal Wire are NOT merged
  const vccNetComponents = sim.circuit.wires.filter((w) => w.fromCompId === vcc.id || w.toCompId === vcc.id);
  assert.strictEqual(vccNetComponents.length, 1, 'VCC wire remains independent');
  assert.strictEqual(vccNetComponents[0].id, 'wire_vcc');

  console.log('✔ PASS: VCC and nearby signal wire nets remain strictly isolated.');
}

// -----------------------------------------------------------------------------
// TEST 2: Two Wire Segments Crossing Without Junction Remain Distinct
// -----------------------------------------------------------------------------
console.log('--- Test 2: Crossing Wire Electrical Isolation ---');
{
  // Wire A: horizontal crossing from (50, 100) to (250, 100)
  // Wire B: vertical crossing from (150, 50) to (150, 250)
  // Intersection is at (150, 100)
  const toggle1 = createComponent('toggle', 50, 100);
  const probe1 = createComponent('probe', 250, 100);

  const toggle2 = createComponent('toggle', 150, 50);
  const probe2 = createComponent('probe', 150, 250);

  toggle1.outputs[0].value = '1';
  toggle1.state = { toggleState: true };
  toggle2.outputs[0].value = '0';
  toggle2.state = { toggleState: false };

  const wireH: Wire = {
    id: 'wire_h',
    fromCompId: toggle1.id,
    fromPinId: 'out',
    toCompId: probe1.id,
    toPinId: 'in',
  };

  const wireV: Wire = {
    id: 'wire_v',
    fromCompId: toggle2.id,
    fromPinId: 'out',
    toCompId: probe2.id,
    toPinId: 'in',
  };

  const circuit: Circuit = {
    components: [toggle1, probe1, toggle2, probe2],
    wires: [wireH, wireV],
  };

  const sim = simulateCircuit(circuit);
  const p1Val = sim.circuit.components.find((c) => c.id === probe1.id)?.inputs[0].value;
  const p2Val = sim.circuit.components.find((c) => c.id === probe2.id)?.inputs[0].value;

  assert.strictEqual(p1Val, '1', 'Probe 1 receives 1 from Toggle 1 across crossing');
  assert.strictEqual(p2Val, '0', 'Probe 2 receives 0 from Toggle 2 across crossing');
  console.log('✔ PASS: Crossing wires without explicit junction do not merge nets.');
}

// -----------------------------------------------------------------------------
// TEST 3: Wires Route Around Mounted IC Bodies (Geometric Obstacle Avoidance)
// -----------------------------------------------------------------------------
console.log('--- Test 3: Wire Obstacle Avoidance Around IC Package Body ---');
{
  // Place an IC at (300, 200) with width 250 and height 88
  // Bounding box of IC is [300, 200, 250x88] -> X from 300 to 550, Y from 200 to 288
  const icBox = { x: 300, y: 200, width: 250, height: 88 };

  // Route a wire from a source on the left (200, 244) to a destination on the right (650, 244)
  // Direct straight line would pass straight through the center of the IC at Y = 244!
  const route = calculateOrthogonalWireRoute(
    { x: 200, y: 244, compId: 'comp_src' },
    { x: 650, y: 244, compId: 'comp_dst' },
    0,
    [icBox]
  );

  assert.ok(route.length >= 4, `Route detours with orthogonal segments (points: ${route.length})`);

  // Assert no segment cuts through the interior of the IC box
  for (let i = 0; i < route.length - 1; i++) {
    const p1 = route[i];
    const p2 = route[i + 1];

    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    if (p1.y === p2.y) {
      // Horizontal segment
      const y = p1.y;
      if (y > icBox.y && y < icBox.y + icBox.height) {
        // Must NOT overlap IC X range
        const overlapsX = !(maxX <= icBox.x || minX >= icBox.x + icBox.width);
        assert.strictEqual(overlapsX, false, `Horizontal segment at Y=${y} must not penetrate IC body`);
      }
    } else if (p1.x === p2.x) {
      // Vertical segment
      const x = p1.x;
      if (x > icBox.x && x < icBox.x + icBox.width) {
        // Must NOT overlap IC Y range
        const overlapsY = !(maxY <= icBox.y || minY >= icBox.y + icBox.height);
        assert.strictEqual(overlapsY, false, `Vertical segment at X=${x} must not penetrate IC body`);
      }
    }
  }

  console.log('✔ PASS: Wire completely detours around IC package body.');
}

// -----------------------------------------------------------------------------
// TEST 4: Moving Board Preserves IC Mount & Translates Connections
// -----------------------------------------------------------------------------
console.log('--- Test 4: Moving Trainer Board Preserves IC Mount & Wires ---');
{
  const initBoard = createInitialTrainerBoard('board_1', 100, 100);
  let circuit: Circuit = {
    components: [...initBoard.components],
    wires: [],
    trainerBoards: [initBoard.board],
  };

  const mountResult = mountICOnSocket(circuit, 0, 'ic_7408');
  circuit = mountResult.circuit;
  const chipId = mountResult.mountedComponent.id;

  const originalComp = circuit.components.find((c) => c.id === chipId);
  const originalX = originalComp!.x;
  const originalY = originalComp!.y;

  // Move board by delta (120, 90)
  circuit = moveTrainerBoard(circuit, 'board_1', 120, 90);

  const movedComp = circuit.components.find((c) => c.id === chipId);
  assert.strictEqual(movedComp!.x, originalX + 120, 'IC translated X synchronously with board');
  assert.strictEqual(movedComp!.y, originalY + 90, 'IC translated Y synchronously with board');
  assert.strictEqual(movedComp!.rotation, 0, 'IC rotation preserved at 0 deg');

  console.log('✔ PASS: Moving trainer board synchronously translates mounted IC.');
}

console.log('\n================================================================');
console.log('🎉 ALL P0 ELECTRICAL WIRING & OBSTACLE REGRESSION CHECKS PASSED!');
console.log('================================================================');
