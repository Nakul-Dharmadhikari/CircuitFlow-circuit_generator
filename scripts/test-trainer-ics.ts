import {
  evaluate74151,
  evaluate74138,
  evaluate7490,
  evaluate7483,
  evaluate74153,
  evaluate74139,
  evaluate7485,
  evaluate74194,
  evaluate7447,
} from '../src/engine/logicGates';
import { createComponent, simulateCircuit } from '../src/engine/simulator';
import { createTrainerKitComponents, ensureTrainerKit } from '../src/engine/trainerKit';
import type { Circuit, CustomICDefinition, Wire } from '../src/types/circuit';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`PASS: ${msg}`);
}

console.log('=== TEST 1: 74-Series DIP-20 IC Logic Gates ===');

// 1. 74151 8:1 MUX
const muxD: ['0', '1', '0', '0', '0', '0', '0', '0'] = ['0', '1', '0', '0', '0', '0', '0', '0']; // D1 is 1
const resMux1 = evaluate74151(muxD, ['1', '0', '0'], '0'); // Sel = 1 (binary S0=1, S1=0, S2=0)
assert(resMux1.y === '1' && resMux1.w === '0', '74151 selects D1=1 when S=1, active-low W=0');

const resMuxDisabled = evaluate74151(muxD, ['1', '0', '0'], '1'); // Gbar = 1 (disabled)
assert(resMuxDisabled.y === '0' && resMuxDisabled.w === '1', '74151 disabled (Gbar=1) forces Y=0, W=1');

// 2. 74138 3:8 DEMUX
const resDemux0 = evaluate74138('0', '0', '0', '1', '0', '0'); // Address 0, G1=1, G2A=0, G2B=0
assert(resDemux0.y0 === '0' && resDemux0.y1 === '1' && resDemux0.y7 === '1', '74138 decodes 0 to active-low Y0=0, others 1');

const resDemux5 = evaluate74138('1', '0', '1', '1', '0', '0'); // Address 5 (A=1, B=0, C=1)
assert(resDemux5.y5 === '0' && resDemux5.y4 === '1', '74138 decodes 5 to active-low Y5=0');

// 3. 7483 4-Bit Binary Adder
// 3 + 5 = 8
const resAdd8 = evaluate7483(['1', '1', '0', '0'], ['1', '0', '1', '0'], '0'); // A=3 (0011), B=5 (0101)
// 3 + 5 = 8 (1000 => S1=0, S2=0, S3=0, S4=1, C4=0)
assert(
  resAdd8.s1 === '0' && resAdd8.s2 === '0' && resAdd8.s3 === '0' && resAdd8.s4 === '1' && resAdd8.c4 === '0',
  '7483 adds 3 + 5 = 8 correctly'
);

// 4. 7490 Decade / BCD Counter
let ckaStep = evaluate7490('0', '1', '1', '1', '0', '0', '0', '0', 0); // Falling edge CKA
assert(ckaStep.count === 1 && ckaStep.qa === '1', '7490 counts 0 -> 1 on falling edge');

let resetStep = evaluate7490('0', '0', '0', '0', '1', '1', '0', '0', 5); // R0_1=1, R0_2=1
assert(resetStep.count === 0, '7490 resets to 0 when R0(1)=R0(2)=1');

// 5. 74153 Dual 4:1 MUX
const res153 = evaluate74153('1', '0', '0', ['0', '1', '0', '0'], '0', ['1', '0', '0', '0']); // Sel = 1 (S0=1, S1=0)
assert(res153.y1 === '1' && res153.y2 === '0', '74153 selects 1C1=1 and 2C1=0');

// 6. 74139 Dual 2:4 Decoder
const res139 = evaluate74139('1', '1', '0', '0', '0', '1'); // Section 1 sel=3 enabled, Section 2 disabled
assert(res139.y1_3 === '0' && res139.y1_0 === '1' && res139.y2_0 === '1', '74139 decodes 3 to active-low 1Y3=0 and disables section 2');

// 7. 7485 4-Bit Magnitude Comparator
const res85 = evaluate7485(['1', '0', '1', '0'], ['0', '1', '0', '0']); // A=5 (0101), B=2 (0010) => A > B
assert(res85.oAgtB === '1' && res85.oAltB === '0' && res85.oAeqB === '0', '7485 compares A=5 > B=2 correctly');

// 8. 74194 4-Bit Bidirectional Shift Register
const res194ShiftRight = evaluate74194('1', '0', '1', '1', '0', '1', '0', ['0', '0', '0', '0'], ['0', '1', '0', '0']);
assert(res194ShiftRight[0] === '1' && res194ShiftRight[1] === '0' && res194ShiftRight[2] === '1', '74194 shifts right with SR=1');

// 9. 7447 BCD to 7-Segment Decoder
const res47 = evaluate7447('1', '0', '0', '0'); // Digit 1 (A=1) -> segments b, c ON (active low 0)
assert(res47.b_bar === '0' && res47.c_bar === '0' && res47.a_bar === '1', '7447 decodes digit 1 to active-low b,c segments');

console.log('=== TEST 2: Circuit Component Creation for 74xx ICs & Modular Pins ===');
const ic7408 = createComponent('ic_7408', 100, 100);
assert(ic7408.label === '74LS08' && (ic7408.inputs.length + ic7408.outputs.length >= 14), '7408 formatted as DIP-20 IC');

const ic74153 = createComponent('ic_74153', 100, 100);
assert(ic74153.label === '74LS153', '74153 created successfully');

const inputPin = createComponent('input_pin', 50, 50);
assert(inputPin.type === 'input_pin' && inputPin.outputs.length === 1, 'Modular Input Pin created with 1 output terminal');

const outputPin = createComponent('output_pin', 50, 50);
assert(outputPin.type === 'output_pin' && outputPin.inputs.length === 1, 'Modular Output Pin created with 1 input terminal');

const breadboard = createComponent('breadboard', 100, 100);
assert(breadboard.type === 'breadboard' && breadboard.inputs.length >= 40, 'Modular Breadboard created with tie-point matrix');

console.log('ALL DIGITAL TRAINER & MODULAR COMPONENT TESTS PASSED SUCCESSFULLY! 🎉');

console.log('=== TEST 3: Trainer Kit Hardware Initialization ===');
const trainerComps = createTrainerKitComponents();
assert(trainerComps.length >= 35, `Trainer kit contains ${trainerComps.length} fixed hardware modules`);

const circuitWithTrainer = ensureTrainerKit({ components: [], wires: [] });
assert(circuitWithTrainer.components.length === trainerComps.length, 'ensureTrainerKit injects all fixed trainer components');

console.log('=== TEST 4: Full Circuit Simulation with 7408 IC and Trainer Kit ===');
// Wire Trainer IN-0 and IN-1 to 7408 inputs 1A and 1B (pins '1' and '2')
// Wire 7408 output 1Y (pin '3') to Trainer OUT-0
const comp7408 = createComponent('ic_7408', 300, 200);

const testCircuit: Circuit = {
  components: [...circuitWithTrainer.components, comp7408],
  wires: [
    {
      id: 'w1',
      fromCompId: 'trainer_in_0',
      fromPinId: 'out',
      toCompId: comp7408.id,
      toPinId: '1',
      value: '1',
    },
    {
      id: 'w2',
      fromCompId: 'trainer_in_1',
      fromPinId: 'out',
      toCompId: comp7408.id,
      toPinId: '2',
      value: '1',
    },
    {
      id: 'w3',
      fromCompId: comp7408.id,
      fromPinId: '3',
      toCompId: 'trainer_out_0',
      toPinId: 'in',
      value: '0',
    },
  ],
};

// Case A: IN-0=1, IN-1=1, Master Power ON, but VCC is NOT connected yet -> Output must be 0
const powerSwitch = testCircuit.components.find((c) => c.id === 'trainer_power')!;
powerSwitch.state = { toggleState: true };

const in0 = testCircuit.components.find((c) => c.id === 'trainer_in_0')!;
const in1 = testCircuit.components.find((c) => c.id === 'trainer_in_1')!;
in0.state = { toggleState: true };
in0.outputs[0].value = '1';
in1.state = { toggleState: true };
in1.outputs[0].value = '1';

const simResUnpowered = simulateCircuit(testCircuit);
const simulated7408Unpowered = simResUnpowered.circuit.components.find((c) => c.id === comp7408.id)!;
assert(simulated7408Unpowered.outputs.find((p) => p.id === '3')?.value === '0', '7408 Pin 3 (1Y) outputs 0 when VCC is NOT connected');

// Case B: Connect VCC to trainer VCC rail, but turn Master Power OFF -> Output must be 0
testCircuit.wires.push({
  id: 'w_vcc',
  fromCompId: 'trainer_vcc',
  fromPinId: 'out',
  toCompId: comp7408.id,
  toPinId: '14',
  value: '0',
});
powerSwitch.state = { toggleState: false };

const simResPowerOff = simulateCircuit(testCircuit);
const simulated7408PowerOff = simResPowerOff.circuit.components.find((c) => c.id === comp7408.id)!;
assert(simulated7408PowerOff.outputs.find((p) => p.id === '3')?.value === '0', '7408 Pin 3 outputs 0 when Master Power is OFF even if wired');

// Case C: Master Power ON + VCC Connected + Inputs HIGH -> Output must be 1
powerSwitch.state = { toggleState: true };
const simResPowered = simulateCircuit(testCircuit);
const simulated7408Powered = simResPowered.circuit.components.find((c) => c.id === comp7408.id)!;
const simulatedOut0 = simResPowered.circuit.components.find((c) => c.id === 'trainer_out_0')!;

assert(simulated7408Powered.outputs.find((p) => p.id === '3')?.value === '1', '7408 Pin 3 (1Y) outputs 1 when Master Power ON & VCC connected');
assert(simulatedOut0.inputs.find((p) => p.id === 'in')?.value === '1', 'Trainer OUT-0 receives 1 from 7408 Pin 3');

console.log('=== TEST 5: Custom IC Definition and Subcircuit Simulation ===');
// Create a custom 20-pin IC that internally contains an XOR gate
const internalXor = createComponent('xor', 10, 10);
const customDef: CustomICDefinition = {
  id: 'my_custom_ic_1',
  userId: 'test_user',
  name: 'Custom XOR IC',
  code: '74CUSTXOR',
  partNumber: '74CUSTXOR',
  pinCount: 20,
  internalCircuit: {
    components: [internalXor],
    wires: [],
  },
  pins: [
    { pin: 1, name: '1A', type: 'input', internalComponentId: internalXor.id },
    { pin: 2, name: '1B', type: 'input', internalComponentId: internalXor.id },
    { pin: 3, name: '1Y', type: 'output', internalComponentId: internalXor.id },
    { pin: 10, name: 'GND', type: 'power' },
    { pin: 20, name: 'VCC', type: 'power' },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const customICComp = createComponent('custom_ic', 100, 100, '74CUSTXOR', { customIC: customDef });
assert(customICComp.label === '74CUSTXOR', 'Custom IC created with custom label');
assert(customICComp.inputs.some((p) => p.id === '1'), 'Custom IC has Pin 1');
assert(customICComp.outputs.some((p) => p.id === '3'), 'Custom IC has Pin 3');

console.log('ALL DIGITAL TRAINER UNIT TESTS PASSED SUCCESSFULLY! 🎉');
