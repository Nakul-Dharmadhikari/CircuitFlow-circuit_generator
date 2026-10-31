import type { Circuit } from '../types/circuit';
import { createComponent, simulateCircuit } from '../engine/simulator';

export interface LabTask {
  id: string;
  text: string;
  hint?: string;
}

export interface LabExperiment {
  id: string;
  title: string;
  category: string;
  description: string;
  theory: string;
  circuit: Circuit;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  learningObjectives?: string[];
  tasks?: LabTask[];
  analysisTargetTab?: 'overview' | 'truth_table' | 'kmap' | 'timing' | 'sequential' | 'testbench' | 'diagnostics';
}

export function getLabExperiments(): LabExperiment[] {
  // =========================================================================
  // 1. Boolean Fundamentals: Basic Gates (AND, OR, NOT, NAND) & De Morgan
  // =========================================================================
  const demA = createComponent('toggle', 80, 80, 'A');
  const demB = createComponent('toggle', 80, 240, 'B');
  const andGate = createComponent('and', 260, 60, 'AND Gate');
  const orGate = createComponent('or', 260, 160, 'OR Gate');
  const notA = createComponent('not', 260, 260, 'NOT A');
  const nandGate = createComponent('nand', 260, 360, 'NAND Gate');
  const notB = createComponent('not', 260, 460, 'NOT B');
  const orDeM = createComponent('or', 440, 460, "OR (A' + B')");

  const ledAnd = createComponent('led', 440, 60, 'Y_AND');
  const ledOr = createComponent('led', 440, 160, 'Y_OR');
  const ledNot = createComponent('led', 440, 260, 'Y_NOT_A');
  const ledNand = createComponent('led', 440, 360, 'Y_NAND');
  const ledDem = createComponent('led', 600, 460, 'Y_DEMORGAN');
  ledAnd.customProps = { color: 'green' };
  ledOr.customProps = { color: 'green' };
  ledNot.customProps = { color: 'green' };
  ledNand.customProps = { color: 'green' };
  ledDem.customProps = { color: 'green' };

  const demWires = [
    { id: 'w_bf_a_and', fromCompId: demA.id, fromPinId: 'out', toCompId: andGate.id, toPinId: 'a', value: '0' as const },
    { id: 'w_bf_b_and', fromCompId: demB.id, fromPinId: 'out', toCompId: andGate.id, toPinId: 'b', value: '0' as const },
    { id: 'w_bf_and_led', fromCompId: andGate.id, fromPinId: 'out', toCompId: ledAnd.id, toPinId: 'in', value: '0' as const },

    { id: 'w_bf_a_or', fromCompId: demA.id, fromPinId: 'out', toCompId: orGate.id, toPinId: 'a', value: '0' as const },
    { id: 'w_bf_b_or', fromCompId: demB.id, fromPinId: 'out', toCompId: orGate.id, toPinId: 'b', value: '0' as const },
    { id: 'w_bf_or_led', fromCompId: orGate.id, fromPinId: 'out', toCompId: ledOr.id, toPinId: 'in', value: '0' as const },

    { id: 'w_bf_a_not', fromCompId: demA.id, fromPinId: 'out', toCompId: notA.id, toPinId: 'in', value: '0' as const },
    { id: 'w_bf_not_led', fromCompId: notA.id, fromPinId: 'out', toCompId: ledNot.id, toPinId: 'in', value: '1' as const },

    { id: 'w_bf_a_nand', fromCompId: demA.id, fromPinId: 'out', toCompId: nandGate.id, toPinId: 'a', value: '0' as const },
    { id: 'w_bf_b_nand', fromCompId: demB.id, fromPinId: 'out', toCompId: nandGate.id, toPinId: 'b', value: '0' as const },
    { id: 'w_bf_nand_led', fromCompId: nandGate.id, fromPinId: 'out', toCompId: ledNand.id, toPinId: 'in', value: '1' as const },

    { id: 'w_bf_b_not', fromCompId: demB.id, fromPinId: 'out', toCompId: notB.id, toPinId: 'in', value: '0' as const },
    { id: 'w_bf_nota_or', fromCompId: notA.id, fromPinId: 'out', toCompId: orDeM.id, toPinId: 'a', value: '1' as const },
    { id: 'w_bf_notb_or', fromCompId: notB.id, fromPinId: 'out', toCompId: orDeM.id, toPinId: 'b', value: '1' as const },
    { id: 'w_bf_dem_led', fromCompId: orDeM.id, fromPinId: 'out', toCompId: ledDem.id, toPinId: 'in', value: '1' as const },
  ];

  const demCircuit = simulateCircuit({
    components: [demA, demB, andGate, orGate, notA, nandGate, notB, orDeM, ledAnd, ledOr, ledNot, ledNand, ledDem],
    wires: demWires,
  }).circuit;

  // =========================================================================
  // 2. 1-Bit Half Adder
  // =========================================================================
  const haCompA = createComponent('toggle', 100, 100, 'A');
  const haCompB = createComponent('toggle', 100, 220, 'B');
  const haXor = createComponent('xor', 260, 100, 'XOR (Sum)');
  const haAnd = createComponent('and', 260, 220, 'AND (Carry)');
  const haLedSum = createComponent('led', 440, 100, 'SUM (S)');
  const haLedCarry = createComponent('led', 440, 220, 'CARRY (C)');
  haLedSum.customProps = { color: 'green' };
  haLedCarry.customProps = { color: 'green' };

  const haWires = [
    { id: 'w_ha_a_xor', fromCompId: haCompA.id, fromPinId: 'out', toCompId: haXor.id, toPinId: 'a', value: '0' as const },
    { id: 'w_ha_b_xor', fromCompId: haCompB.id, fromPinId: 'out', toCompId: haXor.id, toPinId: 'b', value: '0' as const },
    { id: 'w_ha_a_and', fromCompId: haCompA.id, fromPinId: 'out', toCompId: haAnd.id, toPinId: 'a', value: '0' as const },
    { id: 'w_ha_b_and', fromCompId: haCompB.id, fromPinId: 'out', toCompId: haAnd.id, toPinId: 'b', value: '0' as const },
    { id: 'w_ha_s', fromCompId: haXor.id, fromPinId: 'out', toCompId: haLedSum.id, toPinId: 'in', value: '0' as const },
    { id: 'w_ha_c', fromCompId: haAnd.id, fromPinId: 'out', toCompId: haLedCarry.id, toPinId: 'in', value: '0' as const },
  ];

  const haCircuit = simulateCircuit({
    components: [haCompA, haCompB, haXor, haAnd, haLedSum, haLedCarry],
    wires: haWires,
  }).circuit;

  // =========================================================================
  // 3. 1-Bit Full Adder with Carry-In
  // =========================================================================
  const faCompA = createComponent('toggle', 100, 100, 'A');
  const faCompB = createComponent('toggle', 100, 200, 'B');
  const faCompCin = createComponent('toggle', 100, 300, 'Cin');
  const faAdder = createComponent('full_adder', 280, 180, 'Full Adder');
  const faLedSum = createComponent('led', 460, 150, 'SUM (S)');
  const faLedCout = createComponent('led', 460, 260, 'CARRY (Cout)');
  faLedSum.customProps = { color: 'green' };
  faLedCout.customProps = { color: 'green' };

  const faWires = [
    { id: 'w_fa_a', fromCompId: faCompA.id, fromPinId: 'out', toCompId: faAdder.id, toPinId: 'a', value: '0' as const },
    { id: 'w_fa_b', fromCompId: faCompB.id, fromPinId: 'out', toCompId: faAdder.id, toPinId: 'b', value: '0' as const },
    { id: 'w_fa_cin', fromCompId: faCompCin.id, fromPinId: 'out', toCompId: faAdder.id, toPinId: 'cin', value: '0' as const },
    { id: 'w_fa_s', fromCompId: faAdder.id, fromPinId: 'sum', toCompId: faLedSum.id, toPinId: 'in', value: '0' as const },
    { id: 'w_fa_c', fromCompId: faAdder.id, fromPinId: 'cout', toCompId: faLedCout.id, toPinId: 'in', value: '0' as const },
  ];

  const faCircuit = simulateCircuit({
    components: [faCompA, faCompB, faCompCin, faAdder, faLedSum, faLedCout],
    wires: faWires,
  }).circuit;

  // =========================================================================
  // 4. 4:1 Multiplexer (Data Selector)
  // =========================================================================
  const muxI0 = createComponent('toggle', 100, 80, 'I0 (Data 0)');
  const muxI1 = createComponent('toggle', 100, 160, 'I1 (Data 1)');
  const muxI2 = createComponent('toggle', 100, 240, 'I2 (Data 2)');
  const muxI3 = createComponent('toggle', 100, 320, 'I3 (Data 3)');
  const muxS1 = createComponent('toggle', 240, 420, 'S1 (Select 1)');
  const muxS0 = createComponent('toggle', 340, 420, 'S0 (Select 0)');
  const muxComp = createComponent('mux_4to1', 280, 180, '74153 4:1 MUX');
  const muxLed = createComponent('led', 450, 200, 'Y (Output)');
  muxLed.customProps = { color: 'green' };

  const muxWires = [
    { id: 'w_m_i0', fromCompId: muxI0.id, fromPinId: 'out', toCompId: muxComp.id, toPinId: 'i0', value: '0' as const },
    { id: 'w_m_i1', fromCompId: muxI1.id, fromPinId: 'out', toCompId: muxComp.id, toPinId: 'i1', value: '0' as const },
    { id: 'w_m_i2', fromCompId: muxI2.id, fromPinId: 'out', toCompId: muxComp.id, toPinId: 'i2', value: '0' as const },
    { id: 'w_m_i3', fromCompId: muxI3.id, fromPinId: 'out', toCompId: muxComp.id, toPinId: 'i3', value: '0' as const },
    { id: 'w_m_s1', fromCompId: muxS1.id, fromPinId: 'out', toCompId: muxComp.id, toPinId: 's1', value: '0' as const },
    { id: 'w_m_s0', fromCompId: muxS0.id, fromPinId: 'out', toCompId: muxComp.id, toPinId: 's0', value: '0' as const },
    { id: 'w_m_y', fromCompId: muxComp.id, fromPinId: 'y', toCompId: muxLed.id, toPinId: 'in', value: '0' as const },
  ];

  const muxCircuit = simulateCircuit({
    components: [muxI0, muxI1, muxI2, muxI3, muxS1, muxS0, muxComp, muxLed],
    wires: muxWires,
  }).circuit;

  // =========================================================================
  // 5. 5-Bit Parity Generator (5 inputs: A, B, C, D, E)
  // =========================================================================
  const parA = createComponent('toggle', 100, 80, 'A');
  const parB = createComponent('toggle', 100, 160, 'B');
  const parC = createComponent('toggle', 100, 240, 'C');
  const parD = createComponent('toggle', 100, 320, 'D');
  const parE = createComponent('toggle', 100, 400, 'E');
  const xor1 = createComponent('xor', 260, 120, 'XOR1');
  const xor2 = createComponent('xor', 260, 280, 'XOR2');
  const xor3 = createComponent('xor', 400, 200, 'XOR3');
  const xor4 = createComponent('xor', 540, 260, 'XOR4');
  const parLed = createComponent('led', 680, 260, 'P (Parity)');
  parLed.customProps = { color: 'green' };

  const parWires = [
    { id: 'w_p_a', fromCompId: parA.id, fromPinId: 'out', toCompId: xor1.id, toPinId: 'a', value: '0' as const },
    { id: 'w_p_b', fromCompId: parB.id, fromPinId: 'out', toCompId: xor1.id, toPinId: 'b', value: '0' as const },
    { id: 'w_p_c', fromCompId: parC.id, fromPinId: 'out', toCompId: xor2.id, toPinId: 'a', value: '0' as const },
    { id: 'w_p_d', fromCompId: parD.id, fromPinId: 'out', toCompId: xor2.id, toPinId: 'b', value: '0' as const },
    { id: 'w_p_x1', fromCompId: xor1.id, fromPinId: 'out', toCompId: xor3.id, toPinId: 'a', value: '0' as const },
    { id: 'w_p_x2', fromCompId: xor2.id, fromPinId: 'out', toCompId: xor3.id, toPinId: 'b', value: '0' as const },
    { id: 'w_p_x3', fromCompId: xor3.id, fromPinId: 'out', toCompId: xor4.id, toPinId: 'a', value: '0' as const },
    { id: 'w_p_e', fromCompId: parE.id, fromPinId: 'out', toCompId: xor4.id, toPinId: 'b', value: '0' as const },
    { id: 'w_p_y', fromCompId: xor4.id, fromPinId: 'out', toCompId: parLed.id, toPinId: 'in', value: '0' as const },
  ];

  const parCircuit = simulateCircuit({
    components: [parA, parB, parC, parD, parE, xor1, xor2, xor3, xor4, parLed],
    wires: parWires,
  }).circuit;

  // =========================================================================
  // 6. 2-to-4 Line Decoder with Enable
  // =========================================================================
  const decEn = createComponent('toggle', 100, 100, 'Enable');
  const decA1 = createComponent('toggle', 100, 180, 'Address A1');
  const decA0 = createComponent('toggle', 100, 260, 'Address A0');
  decEn.state = { toggleState: true };
  decEn.outputs[0].value = '1';
  const decComp = createComponent('decoder_2to4', 270, 130, '74139 Decoder');
  const decY0 = createComponent('led', 450, 90, 'Y0 (Line 0)');
  const decY1 = createComponent('led', 450, 150, 'Y1 (Line 1)');
  const decY2 = createComponent('led', 450, 210, 'Y2 (Line 2)');
  const decY3 = createComponent('led', 450, 270, 'Y3 (Line 3)');
  decY0.customProps = { color: 'green' };
  decY1.customProps = { color: 'green' };
  decY2.customProps = { color: 'green' };
  decY3.customProps = { color: 'green' };

  const decWires = [
    { id: 'w_d_en', fromCompId: decEn.id, fromPinId: 'out', toCompId: decComp.id, toPinId: 'en', value: '1' as const },
    { id: 'w_d_a1', fromCompId: decA1.id, fromPinId: 'out', toCompId: decComp.id, toPinId: 'a1', value: '0' as const },
    { id: 'w_d_a0', fromCompId: decA0.id, fromPinId: 'out', toCompId: decComp.id, toPinId: 'a0', value: '0' as const },
    { id: 'w_d_y0', fromCompId: decComp.id, fromPinId: 'y0', toCompId: decY0.id, toPinId: 'in', value: '1' as const },
    { id: 'w_d_y1', fromCompId: decComp.id, fromPinId: 'y1', toCompId: decY1.id, toPinId: 'in', value: '0' as const },
    { id: 'w_d_y2', fromCompId: decComp.id, fromPinId: 'y2', toCompId: decY2.id, toPinId: 'in', value: '0' as const },
    { id: 'w_d_y3', fromCompId: decComp.id, fromPinId: 'y3', toCompId: decY3.id, toPinId: 'in', value: '0' as const },
  ];

  const decCircuit = simulateCircuit({
    components: [decEn, decA1, decA0, decComp, decY0, decY1, decY2, decY3],
    wires: decWires,
  }).circuit;

  // =========================================================================
  // 7. Edge-Triggered D Flip-Flop with Clock & Data Capture
  // =========================================================================
  const dCompData = createComponent('toggle', 100, 100, 'D (Data)');
  const dCompClk = createComponent('clock', 100, 220, 'Master Clock');
  const dCompFF = createComponent('d_flipflop', 260, 140, '7474 D-FF');
  const dLedQ = createComponent('led', 440, 120, 'Q (Stored)');
  const dLedQbar = createComponent('led', 440, 200, 'Q̄ (Inverted)');
  dLedQ.customProps = { color: 'green' };
  dLedQbar.customProps = { color: 'green' };

  const dWires = [
    { id: 'w_d_d', fromCompId: dCompData.id, fromPinId: 'out', toCompId: dCompFF.id, toPinId: 'd', value: '0' as const },
    { id: 'w_d_clk', fromCompId: dCompClk.id, fromPinId: 'out', toCompId: dCompFF.id, toPinId: 'clk', value: '0' as const },
    { id: 'w_d_q', fromCompId: dCompFF.id, fromPinId: 'q', toCompId: dLedQ.id, toPinId: 'in', value: '0' as const },
    { id: 'w_d_qb', fromCompId: dCompFF.id, fromPinId: 'qBar', toCompId: dLedQbar.id, toPinId: 'in', value: '1' as const },
  ];

  const dCircuit = simulateCircuit({
    components: [dCompData, dCompClk, dCompFF, dLedQ, dLedQbar],
    wires: dWires,
  }).circuit;

  // =========================================================================
  // 8. JK Flip-Flop Toggle & Frequency Divider
  // =========================================================================
  const jkPulseClk = createComponent('clock', 100, 150, 'Master Clock');
  const jkSwitchJ = createComponent('vcc', 100, 80, 'J=1');
  const jkSwitchK = createComponent('vcc', 100, 230, 'K=1');
  const jkComp = createComponent('jk_flipflop', 260, 130, '7476 JK-FF');
  const jkLedQ = createComponent('led', 420, 110, 'Q (Toggled)');
  const jkLedQbar = createComponent('led', 420, 190, 'Q̄ (Inverted)');
  jkLedQ.customProps = { color: 'green' };
  jkLedQbar.customProps = { color: 'green' };

  const jkWires = [
    { id: 'w_jk_j', fromCompId: jkSwitchJ.id, fromPinId: 'out', toCompId: jkComp.id, toPinId: 'j', value: '1' as const },
    { id: 'w_jk_clk', fromCompId: jkPulseClk.id, fromPinId: 'out', toCompId: jkComp.id, toPinId: 'clk', value: '0' as const },
    { id: 'w_jk_k', fromCompId: jkSwitchK.id, fromPinId: 'out', toCompId: jkComp.id, toPinId: 'k', value: '1' as const },
    { id: 'w_jk_q', fromCompId: jkComp.id, fromPinId: 'q', toCompId: jkLedQ.id, toPinId: 'in', value: '0' as const },
    { id: 'w_jk_qb', fromCompId: jkComp.id, fromPinId: 'qBar', toCompId: jkLedQbar.id, toPinId: 'in', value: '1' as const },
  ];

  const jkCircuit = simulateCircuit({
    components: [jkPulseClk, jkSwitchJ, jkSwitchK, jkComp, jkLedQ, jkLedQbar],
    wires: jkWires,
  }).circuit;

  // =========================================================================
  // 9. 3-Bit Synchronous Upcounter (Modulo-8)
  // =========================================================================
  const syncClk = createComponent('clock', 80, 240, 'Clock');
  const syncVcc = createComponent('vcc', 80, 100, 'VCC');
  const syncFF0 = createComponent('t_flipflop', 220, 80, 'Q0');
  const syncFF1 = createComponent('t_flipflop', 400, 80, 'Q1');
  const syncAnd = createComponent('and', 400, 260, 'Q0·Q1');
  const syncFF2 = createComponent('t_flipflop', 580, 80, 'Q2');
  const syncLed0 = createComponent('led', 260, 20, 'LED Q0');
  const syncLed1 = createComponent('led', 440, 20, 'LED Q1');
  const syncLed2 = createComponent('led', 620, 20, 'LED Q2');
  syncLed0.customProps = { color: 'green' };
  syncLed1.customProps = { color: 'green' };
  syncLed2.customProps = { color: 'green' };

  const syncWires = [
    { id: 'w_s_c0', fromCompId: syncClk.id, fromPinId: 'out', toCompId: syncFF0.id, toPinId: 'clk', value: '0' as const },
    { id: 'w_s_c1', fromCompId: syncClk.id, fromPinId: 'out', toCompId: syncFF1.id, toPinId: 'clk', value: '0' as const },
    { id: 'w_s_c2', fromCompId: syncClk.id, fromPinId: 'out', toCompId: syncFF2.id, toPinId: 'clk', value: '0' as const },
    { id: 'w_s_t0', fromCompId: syncVcc.id, fromPinId: 'out', toCompId: syncFF0.id, toPinId: 't', value: '1' as const },
    { id: 'w_s_t1', fromCompId: syncFF0.id, fromPinId: 'q', toCompId: syncFF1.id, toPinId: 't', value: '0' as const },
    { id: 'w_s_a0', fromCompId: syncFF0.id, fromPinId: 'q', toCompId: syncAnd.id, toPinId: 'a', value: '0' as const },
    { id: 'w_s_a1', fromCompId: syncFF1.id, fromPinId: 'q', toCompId: syncAnd.id, toPinId: 'b', value: '0' as const },
    { id: 'w_s_t2', fromCompId: syncAnd.id, fromPinId: 'out', toCompId: syncFF2.id, toPinId: 't', value: '0' as const },
    { id: 'w_s_l0', fromCompId: syncFF0.id, fromPinId: 'q', toCompId: syncLed0.id, toPinId: 'in', value: '0' as const },
    { id: 'w_s_l1', fromCompId: syncFF1.id, fromPinId: 'q', toCompId: syncLed1.id, toPinId: 'in', value: '0' as const },
    { id: 'w_s_l2', fromCompId: syncFF2.id, fromPinId: 'q', toCompId: syncLed2.id, toPinId: 'in', value: '0' as const },
  ];

  const syncCircuit = simulateCircuit({
    components: [syncClk, syncVcc, syncFF0, syncFF1, syncAnd, syncFF2, syncLed0, syncLed1, syncLed2],
    wires: syncWires,
  }).circuit;

  // =========================================================================
  // 10. 4-Bit Binary Counter to Hex Display
  // =========================================================================
  const cntClk = createComponent('clock', 80, 120, '1 Hz Clock');
  const cntRst = createComponent('push_button', 80, 200, 'Reset (Active H)');
  const cntVcc = createComponent('vcc', 80, 280, 'Enable=1');
  const cntComp = createComponent('counter_4bit', 240, 120, '7493 4-Bit Counter');
  const cntHex = createComponent('hex_display', 420, 110, 'Hex Readout');
  const cntLedTc = createComponent('led', 420, 260, 'Terminal Count');
  cntLedTc.customProps = { color: 'green' };

  const cntWires = [
    { id: 'w_c_clk', fromCompId: cntClk.id, fromPinId: 'out', toCompId: cntComp.id, toPinId: 'clk', value: '0' as const },
    { id: 'w_c_rst', fromCompId: cntRst.id, fromPinId: 'out', toCompId: cntComp.id, toPinId: 'rst', value: '0' as const },
    { id: 'w_c_en', fromCompId: cntVcc.id, fromPinId: 'out', toCompId: cntComp.id, toPinId: 'en', value: '1' as const },
    { id: 'w_c_q0', fromCompId: cntComp.id, fromPinId: 'q0', toCompId: cntHex.id, toPinId: 'd0', value: '0' as const },
    { id: 'w_c_q1', fromCompId: cntComp.id, fromPinId: 'q1', toCompId: cntHex.id, toPinId: 'd1', value: '0' as const },
    { id: 'w_c_q2', fromCompId: cntComp.id, fromPinId: 'q2', toCompId: cntHex.id, toPinId: 'd2', value: '0' as const },
    { id: 'w_c_q3', fromCompId: cntComp.id, fromPinId: 'q3', toCompId: cntHex.id, toPinId: 'd3', value: '0' as const },
    { id: 'w_c_tc', fromCompId: cntComp.id, fromPinId: 'tc', toCompId: cntLedTc.id, toPinId: 'in', value: '0' as const },
  ];

  const cntCircuit = simulateCircuit({
    components: [cntClk, cntRst, cntVcc, cntComp, cntHex, cntLedTc],
    wires: cntWires,
  }).circuit;

  // =========================================================================
  // 11. 4-Bit Serial Shift Register (SISO / SIPO)
  // =========================================================================
  const sregData = createComponent('toggle', 80, 120, 'Serial Input (Sin)');
  const sregClk = createComponent('clock', 80, 220, 'Shift Clock');
  const sregComp = createComponent('shift_reg_4bit', 260, 130, '74194 Shift Register');
  const sregLed0 = createComponent('led', 440, 70, 'Q0 (Bit 0)');
  const sregLed1 = createComponent('led', 440, 130, 'Q1 (Bit 1)');
  const sregLed2 = createComponent('led', 440, 190, 'Q2 (Bit 2)');
  const sregLed3 = createComponent('led', 440, 250, 'Q3 (Bit 3)');
  sregLed0.customProps = { color: 'green' };
  sregLed1.customProps = { color: 'green' };
  sregLed2.customProps = { color: 'green' };
  sregLed3.customProps = { color: 'green' };

  const sregWires = [
    { id: 'w_sr_din', fromCompId: sregData.id, fromPinId: 'out', toCompId: sregComp.id, toPinId: 'sin', value: '0' as const },
    { id: 'w_sr_clk', fromCompId: sregClk.id, fromPinId: 'out', toCompId: sregComp.id, toPinId: 'clk', value: '0' as const },
    { id: 'w_sr_q0', fromCompId: sregComp.id, fromPinId: 'q0', toCompId: sregLed0.id, toPinId: 'in', value: '0' as const },
    { id: 'w_sr_q1', fromCompId: sregComp.id, fromPinId: 'q1', toCompId: sregLed1.id, toPinId: 'in', value: '0' as const },
    { id: 'w_sr_q2', fromCompId: sregComp.id, fromPinId: 'q2', toCompId: sregLed2.id, toPinId: 'in', value: '0' as const },
    { id: 'w_sr_q3', fromCompId: sregComp.id, fromPinId: 'q3', toCompId: sregLed3.id, toPinId: 'in', value: '0' as const },
  ];

  const sregCircuit = simulateCircuit({
    components: [sregData, sregClk, sregComp, sregLed0, sregLed1, sregLed2, sregLed3],
    wires: sregWires,
  }).circuit;

  // =========================================================================
  // 12. Majority Voter & K-Map Minimization Lab
  // =========================================================================
  const mvA = createComponent('toggle', 80, 80, 'A');
  const mvB = createComponent('toggle', 80, 180, 'B');
  const mvC = createComponent('toggle', 80, 280, 'C');
  const andAB = createComponent('and', 260, 80, 'AB');
  const andBC = createComponent('and', 260, 180, 'BC');
  const andAC = createComponent('and', 260, 280, 'AC');
  const orAB_BC = createComponent('or', 420, 130, 'AB + BC');
  const orFinal = createComponent('or', 560, 180, 'Majority OR');
  const mvLed = createComponent('led', 700, 180, 'M (Decision)');
  mvLed.customProps = { color: 'green' };

  const mvWires = [
    { id: 'w_mv_a_ab', fromCompId: mvA.id, fromPinId: 'out', toCompId: andAB.id, toPinId: 'a', value: '0' as const },
    { id: 'w_mv_b_ab', fromCompId: mvB.id, fromPinId: 'out', toCompId: andAB.id, toPinId: 'b', value: '0' as const },
    { id: 'w_mv_b_bc', fromCompId: mvB.id, fromPinId: 'out', toCompId: andBC.id, toPinId: 'a', value: '0' as const },
    { id: 'w_mv_c_bc', fromCompId: mvC.id, fromPinId: 'out', toCompId: andBC.id, toPinId: 'b', value: '0' as const },
    { id: 'w_mv_a_ac', fromCompId: mvA.id, fromPinId: 'out', toCompId: andAC.id, toPinId: 'a', value: '0' as const },
    { id: 'w_mv_c_ac', fromCompId: mvC.id, fromPinId: 'out', toCompId: andAC.id, toPinId: 'b', value: '0' as const },
    { id: 'w_mv_ab_or', fromCompId: andAB.id, fromPinId: 'out', toCompId: orAB_BC.id, toPinId: 'a', value: '0' as const },
    { id: 'w_mv_bc_or', fromCompId: andBC.id, fromPinId: 'out', toCompId: orAB_BC.id, toPinId: 'b', value: '0' as const },
    { id: 'w_mv_or1_final', fromCompId: orAB_BC.id, fromPinId: 'out', toCompId: orFinal.id, toPinId: 'a', value: '0' as const },
    { id: 'w_mv_ac_final', fromCompId: andAC.id, fromPinId: 'out', toCompId: orFinal.id, toPinId: 'b', value: '0' as const },
    { id: 'w_mv_out', fromCompId: orFinal.id, fromPinId: 'out', toCompId: mvLed.id, toPinId: 'in', value: '0' as const },
  ];

  const mvCircuit = simulateCircuit({
    components: [mvA, mvB, mvC, andAB, andBC, andAC, orAB_BC, orFinal, mvLed],
    wires: mvWires,
  }).circuit;

  // =========================================================================
  // Master Educational Curriculum Return List
  // =========================================================================
  return [
    {
      id: 'boolean_fundamentals',
      title: 'Basic Logic Gates (AND, OR, NOT, NAND) & De Morgan',
      category: 'Boolean Fundamentals',
      difficulty: 'Beginner',
      description: "Verify basic gates (AND, OR, NOT, NAND) in parallel alongside De Morgan's theorem equivalence (A·B)' = A' + B' across all input combinations.",
      theory: "AND: Y = A·B; OR: Y = A+B; NOT: Y = A'; NAND: Y = (A·B)'. De Morgan's theorem proves NAND equals inverted-input OR: (A·B)' = A' + B'.",
      learningObjectives: [
        'Verify independent truth tables for fundamental AND, OR, and NOT gates',
        'Verify universal NAND gate logic across all input assignments',
        "Demonstrate De Morgan's theorem by comparing NAND with inverted-input OR",
      ],
      tasks: [
        { id: 't1', text: 'Set A=0, B=0: observe AND=0, OR=0, NOT=1, NAND=1, and DeMorgan=1.', hint: 'Inversion outputs are active when inputs are low.' },
        { id: 't2', text: 'Set A=1, B=0: observe AND=0, OR=1, NOT=0, NAND=1, and DeMorgan=1.', hint: 'OR gate illuminates whenever at least one input is 1.' },
        { id: 't3', text: 'Set A=1, B=1: observe AND=1, OR=1, NOT=0, NAND=0, and DeMorgan=0.', hint: 'AND is 1 only when both are 1; NAND is 0 only when both are 1.' },
        { id: 't4', text: 'Open the Truth Table tab in Analysis Center to inspect the complete matrix.', hint: 'Click Analyze -> Truth Table in the top menu.' },
      ],
      analysisTargetTab: 'truth_table',
      circuit: demCircuit,
    },
    {
      id: 'half_adder',
      title: '1-Bit Half Adder',
      category: 'Combinational Logic',
      difficulty: 'Beginner',
      description: 'Adds two 1-bit binary operands (A, B) producing Sum and Carry outputs using an XOR gate and an AND gate.',
      theory: 'Sum = A ⊕ B, Carry = A·B. The half adder is the fundamental building block of arithmetic logic units (ALUs).',
      learningObjectives: [
        'Understand binary addition fundamentals without carry-in',
        'Learn the difference between modulo-2 addition (XOR) and carry generation (AND)',
        'Verify canonical 2-variable Karnaugh mapping',
      ],
      tasks: [
        { id: 't1', text: 'Verify 0 + 0 = 0 (both Sum and Carry LEDs dark).', hint: 'Start with switches A=0 and B=0.' },
        { id: 't2', text: 'Set either A=1 or B=1 to verify Sum=1 and Carry=0.', hint: 'XOR outputs 1 when inputs differ.' },
        { id: 't3', text: 'Set both A=1 and B=1 to observe binary 10 (Sum=0, Carry=1).', hint: 'Decimal 1 + 1 = 2, represented as binary 10.' },
        { id: 't4', text: 'Inspect Karnaugh map simplification in the Analysis Center.', hint: 'Click Analyze -> K-Map to view the 2x2 grid.' },
      ],
      analysisTargetTab: 'kmap',
      circuit: haCircuit,
    },
    {
      id: 'full_adder',
      title: '1-Bit Full Adder with Carry-In',
      category: 'Combinational Logic',
      difficulty: 'Intermediate',
      description: 'Adds three binary bits (A, B, Cin) and produces Sum and Carry-Out signals for cascaded multi-bit addition.',
      theory: 'Sum = A ⊕ B ⊕ Cin, Cout = (A·B) + (Cin·(A ⊕ B)). Full adders can be chained in ripple-carry or carry-lookahead topologies.',
      learningObjectives: [
        'Trace multi-bit addition arithmetic with carry-in propagation',
        'Understand full adder internal logic and carry ripple behavior',
        'Verify all 8 combinations on a 3-variable truth table',
      ],
      tasks: [
        { id: 't1', text: 'Set Cin=1, A=0, B=0 and verify Sum=1, Cout=0.', hint: 'Carry-in adds into the current bit position.' },
        { id: 't2', text: 'Set A=1, B=1, Cin=0 to verify Sum=0, Cout=1.', hint: 'Two HIGH bits produce a carry without sum.' },
        { id: 't3', text: 'Set all inputs A=1, B=1, Cin=1 to verify Sum=1, Cout=1 (binary 11 = decimal 3).', hint: 'Three 1s produce both sum and carry.' },
      ],
      analysisTargetTab: 'truth_table',
      circuit: faCircuit,
    },
    {
      id: 'mux_4to1',
      title: '4:1 Multiplexer (Data Selector)',
      category: 'Combinational Logic',
      difficulty: 'Intermediate',
      description: 'Routes one of four input lines (I0-I3) to a single output line based on 2 select inputs (S1, S0).',
      theory: "Equivalent to IC 74153. Output Y = I0·S1'·S0' + I1·S1'·S0 + I2·S1·S0' + I3·S1·S0.",
      learningObjectives: [
        'Understand digital data multiplexing and channel addressing',
        'Analyze address decoding using select bits (S1, S0)',
        'Evaluate 6-variable Gray-coded Karnaugh minimization',
      ],
      tasks: [
        { id: 't1', text: 'Set I0=1, S1=0, S0=0 to verify data routing on channel 0.', hint: 'When select bits are 00, channel I0 is passed to Y.' },
        { id: 't2', text: 'Set I3=1, S1=1, S0=1 to route channel 3 to output Y.', hint: 'When S1=1, S0=1, output follows I3 regardless of other inputs.' },
        { id: 't3', text: 'Inspect the 6-variable Karnaugh Map in the Analysis Center.', hint: 'Notice the 4 Gray-coded layers (00, 01, 11, 10).' },
      ],
      analysisTargetTab: 'kmap',
      circuit: muxCircuit,
    },
    {
      id: 'parity_5bit',
      title: '5-Bit Parity Generator (A..E)',
      category: 'Combinational Logic',
      difficulty: 'Intermediate',
      description: 'Calculates odd/even parity across 5 binary inputs (A, B, C, D, E) using cascaded XOR gates.',
      theory: 'Parity P = A ⊕ B ⊕ C ⊕ D ⊕ E. Fundamental digital arithmetic check verifying 5-variable Karnaugh mapping across two layers (A=0, A=1).',
      learningObjectives: [
        'Understand error detection and parity bit generation',
        'Observe cascaded XOR propagation across multiple inputs',
        'Examine 5-variable 2-layer Gray-code Karnaugh maps',
      ],
      tasks: [
        { id: 't1', text: 'Turn on any single switch (e.g. A=1) to verify parity indicator lights up.', hint: 'An odd count of 1s (1, 3, 5) results in P=1.' },
        { id: 't2', text: 'Turn on a second switch (e.g. B=1) to see parity indicator turn off.', hint: 'An even count of 1s (0, 2, 4) produces P=0.' },
        { id: 't3', text: 'Turn on all 5 switches to confirm P=1 (5 is odd).', hint: 'P is 1 whenever sum of bits modulo 2 is 1.' },
      ],
      analysisTargetTab: 'kmap',
      circuit: parCircuit,
    },
    {
      id: 'decoder_2to4',
      title: '2-to-4 Line Decoder with Enable',
      category: 'Combinational Logic',
      difficulty: 'Beginner',
      description: 'Decodes a 2-bit binary code into one of four active-HIGH output lines when the Enable pin is active.',
      theory: 'Only one output line is HIGH for any combination of address inputs when EN=1. If EN=0, all outputs remain LOW.',
      learningObjectives: [
        'Understand address decoding for memory chip selection',
        'Examine active-HIGH enable gating and output steering',
        'Verify minterm generation (m0, m1, m2, m3)',
      ],
      tasks: [
        { id: 't1', text: 'With Enable=1, switch address inputs A1, A0 through 00, 01, 10, 11.', hint: 'Watch outputs Y0, Y1, Y2, Y3 illuminate in sequence.' },
        { id: 't2', text: 'Toggle Enable to 0 and observe all outputs shut off.', hint: 'Disable gates all outputs LOW.' },
      ],
      analysisTargetTab: 'truth_table',
      circuit: decCircuit,
    },
    {
      id: 'd_flipflop_clock',
      title: 'D Flip-Flop with Clock & Data Storage',
      category: 'Sequential Logic',
      difficulty: 'Beginner',
      description: 'Demonstrates edge-triggered memory storage capturing input D only on clock rising transitions.',
      theory: 'Q(next) = D on CLK rising edge. Retains stored state between clock pulses regardless of asynchronous input variations.',
      learningObjectives: [
        'Understand clock edge triggering versus level sensitivity',
        'Observe data setup and state retention in digital registers',
        'Inspect timing waveforms and clock pulses',
      ],
      tasks: [
        { id: 't1', text: 'Toggle data switch D=1 while simulation is paused or clock is LOW.', hint: 'Notice that stored output Q does NOT change immediately!' },
        { id: 't2', text: 'Click Step Clock (T key) or start simulation to trigger clock pulse.', hint: 'On the rising edge, Q captures the value of D.' },
        { id: 't3', text: 'Change D back to 0 without clocking and verify Q remains 1 (retained state).', hint: 'The flip-flop stores bit 1 until the next active clock edge.' },
      ],
      analysisTargetTab: 'timing',
      circuit: dCircuit,
    },
    {
      id: 'jk_flipflop',
      title: 'JK Flip-Flop (T-Mode Frequency Divider)',
      category: 'Sequential Logic',
      difficulty: 'Intermediate',
      description: 'Master-Slave JK Flip-Flop configured with J=1, K=1 to toggle state on every clock pulse (frequency halving).',
      theory: 'When J=K=1, the JK flip-flop eliminates the invalid SR latch condition and toggles Q on every clock rising edge (f_out = f_in / 2).',
      learningObjectives: [
        'Understand universal JK flip-flop operating modes',
        'Demonstrate digital clock frequency division by two',
        'Observe sequential state transitions in real time',
      ],
      tasks: [
        { id: 't1', text: 'Start simulation and observe Q toggling at half the master clock rate.', hint: 'Each complete output cycle requires two input clock cycles.' },
        { id: 't2', text: 'Open the Oscilloscope Waveform Scope to view frequency division.', hint: 'Click Analyze -> Oscilloscope Waveform Scope.' },
      ],
      analysisTargetTab: 'timing',
      circuit: jkCircuit,
    },
    {
      id: 'sync_upcounter_3bit',
      title: '3-Bit Synchronous Upcounter (Modulo-8)',
      category: 'Sequential Logic',
      difficulty: 'Advanced',
      description: 'Synchronous binary upcounter using 3 T flip-flops cycling states 000 through 111 on shared clock pulses with automated state transition truth table.',
      theory: 'T0=1, T1=Q0, T2=Q0·Q1. All flip-flops trigger simultaneously on the common clock edge, eliminating ripple delay.',
      learningObjectives: [
        'Design synchronous counter excitation logic with T flip-flops',
        'Analyze shared common clocking versus asynchronous ripple delay',
        'Inspect state transition tables and next-state logic',
      ],
      tasks: [
        { id: 't1', text: 'Step the clock to trace the counter: 000 -> 001 -> 010 -> 011 -> 100 -> 101 -> 110 -> 111 -> 000.', hint: 'Use the Single Step button in the top bar.' },
        { id: 't2', text: 'Open the Sequential State Machine tab in the Analysis Center.', hint: 'View present-state vs next-state transitions.' },
      ],
      analysisTargetTab: 'sequential',
      circuit: syncCircuit,
    },
    {
      id: 'counter_4bit',
      title: '4-Bit Binary Counter to Hex Display',
      category: 'Counters & Displays',
      difficulty: 'Intermediate',
      description: 'Asynchronous/Synchronous 4-bit binary counter cycling from 0000 (0) to 1111 (15) visualized on a 7-segment hex display.',
      theory: 'Counts 16 discrete states (modulo-16). Output changes on each rising edge of the input clock signal.',
      learningObjectives: [
        'Connect digital counters to 7-segment / hexadecimal readouts',
        'Understand terminal count carry-out signaling for multi-digit cascading',
        'Test active-HIGH reset clearing behavior',
      ],
      tasks: [
        { id: 't1', text: 'Watch the hex display count through 0..9 and A..F.', hint: '16 states total in modulo-16.' },
        { id: 't2', text: 'Press the Reset push button to immediately clear the display back to 0.', hint: 'Asynchronous reset overrides clocking.' },
      ],
      analysisTargetTab: 'timing',
      circuit: cntCircuit,
    },
    {
      id: 'shift_reg_4bit',
      title: '4-Bit Serial Shift Register',
      category: 'Sequential Logic',
      difficulty: 'Intermediate',
      description: 'Serial data enters bit-by-bit and propagates across 4 stages on each clock edge.',
      theory: 'Q0 := Sin, Q1 := Q0, Q2 := Q1, Q3 := Q2. Essential for serial-to-parallel data conversion, FIFO buffers, and arithmetic multipliers.',
      learningObjectives: [
        'Understand serial-in parallel-out (SIPO) register data shifting',
        'Observe bit progression on successive clock rising edges',
        'Analyze digital delay pipeline timing',
      ],
      tasks: [
        { id: 't1', text: 'Set Sin=1 for one clock tick, then set Sin=0.', hint: 'This injects a single 1 pulse into the register.' },
        { id: 't2', text: 'Step the clock 4 times to watch the 1 bit travel: Q0 -> Q1 -> Q2 -> Q3.', hint: 'Each stage delays data by one clock period.' },
      ],
      analysisTargetTab: 'timing',
      circuit: sregCircuit,
    },
    {
      id: 'majority_voter',
      title: 'Majority Voter & K-Map Minimization',
      category: 'Circuit Analysis',
      difficulty: 'Intermediate',
      description: 'A 3-input decision voting circuit (A, B, C) where output is HIGH whenever 2 or more inputs are 1. Ideal for Boolean minimization.',
      theory: 'M = A·B + B·C + A·C. Minimized from 4 canonical minterms Σ m(3, 5, 6, 7).',
      learningObjectives: [
        'Analyze multi-input majority decision logic',
        'Extract canonical minterms and perform Quine-McCluskey minimization',
        'Verify reduced SOP expression on a 2x4 Karnaugh map',
      ],
      tasks: [
        { id: 't1', text: 'Toggle any two inputs (e.g. A=1 and B=1) to verify decision output M=1.', hint: 'Any 2-out-of-3 votes produce HIGH output.' },
        { id: 't2', text: 'Turn off all but one input and verify output M=0.', hint: 'A minority vote produces LOW output.' },
        { id: 't3', text: 'Open the Karnaugh Map tab in Analysis Center to see the 2x4 Gray-code grid simplification.', hint: 'Observe the 3 prime implicants: AB, BC, AC.' },
      ],
      analysisTargetTab: 'kmap',
      circuit: mvCircuit,
    },
  ];
}
