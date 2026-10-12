import type { Circuit, CircuitComponent, CustomICDefinition, CustomICPinMapping } from '../types/circuit';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validates a Custom IC definition against CircuitFlow Phase 7 specifications.
 * Checks identity, pin numbers, internal circuit topology, pin mappings, and circular dependencies.
 */
export function validateCustomIC(
  ic: Partial<CustomICDefinition>,
  existingLibrary?: CustomICDefinition[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // 1. Identity & Package
  if (!ic.name || ic.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Custom IC must have a non-empty name.', severity: 'error' });
  }

  const partNumber = ic.partNumber?.trim() || ic.code?.trim();
  if (!partNumber || partNumber.length === 0) {
    errors.push({ field: 'partNumber', message: 'Custom IC must have a part number or code (e.g. 74MY01).', severity: 'error' });
  }

  const pinCount = ic.pinCount;
  if (pinCount !== 14 && pinCount !== 16 && pinCount !== 20) {
    errors.push({ field: 'pinCount', message: 'Package pin count must be 14, 16, or 20 DIP pins.', severity: 'error' });
  }

  const vccPin = ic.vccPin ?? pinCount;
  const gndPin = ic.gndPin ?? (pinCount ? Math.floor(pinCount / 2) : 10);

  if (vccPin && pinCount && (vccPin < 1 || vccPin > pinCount)) {
    errors.push({ field: 'vccPin', message: `VCC pin (${vccPin}) must be between 1 and ${pinCount}.`, severity: 'error' });
  }

  if (gndPin && pinCount && (gndPin < 1 || gndPin > pinCount)) {
    errors.push({ field: 'gndPin', message: `GND pin (${gndPin}) must be between 1 and ${pinCount}.`, severity: 'error' });
  }

  if (vccPin && gndPin && vccPin === gndPin) {
    errors.push({ field: 'vccPin', message: `VCC pin (${vccPin}) and GND pin (${gndPin}) cannot be the same physical pin.`, severity: 'error' });
  }

  if (ic.packageType) {
    const validPackages = ['DIP-14', 'DIP-16', 'DIP-20'];
    if (!validPackages.includes(ic.packageType)) {
      errors.push({
        field: 'packageType',
        message: `Invalid package configuration: Package type "${ic.packageType}" is not supported. Must be DIP-14, DIP-16, or DIP-20.`,
        severity: 'error',
      });
    } else if (pinCount && ic.packageType !== `DIP-${pinCount}`) {
      errors.push({
        field: 'packageType',
        message: `Invalid package configuration: Package type "${ic.packageType}" does not match pin count (${pinCount} pins). Expected "DIP-${pinCount}".`,
        severity: 'error',
      });
    }
  }

  // 2. Pins List & Pin Occupancy
  const pins: CustomICPinMapping[] = ic.pins || ic.pinMappings || [];
  if (pins.length === 0) {
    errors.push({ field: 'pins', message: 'Missing external pin mappings: Custom IC must define external pins.', severity: 'error' });
  }

  const seenPins = new Set<number>();
  let hasInput = false;
  let hasOutput = false;

  for (const p of pins) {
    const pNum = p.pinNumber ?? p.pin;
    if (typeof pNum !== 'number' || isNaN(pNum)) {
      errors.push({ field: 'pins', message: `Invalid pin number on pin "${p.name || 'unnamed'}".`, severity: 'error' });
      continue;
    }

    if (pinCount && (pNum < 1 || pNum > pinCount)) {
      errors.push({ field: 'pins', message: `Pin ${pNum} ("${p.name}") is out of package range 1..${pinCount}.`, severity: 'error' });
    }

    if (seenPins.has(pNum)) {
      errors.push({ field: 'pins', message: `Duplicate pin number: Pin ${pNum} is assigned more than once.`, severity: 'error' });
    }
    seenPins.add(pNum);

    if (p.type === 'input') hasInput = true;
    if (p.type === 'output') hasOutput = true;
  }

  // 3. Logic Source: Internal Circuit or Legacy Gate Units
  const internalCircuit: Circuit | undefined = ic.internalCircuit || ic.circuit;
  const legacyGateUnits = ic.gateUnits;

  if ((!internalCircuit || internalCircuit.components.length === 0) && (!legacyGateUnits || legacyGateUnits.length === 0)) {
    errors.push({
      field: 'internalCircuit',
      message: 'Custom IC must contain an internal circuit or configured logic units.',
      severity: 'error',
    });
  }

  // 4. Internal Circuit Topology Validation
  if (internalCircuit && internalCircuit.components.length > 0) {
    const compMap = new Map<string, CircuitComponent>();
    for (const comp of internalCircuit.components) {
      if (!comp.id) {
        errors.push({ field: 'internalCircuit', message: 'Internal component missing an ID.', severity: 'error' });
        continue;
      }
      if (compMap.has(comp.id)) {
        errors.push({ field: 'internalCircuit', message: `Duplicate internal component ID: "${comp.id}".`, severity: 'error' });
      }
      compMap.set(comp.id, comp);

      const seenPinIds = new Set<string>();
      for (const p of [...(comp.inputs || []), ...(comp.outputs || [])]) {
        if (p.id) {
          if (seenPinIds.has(p.id)) {
            errors.push({
              field: 'internalCircuit',
              message: `Duplicate pin ID "${p.id}" on component "${comp.label || comp.id}".`,
              severity: 'error',
            });
          }
          seenPinIds.add(p.id);
        }
      }
    }

    // Validate internal wires
    const seenWireIds = new Set<string>();
    for (const wire of internalCircuit.wires || []) {
      if (wire.id) {
        if (seenWireIds.has(wire.id)) {
          errors.push({
            field: 'internalCircuit',
            message: `Duplicate wire ID: "${wire.id}".`,
            severity: 'error',
          });
        }
        seenWireIds.add(wire.id);
      }
      const fromComp = compMap.get(wire.fromCompId);
      const toComp = compMap.get(wire.toCompId);

      if (!fromComp) {
        errors.push({
          field: 'internalCircuit',
          message: `Wire "${wire.id}" references nonexistent source component "${wire.fromCompId}".`,
          severity: 'error',
        });
      }
      if (!toComp) {
        errors.push({
          field: 'internalCircuit',
          message: `Wire "${wire.id}" references nonexistent destination component "${wire.toCompId}".`,
          severity: 'error',
        });
      }

      if (fromComp) {
        const fromPin = [...(fromComp.outputs || []), ...(fromComp.inputs || [])].find((p) => p.id === wire.fromPinId);
        if (!fromPin) {
          errors.push({
            field: 'internalCircuit',
            message: `Wire "${wire.id}" references nonexistent pin "${wire.fromPinId}" on component "${fromComp.label || fromComp.id}".`,
            severity: 'error',
          });
        }
      }

      if (toComp) {
        const toPin = [...(toComp.inputs || []), ...(toComp.outputs || [])].find((p) => p.id === wire.toPinId);
        if (!toPin) {
          errors.push({
            field: 'internalCircuit',
            message: `Wire "${wire.id}" references nonexistent pin "${wire.toPinId}" on component "${toComp.label || toComp.id}".`,
            severity: 'error',
          });
        }
      }
    }

    // 5. Pin Mapping Resolution (externalPin -> internalComponentId -> internalPinId)
    let mappedInputs = 0;
    let mappedOutputs = 0;

    for (const p of pins) {
      const pNum = p.pinNumber ?? p.pin;
      const compId = p.internalComponentId || p.internalCompId;

      if (compId) {
        const intComp = compMap.get(compId);
        if (!intComp) {
          errors.push({
            field: 'pinMapping',
            message: `External Pin ${pNum} ("${p.name}") references nonexistent internal component "${compId}".`,
            severity: 'error',
          });
        } else {
          if (p.type === 'input') mappedInputs++;
          if (p.type === 'output') mappedOutputs++;

          if (p.internalPinId) {
            const allPins = [...(intComp.inputs || []), ...(intComp.outputs || [])];
            const foundPin = allPins.find((pin) => pin.id === p.internalPinId || pin.name === p.internalPinId);
            if (!foundPin) {
              errors.push({
                field: 'pinMapping',
                message: `External Pin ${pNum} ("${p.name}") references nonexistent internal pin "${p.internalPinId}" on component "${intComp.label || intComp.id}".`,
                severity: 'error',
              });
            }
          }
        }
      } else {
        if (p.type === 'input' && pNum !== vccPin && pNum !== gndPin) {
          warnings.push({
            field: 'pinMapping',
            message: `External Input Pin ${pNum} ("${p.name}") is not connected to any internal logic component.`,
            severity: 'warning',
          });
        } else if (p.type === 'output') {
          warnings.push({
            field: 'pinMapping',
            message: `External Output Pin ${pNum} ("${p.name}") is not mapped to an internal logic output.`,
            severity: 'warning',
          });
        }
      }
    }

    if (mappedInputs === 0 && hasInput) {
      warnings.push({
        field: 'pinMapping',
        message: 'No external inputs are mapped to internal circuit components.',
        severity: 'warning',
      });
    }

    if (mappedOutputs === 0 && hasOutput) {
      warnings.push({
        field: 'pinMapping',
        message: 'No external outputs are mapped to internal circuit components.',
        severity: 'warning',
      });
    }

    if (mappedInputs === 0 && mappedOutputs === 0 && (!legacyGateUnits || legacyGateUnits.length === 0)) {
      errors.push({
        field: 'pinMapping',
        message: 'Missing external pin mappings: At least one external pin must be mapped to an internal circuit component.',
        severity: 'error',
      });
    }

    // 6. Direct Self-Reference & Recursive Dependency Cycle Detection
    const ownId = ic.id;
    if (ownId) {
      // Direct self-reference check
      const getCompCustomIcId = (c: CircuitComponent) =>
        c.customProps?.customIC?.id ||
        c.customProps?.customIcId ||
        c.customProps?.customProps?.customIcId ||
        c.customProps?.customProps?.customIC?.id;

      const selfRef = internalCircuit.components.find(
        (c) => c.type === 'custom_ic' && getCompCustomIcId(c) === ownId
      );
      if (selfRef) {
        errors.push({
          field: 'circularDependency',
          message: `Direct circular reference detected: Custom IC "${ic.name}" cannot contain an instance of itself.`,
          severity: 'error',
        });
      }

      // Indirect cycle detection through dependency graph
      if (existingLibrary && existingLibrary.length > 0) {
        const cycle = detectCycle(ownId, internalCircuit, existingLibrary);
        if (cycle && cycle.hasCycle) {
          errors.push({
            field: 'circularDependency',
            message: `Circular dependency detected: dependency loop [${cycle.join(' → ')}].`,
            severity: 'error',
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Traverses custom IC internal circuits to detect cyclic dependency graphs (A -> B -> ... -> A).
 * Supports both detectCycle(ownId, circuit, library) and detectCycle(icDef, library).
 */
export function detectCycle(
  target: string | CustomICDefinition,
  circuitOrLibrary?: Circuit | CustomICDefinition[],
  libraryArg?: CustomICDefinition[]
): any {
  let currentId: string;
  let internalCircuit: Circuit;
  let library: CustomICDefinition[];

  if (typeof target === 'object' && target !== null) {
    currentId = target.id || 'anonymous';
    internalCircuit = target.internalCircuit || (target as any).circuit || { components: [], wires: [] };
    library = Array.isArray(circuitOrLibrary) ? circuitOrLibrary : [];
  } else {
    currentId = target;
    internalCircuit = (circuitOrLibrary as Circuit) || { components: [], wires: [] };
    library = Array.isArray(libraryArg) ? libraryArg : [];
  }

  const libraryMap = new Map<string, CustomICDefinition>();
  for (const item of library) {
    if (item && item.id) libraryMap.set(item.id, item);
  }

  // Find all custom ICs referenced by this internal circuit
  const directDeps: string[] = [];
  for (const c of internalCircuit.components || []) {
    if (c.type === 'custom_ic') {
      const depId =
        c.customProps?.customIC?.id ||
        c.customProps?.customIcId ||
        c.customProps?.customProps?.customIcId ||
        c.customProps?.customProps?.customIC?.id;
      if (depId) {
        directDeps.push(depId);
      }
    }
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [currentId];

  function dfs(nodeId: string): string[] | null {
    if (nodeId === currentId && recursionStack.size > 0) {
      return [...path, nodeId];
    }
    if (recursionStack.has(nodeId)) {
      return [...path, nodeId];
    }
    if (visited.has(nodeId)) {
      return null;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const def = libraryMap.get(nodeId);
    if (def && def.internalCircuit) {
      for (const comp of def.internalCircuit.components || []) {
        if (comp.type === 'custom_ic') {
          const nextDepId =
            comp.customProps?.customIC?.id ||
            comp.customProps?.customIcId ||
            comp.customProps?.customProps?.customIcId ||
            comp.customProps?.customProps?.customIC?.id;
          if (nextDepId) {
            path.push(nextDepId);
            const cycle = dfs(nextDepId);
            if (cycle) return cycle;
            path.pop();
          }
        }
      }
    }

    recursionStack.delete(nodeId);
    return null;
  }

  let foundCycle: string[] | null = null;
  for (const depId of directDeps) {
    if (depId === currentId) {
      foundCycle = [currentId, currentId];
      break;
    }
    path.push(depId);
    const cycle = dfs(depId);
    if (cycle) {
      foundCycle = cycle;
      break;
    }
    path.pop();
  }

  const result: any = foundCycle ? [...foundCycle] : [];
  result.hasCycle = Boolean(foundCycle);
  result.cyclePath = foundCycle ? [...foundCycle] : null;
  result.message = foundCycle
    ? `Circular dependency detected: dependency loop [${foundCycle.join(' → ')}].`
    : undefined;

  return result;
}

/**
 * Convenient interface for UI reporting with string error arrays
 */
export interface CustomICValidationResult {
  valid: boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a Custom IC definition and returns direct string error/warning messages for UI components.
 */
export function validateCustomICDefinition(
  ic: Partial<CustomICDefinition>,
  existingLibrary?: CustomICDefinition[]
): CustomICValidationResult {
  const res = validateCustomIC(ic, existingLibrary);
  return {
    valid: res.isValid,
    isValid: res.isValid,
    errors: res.errors.map((e) => e.message),
    warnings: res.warnings.map((w) => w.message),
  };
}

/**
 * Safely parses and validates an exported Custom IC JSON representation.
 */
export function validateCustomICJSON(
  jsonString: string,
  existingLibrary?: CustomICDefinition[]
): {
  valid: boolean;
  ic?: CustomICDefinition;
  definition?: CustomICDefinition;
  error?: string;
  errors: string[];
} {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: any) {
    const msg = `Malformed JSON: ${err?.message || 'Syntax error during JSON parsing.'}`;
    return {
      valid: false,
      error: msg,
      errors: [msg],
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    const msg = 'Invalid format: Root element must be a Custom IC Definition JSON object.';
    return {
      valid: false,
      error: msg,
      errors: [msg],
    };
  }

  const validation = validateCustomIC(parsed, existingLibrary);
  if (!validation.isValid) {
    const errList = validation.errors.map((e) => e.message);
    const errorDetails = errList.map((m) => `• ${m}`).join('\n');
    return {
      valid: false,
      error: `Validation failed:\n${errorDetails}`,
      errors: errList,
    };
  }

  return {
    valid: true,
    ic: parsed as CustomICDefinition,
    definition: parsed as CustomICDefinition,
    errors: [],
  };
}

