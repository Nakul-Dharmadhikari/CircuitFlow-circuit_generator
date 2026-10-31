import type { Circuit, LogicValue } from '../../types/circuit';
import { simulateCircuit } from '../simulator';

export interface TestCaseVector {
  id: string;
  name?: string;
  inputs: Record<string, LogicValue>;
  expectedOutputs: Record<string, LogicValue>;
}

export interface TestCaseResult {
  id: string;
  name?: string;
  stepNumber: number;
  inputs: Record<string, LogicValue>;
  expectedOutputs: Record<string, LogicValue>;
  observedOutputs: Record<string, LogicValue>;
  passed: boolean;
  mismatches: {
    outputName: string;
    expected: LogicValue;
    observed: LogicValue;
  }[];
}

export interface TestBenchSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number; // 0..100
  allPassed: boolean;
  results: TestCaseResult[];
  executionTimeMs: number;
}

/**
 * Runs a suite of reproducible test vectors against the active circuit using simulateCircuit.
 */
export function runTestBench(
  circuit: Circuit,
  testVectors: TestCaseVector[]
): TestBenchSuiteResult {
  const startTime = performance.now();
  const results: TestCaseResult[] = [];
  let passedCount = 0;

  testVectors.forEach((vector, idx) => {
    // Clone circuit
    let testCircuit: Circuit = JSON.parse(JSON.stringify(circuit));

    // Apply vector inputs to circuit toggle/switch components or direct gate pins
    testCircuit.components = testCircuit.components.map((c) => {
      const val =
        vector.inputs[c.id] !== undefined
          ? vector.inputs[c.id]
          : c.label && vector.inputs[c.label] !== undefined
          ? vector.inputs[c.label]
          : undefined;

      if (val !== undefined) {
        return {
          ...c,
          state: { ...c.state, toggleState: val === '1', buttonPressed: val === '1' },
          outputs: c.outputs.map((p) => ({ ...p, value: val })),
        };
      }

      // Check pin-level matches
      if (c.inputs) {
        const updatedInputs = c.inputs.map((pin) => {
          const pinKeyId = `${c.id}_${pin.name}`;
          const pinKeyLabel = c.label ? `${c.label}_${pin.name}` : pinKeyId;
          const pinVal =
            vector.inputs[pinKeyId] !== undefined
              ? vector.inputs[pinKeyId]
              : vector.inputs[pinKeyLabel] !== undefined
              ? vector.inputs[pinKeyLabel]
              : undefined;

          if (pinVal !== undefined) {
            return { ...pin, value: pinVal };
          }
          return pin;
        });
        return { ...c, inputs: updatedInputs };
      }

      return c;
    });

    // Run simulation
    const simRes = simulateCircuit(testCircuit);
    const observedOutputs: Record<string, LogicValue> = {};

    // Collect observed outputs from probes / LEDs or components
    simRes.circuit.components.forEach((c) => {
      if (c.type === 'probe' || c.type === 'led' || c.type === 'buzzer') {
        const outVal = c.inputs?.[0]?.value || '0';
        if (c.label) observedOutputs[c.label] = outVal;
        observedOutputs[c.id] = outVal;
      } else if (c.outputs && c.outputs.length > 0 && !['toggle', 'push_button', 'clock'].includes(c.type)) {
        c.outputs.forEach((pin) => {
          const keyId = `${c.id}_${pin.name}`;
          const keyLabel = c.label ? `${c.label}_${pin.name}` : keyId;
          observedOutputs[keyId] = pin.value;
          observedOutputs[keyLabel] = pin.value;
          if (c.outputs.length === 1) {
            if (c.label) observedOutputs[c.label] = pin.value;
            observedOutputs[c.id] = pin.value;
          }
        });
      }
    });

    // Compare observed vs expected
    const mismatches: TestCaseResult['mismatches'] = [];
    Object.entries(vector.expectedOutputs).forEach(([outKey, expectedVal]) => {
      const observedVal = observedOutputs[outKey] ?? '0';
      if (observedVal !== expectedVal) {
        mismatches.push({
          outputName: outKey,
          expected: expectedVal,
          observed: observedVal,
        });
      }
    });

    const isPass = mismatches.length === 0;
    if (isPass) passedCount++;

    results.push({
      id: vector.id || `test_${idx + 1}`,
      name: vector.name || `Test Case #${idx + 1}`,
      stepNumber: idx + 1,
      inputs: vector.inputs,
      expectedOutputs: vector.expectedOutputs,
      observedOutputs,
      passed: isPass,
      mismatches,
    });
  });

  const duration = performance.now() - startTime;
  const total = testVectors.length;
  const passRate = total > 0 ? Math.round((passedCount / total) * 100) : 0;

  return {
    totalTests: total,
    passedTests: passedCount,
    failedTests: total - passedCount,
    passRate,
    allPassed: passedCount === total,
    results,
    executionTimeMs: Math.round(duration * 100) / 100,
  };
}
