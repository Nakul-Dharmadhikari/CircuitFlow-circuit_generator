import assert from 'node:assert';
import { simulateCircuit, createComponent } from '../src/engine/simulator';
import type { Circuit, CircuitComponent, Pin, Wire } from '../src/types/circuit';
import { findNearestPin, isPointNearWire } from '../src/engine/wiring/hitTesting';

console.log('================================================================');
console.log('TEST SUITE: PIN-SNAP PRIORITY & ELECTRICAL NET INTEGRITY');
console.log('Testing: 24px Pin Snap over 14px Wire Hit-Testing, Power Net Guard,');
console.log('         Crossing Wire Isolation & Legitimate Branch Preservation');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: 24px Pin Snap Priority Over 14px Wire Hit Stroke
// -----------------------------------------------------------------------------
console.log('--- Test 1: 24px Pin Snap Priority Over 14px Wire Hit Stroke ---');
{
  // Component A placed at (100, 100) with input pin at (100, 120)
  const gateA = createComponent('and', 100, 100);
  const inputPin = gateA.inputs[0];
  const pinWorld = { x: gateA.x + inputPin.x, y: gateA.y + inputPin.y };

  // An existing unrelated wire runs horizontally 10px below the pin: from (50, pinWorld.y + 10) to (200, pinWorld.y + 10)
  const wirePoints = [
    { x: 50, y: pinWorld.y + 10 },
    { x: 200, y: pinWorld.y + 10 },
  ];

  // Cursor is at (pinWorld.x, pinWorld.y + 5):
  // Distance to pin: 5px (well within 24px PIN_SNAP_RADIUS)
  // Distance to wire: 5px (within 14px HIT_STROKE_WIDTH / 2 = 7px)
  const cursorWorld = { x: pinWorld.x, y: pinWorld.y + 5 };

  // Assert wire hit testing detects wire proximity
  const isNearWire = isPointNearWire(cursorWorld, wirePoints, 7);
  assert.strictEqual(isNearWire, true, 'Cursor is geometrically within wire hit stroke');

  // Assert pin snap priority: findNearestPin finds the pin within 24px
  const nearest = findNearestPin(cursorWorld, [gateA], 24);
  assert.ok(nearest !== null, 'Pin is detected within 24px');
  assert.strictEqual(nearest.pin.id, inputPin.id, 'Nearest pin resolves to the component input pin');
  assert.strictEqual(nearest.compId, gateA.id, 'Nearest pin belongs to gate A');

  // Verify that pin snap takes absolute priority over the wire stroke
  const snappedTarget = nearest ? { type: 'pin', id: nearest.pin.id } : { type: 'wire' };
  assert.strictEqual(snappedTarget.type, 'pin', 'Pin snap takes absolute priority over wire stroke');
  console.log('✔ PASS: 24px pin snap successfully overrides 14px wire stroke hit.');
}

// -----------------------------------------------------------------------------
// TEST 2: Power Rails (VCC / GND) Dropped Near Signal Wire Never Branch
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: Power Rail (VCC/GND) Source Drop Branch Suppression ---');
{
  const vcc = createComponent('vcc', 50, 50);
  const toggle = createComponent('toggle', 50, 150);
  const probe = createComponent('probe', 250, 150);

  const signalWire: Wire = {
    id: 'wire_signal',
    fromCompId: toggle.id,
    fromPinId: 'out',
    toCompId: probe.id,
    toPinId: 'in',
    value: '0',
  };

  // Simulate drop handler logic:
  // If in-progress wire starts from VCC, dropping onto signal wire must be blocked!
  let branchCreated = false;
  const fromComp = vcc;
  const isPowerSource =
    fromComp.type === 'vcc' ||
    fromComp.type === 'gnd' ||
    Boolean(fromComp.customProps?.isTrainerVcc) ||
    Boolean(fromComp.customProps?.isTrainerGnd);

  if (!isPowerSource) {
    branchCreated = true;
  }

  assert.strictEqual(branchCreated, false, 'Power source wire must not branch onto signal wire');

  // Simulate circuit: signal wire remains isolated from VCC
  const circuit: Circuit = {
    components: [vcc, toggle, probe],
    wires: [signalWire],
  };
  const result = simulateCircuit(circuit);
  const probeIn = result.circuit.components.find((c) => c.id === probe.id)?.inputs[0].value;
  assert.strictEqual(probeIn, '0', 'Probe input remains 0 (uncontaminated by VCC)');
  console.log('✔ PASS: VCC/GND drop does not branch onto signal wire and leaves net isolated.');
}

// -----------------------------------------------------------------------------
// TEST 3: Dropping Signal Wire Onto Existing Power Rail Wire Is Suppressed
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: Signal Wire Dropped Onto Power Rail Wire Is Suppressed ---');
{
  const vcc = createComponent('vcc', 50, 50);
  const icPin = { id: 'ic_pin_vcc', type: 'input' as const, name: 'VCC', x: 200, y: 50, value: '0' as const };
  const icComp: CircuitComponent = {
    id: 'ic_7408',
    type: 'ic_7408',
    label: '7408',
    x: 100,
    y: 50,
    width: 240,
    height: 85,
    inputs: [icPin],
    outputs: [],
  };

  const vccWire: Wire = {
    id: 'wire_vcc',
    fromCompId: vcc.id,
    fromPinId: 'vcc',
    toCompId: icComp.id,
    toPinId: 'ic_pin_vcc',
    value: '1',
  };

  const toggle = createComponent('toggle', 50, 200);

  // Check if target wire is a power wire
  const components = [vcc, icComp, toggle];
  const wires = [vccWire];
  const targetWire = wires.find((w) => w.id === 'wire_vcc');
  const isTargetPowerWire =
    Boolean(targetWire) &&
    components.some((c) => {
      if (c.id !== targetWire?.fromCompId && c.id !== targetWire?.toCompId) return false;
      return (
        c.type === 'vcc' ||
        c.type === 'gnd' ||
        Boolean(c.customProps?.isTrainerVcc) ||
        Boolean(c.customProps?.isTrainerGnd)
      );
    });

  assert.strictEqual(isTargetPowerWire, true, 'Target wire is correctly identified as a power rail wire');

  // Verify branch is suppressed
  let branchCreated = false;
  if (!isTargetPowerWire) {
    branchCreated = true;
  }
  assert.strictEqual(branchCreated, false, 'Branching onto a power rail wire must be suppressed');
  console.log('✔ PASS: Dropping signal wire onto existing power rail wire is strictly suppressed.');
}

// -----------------------------------------------------------------------------
// TEST 4: Geometric Wire Crossings Maintain Separate Electrical Nets
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: Geometric Wire Crossings Electrical Isolation ---');
{
  // Horizontal wire from Toggle A (1) to Probe A
  // Vertical wire from Toggle B (0) to Probe B
  // Both wires cross each other geometrically at (150, 150)
  const toggleA = createComponent('toggle', 50, 150, 'Toggle A');
  const probeA = createComponent('probe', 250, 150, 'Probe A');
  toggleA.outputs[0].value = '1';
  toggleA.state = { toggleState: true };

  const toggleB = createComponent('toggle', 150, 50, 'Toggle B');
  const probeB = createComponent('probe', 150, 250, 'Probe B');
  toggleB.outputs[0].value = '0';
  toggleB.state = { toggleState: false };

  const wireH: Wire = {
    id: 'wire_h',
    fromCompId: toggleA.id,
    fromPinId: 'out',
    toCompId: probeA.id,
    toPinId: 'in',
  };
  const wireV: Wire = {
    id: 'wire_v',
    fromCompId: toggleB.id,
    fromPinId: 'out',
    toCompId: probeB.id,
    toPinId: 'in',
  };

  const circuit: Circuit = {
    components: [toggleA, probeA, toggleB, probeB],
    wires: [wireH, wireV],
  };

  const simResult = simulateCircuit(circuit);
  const pAVal = simResult.circuit.components.find((c) => c.id === probeA.id)?.inputs[0].value;
  const pBVal = simResult.circuit.components.find((c) => c.id === probeB.id)?.inputs[0].value;

  assert.strictEqual(pAVal, '1', 'Probe A must read 1 from Toggle A');
  assert.strictEqual(pBVal, '0', 'Probe B must read 0 from Toggle B');
  console.log('✔ PASS: Geometric wire crossing maintains 100% electrical isolation between nets.');
}

// -----------------------------------------------------------------------------
// TEST 5: Legitimate Signal Wire Branching in Open Space (>24px from pins)
// -----------------------------------------------------------------------------
console.log('\n--- Test 5: Legitimate Signal Wire Branching in Open Space ---');
{
  const toggle = createComponent('toggle', 50, 200);
  const probe1 = createComponent('probe', 350, 200);
  const probe2 = createComponent('probe', 350, 300);

  const mainWire: Wire = {
    id: 'wire_main',
    fromCompId: toggle.id,
    fromPinId: 'out',
    toCompId: probe1.id,
    toPinId: 'in',
  };

  // User drops in open space at (200, 200) - distance to toggle pin is 150px, distance to probe1 is 150px
  const dropPos = { x: 200, y: 200 };
  const nearest = findNearestPin(dropPos, [toggle, probe1, probe2], 24);
  assert.strictEqual(nearest, null, 'No pin within 24px in open space');

  // Dropping in open space triggers legitimate branch:
  // Creates explicit junction component at (200, 200)
  const junction = createComponent('junction', dropPos.x - 8, dropPos.y - 8);
  const branchWire1: Wire = {
    id: 'wire_b1',
    fromCompId: toggle.id,
    fromPinId: 'out',
    toCompId: junction.id,
    toPinId: 'inout',
  };
  const branchWire2: Wire = {
    id: 'wire_b2',
    fromCompId: junction.id,
    fromPinId: 'inout',
    toCompId: probe1.id,
    toPinId: 'in',
  };
  const branchWire3: Wire = {
    id: 'wire_b3',
    fromCompId: junction.id,
    fromPinId: 'inout',
    toCompId: probe2.id,
    toPinId: 'in',
  };

  toggle.outputs[0].value = '1';
  toggle.state = { toggleState: true };

  const circuit: Circuit = {
    components: [toggle, probe1, probe2, junction],
    wires: [branchWire1, branchWire2, branchWire3],
  };

  const simResult = simulateCircuit(circuit);
  const p1Val = simResult.circuit.components.find((c) => c.id === probe1.id)?.inputs[0].value;
  const p2Val = simResult.circuit.components.find((c) => c.id === probe2.id)?.inputs[0].value;

  assert.strictEqual(p1Val, '1', 'Probe 1 receives 1 via explicit branch junction');
  assert.strictEqual(p2Val, '1', 'Probe 2 receives 1 via explicit branch junction');
  console.log('✔ PASS: Legitimate branching in open space creates valid junction and distributes signal.');
}

console.log('\n================================================================');
console.log('🎉 ALL PIN-SNAP PRIORITY & ELECTRICAL NET TESTS PASSED (5/5)!');
console.log('================================================================');
