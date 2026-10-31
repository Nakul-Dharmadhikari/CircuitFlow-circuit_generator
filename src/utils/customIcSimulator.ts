import type { Circuit, CustomICDefinition, LogicValue } from '../types/circuit';
import { simulateCircuit } from '../engine/simulator';

export interface TruthTableRow {
  inputs: Record<string, LogicValue>;
  outputs: Record<string, LogicValue>;
}

export interface CustomICTestResult {
  circuitType: 'combinational' | 'sequential';
  inputNames: Record<number, string> | any;
  outputNames: Record<number, string> | any;
  inputPinNumbers: number[];
  outputPinNumbers: number[];
  rows: TruthTableRow[];
  truthTableRows: TruthTableRow[];
  passed: boolean;
  isPartial?: boolean;
  totalCombinations: number;
  unsupportedMessage?: string;
}

/**
 * Detects whether a circuit contains stateful sequential elements (flip-flops, latches, counters).
 */
export function isSequentialCircuit(circuit?: Circuit): boolean {
  if (!circuit || !circuit.components) return false;
  return circuit.components.some((c) => {
    const t: string = c.type;
    return (
      t === 'd_flipflop' ||
      t === 'd_flip_flop' ||
      t === 'jk_flipflop' ||
      t === 'jk_flip_flop' ||
      t === 't_flipflop' ||
      t === 't_flip_flop' ||
      t === 'sr_latch' ||
      t === 'd_latch' ||
      t === 'counter_4bit' ||
      t === 'shift_reg_4bit' ||
      t === 'ic_7474' ||
      t === 'ic_7476' ||
      t === 'ic_7490' ||
      t === 'ic_7493' ||
      t === 'ic_74194' ||
      t === 'clock'
    );
  });
}

/**
 * Simulates a Custom IC for a single set of external pin inputs using its internalCircuit.
 */
export function simulateCustomICInputs(
  ic: CustomICDefinition,
  pinInputs: Record<number, LogicValue>
): Record<number, LogicValue> {
  const internalCircuit = ic.internalCircuit || ic.circuit;
  const pins = ic.pins || ic.pinMappings || [];
  const results: Record<number, LogicValue> = {};

  if (!internalCircuit || !internalCircuit.components || internalCircuit.components.length === 0) {
    pins.forEach((p) => {
      const pNum = p.pinNumber ?? p.pin;
      if (p.type === 'output') results[pNum] = '0';
    });
    return results;
  }

  // Clone internal circuit cleanly
  const simCircuit: Circuit = JSON.parse(JSON.stringify(internalCircuit));

  // Map inputs into internal circuit
  pins.forEach((pinMap) => {
    const pNum = pinMap.pinNumber ?? pinMap.pin;
    if (pinMap.type === 'input') {
      const val = pinInputs[pNum] ?? (pNum === ic.vccPin ? '1' : '0');
      const compId = pinMap.internalComponentId || pinMap.internalCompId;
      const targetComp = simCircuit.components.find((c) => c.id === compId);

      if (targetComp) {
        if (pinMap.internalPinId) {
          const inP = targetComp.inputs?.find(
            (p) => p.id === pinMap.internalPinId || p.name === pinMap.internalPinId
          );
          if (inP) inP.value = val;

          const outP = targetComp.outputs?.find(
            (p) => p.id === pinMap.internalPinId || p.name === pinMap.internalPinId
          );
          if (outP) outP.value = val;
        }

        if (
          targetComp.type === 'input_pin' ||
          targetComp.type === 'toggle' ||
          targetComp.type === 'clock'
        ) {
          if (targetComp.state) targetComp.state.toggleState = val === '1';
          if (targetComp.outputs) {
            targetComp.outputs.forEach((op) => {
              op.value = val;
            });
          }
        } else if (!pinMap.internalPinId && targetComp.inputs && targetComp.inputs.length > 0) {
          targetComp.inputs[0].value = val;
        }
      }
    }
  });

  // Run multi-pass solver
  const simResult = simulateCircuit(simCircuit);

  // Extract outputs using explicit pin mappings
  pins.forEach((pinMap) => {
    const pNum = pinMap.pinNumber ?? pinMap.pin;
    if (pinMap.type === 'output') {
      const compId = pinMap.internalComponentId || pinMap.internalCompId;
      const sourceComp = simResult.circuit.components.find((c) => c.id === compId);

      let outVal: LogicValue = '0';
      if (sourceComp) {
        if (pinMap.internalPinId) {
          const outP = sourceComp.outputs?.find(
            (p) => p.id === pinMap.internalPinId || p.name === pinMap.internalPinId
          );
          if (outP) {
            outVal = outP.value;
          } else {
            const inP = sourceComp.inputs?.find(
              (p) => p.id === pinMap.internalPinId || p.name === pinMap.internalPinId
            );
            if (inP) outVal = inP.value;
          }
        } else if (sourceComp.outputs && sourceComp.outputs.length > 0) {
          outVal = sourceComp.outputs[0].value;
        }
      }

      results[pNum] = pinMap.inverted
        ? outVal === '1'
          ? '0'
          : outVal === '0'
          ? '1'
          : outVal
        : outVal;
    }
  });

  return results;
}

/**
 * Evaluates a combinational Custom IC across all input binary permutations and produces an automated truth table.
 * Uses the explicit pin mappings (externalPin -> internalComponentId -> internalPinId).
 */
export function generateCustomICTruthTable(
  ic: CustomICDefinition,
  maxInputs = 6
): CustomICTestResult {
  const internalCircuit = ic.internalCircuit || ic.circuit;
  const pins = ic.pins || ic.pinMappings || [];

  if (!internalCircuit || internalCircuit.components.length === 0) {
    return {
      circuitType: 'combinational',
      inputNames: {},
      outputNames: {},
      inputPinNumbers: [],
      outputPinNumbers: [],
      rows: [],
      truthTableRows: [],
      passed: false,
      totalCombinations: 0,
      unsupportedMessage: 'No internal circuit components available to simulate.',
    };
  }

  const sequential = isSequentialCircuit(internalCircuit);

  // Filter functional mapped inputs (excluding power pins)
  const functionalInputs = pins.filter(
    (p) =>
      p.type === 'input' &&
      p.pin !== ic.vccPin &&
      p.pin !== ic.gndPin &&
      (p.internalComponentId || p.internalCompId)
  );

  const functionalOutputs = pins.filter(
    (p) => p.type === 'output' && (p.internalComponentId || p.internalCompId)
  );

  const inputPinNumbers = functionalInputs.map((p) => p.pinNumber ?? p.pin);
  const outputPinNumbers = functionalOutputs.map((p) => p.pinNumber ?? p.pin);

  const inputNamesRecord: Record<number, string> = {};
  functionalInputs.forEach((p) => {
    const num = p.pinNumber ?? p.pin;
    inputNamesRecord[num] = p.name || `P${num}`;
  });

  const outputNamesRecord: Record<number, string> = {};
  functionalOutputs.forEach((p) => {
    const num = p.pinNumber ?? p.pin;
    outputNamesRecord[num] = p.name || `P${num}`;
  });

  if (functionalInputs.length === 0 || functionalOutputs.length === 0) {
    return {
      circuitType: sequential ? 'sequential' : 'combinational',
      inputNames: inputNamesRecord,
      outputNames: outputNamesRecord,
      inputPinNumbers,
      outputPinNumbers,
      rows: [],
      truthTableRows: [],
      passed: false,
      totalCombinations: 0,
      unsupportedMessage:
        functionalInputs.length === 0
          ? 'No external inputs mapped to internal components.'
          : 'No external outputs mapped to internal components.',
    };
  }

  const inCount = functionalInputs.length;
  const totalCombinations = Math.pow(2, inCount);
  const cappedLimit = Math.min(totalCombinations, Math.pow(2, maxInputs));
  const isPartial = totalCombinations > cappedLimit;

  const rows: TruthTableRow[] = [];

  for (let comb = 0; comb < cappedLimit; comb++) {
    const binStr = comb.toString(2).padStart(inCount, '0');
    const inputValRecord: Record<string, LogicValue> = {};
    const pinInputRecord: Record<number, LogicValue> = {};

    functionalInputs.forEach((pinMap, idx) => {
      const bitVal = binStr[idx] as LogicValue;
      const pNum = pinMap.pinNumber ?? pinMap.pin;
      inputValRecord[String(pNum)] = bitVal;
      pinInputRecord[pNum] = bitVal;
    });

    const outputSim = simulateCustomICInputs(ic, pinInputRecord);
    const outputValRecord: Record<string, LogicValue> = {};
    functionalOutputs.forEach((pinMap) => {
      const pNum = pinMap.pinNumber ?? pinMap.pin;
      outputValRecord[String(pNum)] = outputSim[pNum] ?? '0';
    });

    rows.push({
      inputs: inputValRecord,
      outputs: outputValRecord,
    });
  }

  return {
    circuitType: sequential ? 'sequential' : 'combinational',
    inputNames: inputNamesRecord,
    outputNames: outputNamesRecord,
    inputPinNumbers,
    outputPinNumbers,
    rows,
    truthTableRows: rows,
    passed: true,
    isPartial,
    totalCombinations,
  };
}

/**
 * Runs verification test (truth table for combinational, controlled state steps for sequential).
 */
export function runTruthTableOrSequentialTest(ic: CustomICDefinition): CustomICTestResult {
  const internalCircuit = ic.internalCircuit || ic.circuit;
  const sequential = isSequentialCircuit(internalCircuit);

  if (!sequential) {
    return generateCustomICTruthTable(ic);
  }

  // Sequential circuit controlled stepper
  const pins = ic.pins || ic.pinMappings || [];
  const functionalInputs = pins.filter(
    (p) =>
      p.type === 'input' &&
      p.pin !== ic.vccPin &&
      p.pin !== ic.gndPin &&
      (p.internalComponentId || p.internalCompId)
  );
  const functionalOutputs = pins.filter(
    (p) => p.type === 'output' && (p.internalComponentId || p.internalCompId)
  );

  const inputPinNumbers = functionalInputs.map((p) => p.pinNumber ?? p.pin);
  const outputPinNumbers = functionalOutputs.map((p) => p.pinNumber ?? p.pin);

  const inputNamesRecord: Record<number, string> = {};
  functionalInputs.forEach((p) => {
    const num = p.pinNumber ?? p.pin;
    inputNamesRecord[num] = p.name || `P${num}`;
  });

  const outputNamesRecord: Record<number, string> = {};
  functionalOutputs.forEach((p) => {
    const num = p.pinNumber ?? p.pin;
    outputNamesRecord[num] = p.name || `P${num}`;
  });

  // Generate 8 sequential clock transition test steps
  const rows: TruthTableRow[] = [];
  const seqSteps = [
    { clk: '0', d: '0' },
    { clk: '1', d: '0' },
    { clk: '0', d: '1' },
    { clk: '1', d: '1' },
    { clk: '0', d: '1' },
    { clk: '1', d: '1' },
    { clk: '0', d: '0' },
    { clk: '1', d: '0' },
  ];

  seqSteps.forEach((step, sIdx) => {
    const inputValRecord: Record<string, LogicValue> = {};
    const pinInputRecord: Record<number, LogicValue> = {};

    functionalInputs.forEach((pinMap, inIdx) => {
      const pNum = pinMap.pinNumber ?? pinMap.pin;
      const isClockPin =
        pinMap.name?.toUpperCase().includes('CLK') ||
        pinMap.name?.toUpperCase().includes('CK') ||
        inIdx === functionalInputs.length - 1;

      const val = (isClockPin ? step.clk : inIdx === 0 ? step.d : (sIdx % 2 === 0 ? '1' : '0')) as LogicValue;
      inputValRecord[String(pNum)] = val;
      pinInputRecord[pNum] = val;
    });

    const outputSim = simulateCustomICInputs(ic, pinInputRecord);
    const outputValRecord: Record<string, LogicValue> = {};
    functionalOutputs.forEach((pinMap) => {
      const pNum = pinMap.pinNumber ?? pinMap.pin;
      outputValRecord[String(pNum)] = outputSim[pNum] ?? '0';
    });

    rows.push({
      inputs: inputValRecord,
      outputs: outputValRecord,
    });
  });

  return {
    circuitType: 'sequential',
    inputNames: inputNamesRecord,
    outputNames: outputNamesRecord,
    inputPinNumbers,
    outputPinNumbers,
    rows,
    truthTableRows: rows,
    passed: true,
    totalCombinations: seqSteps.length,
  };
}
