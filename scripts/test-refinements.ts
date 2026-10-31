import { createComponent, getComponentDisplayName, simulateCircuit } from '../src/engine/simulator';
import { getLabExperiments } from '../src/presets/labExperiments';

function runTests() {
  console.log('Testing Refinements...');

  // Test 1: Component creation without label has empty label and isCustomLabel = false
  const jk = createComponent('jk_flipflop', 100, 100);
  if (jk.isCustomLabel !== false) {
    throw new Error(`Expected default JK flip-flop to have isCustomLabel: false, got isCustomLabel=${jk.isCustomLabel}`);
  }
  console.log('✔ Test 1 passed: New component spawned without label has isCustomLabel=false');

  // Test 2: Component creation with label has that exact label and isCustomLabel = true
  const jkLabeled = createComponent('jk_flipflop', 100, 100, 'J-K-0');
  if (jkLabeled.label !== 'J-K-0' || jkLabeled.isCustomLabel !== true) {
    throw new Error(`Expected custom labeled JK to have label="J-K-0" and isCustomLabel: true, got label="${jkLabeled.label}", isCustomLabel=${jkLabeled.isCustomLabel}`);
  }
  console.log('✔ Test 2 passed: Custom labeled component has exact label and isCustomLabel=true');

  // Test 3: getComponentDisplayName returns accurate human-readable component names
  const jkName = getComponentDisplayName('jk_flipflop');
  const andName = getComponentDisplayName('and');
  const ledName = getComponentDisplayName('led');
  const clkName = getComponentDisplayName('clock');
  if (!jkName.includes('Flip-Flop') || !andName.includes('AND') || !ledName.includes('LED') || !clkName.includes('Clock')) {
    throw new Error(`Display names mismatch: jk="${jkName}", and="${andName}", led="${ledName}", clk="${clkName}"`);
  }
  console.log('✔ Test 3 passed: Display names format properly (e.g. "' + jkName + '")');

  // Test 4: All lab experiments have green LEDs only
  const exps = getLabExperiments();
  let totalLeds = 0;
  for (const exp of exps) {
    const leds = exp.circuit.components.filter((c) => c.type === 'led');
    for (const led of leds) {
      totalLeds++;
      if (led.customProps?.color !== 'green') {
        throw new Error(`Experiment ${exp.title} LED ${led.id} (${led.label}) color is "${led.customProps?.color}", expected "green"!`);
      }
    }
  }
  if (totalLeds === 0) throw new Error('No LEDs found in lab experiments');
  console.log(`✔ Test 4 passed: All ${totalLeds} LEDs across all presets are emerald green only`);

  // Test 5: Simulating circuit
  const simRes = simulateCircuit(exps[0].circuit);
  if (!simRes.circuit) throw new Error('Simulation failed');
  console.log('✔ Test 5 passed: Simulation runs cleanly on presets');

  console.log('\nAll refinement unit tests passed successfully!');
}

runTests();
