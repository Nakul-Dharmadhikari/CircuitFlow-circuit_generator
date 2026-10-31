// Core domain types re-exported from current types definition
export type {
  LogicValue,
  PinType,
  Pin,
  ComponentCategory,
  ComponentType,
  CustomICPinMapping,
  CustomICDefinition,
  User,
  SavedCircuit,
  CircuitComponent,
  Wire,
  Circuit,
  WaveformChannel,
  WaveformSample,
  SimulationStats,
} from '../../types/circuit';

// Domain model separation types (Part 3)
export * from '../circuit-model/types';
