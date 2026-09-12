import type { LogicValue } from '../types/circuit';

// --- Multi-Valued Logic Helpers ---

export function resolveLogic(val: unknown): LogicValue {
  if (val === '1' || val === 1 || val === true) return '1';
  if (val === '0' || val === 0 || val === false) return '0';
  if (val === 'Z') return 'Z';
  return 'X';
}

export function notGate(a: LogicValue): LogicValue {
  if (a === '0') return '1';
  if (a === '1') return '0';
  if (a === 'Z') return 'X';
  return 'X';
}

export function andGate(a: LogicValue, b: LogicValue): LogicValue {
  if (a === '0' || b === '0') return '0';
  if (a === '1' && b === '1') return '1';
  return 'X';
}

export function orGate(a: LogicValue, b: LogicValue): LogicValue {
  if (a === '1' || b === '1') return '1';
  if (a === '0' && b === '0') return '0';
  return 'X';
}

export function nandGate(a: LogicValue, b: LogicValue): LogicValue {
  return notGate(andGate(a, b));
}

export function norGate(a: LogicValue, b: LogicValue): LogicValue {
  return notGate(orGate(a, b));
}

export function xorGate(a: LogicValue, b: LogicValue): LogicValue {
  if ((a === '0' || a === '1') && (b === '0' || b === '1')) {
    return a === b ? '0' : '1';
  }
  return 'X';
}

export function xnorGate(a: LogicValue, b: LogicValue): LogicValue {
  return notGate(xorGate(a, b));
}

export function triStateBuffer(input: LogicValue, enable: LogicValue): LogicValue {
  if (enable === '1') return input;
  if (enable === '0') return 'Z';
  return 'X';
}

// --- Combinational Blocks ---

export function halfAdder(a: LogicValue, b: LogicValue): { sum: LogicValue; carry: LogicValue } {
  return {
    sum: xorGate(a, b),
    carry: andGate(a, b),
  };
}

export function fullAdder(
  a: LogicValue,
  b: LogicValue,
  cin: LogicValue
): { sum: LogicValue; cout: LogicValue } {
  const ha1 = halfAdder(a, b);
  const ha2 = halfAdder(ha1.sum, cin);
  const cout = orGate(ha1.carry, ha2.carry);
  return {
    sum: ha2.sum,
    cout,
  };
}

export function mux2to1(i0: LogicValue, i1: LogicValue, s: LogicValue): LogicValue {
  if (s === '0') return i0;
  if (s === '1') return i1;
  return 'X';
}

export function mux4to1(
  i0: LogicValue,
  i1: LogicValue,
  i2: LogicValue,
  i3: LogicValue,
  s1: LogicValue,
  s0: LogicValue
): LogicValue {
  if (s1 === '0' && s0 === '0') return i0;
  if (s1 === '0' && s0 === '1') return i1;
  if (s1 === '1' && s0 === '0') return i2;
  if (s1 === '1' && s0 === '1') return i3;
  return 'X';
}

export function demux1to2(din: LogicValue, s: LogicValue): { y0: LogicValue; y1: LogicValue } {
  if (s === '0') return { y0: din, y1: '0' };
  if (s === '1') return { y0: '0', y1: din };
  return { y0: 'X', y1: 'X' };
}

export function demux1to4(
  din: LogicValue,
  s1: LogicValue,
  s0: LogicValue
): { y0: LogicValue; y1: LogicValue; y2: LogicValue; y3: LogicValue } {
  if (s1 === '0' && s0 === '0') return { y0: din, y1: '0', y2: '0', y3: '0' };
  if (s1 === '0' && s0 === '1') return { y0: '0', y1: din, y2: '0', y3: '0' };
  if (s1 === '1' && s0 === '0') return { y0: '0', y1: '0', y2: din, y3: '0' };
  if (s1 === '1' && s0 === '1') return { y0: '0', y1: '0', y2: '0', y3: din };
  return { y0: 'X', y1: 'X', y2: 'X', y3: 'X' };
}

export function decoder2to4(
  en: LogicValue,
  a1: LogicValue,
  a0: LogicValue
): { y0: LogicValue; y1: LogicValue; y2: LogicValue; y3: LogicValue } {
  if (en !== '1') {
    return { y0: '0', y1: '0', y2: '0', y3: '0' };
  }
  if (a1 === '0' && a0 === '0') return { y0: '1', y1: '0', y2: '0', y3: '0' };
  if (a1 === '0' && a0 === '1') return { y0: '0', y1: '1', y2: '0', y3: '0' };
  if (a1 === '1' && a0 === '0') return { y0: '0', y1: '0', y2: '1', y3: '0' };
  if (a1 === '1' && a0 === '1') return { y0: '0', y1: '0', y2: '0', y3: '1' };
  return { y0: 'X', y1: 'X', y2: 'X', y3: 'X' };
}

export function comparator4bit(
  aBits: [LogicValue, LogicValue, LogicValue, LogicValue],
  bBits: [LogicValue, LogicValue, LogicValue, LogicValue]
): { gt: LogicValue; eq: LogicValue; lt: LogicValue } {
  const isBinary = (bits: LogicValue[]) => bits.every((b) => b === '0' || b === '1');
  if (!isBinary(aBits) || !isBinary(bBits)) {
    return { gt: 'X', eq: 'X', lt: 'X' };
  }
  const aVal = (Number(aBits[3]) << 3) | (Number(aBits[2]) << 2) | (Number(aBits[1]) << 1) | Number(aBits[0]);
  const bVal = (Number(bBits[3]) << 3) | (Number(bBits[2]) << 2) | (Number(bBits[1]) << 1) | Number(bBits[0]);

  return {
    gt: aVal > bVal ? '1' : '0',
    eq: aVal === bVal ? '1' : '0',
    lt: aVal < bVal ? '1' : '0',
  };
}

// --- Sequential Blocks (Edge-Triggered) ---

export function isRisingEdge(prevClk: LogicValue | undefined, clk: LogicValue): boolean {
  return (prevClk === '0' || prevClk === undefined) && clk === '1';
}

export function evaluateSRLatch(
  s: LogicValue,
  r: LogicValue,
  currQ: LogicValue = '0',
  pre: LogicValue = '1',
  clr: LogicValue = '1'
): { q: LogicValue; qBar: LogicValue; invalid: boolean } {
  // Asynchronous Active-LOW Preset & Clear
  if (pre === '0' && clr === '0') {
    return { q: 'X', qBar: 'X', invalid: true };
  }
  if (pre === '0') {
    return { q: '1', qBar: '0', invalid: false };
  }
  if (clr === '0') {
    return { q: '0', qBar: '1', invalid: false };
  }

  if (s === '0' && r === '0') {
    return { q: currQ, qBar: notGate(currQ), invalid: false };
  }
  if (s === '1' && r === '0') {
    return { q: '1', qBar: '0', invalid: false };
  }
  if (s === '0' && r === '1') {
    return { q: '0', qBar: '1', invalid: false };
  }
  // S = 1, R = 1 is invalid/forbidden in SR latch
  return { q: 'X', qBar: 'X', invalid: true };
}

export function evaluateDFlipFlop(
  d: LogicValue,
  clk: LogicValue,
  prevClk: LogicValue | undefined,
  currQ: LogicValue = '0',
  pre: LogicValue = '1',
  clr: LogicValue = '1'
): { q: LogicValue; qBar: LogicValue } {
  // Asynchronous Active-LOW Preset & Clear overrides
  if (pre === '0' && clr === '0') {
    return { q: 'X', qBar: 'X' };
  }
  if (pre === '0') {
    return { q: '1', qBar: '0' };
  }
  if (clr === '0') {
    return { q: '0', qBar: '1' };
  }

  if (isRisingEdge(prevClk, clk)) {
    const nextQ = d === '1' ? '1' : d === '0' ? '0' : 'X';
    return { q: nextQ, qBar: notGate(nextQ) };
  }
  return { q: currQ, qBar: notGate(currQ) };
}

export function evaluateJKFlipFlop(
  j: LogicValue,
  k: LogicValue,
  clk: LogicValue,
  prevClk: LogicValue | undefined,
  currQ: LogicValue = '0',
  pre: LogicValue = '1',
  clr: LogicValue = '1'
): { q: LogicValue; qBar: LogicValue } {
  // Asynchronous Active-LOW Preset & Clear overrides
  if (pre === '0' && clr === '0') {
    return { q: 'X', qBar: 'X' };
  }
  if (pre === '0') {
    return { q: '1', qBar: '0' };
  }
  if (clr === '0') {
    return { q: '0', qBar: '1' };
  }

  if (isRisingEdge(prevClk, clk)) {
    if (j === '0' && k === '0') {
      return { q: currQ, qBar: notGate(currQ) };
    }
    if (j === '0' && k === '1') {
      return { q: '0', qBar: '1' };
    }
    if (j === '1' && k === '0') {
      return { q: '1', qBar: '0' };
    }
    if (j === '1' && k === '1') {
      const toggled = notGate(currQ);
      return { q: toggled, qBar: notGate(toggled) };
    }
    return { q: 'X', qBar: 'X' };
  }
  return { q: currQ, qBar: notGate(currQ) };
}

export function evaluateTFlipFlop(
  t: LogicValue,
  clk: LogicValue,
  prevClk: LogicValue | undefined,
  currQ: LogicValue = '0',
  pre: LogicValue = '1',
  clr: LogicValue = '1'
): { q: LogicValue; qBar: LogicValue } {
  // Asynchronous Active-LOW Preset & Clear overrides
  if (pre === '0' && clr === '0') {
    return { q: 'X', qBar: 'X' };
  }
  if (pre === '0') {
    return { q: '1', qBar: '0' };
  }
  if (clr === '0') {
    return { q: '0', qBar: '1' };
  }

  if (isRisingEdge(prevClk, clk)) {
    if (t === '1') {
      const toggled = notGate(currQ);
      return { q: toggled, qBar: notGate(toggled) };
    }
    return { q: currQ, qBar: notGate(currQ) };
  }
  return { q: currQ, qBar: notGate(currQ) };
}

export function evaluate4BitCounter(
  clk: LogicValue,
  prevClk: LogicValue | undefined,
  rst: LogicValue,
  en: LogicValue,
  currCount = 0
): { count: number; q0: LogicValue; q1: LogicValue; q2: LogicValue; q3: LogicValue; tc: LogicValue } {
  let count = currCount;
  if (rst === '1') {
    count = 0;
  } else if (isRisingEdge(prevClk, clk) && en !== '0') {
    count = (count + 1) % 16;
  }

  const q0: LogicValue = (count & 1) ? '1' : '0';
  const q1: LogicValue = (count & 2) ? '1' : '0';
  const q2: LogicValue = (count & 4) ? '1' : '0';
  const q3: LogicValue = (count & 8) ? '1' : '0';
  const tc: LogicValue = count === 15 ? '1' : '0';

  return { count, q0, q1, q2, q3, tc };
}

export function evaluate4BitShiftRegister(
  clk: LogicValue,
  prevClk: LogicValue | undefined,
  rst: LogicValue,
  serialIn: LogicValue,
  currBits: [LogicValue, LogicValue, LogicValue, LogicValue] = ['0', '0', '0', '0']
): [LogicValue, LogicValue, LogicValue, LogicValue] {
  if (rst === '1') {
    return ['0', '0', '0', '0'];
  }
  if (isRisingEdge(prevClk, clk)) {
    // Shift right: Q0 gets serialIn, Q1 gets old Q0, Q2 gets old Q1, Q3 gets old Q2
    return [serialIn, currBits[0], currBits[1], currBits[2]];
  }
  return currBits;
}

// --- 74-Series MSI & LSI Evaluation Functions ---

/**
 * 74151: 8-Line to 1-Line Multiplexer
 * Active-low enable Gbar. Outputs Y (true) and W (inverted).
 */
export function evaluate74151(
  d: [LogicValue, LogicValue, LogicValue, LogicValue, LogicValue, LogicValue, LogicValue, LogicValue],
  s: [LogicValue, LogicValue, LogicValue], // s0, s1, s2
  gbar: LogicValue = '0'
): { y: LogicValue; w: LogicValue } {
  if (gbar === '1') {
    return { y: '0', w: '1' };
  }

  const s0 = s[0] === '1' ? 1 : 0;
  const s1 = s[1] === '1' ? 2 : 0;
  const s2 = s[2] === '1' ? 4 : 0;
  const idx = s0 + s1 + s2;

  const yVal = d[idx] || '0';
  return {
    y: yVal,
    w: notGate(yVal),
  };
}

/**
 * 74138: 3-to-8 Line Decoder / Demultiplexer
 * Active-high G1, active-low G2A & G2B. Active-low outputs Y0..Y7.
 */
export function evaluate74138(
  a: LogicValue,
  b: LogicValue,
  c: LogicValue,
  g1: LogicValue = '1',
  g2a_bar: LogicValue = '0',
  g2b_bar: LogicValue = '0'
): Record<string, LogicValue> {
  const allHigh: Record<string, LogicValue> = {
    y0: '1', y1: '1', y2: '1', y3: '1', y4: '1', y5: '1', y6: '1', y7: '1',
  };

  // Enabled only if G1 = 1, G2A = 0, G2B = 0
  if (g1 !== '1' || g2a_bar === '1' || g2b_bar === '1') {
    return allHigh;
  }

  const a0 = a === '1' ? 1 : 0;
  const a1 = b === '1' ? 2 : 0;
  const a2 = c === '1' ? 4 : 0;
  const activeIdx = a0 + a1 + a2;

  const res = { ...allHigh };
  res[`y${activeIdx}`] = '0';
  return res;
}

/**
 * 7490: Decade / BCD Counter (MOD-10)
 * Dual reset pairs: R0(1)&R0(2) reset to 0; R9(1)&R9(2) set to 9.
 * Negative-edge triggered on CKA and CKB.
 */
export function evaluate7490(
  cka: LogicValue,
  prevCka: LogicValue | undefined,
  ckb: LogicValue,
  prevCkb: LogicValue | undefined,
  r0_1: LogicValue,
  r0_2: LogicValue,
  r9_1: LogicValue,
  r9_2: LogicValue,
  currentCount: number = 0
): { count: number; qa: LogicValue; qb: LogicValue; qc: LogicValue; qd: LogicValue } {
  let count = currentCount;

  // Asynchronous resets
  if (r0_1 === '1' && r0_2 === '1') {
    count = 0;
  } else if (r9_1 === '1' && r9_2 === '1') {
    count = 9;
  } else {
    const isFallingA = (prevCka === '1' || prevCka === undefined) && cka === '0';
    const isFallingB = (prevCkb === '1' || prevCkb === undefined) && ckb === '0';

    if (isFallingA || isFallingB) {
      count = (count + 1) % 10;
    }
  }

  return {
    count,
    qa: (count & 1) ? '1' : '0',
    qb: (count & 2) ? '1' : '0',
    qc: (count & 4) ? '1' : '0',
    qd: (count & 8) ? '1' : '0',
  };
}

/**
 * 7483: 4-Bit Binary / BCD Full Adder with Fast Carry
 * Adds A[1..4] + B[1..4] + C0 -> S[1..4], C4.
 */
export function evaluate7483(
  a: [LogicValue, LogicValue, LogicValue, LogicValue],
  b: [LogicValue, LogicValue, LogicValue, LogicValue],
  c0: LogicValue = '0'
): { s1: LogicValue; s2: LogicValue; s3: LogicValue; s4: LogicValue; c4: LogicValue } {
  let carry = c0 === '1' ? 1 : 0;
  const sums: LogicValue[] = [];

  for (let i = 0; i < 4; i++) {
    const bitA = a[i] === '1' ? 1 : 0;
    const bitB = b[i] === '1' ? 1 : 0;
    const bitSum = bitA + bitB + carry;
    sums.push((bitSum & 1) ? '1' : '0');
    carry = bitSum > 1 ? 1 : 0;
  }

  return {
    s1: sums[0],
    s2: sums[1],
    s3: sums[2],
    s4: sums[3],
    c4: carry ? '1' : '0',
  };
}

/**
 * 74153: Dual 4-to-1 Line Multiplexer / Data Selector
 * Common select lines A, B. Individual active-low enables 1G, 2G.
 */
export function evaluate74153(
  s0: LogicValue,
  s1: LogicValue,
  g1_bar: LogicValue,
  c1: [LogicValue, LogicValue, LogicValue, LogicValue],
  g2_bar: LogicValue,
  c2: [LogicValue, LogicValue, LogicValue, LogicValue]
): { y1: LogicValue; y2: LogicValue } {
  const sel = (s0 === '1' ? 1 : 0) + (s1 === '1' ? 2 : 0);
  const y1 = g1_bar === '1' ? '0' : c1[sel] || '0';
  const y2 = g2_bar === '1' ? '0' : c2[sel] || '0';
  return { y1, y2 };
}

/**
 * 74139: Dual 2-to-4 Line Decoder / Demultiplexer
 * Active-low enables 1G, 2G. Active-low outputs 1Y0..1Y3 and 2Y0..2Y3.
 */
export function evaluate74139(
  a1: LogicValue,
  b1: LogicValue,
  g1_bar: LogicValue,
  a2: LogicValue,
  b2: LogicValue,
  g2_bar: LogicValue
): {
  y1_0: LogicValue; y1_1: LogicValue; y1_2: LogicValue; y1_3: LogicValue;
  y2_0: LogicValue; y2_1: LogicValue; y2_2: LogicValue; y2_3: LogicValue;
} {
  const decode = (a: LogicValue, b: LogicValue, g_bar: LogicValue) => {
    const outs: [LogicValue, LogicValue, LogicValue, LogicValue] = ['1', '1', '1', '1'];
    if (g_bar === '1') return outs;
    const sel = (a === '1' ? 1 : 0) + (b === '1' ? 2 : 0);
    outs[sel] = '0';
    return outs;
  };

  const [y1_0, y1_1, y1_2, y1_3] = decode(a1, b1, g1_bar);
  const [y2_0, y2_1, y2_2, y2_3] = decode(a2, b2, g2_bar);

  return { y1_0, y1_1, y1_2, y1_3, y2_0, y2_1, y2_2, y2_3 };
}

/**
 * 7493: 4-Bit Binary Ripple Counter (MOD-16)
 * Dual master reset R0(1) & R0(2) reset count to 0.
 * Negative-edge triggered on CKA (stage A) and CKB (stages B,C,D).
 */
export function evaluate7493(
  cka: LogicValue,
  prevCka: LogicValue | undefined,
  ckb: LogicValue,
  prevCkb: LogicValue | undefined,
  r0_1: LogicValue,
  r0_2: LogicValue,
  currentCount: number = 0
): { count: number; qa: LogicValue; qb: LogicValue; qc: LogicValue; qd: LogicValue } {
  let count = currentCount;

  if (r0_1 === '1' && r0_2 === '1') {
    count = 0;
  } else {
    const isFallingA = (prevCka === '1' || prevCka === undefined) && cka === '0';
    const isFallingB = (prevCkb === '1' || prevCkb === undefined) && ckb === '0';

    if (isFallingA || isFallingB) {
      count = (count + 1) & 0x0f;
    }
  }

  return {
    count,
    qa: (count & 1) ? '1' : '0',
    qb: (count & 2) ? '1' : '0',
    qc: (count & 4) ? '1' : '0',
    qd: (count & 8) ? '1' : '0',
  };
}

/**
 * 7485: 4-Bit Magnitude Comparator
 * Compares 4-bit words A[0..3] and B[0..3] with cascading inputs.
 */
export function evaluate7485(
  a: [LogicValue, LogicValue, LogicValue, LogicValue],
  b: [LogicValue, LogicValue, LogicValue, LogicValue],
  iAgtB: LogicValue = '0',
  iAltB: LogicValue = '0',
  iAeqB: LogicValue = '1'
): { oAgtB: LogicValue; oAltB: LogicValue; oAeqB: LogicValue } {
  const valA = (a[0] === '1' ? 1 : 0) + (a[1] === '1' ? 2 : 0) + (a[2] === '1' ? 4 : 0) + (a[3] === '1' ? 8 : 0);
  const valB = (b[0] === '1' ? 1 : 0) + (b[1] === '1' ? 2 : 0) + (b[2] === '1' ? 4 : 0) + (b[3] === '1' ? 8 : 0);

  if (valA > valB) {
    return { oAgtB: '1', oAltB: '0', oAeqB: '0' };
  }
  if (valA < valB) {
    return { oAgtB: '0', oAltB: '1', oAeqB: '0' };
  }
  // If equal, pass cascading inputs
  return {
    oAgtB: iAgtB === '1' ? '1' : '0',
    oAltB: iAltB === '1' ? '1' : '0',
    oAeqB: (iAgtB !== '1' && iAltB !== '1' && iAeqB === '1') ? '1' : '0',
  };
}

/**
 * 74194: 4-Bit Universal Bidirectional Shift Register
 * S0, S1 mode select: 00=Hold, 01=Shift Right, 10=Shift Left, 11=Parallel Load.
 */
export function evaluate74194(
  clk: LogicValue,
  prevClk: LogicValue | undefined,
  clr_bar: LogicValue,
  s0: LogicValue,
  s1: LogicValue,
  sr: LogicValue,
  sl: LogicValue,
  d: [LogicValue, LogicValue, LogicValue, LogicValue],
  currentQ: [LogicValue, LogicValue, LogicValue, LogicValue] = ['0', '0', '0', '0']
): [LogicValue, LogicValue, LogicValue, LogicValue] {
  if (clr_bar === '0') {
    return ['0', '0', '0', '0'];
  }

  const isRising = (prevClk === '0' || prevClk === undefined) && clk === '1';
  if (!isRising) return currentQ;

  const mode = (s0 === '1' ? 1 : 0) + (s1 === '1' ? 2 : 0);
  switch (mode) {
    case 0: // Hold
      return currentQ;
    case 1: // Shift Right (QA -> QB -> QC -> QD, SR -> QA)
      return [sr, currentQ[0], currentQ[1], currentQ[2]];
    case 2: // Shift Left (QD -> QC -> QB -> QA, SL -> QD)
      return [currentQ[1], currentQ[2], currentQ[3], sl];
    case 3: // Parallel Load (D0..D3)
      return [...d];
    default:
      return currentQ;
  }
}

/**
 * 7447: BCD to 7-Segment Decoder / Driver (Active-Low outputs)
 */
export function evaluate7447(
  a: LogicValue,
  b: LogicValue,
  c: LogicValue,
  d: LogicValue,
  lt_bar: LogicValue = '1',
  rbi_bar: LogicValue = '1'
): { a_bar: LogicValue; b_bar: LogicValue; c_bar: LogicValue; d_bar: LogicValue; e_bar: LogicValue; f_bar: LogicValue; g_bar: LogicValue } {
  // Lamp test overrides everything (all segments ON = active low 0)
  if (lt_bar === '0') {
    return { a_bar: '0', b_bar: '0', c_bar: '0', d_bar: '0', e_bar: '0', f_bar: '0', g_bar: '0' };
  }

  const val = (a === '1' ? 1 : 0) + (b === '1' ? 2 : 0) + (c === '1' ? 4 : 0) + (d === '1' ? 8 : 0);

  // Ripple blanking for zero
  if (val === 0 && rbi_bar === '0') {
    return { a_bar: '1', b_bar: '1', c_bar: '1', d_bar: '1', e_bar: '1', f_bar: '1', g_bar: '1' };
  }

  // Segment maps (1 = lit, 0 = unlit) -> invert for active low outputs
  const SEG_MAPS: number[] = [
    0x3f, // 0: a b c d e f
    0x06, // 1: b c
    0x5b, // 2: a b d e g
    0x4f, // 3: a b c d g
    0x66, // 4: b c f g
    0x6d, // 5: a c d f g
    0x7d, // 6: a c d e f g
    0x07, // 7: a b c
    0x7f, // 8: all
    0x6f, // 9: a b c d f g
    0x77, // A
    0x7c, // b
    0x39, // C
    0x5e, // d
    0x79, // E
    0x71, // F
  ];

  const mask = SEG_MAPS[val % 16];
  return {
    a_bar: (mask & 0x01) ? '0' : '1',
    b_bar: (mask & 0x02) ? '0' : '1',
    c_bar: (mask & 0x04) ? '0' : '1',
    d_bar: (mask & 0x08) ? '0' : '1',
    e_bar: (mask & 0x10) ? '0' : '1',
    f_bar: (mask & 0x20) ? '0' : '1',
    g_bar: (mask & 0x40) ? '0' : '1',
  };
}

// ---------------------------------------------------------------------------
// 3-Input Gates
// ---------------------------------------------------------------------------
export function evaluateAnd3(a: LogicValue, b: LogicValue, c: LogicValue): LogicValue {
  if (a === '0' || b === '0' || c === '0') return '0';
  if (a === '1' && b === '1' && c === '1') return '1';
  return 'X';
}

export function evaluateOr3(a: LogicValue, b: LogicValue, c: LogicValue): LogicValue {
  if (a === '1' || b === '1' || c === '1') return '1';
  if (a === '0' && b === '0' && c === '0') return '0';
  return 'X';
}

export function evaluateNand3(a: LogicValue, b: LogicValue, c: LogicValue): LogicValue {
  return notGate(evaluateAnd3(a, b, c));
}

export function evaluateNor3(a: LogicValue, b: LogicValue, c: LogicValue): LogicValue {
  return notGate(evaluateOr3(a, b, c));
}

// ---------------------------------------------------------------------------
// Transparent D Latch
// ---------------------------------------------------------------------------
export function evaluateDLatch(
  d: LogicValue,
  en: LogicValue,
  currentQ: LogicValue = '0'
): { q: LogicValue; qBar: LogicValue } {
  if (en === '1') {
    const q = d === '1' ? '1' : d === '0' ? '0' : 'X';
    return { q, qBar: notGate(q) };
  }
  return { q: currentQ, qBar: notGate(currentQ) };
}

// ---------------------------------------------------------------------------
// 4-to-2 Priority Encoder
// ---------------------------------------------------------------------------
export function evaluatePriorityEncoder4to2(
  d0: LogicValue,
  d1: LogicValue,
  d2: LogicValue,
  d3: LogicValue
): { y1: LogicValue; y0: LogicValue; v: LogicValue } {
  if (d3 === '1') return { y1: '1', y0: '1', v: '1' };
  if (d2 === '1') return { y1: '1', y0: '0', v: '1' };
  if (d1 === '1') return { y1: '0', y0: '1', v: '1' };
  if (d0 === '1') return { y1: '0', y0: '0', v: '1' };
  return { y1: '0', y0: '0', v: '0' };
}

// ---------------------------------------------------------------------------
// 4-Bit Parity Generator (Even & Odd)
// ---------------------------------------------------------------------------
export function evaluateParityGen(
  a: LogicValue,
  b: LogicValue,
  c: LogicValue,
  d: LogicValue
): { even: LogicValue; odd: LogicValue } {
  const p1 = xorGate(a, b);
  const p2 = xorGate(c, d);
  const odd = xorGate(p1, p2);
  const even = notGate(odd);
  return { even, odd };
}


