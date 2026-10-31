import type { Circuit, CircuitComponent, LogicValue, Wire } from '../types/circuit';
import { simulateCircuit } from './simulator';

export interface TruthTableRow {
  inputs: Record<string, LogicValue>;
  outputs: Record<string, LogicValue>;
}

export interface BooleanAnalysis {
  outputName: string;
  minterms: number[]; // e.g. [1, 3] -> Σ m(1, 3)
  maxterms: number[]; // e.g. [0, 2] -> ∏ M(0, 2)
  sopExpression: string; // Canonical or standard SOP e.g. "A·B̄ + Ā·B"
  simplifiedExpression?: string; // Standard simplified form e.g. "A ⊕ B"
}

export interface CircuitMetrics {
  totalComponents: number;
  gateCount: number;
  wireCount: number;
  inputCount: number;
  outputCount: number;
  circuitType: 'Combinational' | 'Sequential';
  feedbackDetected: boolean;
}

export interface TruthTableData {
  tableType: 'combinational' | 'sequential';
  inputNames: string[];
  outputNames: string[];
  rows: TruthTableRow[];
  isPartial: boolean;
  totalCombinations: number;
  booleanAnalyses?: BooleanAnalysis[];
  metrics?: CircuitMetrics;
}

interface InputDescriptor {
  key: string;
  displayName: string;
  type: 'component' | 'pin';
  compId: string;
  pinId?: string;
}

interface OutputDescriptor {
  key: string;
  displayName: string;
  type: 'sink_comp' | 'gate_pin' | 'seq_comp';
  compId: string;
  pinId?: string;
}

/**
 * Universal Circuit Analysis entry point:
 * Analyzes ANY arbitrary circuit dynamically.
 */
export function generateTruthTable(circuit: Circuit): TruthTableData | null {
  if (!circuit || circuit.components.length === 0) {
    return null;
  }

  // Check for sequential elements
  const seqComps = circuit.components.filter((c) =>
    [
      'd_flipflop',
      'jk_flipflop',
      't_flipflop',
      'sr_latch',
      'counter_4bit',
      'shift_reg_4bit',
    ].includes(c.type)
  );

  if (seqComps.length > 0) {
    return generateSequentialTable(circuit, seqComps);
  } else {
    return generateUniversalCombinationalTable(circuit);
  }
}

/**
 * Derive canonical Boolean SOP expressions and simplified forms
 */
function analyzeBooleanLogic(
  inputNames: string[],
  outputName: string,
  rows: TruthTableRow[]
): BooleanAnalysis {
  const minterms: number[] = [];
  const maxterms: number[] = [];

  rows.forEach((row, idx) => {
    const val = row.outputs[outputName];
    if (val === '1') {
      minterms.push(idx);
    } else if (val === '0') {
      maxterms.push(idx);
    }
  });

  const totalRows = rows.length;
  let sopExpression = '';
  let simplified: string | undefined = undefined;

  if (minterms.length === totalRows && totalRows > 0) {
    sopExpression = '1 (Tautology / VCC)';
    simplified = '1';
  } else if (minterms.length === 0) {
    sopExpression = '0 (Contradiction / GND)';
    simplified = '0';
  } else {
    // Generate canonical product terms
    const productTerms: string[] = [];
    minterms.forEach((idx) => {
      const row = rows[idx];
      const literals = inputNames.map((name) => {
        const bit = row.inputs[name];
        return bit === '1' ? name : `${name}'`;
      });
      productTerms.push(literals.join('·'));
    });

    sopExpression = productTerms.join(' + ');

    // Standard 2-input simplifications
    if (inputNames.length === 2 && totalRows === 4) {
      const a = inputNames[0];
      const b = inputNames[1];
      const mintermSet = new Set(minterms);

      if (mintermSet.size === 1 && mintermSet.has(3)) simplified = `${a} · ${b} (AND)`;
      else if (mintermSet.size === 3 && !mintermSet.has(0)) simplified = `${a} + ${b} (OR)`;
      else if (mintermSet.size === 3 && !mintermSet.has(3)) simplified = `(${a} · ${b})' (NAND)`;
      else if (mintermSet.size === 1 && mintermSet.has(0)) simplified = `(${a} + ${b})' (NOR)`;
      else if (mintermSet.size === 2 && mintermSet.has(1) && mintermSet.has(2)) simplified = `${a} ⊕ ${b} (XOR)`;
      else if (mintermSet.size === 2 && mintermSet.has(0) && mintermSet.has(3)) simplified = `${a} ⊙ ${b} (XNOR)`;
      else if (mintermSet.size === 2 && mintermSet.has(2) && mintermSet.has(3)) simplified = `${a}`;
      else if (mintermSet.size === 2 && mintermSet.has(1) && mintermSet.has(3)) simplified = `${b}`;
    } else if (inputNames.length === 1 && totalRows === 2) {
      const a = inputNames[0];
      if (minterms.length === 1 && minterms[0] === 0) simplified = `${a}' (NOT)`;
      else if (minterms.length === 1 && minterms[0] === 1) simplified = `${a} (BUFFER)`;
    }
  }

  return {
    outputName,
    minterms,
    maxterms,
    sopExpression,
    simplifiedExpression: simplified,
  };
}

/**
 * Universal Combinational Analysis:
 * Works for ANY combinational circuit, with or without explicit switches and probes!
 */
function generateUniversalCombinationalTable(circuit: Circuit): TruthTableData | null {
  const wires = circuit.wires;
  const inputDescriptors: InputDescriptor[] = [];
  const usedInputNames = new Set<string>();

  const getUniqueName = (base: string): string => {
    let name = base;
    let counter = 1;
    while (usedInputNames.has(name)) {
      name = `${base}_${counter++}`;
    }
    usedInputNames.add(name);
    return name;
  };

  // 1. Identify primary input sources:
  // A) Explicit switch/button components
  const explicitInputs = circuit.components.filter(
    (c) => c.type === 'toggle' || c.type === 'push_button' || c.type === 'vcc' || c.type === 'gnd'
  );

  explicitInputs.forEach((c, idx) => {
    const defaultName = c.label && c.label.trim().length > 0 ? c.label.trim() : `In_${idx + 1}`;
    inputDescriptors.push({
      key: `comp_${c.id}`,
      displayName: getUniqueName(defaultName),
      type: 'component',
      compId: c.id,
    });
  });

  // B) Unconnected input pins on ANY gate or IC
  // (e.g. Pin A, B on an AND gate when user didn't place switches)
  circuit.components.forEach((c) => {
    // Sinks and power rails don't have open logic inputs
    if (
      c.type === 'probe' ||
      c.type === 'led' ||
      c.type === 'buzzer' ||
      c.type === 'vcc' ||
      c.type === 'gnd' ||
      c.type === 'toggle' ||
      c.type === 'push_button' ||
      c.type === 'junction' ||
      c.type === 'clock'
    ) {
      return;
    }

    c.inputs.forEach((pin) => {
      // Check if an incoming wire connects to this input pin
      const hasDriverWire = wires.some((w) => w.toCompId === c.id && w.toPinId === pin.id);
      if (!hasDriverWire) {
        // Open input pin!
        const baseName =
          circuit.components.length === 1
            ? pin.name
            : `${c.label || c.type.toUpperCase()}_${pin.name}`;
        inputDescriptors.push({
          key: `pin_${c.id}_${pin.id}`,
          displayName: getUniqueName(baseName),
          type: 'pin',
          compId: c.id,
          pinId: pin.id,
        });
      }
    });
  });

  // 2. Identify primary output points:
  const outputDescriptors: OutputDescriptor[] = [];
  const usedOutputNames = new Set<string>();

  const getUniqueOutputName = (base: string): string => {
    let name = base;
    let counter = 1;
    while (usedOutputNames.has(name)) {
      name = `${base}_${counter++}`;
    }
    usedOutputNames.add(name);
    return name;
  };

  // A) Explicit sinks (Probes, LEDs, Buzzers)
  const explicitSinks = circuit.components.filter(
    (c) => c.type === 'probe' || c.type === 'led' || c.type === 'buzzer'
  );

  explicitSinks.forEach((c, idx) => {
    const defaultName = c.label && c.label.trim().length > 0 ? c.label.trim() : `Out_${idx + 1}`;
    outputDescriptors.push({
      key: `sink_${c.id}`,
      displayName: getUniqueOutputName(defaultName),
      type: 'sink_comp',
      compId: c.id,
    });
  });

  // B) Terminal output pins on gates/ICs (pins not driving another input)
  circuit.components.forEach((c) => {
    if (
      c.type === 'toggle' ||
      c.type === 'push_button' ||
      c.type === 'vcc' ||
      c.type === 'gnd' ||
      c.type === 'clock' ||
      c.type === 'junction' ||
      c.type === 'probe' ||
      c.type === 'led' ||
      c.type === 'buzzer'
    ) {
      return;
    }

    c.outputs.forEach((pin) => {
      const isDrivingWire = wires.some((w) => w.fromCompId === c.id && w.fromPinId === pin.id);
      if (!isDrivingWire) {
        // Terminal output!
        const baseName =
          circuit.components.length === 1 && c.outputs.length === 1
            ? pin.name
            : `${c.label || c.type.toUpperCase()}${c.outputs.length > 1 ? `_${pin.name}` : ''}`;
        outputDescriptors.push({
          key: `outpin_${c.id}_${pin.id}`,
          displayName: getUniqueOutputName(baseName),
          type: 'gate_pin',
          compId: c.id,
          pinId: pin.id,
        });
      }
    });
  });

  // If no sinks and no terminal outputs found, include all component outputs so user can observe circuit
  if (outputDescriptors.length === 0) {
    circuit.components.forEach((c) => {
      if (c.outputs.length > 0 && c.type !== 'toggle' && c.type !== 'push_button' && c.type !== 'clock') {
        c.outputs.forEach((pin) => {
          outputDescriptors.push({
            key: `fallback_${c.id}_${pin.id}`,
            displayName: getUniqueOutputName(`${c.label || c.type.toUpperCase()}_${pin.name}`),
            type: 'gate_pin',
            compId: c.id,
            pinId: pin.id,
          });
        });
      }
    });
  }

  // If still no outputs or no inputs at all, cannot solve
  if (inputDescriptors.length === 0 || outputDescriptors.length === 0) {
    return null;
  }

  const inputNames = inputDescriptors.map((d) => d.displayName);
  const outputNames = outputDescriptors.map((d) => d.displayName);

  const n = inputDescriptors.length;
  const maxInputs = 6;
  const totalCombinations = Math.pow(2, n);
  const rowsToEvaluate = Math.min(totalCombinations, Math.pow(2, maxInputs));
  const isPartial = totalCombinations > rowsToEvaluate;

  const rows: TruthTableRow[] = [];

  for (let i = 0; i < rowsToEvaluate; i++) {
    const inputValues: Record<string, LogicValue> = {};
    const tempDrivers: CircuitComponent[] = [];
    const tempWires: Wire[] = [];

    // Clone base components
    let clonedComps = circuit.components.map((c) => ({
      ...c,
      inputs: c.inputs.map((p) => ({ ...p })),
      outputs: c.outputs.map((p) => ({ ...p })),
      state: { ...c.state },
    }));

    // Configure inputs for combination i
    inputDescriptors.forEach((desc, idx) => {
      const bit = (i >> (n - 1 - idx)) & 1;
      const val: LogicValue = bit === 1 ? '1' : '0';
      inputValues[desc.displayName] = val;

      if (desc.type === 'component') {
        clonedComps = clonedComps.map((c) => {
          if (c.id === desc.compId) {
            return {
              ...c,
              state: { ...c.state, toggleState: bit === 1, buttonPressed: bit === 1 },
              outputs: c.outputs.map((p) => ({ ...p, value: val })),
            };
          }
          return c;
        });
      } else if (desc.type === 'pin' && desc.pinId) {
        // Synthesize temporary driver switch and wire to drive open input pin cleanly
        const tempId = `temp_drv_${idx}`;
        tempDrivers.push({
          id: tempId,
          type: 'toggle',
          label: `VIRT_${desc.displayName}`,
          x: -100,
          y: -100,
          width: 30,
          height: 30,
          inputs: [],
          outputs: [{ id: 'out', name: 'Q', type: 'output', x: 0, y: 0, value: val }],
          state: { toggleState: bit === 1 },
        });

        tempWires.push({
          id: `temp_wire_${idx}`,
          fromCompId: tempId,
          fromPinId: 'out',
          toCompId: desc.compId,
          toPinId: desc.pinId,
          value: val,
        });
      }
    });

    const simRes = simulateCircuit({
      components: [...clonedComps, ...tempDrivers],
      wires: [...circuit.wires, ...tempWires],
    });

    const outputValues: Record<string, LogicValue> = {};

    outputDescriptors.forEach((desc) => {
      const compInSim = simRes.circuit.components.find((c) => c.id === desc.compId);
      if (!compInSim) {
        outputValues[desc.displayName] = '0';
        return;
      }

      if (desc.type === 'sink_comp') {
        // Read input of Probe/LED/Buzzer
        outputValues[desc.displayName] = compInSim.inputs[0]?.value || '0';
      } else if (desc.type === 'gate_pin' && desc.pinId) {
        // Read output pin of Gate/IC
        const pin = compInSim.outputs.find((p) => p.id === desc.pinId);
        outputValues[desc.displayName] = pin?.value || '0';
      } else {
        outputValues[desc.displayName] = compInSim.outputs[0]?.value || '0';
      }
    });

    rows.push({
      inputs: inputValues,
      outputs: outputValues,
    });
  }

  // Boolean analysis for all outputs
  const booleanAnalyses = outputNames.map((outName) =>
    analyzeBooleanLogic(inputNames, outName, rows)
  );

  const gateCount = circuit.components.filter((c) =>
    ['not', 'buffer', 'and', 'or', 'nand', 'nor', 'xor', 'xnor', 'tri_state'].includes(c.type)
  ).length;

  return {
    tableType: 'combinational',
    inputNames,
    outputNames,
    rows,
    isPartial,
    totalCombinations,
    booleanAnalyses,
    metrics: {
      totalComponents: circuit.components.length,
      gateCount,
      wireCount: circuit.wires.length,
      inputCount: inputNames.length,
      outputCount: outputNames.length,
      circuitType: 'Combinational',
      feedbackDetected: false,
    },
  };
}

/**
 * Universal Sequential Analysis:
 * State Transition Table (Present State Q -> Next State Q⁺)
 */
function generateSequentialTable(
  circuit: Circuit,
  seqComps: CircuitComponent[]
): TruthTableData | null {
  // Sort sequential elements naturally
  const sortedSeq = [...seqComps].sort((a, b) => {
    const numA = parseInt((a.label.match(/\d+/) || ['0'])[0], 10);
    const numB = parseInt((b.label.match(/\d+/) || ['0'])[0], 10);
    if (numA !== numB) return numB - numA;
    return b.x - a.x;
  });

  // Discover primary control inputs (switches, buttons, open input pins excluding clock)
  const controlInputs = circuit.components.filter(
    (c) => (c.type === 'toggle' || c.type === 'push_button') && !c.label.toLowerCase().includes('clk')
  );

  const stateInputNames = sortedSeq.map((c, idx) => {
    return c.label && c.label.trim().length > 0 ? c.label.trim() : `Q${sortedSeq.length - 1 - idx}`;
  });

  const controlInputNames = controlInputs.map((c, idx) =>
    c.label && c.label.trim().length > 0 ? c.label.trim() : `In_${idx + 1}`
  );
  const allInputNames = [...controlInputNames, ...stateInputNames];

  // Next state column names (Q⁺)
  const nextStateNames = stateInputNames.map((n) => `${n}⁺`);

  // Secondary indicators (LEDs, Probes)
  const outputIndicators = circuit.components.filter(
    (c) => c.type === 'probe' || c.type === 'led' || c.type === 'buzzer'
  );
  const indicatorNames = outputIndicators.map((c, idx) =>
    c.label && c.label.trim().length > 0 ? c.label.trim() : `Out_${idx + 1}`
  );
  const allOutputNames = [...nextStateNames, ...indicatorNames];

  const totalBits = allInputNames.length;
  if (totalBits === 0) return null;

  const maxBits = 6;
  const totalCombinations = Math.pow(2, totalBits);
  const rowsToEvaluate = Math.min(totalCombinations, Math.pow(2, maxBits));
  const isPartial = totalCombinations > rowsToEvaluate;

  const rows: TruthTableRow[] = [];

  for (let i = 0; i < rowsToEvaluate; i++) {
    const inputValues: Record<string, LogicValue> = {};

    // 1. Configure initial circuit state
    const clonedComps = circuit.components.map((c) => {
      // Is it a control switch?
      const ctrlIdx = controlInputs.findIndex((ci) => ci.id === c.id);
      if (ctrlIdx !== -1) {
        const bit = (i >> (totalBits - 1 - ctrlIdx)) & 1;
        const val: LogicValue = bit === 1 ? '1' : '0';
        inputValues[controlInputNames[ctrlIdx]] = val;
        return {
          ...c,
          state: { ...c.state, toggleState: bit === 1, buttonPressed: bit === 1 },
          outputs: c.outputs.map((p) => ({ ...p, value: val })),
        };
      }

      // Is it a sequential state element?
      const seqIdx = sortedSeq.findIndex((sq) => sq.id === c.id);
      if (seqIdx !== -1) {
        const bitOffset = controlInputs.length + seqIdx;
        const bit = (i >> (totalBits - 1 - bitOffset)) & 1;
        const val: LogicValue = bit === 1 ? '1' : '0';
        inputValues[stateInputNames[seqIdx]] = val;

        const valBar: LogicValue = val === '1' ? '0' : '1';
        return {
          ...c,
          state: {
            ...c.state,
            q: val,
            qBar: valBar,
            prevClock: '0' as LogicValue,
            count: val === '1' ? 1 : 0,
          },
          outputs: c.outputs.map((p) => {
            if (p.id === 'q') return { ...p, value: val };
            if (p.id === 'qBar') return { ...p, value: valBar };
            return p;
          }),
        };
      }

      // Reset any clocks to LOW '0'
      if (c.type === 'clock') {
        return {
          ...c,
          state: { ...c.state, toggleState: false },
          outputs: c.outputs.map((p) => ({ ...p, value: '0' as LogicValue })),
        };
      }

      return c;
    });

    // Step A: Settle combinational logic at Clock = LOW
    const lowClkSim = simulateCircuit({ ...circuit, components: clonedComps });

    // Step B: Pulse Clock HIGH (0 -> 1 rising edge transition)
    const pulsedComps = lowClkSim.circuit.components.map((c) => {
      if (c.type === 'clock') {
        return {
          ...c,
          state: { ...c.state, toggleState: true },
          outputs: c.outputs.map((p) => ({ ...p, value: '1' as LogicValue })),
        };
      }
      return c;
    });

    // Step C: Simulate next state under clock transition
    const pulseSim = simulateCircuit({ ...circuit, components: pulsedComps });

    // 2. Read Next State Outputs
    const outputValues: Record<string, LogicValue> = {};

    sortedSeq.forEach((sq, idx) => {
      const compInSim = pulseSim.circuit.components.find((c) => c.id === sq.id);
      const qVal = compInSim?.outputs.find((p) => p.id === 'q')?.value || compInSim?.state?.q || '0';
      outputValues[nextStateNames[idx]] = qVal as LogicValue;
    });

    // Read external indicators
    outputIndicators.forEach((oc, idx) => {
      const compInSim = pulseSim.circuit.components.find((c) => c.id === oc.id);
      if (compInSim && compInSim.inputs.length > 0) {
        outputValues[indicatorNames[idx]] = compInSim.inputs[0].value;
      } else {
        outputValues[indicatorNames[idx]] = '0';
      }
    });

    rows.push({
      inputs: inputValues,
      outputs: outputValues,
    });
  }

  return {
    tableType: 'sequential',
    inputNames: allInputNames,
    outputNames: allOutputNames,
    rows,
    isPartial,
    totalCombinations,
    metrics: {
      totalComponents: circuit.components.length,
      gateCount: circuit.components.length - seqComps.length,
      wireCount: circuit.wires.length,
      inputCount: allInputNames.length,
      outputCount: allOutputNames.length,
      circuitType: 'Sequential',
      feedbackDetected: true,
    },
  };
}
