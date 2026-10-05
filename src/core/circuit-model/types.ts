import type { ComponentType, CustomICDefinition, LogicValue, PinType, Wire } from '../../types/circuit';

/**
 * Circuit metadata (name, description, timestamp)
 */
export interface CircuitMetadata {
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  version?: string;
}

/**
 * Electrical node / connected net representing an equipotential branch
 */
export interface LogicalNet {
  id: number;
  pins: string[]; // "compId:pinId"
  value: LogicValue;
  wireIds?: string[];
}

/**
 * Logical port represents a pure electrical terminal (without canvas coordinates)
 */
export interface LogicalPort {
  id: string;
  name: string;
  type: PinType;
  value: LogicValue;
  inverted?: boolean;
  labelPosition?: 'left' | 'right' | 'top' | 'bottom';
  bitWidth?: number;
}

/**
 * Pure Logical Component decoupled from UI rendering & screen coordinates
 */
export interface LogicalComponent {
  id: string;
  type: ComponentType;
  label: string;
  isCustomLabel?: boolean;
  inputs: LogicalPort[];
  outputs: LogicalPort[];
  state?: Record<string, any>;
  customProps?: Record<string, any>;
  customIcId?: string;
  customIC?: CustomICDefinition;
}

/**
 * Visual View State representing component presentation on a canvas
 */
export interface ComponentViewState {
  compId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: 0 | 90 | 180 | 270;
  pins?: { id: string; x: number; y: number }[];
  selected?: boolean;
  zIndex?: number;
  visualMetadata?: Record<string, any>;
}

/**
 * Hardware / DELDSIM Trainer Kit placement metadata
 */
export type HardwareSection =
  | 'top_output'
  | 'ic_base'
  | 'bottom_input'
  | 'clock_section'
  | 'power_vcc'
  | 'power_gnd'
  | 'seven_segment'
  | 'freeform';

export interface HardwarePlacement {
  compId: string;
  isTrainerFixed: boolean;
  section: HardwareSection;
  socketIndex?: number; // 0, 1, 2 for the 3 horizontal DIP-20 sockets
  hardwareIndex?: number; // 0..15 for the 16 outputs / 16 inputs
  terminalLabel?: string;
}

/**
 * Unified Circuit representation separating logic, layout, hardware metadata, and nets
 */
export interface UnifiedCircuit {
  id?: string;
  metadata?: CircuitMetadata;
  logicalComponents: Map<string, LogicalComponent>;
  viewStates: Map<string, ComponentViewState>;
  hardwarePlacements: Map<string, HardwarePlacement>;
  wires: Wire[];
  nets?: LogicalNet[];
  subcircuits?: Map<string, CustomICDefinition>;
}

