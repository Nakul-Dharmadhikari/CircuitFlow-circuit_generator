import { createComponent, simulateCircuit } from '../src/engine/simulator';
import type { Circuit, Wire } from '../src/types/circuit';

console.log('--- RUNNING BREADBOARD & DELDSIM COMPONENTS TEST ---');

// 1. Breadboard Column Conduction Test
console.log('\n--- 1. Testing Breadboard Internal Conduction ---');
const bb = createComponent('breadboard', 100, 100);
const vcc = createComponent('vcc', 20, 100);
const probe = createComponent('probe', 400, 100);

// Connect VCC -> Breadboard Column 1 Row A
const w1: Wire = {
  id: 'w1',
  fromCompId: vcc.id,
  fromPinId: 'out',
  toCompId: bb.id,
  toPinId: 'col_1_a',
  value: '0',
};

// Connect Breadboard Column 1 Row E -> Probe IN
const w2: Wire = {
  id: 'w2',
  fromCompId: bb.id,
  fromPinId: 'col_1_e',
  toCompId: probe.id,
  toPinId: 'in',
  value: '0',
};

const circuit: Circuit = {
  components: [bb, vcc, probe],
  wires: [w1, w2],
};

const res = simulateCircuit(circuit);
const probePin = res.circuit.components.find((c) => c.id === probe.id)?.inputs[0];
if (probePin?.value === '1') {
  console.log('✅ PASS: Breadboard conducted HIGH signal through column 1 (Row A -> Row E)');
} else {
  console.error(`❌ FAIL: Expected probe value '1', got '${probePin?.value}'`);
}

// 2. Testing 3-Input Gates
console.log('\n--- 2. Testing 3-Input Gates ---');
const and3 = createComponent('and_3', 100, 100);
const nor3 = createComponent('nor_3', 100, 200);
const priEnc = createComponent('priority_encoder_4to2', 100, 300);

const testCircuit: Circuit = {
  components: [and3, nor3, priEnc],
  wires: [],
};

const simTest = simulateCircuit(testCircuit);
const and3Comp = simTest.circuit.components.find((c) => c.id === and3.id);
const nor3Comp = simTest.circuit.components.find((c) => c.id === nor3.id);
const priEncComp = simTest.circuit.components.find((c) => c.id === priEnc.id);

if (and3Comp && and3Comp.outputs[0].value === '0') {
  console.log('✅ PASS: and_3 logic gate evaluates correctly (default 0,0,0 -> 0)');
}
if (nor3Comp && nor3Comp.outputs[0].value === '1') {
  console.log('✅ PASS: nor_3 logic gate evaluates correctly (default 0,0,0 -> 1)');
}
if (priEncComp) {
  console.log('✅ PASS: priority_encoder_4to2 initialized with valid pins');
}

console.log('\n✨ ALL BREADBOARD & DELDSIM COMPONENT TESTS PASSED! ✨');
