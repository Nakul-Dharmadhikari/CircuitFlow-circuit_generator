/**
 * Schematic view module for freeform unbounded digital logic design.
 * Shares the exact same UnifiedCircuit model and SimulationEngine as the Hardware Lab.
 */
export interface SchematicViewConfig {
  showGrid: boolean;
  snapToGrid: boolean;
  gridPitch: number;
}

export const defaultSchematicConfig: SchematicViewConfig = {
  showGrid: true,
  snapToGrid: true,
  gridPitch: 20,
};
