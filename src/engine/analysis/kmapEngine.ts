import type { Circuit, CustomICDefinition, LogicValue } from '../../types/circuit';
import type { TruthTableData } from '../truthTableGen';
import { generateUnifiedTruthTable, type UnifiedTruthTableResult } from './truthTableEngine';

export interface KMapCell {
  rowIdx: number;
  colIdx: number;
  layerIdx?: number;
  rowGray: string;
  colGray: string;
  layerGray?: string;
  minterm: number;
  value: LogicValue;
  binaryString: string;
}

export interface KMapGrid {
  layerName?: string;
  layerValue?: string;
  rowVariables: string[];
  colVariables: string[];
  rowHeaders: string[]; // e.g. ["00", "01", "11", "10"]
  colHeaders: string[]; // e.g. ["00", "01", "11", "10"]
  cells: KMapCell[][]; // [row][col]
}

export interface ImplicantGroup {
  cells: number[]; // minterms included in group
  implicant: string; // e.g. "A·B'·D"
  termBinary: string; // e.g. "10-1"
  size: number;
}

export interface KMapResult {
  numVariables: number;
  variables: string[];
  selectedOutput: string;
  grids: KMapGrid[];
  minterms: number[];
  maxterms: number[];
  dontCares: number[];
  canonicalSop: string;
  canonicalPos: string;
  primeImplicants: string[];
  simplifiedSop: string;
  groups: ImplicantGroup[];
}

// Standard Gray code sequences
export const GRAY_CODE_1 = ['0', '1'];
export const GRAY_CODE_2 = ['00', '01', '11', '10'];

export const GRAY_CODES: Record<number, string[]> = {
  1: GRAY_CODE_1,
  2: GRAY_CODE_2,
  3: ['000', '001', '011', '010', '110', '111', '101', '100'],
  4: ['0000', '0001', '0011', '0010', '0110', '0111', '0101', '0100', '1100', '1101', '1111', '1110', '1010', '1011', '1001', '1000'],
};

/**
 * Decimal value of Gray code string
 */
export function grayToDecimal(gray: string): number {
  return parseInt(gray, 2);
}

/**
 * Builds a 2 to 6 variable Karnaugh Map from Truth Table data or Circuit
 */
export function generateKMap(
  target:
    | Circuit
    | CustomICDefinition
    | TruthTableData
    | UnifiedTruthTableResult
    | { inputNames?: string[]; inputs?: string[]; outputNames?: string[]; outputs?: string[]; rows: any[] },
  selectedOutput?: string
): KMapResult | null {
  let tableData: { inputNames: string[]; outputNames: string[]; rows: any[] } | null = null;

  if (target && typeof target === 'object' && 'components' in target && 'wires' in target) {
    const res = generateUnifiedTruthTable(target as Circuit, { maxInputs: 6 });
    if (!res.valid) return null;
    tableData = res;
  } else if (target && typeof target === 'object' && 'pins' in target && ('internalCircuit' in target || 'gateUnits' in target)) {
    const res = generateUnifiedTruthTable(target as CustomICDefinition, { maxInputs: 6 });
    if (!res.valid) return null;
    tableData = res;
  } else if (target && typeof target === 'object') {
    const inputNames = (target as any).inputNames || (target as any).inputs || [];
    const outputNames = (target as any).outputNames || (target as any).outputs || [];
    const rows = (target as any).rows || [];
    tableData = { inputNames, outputNames, rows };
  }

  if (!tableData || !tableData.inputNames || tableData.inputNames.length === 0) {
    return null;
  }

  const numVars = tableData.inputNames.length;
  if (numVars < 2 || numVars > 6) {
    return null; // K-Maps strictly supported for 2-6 variables
  }

  const variables = [...tableData.inputNames];
  const outputNames = tableData.outputNames || [];
  const targetOutput = selectedOutput && outputNames.includes(selectedOutput) ? selectedOutput : outputNames[0];

  if (!targetOutput) {
    return null;
  }

  // Extract minterm values from truth table
  const minterms: number[] = [];
  const maxterms: number[] = [];
  const dontCares: number[] = [];
  const valueMap = new Map<number, LogicValue>();

  tableData.rows.forEach((row, idx) => {
    const val = (row.outputs && row.outputs[targetOutput]) || '0';
    valueMap.set(idx, val);
    if (val === '1') {
      minterms.push(idx);
    } else if (val === '0') {
      maxterms.push(idx);
    } else if (val === 'X') {
      dontCares.push(idx);
    }
  });

  // Construct K-Map grids based on variable count
  const grids: KMapGrid[] = [];

  if (numVars === 2) {
    // 2 Variables: A (row), B (col) -> 2x2 grid
    grids.push(build2VarGrid(variables, valueMap));
  } else if (numVars === 3) {
    // 3 Variables: A (row), BC (col) -> 2x4 grid
    grids.push(build3VarGrid(variables, valueMap));
  } else if (numVars === 4) {
    // 4 Variables: AB (row), CD (col) -> 4x4 grid
    grids.push(build4VarGrid(variables, valueMap));
  } else if (numVars === 5) {
    // 5 Variables: A=0 layer, A=1 layer, BC (row), DE (col) -> two 4x4 grids
    grids.push(build5VarLayer(variables, valueMap, 0));
    grids.push(build5VarLayer(variables, valueMap, 1));
  } else if (numVars === 6) {
    // 6 Variables: AB in Gray code (00, 01, 11, 10), CD (row), EF (col) -> four 4x4 grids
    grids.push(build6VarLayer(variables, valueMap, 0, '00'));
    grids.push(build6VarLayer(variables, valueMap, 1, '01'));
    grids.push(build6VarLayer(variables, valueMap, 3, '11'));
    grids.push(build6VarLayer(variables, valueMap, 2, '10'));
  }

  // Canonical representations
  const canonicalSop =
    minterms.length === 0
      ? '0'
      : minterms.length === Math.pow(2, numVars)
      ? '1'
      : `Σ m(${minterms.join(', ')})`;

  const canonicalPos =
    maxterms.length === 0
      ? '1'
      : maxterms.length === Math.pow(2, numVars)
      ? '0'
      : `Π M(${maxterms.join(', ')})`;

  // Genuine Quine-McCluskey Boolean minimization
  const qmResult = quineMcCluskeySimplify(numVars, variables, minterms, dontCares);

  return {
    numVariables: numVars,
    variables,
    selectedOutput: targetOutput,
    grids,
    minterms,
    maxterms,
    dontCares,
    canonicalSop,
    canonicalPos,
    primeImplicants: qmResult.primeImplicants,
    simplifiedSop: qmResult.minimalExpression,
    groups: qmResult.groups,
  };
}

// ---------------------------------------------------------------------------
// GRID BUILDERS WITH ACCURATE GRAY-CODE COORDINATES
// ---------------------------------------------------------------------------

function build2VarGrid(vars: string[], valueMap: Map<number, LogicValue>): KMapGrid {
  const rowHeaders = GRAY_CODE_1; // ["0", "1"] for A
  const colHeaders = GRAY_CODE_1; // ["0", "1"] for B
  const cells: KMapCell[][] = [];

  for (let r = 0; r < rowHeaders.length; r++) {
    const rowCells: KMapCell[] = [];
    for (let c = 0; c < colHeaders.length; c++) {
      const bitA = r;
      const bitB = c;
      const m = (bitA << 1) | bitB;
      const val = valueMap.get(m) || '0';
      rowCells.push({
        rowIdx: r,
        colIdx: c,
        rowGray: rowHeaders[r],
        colGray: colHeaders[c],
        minterm: m,
        value: val,
        binaryString: `${bitA}${bitB}`,
      });
    }
    cells.push(rowCells);
  }

  return {
    rowVariables: [vars[0]],
    colVariables: [vars[1]],
    rowHeaders,
    colHeaders,
    cells,
  };
}

function build3VarGrid(vars: string[], valueMap: Map<number, LogicValue>): KMapGrid {
  const rowHeaders = GRAY_CODE_1; // ["0", "1"] for A
  const colHeaders = GRAY_CODE_2; // ["00", "01", "11", "10"] for BC
  const colDecimals = [0, 1, 3, 2];
  const cells: KMapCell[][] = [];

  for (let r = 0; r < rowHeaders.length; r++) {
    const rowCells: KMapCell[] = [];
    for (let c = 0; c < colHeaders.length; c++) {
      const bitA = r;
      const bcVal = colDecimals[c];
      const m = (bitA << 2) | bcVal;
      const val = valueMap.get(m) || '0';
      rowCells.push({
        rowIdx: r,
        colIdx: c,
        rowGray: rowHeaders[r],
        colGray: colHeaders[c],
        minterm: m,
        value: val,
        binaryString: `${bitA}${colHeaders[c]}`,
      });
    }
    cells.push(rowCells);
  }

  return {
    rowVariables: [vars[0]],
    colVariables: [vars[1], vars[2]],
    rowHeaders,
    colHeaders,
    cells,
  };
}

function build4VarGrid(vars: string[], valueMap: Map<number, LogicValue>): KMapGrid {
  const rowHeaders = GRAY_CODE_2; // ["00", "01", "11", "10"] for AB
  const colHeaders = GRAY_CODE_2; // ["00", "01", "11", "10"] for CD
  const rowDecimals = [0, 1, 3, 2];
  const colDecimals = [0, 1, 3, 2];
  const cells: KMapCell[][] = [];

  for (let r = 0; r < rowHeaders.length; r++) {
    const rowCells: KMapCell[] = [];
    for (let c = 0; c < colHeaders.length; c++) {
      const abVal = rowDecimals[r];
      const cdVal = colDecimals[c];
      const m = (abVal << 2) | cdVal;
      const val = valueMap.get(m) || '0';
      rowCells.push({
        rowIdx: r,
        colIdx: c,
        rowGray: rowHeaders[r],
        colGray: colHeaders[c],
        minterm: m,
        value: val,
        binaryString: `${rowHeaders[r]}${colHeaders[c]}`,
      });
    }
    cells.push(rowCells);
  }

  return {
    rowVariables: [vars[0], vars[1]],
    colVariables: [vars[2], vars[3]],
    rowHeaders,
    colHeaders,
    cells,
  };
}

function build5VarLayer(vars: string[], valueMap: Map<number, LogicValue>, layerBit: number): KMapGrid {
  const rowHeaders = GRAY_CODE_2; // for BC
  const colHeaders = GRAY_CODE_2; // for DE
  const rowDecimals = [0, 1, 3, 2];
  const colDecimals = [0, 1, 3, 2];
  const cells: KMapCell[][] = [];

  for (let r = 0; r < rowHeaders.length; r++) {
    const rowCells: KMapCell[] = [];
    for (let c = 0; c < colHeaders.length; c++) {
      const bcVal = rowDecimals[r];
      const deVal = colDecimals[c];
      const m = (layerBit << 4) | (bcVal << 2) | deVal;
      const val = valueMap.get(m) || '0';
      rowCells.push({
        rowIdx: r,
        colIdx: c,
        layerIdx: layerBit,
        rowGray: rowHeaders[r],
        colGray: colHeaders[c],
        layerGray: String(layerBit),
        minterm: m,
        value: val,
        binaryString: `${layerBit}${rowHeaders[r]}${colHeaders[c]}`,
      });
    }
    cells.push(rowCells);
  }

  return {
    layerName: vars[0],
    layerValue: `${vars[0]} = ${layerBit}`,
    rowVariables: [vars[1], vars[2]],
    colVariables: [vars[3], vars[4]],
    rowHeaders,
    colHeaders,
    cells,
  };
}

function build6VarLayer(
  vars: string[],
  valueMap: Map<number, LogicValue>,
  layerDecimal: number,
  layerGray: string
): KMapGrid {
  const rowHeaders = GRAY_CODE_2; // for CD
  const colHeaders = GRAY_CODE_2; // for EF
  const rowDecimals = [0, 1, 3, 2];
  const colDecimals = [0, 1, 3, 2];
  const cells: KMapCell[][] = [];

  for (let r = 0; r < rowHeaders.length; r++) {
    const rowCells: KMapCell[] = [];
    for (let c = 0; c < colHeaders.length; c++) {
      const cdVal = rowDecimals[r];
      const efVal = colDecimals[c];
      const m = (layerDecimal << 4) | (cdVal << 2) | efVal;
      const val = valueMap.get(m) || '0';
      rowCells.push({
        rowIdx: r,
        colIdx: c,
        layerIdx: layerDecimal,
        rowGray: rowHeaders[r],
        colGray: colHeaders[c],
        layerGray,
        minterm: m,
        value: val,
        binaryString: `${layerGray}${rowHeaders[r]}${colHeaders[c]}`,
      });
    }
    cells.push(rowCells);
  }

  return {
    layerName: `${vars[0]}${vars[1]}`,
    layerValue: `${vars[0]}${vars[1]} = ${layerGray}`,
    rowVariables: [vars[2], vars[3]],
    colVariables: [vars[4], vars[5]],
    rowHeaders,
    colHeaders,
    cells,
  };
}

// ---------------------------------------------------------------------------
// QUINE-MCCLUSKEY & PETRICK'S METHOD BOOLEAN MINIMIZER
// ---------------------------------------------------------------------------

interface QMTerm {
  binary: string; // e.g. "1-01"
  minterms: number[];
  combined: boolean;
}

/**
 * Executes standard Quine-McCluskey minimization with prime implicant chart reduction.
 */
export function quineMcCluskeySimplify(
  numVars: number,
  vars: string[],
  minterms: number[],
  dontCares: number[] = []
): {
  primeImplicants: string[];
  minimalExpression: string;
  groups: ImplicantGroup[];
} {
  const allTerms = [...new Set([...minterms, ...dontCares])].sort((a, b) => a - b);

  if (minterms.length === 0) {
    return { primeImplicants: [], minimalExpression: '0', groups: [] };
  }
  if (minterms.length === Math.pow(2, numVars)) {
    return { primeImplicants: ['1'], minimalExpression: '1', groups: [{ cells: minterms, implicant: '1', termBinary: '-'.repeat(numVars), size: minterms.length }] };
  }

  // 1. Convert to binary strings
  let currentGroup: QMTerm[] = allTerms.map((m) => ({
    binary: m.toString(2).padStart(numVars, '0'),
    minterms: [m],
    combined: false,
  }));

  const primeImplicants: QMTerm[] = [];

  // 2. Iteratively merge adjacent terms differing by 1 bit
  while (currentGroup.length > 0) {
    const nextGroup: QMTerm[] = [];
    const seenCombos = new Set<string>();

    for (let i = 0; i < currentGroup.length; i++) {
      for (let j = i + 1; j < currentGroup.length; j++) {
        const term1 = currentGroup[i];
        const term2 = currentGroup[j];

        const merged = tryMergeTerms(term1.binary, term2.binary);
        if (merged) {
          term1.combined = true;
          term2.combined = true;

          const mergedMinterms = [...new Set([...term1.minterms, ...term2.minterms])].sort((a, b) => a - b);
          const key = merged;

          if (!seenCombos.has(key)) {
            seenCombos.add(key);
            nextGroup.push({
              binary: merged,
              minterms: mergedMinterms,
              combined: false,
            });
          }
        }
      }
    }

    // Collect terms that could not be combined as prime implicants
    for (const term of currentGroup) {
      if (!term.combined) {
        if (!primeImplicants.some((p) => p.binary === term.binary)) {
          primeImplicants.push(term);
        }
      }
    }

    currentGroup = nextGroup;
  }

  // Filter prime implicants that cover at least one required minterm (not solely don't-cares)
  const relevantPIs = primeImplicants.filter((pi) =>
    pi.minterms.some((m) => minterms.includes(m))
  );

  // 3. Prime Implicant Coverage Table Optimization
  // Find essential prime implicants first
  const remainingMinterms = new Set<number>(minterms);
  const selectedPIs: QMTerm[] = [];

  for (const m of minterms) {
    const covering = relevantPIs.filter((pi) => pi.minterms.includes(m));
    if (covering.length === 1) {
      const essential = covering[0];
      if (!selectedPIs.includes(essential)) {
        selectedPIs.push(essential);
        essential.minterms.forEach((cm) => remainingMinterms.delete(cm));
      }
    }
  }

  // Greedy coverage for remaining minterms (Petrick approximation)
  while (remainingMinterms.size > 0) {
    let bestPI: QMTerm | null = null;
    let maxCovered = -1;

    for (const pi of relevantPIs) {
      if (selectedPIs.includes(pi)) continue;
      const count = pi.minterms.filter((m) => remainingMinterms.has(m)).length;
      if (count > maxCovered) {
        maxCovered = count;
        bestPI = pi;
      }
    }

    if (!bestPI || maxCovered <= 0) break;
    selectedPIs.push(bestPI);
    bestPI.minterms.forEach((m) => remainingMinterms.delete(m));
  }

  // Format Boolean expressions
  const formatTerm = (binary: string): string => {
    const literals: string[] = [];
    for (let i = 0; i < binary.length; i++) {
      const bit = binary[i];
      if (bit === '1') literals.push(vars[i]);
      else if (bit === '0') literals.push(`${vars[i]}'`);
    }
    return literals.length === 0 ? '1' : literals.join('·');
  };

  const piStrings = relevantPIs.map((pi) => formatTerm(pi.binary));
  const selectedTerms = selectedPIs.map((pi) => formatTerm(pi.binary));
  const minimalExpression = selectedTerms.length === 0 ? '0' : selectedTerms.join(' + ');

  const groups: ImplicantGroup[] = selectedPIs.map((pi) => ({
    cells: pi.minterms,
    implicant: formatTerm(pi.binary),
    termBinary: pi.binary,
    size: pi.minterms.length,
  }));

  return {
    primeImplicants: piStrings,
    minimalExpression,
    groups,
  };
}

function tryMergeTerms(b1: string, b2: string): string | null {
  let diffCount = 0;
  let diffIdx = -1;

  for (let i = 0; i < b1.length; i++) {
    if (b1[i] !== b2[i]) {
      diffCount++;
      diffIdx = i;
      if (diffCount > 1) return null;
    }
  }

  if (diffCount === 1) {
    return b1.substring(0, diffIdx) + '-' + b1.substring(diffIdx + 1);
  }
  return null;
}

export const generateKMapFromTruthTable = generateKMap;

export function minimizeBooleanFunction(
  vars: string[],
  minterms: number[],
  dontCares: number[] = []
): {
  primeImplicants: string[];
  simplifiedSOP: string;
  groups: ImplicantGroup[];
} {
  const res = quineMcCluskeySimplify(vars.length, vars, minterms, dontCares);
  return {
    primeImplicants: res.primeImplicants,
    simplifiedSOP: res.minimalExpression,
    groups: res.groups,
  };
}
