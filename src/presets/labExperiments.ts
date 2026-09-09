import type { Circuit } from '../types/circuit';
import { createComponent, simulateCircuit } from '../engine/simulator';

export interface LabExperiment {
  id: string;
  title: string;
  category: string;
  description: string;
  theory: string;
  circuit: Circuit;
}

export function getLabExperiments(): LabExperiment[] {
  // 1. Full Adder
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

  // 2. 4:1 Multiplexer (Data Selector)
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

  // 3. JK Flip-Flop Toggle & Divider
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

  // 4. 3-Bit Synchronous Upcounter (Modulo-8)
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
    // Clock line to all 3 T flip-flops (Synchronous clocking)
    { id: 'w_s_c0', fromCompId: syncClk.id, fromPinId: 'out', toCompId: syncFF0.id, toPinId: 'clk', value: '0' as const },
    { id: 'w_s_c1', fromCompId: syncClk.id, fromPinId: 'out', toCompId: syncFF1.id, toPinId: 'clk', value: '0' as const },
    { id: 'w_s_c2', fromCompId: syncClk.id, fromPinId: 'out', toCompId: syncFF2.id, toPinId: 'clk', value: '0' as const },
    // T0 = 1 (always toggles on clock pulse)
    { id: 'w_s_t0', fromCompId: syncVcc.id, fromPinId: 'out', toCompId: syncFF0.id, toPinId: 't', value: '1' as const },
    // T1 = Q0
    { id: 'w_s_t1', fromCompId: syncFF0.id, fromPinId: 'q', toCompId: syncFF1.id, toPinId: 't', value: '0' as const },
    // AND inputs: Q0 and Q1
    { id: 'w_s_a0', fromCompId: syncFF0.id, fromPinId: 'q', toCompId: syncAnd.id, toPinId: 'a', value: '0' as const },
    { id: 'w_s_a1', fromCompId: syncFF1.id, fromPinId: 'q', toCompId: syncAnd.id, toPinId: 'b', value: '0' as const },
    // T2 = Q0 · Q1
    { id: 'w_s_t2', fromCompId: syncAnd.id, fromPinId: 'out', toCompId: syncFF2.id, toPinId: 't', value: '0' as const },
    // Outputs to LEDs
    { id: 'w_s_l0', fromCompId: syncFF0.id, fromPinId: 'q', toCompId: syncLed0.id, toPinId: 'in', value: '0' as const },
    { id: 'w_s_l1', fromCompId: syncFF1.id, fromPinId: 'q', toCompId: syncLed1.id, toPinId: 'in', value: '0' as const },
    { id: 'w_s_l2', fromCompId: syncFF2.id, fromPinId: 'q', toCompId: syncLed2.id, toPinId: 'in', value: '0' as const },
  ];

  const syncCircuit = simulateCircuit({
    components: [syncClk, syncVcc, syncFF0, syncFF1, syncAnd, syncFF2, syncLed0, syncLed1, syncLed2],
    wires: syncWires,
  }).circuit;

  // 5. 4-Bit Binary Counter with Hex & 7-Segment Display
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

  // 5. 2:4 Decoder
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

  return [
    {
      id: 'full_adder',
      title: '1-Bit Full Adder with Carry-In',
      category: 'Arithmetic Circuits',
      description: 'Adds three binary bits (A, B, Cin) and produces Sum and Carry-Out signals.',
      theory: 'Sum = A ⊕ B ⊕ Cin, Cout = (A·B) + (Cin·(A ⊕ B)). Used as the fundamental building block in arithmetic logic units (ALU).',
      circuit: faCircuit,
    },
    {
      id: 'mux_4to1',
      title: '4:1 Multiplexer (Data Selector)',
      category: 'Combinational Logic',
      description: 'Routes one of four input lines (I0-I3) to a single output line based on 2 select inputs (S1, S0).',
      theory: 'Equivalent to IC 74153. Output Y = I0·S1\'·S0\' + I1·S1\'·S0 + I2·S1·S0\' + I3·S1·S0.',
      circuit: muxCircuit,
    },
    {
      id: 'jk_flipflop',
      title: 'JK Flip-Flop (T-Mode Frequency Divider)',
      category: 'Sequential Logic',
      description: 'Master-Slave JK Flip-Flop configured with J=1, K=1 to toggle state on every clock pulse (frequency halving).',
      theory: 'When J=K=1, the JK flip-flop eliminates the invalid SR latch condition and toggles Q on every clock rising edge (f_out = f_in / 2).',
      circuit: jkCircuit,
    },
    {
      id: 'sync_upcounter_3bit',
      title: '3-Bit Synchronous Upcounter (Modulo-8)',
      category: 'Sequential Logic',
      description: 'Synchronous binary upcounter using 3 T flip-flops cycling states 000 through 111 on shared clock pulses with automated state transition truth table.',
      theory: 'T0=1, T1=Q0, T2=Q0·Q1. All flip-flops trigger simultaneously on the common clock edge, eliminating ripple delay.',
      circuit: syncCircuit,
    },
    {
      id: 'counter_4bit',
      title: '4-Bit Binary Counter to Hex Display',
      category: 'Counters & Displays',
      description: 'Asynchronous/Synchronous 4-bit binary counter cycling from 0000 (0) to 1111 (15) visualized on a 7-segment hex display.',
      theory: 'Counts 16 discrete states (modulo-16). Output changes on each rising edge of the input clock signal.',
      circuit: cntCircuit,
    },
    {
      id: 'decoder_2to4',
      title: '2-to-4 Line Decoder with Enable',
      category: 'Decoders & Encoders',
      description: 'Decodes a 2-bit binary code into one of four active-HIGH output lines when the Enable pin is active.',
      theory: 'Only one output line is HIGH for any combination of address inputs when EN=1. If EN=0, all outputs remain LOW.',
      circuit: decCircuit,
    },
  ];
}
