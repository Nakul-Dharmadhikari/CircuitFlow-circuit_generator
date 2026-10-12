import type { Circuit, CircuitComponent, Wire } from '../../types/circuit';
import { simulateCircuit } from '../simulator';
import { analyzeCircuitOverview } from './circuitOverview';

export interface DiagnosticIssue {
  id: string;
  code?: string;
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
        code: 'INVALID_WIRE_ENDPOINT',
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
        code: 'INVALID_WIRE_ENDPOINT',
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
          code: 'INVALID_PIN_REFERENCE',
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
          code: 'INVALID_PIN_REFERENCE',
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
    // Sinks, switches, and power rails don't require external inputs
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
          // Unconnected gate inputs float and cause default or indeterminate simulation values
          issues.push({
            id: `floating_input_${c.id}_${pin.id}`,
            code: 'FLOATING_REQUIRED_INPUT',
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
          code: 'MULTI_DRIVER_CONTENTION',
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
      const hasConnection = wires.some((w) => {
        const wAny = w as any;
        const fromId = w.fromCompId || wAny.from?.componentId;
        const fromPId = w.fromPinId || wAny.from?.pinId;
        return fromId === c.id && fromPId === pin.id;
      });
      if (!hasConnection) {
        issues.push({
          id: `unconnected_output_${c.id}_${pin.id}`,
          code: 'UNCONNECTED_OUTPUT',
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

  // 5. Unsupported Components in Digital Logic Analysis
  const KNOWN_DIGITAL_TYPES = new Set([
    'ic_7408', 'ic_7432', 'ic_7404', 'ic_7400', 'ic_7402', 'ic_7486',
    'ic_74151', 'ic_74153', 'ic_74138', 'ic_74139', 'ic_7490', 'ic_7493',
    'ic_7483', 'ic_7485', 'ic_7474', 'ic_7476', 'ic_74194', 'ic_7447', 'ic_555', 'custom_ic',
    'buffer', 'not', 'and', 'and_3', 'or', 'or_3', 'nand', 'nand_3', 'nor', 'nor_3', 'xor', 'xnor', 'tri_state',
    'input_pin', 'output_pin', 'toggle', 'push_button', 'clock', 'vcc', 'gnd', 'junction', 'probe', 'led', 'buzzer',
    'seven_segment', 'seven_seg_display', 'dip_switch', 'bargraph', 'breadboard', 'trainer_socket'
  ]);

  comps.forEach((c) => {
    if (c.type === 'ic_555') {
      issues.push({
        id: `unsupported_comp_${c.id}`,
        code: 'UNSUPPORTED_COMPONENT',
        severity: 'warning',
        category: 'limitation',
        title: `Analog Component in Digital Analysis (${c.label || 'NE555'})`,
        message: `Component "${c.label || 'NE555'}" is an analog RC timer. Static combinational truth table and K-map analysis cannot simulate continuous analog RC dynamics.`,
        affectedComponentId: c.id,
        suggestedAction: 'Use digital clock sources or evaluate timing dynamics using the Timing oscilloscope.',
      });
    } else if (!KNOWN_DIGITAL_TYPES.has(c.type)) {
      issues.push({
        id: `unsupported_unknown_comp_${c.id}`,
        code: 'UNSUPPORTED_COMPONENT',
        severity: 'warning',
        category: 'limitation',
        title: `Unsupported Component Type (${c.type})`,
        message: `Component "${c.label || c.id}" of type "${c.type}" is not supported by digital analysis engines.`,
        affectedComponentId: c.id,
        suggestedAction: 'Replace with supported standard logic gates or DIP ICs.',
      });
    }
  });

  // 6. Custom IC Definition & Pin Mapping Validity
  comps.forEach((c) => {
    if (c.type === 'custom_ic') {
      const customDef = c.customIC || c.customProps?.customIC;
      if (!customDef) {
        issues.push({
          id: `missing_custom_ic_${c.id}`,
          code: 'INVALID_CUSTOM_IC_DEFINITION',
          severity: 'error',
          category: 'configuration',
          title: `Missing Custom IC Definition (${c.label || c.id})`,
          message: `Custom IC "${c.label || c.id}" has no attached internal circuit definition or pin mapping.`,
          affectedComponentId: c.id,
          suggestedAction: 'Open Custom IC Studio to configure and pack this component.',
        });
      } else {
        const internalComps = customDef.internalCircuit?.components || [];
        const internalCompMap = new Map(internalComps.map((ic: CircuitComponent) => [ic.id, ic]));
        (customDef.pins || []).forEach((pinMap: any) => {
          if (pinMap.type === 'input' || pinMap.type === 'output') {
            const intCompId = pinMap.internalComponentId || pinMap.internalCompId;
            if (intCompId && !internalCompMap.has(intCompId)) {
              issues.push({
                id: `invalid_custom_ic_pin_${c.id}_pin_${pinMap.pin}`,
                code: 'INVALID_CUSTOM_IC_PIN_MAPPING',
                severity: 'error',
                category: 'configuration',
                title: `Broken Custom IC Pin Mapping (Pin ${pinMap.pin})`,
                message: `Pin ${pinMap.pin} ("${pinMap.name}") in Custom IC "${customDef.name}" maps to nonexistent internal component "${intCompId}".`,
                affectedComponentId: c.id,
                suggestedAction: 'Edit the Custom IC in Studio and remap external pins to valid internal components.',
              });
            }
          }
        });
      }
    }
  });

  // 6. Detect Contention ('X') or High-Z ('Z') on Wires (from current circuit state and live simulation)
  const checkedWireValues = new Map<string, Wire>();
  wires.forEach((w) => {
    if (w.value === 'X' || w.value === 'Z') {
      checkedWireValues.set(w.id, w);
    }
  });

  try {
    const simResult = simulateCircuit(circuit);
    simResult.circuit.wires.forEach((wire) => {
      if (wire.value === 'X' || wire.value === 'Z') {
        checkedWireValues.set(wire.id, wire);
      }
    });
  } catch (err: any) {
    issues.push({
      id: 'sim_eval_failure',
      code: 'SIMULATION_ERROR',
      severity: 'error',
      category: 'limitation',
      title: 'Simulation Evaluation Error',
      message: `Simulator encountered an error while evaluating circuit state: ${err.message}`,
    });
  }

  checkedWireValues.forEach((wire) => {
    if (wire.value === 'X') {
      issues.push({
        id: `wire_value_contention_${wire.id}`,
        code: 'UNRESOLVED_CONTENTION_X',
        severity: 'error',
        category: 'unresolved',
        title: 'Unresolved Contention Signal ("X")',
        message: `Wire "${wire.id}" is in state 'X' (electrical conflict). Multiple conflicting drivers are driving conflicting logic levels.`,
        affectedWireId: wire.id,
      });
    } else if (wire.value === 'Z') {
      issues.push({
        id: `wire_value_highz_${wire.id}`,
        code: 'FLOATING_HIGH_Z',
        severity: 'info',
        category: 'unresolved',
        title: 'Floating High-Z Signal ("Z")',
        message: `Wire "${wire.id}" is in high-impedance state 'Z'. No active driver is asserting a level on this net.`,
        affectedWireId: wire.id,
      });
    }
  });

  // 7. Analysis Limitations & Feasibility Diagnostics
  const overview = analyzeCircuitOverview(circuit);

  if (overview.circuitType === 'sequential' || overview.clocksCount > 0) {
    issues.push({
      id: 'diag_sequential_advisory',
      code: 'SEQUENTIAL_LIMITATION',
      severity: 'info',
      category: 'limitation',
      title: 'Sequential State Behavior Present',
      message: 'Circuit contains sequential state elements (flip-flops, registers, or clocks). Combinational analysis (Truth Table / K-Map) is state-dependent; use the Sequential State or Timing tabs.',
      suggestedAction: 'Select the Sequential Analysis or Timing Waveform tab to verify clocked state transitions.',
    });
  }

  if (overview.feedbackDetected) {
    issues.push({
      id: 'diag_feedback_advisory',
      code: 'FEEDBACK_LIMITATION',
      severity: 'warning',
      category: 'limitation',
      title: 'Feedback Loop Detected',
      message: 'Feedback loop detected in circuit wiring. Closed cyclic signal paths may introduce state retention, race conditions, or oscillations.',
      suggestedAction: 'Inspect feedback nodes and evaluate dynamics using the Timing Oscilloscope.',
    });
  }

  if (overview.inputs.length > 6) {
    issues.push({
      id: 'diag_large_truth_table',
      code: 'LARGE_TRUTH_TABLE_SIZE',
      severity: 'warning',
      category: 'limitation',
      title: `Large Truth Table (${overview.inputs.length} Inputs, ${Math.pow(2, overview.inputs.length).toLocaleString()} Rows)`,
      message: `Circuit has ${overview.inputs.length} inputs. Full combinational evaluation requires ${Math.pow(2, overview.inputs.length).toLocaleString()} rows. Generation is throttled to prevent UI latency.`,
      suggestedAction: 'Use the Test Bench tab for targeted test vectors or request explicit full generation on demand.',
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
