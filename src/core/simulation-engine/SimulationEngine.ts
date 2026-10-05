import type { Circuit, CircuitComponent, LogicValue, SimulationStats } from '../../types/circuit';
import { simulateCircuit, tickClocks } from '../../engine/simulator';

export interface SimulationResult {
  circuit: Circuit;
  cycleDetected: boolean;
  buzzerActive: boolean;
}

export interface SimulationStepResult extends SimulationResult {
  stepCount: number;
}

/**
 * Public SimulationEngine boundary interface
 */
export interface ISimulationEngine {
  runSimulation(circuit: Circuit): SimulationResult;
  stepSimulation(circuit: Circuit): SimulationStepResult;
  resetSimulation(circuit: Circuit): Circuit;
  setInput(circuit: Circuit, compId: string, outputPinId: string, value: LogicValue): SimulationResult;
  toggleInput(circuit: Circuit, compId: string): SimulationResult;
  pulseInput(circuit: Circuit, compId: string, pressed: boolean): SimulationResult;
  getOutput(circuit: Circuit, compId: string, portId?: string): LogicValue | undefined;
  getSignal(circuit: Circuit, compId: string, pinId: string): LogicValue | undefined;
  getStats(): SimulationStats;
}

/**
 * Concrete implementation wrapping the existing multi-pass solver
 */
export class DefaultSimulationEngine implements ISimulationEngine {
  private stepCounter = 0;
  private isRunning = false;
  private clockHz = 1;
  private lastCycleDetected = false;

  public runSimulation(circuit: Circuit): SimulationResult {
    const res = simulateCircuit(circuit);
    this.lastCycleDetected = res.cycleDetected;
    return res;
  }

  public stepSimulation(circuit: Circuit): SimulationStepResult {
    this.stepCounter++;
    const res = tickClocks(circuit);
    this.lastCycleDetected = res.cycleDetected;
    return {
      ...res,
      stepCount: this.stepCounter,
    };
  }

  public resetSimulation(circuit: Circuit): Circuit {
    this.stepCounter = 0;
    // Reset all sequential states and clocks to default
    const resetComps = circuit.components.map((c) => {
      const cloned: CircuitComponent = {
        ...c,
        inputs: c.inputs.map((p) => ({ ...p, value: '0' })),
        outputs: c.outputs.map((p) => ({ ...p, value: '0' })),
        state: c.state ? { ...c.state } : undefined,
      };

      if (cloned.state) {
        if ('q' in cloned.state) cloned.state.q = '0';
        if ('qBar' in cloned.state) cloned.state.qBar = '1';
        if ('prevClock' in cloned.state) cloned.state.prevClock = '0';
        if ('count' in cloned.state) cloned.state.count = 0;
      }
      return cloned;
    });

    const res = simulateCircuit({ ...circuit, components: resetComps });
    return res.circuit;
  }

  public setInput(
    circuit: Circuit,
    compId: string,
    outputPinId: string,
    value: LogicValue
  ): SimulationResult {
    const nextComponents = circuit.components.map((c) => {
      if (c.id === compId) {
        return {
          ...c,
          outputs: c.outputs.map((p) => (p.id === outputPinId ? { ...p, value } : p)),
        };
      }
      return c;
    });

    return simulateCircuit({ ...circuit, components: nextComponents });
  }

  public toggleInput(circuit: Circuit, compId: string): SimulationResult {
    const nextComponents = circuit.components.map((c) => {
      if (c.id === compId) {
        const nextToggle = !c.state?.toggleState;
        return {
          ...c,
          state: { ...c.state, toggleState: nextToggle },
          outputs: c.outputs.map((p) => ({ ...p, value: (nextToggle ? '1' : '0') as LogicValue })),
        };
      }
      return c;
    });

    return simulateCircuit({ ...circuit, components: nextComponents });
  }

  public pulseInput(circuit: Circuit, compId: string, pressed: boolean): SimulationResult {
    const nextComponents = circuit.components.map((c) => {
      if (c.id === compId) {
        return {
          ...c,
          state: { ...c.state, buttonPressed: pressed },
          outputs: c.outputs.map((p) => ({ ...p, value: (pressed ? '1' : '0') as LogicValue })),
        };
      }
      return c;
    });

    return simulateCircuit({ ...circuit, components: nextComponents });
  }

  public getOutput(circuit: Circuit, compId: string, portId = 'out'): LogicValue | undefined {
    const comp = circuit.components.find((c) => c.id === compId);
    if (!comp) return undefined;
    const pin = comp.outputs.find((p) => p.id === portId) || comp.outputs[0];
    return pin?.value;
  }

  public getSignal(circuit: Circuit, compId: string, pinId: string): LogicValue | undefined {
    const comp = circuit.components.find((c) => c.id === compId);
    if (!comp) return undefined;
    const pin =
      comp.outputs.find((p) => p.id === pinId) ||
      comp.inputs.find((p) => p.id === pinId);
    return pin?.value;
  }

  public getStats(): SimulationStats {
    return {
      running: this.isRunning,
      stepCount: this.stepCounter,
      clockHz: this.clockHz,
      activeNets: 0,
      cycleDetected: this.lastCycleDetected,
    };
  }

  public setClockFrequency(hz: number): void {
    this.clockHz = hz;
  }

  public setRunning(running: boolean): void {
    this.isRunning = running;
  }
}

export const simulationEngine = new DefaultSimulationEngine();
