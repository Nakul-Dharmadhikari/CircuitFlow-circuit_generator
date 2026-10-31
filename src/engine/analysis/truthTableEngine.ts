import type { Circuit, CustomICDefinition, LogicValue } from '../../types/circuit';
import { simulateCircuit } from '../simulator';
import { isSequentialCircuit, simulateCustomICInputs } from '../../utils/customIcSimulator';
import { analyzeCircuitOverview } from './circuitOverview';

export interface TruthTableRow {
  inputs: Record<string, LogicValue>;
  outputs: Record<string, LogicValue>;
}

export interface BooleanAnalysis {
  outputName: string;
  minterms: number[];
  maxterms: number[];
  sopExpression: string;
  simplifiedExpression?: string;
}

export interface UnifiedTruthTableResult {
  valid: boolean;
  circuitType: 'combinational' | 'sequential' | 'empty' | 'unsupported';
  targetSource: 'schematic' | 'trainer' | 'custom_ic';
  inputNames: string[];
  outputNames: string[];
  rows: TruthTableRow[];
  totalCombinations: number;
  isPartial: boolean;
  maxInputsLimit: number;
  rowEstimateText: string;
  sizeWarning?: string;
  unsupportedMessage?: string;
  booleanAnalyses?: BooleanAnalysis[];
  diagnosticsNote?: string;
}

/**
 * Universal Truth Table Engine:
 * Analyzes combinational logic for any supported circuit (Schematic, Trainer, or Custom IC).
 */
export function generateUnifiedTruthTable(
  target: Circuit | CustomICDefinition,
  options: {
    sourceType?: 'schematic' | 'trainer' | 'custom_ic';
    maxInputs?: number;
    forceGenerateLarge?: boolean;
  } = {}
): UnifiedTruthTableResult {
  const maxInputs = options.maxInputs || 6;
  const isCustomIC = 'pins' in target && ('internalCircuit' in target || 'gateUnits' in target);
  const sourceType = options.sourceType || (isCustomIC ? 'custom_ic' : 'schematic');

  // Handle Custom IC targets directly
  if (isCustomIC) {
    return generateCustomICTruthTableUnified(target as CustomICDefinition, maxInputs, options.forceGenerateLarge);
  }

  // Handle Circuit targets
  const circuit = target as Circuit;
  const overview = analyzeCircuitOverview(circuit);

  if (overview.circuitType === 'empty') {
    return {
      valid: false,
      circuitType: 'empty',
      targetSource: sourceType,
      inputNames: [],
      outputNames: [],
      rows: [],
      totalCombinations: 0,
      isPartial: false,
      maxInputsLimit: maxInputs,
      rowEstimateText: '0 rows',
      unsupportedMessage: 'Canvas is empty. Add logic components to analyze truth table.',
    };
  }

  if (overview.circuitType === 'sequential') {
    return {
      valid: false,
      circuitType: 'sequential',
      targetSource: sourceType,
      inputNames: overview.inputs.map((i) => i.displayName),
      outputNames: overview.outputs.map((o) => o.displayName),
      rows: [],
      totalCombinations: 0,
      isPartial: false,
      maxInputsLimit: maxInputs,
      rowEstimateText: 'State-dependent',
      unsupportedMessage:
        'Sequential circuit detected (flip-flops, registers, counters, or feedback loop). Truth tables require stateless combinational logic. Please use the Sequential State or Timing Analysis tabs instead.',
    };
  }

  const inputNames = overview.inputs.map((i) => i.displayName);
  const outputNames = overview.outputs.map((o) => o.displayName);

  if (inputNames.length === 0 || outputNames.length === 0) {
    return {
      valid: false,
      circuitType: 'unsupported',
      targetSource: sourceType,
      inputNames,
      outputNames,
      rows: [],
      totalCombinations: 0,
      isPartial: false,
      maxInputsLimit: maxInputs,
      rowEstimateText: '0 rows',
      unsupportedMessage: overview.truthTableFeasibilityReason || 'Circuit does not have valid inputs or observable outputs.',
    };
  }

  const n = inputNames.length;
  const totalCombinations = Math.pow(2, n);
  const rowEstimateText = `${totalCombinations.toLocaleString()} rows (2^${n})`;

  // Size guard
  let sizeWarning: string | undefined = undefined;
  if (n > maxInputs) {
    sizeWarning = `Circuit has ${n} inputs resulting in ${totalCombinations.toLocaleString()} combinations. Displaying first ${Math.pow(2, maxInputs)} combinations to prevent browser freezing.`;
  }

  const rowsToEvaluate = options.forceGenerateLarge
    ? Math.min(totalCombinations, 1024)
    : Math.min(totalCombinations, Math.pow(2, maxInputs));

  const rows: TruthTableRow[] = [];

  for (let i = 0; i < rowsToEvaluate; i++) {
    const inputValues: Record<string, LogicValue> = {};
    let clonedComps = circuit.components.map((c) => ({
      ...c,
      inputs: c.inputs.map((p) => ({ ...p })),
      outputs: c.outputs.map((p) => ({ ...p })),
      state: { ...c.state },
    }));

    overview.inputs.forEach((inp, idx) => {
      const bit = (i >> (n - 1 - idx)) & 1;
      const val: LogicValue = bit === 1 ? '1' : '0';
      inputValues[inp.displayName] = val;

      if (inp.compType === 'toggle' || inp.compType === 'push_button') {
        clonedComps = clonedComps.map((c) => {
          if (c.id === inp.compId) {
            return {
              ...c,
              state: { ...c.state, toggleState: bit === 1, buttonPressed: bit === 1 },
              outputs: c.outputs.map((p) => ({ ...p, value: val })),
            };
          }
          return c;
        });
      } else {
        // Direct pin driver
        clonedComps = clonedComps.map((c) => {
          if (c.id === inp.compId) {
            const inputs = c.inputs.map((p) => (p.id === inp.pinId ? { ...p, value: val } : p));
            return { ...c, inputs };
          }
          return c;
        });
      }
    });

    const simRes = simulateCircuit({
      ...circuit,
      components: clonedComps,
    });

    const outputValues: Record<string, LogicValue> = {};
    overview.outputs.forEach((out) => {
      const targetComp = simRes.circuit.components.find((c) => c.id === out.compId);
      if (!targetComp) {
        outputValues[out.displayName] = '0';
        return;
      }

      if (targetComp.type === 'probe' || targetComp.type === 'led' || targetComp.type === 'buzzer') {
        outputValues[out.displayName] = targetComp.inputs?.[0]?.value || '0';
      } else {
        const outPin = targetComp.outputs?.find((p) => p.id === out.pinId);
        outputValues[out.displayName] = outPin?.value || '0';
      }
    });

    rows.push({
      inputs: inputValues,
      outputs: outputValues,
    });
  }

  // Boolean analyses
  const booleanAnalyses = outputNames.map((outName) => computeBooleanEquations(inputNames, outName, rows));

  return {
    valid: true,
    circuitType: 'combinational',
    targetSource: sourceType,
    inputNames,
    outputNames,
    rows,
    totalCombinations,
    isPartial: totalCombinations > rowsToEvaluate,
    maxInputsLimit: maxInputs,
    rowEstimateText,
    sizeWarning,
    booleanAnalyses,
  };
}

/**
 * Evaluates combinational truth table for Custom ICs with explicit pin mappings & inversion
 */
function generateCustomICTruthTableUnified(
  ic: CustomICDefinition,
  maxInputs: number,
  forceLarge?: boolean
): UnifiedTruthTableResult {
  const isSeq = isSequentialCircuit(ic.internalCircuit || ic.circuit);
  const pins = ic.pins || ic.pinMappings || [];

  const inputPins = pins.filter((p) => p.type === 'input');
  const outputPins = pins.filter((p) => p.type === 'output');

  if (isSeq) {
    return {
      valid: false,
      circuitType: 'sequential',
      targetSource: 'custom_ic',
      inputNames: inputPins.map((p) => p.name || `PIN_${p.pin}`),
      outputNames: outputPins.map((p) => p.name || `PIN_${p.pin}`),
      rows: [],
      totalCombinations: 0,
      isPartial: false,
      maxInputsLimit: maxInputs,
      rowEstimateText: 'State-dependent',
      unsupportedMessage: 'Custom IC contains internal sequential elements. Use Sequential State analysis.',
    };
  }

  if (inputPins.length === 0 || outputPins.length === 0) {
    return {
      valid: false,
      circuitType: 'unsupported',
      targetSource: 'custom_ic',
      inputNames: [],
      outputNames: [],
      rows: [],
      totalCombinations: 0,
      isPartial: false,
      maxInputsLimit: maxInputs,
      rowEstimateText: '0 rows',
      unsupportedMessage: 'Custom IC has no external inputs or outputs defined.',
    };
  }

  const inputNames = inputPins.map((p) => p.name || `Pin_${p.pinNumber ?? p.pin}`);
  const outputNames = outputPins.map((p) => p.name || `Pin_${p.pinNumber ?? p.pin}`);

  const n = inputPins.length;
  const totalCombinations = Math.pow(2, n);
  const rowEstimateText = `${totalCombinations.toLocaleString()} rows (2^${n})`;

  let sizeWarning: string | undefined = undefined;
  if (n > maxInputs) {
    sizeWarning = `Custom IC has ${n} inputs resulting in ${totalCombinations.toLocaleString()} combinations. Displaying first ${Math.pow(2, maxInputs)} rows.`;
  }

  const rowsToEvaluate = forceLarge ? Math.min(totalCombinations, 1024) : Math.min(totalCombinations, Math.pow(2, maxInputs));
  const rows: TruthTableRow[] = [];

  for (let i = 0; i < rowsToEvaluate; i++) {
    const pinInputs: Record<number, LogicValue> = {};
    const inputValues: Record<string, LogicValue> = {};

    inputPins.forEach((p, idx) => {
      const bit = (i >> (n - 1 - idx)) & 1;
      const rawVal: LogicValue = bit === 1 ? '1' : '0';
      const effectiveVal: LogicValue = p.inverted ? (rawVal === '1' ? '0' : '1') : rawVal;

      const pNum = p.pinNumber ?? p.pin;
      pinInputs[pNum] = effectiveVal;
      inputValues[inputNames[idx]] = rawVal;
    });

    const simResults = simulateCustomICInputs(ic, pinInputs);
    const outputValues: Record<string, LogicValue> = {};

    outputPins.forEach((p, idx) => {
      const pNum = p.pinNumber ?? p.pin;
      const effectiveOut = simResults[pNum] || '0';
      outputValues[outputNames[idx]] = effectiveOut;
    });

    rows.push({
      inputs: inputValues,
      outputs: outputValues,
    });
  }

  const booleanAnalyses = outputNames.map((outName) => computeBooleanEquations(inputNames, outName, rows));

  return {
    valid: true,
    circuitType: 'combinational',
    targetSource: 'custom_ic',
    inputNames,
    outputNames,
    rows,
    totalCombinations,
    isPartial: totalCombinations > rowsToEvaluate,
    maxInputsLimit: maxInputs,
    rowEstimateText,
    sizeWarning,
    booleanAnalyses,
  };
}

/**
 * Computes canonical SOP and simplified Boolean logic
 */
function computeBooleanEquations(inputNames: string[], outputName: string, rows: TruthTableRow[]): BooleanAnalysis {
  const minterms: number[] = [];
  const maxterms: number[] = [];

  rows.forEach((r, idx) => {
    const val = r.outputs[outputName];
    if (val === '1') minterms.push(idx);
    else if (val === '0') maxterms.push(idx);
  });

  const total = rows.length;
  let sopExpression = '';
  let simplified: string | undefined = undefined;

  if (minterms.length === total && total > 0) {
    sopExpression = '1 (Tautology / VCC)';
    simplified = '1';
  } else if (minterms.length === 0) {
    sopExpression = '0 (Contradiction / GND)';
    simplified = '0';
  } else {
    const terms = minterms.map((idx) => {
      const r = rows[idx];
      return inputNames.map((name) => (r.inputs[name] === '1' ? name : `${name}'`)).join('·');
    });
    sopExpression = terms.join(' + ');
  }

  return {
    outputName,
    minterms,
    maxterms,
    sopExpression,
    simplifiedExpression: simplified,
  };
}
