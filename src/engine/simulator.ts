import type { Circuit, CircuitComponent, ComponentType, LogicValue, Pin, Wire } from '../types/circuit';
import {
  andGate,
  comparator4bit,
  decoder2to4,
  demux1to2,
  demux1to4,
  evaluate4BitCounter,
  evaluate4BitShiftRegister,
  evaluateDFlipFlop,
  evaluateJKFlipFlop,
  evaluateSRLatch,
  evaluateTFlipFlop,
  fullAdder,
  halfAdder,
  mux2to1,
  mux4to1,
  nandGate,
  norGate,
  notGate,
  orGate,
  resolveLogic,
  triStateBuffer,
  xnorGate,
  xorGate,
  evaluate74151,
  evaluate74138,
  evaluate7490,
  evaluate7483,
  evaluate74153,
  evaluate74139,
  evaluate7493,
  evaluate7485,
  evaluate74194,
  evaluate7447,
  evaluateAnd3,
  evaluateOr3,
  evaluateNand3,
  evaluateNor3,
  evaluateDLatch,
  evaluatePriorityEncoder4to2,
  evaluateParityGen,
} from './logicGates';

export function getComponentDisplayName(type: ComponentType): string {
  switch (type) {
    // 74-Series DIP ICs (Horizontal DIP)
    case 'ic_7408': return '7408 Quad 2-In AND Gate';
    case 'ic_7432': return '7432 Quad 2-In OR Gate';
    case 'ic_7404': return '7404 Hex Inverter NOT';
    case 'ic_7400': return '7400 Quad 2-In NAND Gate';
    case 'ic_7402': return '7402 Quad 2-In NOR Gate';
    case 'ic_7486': return '7486 Quad 2-In XOR Gate';
    case 'ic_74151': return '74151 8:1 Data Selector / MUX';
    case 'ic_74153': return '74153 Dual 4:1 Data Selector / MUX';
    case 'ic_74138': return '74138 3:8 Decoder / DEMUX';
    case 'ic_74139': return '74139 Dual 2:4 Line Decoder / DEMUX';
    case 'ic_7490': return '7490 Decade / BCD Counter';
    case 'ic_7493': return '7493 4-Bit Binary Ripple Counter';
    case 'ic_7483': return '7483 4-Bit Binary Full Adder';
    case 'ic_7485': return '7485 4-Bit Magnitude Comparator';
    case 'ic_7474': return '7474 Dual D Flip-Flop';
    case 'ic_7476': return '7476 Dual JK Flip-Flop';
    case 'ic_74194': return '74194 4-Bit Bidirectional Shift Reg';
    case 'ic_7447': return '7447 BCD to 7-Segment Decoder';
    case 'ic_555': return 'NE555 Precision Timer IC';
    case 'custom_ic': return 'Custom User-Created IC';

    case 'buffer': return 'Buffer';
    case 'not': return 'NOT Gate (Inverter)';
    case 'and': return 'AND Gate (2-Input)';
    case 'and_3': return '3-Input AND Gate';
    case 'or': return 'OR Gate (2-Input)';
    case 'or_3': return '3-Input OR Gate';
    case 'nand': return 'NAND Gate (2-Input)';
    case 'nand_3': return '3-Input NAND Gate';
    case 'nor': return 'NOR Gate (2-Input)';
    case 'nor_3': return '3-Input NOR Gate';
    case 'xor': return 'XOR Gate';
    case 'xnor': return 'XNOR Gate';
    case 'tri_state': return 'Tri-State Buffer';
    case 'input_pin': return 'Input Pin (0/1 Toggle)';
    case 'output_pin': return 'Output Pin (Logic Probe)';
    case 'toggle': return 'Toggle Switch (0/1)';
    case 'push_button': return 'Push Button (Pulse)';
    case 'clock': return 'Clock Generator';
    case 'vcc': return 'VCC (+5V Power)';
    case 'gnd': return 'GND (0V Ground)';
    case 'led': return 'LED Indicator';
    case 'rgb_led': return 'RGB Multi-Color LED';
    case 'led_bar_4': return '4-Bit LED Bar Graph';
    case 'probe': return 'Digital Logic Probe';
    case 'buzzer': return 'Audio Buzzer';
    case 'seven_segment': return '7-Segment Display';
    case 'hex_display': return 'Hexadecimal Display';
    case 'half_adder': return 'Half Adder';
    case 'full_adder': return 'Full Adder';
    case 'mux_2to1': return '2:1 Multiplexer';
    case 'mux_4to1': return '4:1 Multiplexer (74153)';
    case 'demux_1to2': return '1:2 Demultiplexer';
    case 'demux_1to4': return '1:4 Demultiplexer';
    case 'decoder_2to4': return '2:4 Line Decoder (74139)';
    case 'comparator_4bit': return '4-Bit Magnitude Comparator (7485)';
    case 'priority_encoder_4to2': return '4:2 Priority Encoder';
    case 'parity_gen': return '4-Bit Parity Generator';
    case 'sr_latch': return 'SR Latch';
    case 'd_latch': return 'Transparent D Latch';
    case 'd_flipflop': return 'D Flip-Flop (7474)';
    case 'jk_flipflop': return 'JK Flip-Flop (7476)';
    case 't_flipflop': return 'T Flip-Flop';
    case 'counter_4bit': return '4-Bit Binary Counter (7493)';
    case 'shift_reg_4bit': return '4-Bit Shift Register (74194)';
    case 'breadboard': return 'Full Solderless Breadboard (830pts)';
    case 'breadboard_half': return 'Half Breadboard (400pts)';
    case 'breadboard_mini': return 'Mini Breadboard (170pts)';
    case 'junction': return 'Wire Junction';
    default: return String(type).toUpperCase();
  }
}

/**
 * Standard DIP Pinout Generator:
 * Generates pin positions along bottom (1..N/2) and top (N..N/2+1) in accordance with standard JEDEC DIP packages.
 */
export function createDipPins(
  pinDefs: Array<{
    pin: number;
    id: string;
    name: string;
    type: 'input' | 'output';
    inverted?: boolean;
    defaultValue?: LogicValue;
  }>,
  pinCount: 14 | 16 | 20,
  width: number,
  height: number
): { inputs: Pin[]; outputs: Pin[] } {
  const definedPins = new Set(pinDefs.map((p) => p.pin));
  const fullDefs = [...pinDefs];

  // Auto-fill unused physical pins up to pinCount (e.g. 20) with NC
  if (pinCount === 20) {
    for (let p = 1; p <= 20; p++) {
      if (!definedPins.has(p)) {
        fullDefs.push({
          pin: p,
          id: `pin_${p}_nc`,
          name: 'NC',
          type: 'input',
          defaultValue: '0',
        });
      }
    }
  }

  const inputs: Pin[] = [];
  const outputs: Pin[] = [];
  const pinsPerSide = pinCount / 2;
  const colSpacing = width / (pinsPerSide + 1);

  fullDefs.forEach((def) => {
    const pNum = def.pin;
    let pinX = 0;
    let pinY = 0;
    let labelPos: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

    if (pNum <= pinsPerSide) {
      // Bottom Row: pin 1 is bottom-left, pin 10 is bottom-right
      pinX = Math.round(pNum * colSpacing);
      pinY = height;
      labelPos = 'bottom';
    } else {
      // Top Row: pin 20 is top-left, pin 11 is top-right
      const col = pinCount - pNum + 1;
      pinX = Math.round(col * colSpacing);
      pinY = 0;
      labelPos = 'top';
    }

    const pinObj: Pin = {
      id: def.id,
      name: def.name,
      type: def.type,
      x: pinX,
      y: pinY,
      value: def.defaultValue || (def.inverted ? '1' : '0'),
      inverted: def.inverted,
      labelPosition: labelPos,
    };

    if (def.type === 'input') {
      inputs.push(pinObj);
    } else {
      outputs.push(pinObj);
    }
  });

  return { inputs, outputs };
}

export function createComponent(
  type: ComponentType,
  x: number,
  y: number,
  customLabel?: string,
  initialCustomProps?: Record<string, any>
): CircuitComponent {
  const id = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const hasCustom = Boolean(customLabel && customLabel.trim().length > 0);
  let label = hasCustom ? (customLabel as string) : '';
  let width = 80;
  let height = 50;
  const inputs: Pin[] = [];
  const outputs: Pin[] = [];
  const state: Record<string, any> = {};
  const customProps: Record<string, any> = { ...initialCustomProps };

  switch (type) {
    // =========================================================================
    // 74-SERIES 20-PIN HORIZONTAL DIP INTEGRATED CIRCUITS
    // =========================================================================
    case 'ic_7408': {
      width = 240;
      height = 85;
      label = '74LS08';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: '1A', type: 'input' },
          { pin: 2, id: '2', name: '1B', type: 'input' },
          { pin: 3, id: '3', name: '1Y', type: 'output' },
          { pin: 4, id: '4', name: '2A', type: 'input' },
          { pin: 5, id: '5', name: '2B', type: 'input' },
          { pin: 6, id: '6', name: '2Y', type: 'output' },
          { pin: 7, id: '7', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 10, id: '10_gnd', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 14, id: '8', name: '3Y', type: 'output' },
          { pin: 15, id: '9', name: '3A', type: 'input' },
          { pin: 16, id: '10', name: '3B', type: 'input' },
          { pin: 17, id: '11', name: '4Y', type: 'output' },
          { pin: 18, id: '12', name: '4A', type: 'input' },
          { pin: 19, id: '13', name: '4B', type: 'input' },
          { pin: 20, id: '14', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_7432': {
      width = 240;
      height = 85;
      label = '74LS32';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: '1A', type: 'input' },
          { pin: 2, id: '2', name: '1B', type: 'input' },
          { pin: 3, id: '3', name: '1Y', type: 'output' },
          { pin: 4, id: '4', name: '2A', type: 'input' },
          { pin: 5, id: '5', name: '2B', type: 'input' },
          { pin: 6, id: '6', name: '2Y', type: 'output' },
          { pin: 7, id: '7', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 10, id: '10_gnd', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 14, id: '8', name: '3Y', type: 'output' },
          { pin: 15, id: '9', name: '3A', type: 'input' },
          { pin: 16, id: '10', name: '3B', type: 'input' },
          { pin: 17, id: '11', name: '4Y', type: 'output' },
          { pin: 18, id: '12', name: '4A', type: 'input' },
          { pin: 19, id: '13', name: '4B', type: 'input' },
          { pin: 20, id: '14', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_7404': {
      width = 240;
      height = 85;
      label = '74LS04';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: '1A', type: 'input' },
          { pin: 2, id: '2', name: '1Y', type: 'output', inverted: true },
          { pin: 3, id: '3', name: '2A', type: 'input' },
          { pin: 4, id: '4', name: '2Y', type: 'output', inverted: true },
          { pin: 5, id: '5', name: '3A', type: 'input' },
          { pin: 6, id: '6', name: '3Y', type: 'output', inverted: true },
          { pin: 7, id: '7', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 10, id: '10_gnd', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 14, id: '8', name: '4Y', type: 'output', inverted: true },
          { pin: 15, id: '9', name: '4A', type: 'input' },
          { pin: 16, id: '10', name: '5Y', type: 'output', inverted: true },
          { pin: 17, id: '11', name: '5A', type: 'input' },
          { pin: 18, id: '12', name: '6Y', type: 'output', inverted: true },
          { pin: 19, id: '13', name: '6A', type: 'input' },
          { pin: 20, id: '14', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_7400': {
      width = 240;
      height = 85;
      label = '74LS00';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: '1A', type: 'input' },
          { pin: 2, id: '2', name: '1B', type: 'input' },
          { pin: 3, id: '3', name: '1Y', type: 'output', inverted: true },
          { pin: 4, id: '4', name: '2A', type: 'input' },
          { pin: 5, id: '5', name: '2B', type: 'input' },
          { pin: 6, id: '6', name: '2Y', type: 'output', inverted: true },
          { pin: 7, id: '7', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 10, id: '10_gnd', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 14, id: '8', name: '3Y', type: 'output', inverted: true },
          { pin: 15, id: '9', name: '3A', type: 'input' },
          { pin: 16, id: '10', name: '3B', type: 'input' },
          { pin: 17, id: '11', name: '4Y', type: 'output', inverted: true },
          { pin: 18, id: '12', name: '4A', type: 'input' },
          { pin: 19, id: '13', name: '4B', type: 'input' },
          { pin: 20, id: '14', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_7402': {
      width = 240;
      height = 85;
      label = '74LS02';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: '1Y', type: 'output', inverted: true },
          { pin: 2, id: '2', name: '1A', type: 'input' },
          { pin: 3, id: '3', name: '1B', type: 'input' },
          { pin: 4, id: '4', name: '2Y', type: 'output', inverted: true },
          { pin: 5, id: '5', name: '2A', type: 'input' },
          { pin: 6, id: '6', name: '2B', type: 'input' },
          { pin: 7, id: '7', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 10, id: '10_gnd', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 14, id: '8', name: '3A', type: 'input' },
          { pin: 15, id: '9', name: '3B', type: 'input' },
          { pin: 16, id: '10', name: '3Y', type: 'output', inverted: true },
          { pin: 17, id: '11', name: '4A', type: 'input' },
          { pin: 18, id: '12', name: '4B', type: 'input' },
          { pin: 19, id: '13', name: '4Y', type: 'output', inverted: true },
          { pin: 20, id: '14', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_7486': {
      width = 240;
      height = 85;
      label = '74LS86';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: '1A', type: 'input' },
          { pin: 2, id: '2', name: '1B', type: 'input' },
          { pin: 3, id: '3', name: '1Y', type: 'output' },
          { pin: 4, id: '4', name: '2A', type: 'input' },
          { pin: 5, id: '5', name: '2B', type: 'input' },
          { pin: 6, id: '6', name: '2Y', type: 'output' },
          { pin: 7, id: '7', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 10, id: '10_gnd', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 14, id: '8', name: '3Y', type: 'output' },
          { pin: 15, id: '9', name: '3A', type: 'input' },
          { pin: 16, id: '10', name: '3B', type: 'input' },
          { pin: 17, id: '11', name: '4Y', type: 'output' },
          { pin: 18, id: '12', name: '4A', type: 'input' },
          { pin: 19, id: '13', name: '4B', type: 'input' },
          { pin: 20, id: '14', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_74151': {
      width = 240;
      height = 85;
      label = '74LS151';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: 'D3', type: 'input' },
          { pin: 2, id: '2', name: 'D2', type: 'input' },
          { pin: 3, id: '3', name: 'D1', type: 'input' },
          { pin: 4, id: '4', name: 'D0', type: 'input' },
          { pin: 5, id: '5', name: 'Y', type: 'output' },
          { pin: 6, id: '6', name: 'W', type: 'output', inverted: true },
          { pin: 7, id: '7', name: 'Ḡ', type: 'input', inverted: true, defaultValue: '0' },
          { pin: 8, id: '8', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 10, id: '10_gnd', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 13, id: '9', name: 'S2', type: 'input' },
          { pin: 14, id: '10', name: 'S1', type: 'input' },
          { pin: 15, id: '11', name: 'S0', type: 'input' },
          { pin: 16, id: '12', name: 'D7', type: 'input' },
          { pin: 17, id: '13', name: 'D6', type: 'input' },
          { pin: 18, id: '14', name: 'D5', type: 'input' },
          { pin: 19, id: '15', name: 'D4', type: 'input' },
          { pin: 20, id: '16', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_74138': {
      width = 240;
      height = 85;
      label = '74LS138';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: 'A', type: 'input' },
          { pin: 2, id: '2', name: 'B', type: 'input' },
          { pin: 3, id: '3', name: 'C', type: 'input' },
          { pin: 4, id: '4', name: 'Ḡ2A', type: 'input', inverted: true, defaultValue: '0' },
          { pin: 5, id: '5', name: 'Ḡ2B', type: 'input', inverted: true, defaultValue: '0' },
          { pin: 6, id: '6', name: 'G1', type: 'input', defaultValue: '1' },
          { pin: 7, id: '7', name: 'Ȳ7', type: 'output', inverted: true },
          { pin: 8, id: '8', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 10, id: '10_gnd', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 13, id: '9', name: 'Ȳ6', type: 'output', inverted: true },
          { pin: 14, id: '10', name: 'Ȳ5', type: 'output', inverted: true },
          { pin: 15, id: '11', name: 'Ȳ4', type: 'output', inverted: true },
          { pin: 16, id: '12', name: 'Ȳ3', type: 'output', inverted: true },
          { pin: 17, id: '13', name: 'Ȳ2', type: 'output', inverted: true },
          { pin: 18, id: '14', name: 'Ȳ1', type: 'output', inverted: true },
          { pin: 19, id: '15', name: 'Ȳ0', type: 'output', inverted: true },
          { pin: 20, id: '16', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_7490': {
      width = 240;
      height = 85;
      label = '74LS90';
      state.count = 0;
      state.prevCka = '0';
      state.prevCkb = '0';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: 'CKB', type: 'input' },
          { pin: 2, id: '2', name: 'R0(1)', type: 'input', defaultValue: '0' },
          { pin: 3, id: '3', name: 'R0(2)', type: 'input', defaultValue: '0' },
          { pin: 5, id: '5', name: 'VCC', type: 'input', defaultValue: '0' },
          { pin: 6, id: '6', name: 'R9(1)', type: 'input', defaultValue: '0' },
          { pin: 7, id: '7', name: 'R9(2)', type: 'input', defaultValue: '0' },
          { pin: 10, id: '10', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 14, id: '8', name: 'QC', type: 'output' },
          { pin: 15, id: '9', name: 'QB', type: 'output' },
          { pin: 17, id: '11', name: 'QD', type: 'output' },
          { pin: 18, id: '12', name: 'QA', type: 'output' },
          { pin: 20, id: '14', name: 'CKA', type: 'input' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_7483': {
      width = 240;
      height = 85;
      label = '74LS83';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: 'A4', type: 'input' },
          { pin: 2, id: '2', name: 'S3', type: 'output' },
          { pin: 3, id: '3', name: 'A3', type: 'input' },
          { pin: 4, id: '4', name: 'B3', type: 'input' },
          { pin: 5, id: '5', name: 'VCC', type: 'input', defaultValue: '0' },
          { pin: 6, id: '6', name: 'S2', type: 'output' },
          { pin: 7, id: '7', name: 'B2', type: 'input' },
          { pin: 8, id: '8', name: 'A2', type: 'input' },
          { pin: 9, id: '9', name: 'S1', type: 'output' },
          { pin: 10, id: '12', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 13, id: '10', name: 'A1', type: 'input' },
          { pin: 14, id: '11', name: 'B1', type: 'input' },
          { pin: 16, id: '13', name: 'C0', type: 'input', defaultValue: '0' },
          { pin: 17, id: '14', name: 'C4', type: 'output' },
          { pin: 18, id: '15', name: 'S4', type: 'output' },
          { pin: 19, id: '16', name: 'B4', type: 'input' },
          { pin: 20, id: '20_vcc', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_7474': {
      width = 240;
      height = 85;
      label = '74LS74';
      state.q1 = '0';
      state.qBar1 = '1';
      state.q2 = '0';
      state.qBar2 = '1';
      state.prevClock1 = '0';
      state.prevClock2 = '0';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: '1CLR̄', type: 'input', inverted: true, defaultValue: '1' },
          { pin: 2, id: '2', name: '1D', type: 'input' },
          { pin: 3, id: '3', name: '1CLK', type: 'input' },
          { pin: 4, id: '4', name: '1PRĒ', type: 'input', inverted: true, defaultValue: '1' },
          { pin: 5, id: '5', name: '1Q', type: 'output' },
          { pin: 6, id: '6', name: '1Q̄', type: 'output', inverted: true },
          { pin: 7, id: '7', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 10, id: '10_gnd', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 14, id: '8', name: '2Q̄', type: 'output', inverted: true },
          { pin: 15, id: '9', name: '2Q', type: 'output' },
          { pin: 16, id: '10', name: '2PRĒ', type: 'input', inverted: true, defaultValue: '1' },
          { pin: 17, id: '11', name: '2CLK', type: 'input' },
          { pin: 18, id: '12', name: '2D', type: 'input' },
          { pin: 19, id: '13', name: '2CLR̄', type: 'input', inverted: true, defaultValue: '1' },
          { pin: 20, id: '14', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_7476': {
      width = 240;
      height = 85;
      label = '74LS76';
      state.q1 = '0';
      state.qBar1 = '1';
      state.q2 = '0';
      state.qBar2 = '1';
      state.prevClock1 = '0';
      state.prevClock2 = '0';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: '1CLK', type: 'input' },
          { pin: 2, id: '2', name: '1PRĒ', type: 'input', inverted: true, defaultValue: '1' },
          { pin: 3, id: '3', name: '1CLR̄', type: 'input', inverted: true, defaultValue: '1' },
          { pin: 4, id: '4', name: '1J', type: 'input' },
          { pin: 5, id: '5', name: 'VCC', type: 'input', defaultValue: '0' },
          { pin: 6, id: '6', name: '2CLK', type: 'input' },
          { pin: 7, id: '7', name: '2PRĒ', type: 'input', inverted: true, defaultValue: '1' },
          { pin: 8, id: '8', name: '2CLR̄', type: 'input', inverted: true, defaultValue: '1' },
          { pin: 10, id: '13', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 13, id: '9', name: '2J', type: 'input' },
          { pin: 14, id: '10', name: '2Q̄', type: 'output', inverted: true },
          { pin: 15, id: '11', name: '2Q', type: 'output' },
          { pin: 16, id: '12', name: '2K', type: 'input' },
          { pin: 18, id: '14', name: '1Q̄', type: 'output', inverted: true },
          { pin: 19, id: '15', name: '1Q', type: 'output' },
          { pin: 20, id: '16', name: '1K', type: 'input' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_74153': {
      width = 240;
      height = 85;
      label = '74LS153';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: '1Ḡ', type: 'input', inverted: true, defaultValue: '0' },
          { pin: 2, id: '2', name: 'B', type: 'input' },
          { pin: 3, id: '3', name: '1C3', type: 'input' },
          { pin: 4, id: '4', name: '1C2', type: 'input' },
          { pin: 5, id: '5', name: '1C1', type: 'input' },
          { pin: 6, id: '6', name: '1C0', type: 'input' },
          { pin: 7, id: '7', name: '1Y', type: 'output' },
          { pin: 8, id: '8', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 9, id: '9', name: '2Y', type: 'output' },
          { pin: 10, id: '10', name: '2C0', type: 'input' },
          { pin: 11, id: '11', name: '2C1', type: 'input' },
          { pin: 12, id: '12', name: '2C2', type: 'input' },
          { pin: 13, id: '13', name: '2C3', type: 'input' },
          { pin: 14, id: '14', name: '2Ḡ', type: 'input', inverted: true, defaultValue: '0' },
          { pin: 15, id: '15', name: 'A', type: 'input' },
          { pin: 16, id: '16', name: 'VCC', type: 'input', defaultValue: '0' },
          { pin: 20, id: '20_vcc', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_74139': {
      width = 240;
      height = 85;
      label = '74LS139';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: '1Ḡ', type: 'input', inverted: true, defaultValue: '0' },
          { pin: 2, id: '2', name: '1A', type: 'input' },
          { pin: 3, id: '3', name: '1B', type: 'input' },
          { pin: 4, id: '4', name: '1Y0', type: 'output', inverted: true },
          { pin: 5, id: '5', name: '1Y1', type: 'output', inverted: true },
          { pin: 6, id: '6', name: '1Y2', type: 'output', inverted: true },
          { pin: 7, id: '7', name: '1Y3', type: 'output', inverted: true },
          { pin: 8, id: '8', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 9, id: '9', name: '2Y3', type: 'output', inverted: true },
          { pin: 10, id: '10', name: '2Y2', type: 'output', inverted: true },
          { pin: 11, id: '11', name: '2Y1', type: 'output', inverted: true },
          { pin: 12, id: '12', name: '2Y0', type: 'output', inverted: true },
          { pin: 13, id: '13', name: '2B', type: 'input' },
          { pin: 14, id: '14', name: '2A', type: 'input' },
          { pin: 15, id: '15', name: '2Ḡ', type: 'input', inverted: true, defaultValue: '0' },
          { pin: 16, id: '16', name: 'VCC', type: 'input', defaultValue: '0' },
          { pin: 20, id: '20_vcc', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_7493': {
      width = 240;
      height = 85;
      label = '74LS93';
      state.count = 0;
      state.prevCka = '0';
      state.prevCkb = '0';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: 'CKB', type: 'input' },
          { pin: 2, id: '2', name: 'R0(1)', type: 'input', defaultValue: '0' },
          { pin: 3, id: '3', name: 'R0(2)', type: 'input', defaultValue: '0' },
          { pin: 5, id: '5', name: 'VCC', type: 'input', defaultValue: '0' },
          { pin: 8, id: '8', name: 'QC', type: 'output' },
          { pin: 9, id: '9', name: 'QB', type: 'output' },
          { pin: 10, id: '10', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 11, id: '11', name: 'QD', type: 'output' },
          { pin: 12, id: '12', name: 'QA', type: 'output' },
          { pin: 14, id: '14', name: 'CKA', type: 'input' },
          { pin: 20, id: '20_vcc', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_7485': {
      width = 240;
      height = 85;
      label = '74LS85';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: 'B3', type: 'input' },
          { pin: 2, id: '2', name: 'I(A<B)', type: 'input', defaultValue: '0' },
          { pin: 3, id: '3', name: 'I(A=B)', type: 'input', defaultValue: '1' },
          { pin: 4, id: '4', name: 'I(A>B)', type: 'input', defaultValue: '0' },
          { pin: 5, id: '5', name: 'O(A>B)', type: 'output' },
          { pin: 6, id: '6', name: 'O(A=B)', type: 'output' },
          { pin: 7, id: '7', name: 'O(A<B)', type: 'output' },
          { pin: 8, id: '8', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 9, id: '9', name: 'B0', type: 'input' },
          { pin: 10, id: '10', name: 'A0', type: 'input' },
          { pin: 11, id: '11', name: 'B1', type: 'input' },
          { pin: 12, id: '12', name: 'A1', type: 'input' },
          { pin: 13, id: '13', name: 'A2', type: 'input' },
          { pin: 14, id: '14', name: 'B2', type: 'input' },
          { pin: 15, id: '15', name: 'A3', type: 'input' },
          { pin: 16, id: '16', name: 'VCC', type: 'input', defaultValue: '0' },
          { pin: 20, id: '20_vcc', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_74194': {
      width = 240;
      height = 85;
      label = '74LS194';
      state.q = ['0', '0', '0', '0'];
      state.prevClock = '0';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: 'CLR̄', type: 'input', inverted: true, defaultValue: '1' },
          { pin: 2, id: '2', name: 'SR', type: 'input', defaultValue: '0' },
          { pin: 3, id: '3', name: 'A', type: 'input' },
          { pin: 4, id: '4', name: 'B', type: 'input' },
          { pin: 5, id: '5', name: 'C', type: 'input' },
          { pin: 6, id: '6', name: 'D', type: 'input' },
          { pin: 7, id: '7', name: 'SL', type: 'input', defaultValue: '0' },
          { pin: 8, id: '8', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 9, id: '9', name: 'S0', type: 'input' },
          { pin: 10, id: '10', name: 'S1', type: 'input' },
          { pin: 11, id: '11', name: 'CLK', type: 'input' },
          { pin: 12, id: '12', name: 'QD', type: 'output' },
          { pin: 13, id: '13', name: 'QC', type: 'output' },
          { pin: 14, id: '14', name: 'QB', type: 'output' },
          { pin: 15, id: '15', name: 'QA', type: 'output' },
          { pin: 16, id: '16', name: 'VCC', type: 'input', defaultValue: '0' },
          { pin: 20, id: '20_vcc', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_7447': {
      width = 240;
      height = 85;
      label = '74LS47';
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: 'B', type: 'input' },
          { pin: 2, id: '2', name: 'C', type: 'input' },
          { pin: 3, id: '3', name: 'LT̄', type: 'input', inverted: true, defaultValue: '1' },
          { pin: 4, id: '4', name: 'BI/RBŌ', type: 'input', inverted: true, defaultValue: '1' },
          { pin: 5, id: '5', name: 'RBĪ', type: 'input', inverted: true, defaultValue: '1' },
          { pin: 6, id: '6', name: 'D', type: 'input' },
          { pin: 7, id: '7', name: 'A', type: 'input' },
          { pin: 8, id: '8', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 9, id: '9', name: 'ē', type: 'output', inverted: true },
          { pin: 10, id: '10', name: 'd̄', type: 'output', inverted: true },
          { pin: 11, id: '11', name: 'c̄', type: 'output', inverted: true },
          { pin: 12, id: '12', name: 'b̄', type: 'output', inverted: true },
          { pin: 13, id: '13', name: 'ā', type: 'output', inverted: true },
          { pin: 14, id: '14', name: 'ḡ', type: 'output', inverted: true },
          { pin: 15, id: '15', name: 'f̄', type: 'output', inverted: true },
          { pin: 16, id: '16', name: 'VCC', type: 'input', defaultValue: '0' },
          { pin: 20, id: '20_vcc', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'ic_555': {
      width = 240;
      height = 85;
      label = 'NE555';
      state.toggleState = false;
      const dip = createDipPins(
        [
          { pin: 1, id: '1', name: 'GND', type: 'input', defaultValue: '0' },
          { pin: 2, id: '2', name: 'TRIG', type: 'input', defaultValue: '1' },
          { pin: 3, id: '3', name: 'OUT', type: 'output' },
          { pin: 4, id: '4', name: 'RESET', type: 'input', defaultValue: '1' },
          { pin: 14, id: '5', name: 'CV', type: 'input' },
          { pin: 15, id: '6', name: 'THRES', type: 'input' },
          { pin: 16, id: '7', name: 'DISCH', type: 'input' },
          { pin: 20, id: '8', name: 'VCC', type: 'input', defaultValue: '0' },
        ],
        20,
        width,
        height
      );
      inputs.push(...dip.inputs);
      outputs.push(...dip.outputs);
      break;
    }

    case 'input_pin': {
      width = 44;
      height = 36;
      label = 'IN';
      state.toggleState = false;
      outputs.push({ id: 'out', name: 'Q', type: 'output', x: 44, y: 18, value: '0' });
      break;
    }

    case 'output_pin': {
      width = 44;
      height = 36;
      label = 'OUT';
      inputs.push({ id: 'in', name: 'D', type: 'input', x: 0, y: 18, value: '0' });
      break;
    }

    case 'breadboard': {
      width = 280;
      height = 140;
      label = 'BREADBOARD';
      // Generate standard tie-point sockets for 10 columns
      // Top power rail: + and -
      for (let c = 1; c <= 8; c++) {
        const xPos = 24 + c * 28;
        inputs.push({ id: `top_plus_${c}`, name: '+', type: 'input', x: xPos, y: 12, value: '0' });
        inputs.push({ id: `top_minus_${c}`, name: '-', type: 'input', x: xPos, y: 24, value: '0' });
      }
      // Terminal matrix: columns 1..8 with rows A..E (top) and F..J (bottom)
      for (let c = 1; c <= 8; c++) {
        const xPos = 24 + c * 28;
        inputs.push({ id: `col_${c}_a`, name: `${c}A`, type: 'input', x: xPos, y: 44, value: '0' });
        inputs.push({ id: `col_${c}_b`, name: `${c}B`, type: 'input', x: xPos, y: 56, value: '0' });
        inputs.push({ id: `col_${c}_c`, name: `${c}C`, type: 'input', x: xPos, y: 68, value: '0' });
        inputs.push({ id: `col_${c}_d`, name: `${c}D`, type: 'input', x: xPos, y: 80, value: '0' });
        inputs.push({ id: `col_${c}_e`, name: `${c}E`, type: 'input', x: xPos, y: 92, value: '0' });

        inputs.push({ id: `col_${c}_f`, name: `${c}F`, type: 'input', x: xPos, y: 108, value: '0' });
        inputs.push({ id: `col_${c}_g`, name: `${c}G`, type: 'input', x: xPos, y: 120, value: '0' });
        inputs.push({ id: `col_${c}_h`, name: `${c}H`, type: 'input', x: xPos, y: 132, value: '0' });
      }
      break;
    }

    case 'custom_ic': {
      const customDef = customProps?.customIC;
      width = 240;
      height = 85;
      label = customDef?.partNumber || customDef?.name || customLabel || 'CUSTOM_IC';

      if (customDef && customDef.pins && customDef.pins.length > 0) {
        const pinDefs = customDef.pins.map((p: any) => ({
          pin: p.pin,
          id: String(p.pin),
          name: p.name,
          type: (p.type === 'power' ? 'input' : p.type) as 'input' | 'output',
          inverted: p.inverted,
          defaultValue: ('0' as const),
        }));
        const dip = createDipPins(pinDefs, 20, width, height);
        inputs.push(...dip.inputs);
        outputs.push(...dip.outputs);
      } else {
        const defaultPins: Array<{
          pin: number;
          id: string;
          name: string;
          type: 'input' | 'output';
          defaultValue?: LogicValue;
        }> = [];
        for (let i = 1; i <= 20; i++) {
          if (i === 20) {
            defaultPins.push({ pin: i, id: String(i), name: 'VCC', type: 'input', defaultValue: '0' });
          } else if (i === 10) {
            defaultPins.push({ pin: i, id: String(i), name: 'GND', type: 'input', defaultValue: '0' });
          } else if (i % 2 === 0) {
            defaultPins.push({ pin: i, id: String(i), name: `Y${i / 2}`, type: 'output' });
          } else {
            defaultPins.push({ pin: i, id: String(i), name: `A${Math.ceil(i / 2)}`, type: 'input' });
          }
        }
        const dip = createDipPins(defaultPins, 20, width, height);
        inputs.push(...dip.inputs);
        outputs.push(...dip.outputs);
      }
      break;
    }

    case 'not':
      width = 75;
      height = 40;
      label = 'NOT';
      inputs.push({ id: 'in', name: 'A', type: 'input', x: 0, y: 20, value: '0' });
      outputs.push({ id: 'out', name: 'Y', type: 'output', x: 75, y: 20, value: '1', inverted: true });
      break;

    case 'buffer':
      width = 70;
      height = 40;
      label = 'BUF';
      inputs.push({ id: 'in', name: 'A', type: 'input', x: 0, y: 20, value: '0' });
      outputs.push({ id: 'out', name: 'Y', type: 'output', x: 70, y: 20, value: '0' });
      break;

    case 'and':
      width = 80;
      height = 50;
      label = 'AND';
      inputs.push({ id: 'a', name: 'A', type: 'input', x: 0, y: 15, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 35, value: '0' });
      outputs.push({ id: 'out', name: 'Y', type: 'output', x: 80, y: 25, value: '0' });
      break;

    case 'and_3':
      width = 85;
      height = 55;
      label = 'AND-3';
      inputs.push({ id: 'a', name: 'A', type: 'input', x: 0, y: 12, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 27, value: '0' });
      inputs.push({ id: 'c', name: 'C', type: 'input', x: 0, y: 42, value: '0' });
      outputs.push({ id: 'out', name: 'Y', type: 'output', x: 85, y: 27, value: '0' });
      break;

    case 'or':
      width = 80;
      height = 50;
      label = 'OR';
      inputs.push({ id: 'a', name: 'A', type: 'input', x: 0, y: 15, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 35, value: '0' });
      outputs.push({ id: 'out', name: 'Y', type: 'output', x: 80, y: 25, value: '0' });
      break;

    case 'or_3':
      width = 85;
      height = 55;
      label = 'OR-3';
      inputs.push({ id: 'a', name: 'A', type: 'input', x: 0, y: 12, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 27, value: '0' });
      inputs.push({ id: 'c', name: 'C', type: 'input', x: 0, y: 42, value: '0' });
      outputs.push({ id: 'out', name: 'Y', type: 'output', x: 85, y: 27, value: '0' });
      break;

    case 'nand':
      width = 85;
      height = 50;
      label = 'NAND';
      inputs.push({ id: 'a', name: 'A', type: 'input', x: 0, y: 15, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 35, value: '0' });
      outputs.push({ id: 'out', name: 'Y', type: 'output', x: 85, y: 25, value: '1', inverted: true });
      break;

    case 'nand_3':
      width = 90;
      height = 55;
      label = 'NAND-3';
      inputs.push({ id: 'a', name: 'A', type: 'input', x: 0, y: 12, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 27, value: '0' });
      inputs.push({ id: 'c', name: 'C', type: 'input', x: 0, y: 42, value: '0' });
      outputs.push({ id: 'out', name: 'Y', type: 'output', x: 90, y: 27, value: '1', inverted: true });
      break;

    case 'nor':
      width = 85;
      height = 50;
      label = 'NOR';
      inputs.push({ id: 'a', name: 'A', type: 'input', x: 0, y: 15, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 35, value: '0' });
      outputs.push({ id: 'out', name: 'Y', type: 'output', x: 85, y: 25, value: '1', inverted: true });
      break;

    case 'nor_3':
      width = 90;
      height = 55;
      label = 'NOR-3';
      inputs.push({ id: 'a', name: 'A', type: 'input', x: 0, y: 12, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 27, value: '0' });
      inputs.push({ id: 'c', name: 'C', type: 'input', x: 0, y: 42, value: '0' });
      outputs.push({ id: 'out', name: 'Y', type: 'output', x: 90, y: 27, value: '1', inverted: true });
      break;

    case 'breadboard_half': {
      width = 180;
      height = 140;
      label = 'HALF BREADBOARD';
      for (let c = 1; c <= 4; c++) {
        const xPos = 24 + c * 28;
        inputs.push({ id: `top_plus_${c}`, name: '+', type: 'input', x: xPos, y: 12, value: '0' });
        inputs.push({ id: `top_minus_${c}`, name: '-', type: 'input', x: xPos, y: 24, value: '0' });
      }
      for (let c = 1; c <= 4; c++) {
        const xPos = 24 + c * 28;
        inputs.push({ id: `col_${c}_a`, name: `${c}A`, type: 'input', x: xPos, y: 44, value: '0' });
        inputs.push({ id: `col_${c}_b`, name: `${c}B`, type: 'input', x: xPos, y: 56, value: '0' });
        inputs.push({ id: `col_${c}_c`, name: `${c}C`, type: 'input', x: xPos, y: 68, value: '0' });
        inputs.push({ id: `col_${c}_d`, name: `${c}D`, type: 'input', x: xPos, y: 80, value: '0' });
        inputs.push({ id: `col_${c}_e`, name: `${c}E`, type: 'input', x: xPos, y: 92, value: '0' });

        inputs.push({ id: `col_${c}_f`, name: `${c}F`, type: 'input', x: xPos, y: 108, value: '0' });
        inputs.push({ id: `col_${c}_g`, name: `${c}G`, type: 'input', x: xPos, y: 120, value: '0' });
        inputs.push({ id: `col_${c}_h`, name: `${c}H`, type: 'input', x: xPos, y: 132, value: '0' });
      }
      break;
    }

    case 'breadboard_mini': {
      width = 150;
      height = 100;
      label = 'MINI BREADBOARD';
      for (let c = 1; c <= 4; c++) {
        const xPos = 20 + c * 26;
        inputs.push({ id: `col_${c}_a`, name: `${c}A`, type: 'input', x: xPos, y: 20, value: '0' });
        inputs.push({ id: `col_${c}_b`, name: `${c}B`, type: 'input', x: xPos, y: 34, value: '0' });
        inputs.push({ id: `col_${c}_c`, name: `${c}C`, type: 'input', x: xPos, y: 48, value: '0' });
        inputs.push({ id: `col_${c}_f`, name: `${c}F`, type: 'input', x: xPos, y: 66, value: '0' });
        inputs.push({ id: `col_${c}_g`, name: `${c}G`, type: 'input', x: xPos, y: 80, value: '0' });
      }
      break;
    }

    case 'xor':
      width = 85;
      height = 50;
      label = 'XOR';
      inputs.push({ id: 'a', name: 'A', type: 'input', x: 0, y: 15, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 35, value: '0' });
      outputs.push({ id: 'out', name: 'Y', type: 'output', x: 85, y: 25, value: '0' });
      break;

    case 'xnor':
      width = 90;
      height = 50;
      label = 'XNOR';
      inputs.push({ id: 'a', name: 'A', type: 'input', x: 0, y: 15, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 35, value: '0' });
      outputs.push({ id: 'out', name: 'Y', type: 'output', x: 90, y: 25, value: '1', inverted: true });
      break;

    case 'tri_state':
      width = 80;
      height = 50;
      label = 'TRI-BUF';
      inputs.push({ id: 'in', name: 'A', type: 'input', x: 0, y: 25, value: '0' });
      inputs.push({ id: 'en', name: 'EN', type: 'input', x: 40, y: 50, value: '0' });
      outputs.push({ id: 'out', name: 'Y', type: 'output', x: 80, y: 25, value: 'Z' });
      break;

    case 'toggle':
      width = 65;
      height = 42;
      label = 'SWITCH';
      state.toggleState = false;
      outputs.push({ id: 'out', name: 'Q', type: 'output', x: 65, y: 21, value: '0' });
      break;

    case 'push_button':
      width = 65;
      height = 42;
      label = 'BTN';
      state.buttonPressed = false;
      outputs.push({ id: 'out', name: 'Q', type: 'output', x: 65, y: 21, value: '0' });
      break;

    case 'clock':
      width = 75;
      height = 42;
      label = 'CLK';
      state.toggleState = false;
      customProps.frequency = 1; // 1 Hz default
      outputs.push({ id: 'out', name: 'CLK', type: 'output', x: 75, y: 21, value: '0' });
      break;

    case 'vcc':
      width = 50;
      height = 36;
      label = 'VCC (+5V)';
      outputs.push({ id: 'out', name: 'VCC', type: 'output', x: 50, y: 18, value: '1' });
      break;

    case 'gnd':
      width = 50;
      height = 36;
      label = 'GND (0V)';
      outputs.push({ id: 'out', name: 'GND', type: 'output', x: 50, y: 18, value: '0' });
      break;

    case 'probe':
      width = 65;
      height = 42;
      label = 'PROBE';
      inputs.push({ id: 'in', name: 'IN', type: 'input', x: 0, y: 21, value: '0' });
      break;

    case 'led':
      width = 52;
      height = 52;
      label = 'LED';
      customProps.color = 'green';
      inputs.push({ id: 'in', name: 'IN', type: 'input', x: 0, y: 26, value: '0' });
      break;

    case 'rgb_led':
      width = 60;
      height = 60;
      label = 'RGB LED';
      inputs.push({ id: 'r', name: 'R', type: 'input', x: 0, y: 15, value: '0' });
      inputs.push({ id: 'g', name: 'G', type: 'input', x: 0, y: 30, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 45, value: '0' });
      break;

    case 'led_bar_4':
      width = 50;
      height = 80;
      label = '4-LED BAR';
      inputs.push({ id: 'd0', name: '0', type: 'input', x: 0, y: 12, value: '0' });
      inputs.push({ id: 'd1', name: '1', type: 'input', x: 0, y: 30, value: '0' });
      inputs.push({ id: 'd2', name: '2', type: 'input', x: 0, y: 48, value: '0' });
      inputs.push({ id: 'd3', name: '3', type: 'input', x: 0, y: 66, value: '0' });
      break;

    case 'seven_segment':
      width = 52;
      height = 76;
      label = '7-SEG';
      // Compact standard pinout: top pins a, b, c, d; bottom pins e, f, g, dp
      inputs.push({ id: 'a', name: 'a', type: 'input', x: 8, y: 0, value: '0' });
      inputs.push({ id: 'b', name: 'b', type: 'input', x: 19, y: 0, value: '0' });
      inputs.push({ id: 'c', name: 'c', type: 'input', x: 31, y: 0, value: '0' });
      inputs.push({ id: 'd', name: 'd', type: 'input', x: 42, y: 0, value: '0' });
      inputs.push({ id: 'e', name: 'e', type: 'input', x: 8, y: 76, value: '0' });
      inputs.push({ id: 'f', name: 'f', type: 'input', x: 19, y: 76, value: '0' });
      inputs.push({ id: 'g', name: 'g', type: 'input', x: 31, y: 76, value: '0' });
      inputs.push({ id: 'dp', name: 'dp', type: 'input', x: 42, y: 76, value: '0' });
      break;

    case 'hex_display':
      width = 80;
      height = 110;
      label = 'HEX';
      inputs.push({ id: 'd0', name: 'D0', type: 'input', x: 0, y: 20, value: '0' });
      inputs.push({ id: 'd1', name: 'D1', type: 'input', x: 0, y: 45, value: '0' });
      inputs.push({ id: 'd2', name: 'D2', type: 'input', x: 0, y: 70, value: '0' });
      inputs.push({ id: 'd3', name: 'D3', type: 'input', x: 0, y: 95, value: '0' });
      break;

    case 'buzzer':
      width = 65;
      height = 50;
      label = 'BUZZER';
      customProps.audioTone = 880;
      inputs.push({ id: 'in', name: 'IN', type: 'input', x: 0, y: 25, value: '0' });
      break;

    case 'half_adder':
      width = 90;
      height = 65;
      label = 'HALF ADDER';
      inputs.push({ id: 'a', name: 'A', type: 'input', x: 0, y: 20, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 45, value: '0' });
      outputs.push({ id: 'sum', name: 'SUM', type: 'output', x: 90, y: 20, value: '0' });
      outputs.push({ id: 'carry', name: 'CARRY', type: 'output', x: 90, y: 45, value: '0' });
      break;

    case 'full_adder':
      width = 100;
      height = 75;
      label = 'FULL ADDER';
      inputs.push({ id: 'a', name: 'A', type: 'input', x: 0, y: 18, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 38, value: '0' });
      inputs.push({ id: 'cin', name: 'CIN', type: 'input', x: 0, y: 58, value: '0' });
      outputs.push({ id: 'sum', name: 'SUM', type: 'output', x: 100, y: 25, value: '0' });
      outputs.push({ id: 'cout', name: 'COUT', type: 'output', x: 100, y: 50, value: '0' });
      break;

    case 'mux_2to1':
      width = 75;
      height = 70;
      label = '2:1 MUX';
      inputs.push({ id: 'i0', name: 'I0', type: 'input', x: 0, y: 20, value: '0' });
      inputs.push({ id: 'i1', name: 'I1', type: 'input', x: 0, y: 50, value: '0' });
      inputs.push({ id: 's', name: 'S', type: 'input', x: 37, y: 70, value: '0' });
      outputs.push({ id: 'y', name: 'Y', type: 'output', x: 75, y: 35, value: '0' });
      break;

    case 'mux_4to1':
      width = 85;
      height = 100;
      label = '4:1 MUX';
      inputs.push({ id: 'i0', name: 'I0', type: 'input', x: 0, y: 18, value: '0' });
      inputs.push({ id: 'i1', name: 'I1', type: 'input', x: 0, y: 38, value: '0' });
      inputs.push({ id: 'i2', name: 'I2', type: 'input', x: 0, y: 58, value: '0' });
      inputs.push({ id: 'i3', name: 'I3', type: 'input', x: 0, y: 78, value: '0' });
      inputs.push({ id: 's1', name: 'S1', type: 'input', x: 28, y: 100, value: '0' });
      inputs.push({ id: 's0', name: 'S0', type: 'input', x: 56, y: 100, value: '0' });
      outputs.push({ id: 'y', name: 'Y', type: 'output', x: 85, y: 48, value: '0' });
      break;

    case 'demux_1to2':
      width = 75;
      height = 70;
      label = '1:2 DEMUX';
      inputs.push({ id: 'din', name: 'DIN', type: 'input', x: 0, y: 35, value: '0' });
      inputs.push({ id: 's', name: 'S', type: 'input', x: 37, y: 70, value: '0' });
      outputs.push({ id: 'y0', name: 'Y0', type: 'output', x: 75, y: 20, value: '0' });
      outputs.push({ id: 'y1', name: 'Y1', type: 'output', x: 75, y: 50, value: '0' });
      break;

    case 'demux_1to4':
      width = 85;
      height = 100;
      label = '1:4 DEMUX';
      inputs.push({ id: 'din', name: 'DIN', type: 'input', x: 0, y: 48, value: '0' });
      inputs.push({ id: 's1', name: 'S1', type: 'input', x: 28, y: 100, value: '0' });
      inputs.push({ id: 's0', name: 'S0', type: 'input', x: 56, y: 100, value: '0' });
      outputs.push({ id: 'y0', name: 'Y0', type: 'output', x: 85, y: 18, value: '0' });
      outputs.push({ id: 'y1', name: 'Y1', type: 'output', x: 85, y: 38, value: '0' });
      outputs.push({ id: 'y2', name: 'Y2', type: 'output', x: 85, y: 58, value: '0' });
      outputs.push({ id: 'y3', name: 'Y3', type: 'output', x: 85, y: 78, value: '0' });
      break;

    case 'decoder_2to4':
      width = 95;
      height = 100;
      label = '2:4 DECODER';
      inputs.push({ id: 'en', name: 'EN', type: 'input', x: 0, y: 20, value: '1' });
      inputs.push({ id: 'a1', name: 'A1', type: 'input', x: 0, y: 50, value: '0' });
      inputs.push({ id: 'a0', name: 'A0', type: 'input', x: 0, y: 80, value: '0' });
      outputs.push({ id: 'y0', name: 'Y0', type: 'output', x: 95, y: 18, value: '0' });
      outputs.push({ id: 'y1', name: 'Y1', type: 'output', x: 95, y: 38, value: '0' });
      outputs.push({ id: 'y2', name: 'Y2', type: 'output', x: 95, y: 58, value: '0' });
      outputs.push({ id: 'y3', name: 'Y3', type: 'output', x: 95, y: 78, value: '0' });
      break;

    case 'comparator_4bit':
      width = 110;
      height = 120;
      label = '4-BIT COMP';
      inputs.push({ id: 'a3', name: 'A3', type: 'input', x: 0, y: 16, value: '0' });
      inputs.push({ id: 'a2', name: 'A2', type: 'input', x: 0, y: 30, value: '0' });
      inputs.push({ id: 'a1', name: 'A1', type: 'input', x: 0, y: 44, value: '0' });
      inputs.push({ id: 'a0', name: 'A0', type: 'input', x: 0, y: 58, value: '0' });
      inputs.push({ id: 'b3', name: 'B3', type: 'input', x: 0, y: 74, value: '0' });
      inputs.push({ id: 'b2', name: 'B2', type: 'input', x: 0, y: 88, value: '0' });
      inputs.push({ id: 'b1', name: 'B1', type: 'input', x: 0, y: 102, value: '0' });
      inputs.push({ id: 'b0', name: 'B0', type: 'input', x: 0, y: 116, value: '0' });
      outputs.push({ id: 'gt', name: 'A>B', type: 'output', x: 110, y: 30, value: '0' });
      outputs.push({ id: 'eq', name: 'A=B', type: 'output', x: 110, y: 60, value: '1' });
      outputs.push({ id: 'lt', name: 'A<B', type: 'output', x: 110, y: 90, value: '0' });
      break;

    case 'priority_encoder_4to2':
      width = 100;
      height = 90;
      label = '4:2 PRI-ENC';
      inputs.push({ id: 'd0', name: 'D0', type: 'input', x: 0, y: 16, value: '0' });
      inputs.push({ id: 'd1', name: 'D1', type: 'input', x: 0, y: 36, value: '0' });
      inputs.push({ id: 'd2', name: 'D2', type: 'input', x: 0, y: 56, value: '0' });
      inputs.push({ id: 'd3', name: 'D3', type: 'input', x: 0, y: 76, value: '0' });
      outputs.push({ id: 'y1', name: 'Y1', type: 'output', x: 100, y: 25, value: '0' });
      outputs.push({ id: 'y0', name: 'Y0', type: 'output', x: 100, y: 50, value: '0' });
      outputs.push({ id: 'v', name: 'V', type: 'output', x: 100, y: 75, value: '0' });
      break;

    case 'parity_gen':
      width = 95;
      height = 90;
      label = 'PARITY GEN';
      inputs.push({ id: 'a', name: 'A', type: 'input', x: 0, y: 16, value: '0' });
      inputs.push({ id: 'b', name: 'B', type: 'input', x: 0, y: 36, value: '0' });
      inputs.push({ id: 'c', name: 'C', type: 'input', x: 0, y: 56, value: '0' });
      inputs.push({ id: 'd', name: 'D', type: 'input', x: 0, y: 76, value: '0' });
      outputs.push({ id: 'even', name: 'EVEN', type: 'output', x: 95, y: 30, value: '1' });
      outputs.push({ id: 'odd', name: 'ODD', type: 'output', x: 95, y: 60, value: '0' });
      break;

    case 'sr_latch':
      width = 90;
      height = 70;
      label = 'SR LATCH';
      state.q = '0';
      state.qBar = '1';
      inputs.push({ id: 'pre', name: 'PRĒ', type: 'input', x: 45, y: 0, value: '1', inverted: true });
      inputs.push({ id: 's', name: 'S', type: 'input', x: 0, y: 20, value: '0' });
      inputs.push({ id: 'r', name: 'R', type: 'input', x: 0, y: 50, value: '0' });
      inputs.push({ id: 'clr', name: 'CLR̄', type: 'input', x: 45, y: 70, value: '1', inverted: true });
      outputs.push({ id: 'q', name: 'Q', type: 'output', x: 90, y: 20, value: '0' });
      outputs.push({ id: 'qBar', name: 'Q̄', type: 'output', x: 90, y: 50, value: '1' });
      break;

    case 'd_latch':
      width = 90;
      height = 70;
      label = 'D LATCH';
      state.q = '0';
      state.qBar = '1';
      inputs.push({ id: 'd', name: 'D', type: 'input', x: 0, y: 20, value: '0' });
      inputs.push({ id: 'en', name: 'EN', type: 'input', x: 0, y: 50, value: '0' });
      outputs.push({ id: 'q', name: 'Q', type: 'output', x: 90, y: 20, value: '0' });
      outputs.push({ id: 'qBar', name: 'Q̄', type: 'output', x: 90, y: 50, value: '1' });
      break;

    case 'd_flipflop':
      width = 95;
      height = 70;
      label = 'D FLIP-FLOP';
      state.q = '0';
      state.qBar = '1';
      state.prevClock = '0';
      inputs.push({ id: 'pre', name: 'PRĒ', type: 'input', x: 47, y: 0, value: '1', inverted: true });
      inputs.push({ id: 'd', name: 'D', type: 'input', x: 0, y: 20, value: '0' });
      inputs.push({ id: 'clk', name: 'CLK', type: 'input', x: 0, y: 50, value: '0' });
      inputs.push({ id: 'clr', name: 'CLR̄', type: 'input', x: 47, y: 70, value: '1', inverted: true });
      outputs.push({ id: 'q', name: 'Q', type: 'output', x: 95, y: 20, value: '0' });
      outputs.push({ id: 'qBar', name: 'Q̄', type: 'output', x: 95, y: 50, value: '1' });
      break;

    case 'jk_flipflop':
      width = 95;
      height = 80;
      label = 'JK FLIP-FLOP';
      state.q = '0';
      state.qBar = '1';
      state.prevClock = '0';
      inputs.push({ id: 'pre', name: 'PRĒ', type: 'input', x: 47, y: 0, value: '1', inverted: true });
      inputs.push({ id: 'j', name: 'J', type: 'input', x: 0, y: 18, value: '0' });
      inputs.push({ id: 'clk', name: 'CLK', type: 'input', x: 0, y: 40, value: '0' });
      inputs.push({ id: 'k', name: 'K', type: 'input', x: 0, y: 62, value: '0' });
      inputs.push({ id: 'clr', name: 'CLR̄', type: 'input', x: 47, y: 80, value: '1', inverted: true });
      outputs.push({ id: 'q', name: 'Q', type: 'output', x: 95, y: 20, value: '0' });
      outputs.push({ id: 'qBar', name: 'Q̄', type: 'output', x: 95, y: 60, value: '1' });
      break;

    case 't_flipflop':
      width = 95;
      height = 70;
      label = 'T FLIP-FLOP';
      state.q = '0';
      state.qBar = '1';
      state.prevClock = '0';
      inputs.push({ id: 'pre', name: 'PRĒ', type: 'input', x: 47, y: 0, value: '1', inverted: true });
      inputs.push({ id: 't', name: 'T', type: 'input', x: 0, y: 20, value: '0' });
      inputs.push({ id: 'clk', name: 'CLK', type: 'input', x: 0, y: 50, value: '0' });
      inputs.push({ id: 'clr', name: 'CLR̄', type: 'input', x: 47, y: 70, value: '1', inverted: true });
      outputs.push({ id: 'q', name: 'Q', type: 'output', x: 95, y: 20, value: '0' });
      outputs.push({ id: 'qBar', name: 'Q̄', type: 'output', x: 95, y: 50, value: '1' });
      break;

    case 'junction':
      width = 16;
      height = 16;
      label = '';
      inputs.push({ id: 'in', name: 'IN', type: 'input', x: 8, y: 8, value: '0' });
      outputs.push({ id: 'out1', name: 'O1', type: 'output', x: 8, y: 8, value: '0' });
      outputs.push({ id: 'out2', name: 'O2', type: 'output', x: 8, y: 8, value: '0' });
      outputs.push({ id: 'out3', name: 'O3', type: 'output', x: 8, y: 8, value: '0' });
      break;

    case 'counter_4bit':
      width = 105;
      height = 110;
      label = '4-BIT COUNTER';
      state.count = 0;
      state.prevClock = '0';
      inputs.push({ id: 'clk', name: 'CLK', type: 'input', x: 0, y: 25, value: '0' });
      inputs.push({ id: 'rst', name: 'RST', type: 'input', x: 0, y: 55, value: '0' });
      inputs.push({ id: 'en', name: 'EN', type: 'input', x: 0, y: 85, value: '1' });
      outputs.push({ id: 'q0', name: 'Q0', type: 'output', x: 105, y: 18, value: '0' });
      outputs.push({ id: 'q1', name: 'Q1', type: 'output', x: 105, y: 38, value: '0' });
      outputs.push({ id: 'q2', name: 'Q2', type: 'output', x: 105, y: 58, value: '0' });
      outputs.push({ id: 'q3', name: 'Q3', type: 'output', x: 105, y: 78, value: '0' });
      outputs.push({ id: 'tc', name: 'TC', type: 'output', x: 105, y: 98, value: '0' });
      break;

    case 'shift_reg_4bit':
      width = 105;
      height = 110;
      label = '4-BIT SHIFT REG';
      state.shiftRegister = ['0', '0', '0', '0'];
      state.prevClock = '0';
      inputs.push({ id: 'clk', name: 'CLK', type: 'input', x: 0, y: 25, value: '0' });
      inputs.push({ id: 'sin', name: 'SIN', type: 'input', x: 0, y: 55, value: '0' });
      inputs.push({ id: 'rst', name: 'RST', type: 'input', x: 0, y: 85, value: '0' });
      outputs.push({ id: 'q0', name: 'Q0', type: 'output', x: 105, y: 18, value: '0' });
      outputs.push({ id: 'q1', name: 'Q1', type: 'output', x: 105, y: 38, value: '0' });
      outputs.push({ id: 'q2', name: 'Q2', type: 'output', x: 105, y: 58, value: '0' });
      outputs.push({ id: 'q3', name: 'Q3', type: 'output', x: 105, y: 78, value: '0' });
      break;
  }

  if (customLabel && customLabel.trim().length > 0) {
    label = customLabel.trim();
  }

  return {
    id,
    type,
    label,
    isCustomLabel: hasCustom,
    x,
    y,
    width,
    height,
    inputs,
    outputs,
    state,
    customProps,
  };
}

// Map a component's inputs and evaluate new outputs
function evaluateSingleComponent(comp: CircuitComponent): {
  outputs: Record<string, LogicValue>;
  newState?: Record<string, any>;
} {
  const getIn = (id: string, defaultVal: LogicValue = '0'): LogicValue => {
    const p = comp.inputs.find((pin) => pin.id === id);
    return p ? resolveLogic(p.value) : defaultVal;
  };

  const outputs: Record<string, LogicValue> = {};
  const newState: Record<string, any> = { ...comp.state };

  // If this is an IC, check that physical VCC is connected to logic HIGH ('1')
  if (comp.type.startsWith('ic_') || comp.type === 'custom_ic') {
    const vccPin = comp.inputs.find((p) => p.name?.toUpperCase() === 'VCC');
    if (vccPin && resolveLogic(vccPin.value) !== '1') {
      for (const outPin of comp.outputs) {
        outputs[outPin.id] = '0';
      }
      return { outputs, newState };
    }
  }

  switch (comp.type) {
    case 'not':
      outputs.out = notGate(getIn('in'));
      break;

    case 'buffer':
      outputs.out = getIn('in');
      break;

    case 'and':
      outputs.out = andGate(getIn('a'), getIn('b'));
      break;

    case 'and_3':
      outputs.out = evaluateAnd3(getIn('a'), getIn('b'), getIn('c'));
      break;

    case 'or':
      outputs.out = orGate(getIn('a'), getIn('b'));
      break;

    case 'or_3':
      outputs.out = evaluateOr3(getIn('a'), getIn('b'), getIn('c'));
      break;

    case 'nand':
      outputs.out = nandGate(getIn('a'), getIn('b'));
      break;

    case 'nand_3':
      outputs.out = evaluateNand3(getIn('a'), getIn('b'), getIn('c'));
      break;

    case 'nor':
      outputs.out = norGate(getIn('a'), getIn('b'));
      break;

    case 'nor_3':
      outputs.out = evaluateNor3(getIn('a'), getIn('b'), getIn('c'));
      break;

    case 'xor':
      outputs.out = xorGate(getIn('a'), getIn('b'));
      break;

    case 'xnor':
      outputs.out = xnorGate(getIn('a'), getIn('b'));
      break;

    case 'tri_state':
      outputs.out = triStateBuffer(getIn('in'), getIn('en'));
      break;

    case 'd_latch': {
      const res = evaluateDLatch(getIn('d'), getIn('en'), comp.state?.q || '0');
      outputs.q = res.q;
      outputs.qBar = res.qBar;
      newState.q = res.q;
      newState.qBar = res.qBar;
      break;
    }

    case 'priority_encoder_4to2': {
      const res = evaluatePriorityEncoder4to2(
        getIn('d0'),
        getIn('d1'),
        getIn('d2'),
        getIn('d3')
      );
      outputs.y1 = res.y1;
      outputs.y0 = res.y0;
      outputs.v = res.v;
      break;
    }

    case 'parity_gen': {
      const res = evaluateParityGen(getIn('d0'), getIn('d1'), getIn('d2'), getIn('d3'));
      outputs.even = res.even;
      outputs.odd = res.odd;
      break;
    }

    case 'rgb_led':
    case 'led_bar_4':
      // Pure sinks
      break;

    case 'toggle':
      outputs.out = comp.state?.toggleState ? '1' : '0';
      break;

    case 'push_button':
      outputs.out = comp.state?.buttonPressed ? '1' : '0';
      break;

    case 'clock':
      outputs.out = comp.state?.toggleState ? '1' : '0';
      break;

    case 'vcc':
      outputs.out = '1';
      break;

    case 'gnd':
      outputs.out = '0';
      break;

    case 'probe':
    case 'led':
    case 'seven_segment':
    case 'hex_display':
    case 'buzzer':
      // Pure sinks, no outputs to compute
      break;

    case 'half_adder': {
      const res = halfAdder(getIn('a'), getIn('b'));
      outputs.sum = res.sum;
      outputs.carry = res.carry;
      break;
    }

    case 'full_adder': {
      const res = fullAdder(getIn('a'), getIn('b'), getIn('cin'));
      outputs.sum = res.sum;
      outputs.cout = res.cout;
      break;
    }

    case 'mux_2to1':
      outputs.y = mux2to1(getIn('i0'), getIn('i1'), getIn('s'));
      break;

    case 'mux_4to1':
      outputs.y = mux4to1(
        getIn('i0'),
        getIn('i1'),
        getIn('i2'),
        getIn('i3'),
        getIn('s1'),
        getIn('s0')
      );
      break;

    case 'demux_1to2': {
      const res = demux1to2(getIn('din'), getIn('s'));
      outputs.y0 = res.y0;
      outputs.y1 = res.y1;
      break;
    }

    case 'demux_1to4': {
      const res = demux1to4(getIn('din'), getIn('s1'), getIn('s0'));
      outputs.y0 = res.y0;
      outputs.y1 = res.y1;
      outputs.y2 = res.y2;
      outputs.y3 = res.y3;
      break;
    }

    case 'decoder_2to4': {
      const res = decoder2to4(getIn('en', '1'), getIn('a1'), getIn('a0'));
      outputs.y0 = res.y0;
      outputs.y1 = res.y1;
      outputs.y2 = res.y2;
      outputs.y3 = res.y3;
      break;
    }

    case 'comparator_4bit': {
      const res = comparator4bit(
        [getIn('a0'), getIn('a1'), getIn('a2'), getIn('a3')],
        [getIn('b0'), getIn('b1'), getIn('b2'), getIn('b3')]
      );
      outputs.gt = res.gt;
      outputs.eq = res.eq;
      outputs.lt = res.lt;
      break;
    }

    case 'junction': {
      const inVal = getIn('in');
      outputs.out1 = inVal;
      outputs.out2 = inVal;
      outputs.out3 = inVal;
      break;
    }

    case 'sr_latch': {
      const res = evaluateSRLatch(
        getIn('s'),
        getIn('r'),
        comp.state?.q || '0',
        getIn('pre', '1'),
        getIn('clr', '1')
      );
      outputs.q = res.q;
      outputs.qBar = res.qBar;
      newState.q = res.q;
      newState.qBar = res.qBar;
      newState.invalid = res.invalid;
      break;
    }

    case 'd_flipflop': {
      const clk = getIn('clk');
      const res = evaluateDFlipFlop(
        getIn('d'),
        clk,
        comp.state?.prevClock,
        comp.state?.q || '0',
        getIn('pre', '1'),
        getIn('clr', '1')
      );
      outputs.q = res.q;
      outputs.qBar = res.qBar;
      newState.q = res.q;
      newState.qBar = res.qBar;
      newState.prevClock = clk;
      break;
    }

    case 'jk_flipflop': {
      const clk = getIn('clk');
      const res = evaluateJKFlipFlop(
        getIn('j'),
        getIn('k'),
        clk,
        comp.state?.prevClock,
        comp.state?.q || '0',
        getIn('pre', '1'),
        getIn('clr', '1')
      );
      outputs.q = res.q;
      outputs.qBar = res.qBar;
      newState.q = res.q;
      newState.qBar = res.qBar;
      newState.prevClock = clk;
      break;
    }

    case 't_flipflop': {
      const clk = getIn('clk');
      const res = evaluateTFlipFlop(
        getIn('t'),
        clk,
        comp.state?.prevClock,
        comp.state?.q || '0',
        getIn('pre', '1'),
        getIn('clr', '1')
      );
      outputs.q = res.q;
      outputs.qBar = res.qBar;
      newState.q = res.q;
      newState.qBar = res.qBar;
      newState.prevClock = clk;
      break;
    }

    case 'counter_4bit': {
      const clk = getIn('clk');
      const res = evaluate4BitCounter(
        clk,
        comp.state?.prevClock,
        getIn('rst'),
        getIn('en', '1'),
        comp.state?.count ?? 0
      );
      outputs.q0 = res.q0;
      outputs.q1 = res.q1;
      outputs.q2 = res.q2;
      outputs.q3 = res.q3;
      outputs.tc = res.tc;
      newState.count = res.count;
      newState.prevClock = clk;
      break;
    }

    case 'shift_reg_4bit': {
      const clk = getIn('clk');
      const rawBits = comp.state?.shiftRegister;
      const bits: [LogicValue, LogicValue, LogicValue, LogicValue] =
        Array.isArray(rawBits) && rawBits.length === 4
          ? [rawBits[0], rawBits[1], rawBits[2], rawBits[3]]
          : ['0', '0', '0', '0'];
      const nextBits = evaluate4BitShiftRegister(
        clk,
        comp.state?.prevClock,
        getIn('rst'),
        getIn('sin'),
        bits
      );
      outputs.q0 = nextBits[0];
      outputs.q1 = nextBits[1];
      outputs.q2 = nextBits[2];
      outputs.q3 = nextBits[3];
      newState.shiftRegister = nextBits;
      newState.prevClock = clk;
      break;
    }

    // --- 74-Series DIP ICs (20-Pin Horizontal) ---
    case 'ic_7408': {
      outputs['3'] = andGate(getIn('1'), getIn('2'));
      outputs['6'] = andGate(getIn('4'), getIn('5'));
      outputs['8'] = andGate(getIn('9'), getIn('10'));
      outputs['11'] = andGate(getIn('12'), getIn('13'));
      break;
    }

    case 'ic_7432': {
      outputs['3'] = orGate(getIn('1'), getIn('2'));
      outputs['6'] = orGate(getIn('4'), getIn('5'));
      outputs['8'] = orGate(getIn('9'), getIn('10'));
      outputs['11'] = orGate(getIn('12'), getIn('13'));
      break;
    }

    case 'ic_7404': {
      outputs['2'] = notGate(getIn('1'));
      outputs['4'] = notGate(getIn('3'));
      outputs['6'] = notGate(getIn('5'));
      outputs['8'] = notGate(getIn('9'));
      outputs['10'] = notGate(getIn('11'));
      outputs['12'] = notGate(getIn('13'));
      break;
    }

    case 'ic_7400': {
      outputs['3'] = nandGate(getIn('1'), getIn('2'));
      outputs['6'] = nandGate(getIn('4'), getIn('5'));
      outputs['8'] = nandGate(getIn('9'), getIn('10'));
      outputs['11'] = nandGate(getIn('12'), getIn('13'));
      break;
    }

    case 'ic_7402': {
      outputs['1'] = norGate(getIn('2'), getIn('3'));
      outputs['4'] = norGate(getIn('5'), getIn('6'));
      outputs['10'] = norGate(getIn('8'), getIn('9'));
      outputs['13'] = norGate(getIn('11'), getIn('12'));
      break;
    }

    case 'ic_7486': {
      outputs['3'] = xorGate(getIn('1'), getIn('2'));
      outputs['6'] = xorGate(getIn('4'), getIn('5'));
      outputs['8'] = xorGate(getIn('9'), getIn('10'));
      outputs['11'] = xorGate(getIn('12'), getIn('13'));
      break;
    }

    case 'ic_74151': {
      const data: [LogicValue, LogicValue, LogicValue, LogicValue, LogicValue, LogicValue, LogicValue, LogicValue] = [
        getIn('4'),
        getIn('3'),
        getIn('2'),
        getIn('1'),
        getIn('15'),
        getIn('14'),
        getIn('13'),
        getIn('12'),
      ];
      const sel: [LogicValue, LogicValue, LogicValue] = [
        getIn('11'),
        getIn('10'),
        getIn('9'),
      ];
      const gBar = getIn('7', '0');
      const res = evaluate74151(data, sel, gBar);
      outputs['5'] = res.y;
      outputs['6'] = res.w;
      break;
    }

    case 'ic_74138': {
      const a = getIn('1');
      const b = getIn('2');
      const c = getIn('3');
      const g1 = getIn('6', '1');
      const g2a = getIn('4', '0');
      const g2b = getIn('5', '0');
      const res = evaluate74138(a, b, c, g1, g2a, g2b);
      outputs['15'] = res.y0;
      outputs['14'] = res.y1;
      outputs['13'] = res.y2;
      outputs['12'] = res.y3;
      outputs['11'] = res.y4;
      outputs['10'] = res.y5;
      outputs['9'] = res.y6;
      outputs['7'] = res.y7;
      break;
    }

    case 'ic_7490': {
      const cka = getIn('14');
      const ckb = getIn('1');
      const r0_1 = getIn('2', '0');
      const r0_2 = getIn('3', '0');
      const r9_1 = getIn('6', '0');
      const r9_2 = getIn('7', '0');
      const res = evaluate7490(
        cka,
        comp.state?.prevCka,
        ckb,
        comp.state?.prevCkb,
        r0_1,
        r0_2,
        r9_1,
        r9_2,
        comp.state?.count ?? 0
      );
      outputs['12'] = res.qa;
      outputs['9'] = res.qb;
      outputs['8'] = res.qc;
      outputs['11'] = res.qd;
      newState.count = res.count;
      newState.prevCka = cka;
      newState.prevCkb = ckb;
      break;
    }

    case 'ic_7483': {
      const a: [LogicValue, LogicValue, LogicValue, LogicValue] = [
        getIn('10'),
        getIn('8'),
        getIn('3'),
        getIn('1'),
      ];
      const b: [LogicValue, LogicValue, LogicValue, LogicValue] = [
        getIn('11'),
        getIn('7'),
        getIn('4'),
        getIn('16'),
      ];
      const cin = getIn('13', '0');
      const res = evaluate7483(a, b, cin);
      outputs['9'] = res.s1;
      outputs['6'] = res.s2;
      outputs['2'] = res.s3;
      outputs['15'] = res.s4;
      outputs['14'] = res.c4;
      break;
    }

    case 'ic_7474': {
      // Flip-Flop 1
      const clk1 = getIn('3');
      const res1 = evaluateDFlipFlop(
        getIn('2'),
        clk1,
        comp.state?.prevClock1,
        comp.state?.q1 || '0',
        getIn('4', '1'),
        getIn('1', '1')
      );
      outputs['5'] = res1.q;
      outputs['6'] = res1.qBar;
      newState.q1 = res1.q;
      newState.qBar1 = res1.qBar;
      newState.prevClock1 = clk1;

      // Flip-Flop 2
      const clk2 = getIn('11');
      const res2 = evaluateDFlipFlop(
        getIn('12'),
        clk2,
        comp.state?.prevClock2,
        comp.state?.q2 || '0',
        getIn('10', '1'),
        getIn('13', '1')
      );
      outputs['9'] = res2.q;
      outputs['8'] = res2.qBar;
      newState.q2 = res2.q;
      newState.qBar2 = res2.qBar;
      newState.prevClock2 = clk2;
      break;
    }

    case 'ic_7476': {
      // Flip-Flop 1
      const clk1 = getIn('1');
      const res1 = evaluateJKFlipFlop(
        getIn('4'),
        getIn('16'),
        clk1,
        comp.state?.prevClock1,
        comp.state?.q1 || '0',
        getIn('2', '1'),
        getIn('3', '1')
      );
      outputs['15'] = res1.q;
      outputs['14'] = res1.qBar;
      newState.q1 = res1.q;
      newState.qBar1 = res1.qBar;
      newState.prevClock1 = clk1;

      // Flip-Flop 2
      const clk2 = getIn('6');
      const res2 = evaluateJKFlipFlop(
        getIn('9'),
        getIn('12'),
        clk2,
        comp.state?.prevClock2,
        comp.state?.q2 || '0',
        getIn('7', '1'),
        getIn('8', '1')
      );
      outputs['11'] = res2.q;
      outputs['10'] = res2.qBar;
      newState.q2 = res2.q;
      newState.qBar2 = res2.qBar;
      newState.prevClock2 = clk2;
      break;
    }

    case 'ic_74153': {
      const s0 = getIn('15');
      const s1 = getIn('2');
      const g1_bar = getIn('1', '0');
      const c1: [LogicValue, LogicValue, LogicValue, LogicValue] = [
        getIn('6'),
        getIn('5'),
        getIn('4'),
        getIn('3'),
      ];
      const g2_bar = getIn('14', '0');
      const c2: [LogicValue, LogicValue, LogicValue, LogicValue] = [
        getIn('10'),
        getIn('11'),
        getIn('12'),
        getIn('13'),
      ];
      const res = evaluate74153(s0, s1, g1_bar, c1, g2_bar, c2);
      outputs['7'] = res.y1;
      outputs['9'] = res.y2;
      break;
    }

    case 'ic_74139': {
      const g1_bar = getIn('1', '0');
      const a1 = getIn('2');
      const b1 = getIn('3');
      const g2_bar = getIn('15', '0');
      const a2 = getIn('14');
      const b2 = getIn('13');
      const res = evaluate74139(a1, b1, g1_bar, a2, b2, g2_bar);
      outputs['4'] = res.y1_0;
      outputs['5'] = res.y1_1;
      outputs['6'] = res.y1_2;
      outputs['7'] = res.y1_3;
      outputs['12'] = res.y2_0;
      outputs['11'] = res.y2_1;
      outputs['10'] = res.y2_2;
      outputs['9'] = res.y2_3;
      break;
    }

    case 'ic_7493': {
      const cka = getIn('14');
      const ckb = getIn('1');
      const r0_1 = getIn('2', '0');
      const r0_2 = getIn('3', '0');
      const res = evaluate7493(
        cka,
        comp.state?.prevCka,
        ckb,
        comp.state?.prevCkb,
        r0_1,
        r0_2,
        comp.state?.count ?? 0
      );
      outputs['12'] = res.qa;
      outputs['9'] = res.qb;
      outputs['8'] = res.qc;
      outputs['11'] = res.qd;
      newState.count = res.count;
      newState.prevCka = cka;
      newState.prevCkb = ckb;
      break;
    }

    case 'ic_7485': {
      const a: [LogicValue, LogicValue, LogicValue, LogicValue] = [
        getIn('10'),
        getIn('12'),
        getIn('13'),
        getIn('15'),
      ];
      const b: [LogicValue, LogicValue, LogicValue, LogicValue] = [
        getIn('9'),
        getIn('11'),
        getIn('14'),
        getIn('1'),
      ];
      const iAltB = getIn('2', '0');
      const iAeqB = getIn('3', '1');
      const iAgtB = getIn('4', '0');
      const res = evaluate7485(a, b, iAgtB, iAltB, iAeqB);
      outputs['5'] = res.oAgtB;
      outputs['6'] = res.oAeqB;
      outputs['7'] = res.oAltB;
      break;
    }

    case 'ic_74194': {
      const clk = getIn('11');
      const clr_bar = getIn('1', '1');
      const s0 = getIn('9');
      const s1 = getIn('10');
      const sr = getIn('2');
      const sl = getIn('7');
      const d: [LogicValue, LogicValue, LogicValue, LogicValue] = [
        getIn('3'),
        getIn('4'),
        getIn('5'),
        getIn('6'),
      ];
      const rawQ = comp.state?.q;
      const currentQ: [LogicValue, LogicValue, LogicValue, LogicValue] = Array.isArray(rawQ) && rawQ.length === 4
        ? [
            rawQ[0] === '1' ? '1' : '0',
            rawQ[1] === '1' ? '1' : '0',
            rawQ[2] === '1' ? '1' : '0',
            rawQ[3] === '1' ? '1' : '0',
          ]
        : ['0', '0', '0', '0'];
      const nextQ = evaluate74194(
        clk,
        comp.state?.prevClock,
        clr_bar,
        s0,
        s1,
        sr,
        sl,
        d,
        currentQ
      );
      outputs['15'] = nextQ[0];
      outputs['14'] = nextQ[1];
      outputs['13'] = nextQ[2];
      outputs['12'] = nextQ[3];
      newState.q = nextQ;
      newState.prevClock = clk;
      break;
    }

    case 'ic_7447': {
      const a = getIn('7');
      const b = getIn('1');
      const c = getIn('2');
      const d = getIn('6');
      const lt_bar = getIn('3', '1');
      const rbi_bar = getIn('5', '1');
      const res = evaluate7447(a, b, c, d, lt_bar, rbi_bar);
      outputs['13'] = res.a_bar;
      outputs['12'] = res.b_bar;
      outputs['11'] = res.c_bar;
      outputs['10'] = res.d_bar;
      outputs['9'] = res.e_bar;
      outputs['15'] = res.f_bar;
      outputs['14'] = res.g_bar;
      break;
    }

    case 'ic_555': {
      const reset = getIn('4', '1');
      const trig = getIn('2', '1');
      if (reset === '0') {
        outputs['3'] = '0';
      } else if (trig === '0') {
        outputs['3'] = '1';
      } else {
        outputs['3'] = comp.state?.toggleState ? '1' : '0';
      }
      break;
    }

    case 'input_pin': {
      outputs.out = comp.state?.toggleState ? '1' : '0';
      break;
    }

    case 'output_pin': {
      // Pure sink - state displays incoming signal
      break;
    }

    case 'breadboard': {
      // Solderless breadboard: Conducts signals through vertical terminal strips
      break;
    }

    case 'custom_ic': {
      const customDef = comp.customProps?.customIC;
      if (customDef && customDef.internalCircuit && customDef.internalCircuit.components.length > 0) {
        const internalCircuit: Circuit =
          comp.state?.internalCircuitState ||
          JSON.parse(JSON.stringify(customDef.internalCircuit));

        // Inject custom IC input pins to internal components
        for (const pinMap of customDef.pins) {
          if (pinMap.type === 'input' && pinMap.internalComponentId) {
            const intComp = internalCircuit.components.find((c) => c.id === pinMap.internalComponentId);
            if (intComp) {
              const val = getIn(String(pinMap.pin));
              if (intComp.state) {
                intComp.state.toggleState = val === '1';
                intComp.state.buttonPressed = val === '1';
              }
              if (intComp.outputs && intComp.outputs.length > 0) {
                intComp.outputs[0].value = val;
              }
            }
          }
        }

        // Simulate internal circuit
        const simResult = simulateCircuit(internalCircuit);
        newState.internalCircuitState = simResult.circuit;

        // Map internal outputs back to custom IC output pins
        for (const pinMap of customDef.pins) {
          if (pinMap.type === 'output' && pinMap.internalComponentId) {
            const intComp = simResult.circuit.components.find((c) => c.id === pinMap.internalComponentId);
            if (intComp) {
              let outVal: LogicValue = '0';
              if (intComp.outputs && intComp.outputs.length > 0) {
                outVal = intComp.outputs[0].value;
              } else if (intComp.inputs && intComp.inputs.length > 0) {
                outVal = intComp.inputs[0].value;
              }
              outputs[String(pinMap.pin)] = pinMap.inverted ? (outVal === '1' ? '0' : '1') : outVal;
            }
          }
        }
      }
      break;
    }
  }

  return { outputs, newState };
}

// Complete multi-pass circuit solver with nodal net evaluation and cycle detection
export function simulateCircuit(circuit: Circuit): {
  circuit: Circuit;
  cycleDetected: boolean;
  buzzerActive: boolean;
} {
  // Check if trainer master power switch is active
  const powerComp = circuit.components.find((c) => c.id === 'trainer_power');
  const isTrainerPowerOn = powerComp ? Boolean(powerComp.state?.toggleState) : true;

  // Deep clone components and wires
  const components: CircuitComponent[] = circuit.components.map((c) => ({
    ...c,
    inputs: c.inputs.map((p) => ({ ...p })),
    outputs: c.outputs.map((p) => ({ ...p })),
    state: { ...c.state },
    customProps: { ...c.customProps },
  }));

  const wires: Wire[] = circuit.wires.map((w) => ({ ...w }));

  let cycleDetected = false;
  let iterations = 0;
  const maxIterations = 20;

  while (iterations < maxIterations) {
    iterations++;
    let hasChanges = false;

    // 1. Evaluate each component's internal logic and update its outputs
    for (const comp of components) {
      // If master trainer power is turned OFF, trainer kit power rails and inputs output 0
      if (!isTrainerPowerOn && comp.customProps?.isTrainerPower !== true) {
        if (
          comp.customProps?.isTrainerVcc ||
          comp.customProps?.isTrainerHigh ||
          comp.customProps?.isTrainerInput ||
          comp.customProps?.isTrainerClock ||
          comp.customProps?.isTrainerPulseButton
        ) {
          for (const outPin of comp.outputs) {
            if (outPin.value !== '0') {
              outPin.value = '0';
              hasChanges = true;
            }
          }
          continue;
        }
      }

      const { outputs, newState } = evaluateSingleComponent(comp);

      if (newState) {
        comp.state = newState;
      }

      for (const outPin of comp.outputs) {
        const calculatedVal = outputs[outPin.id];
        if (calculatedVal !== undefined && outPin.value !== calculatedVal) {
          outPin.value = calculatedVal;
          hasChanges = true;
        }
      }

      // (Buzzer state calculated from settled components after convergence loop)
    }

    // 2. Build Electrical Connected Nets (Union-Find / Graph Connected Components)
    // Every pin (compId:pinId) and wire in a net shares the same electrical node
    type PinKey = string; // "compId:pinId"
    const pinToNet = new Map<PinKey, number>();
    const netMembers = new Map<number, Set<PinKey>>();
    const wireToNet = new Map<string, number>();
    let nextNetId = 0;

    const getOrAssignNet = (pinKey: PinKey): number => {
      let netId = pinToNet.get(pinKey);
      if (netId === undefined) {
        netId = nextNetId++;
        pinToNet.set(pinKey, netId);
        netMembers.set(netId, new Set([pinKey]));
      }
      return netId;
    };

    const mergeNets = (netA: number, netB: number) => {
      if (netA === netB) return netA;
      const membersA = netMembers.get(netA) || new Set<PinKey>();
      const membersB = netMembers.get(netB) || new Set<PinKey>();
      const combined = new Set([...membersA, ...membersB]);
      netMembers.set(netA, combined);
      netMembers.delete(netB);
      for (const pk of membersB) {
        pinToNet.set(pk, netA);
      }
      for (const [wId, nId] of wireToNet.entries()) {
        if (nId === netB) wireToNet.set(wId, netA);
      }
      return netA;
    };

    // Group pins connected by wires into nets
    for (const wire of wires) {
      const fromKey = `${wire.fromCompId}:${wire.fromPinId}`;
      const toKey = `${wire.toCompId}:${wire.toPinId}`;

      const net1 = getOrAssignNet(fromKey);
      const net2 = getOrAssignNet(toKey);
      const mergedNet = mergeNets(net1, net2);
      wireToNet.set(wire.id, mergedNet);
    }

    // Merge internal breadboard conductive strips
    for (const comp of components) {
      if (
        comp.type === 'breadboard' ||
        comp.type === 'breadboard_half' ||
        comp.type === 'breadboard_mini'
      ) {
        const busGroups: Record<string, string[]> = {};
        for (const pin of comp.inputs) {
          let busKey = '';
          if (pin.id.startsWith('top_plus_')) busKey = 'top_plus';
          else if (pin.id.startsWith('top_minus_')) busKey = 'top_minus';
          else if (pin.id.startsWith('bot_plus_')) busKey = 'bot_plus';
          else if (pin.id.startsWith('bot_minus_')) busKey = 'bot_minus';
          else {
            const match = pin.id.match(/^col_(\d+)_([a-j])$/i);
            if (match) {
              const colNum = match[1];
              const rowLetter = match[2].toLowerCase();
              const half = rowLetter <= 'e' ? 'top' : 'bot';
              busKey = `col_${colNum}_${half}`;
            }
          }
          if (busKey) {
            if (!busGroups[busKey]) busGroups[busKey] = [];
            busGroups[busKey].push(pin.id);
          }
        }

        for (const pinIds of Object.values(busGroups)) {
          if (pinIds.length > 1) {
            const firstNet = getOrAssignNet(`${comp.id}:${pinIds[0]}`);
            for (let i = 1; i < pinIds.length; i++) {
              const otherNet = getOrAssignNet(`${comp.id}:${pinIds[i]}`);
              mergeNets(firstNet, otherNet);
            }
          }
        }
      }
    }

    // 3. Resolve Net Logic Value from Drivers and Distribute to Wires & Inputs
    for (const [netId, members] of netMembers.entries()) {
      // Find all driver outputs in this net
      const driverValues: LogicValue[] = [];

      for (const pinKey of members) {
        const [cId, pId] = pinKey.split(':');
        const comp = components.find((c) => c.id === cId);
        if (!comp) continue;

        const outPin = comp.outputs.find((p) => p.id === pId);
        if (outPin) {
          driverValues.push(outPin.value);
        }
      }

      // Resolve drivers: handle contention, single driver, or floating
      let netVal: LogicValue = '0';
      const nonZ = driverValues.filter((v) => v !== 'Z');

      if (nonZ.length === 0) {
        netVal = driverValues.length > 0 ? 'Z' : '0';
      } else {
        const hasOne = nonZ.includes('1');
        const hasZero = nonZ.includes('0');
        if (hasOne && hasZero) {
          netVal = 'X'; // Short circuit contention!
        } else if (hasOne) {
          netVal = '1';
        } else {
          netVal = '0';
        }
      }

      // Update all wires in this net
      for (const wire of wires) {
        if (wireToNet.get(wire.id) === netId) {
          if (wire.value !== netVal) {
            wire.value = netVal;
            hasChanges = true;
          }
        }
      }

      // Update all input pins in this net
      for (const pinKey of members) {
        const [cId, pId] = pinKey.split(':');
        const comp = components.find((c) => c.id === cId);
        if (!comp) continue;

        const inPin = comp.inputs.find((p) => p.id === pId);
        if (inPin) {
          let targetVal = netVal;
          if (netVal === 'Z' && (inPin.inverted || inPin.id === 'pre' || inPin.id === 'clr')) {
            targetVal = '1';
          }
          if (inPin.value !== targetVal) {
            inPin.value = targetVal;
            hasChanges = true;
          }
        }
      }
    }

    if (!hasChanges) {
      break;
    }
  }

  if (iterations >= maxIterations) {
    cycleDetected = true;
  }

  // Calculate settled buzzer status: buzzer sounds only if master power is on and any buzzer input is '1'
  const settledBuzzerActive =
    isTrainerPowerOn &&
    components.some((c) => c.type === 'buzzer' && c.inputs.some((p) => p.value === '1'));

  return {
    circuit: { components, wires },
    cycleDetected,
    buzzerActive: settledBuzzerActive,
  };
}

// Clock tick: toggles all clock generator states and re-simulates
export function tickClocks(circuit: Circuit): {
  circuit: Circuit;
  cycleDetected: boolean;
  buzzerActive: boolean;
} {
  const updatedComps = circuit.components.map((c) => {
    if (c.type === 'clock') {
      const nextToggle = !c.state?.toggleState;
      return {
        ...c,
        state: { ...c.state, toggleState: nextToggle },
        outputs: c.outputs.map((p) => ({
          ...p,
          value: (nextToggle ? '1' : '0') as LogicValue,
        })),
      };
    }
    return c;
  });

  return simulateCircuit({ ...circuit, components: updatedComps });
}

// Automatically removes orphaned or unnecessary junction nodes
export function cleanupOrphanJunctions(
  components: CircuitComponent[],
  wires: Wire[]
): { components: CircuitComponent[]; wires: Wire[] } {
  let currentComps = [...components];
  let currentWires = [...wires];
  let changed = true;

  while (changed) {
    changed = false;
    const junctions = currentComps.filter((c) => c.type === 'junction');

    for (const j of junctions) {
      const connWires = currentWires.filter((w) => w.fromCompId === j.id || w.toCompId === j.id);

      if (connWires.length === 0) {
        // 0 wires remaining: delete dead junction
        currentComps = currentComps.filter((c) => c.id !== j.id);
        changed = true;
      } else if (connWires.length === 1) {
        // 1 wire remaining: dead stub wire to nowhere -> remove both
        currentComps = currentComps.filter((c) => c.id !== j.id);
        currentWires = currentWires.filter((w) => w.id !== connWires[0].id);
        changed = true;
      } else if (connWires.length === 2) {
        // 2 wires remaining: 1 in, 1 out -> merge back into 1 continuous uninterrupted wire
        const inWire = connWires.find((w) => w.toCompId === j.id);
        const outWire = connWires.find((w) => w.fromCompId === j.id);
        if (inWire && outWire) {
          const mergedWire: Wire = {
            id: `wire_merged_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            fromCompId: inWire.fromCompId,
            fromPinId: inWire.fromPinId,
            toCompId: outWire.toCompId,
            toPinId: outWire.toPinId,
            value: inWire.value,
          };
          currentComps = currentComps.filter((c) => c.id !== j.id);
          currentWires = currentWires
            .filter((w) => w.id !== inWire.id && w.id !== outWire.id)
            .concat(mergedWire);
          changed = true;
        }
      }
    }
  }

  return { components: currentComps, wires: currentWires };
}
