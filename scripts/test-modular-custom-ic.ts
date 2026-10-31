import { createComponent, simulateCircuit } from '../src/engine/simulator';
import type { Circuit, CustomICDefinition, Wire } from '../src/types/circuit';

console.log('--- TEST: Modular Logic-Unit Custom IC Simulation ---');

// Define a multi-gate modular IC:
// Gate 1: 2-input AND on pins 1, 2 -> pin 3
// Gate 2: 2-input OR on pins 4, 5 -> pin 6
// Gate 3: 6-input AND on pins 7, 8, 9, 10, 11, 12 -> pin 13
// Gate 4: Inverter NOT on pin 14 -> pin 15
// VCC on pin 20, GND on pin 10
const testModularIC: CustomICDefinition = {
  id: 'ic_test_modular_74multi',
  userId: 'test_user',
  name: 'Multi-Function Lab IC',
  partNumber: '74MULTI-LAB',
  description: 'Custom multi-gate modular IC with 2-in AND, 2-in OR, 6-in AND, and Inverter',
  pinCount: 20,
  packageType: 'DIP20',
  vccPin: 20,
  gndPin: 10,
  gateUnits: [
    {
      id: 'unit_and2',
      name: '2-Input AND Gate (Pins 1,2 -> 3)',
      gateType: 'and',
      inputPins: [1, 2],
      outputPins: [3],
    },
    {
      id: 'unit_or2',
      name: '2-Input OR Gate (Pins 4,5 -> 6)',
      gateType: 'or',
      inputPins: [4, 5],
      outputPins: [6],
    },
    {
      id: 'unit_and6',
      name: '6-Input AND Gate (Pins 7,8,9,11,12,13 -> 14)',
      gateType: 'and6',
      inputPins: [7, 8, 9, 11, 12, 13],
      outputPins: [14],
    },
    {
      id: 'unit_not1',
      name: 'Inverter (Pin 15 -> 16)',
      gateType: 'not',
      inputPins: [15],
      outputPins: [16],
    },
  ],
  pins: [
    { pinNumber: 1, name: '1A', type: 'input', internalNet: 'unit_and2_in_0' },
    { pinNumber: 2, name: '1B', type: 'input', internalNet: 'unit_and2_in_1' },
    { pinNumber: 3, name: '1Y', type: 'output', internalNet: 'unit_and2_out_0' },
    { pinNumber: 4, name: '2A', type: 'input', internalNet: 'unit_or2_in_0' },
    { pinNumber: 5, name: '2B', type: 'input', internalNet: 'unit_or2_in_1' },
    { pinNumber: 6, name: '2Y', type: 'output', internalNet: 'unit_or2_out_0' },
    { pinNumber: 7, name: '3A', type: 'input', internalNet: 'unit_and6_in_0' },
    { pinNumber: 8, name: '3B', type: 'input', internalNet: 'unit_and6_in_1' },
    { pinNumber: 9, name: '3C', type: 'input', internalNet: 'unit_and6_in_2' },
    { pinNumber: 10, name: 'GND', type: 'power', internalNet: 'GND' },
    { pinNumber: 11, name: '3D', type: 'input', internalNet: 'unit_and6_in_3' },
    { pinNumber: 12, name: '3E', type: 'input', internalNet: 'unit_and6_in_4' },
    { pinNumber: 13, name: '3F', type: 'input', internalNet: 'unit_and6_in_5' },
    { pinNumber: 14, name: '3Y', type: 'output', internalNet: 'unit_and6_out_0' },
    { pinNumber: 15, name: '4A', type: 'input', internalNet: 'unit_not1_in_0' },
    { pinNumber: 16, name: '4Y', type: 'output', internalNet: 'unit_not1_out_0' },
    { pinNumber: 17, name: 'NC', type: 'nc' },
    { pinNumber: 18, name: 'NC', type: 'nc' },
    { pinNumber: 19, name: 'NC', type: 'nc' },
    { pinNumber: 20, name: 'VCC', type: 'power', internalNet: 'VCC' },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// 1. Create IC component
const customICComp = createComponent('custom_ic', 200, 200, '74MULTI-LAB', {
  customIC: testModularIC,
});

// 2. Create switches to feed inputs and probes to observe outputs
const swA = createComponent('toggle', 50, 100, 'Switch A'); // will connect to Pin 1 (1A)
const swB = createComponent('toggle', 50, 140, 'Switch B'); // will connect to Pin 2 (1B)
const lamp1 = createComponent('probe', 400, 120, 'Probe 1Y'); // will connect to Pin 3 (1Y)

const swOrA = createComponent('toggle', 50, 180, 'Switch OR A'); // will connect to Pin 4 (2A)
const swOrB = createComponent('toggle', 50, 220, 'Switch OR B'); // will connect to Pin 5 (2B)
const lamp2 = createComponent('probe', 400, 200, 'Probe 2Y'); // will connect to Pin 6 (2Y)

const swNot = createComponent('toggle', 50, 260, 'Switch NOT'); // will connect to Pin 15 (4A)
const lampNot = createComponent('probe', 400, 280, 'Probe 4Y'); // will connect to Pin 16 (4Y)

// Connect Wires
const wires: Wire[] = [
  { id: 'w1', fromCompId: swA.id, fromPinId: 'out', toCompId: customICComp.id, toPinId: 'pin1', value: '0' },
  { id: 'w2', fromCompId: swB.id, fromPinId: 'out', toCompId: customICComp.id, toPinId: 'pin2', value: '0' },
  { id: 'w3', fromCompId: customICComp.id, fromPinId: 'pin3', toCompId: lamp1.id, toPinId: 'in', value: '0' },

  { id: 'w4', fromCompId: swOrA.id, fromPinId: 'out', toCompId: customICComp.id, toPinId: 'pin4', value: '0' },
  { id: 'w5', fromCompId: swOrB.id, fromPinId: 'out', toCompId: customICComp.id, toPinId: 'pin5', value: '0' },
  { id: 'w6', fromCompId: customICComp.id, fromPinId: 'pin6', toCompId: lamp2.id, toPinId: 'in', value: '0' },

  { id: 'w7', fromCompId: swNot.id, fromPinId: 'out', toCompId: customICComp.id, toPinId: 'pin15', value: '0' },
  { id: 'w8', fromCompId: customICComp.id, fromPinId: 'pin16', toCompId: lampNot.id, toPinId: 'in', value: '0' },
];

let initialCircuit: Circuit = {
  components: [customICComp, swA, swB, lamp1, swOrA, swOrB, lamp2, swNot, lampNot],
  wires,
};

// TEST CASE 1: All inputs LOW
console.log('\n--- TEST CASE 1: Default LOW inputs ---');
let res = simulateCircuit(initialCircuit);
const simulatedIC = res.circuit.components.find((c) => c.id === customICComp.id);
console.log('simulatedIC outputs:', simulatedIC?.outputs.map(p => ({ id: p.id, name: p.name, val: p.value })));
console.log('simulatedIC pinValues:', simulatedIC?.state?.pinValues);
let icState = simulatedIC?.state;
console.log('Pin 3 (AND 1,2 output):', icState?.pinValues?.['pin3'], '(Expected: 0)');
console.log('Pin 6 (OR 4,5 output):', icState?.pinValues?.['pin6'], '(Expected: 0)');
console.log('Pin 16 (NOT 15 output):', icState?.pinValues?.['pin16'], '(Expected: 1)');

if (icState?.pinValues?.['pin3'] !== '0' || icState?.pinValues?.['pin6'] !== '0' || icState?.pinValues?.['pin16'] !== '1') {
  console.error('FAILED Test Case 1');
  process.exit(1);
}

// TEST CASE 2: Turn Switch A = 1, Switch B = 1 (AND gate output should become 1)
console.log('\n--- TEST CASE 2: Turn Switch A=1, Switch B=1 ---');
initialCircuit.components = initialCircuit.components.map((c) => {
  if (c.id === swA.id || c.id === swB.id) {
    return { ...c, state: { ...c.state, toggleState: true } };
  }
  return c;
});
res = simulateCircuit(initialCircuit);
icState = res.circuit.components.find((c) => c.id === customICComp.id)?.state;
console.log('Pin 3 (AND 1,2 output when both HIGH):', icState?.pinValues?.['pin3'], '(Expected: 1)');

if (icState?.pinValues?.['pin3'] !== '1') {
  console.error('FAILED Test Case 2');
  process.exit(1);
}

// TEST CASE 3: Turn Switch OR A = 1, Switch OR B = 0 (OR gate output should become 1)
console.log('\n--- TEST CASE 3: Turn Switch OR A=1 ---');
initialCircuit.components = initialCircuit.components.map((c) => {
  if (c.id === swOrA.id) {
    return { ...c, state: { ...c.state, toggleState: true } };
  }
  return c;
});
res = simulateCircuit(initialCircuit);
icState = res.circuit.components.find((c) => c.id === customICComp.id)?.state;
console.log('Pin 6 (OR 4,5 output when one HIGH):', icState?.pinValues?.['pin6'], '(Expected: 1)');

if (icState?.pinValues?.['pin6'] !== '1') {
  console.error('FAILED Test Case 3');
  process.exit(1);
}

// TEST CASE 4: Turn Switch NOT = 1 (Inverter output should become 0)
console.log('\n--- TEST CASE 4: Turn Switch NOT=1 ---');
initialCircuit.components = initialCircuit.components.map((c) => {
  if (c.id === swNot.id) {
    return { ...c, state: { ...c.state, toggleState: true } };
  }
  return c;
});
res = simulateCircuit(initialCircuit);
icState = res.circuit.components.find((c) => c.id === customICComp.id)?.state;
console.log('Pin 16 (NOT 15 output when input is 1):', icState?.pinValues?.['pin16'], '(Expected: 0)');

if (icState?.pinValues?.['pin16'] !== '0') {
  console.error('FAILED Test Case 4');
  process.exit(1);
}

console.log('\n🎉 ALL MODULAR LOGIC-UNIT CUSTOM IC TESTS PASSED SUCCESSFULLY!');
