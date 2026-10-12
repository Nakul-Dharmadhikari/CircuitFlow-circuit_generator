import type { Circuit, CircuitComponent, LogicValue } from '../../types/circuit';
import { simulateCircuit } from '../simulator';
import { isSequentialCircuit } from '../../utils/customIcSimulator';

export interface StateTransitionRow {
  step: number;
  clockPhase: 'LOW' | 'RISING' | 'HIGH' | 'FALLING';
  inputs: Record<string, LogicValue>;
  currentState: Record<string, LogicValue>;
  nextState: Record<string, LogicValue>;
  outputs: Record<string, LogicValue>;
  stateChanged: boolean;
}

export interface SequentialAnalysisResult {
  isSequential: boolean;
  sequentialElements: {
    id: string;
    label: string;
    type: string;
    stateKeys: string[];
  }[];
  inputNames: string[];
  outputNames: string[];
  transitions: StateTransitionRow[];
  detectedClocks: string[];
  summary: string;
}

/**
 * Conducts controlled sequential state transition analysis by stepping clock transitions
 * and tracking internal register / flip-flop states.
 */
export function analyzeSequentialCircuit(
  circuit: Circuit,
  options: {
    stepsCount?: number;
    inputSequence?: Record<string, LogicValue>[];
  } = {}
): SequentialAnalysisResult {
  const stepsCount = options.stepsCount || 8;
  const isSeq = isSequentialCircuit(circuit);

  if (!isSeq || !circuit || !circuit.components || circuit.components.length === 0) {
    return {
      isSequential: false,
      sequentialElements: [],
      inputNames: [],
      outputNames: [],
      transitions: [],
      detectedClocks: [],
      summary: 'Circuit contains no state-dependent sequential elements (flip-flops, latches, or counters).',
    };
  }

  // 1. Identify sequential elements
  const seqTypes = [
    'd_flipflop',
    'jk_flipflop',
    't_flipflop',
    'sr_latch',
    'd_latch',
    'counter_4bit',
    'shift_reg_4bit',
    'ic_7474',
    'ic_7476',
    'ic_7490',
    'ic_7493',
    'ic_74194',
  ];

  const seqComps = circuit.components.filter((c) => seqTypes.includes(c.type));
  const clockComps = circuit.components.filter((c) => c.type === 'clock');

  const sequentialElements = seqComps.map((c) => {
    const keys = c.state ? Object.keys(c.state) : ['q'];
    return {
      id: c.id,
      label: c.label || c.type.toUpperCase(),
      type: c.type,
      stateKeys: keys.length > 0 ? keys : ['q'],
    };
  });

  // Identify external input and output points
  const inputComps = circuit.components.filter((c) => c.type === 'toggle' || c.type === 'push_button');
  const outputComps = circuit.components.filter((c) => c.type === 'probe' || c.type === 'led' || c.type === 'buzzer');

  const inputNames = inputComps.map((c) => c.label || c.id);
  const outputNames = outputComps.map((c) => c.label || c.id);

  // If no explicit probes, observe Q outputs of sequential components
  if (outputNames.length === 0) {
    seqComps.forEach((c) => {
      c.outputs?.forEach((p) => {
        outputNames.push(`${c.label || c.type}_${p.name}`);
      });
    });
  }

  // Helper to extract current state vector
  const extractStateVector = (comps: CircuitComponent[]): Record<string, LogicValue> => {
    const state: Record<string, LogicValue> = {};
    comps.forEach((c) => {
      if (seqTypes.includes(c.type)) {
        const qVal = c.outputs?.find((p) => p.name.toLowerCase() === 'q')?.value || c.state?.q || '0';
        state[`${c.label || c.type}_Q`] = qVal;
        const qBar = c.outputs?.find((p) => p.name.toLowerCase().includes('qbar') || p.name.includes("q'"))?.value;
        if (qBar !== undefined) {
          state[`${c.label || c.type}_Q'`] = qBar;
        }
      }
    });
    return state;
  };

  // Helper to extract output vector
  const extractOutputVector = (comps: CircuitComponent[]): Record<string, LogicValue> => {
    const outs: Record<string, LogicValue> = {};
    outputComps.forEach((c) => {
      outs[c.label || c.id] = c.inputs?.[0]?.value || '0';
    });
    if (outputComps.length === 0) {
      comps.forEach((c) => {
        if (seqTypes.includes(c.type)) {
          c.outputs?.forEach((p) => {
            outs[`${c.label || c.type}_${p.name}`] = p.value;
          });
        }
      });
    }
    return outs;
  };

  // Clone circuit and run stepping
  let workingCircuit: Circuit = JSON.parse(JSON.stringify(circuit));
  const transitions: StateTransitionRow[] = [];

  for (let step = 0; step < stepsCount; step++) {
    const isClockHigh = step % 2 === 1;
    const phase: StateTransitionRow['clockPhase'] = isClockHigh ? 'HIGH' : 'LOW';

    // Step 1: Set Clock level (0 -> 1 -> 0)
    workingCircuit.components = workingCircuit.components.map((c) => {
      if (c.type === 'clock') {
        return {
          ...c,
          state: { ...c.state, toggleState: isClockHigh },
          outputs: c.outputs.map((p) => ({ ...p, value: isClockHigh ? '1' : '0' })),
        };
      }
      return c;
    });

    // Step 2: Set user input sequence or toggle inputs
    const currentInputs: Record<string, LogicValue> = {};
    if (options.inputSequence && options.inputSequence[step]) {
      const seqInputs = options.inputSequence[step];
      workingCircuit.components = workingCircuit.components.map((c) => {
        const name = c.label || c.id;
        if (seqInputs[name] !== undefined) {
          const bitVal = seqInputs[name];
          currentInputs[name] = bitVal;
          return {
            ...c,
            state: { ...c.state, toggleState: bitVal === '1' },
            outputs: c.outputs.map((p) => ({ ...p, value: bitVal })),
          };
        }
        return c;
      });
    } else {
      inputComps.forEach((c) => {
        currentInputs[c.label || c.id] = c.state?.toggleState ? '1' : '0';
      });
    }

    const stateBefore = extractStateVector(workingCircuit.components);

    // Step 3: Run simulation tick to advance sequential machine
    const simRes = simulateCircuit(workingCircuit);
    workingCircuit = simRes.circuit;

    const stateAfter = extractStateVector(workingCircuit.components);
    const outs = extractOutputVector(workingCircuit.components);

    const changed = Object.keys(stateBefore).some(
      (k) => stateBefore[k] !== stateAfter[k]
    );

    transitions.push({
      step: step + 1,
      clockPhase: phase,
      inputs: currentInputs,
      currentState: stateBefore,
      nextState: stateAfter,
      outputs: outs,
      stateChanged: changed,
    });
  }

  return {
    isSequential: true,
    sequentialElements,
    inputNames,
    outputNames,
    transitions,
    detectedClocks: clockComps.map((c) => c.label || c.id),
    summary: `Sequential circuit tracked across ${stepsCount} controlled clock phases with ${sequentialElements.length} state element(s).`,
  };
}
