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
 * Checks whether a given pin exists on a component.
 * Supports exact id, name, and standard pin prefix normalization (e.g. "pin1" vs "1").
 */
function componentHasPin(comp: CircuitComponent, pinId: string): boolean {
  if (!comp) return false;
  // Breadboards, trainer kit components, and custom ICs have dynamic/internal pins
  if (comp.type.startsWith('breadboard') || comp.isTrainerFixed || comp.type === 'custom_ic') {
    return true;
  }

  const cleanPin = pinId.trim();
  const unprefixed = cleanPin.replace(/^pin_?/i, '');

  if (comp.inputs.some((p) => p.id === cleanPin || p.name === cleanPin || p.id.replace(/^pin_?/i, '') === unprefixed)) {
    return true;
  }
  if (comp.outputs.some((p) => p.id === cleanPin || p.name === cleanPin || p.id.replace(/^pin_?/i, '') === unprefixed)) {
    return true;
  }

  return false;
}

/**
 * Validates and sanitizes a raw circuit object or parsed JSON representation.
 * 
 * Rules:
 * 1. Checks structure (components and wires must be arrays).
 * 2. Ambiguous duplicate component IDs with connected wires are REJECTED with actionable diagnostics.
 *    (Unwired duplicates are safely remapped with a warning).
 * 3. Every retained wire connects to valid, existing components and existing pins.
 * 4. Duplicate wire IDs are handled safely: redundant identical endpoints are pruned; distinct wires with duplicate IDs get unique IDs.
 * 5. Non-finite coordinates (NaN/Infinity) are predictably repaired to valid grid coordinates.
 * 6. Normal valid circuits retain their exact topology, IDs, coordinates, and pins unchanged.
 * 7. Never mutates the caller's input object.
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

  const rawWires: any[] = Array.isArray(rawCircuit.wires) ? rawCircuit.wires : [];
  if (!Array.isArray(rawCircuit.wires)) {
    warnings.push('Circuit missing "wires" array; initialized empty wires array.');
    repaired = true;
  }

  // Pre-scan: Detect duplicate component IDs in raw input
  const rawIdCounts = new Map<string, number>();
  for (const rc of rawCircuit.components) {
    if (rc && typeof rc.id === 'string' && rc.id.trim()) {
      const id = rc.id.trim();
      rawIdCounts.set(id, (rawIdCounts.get(id) || 0) + 1);
    }
  }

  // 2. Component Sanitization
  const sanitizedComponents: CircuitComponent[] = [];
  const seenCompIds = new Set<string>();

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
      // Check if any wire connects to this duplicate ID
      const wireReferences = rawWires.filter(
        (w: any) => w && (w.fromCompId === compId || w.toCompId === compId)
      );

      if (wireReferences.length > 0) {
        errors.push(
          `Ambiguous duplicate component ID "${compId}" detected with ${wireReferences.length} connected wire(s). Import rejected because wire associations cannot be resolved unambiguously without risking circuit corruption.`
        );
        continue;
      }

      // If no wires are connected to this duplicate ID, we can safely re-identify the duplicate
      const originalId = compId;
      compId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      warnings.push(`Duplicate component ID "${originalId}" on unwired component safely remapped to "${compId}".`);
      repaired = true;
    }

    seenCompIds.add(compId);

    let type = typeof rawComp.type === 'string' && rawComp.type.trim() ? rawComp.type.trim() : 'and';
    if (type === 'switch') type = 'toggle';
    let x = Number(rawComp.x);
    let y = Number(rawComp.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      x = Math.round((100 + (idx % 5) * 60) / 10) * 10;
      y = Math.round((100 + Math.floor(idx / 5) * 60) / 10) * 10;
      warnings.push(`Repaired non-finite coordinates on component "${compId}" to (${x}, ${y}).`);
      repaired = true;
    }

    // Ensure inputs & outputs arrays
    let inputs: Pin[] = Array.isArray(rawComp.inputs)
      ? rawComp.inputs.map((p: any, pIdx: number) => {
          const pin: Pin = {
            id: typeof p.id === 'string' && p.id ? p.id : `in_${pIdx}`,
            name: typeof p.name === 'string' ? p.name : p.id || `in_${pIdx}`,
            type: 'input' as const,
            x: Number.isFinite(p.x) ? p.x : 0,
            y: Number.isFinite(p.y) ? p.y : 0,
            value: (p.value === '1' || p.value === '0' || p.value === 'Z' || p.value === 'X' ? p.value : '0') as LogicValue,
          };
          if (p.inverted) pin.inverted = true;
          if (p.labelPosition) pin.labelPosition = p.labelPosition;
          return pin;
        })
      : [];

    let outputs: Pin[] = Array.isArray(rawComp.outputs)
      ? rawComp.outputs.map((p: any, pIdx: number) => {
          const pin: Pin = {
            id: typeof p.id === 'string' && p.id ? p.id : `out_${pIdx}`,
            name: typeof p.name === 'string' ? p.name : p.id || `out_${pIdx}`,
            type: 'output' as const,
            x: Number.isFinite(p.x) ? p.x : 0,
            y: Number.isFinite(p.y) ? p.y : 0,
            value: (p.value === '1' || p.value === '0' || p.value === 'Z' || p.value === 'X' ? p.value : '0') as LogicValue,
          };
          if (p.inverted) pin.inverted = true;
          if (p.labelPosition) pin.labelPosition = p.labelPosition;
          return pin;
        })
      : [];

    // If inputs or outputs were missing entirely, create fallback template for component type
    if ((!inputs || inputs.length === 0) && (!outputs || outputs.length === 0)) {
      try {
        const template = createComponent(type as any, x, y, rawComp.label);
        if (template.inputs.length > 0 || template.outputs.length > 0) {
          inputs = template.inputs;
          outputs = template.outputs;
          warnings.push(`Synthesized missing pin definitions for component "${compId}" of type "${type}".`);
          repaired = true;
        } else {
          inputs = [{ id: 'in', name: 'in', type: 'input', x: 0, y: 15, value: '0' }];
          outputs = [{ id: 'out', name: 'out', type: 'output', x: 60, y: 15, value: '0' }];
        }
      } catch {
        inputs = [{ id: 'in', name: 'in', type: 'input', x: 0, y: 15, value: '0' }];
        outputs = [{ id: 'out', name: 'out', type: 'output', x: 60, y: 15, value: '0' }];
      }
    }

    const sanitizedComp: CircuitComponent = {
      ...rawComp,
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
    };
    if (rawComp.isTrainerFixed !== undefined) {
      sanitizedComp.isTrainerFixed = Boolean(rawComp.isTrainerFixed);
    }
    if (typeof rawComp.rotation === 'number') {
      sanitizedComp.rotation = rawComp.rotation;
    }

    sanitizedComponents.push(sanitizedComp);
  }

  // If fatal component errors occurred, reject immediately
  if (errors.length > 0) {
    return {
      isValid: false,
      circuit: { components: sanitizedComponents, wires: [] },
      errors,
      warnings,
      repaired,
    };
  }

  // 3. Wire Sanitization & Pin Integrity
  const sanitizedWires: Wire[] = [];
  const seenWireEndpoints = new Set<string>();
  const seenWireIds = new Set<string>();

  for (let wIdx = 0; wIdx < rawWires.length; wIdx++) {
    const rawWire = rawWires[wIdx];
    if (!rawWire || typeof rawWire !== 'object') {
      warnings.push(`Discarded invalid null wire entry at wire index ${wIdx}.`);
      repaired = true;
      continue;
    }

    let wireId = typeof rawWire.id === 'string' && rawWire.id.trim() ? rawWire.id.trim() : '';

    const fromCompId = String(rawWire.fromCompId || '');
    const toCompId = String(rawWire.toCompId || '');
    const fromPinId = String(rawWire.fromPinId || 'out');
    const toPinId = String(rawWire.toPinId || 'in');

    const fromComp = sanitizedComponents.find((c) => c.id === fromCompId);
    const toComp = sanitizedComponents.find((c) => c.id === toCompId);

    // Check if connected components exist
    if (!fromComp || !toComp) {
      warnings.push(
        `Pruned orphaned wire "${wireId || 'index_' + wIdx}" referencing non-existent component (from="${fromCompId}" exists: ${Boolean(fromComp)}, to="${toCompId}" exists: ${Boolean(toComp)}).`
      );
      repaired = true;
      continue;
    }

    // Check pin existence on both components
    const fromPinValid = componentHasPin(fromComp, fromPinId);
    const toPinValid = componentHasPin(toComp, toPinId);

    if (!fromPinValid || !toPinValid) {
      warnings.push(
        `Pruned malformed wire "${wireId || 'index_' + wIdx}" referencing non-existent pin (${!fromPinValid ? `fromPin "${fromPinId}" missing on ${fromComp.label || fromComp.id}` : ''}${!fromPinValid && !toPinValid ? ', ' : ''}${!toPinValid ? `toPin "${toPinId}" missing on ${toComp.label || toComp.id}` : ''}).`
      );
      repaired = true;
      continue;
    }

    // Check self-loop (same pin or discrete single-gate component connecting to itself)
    const isMultiUnitComp = fromComp.type.startsWith('breadboard') || fromComp.type.startsWith('ic_') || fromComp.type === 'custom_ic';
    if ((fromCompId === toCompId && fromPinId === toPinId) || (fromCompId === toCompId && !isMultiUnitComp)) {
      warnings.push(`Pruned invalid self-loop wire "${wireId || 'index_' + wIdx}" on component "${fromCompId}" (${fromPinId} -> ${toPinId}).`);
      repaired = true;
      continue;
    }

    // Check redundant parallel duplicate wire connecting exact same endpoints
    const wireKey = `${fromCompId}:${fromPinId}->${toCompId}:${toPinId}`;
    if (seenWireEndpoints.has(wireKey)) {
      warnings.push(`Pruned redundant duplicate wire "${wireId || 'index_' + wIdx}" connecting identical endpoints ${wireKey}.`);
      repaired = true;
      continue;
    }
    seenWireEndpoints.add(wireKey);

    // Duplicate wire ID handling
    if (!wireId) {
      wireId = `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      repaired = true;
    } else if (seenWireIds.has(wireId)) {
      const originalWireId = wireId;
      wireId = `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      warnings.push(`Duplicate wire ID "${originalWireId}" remapped to unique ID "${wireId}".`);
      repaired = true;
    }
    seenWireIds.add(wireId);

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
  };
  if (Array.isArray(rawCircuit.trainerBoards)) {
    finalCircuit.trainerBoards = rawCircuit.trainerBoards;
  }

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
