import type { Circuit, CircuitComponent } from '../../types/circuit';
import { isSequentialCircuit } from '../../utils/customIcSimulator';

export interface ComponentCategoryBreakdown {
  gates: number;
  msi: number;
  sequential: number;
  ics: number;
  customIcs: number;
  io: number;
  wiring: number;
  other: number;
}

export interface InputPinInfo {
  compId: string;
  compLabel: string;
  compType: string;
  pinId: string;
  pinName: string;
  displayName: string;
  isConnected: boolean;
}

export interface OutputPinInfo {
  compId: string;
  compLabel: string;
  compType: string;
  pinId: string;
  pinName: string;
  displayName: string;
  connectedWireCount: number;
}

export interface CircuitOverviewData {
  circuitType: 'combinational' | 'sequential' | 'empty' | 'unconnected';
  totalComponents: number;
  totalWires: number;
  categories: ComponentCategoryBreakdown;
  inputs: InputPinInfo[];
  outputs: OutputPinInfo[];
  clocksCount: number;
  customIcsCount: number;
  trainerBoardsCount: number;
  feedbackDetected: boolean;
  canGenerateTruthTable: boolean;
  canGenerateKMap: boolean;
  truthTableFeasibilityReason?: string;
  summaryText: string;
}

/**
 * Categorizes a component by its role in digital circuits
 */
export function categorizeComponent(comp: CircuitComponent): keyof ComponentCategoryBreakdown {
  const t = comp.type;
  if (['not', 'buffer', 'and', 'and_3', 'or', 'or_3', 'nand', 'nand_3', 'nor', 'nor_3', 'xor', 'xnor', 'tri_state'].includes(t)) {
    return 'gates';
  }
  if (['half_adder', 'full_adder', 'mux_2to1', 'mux_4to1', 'demux_1to2', 'demux_1to4', 'decoder_2to4', 'comparator_4bit', 'priority_encoder_4to2', 'parity_gen'].includes(t)) {
    return 'msi';
  }
  if (['d_flipflop', 'd_flip_flop', 'jk_flipflop', 'jk_flip_flop', 't_flipflop', 't_flip_flop', 'sr_latch', 'd_latch', 'counter_4bit', 'shift_reg_4bit', 'ic_7474', 'ic_7476', 'ic_7490', 'ic_7493', 'ic_74194'].includes(t)) {
    return 'sequential';
  }
  if (t === 'custom_ic') {
    return 'customIcs';
  }
  if (t.startsWith('ic_')) {
    return 'ics';
  }
  if (['toggle', 'push_button', 'clock', 'vcc', 'gnd', 'probe', 'led', 'rgb_led', 'led_bar_4', 'seven_segment', 'hex_display', 'buzzer'].includes(t)) {
    return 'io';
  }
  if (['junction', 'breadboard', 'breadboard_half', 'breadboard_mini'].includes(t)) {
    return 'wiring';
  }
  return 'other';
}

/**
 * Analyzes any unified Circuit (Schematic canvas, Trainer chassis, or Custom IC internal circuit)
 * and extracts verified structural facts and analysis feasibility.
 */
export function analyzeCircuitOverview(circuit: Circuit): CircuitOverviewData {
  if (!circuit || !circuit.components || circuit.components.length === 0) {
    return {
      circuitType: 'empty',
      totalComponents: 0,
      totalWires: 0,
      categories: { gates: 0, msi: 0, sequential: 0, ics: 0, customIcs: 0, io: 0, wiring: 0, other: 0 },
      inputs: [],
      outputs: [],
      clocksCount: 0,
      customIcsCount: 0,
      trainerBoardsCount: 0,
      feedbackDetected: false,
      canGenerateTruthTable: false,
      canGenerateKMap: false,
      truthTableFeasibilityReason: 'The circuit contains no components.',
      summaryText: 'Empty circuit. Place logic gates or components on the canvas to begin analysis.',
    };
  }

  const wires = circuit.wires || [];
  const comps = circuit.components;

  const categories: ComponentCategoryBreakdown = {
    gates: 0,
    msi: 0,
    sequential: 0,
    ics: 0,
    customIcs: 0,
    io: 0,
    wiring: 0,
    other: 0,
  };

  let clocksCount = 0;
  let customIcsCount = 0;

  comps.forEach((c) => {
    const cat = categorizeComponent(c);
    categories[cat]++;
    if (c.type === 'clock') clocksCount++;
    if (c.type === 'custom_ic') customIcsCount++;
  });

  const trainerBoardsCount = circuit.trainerBoards?.length || 0;
  const isSeq = isSequentialCircuit(circuit);

  // Discover inputs
  const inputs: InputPinInfo[] = [];
  const usedInputNames = new Set<string>();

  const getUniqueInputName = (base: string): string => {
    let name = base;
    let idx = 1;
    while (usedInputNames.has(name)) {
      name = `${base}_${idx++}`;
    }
    usedInputNames.add(name);
    return name;
  };

  // 1. Explicit input switches / toggles / buttons
  comps.forEach((c) => {
    if (c.type === 'toggle' || c.type === 'push_button') {
      const label = c.label?.trim() || (c.type === 'toggle' ? 'SW' : 'BTN');
      inputs.push({
        compId: c.id,
        compLabel: c.label || c.type,
        compType: c.type,
        pinId: 'out',
        pinName: 'out',
        displayName: getUniqueInputName(label),
        isConnected: wires.some((w) => (w.fromCompId || (w as any).from?.componentId) === c.id),
      });
    }
  });

  // 2. Open / unrouted logic input pins on components
  comps.forEach((c) => {
    if (['probe', 'led', 'rgb_led', 'led_bar_4', 'seven_segment', 'hex_display', 'buzzer', 'toggle', 'push_button', 'clock', 'vcc', 'gnd', 'junction'].includes(c.type)) {
      return;
    }
    c.inputs?.forEach((pin) => {
      const isConnected = wires.some((w) => {
        const wAny = w as any;
        const toId = w.toCompId || wAny.to?.componentId;
        const toPin = w.toPinId || wAny.to?.pinId;
        return toId === c.id && toPin === pin.id;
      });
      if (!isConnected) {
        const baseName = comps.length === 1 ? pin.name : `${c.label || c.type.toUpperCase()}_${pin.name}`;
        inputs.push({
          compId: c.id,
          compLabel: c.label || c.type,
          compType: c.type,
          pinId: pin.id,
          pinName: pin.name,
          displayName: getUniqueInputName(baseName),
          isConnected: false,
        });
      }
    });
  });

  // Discover outputs
  const outputs: OutputPinInfo[] = [];
  const usedOutputNames = new Set<string>();

  const getUniqueOutputName = (base: string): string => {
    let name = base;
    let idx = 1;
    while (usedOutputNames.has(name)) {
      name = `${base}_${idx++}`;
    }
    usedOutputNames.add(name);
    return name;
  };

  // 1. Explicit probes / LEDs
  comps.forEach((c) => {
    if (c.type === 'probe' || c.type === 'led' || c.type === 'buzzer') {
      const label = c.label?.trim() || (c.type === 'probe' ? 'PROBE' : 'OUT');
      outputs.push({
        compId: c.id,
        compLabel: c.label || c.type,
        compType: c.type,
        pinId: 'in',
        pinName: 'in',
        displayName: getUniqueOutputName(label),
        connectedWireCount: wires.filter((w) => (w.toCompId || (w as any).to?.componentId) === c.id).length,
      });
    }
  });

  // 2. Terminal outputs on logic components
  comps.forEach((c) => {
    if (['toggle', 'push_button', 'clock', 'vcc', 'gnd', 'junction', 'probe', 'led', 'buzzer'].includes(c.type)) {
      return;
    }
    c.outputs?.forEach((pin) => {
      const driverWires = wires.filter((w) => {
        const wAny = w as any;
        const fromId = w.fromCompId || wAny.from?.componentId;
        const fromPin = w.fromPinId || wAny.from?.pinId;
        return fromId === c.id && fromPin === pin.id;
      });
      if (driverWires.length === 0) {
        const baseName = comps.length === 1 && c.outputs.length === 1 ? pin.name : `${c.label || c.type.toUpperCase()}${c.outputs.length > 1 ? `_${pin.name}` : ''}`;
        outputs.push({
          compId: c.id,
          compLabel: c.label || c.type,
          compType: c.type,
          pinId: pin.id,
          pinName: pin.name,
          displayName: getUniqueOutputName(baseName),
          connectedWireCount: 0,
        });
      }
    });
  });

  // Fallback: If no dedicated output pins found, expose all gate outputs
  if (outputs.length === 0) {
    comps.forEach((c) => {
      if (c.outputs?.length > 0 && !['toggle', 'push_button', 'clock'].includes(c.type)) {
        c.outputs.forEach((pin) => {
          outputs.push({
            compId: c.id,
            compLabel: c.label || c.type,
            compType: c.type,
            pinId: pin.id,
            pinName: pin.name,
            displayName: getUniqueOutputName(`${c.label || c.type.toUpperCase()}_${pin.name}`),
            connectedWireCount: wires.filter((w) => w.fromCompId === c.id && w.fromPinId === pin.id).length,
          });
        });
      }
    });
  }

  // Detect simple feedback (cycles in directed graph)
  const feedbackDetected = detectFeedback(comps, wires);

  // Circuit classification
  let circuitType: 'combinational' | 'sequential' | 'unconnected' = 'combinational';
  if (isSeq || feedbackDetected) {
    circuitType = 'sequential';
  } else if (wires.length === 0 && comps.length > 1 && inputs.length === 0) {
    circuitType = 'unconnected';
  }

  // Truth table & K-Map feasibility
  let canGenerateTruthTable = true;
  let canGenerateKMap = true;
  let truthTableFeasibilityReason: string | undefined = undefined;

  if (inputs.length === 0) {
    canGenerateTruthTable = false;
    canGenerateKMap = false;
    truthTableFeasibilityReason = 'No inputs detected. Add toggle switches or logic gates with open inputs.';
  } else if (outputs.length === 0) {
    canGenerateTruthTable = false;
    canGenerateKMap = false;
    truthTableFeasibilityReason = 'No outputs detected. Connect probes, LEDs, or leave logic gate outputs unrouted.';
  } else if (circuitType === 'sequential') {
    canGenerateTruthTable = false;
    canGenerateKMap = false;
    truthTableFeasibilityReason = 'Circuit contains sequential state elements or feedback. Truth tables and Karnaugh maps require combinational circuits. Use Sequential State or Timing Analysis.';
  } else if (inputs.length > 12) {
    canGenerateTruthTable = false;
    canGenerateKMap = false;
    truthTableFeasibilityReason = `Circuit has ${inputs.length} inputs requiring ${Math.pow(2, inputs.length).toLocaleString()} rows. Truth table generation exceeds safe browser limits (> 4,096 rows). Use Test Bench or Timing Analysis.`;
  } else if (inputs.length < 2 || inputs.length > 6) {
    canGenerateKMap = false;
  }

  const summaryText = `${circuitType === 'sequential' ? 'Sequential' : 'Combinational'} circuit with ${comps.length} component${comps.length === 1 ? '' : 's'}, ${wires.length} wire${wires.length === 1 ? '' : 's'}, ${inputs.length} input${inputs.length === 1 ? '' : 's'}, and ${outputs.length} output${outputs.length === 1 ? '' : 's'}.`;

  return {
    circuitType,
    totalComponents: comps.length,
    totalWires: wires.length,
    categories,
    inputs,
    outputs,
    clocksCount,
    customIcsCount,
    trainerBoardsCount,
    feedbackDetected,
    canGenerateTruthTable,
    canGenerateKMap,
    truthTableFeasibilityReason,
    summaryText,
  };
}

/**
 * Checks for direct or indirect feedback loops in circuit wiring
 */
function detectFeedback(components: CircuitComponent[], wires: Circuit['wires']): boolean {
  const adj = new Map<string, Set<string>>();
  components.forEach((c) => adj.set(c.id, new Set()));

  wires.forEach((w) => {
    const wAny = w as any;
    const fromId = w.fromCompId || wAny.from?.componentId;
    const toId = w.toCompId || wAny.to?.componentId;
    if (fromId && toId && fromId !== toId) {
      if (!adj.has(fromId)) adj.set(fromId, new Set());
      adj.get(fromId)!.add(toId);
    }
  });

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function hasCycle(node: string): boolean {
    visited.add(node);
    inStack.add(node);

    const neighbors = adj.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (inStack.has(neighbor)) {
          return true;
        }
      }
    }

    inStack.delete(node);
    return false;
  }

  for (const comp of components) {
    if (!visited.has(comp.id)) {
      if (hasCycle(comp.id)) return true;
    }
  }

  return false;
}
