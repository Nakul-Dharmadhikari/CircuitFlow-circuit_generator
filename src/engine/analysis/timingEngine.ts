import type { Circuit, LogicValue } from '../../types/circuit';
import { simulateCircuit } from '../simulator';

export interface TimingSignalChannel {
  id: string;
  name: string;
  type: 'clock' | 'input' | 'output' | 'state' | 'internal';
  values: LogicValue[]; // One value per discrete simulation step
}

export interface TimingSimulationResult {
  stepCount: number;
  timeUnit: 'step';
  channels: TimingSignalChannel[];
  clockSteps: number[]; // indices where clock had rising edge
  limitationsNote: string;
}

/**
 * Runs a deterministic multi-step discrete timing simulation across T ticks,
 * recording signal waveforms across inputs, outputs, clocks, and internal nodes.
 */
export function runTimingSimulation(
  circuit: Circuit,
  options: {
    steps?: number;
    channelIds?: string[];
    clockPeriodSteps?: number;
  } = {}
): TimingSimulationResult {
  const steps = options.steps || 16;
  const clockPeriod = options.clockPeriodSteps || 2;

  if (!circuit || !circuit.components || circuit.components.length === 0) {
    return {
      stepCount: 0,
      timeUnit: 'step',
      channels: [],
      clockSteps: [],
      limitationsNote: 'Empty circuit. Add components to perform timing analysis.',
    };
  }

  // 1. Identify channels to trace
  const discoveredChannels: Array<{
    id: string;
    name: string;
    type: TimingSignalChannel['type'];
    extractor: (c: Circuit) => LogicValue;
  }> = [];

  circuit.components.forEach((comp) => {
    const label = comp.label || comp.type.toUpperCase();

    if (comp.type === 'clock') {
      discoveredChannels.push({
        id: comp.id,
        name: label,
        type: 'clock',
        extractor: (c) => c.components.find((x) => x.id === comp.id)?.outputs?.[0]?.value || '0',
      });
    } else if (comp.type === 'toggle' || comp.type === 'push_button') {
      discoveredChannels.push({
        id: comp.id,
        name: label,
        type: 'input',
        extractor: (c) => c.components.find((x) => x.id === comp.id)?.outputs?.[0]?.value || '0',
      });
    } else if (comp.type === 'probe' || comp.type === 'led') {
      discoveredChannels.push({
        id: comp.id,
        name: label,
        type: 'output',
        extractor: (c) => c.components.find((x) => x.id === comp.id)?.inputs?.[0]?.value || '0',
      });
    } else if (['d_flipflop', 'jk_flipflop', 't_flipflop', 'counter_4bit'].includes(comp.type)) {
      discoveredChannels.push({
        id: `${comp.id}_Q`,
        name: `${label} (Q)`,
        type: 'state',
        extractor: (c) => {
          const found = c.components.find((x) => x.id === comp.id);
          return found?.outputs?.find((p) => p.name.toLowerCase() === 'q')?.value || found?.state?.q || '0';
        },
      });
    } else if (comp.outputs && comp.outputs.length > 0 && !['vcc', 'gnd', 'junction'].includes(comp.type)) {
      comp.outputs.forEach((pin) => {
        discoveredChannels.push({
          id: `${comp.id}_${pin.id}`,
          name: `${label}_${pin.name}`,
          type: 'internal',
          extractor: (c) => {
            const found = c.components.find((x) => x.id === comp.id);
            return found?.outputs?.find((p) => p.id === pin.id)?.value || '0';
          },
        });
      });
    }
  });

  // Filter channels if specified
  const targetChannels = options.channelIds
    ? discoveredChannels.filter((ch) => options.channelIds!.includes(ch.id))
    : discoveredChannels;

  // Initialize channel buffers
  const channelData: TimingSignalChannel[] = targetChannels.map((ch) => ({
    id: ch.id,
    name: ch.name,
    type: ch.type,
    values: [],
  }));

  const clockSteps: number[] = [];
  let workingCircuit: Circuit = JSON.parse(JSON.stringify(circuit));

  // 2. Step through simulation
  for (let s = 0; s < steps; s++) {
    // Generate clock toggle pattern
    const isClockHigh = Math.floor(s / (clockPeriod / 2)) % 2 === 1;
    const isRisingEdge = s > 0 && isClockHigh && Math.floor((s - 1) / (clockPeriod / 2)) % 2 === 0;

    if (isRisingEdge) clockSteps.push(s);

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

    // Run simulation tick
    const simRes = simulateCircuit(workingCircuit);
    workingCircuit = simRes.circuit;

    // Record sample for each channel
    targetChannels.forEach((ch, idx) => {
      const val = ch.extractor(workingCircuit);
      channelData[idx].values.push(val);
    });
  }

  return {
    stepCount: steps,
    timeUnit: 'step',
    channels: channelData,
    clockSteps,
    limitationsNote:
      'Discrete-step simulation model. CircuitFlow evaluates zero-delay ideal Boolean levels per tick; analog rise/fall times and gate propagation delays are not modeled.',
  };
}
