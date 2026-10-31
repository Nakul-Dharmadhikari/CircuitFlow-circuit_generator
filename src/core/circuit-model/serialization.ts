import type { Circuit } from '../../types/circuit';
import type { CircuitMetadata, UnifiedCircuit } from './types';
import { toLegacyCircuit, toUnifiedCircuit } from './adapters';

export interface SerializedCircuitEnvelope {
  format: 'circuitflow_unified_v1';
  metadata: CircuitMetadata;
  circuit: {
    components: any[];
    wires: any[];
  };
}

/**
 * Serializes a Circuit losslessly into a standardized JSON string
 */
export function serializeUnifiedCircuit(
  circuit: Circuit,
  metadata?: Partial<CircuitMetadata>
): string {
  const meta: CircuitMetadata = {
    name: metadata?.name || 'Untitled Circuit',
    description: metadata?.description || '',
    createdAt: metadata?.createdAt || Date.now(),
    updatedAt: Date.now(),
    version: '1.0.0',
  };

  const envelope: SerializedCircuitEnvelope = {
    format: 'circuitflow_unified_v1',
    metadata: meta,
    circuit: {
      components: circuit.components.map((c) => ({ ...c })),
      wires: circuit.wires.map((w) => ({ ...w })),
    },
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Deserializes JSON string into a valid Circuit, handling both legacy and unified envelope formats
 */
export function deserializeUnifiedCircuit(
  jsonString: string
): { circuit: Circuit; unified: UnifiedCircuit; metadata: CircuitMetadata } {
  const parsed = JSON.parse(jsonString);

  let rawCircuit: Circuit;
  let metadata: CircuitMetadata;

  if (parsed && parsed.format === 'circuitflow_unified_v1' && parsed.circuit) {
    rawCircuit = parsed.circuit;
    metadata = parsed.metadata || {
      name: 'Loaded Circuit',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } else if (parsed && Array.isArray(parsed.components) && Array.isArray(parsed.wires)) {
    // Legacy direct Circuit object
    rawCircuit = parsed as Circuit;
    metadata = {
      name: 'Imported Circuit',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } else {
    throw new Error('Invalid circuit file format: missing components or wires');
  }

  const unified = toUnifiedCircuit(rawCircuit);
  const normalizedCircuit = toLegacyCircuit(unified);

  return {
    circuit: normalizedCircuit,
    unified,
    metadata,
  };
}
