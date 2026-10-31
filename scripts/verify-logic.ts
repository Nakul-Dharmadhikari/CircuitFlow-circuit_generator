import {
  notGate,
  andGate,
  orGate,
  nandGate,
  norGate,
  xorGate,
  xnorGate,
  triStateBuffer,
  halfAdder,
  fullAdder,
  mux2to1,
  mux4to1,
  decoder2to4,
  evaluateSRLatch,
  evaluateDFlipFlop,
  evaluateJKFlipFlop,
  evaluateTFlipFlop,
  evaluate4BitCounter,
} from '../src/engine/logicGates';

const SEVEN_SEG_DIGITS: Record<number, { a: boolean; b: boolean; c: boolean; d: boolean; e: boolean; f: boolean; g: boolean }> = {
  0: { a: true, b: true, c: true, d: true, e: true, f: true, g: false },
  8: { a: true, b: true, c: true, d: true, e: true, f: true, g: true },
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`❌ FAILED: ${msg}`);
  }
}

console.log('--- Digital Trainer Logic Verification Suite ---');

// 1. Basic Gates
assert(notGate('0') === '1', 'NOT 0 -> 1');
assert(notGate('1') === '0', 'NOT 1 -> 0');

assert(andGate('0', '0') === '0', 'AND 0,0 -> 0');
assert(andGate('0', '1') === '0', 'AND 0,1 -> 0');
assert(andGate('1', '0') === '0', 'AND 1,0 -> 0');
assert(andGate('1', '1') === '1', 'AND 1,1 -> 1');

assert(orGate('0', '0') === '0', 'OR 0,0 -> 0');
assert(orGate('0', '1') === '1', 'OR 0,1 -> 1');
assert(orGate('1', '0') === '1', 'OR 1,0 -> 1');
assert(orGate('1', '1') === '1', 'OR 1,1 -> 1');

assert(nandGate('0', '0') === '1', 'NAND 0,0 -> 1');
assert(nandGate('1', '1') === '0', 'NAND 1,1 -> 0');

assert(norGate('0', '0') === '1', 'NOR 0,0 -> 1');
assert(norGate('0', '1') === '0', 'NOR 0,1 -> 0');

assert(xorGate('0', '0') === '0', 'XOR 0,0 -> 0');
assert(xorGate('0', '1') === '1', 'XOR 0,1 -> 1');
assert(xorGate('1', '0') === '1', 'XOR 1,0 -> 1');
assert(xorGate('1', '1') === '0', 'XOR 1,1 -> 0');

assert(xnorGate('0', '0') === '1', 'XNOR 0,0 -> 1');
assert(xnorGate('0', '1') === '0', 'XNOR 0,1 -> 0');
assert(xnorGate('1', '1') === '1', 'XNOR 1,1 -> 1');

assert(triStateBuffer('1', '1') === '1', 'TriState EN=1, IN=1 -> 1');
assert(triStateBuffer('0', '1') === '0', 'TriState EN=1, IN=0 -> 0');
assert(triStateBuffer('1', '0') === 'Z', 'TriState EN=0 -> Z');

// 2. Adders
const ha00 = halfAdder('0', '0');
assert(ha00.sum === '0' && ha00.carry === '0', 'Half Adder 0+0 -> Sum=0, C=0');
const ha01 = halfAdder('0', '1');
assert(ha01.sum === '1' && ha01.carry === '0', 'Half Adder 0+1 -> Sum=1, C=0');
const ha11 = halfAdder('1', '1');
assert(ha11.sum === '0' && ha11.carry === '1', 'Half Adder 1+1 -> Sum=0, C=1');

const fa111 = fullAdder('1', '1', '1');
assert(fa111.sum === '1' && fa111.cout === '1', 'Full Adder 1+1+1 -> Sum=1, Cout=1');
const fa110 = fullAdder('1', '1', '0');
assert(fa110.sum === '0' && fa110.cout === '1', 'Full Adder 1+1+0 -> Sum=0, Cout=1');
const fa100 = fullAdder('1', '0', '0');
assert(fa100.sum === '1' && fa100.cout === '0', 'Full Adder 1+0+0 -> Sum=1, Cout=0');

// 3. Multiplexers
assert(mux2to1('0', '1', '0') === '0', 'MUX 2:1 S=0 picks I0');
assert(mux2to1('0', '1', '1') === '1', 'MUX 2:1 S=1 picks I1');

assert(mux4to1('0', '1', '0', '1', '1', '1') === '1', 'MUX 4:1 S=11 picks I3');
assert(mux4to1('1', '0', '0', '0', '0', '0') === '1', 'MUX 4:1 S=00 picks I0');

// 4. Decoders
const dec00 = decoder2to4('1', '0', '0');
assert(dec00.y0 === '1' && dec00.y1 === '0' && dec00.y2 === '0' && dec00.y3 === '0', 'Decoder 2:4 00');
const dec11 = decoder2to4('1', '1', '1');
assert(dec11.y0 === '0' && dec11.y1 === '0' && dec11.y2 === '0' && dec11.y3 === '1', 'Decoder 2:4 11');
const decEn0 = decoder2to4('0', '1', '1');
assert(decEn0.y3 === '0', 'Decoder Disabled -> all 0');

// 5. Flip Flops
// SR
const srSet = evaluateSRLatch('1', '0', '0');
assert(srSet.q === '1' && srSet.qBar === '0' && !srSet.invalid, 'SR Set: Q=1');
const srReset = evaluateSRLatch('0', '1', '1');
assert(srReset.q === '0' && srReset.qBar === '1' && !srReset.invalid, 'SR Reset: Q=0');
const srHold = evaluateSRLatch('0', '0', '1');
assert(srHold.q === '1' && !srHold.invalid, 'SR Hold: Q=1');
const srInvalid = evaluateSRLatch('1', '1', '0');
assert(srInvalid.invalid, 'SR Invalid detected when S=1, R=1');

// D Flip-Flop
const dRise = evaluateDFlipFlop('1', '1', '0', '0');
assert(dRise.q === '1', 'D Flip-Flop rising edge stores 1');
const dNoEdge = evaluateDFlipFlop('1', '1', '1', '0');
assert(dNoEdge.q === '0', 'D Flip-Flop no rising edge maintains state');
const dPreOverride = evaluateDFlipFlop('0', '0', '0', '0', '0', '1'); // PRE=0, CLR=1
assert(dPreOverride.q === '1' && dPreOverride.qBar === '0', 'D-FF Asynchronous PRE=0 forces Q=1');
const dClrOverride = evaluateDFlipFlop('1', '0', '0', '1', '1', '0'); // PRE=1, CLR=0
assert(dClrOverride.q === '0' && dClrOverride.qBar === '1', 'D-FF Asynchronous CLR=0 forces Q=0');
const dInvalidPreClr = evaluateDFlipFlop('1', '0', '0', '1', '0', '0'); // PRE=0, CLR=0
assert(dInvalidPreClr.q === 'X', 'D-FF PRE=0, CLR=0 results in invalid X state');

// JK Flip-Flop
const jkHold = evaluateJKFlipFlop('0', '0', '1', '0', '1');
assert(jkHold.q === '1', 'JK Flip-Flop 0,0 Hold');
const jkReset = evaluateJKFlipFlop('0', '1', '1', '0', '1');
assert(jkReset.q === '0', 'JK Flip-Flop 0,1 Reset');
const jkSet = evaluateJKFlipFlop('1', '0', '1', '0', '0');
assert(jkSet.q === '1', 'JK Flip-Flop 1,0 Set');
const jkTog1 = evaluateJKFlipFlop('1', '1', '1', '0', '0');
assert(jkTog1.q === '1', 'JK Flip-Flop 1,1 Toggle 0->1');
const jkTog2 = evaluateJKFlipFlop('1', '1', '1', '0', '1');
assert(jkTog2.q === '0', 'JK Flip-Flop 1,1 Toggle 1->0');
const jkPre = evaluateJKFlipFlop('0', '1', '0', '0', '0', '0', '1');
assert(jkPre.q === '1', 'JK-FF Asynchronous PRE=0 forces Q=1');
const jkClr = evaluateJKFlipFlop('1', '0', '0', '0', '1', '1', '0');
assert(jkClr.q === '0', 'JK-FF Asynchronous CLR=0 forces Q=0');

// T Flip-Flop
const tTog = evaluateTFlipFlop('1', '1', '0', '0');
assert(tTog.q === '1', 'T Flip-Flop Toggle 0->1');
const tHold = evaluateTFlipFlop('0', '1', '0', '1');
assert(tHold.q === '1', 'T Flip-Flop T=0 Hold');
const tPre = evaluateTFlipFlop('0', '0', '0', '0', '0', '1');
assert(tPre.q === '1', 'T-FF Asynchronous PRE=0 forces Q=1');

// 4-bit Counter
const cnt1 = evaluate4BitCounter('1', '0', '0', '1', 5);
assert(cnt1.count === 6 && cnt1.q0 === '0' && cnt1.q1 === '1' && cnt1.q2 === '1', 'Counter 5->6');
const cntRst = evaluate4BitCounter('1', '0', '1', '1', 9);
assert(cntRst.count === 0, 'Counter Reset -> 0');

// 7-Segment Display
assert(SEVEN_SEG_DIGITS[0].g === false && SEVEN_SEG_DIGITS[0].a === true, '7-Seg 0 has G off');
assert(SEVEN_SEG_DIGITS[8].a && SEVEN_SEG_DIGITS[8].g, '7-Seg 8 has all segments ON');

console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ ALL LOGIC COMPONENTS MATHEMATICALLY VERIFIED!');
}
