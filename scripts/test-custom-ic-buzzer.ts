import { simulateCircuit, createComponent } from '../src/engine/simulator';
import type { Circuit, CustomICDefinition } from '../src/types/circuit';

console.log('--- RUNNING CUSTOM IC & BUZZER VERIFICATION ---');

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

// 1. Test Buzzer Behavior
console.log('\n--- 1. Testing Buzzer Settled Simulation ---');
{
  const toggle = createComponent('toggle', 50, 50);
  const buzzer = createComponent('buzzer', 200, 50);
  const wire = {
    id: 'w_test',
    fromCompId: toggle.id,
    fromPinId: 'out',
    toCompId: buzzer.id,
    toPinId: 'in',
    value: '0' as const,
  };

  // Turn toggle ON (value = 1)
  toggle.state = { toggleState: true };
  toggle.outputs[0].value = '1';

  let res = simulateCircuit({ components: [toggle, buzzer], wires: [wire] });
  assert(res.buzzerActive === true, 'Buzzer is active when connected input is 1');

  // Turn toggle OFF (value = 0)
  toggle.state = { toggleState: false };
  toggle.outputs[0].value = '0';

  res = simulateCircuit({ components: [toggle, buzzer], wires: [wire] });
  assert(res.buzzerActive === false, 'Buzzer is immediately inactive when input is lowered to 0');
}

// 2. Test Buzzer with Logic Gate in Between
console.log('\n--- 2. Testing Buzzer Through AND Gate ---');
{
  const inA = createComponent('toggle', 50, 20);
  const inB = createComponent('toggle', 50, 80);
  const andGate = createComponent('and', 150, 50);
  const buzzer = createComponent('buzzer', 280, 50);

  const wA = { id: 'w1', fromCompId: inA.id, fromPinId: 'out', toCompId: andGate.id, toPinId: 'a', value: '0' as const };
  const wB = { id: 'w2', fromCompId: inB.id, fromPinId: 'out', toCompId: andGate.id, toPinId: 'b', value: '0' as const };
  const wOut = { id: 'w3', fromCompId: andGate.id, fromPinId: 'out', toCompId: buzzer.id, toPinId: 'in', value: '0' as const };

  const circuit: Circuit = {
    components: [inA, inB, andGate, buzzer],
    wires: [wA, wB, wOut],
  };

  // Both HIGH
  inA.state = { toggleState: true };
  inA.outputs[0].value = '1';
  inB.state = { toggleState: true };
  inB.outputs[0].value = '1';

  let res = simulateCircuit(circuit);
  assert(res.buzzerActive === true, 'AND gate (1,1) triggers buzzerActive = true');

  // Lower one input to 0
  inA.state = { toggleState: false };
  inA.outputs[0].value = '0';

  res = simulateCircuit({ ...circuit, components: [inA, inB, andGate, buzzer] });
  assert(res.buzzerActive === false, 'Lowering input A to 0 turns buzzerActive = false');

  // Also verify with 7408 IC (with VCC connected to 5V rail)
  const vcc = createComponent('vcc', 50, 150);
  const ic7408 = createComponent('ic_7408', 150, 100);
  const wVcc = { id: 'wvcc', fromCompId: vcc.id, fromPinId: 'out', toCompId: ic7408.id, toPinId: '14', value: '1' as const };
  const wPin1 = { id: 'wic1', fromCompId: inA.id, fromPinId: 'out', toCompId: ic7408.id, toPinId: '1', value: '0' as const };
  const wPin2 = { id: 'wic2', fromCompId: inB.id, fromPinId: 'out', toCompId: ic7408.id, toPinId: '2', value: '0' as const };
  const wPin3 = { id: 'wic3', fromCompId: ic7408.id, fromPinId: '3', toCompId: buzzer.id, toPinId: 'in', value: '0' as const };

  inA.state = { toggleState: true };
  inA.outputs[0].value = '1';
  inB.state = { toggleState: true };
  inB.outputs[0].value = '1';

  let resIC = simulateCircuit({ components: [vcc, inA, inB, ic7408, buzzer], wires: [wVcc, wPin1, wPin2, wPin3] });
  assert(resIC.buzzerActive === true, '7408 DIP IC (1,1 with VCC) drives pin 3 HIGH -> buzzerActive = true');

  inA.state = { toggleState: false };
  inA.outputs[0].value = '0';
  resIC = simulateCircuit({ components: [vcc, inA, inB, ic7408, buzzer], wires: [wVcc, wPin1, wPin2, wPin3] });
  assert(resIC.buzzerActive === false, '7408 DIP IC lowering input A -> pin 3 LOW -> buzzerActive = false');
}

// 3. Test 20-Pin Custom IC Generation & Packaging
console.log('\n--- 3. Testing 20-Pin Custom IC Packaging ---');
{
  const customIC: CustomICDefinition = {
    id: 'test_custom_20',
    userId: 'guest',
    name: '20-Pin ALU Custom',
    code: '74ALU20',
    partNumber: '74ALU20',
    description: 'Custom 20-pin DIP IC with pins up to 20',
    pinCount: 20,
    pins: Array.from({ length: 20 }, (_, i) => ({
      pin: i + 1,
      pinNumber: i + 1,
      name: i === 19 ? 'VCC' : i === 9 ? 'GND' : `P${i + 1}`,
      type: i === 19 || i === 9 ? 'power' : i % 2 === 0 ? 'output' : 'input',
    })),
    internalCircuit: { components: [], wires: [] },
    circuit: { components: [], wires: [] },
  };

  assert(customIC.pins.length === 20, 'Custom IC definition has all 20 pins');
  assert(customIC.pins[19].name === 'VCC' && customIC.pins[19].pin === 20, 'Pin 20 is VCC');
  assert(customIC.pins[14].pin === 15, 'Pin 15 is accessible and mapped');
  assert(customIC.pins[18].pin === 19, 'Pin 19 is accessible and mapped');

  const comp = createComponent('custom_ic', 100, 100, '74ALU20', { customIC });
  assert(comp.inputs.length + comp.outputs.length === 20, 'Custom IC component instantiated with all 20 DIP pins');
}

console.log('\n✨ ALL TESTS PASSED SUCCESSFULLY! ✨\n');
