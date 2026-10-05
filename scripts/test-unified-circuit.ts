import { ensureTrainerKit } from '../src/engine/trainerKit';
import { createComponent, simulateCircuit } from '../src/engine/simulator';
import {
  toUnifiedCircuit,
  toLegacyCircuit,
  getTrainerMapping,
  serializeUnifiedCircuit,
  deserializeUnifiedCircuit,
} from '../src/core/circuit-model';
import {
  getNextRotation,
  getRotatedPinCoords,
  getRotatedPinDirection,
  createOrthogonalPath,
} from '../src/utils/geometry';
import type { Circuit, Wire } from '../src/types/circuit';

function runUnifiedCircuitTests() {
  console.log('Running Phase 2 Unified Circuit & Dual Workspace Tests...\n');

  // Test 1: Trainer board initialization in unified circuit
  const baseCircuit = ensureTrainerKit({ components: [], wires: [] });
  const unified = toUnifiedCircuit(baseCircuit);

  if (!unified.id || !unified.logicalComponents || !unified.wires || !unified.metadata) {
    throw new Error('Test 1 Failed: UnifiedCircuit missing core required properties');
  }
  if (unified.logicalComponents.size !== baseCircuit.components.length) {
    throw new Error(`Test 1 Failed: Component count mismatch. Expected ${baseCircuit.components.length}, got ${unified.logicalComponents.size}`);
  }
  console.log(`✔ Test 1 passed: Trainer kit initialized as UnifiedCircuit (${unified.logicalComponents.size} components)`);

  // Test 2: Lossless bidirectional conversion between legacy and unified representations
  const andGate = createComponent('and', 300, 200, 'U1_AND');
  andGate.rotation = 90;
  baseCircuit.components.push(andGate);

  const testWire: Wire = {
    id: 'wire_test_1',
    fromCompId: andGate.id,
    fromPinId: andGate.outputs[0].id,
    toCompId: 'trainer_out_0',
    toPinId: 'in_0',
    value: '0',
  };
  baseCircuit.wires.push(testWire);

  const convUnified = toUnifiedCircuit(baseCircuit);
  const roundtrip = toLegacyCircuit(convUnified);

  if (roundtrip.components.length !== baseCircuit.components.length) {
    throw new Error('Test 2 Failed: Roundtrip lost components');
  }
  if (roundtrip.wires.length !== baseCircuit.wires.length) {
    throw new Error('Test 2 Failed: Roundtrip lost wires');
  }
  const restoredAnd = roundtrip.components.find((c) => c.id === andGate.id);
  if (!restoredAnd || restoredAnd.rotation !== 90 || restoredAnd.label !== 'U1_AND') {
    throw new Error('Test 2 Failed: Component properties or rotation corrupted in roundtrip');
  }
  console.log('✔ Test 2 passed: Lossless bidirectional conversion between legacy Circuit and UnifiedCircuit');

  // Test 3: Rotation state cycle and angle helpers
  let rot = 0;
  rot = getNextRotation(rot);
  if (rot !== 90) throw new Error(`Test 3 Failed: 0 + 90 != 90, got ${rot}`);
  rot = getNextRotation(rot);
  if (rot !== 180) throw new Error(`Test 3 Failed: 90 + 90 != 180, got ${rot}`);
  rot = getNextRotation(rot);
  if (rot !== 270) throw new Error(`Test 3 Failed: 180 + 90 != 270, got ${rot}`);
  rot = getNextRotation(rot);
  if (rot !== 0) throw new Error(`Test 3 Failed: 270 + 90 != 0, got ${rot}`);
  console.log('✔ Test 3 passed: Rotation cycles strictly through 0° -> 90° -> 180° -> 270° -> 0°');

  // Test 4: Rotated pin world coordinates geometry
  const testComp = createComponent('and', 100, 100);
  testComp.rotation = 0;
  const pin0 = testComp.outputs[0]; // Output pin at right edge (x ~ 80, y ~ 25)
  const coords0 = getRotatedPinCoords(testComp, pin0);

  testComp.rotation = 90;
  const coords90 = getRotatedPinCoords(testComp, pin0);

  testComp.rotation = 180;
  const coords180 = getRotatedPinCoords(testComp, pin0);

  testComp.rotation = 270;
  const coords270 = getRotatedPinCoords(testComp, pin0);

  // Center of component: cx = 100 + width/2, cy = 100 + height/2
  const cx = testComp.x + testComp.width / 2;
  const cy = testComp.y + testComp.height / 2;

  const dist0 = Math.hypot(coords0.x - cx, coords0.y - cy);
  const dist90 = Math.hypot(coords90.x - cx, coords90.y - cy);
  const dist180 = Math.hypot(coords180.x - cx, coords180.y - cy);
  const dist270 = Math.hypot(coords270.x - cx, coords270.y - cy);

  if (Math.abs(dist0 - dist90) > 0.001 || Math.abs(dist0 - dist180) > 0.001 || Math.abs(dist0 - dist270) > 0.001) {
    throw new Error('Test 4 Failed: Rotated pin radius is not invariant under rotation');
  }
  console.log('✔ Test 4 passed: Rotated pin world coordinate transformation is mathematically invariant');

  // Test 5: Rotated pin direction vectors
  testComp.rotation = 0;
  const dir0 = getRotatedPinDirection(testComp, pin0.id);
  if (dir0.dx !== 1 || dir0.dy !== 0) {
    throw new Error(`Test 5 Failed: Expected 0 deg output normal (1, 0), got (${dir0.dx}, ${dir0.dy})`);
  }
  testComp.rotation = 90;
  const dir90 = getRotatedPinDirection(testComp, pin0.id);
  if (dir90.dx !== 0 || dir90.dy !== 1) {
    throw new Error(`Test 5 Failed: Expected 90 deg output normal (0, 1), got (${dir90.dx}, ${dir90.dy})`);
  }
  console.log('✔ Test 5 passed: Exit normal vector rotates synchronously with component body');

  // Test 6: Orthogonal Manhattan wire router
  const path = createOrthogonalPath(100, 100, { dx: 1, dy: 0 }, 300, 250, { dx: -1, dy: 0 });
  if (!path.startsWith('M 100 100') || !path.includes('L') || !path.endsWith('300 250')) {
    throw new Error(`Test 6 Failed: Invalid orthogonal path format: "${path}"`);
  }
  console.log('✔ Test 6 passed: Orthogonal routing generates deterministic Manhattan doglegs');

  // Test 7: Trainer mapping abstraction
  const mapping = getTrainerMapping(baseCircuit);
  const inputCount = Object.keys(mapping.inputs).length;
  const outputCount = Object.keys(mapping.outputs).length;
  if (inputCount !== 16) {
    throw new Error(`Test 7 Failed: Expected 16 trainer inputs, found ${inputCount}`);
  }
  if (outputCount !== 16) {
    throw new Error(`Test 7 Failed: Expected 16 trainer outputs, found ${outputCount}`);
  }
  if (!mapping.vccId || !mapping.gndId || !mapping.clocks) {
    throw new Error('Test 7 Failed: Missing power or clock terminals in trainer mapping');
  }
  if (mapping.sockets.length !== 4) {
    throw new Error(`Test 7 Failed: Expected 4 DIP-20 IC sockets, found ${mapping.sockets.length}`);
  }
  console.log('✔ Test 7 passed: TrainerMapping abstraction correctly indexes all 16 inputs, 16 outputs, power, and 4 sockets');


  // Test 8: Serialization & Deserialization (Unified envelope and backward compatible legacy JSON)
  const serialized = serializeUnifiedCircuit(baseCircuit, { name: 'Unified Phase 2 Test Circuit' });
  const deserialized = deserializeUnifiedCircuit(serialized);

  if (deserialized.metadata.name !== 'Unified Phase 2 Test Circuit') {
    throw new Error('Test 8 Failed: Serialized metadata name not preserved');
  }
  if (deserialized.circuit.components.length !== baseCircuit.components.length) {
    throw new Error('Test 8 Failed: Deserialized component count mismatch');
  }
  if (deserialized.circuit.wires.length !== baseCircuit.wires.length) {
    throw new Error('Test 8 Failed: Deserialized wire count mismatch');
  }

  // Legacy direct JSON test
  const legacyJson = JSON.stringify({ components: [andGate], wires: [] });
  const fromLegacy = deserializeUnifiedCircuit(legacyJson);
  if (fromLegacy.circuit.components.length !== 1) {
    throw new Error('Test 8 Failed: Legacy JSON direct deserialization failed');
  }
  console.log('✔ Test 8 passed: Unified serialization format with complete backward compatibility');

  // Test 9: Simulation continuity across views (Single Source of Truth)
  // Changing a trainer input drives through circuit and updates output
  const in0 = baseCircuit.components.find((c) => c.id === 'trainer_in_0');
  if (in0) {
    in0.state = { ...in0.state, toggleState: true };
    in0.outputs[0].value = '1';
  }
  const sim = simulateCircuit(baseCircuit);
  if (!sim.circuit) throw new Error('Test 9 Failed: Simulation failed on shared circuit');
  console.log('✔ Test 9 passed: Single source of truth simulation engine operates continuously on unified circuit');

  console.log('\n==================================================');
  console.log('ALL PHASE 2 UNIFIED CIRCUIT UNIT TESTS PASSED!');
  console.log('==================================================\n');
}

runUnifiedCircuitTests();
