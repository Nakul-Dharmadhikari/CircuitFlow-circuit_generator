import type { Circuit, CircuitComponent, Pin } from '../../types/circuit';
import type {
  CircuitMetadata,
  ComponentViewState,
  HardwarePlacement,
  HardwareSection,
  LogicalComponent,
  LogicalPort,
  UnifiedCircuit,
} from './types';

/**
 * Converts a Pin with geometry to a pure LogicalPort
 */
export function toLogicalPort(pin: Pin): LogicalPort {
  return {
    id: pin.id,
    name: pin.name,
    type: pin.type,
    value: pin.value,
    inverted: pin.inverted,
    labelPosition: pin.labelPosition,
  };
}

/**
 * Converts a LogicalPort back into a legacy Pin (retaining or defaulting coordinates)
 */
export function toLegacyPin(port: LogicalPort, x = 0, y = 0): Pin {
  return {
    id: port.id,
    name: port.name,
    type: port.type,
    x,
    y,
    value: port.value,
    inverted: port.inverted,
    labelPosition: port.labelPosition,
  };
}

/**
 * Extracts pure logical information from a legacy CircuitComponent
 */
export function toLogicalComponent(comp: CircuitComponent): LogicalComponent {
  return {
    id: comp.id,
    type: comp.type,
    label: comp.label,
    isCustomLabel: comp.isCustomLabel,
    inputs: comp.inputs.map(toLogicalPort),
    outputs: comp.outputs.map(toLogicalPort),
    state: comp.state ? { ...comp.state } : undefined,
    customProps: comp.customProps ? { ...comp.customProps } : undefined,
    customIcId: comp.customIcId,
    customIC: comp.customIC,
  };
}

/**
 * Extracts visual presentation state from a legacy CircuitComponent
 */
export function toComponentViewState(
  comp: CircuitComponent,
  selected = false
): ComponentViewState {
  return {
    compId: comp.id,
    x: comp.x,
    y: comp.y,
    width: comp.width,
    height: comp.height,
    rotation: comp.rotation,
    pins: [...comp.inputs, ...comp.outputs].map((p) => ({ id: p.id, x: p.x, y: p.y })),
    selected,
  };
}

/**
 * Extracts hardware placement metadata from a legacy CircuitComponent
 */
export function toHardwarePlacement(comp: CircuitComponent): HardwarePlacement {
  let section: HardwareSection = 'freeform';
  let hardwareIndex: number | undefined;

  if (comp.customProps?.isTrainerOutput) {
    section = 'top_output';
    hardwareIndex = comp.customProps?.outputIndex;
  } else if (comp.customProps?.isTrainerInput) {
    section = 'bottom_input';
    hardwareIndex = comp.customProps?.inputIndex;
  } else if (comp.customProps?.isTrainerClock || comp.customProps?.isTrainerPulseButton) {
    section = 'clock_section';
  } else if (comp.customProps?.isTrainerVcc) {
    section = 'power_vcc';
  } else if (comp.customProps?.isTrainerGnd) {
    section = 'power_gnd';
  } else if (comp.id.startsWith('trainer_seg_')) {
    section = 'seven_segment';
  } else if (comp.type.startsWith('ic_') || comp.type === 'custom_ic') {
    section = 'ic_base';
  }

  return {
    compId: comp.id,
    isTrainerFixed: Boolean(comp.isTrainerFixed),
    section,
    hardwareIndex,
    terminalLabel: comp.label,
  };
}

/**
 * Losslessly converts a monolithic Circuit into a UnifiedCircuit
 */
export function toUnifiedCircuit(
  legacy: Circuit,
  selectedCompId?: string | null,
  metadata?: Partial<CircuitMetadata>
): UnifiedCircuit {
  const logicalComponents = new Map<string, LogicalComponent>();
  const viewStates = new Map<string, ComponentViewState>();
  const hardwarePlacements = new Map<string, HardwarePlacement>();

  for (const comp of legacy.components) {
    logicalComponents.set(comp.id, toLogicalComponent(comp));
    viewStates.set(
      comp.id,
      toComponentViewState(comp, comp.id === selectedCompId)
    );
    hardwarePlacements.set(comp.id, toHardwarePlacement(comp));
  }

  return {
    id: `unified_${Date.now()}`,
    metadata: {
      name: metadata?.name || 'Untitled Circuit',
      description: metadata?.description || '',
      createdAt: metadata?.createdAt || Date.now(),
      updatedAt: Date.now(),
      version: '1.0.0',
    },
    logicalComponents,
    viewStates,
    hardwarePlacements,
    wires: legacy.wires.map((w) => ({ ...w })),
  };
}

/**
 * Reconstructs a legacy Circuit from UnifiedCircuit to maintain 100% backward compatibility
 * with existing canvas rendering and simulation engines.
 */
export function toLegacyCircuit(unified: UnifiedCircuit): Circuit {
  const components: CircuitComponent[] = [];

  for (const [id, logical] of unified.logicalComponents.entries()) {
    const view = unified.viewStates.get(id) || {
      compId: id,
      x: 0,
      y: 0,
      width: 60,
      height: 40,
    };
    const hw = unified.hardwarePlacements.get(id);

    const pinMap = new Map<string, { x: number; y: number }>();
    if (view.pins) {
      for (const p of view.pins) {
        pinMap.set(p.id, { x: p.x, y: p.y });
      }
    }

    // Reconstruct pin coordinates from logical ports, restoring exact original x, y when available
    const inputs: Pin[] = logical.inputs.map((p, idx) => {
      const pinGeom = pinMap.get(p.id);
      return {
        ...toLegacyPin(p),
        x: pinGeom !== undefined ? pinGeom.x : 0,
        y: pinGeom !== undefined ? pinGeom.y : (idx + 1) * 15,
      };
    });

    const outputs: Pin[] = logical.outputs.map((p, idx) => {
      const pinGeom = pinMap.get(p.id);
      return {
        ...toLegacyPin(p),
        x: pinGeom !== undefined ? pinGeom.x : view.width,
        y: pinGeom !== undefined ? pinGeom.y : (idx + 1) * 15,
      };
    });

    const comp: CircuitComponent = {
      id: logical.id,
      type: logical.type,
      label: logical.label,
      isCustomLabel: logical.isCustomLabel,
      isTrainerFixed: hw?.isTrainerFixed,
      x: view.x,
      y: view.y,
      width: view.width,
      height: view.height,
      rotation: view.rotation,
      inputs,
      outputs,
      state: logical.state ? { ...logical.state } : undefined,
      customProps: logical.customProps ? { ...logical.customProps } : undefined,
      customIcId: logical.customIcId,
      customIC: logical.customIC,
    };

    components.push(comp);
  }

  return {
    components,
    wires: unified.wires.map((w) => ({ ...w })),
  };
}

