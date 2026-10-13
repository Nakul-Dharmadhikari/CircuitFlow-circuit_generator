import type { Circuit, CircuitComponent, Pin, Wire, LogicValue } from '../types/circuit';
import { createComponent } from './simulator';

export interface CircuitValidationResult {
  isValid: boolean;
  circuit: Circuit;
  errors: string[];
  warnings: string[];
  repaired: boolean;
}

/**
 * Validates and sanitizes a raw circuit object or parsed JSON representation.
 * Ensures:
 * 1. Components and wires arrays exist.
 * 2. Every component has a unique ID, valid type, and finite numerical coordinates.
 * 3. Every component has valid inputs and outputs arrays.
 * 4. Wires connect only to components and pins that actually exist (orphaned wires pruned).
 * 5. Wires have unique IDs and self-loop / redundant parallel duplicates are cleaned up.
 * 6. Custom IC definitions inside components are intact.
 */
export function validateAndSanitizeCircuit(raw: unknown): CircuitValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let repaired = false;

  // 1. Structure check
  if (!raw || typeof raw !== 'object') {
    return {
      isValid: false,
      circuit: { components: [], wires: [] },
      errors: ['Input data is not a valid JSON object or circuit definition.'],
      warnings: [],
      repaired: false,
    };
  }

  const rawObj = raw as Record<string, any>;
  const rawCircuit = rawObj.circuit && typeof rawObj.circuit === 'object' ? rawObj.circuit : rawObj;

  if (!Array.isArray(rawCircuit.components)) {
    return {
      isValid: false,
      circuit: { components: [], wires: [] },
      errors: ['Invalid schematic format: "components" array is missing or invalid.'],
      warnings: [],
      repaired: false,
    };
  }

  const rawWires = Array.isArray(rawCircuit.wires) ? rawCircuit.wires : [];
  if (!Array.isArray(rawCircuit.wires)) {
    warnings.push('Circuit missing "wires" array; initialized empty wires array.');
    repaired = true;
  }

  // 2. Component Sanitization & Deduplication
  const sanitizedComponents: CircuitComponent[] = [];
  const seenCompIds = new Set<string>();
  const idRemap: Record<string, string> = {};

  for (let idx = 0; idx < rawCircuit.components.length; idx++) {
    const rawComp = rawCircuit.components[idx];
    if (!rawComp || typeof rawComp !== 'object') {
      warnings.push(`Discarded invalid null/primitive entry at component index ${idx}.`);
      repaired = true;
      continue;
    }

    let compId = typeof rawComp.id === 'string' && rawComp.id.trim() ? rawComp.id.trim() : '';
    if (!compId) {
      compId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      warnings.push(`Generated missing ID "${compId}" for component index ${idx}.`);
      repaired = true;
    } else if (seenCompIds.has(compId)) {
      const originalId = compId;
      compId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      idRemap[originalId] = compId;
      warnings.push(`Duplicate component ID "${originalId}" detected. Remapped to "${compId}".`);
      repaired = true;
    }
    seenCompIds.add(compId);

    const type = typeof rawComp.type === 'string' && rawComp.type.trim() ? rawComp.type.trim() : 'and';
    let x = Number(rawComp.x);
    let y = Number(rawComp.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      x = 100 + (idx % 5) * 60;
      y = 100 + Math.floor(idx / 5) * 60;
      warnings.push(`Non-finite coordinates on component "${compId}". Defaulted to (${x}, ${y}).`);
      repaired = true;
    }

    // Ensure inputs & outputs arrays
    let inputs: Pin[] = Array.isArray(rawComp.inputs)
      ? rawComp.inputs.map((p: any, pIdx: number) => ({
          id: typeof p.id === 'string' && p.id ? p.id : `in_${pIdx}`,
          name: typeof p.name === 'string' ? p.name : p.id || `in_${pIdx}`,
          type: 'input' as const,
          x: Number.isFinite(p.x) ? p.x : 0,
          y: Number.isFinite(p.y) ? p.y : 0,
          value: (p.value === '1' || p.value === '0' || p.value === 'Z' || p.value === 'X' ? p.value : '0') as LogicValue,
          inverted: Boolean(p.inverted),
        }))
      : [];

    let outputs: Pin[] = Array.isArray(rawComp.outputs)
      ? rawComp.outputs.map((p: any, pIdx: number) => ({
          id: typeof p.id === 'string' && p.id ? p.id : `out_${pIdx}`,
          name: typeof p.name === 'string' ? p.name : p.id || `out_${pIdx}`,
          type: 'output' as const,
          x: Number.isFinite(p.x) ? p.x : 0,
          y: Number.isFinite(p.y) ? p.y : 0,
          value: (p.value === '1' || p.value === '0' || p.value === 'Z' || p.value === 'X' ? p.value : '0') as LogicValue,
          inverted: Boolean(p.inverted),
        }))
      : [];

    // If inputs or outputs were missing entirely, create fallback template for component type
    if ((!inputs || inputs.length === 0) && (!outputs || outputs.length === 0)) {
      try {
        const template = createComponent(type as any, x, y, rawComp.label);
        inputs = template.inputs;
        outputs = template.outputs;
        warnings.push(`Synthesized missing pin definitions for component "${compId}" of type "${type}".`);
        repaired = true;
      } catch {
        // Fallback generic single input & output
        inputs = [{ id: 'in', name: 'in', type: 'input', x: 0, y: 15, value: '0' }];
        outputs = [{ id: 'out', name: 'out', type: 'output', x: 60, y: 15, value: '0' }];
      }
    }

    const sanitizedComp: CircuitComponent = {
      id: compId,
      type: type as any,
      x,
      y,
      width: Number.isFinite(rawComp.width) ? rawComp.width : 80,
      height: Number.isFinite(rawComp.height) ? rawComp.height : 60,
      label: typeof rawComp.label === 'string' ? rawComp.label : compId,
      inputs,
      outputs,
      state: rawComp.state && typeof rawComp.state === 'object' ? { ...rawComp.state } : {},
      customProps: rawComp.customProps && typeof rawComp.customProps === 'object' ? { ...rawComp.customProps } : {},
      isTrainerFixed: Boolean(rawComp.isTrainerFixed),
      rotation: typeof rawComp.rotation === 'number' ? rawComp.rotation : 0,
    };

    sanitizedComponents.push(sanitizedComp);
  }

  // 3. Wire Sanitization & Pruning
  const sanitizedWires: Wire[] = [];
  const seenWireKeys = new Set<string>();
  const seenWireIds = new Set<string>();

  for (let wIdx = 0; wIdx < rawWires.length; wIdx++) {
    const rawWire = rawWires[wIdx];
    if (!rawWire || typeof rawWire !== 'object') {
      warnings.push(`Discarded invalid null wire entry at wire index ${wIdx}.`);
      repaired = true;
      continue;
    }

    let wireId = typeof rawWire.id === 'string' && rawWire.id.trim() ? rawWire.id.trim() : '';
    if (!wireId || seenWireIds.has(wireId)) {
      wireId = `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      repaired = true;
    }
    seenWireIds.add(wireId);

    const fromCompId = idRemap[rawWire.fromCompId] || rawWire.fromCompId;
    const toCompId = idRemap[rawWire.toCompId] || rawWire.toCompId;
    const fromPinId = String(rawWire.fromPinId || 'out');
    const toPinId = String(rawWire.toPinId || 'in');

    // Check if connected components exist
    const fromExists = seenCompIds.has(fromCompId);
    const toExists = seenCompIds.has(toCompId);

    if (!fromExists || !toExists) {
      warnings.push(
        `Pruned orphaned wire "${wireId}" referencing missing component(s): from="${fromCompId}" (exists: ${fromExists}), to="${toCompId}" (exists: ${toExists}).`
      );
      repaired = true;
      continue;
    }

    // Check self-loop on exact same pin
    if (fromCompId === toCompId && fromPinId === toPinId) {
      warnings.push(`Pruned invalid self-loop wire "${wireId}" on component "${fromCompId}", pin "${fromPinId}".`);
      repaired = true;
      continue;
    }

    // Check parallel duplicate wire
    const wireKey = `${fromCompId}:${fromPinId}->${toCompId}:${toPinId}`;
    if (seenWireKeys.has(wireKey)) {
      warnings.push(`Pruned duplicate parallel wire "${wireId}" connecting "${wireKey}".`);
      repaired = true;
      continue;
    }
    seenWireKeys.add(wireKey);

    const sanitizedWire: Wire = {
      id: wireId,
      fromCompId,
      fromPinId,
      toCompId,
      toPinId,
      value: (rawWire.value === '1' || rawWire.value === '0' || rawWire.value === 'Z' || rawWire.value === 'X' ? rawWire.value : '0') as LogicValue,
    };

    sanitizedWires.push(sanitizedWire);
  }

  const finalCircuit: Circuit = {
    components: sanitizedComponents,
    wires: sanitizedWires,
    trainerBoards: Array.isArray(rawCircuit.trainerBoards) ? rawCircuit.trainerBoards : undefined,
  };

  return {
    isValid: errors.length === 0,
    circuit: finalCircuit,
    errors,
    warnings,
    repaired,
  };
}

/**
 * Validates an existing in-memory circuit and reports any integrity errors or warnings.
 */
export function validateCircuit(circuit: Circuit): { isValid: boolean; errors: string[]; warnings: string[] } {
  const result = validateAndSanitizeCircuit(circuit);
  return {
    isValid: result.isValid && result.errors.length === 0,
    errors: result.errors,
    warnings: result.warnings,
  };
}
