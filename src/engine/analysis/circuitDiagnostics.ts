import type { Circuit, CircuitComponent, Wire } from '../../types/circuit';
import { simulateCircuit } from '../simulator';

export interface DiagnosticIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: 'connectivity' | 'contention' | 'unresolved' | 'configuration' | 'limitation';
  title: string;
  message: string;
  affectedComponentId?: string;
  affectedPinId?: string;
  affectedWireId?: string;
  suggestedAction?: string;
}

export interface CircuitDiagnosticsResult {
  hasErrors: boolean;
  hasWarnings: boolean;
  errorsCount: number;
  warningsCount: number;
  infosCount: number;
  issues: DiagnosticIssue[];
}

/**
 * Performs deep sanity, electrical, and topological diagnostics on a circuit.
 */
export function runCircuitDiagnostics(circuit: Circuit): CircuitDiagnosticsResult {
  const issues: DiagnosticIssue[] = [];

  if (!circuit || !circuit.components || circuit.components.length === 0) {
    issues.push({
      id: 'diag_empty_circuit',
      severity: 'info',
      category: 'connectivity',
      title: 'Empty Canvas',
      message: 'The workspace contains no components to diagnose.',
      suggestedAction: 'Add digital logic gates or ICs from the component drawer.',
    });
    return {
      hasErrors: false,
      hasWarnings: false,
      errorsCount: 0,
      warningsCount: 0,
      infosCount: 1,
      issues,
    };
  }

  const comps = circuit.components;
  const wires = circuit.wires || [];
  const compMap = new Map<string, CircuitComponent>();
  comps.forEach((c) => compMap.set(c.id, c));

  // 1. Invalid Wire Endpoint References
  wires.forEach((wire) => {
    const wireAny = wire as any;
    const fromCompId = wire.fromCompId || wireAny.from?.componentId || '';
    const toCompId = wire.toCompId || wireAny.to?.componentId || '';
    const fromPinId = wire.fromPinId || wireAny.from?.pinId || '';
    const toPinId = wire.toPinId || wireAny.to?.pinId || '';

    const fromComp = compMap.get(fromCompId);
    const toComp = compMap.get(toCompId);

    if (!fromComp) {
      issues.push({
        id: `wire_missing_src_${wire.id}`,
        severity: 'error',
        category: 'connectivity',
        title: 'Broken Wire Source',
        message: `Wire "${wire.id}" references deleted or nonexistent source component "${fromCompId}".`,
        affectedWireId: wire.id,
        suggestedAction: 'Delete the orphaned wire or reconnect it to a valid component output.',
      });
    }

    if (!toComp) {
      issues.push({
        id: `wire_missing_dst_${wire.id}`,
        severity: 'error',
        category: 'connectivity',
        title: 'Broken Wire Destination',
        message: `Wire "${wire.id}" references deleted or nonexistent target component "${toCompId}".`,
        affectedWireId: wire.id,
        suggestedAction: 'Delete the orphaned wire or reconnect it to a valid component input.',
      });
    }

    if (fromComp) {
      const fromPin = [...(fromComp.outputs || []), ...(fromComp.inputs || [])].find((p) => p.id === fromPinId);
      if (!fromPin) {
        issues.push({
          id: `wire_missing_from_pin_${wire.id}`,
          severity: 'error',
          category: 'connectivity',
          title: 'Invalid Pin Connection',
          message: `Wire "${wire.id}" references nonexistent pin "${fromPinId}" on "${fromComp.label || fromComp.id}".`,
          affectedComponentId: fromComp.id,
          affectedWireId: wire.id,
        });
      }
    }

    if (toComp) {
      const toPin = [...(toComp.inputs || []), ...(toComp.outputs || [])].find((p) => p.id === toPinId);
      if (!toPin) {
        issues.push({
          id: `wire_missing_to_pin_${wire.id}`,
          severity: 'error',
          category: 'connectivity',
          title: 'Invalid Pin Connection',
          message: `Wire "${wire.id}" references nonexistent pin "${toPinId}" on "${toComp.label || toComp.id}".`,
          affectedComponentId: toComp.id,
          affectedWireId: wire.id,
        });
      }
    }
  });

  // 2. Floating / Disconnected Required Gate Inputs
  comps.forEach((c) => {
    // Sinks and power rails don't require external inputs
    if (['probe', 'led', 'buzzer', 'toggle', 'push_button', 'clock', 'vcc', 'gnd', 'junction', 'breadboard'].includes(c.type)) {
      return;
    }

    const isGate = ['not', 'buffer', 'and', 'and_3', 'or', 'or_3', 'nand', 'nand_3', 'nor', 'nor_3', 'xor', 'xnor'].includes(c.type);

    c.inputs?.forEach((pin) => {
      const hasConnection = wires.some((w) => {
        const wAny = w as any;
        const toId = w.toCompId || wAny.to?.componentId;
        const toPId = w.toPinId || wAny.to?.pinId;
        return toId === c.id && toPId === pin.id;
      });
      if (!hasConnection) {
        if (isGate) {
          // Unconnected gate inputs will float and cause unpredictable or default simulation values
          issues.push({
            id: `floating_input_${c.id}_${pin.id}`,
            severity: 'warning',
            category: 'connectivity',
            title: `Floating Input Pin (${pin.name})`,
            message: `Input "${pin.name}" on ${c.label || c.type.toUpperCase()} is disconnected. In TTL digital logic, floating inputs may produce indeterminate behavior.`,
            affectedComponentId: c.id,
            affectedPinId: pin.id,
            suggestedAction: 'Connect to an input switch, logic gate output, VCC (HIGH), or GND (LOW).',
          });
        }
      }
    });
  });

  // 3. Multi-Driver Contention (Multiple outputs driving the same input node)
  const inputPinDrivers = new Map<string, Wire[]>();
  wires.forEach((w) => {
    const wAny = w as any;
    const toId = w.toCompId || wAny.to?.componentId || '';
    const toPId = w.toPinId || wAny.to?.pinId || '';
    const key = `${toId}:${toPId}`;
    if (!inputPinDrivers.has(key)) {
      inputPinDrivers.set(key, []);
    }
    inputPinDrivers.get(key)!.push(w);
  });

  inputPinDrivers.forEach((driverWires, pinKey) => {
    if (driverWires.length > 1) {
      const [compId, pinId] = pinKey.split(':');
      const targetComp = compMap.get(compId);
      const targetPin = targetComp?.inputs?.find((p) => p.id === pinId);

      // Check if driver wires originate from different components/pins
      const uniqueSources = new Set(
        driverWires.map((w) => {
          const wAny = w as any;
          return `${w.fromCompId || wAny.from?.componentId}:${w.fromPinId || wAny.from?.pinId}`;
        })
      );
      if (uniqueSources.size > 1) {
        issues.push({
          id: `contention_${pinKey}`,
          severity: 'error',
          category: 'contention',
          title: 'Bus Driver Contention Detected',
          message: `Pin "${targetPin?.name || pinId}" on "${targetComp?.label || compId}" is driven by ${uniqueSources.size} distinct outputs simultaneously. Conflicting active signals cause short circuits and 'X' logic contention.`,
          affectedComponentId: compId,
          affectedPinId: pinId,
          suggestedAction: 'Use tri-state bus buffers (74125/74126) or a multiplexer instead of tying outputs directly together.',
        });
      }
    }
  });

  // 4. Unconnected Gate Outputs (Informational)
  comps.forEach((c) => {
    if (['toggle', 'push_button', 'clock', 'vcc', 'gnd', 'junction', 'probe', 'led', 'buzzer'].includes(c.type)) {
      return;
    }

    c.outputs?.forEach((pin) => {
      const hasConnection = wires.some((w) => w.fromCompId === c.id && w.fromPinId === pin.id);
      if (!hasConnection) {
        issues.push({
          id: `unconnected_output_${c.id}_${pin.id}`,
          severity: 'info',
          category: 'connectivity',
          title: `Unconnected Output (${pin.name})`,
          message: `Output "${pin.name}" on ${c.label || c.type.toUpperCase()} is not connected to any downstream destination or probe.`,
          affectedComponentId: c.id,
          affectedPinId: pin.id,
          suggestedAction: 'Connect to an LED, probe, or another gate input to observe the signal.',
        });
      }
    });
  });

  // 5. Run Live Simulation to Detect Contention ('X') or High-Z ('Z') on Wires
  try {
    const simResult = simulateCircuit(circuit);
    simResult.circuit.wires.forEach((wire) => {
      if (wire.value === 'X') {
        issues.push({
          id: `wire_value_contention_${wire.id}`,
          severity: 'error',
          category: 'unresolved',
          title: 'Unresolved Contention Signal ("X")',
          message: `Wire "${wire.id}" is in state 'X' (electrical conflict). Multiple conflicting drivers are driving conflicting logic levels.`,
          affectedWireId: wire.id,
        });
      } else if (wire.value === 'Z') {
        issues.push({
          id: `wire_value_highz_${wire.id}`,
          severity: 'info',
          category: 'unresolved',
          title: 'Floating High-Z Signal ("Z")',
          message: `Wire "${wire.id}" is in high-impedance state 'Z'. No active driver is asserting a level on this net.`,
          affectedWireId: wire.id,
        });
      }
    });
  } catch (err: any) {
    issues.push({
      id: 'sim_eval_failure',
      severity: 'error',
      category: 'limitation',
      title: 'Simulation Evaluation Error',
      message: `Simulator encountered an error while evaluating circuit state: ${err.message}`,
    });
  }

  const errorsCount = issues.filter((i) => i.severity === 'error').length;
  const warningsCount = issues.filter((i) => i.severity === 'warning').length;
  const infosCount = issues.filter((i) => i.severity === 'info').length;

  return {
    hasErrors: errorsCount > 0,
    hasWarnings: warningsCount > 0,
    errorsCount,
    warningsCount,
    infosCount,
    issues,
  };
}
