import type { Circuit, CustomICDefinition, CustomICPinMapping } from '../types/circuit';
import { createComponent } from '../engine/simulator';

export interface CustomICTemplate {
  id: string;
  name: string;
  partNumber: string;
  description: string;
  pinCount: 14 | 16 | 20;
  vccPin: number;
  gndPin: number;
  category: 'combinational' | 'sequential' | 'msi';
  createDefinition: (userId?: string) => CustomICDefinition;
}

/**
 * Creates starter templates for Custom IC Studio with full internalCircuit
 * and explicit externalPin -> internalComponentId -> internalPinId mappings.
 */
export const CUSTOM_IC_TEMPLATES: Record<string, CustomICTemplate> = {
  half_adder: {
    id: 'half_adder',
    name: 'Half Adder (XOR + AND)',
    partNumber: '74MY-HA',
    description: '1-bit Half Adder with Sum (XOR) and Carry (AND) outputs',
    pinCount: 14,
    vccPin: 14,
    gndPin: 7,
    category: 'combinational',
    createDefinition: (userId = 'guest'): CustomICDefinition => {
      const inA = createComponent('input_pin', 60, 80, 'A');
      const inB = createComponent('input_pin', 60, 160, 'B');
      const xorGate = createComponent('xor', 220, 80, 'XOR1');
      const andGate = createComponent('and', 220, 160, 'AND1');
      const outSum = createComponent('output_pin', 380, 80, 'SUM');
      const outCarry = createComponent('output_pin', 380, 160, 'CARRY');

      const internalCircuit: Circuit = {
        components: [inA, inB, xorGate, andGate, outSum, outCarry],
        wires: [
          // A to XOR pin 'a'
          { id: 'w1', fromCompId: inA.id, fromPinId: 'out', toCompId: xorGate.id, toPinId: 'a', value: '0' },
          // A to AND pin 'a'
          { id: 'w2', fromCompId: inA.id, fromPinId: 'out', toCompId: andGate.id, toPinId: 'a', value: '0' },
          // B to XOR pin 'b'
          { id: 'w3', fromCompId: inB.id, fromPinId: 'out', toCompId: xorGate.id, toPinId: 'b', value: '0' },
          // B to AND pin 'b'
          { id: 'w4', fromCompId: inB.id, fromPinId: 'out', toCompId: andGate.id, toPinId: 'b', value: '0' },
          // XOR to outSum pin 'in'
          { id: 'w5', fromCompId: xorGate.id, fromPinId: 'out', toCompId: outSum.id, toPinId: 'in', value: '0' },
          // AND to outCarry pin 'in'
          { id: 'w6', fromCompId: andGate.id, fromPinId: 'out', toCompId: outCarry.id, toPinId: 'in', value: '0' },
        ],
      };

      const pinMappings: CustomICPinMapping[] = [
        { pin: 1, pinNumber: 1, name: 'A', type: 'input', internalComponentId: inA.id, internalPinId: 'out' },
        { pin: 2, pinNumber: 2, name: 'B', type: 'input', internalComponentId: inB.id, internalPinId: 'out' },
        { pin: 3, pinNumber: 3, name: 'SUM', type: 'output', internalComponentId: outSum.id, internalPinId: 'in' },
        { pin: 4, pinNumber: 4, name: 'CARRY', type: 'output', internalComponentId: outCarry.id, internalPinId: 'in' },
        { pin: 5, pinNumber: 5, name: 'NC', type: 'nc' },
        { pin: 6, pinNumber: 6, name: 'NC', type: 'nc' },
        { pin: 7, pinNumber: 7, name: 'GND', type: 'power' },
        { pin: 8, pinNumber: 8, name: 'NC', type: 'nc' },
        { pin: 9, pinNumber: 9, name: 'NC', type: 'nc' },
        { pin: 10, pinNumber: 10, name: 'NC', type: 'nc' },
        { pin: 11, pinNumber: 11, name: 'NC', type: 'nc' },
        { pin: 12, pinNumber: 12, name: 'NC', type: 'nc' },
        { pin: 13, pinNumber: 13, name: 'NC', type: 'nc' },
        { pin: 14, pinNumber: 14, name: 'VCC', type: 'power' },
      ];

      return {
        id: `custom_ic_ha_${Date.now()}`,
        userId,
        partNumber: '74MY-HA',
        name: 'Half Adder (XOR + AND)',
        code: '74MY-HA',
        description: '1-bit Half Adder with Sum (XOR) and Carry (AND) outputs',
        pinCount: 14,
        vccPin: 14,
        gndPin: 7,
        packageType: 'DIP-14',
        circuitType: 'combinational',
        internalCircuit,
        pins: pinMappings,
        pinMappings,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  mux_2to1: {
    id: 'mux_2to1',
    name: '2-to-1 Multiplexer',
    partNumber: '74MY-MUX2',
    description: '2-to-1 Multiplexer with Data Inputs D0, D1, Select S, Output Y',
    pinCount: 14,
    vccPin: 14,
    gndPin: 7,
    category: 'combinational',
    createDefinition: (userId = 'guest'): CustomICDefinition => {
      const inD0 = createComponent('input_pin', 60, 60, 'D0');
      const inD1 = createComponent('input_pin', 60, 140, 'D1');
      const inS = createComponent('input_pin', 60, 220, 'S');

      const notS = createComponent('not', 180, 220, 'NOT_S');
      const and0 = createComponent('and', 300, 70, 'AND_D0');
      const and1 = createComponent('and', 300, 170, 'AND_D1');
      const orOut = createComponent('or', 440, 120, 'OR_Y');
      const outY = createComponent('output_pin', 560, 120, 'Y');

      const internalCircuit: Circuit = {
        components: [inD0, inD1, inS, notS, and0, and1, orOut, outY],
        wires: [
          // S to notS
          { id: 'w_s_not', fromCompId: inS.id, fromPinId: 'out', toCompId: notS.id, toPinId: 'in', value: '0' },
          // S to and1 pin 'b'
          { id: 'w_s_and1', fromCompId: inS.id, fromPinId: 'out', toCompId: and1.id, toPinId: 'b', value: '0' },
          // notS to and0 pin 'b'
          { id: 'w_nots_and0', fromCompId: notS.id, fromPinId: 'out', toCompId: and0.id, toPinId: 'b', value: '0' },
          // D0 to and0 pin 'a'
          { id: 'w_d0_and0', fromCompId: inD0.id, fromPinId: 'out', toCompId: and0.id, toPinId: 'a', value: '0' },
          // D1 to and1 pin 'a'
          { id: 'w_d1_and1', fromCompId: inD1.id, fromPinId: 'out', toCompId: and1.id, toPinId: 'a', value: '0' },
          // and0 to orOut pin 'a'
          { id: 'w_and0_or', fromCompId: and0.id, fromPinId: 'out', toCompId: orOut.id, toPinId: 'a', value: '0' },
          // and1 to orOut pin 'b'
          { id: 'w_and1_or', fromCompId: and1.id, fromPinId: 'out', toCompId: orOut.id, toPinId: 'b', value: '0' },
          // orOut to outY pin 'in'
          { id: 'w_or_outy', fromCompId: orOut.id, fromPinId: 'out', toCompId: outY.id, toPinId: 'in', value: '0' },
        ],
      };

      const pinMappings: CustomICPinMapping[] = [
        { pin: 1, pinNumber: 1, name: 'D0', type: 'input', internalComponentId: inD0.id, internalPinId: 'out' },
        { pin: 2, pinNumber: 2, name: 'D1', type: 'input', internalComponentId: inD1.id, internalPinId: 'out' },
        { pin: 3, pinNumber: 3, name: 'S', type: 'input', internalComponentId: inS.id, internalPinId: 'out' },
        { pin: 4, pinNumber: 4, name: 'Y', type: 'output', internalComponentId: outY.id, internalPinId: 'in' },
        { pin: 5, pinNumber: 5, name: 'NC', type: 'nc' },
        { pin: 6, pinNumber: 6, name: 'NC', type: 'nc' },
        { pin: 7, pinNumber: 7, name: 'GND', type: 'power' },
        { pin: 8, pinNumber: 8, name: 'NC', type: 'nc' },
        { pin: 9, pinNumber: 9, name: 'NC', type: 'nc' },
        { pin: 10, pinNumber: 10, name: 'NC', type: 'nc' },
        { pin: 11, pinNumber: 11, name: 'NC', type: 'nc' },
        { pin: 12, pinNumber: 12, name: 'NC', type: 'nc' },
        { pin: 13, pinNumber: 13, name: 'NC', type: 'nc' },
        { pin: 14, pinNumber: 14, name: 'VCC', type: 'power' },
      ];

      return {
        id: `custom_ic_mux_${Date.now()}`,
        userId,
        partNumber: '74MY-MUX2',
        name: '2-to-1 Multiplexer',
        code: '74MY-MUX2',
        description: '2-to-1 Multiplexer with Data Inputs D0, D1, Select S, Output Y',
        pinCount: 14,
        vccPin: 14,
        gndPin: 7,
        packageType: 'DIP-14',
        circuitType: 'combinational',
        internalCircuit,
        pins: pinMappings,
        pinMappings,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  d_flipflop: {
    id: 'd_flipflop',
    name: 'D Flip-Flop Unit',
    partNumber: '74MY-DFF',
    description: 'Positive-edge triggered D Flip-Flop with Q and Q_bar outputs',
    pinCount: 14,
    vccPin: 14,
    gndPin: 7,
    category: 'sequential',
    createDefinition: (userId = 'guest'): CustomICDefinition => {
      const inD = createComponent('input_pin', 60, 80, 'D');
      const inClk = createComponent('clock', 60, 180, 'CLK');
      const dff = createComponent('d_flipflop', 240, 120, 'DFF1');
      const outQ = createComponent('output_pin', 420, 80, 'Q');
      const outQBar = createComponent('output_pin', 420, 180, 'Q_BAR');

      const internalCircuit: Circuit = {
        components: [inD, inClk, dff, outQ, outQBar],
        wires: [
          // D to dff 'd'
          { id: 'w_d', fromCompId: inD.id, fromPinId: 'out', toCompId: dff.id, toPinId: 'd', value: '0' },
          // CLK to dff 'clk'
          { id: 'w_clk', fromCompId: inClk.id, fromPinId: 'out', toCompId: dff.id, toPinId: 'clk', value: '0' },
          // dff 'q' to outQ
          { id: 'w_q', fromCompId: dff.id, fromPinId: 'q', toCompId: outQ.id, toPinId: 'in', value: '0' },
          // dff 'q_bar' to outQBar
          { id: 'w_qbar', fromCompId: dff.id, fromPinId: 'q_bar', toCompId: outQBar.id, toPinId: 'in', value: '0' },
        ],
      };

      const pinMappings: CustomICPinMapping[] = [
        { pin: 1, pinNumber: 1, name: 'D', type: 'input', internalComponentId: inD.id, internalPinId: 'out' },
        { pin: 2, pinNumber: 2, name: 'CLK', type: 'input', internalComponentId: inClk.id, internalPinId: 'out' },
        { pin: 3, pinNumber: 3, name: 'Q', type: 'output', internalComponentId: outQ.id, internalPinId: 'in' },
        { pin: 4, pinNumber: 4, name: 'Q_BAR', type: 'output', internalComponentId: outQBar.id, internalPinId: 'in' },
        { pin: 5, pinNumber: 5, name: 'NC', type: 'nc' },
        { pin: 6, pinNumber: 6, name: 'NC', type: 'nc' },
        { pin: 7, pinNumber: 7, name: 'GND', type: 'power' },
        { pin: 8, pinNumber: 8, name: 'NC', type: 'nc' },
        { pin: 9, pinNumber: 9, name: 'NC', type: 'nc' },
        { pin: 10, pinNumber: 10, name: 'NC', type: 'nc' },
        { pin: 11, pinNumber: 11, name: 'NC', type: 'nc' },
        { pin: 12, pinNumber: 12, name: 'NC', type: 'nc' },
        { pin: 13, pinNumber: 13, name: 'NC', type: 'nc' },
        { pin: 14, pinNumber: 14, name: 'VCC', type: 'power' },
      ];

      return {
        id: `custom_ic_dff_${Date.now()}`,
        userId,
        partNumber: '74MY-DFF',
        name: 'D Flip-Flop Unit',
        code: '74MY-DFF',
        description: 'Positive-edge triggered D Flip-Flop with Q and Q_bar outputs',
        pinCount: 14,
        vccPin: 14,
        gndPin: 7,
        packageType: 'DIP-14',
        circuitType: 'sequential',
        internalCircuit,
        pins: pinMappings,
        pinMappings,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },

  quad_and: {
    id: 'quad_and',
    name: 'Quad 2-Input AND Gate',
    partNumber: '74MY-08',
    description: '4 independent 2-input AND gates mapped in 14-pin DIP package',
    pinCount: 14,
    vccPin: 14,
    gndPin: 7,
    category: 'combinational',
    createDefinition: (userId = 'guest'): CustomICDefinition => {
      const g1 = createComponent('and', 100, 60, '1-AND');
      const g2 = createComponent('and', 100, 160, '2-AND');
      const g3 = createComponent('and', 320, 60, '3-AND');
      const g4 = createComponent('and', 320, 160, '4-AND');

      const internalCircuit: Circuit = {
        components: [g1, g2, g3, g4],
        wires: [],
      };

      const pinMappings: CustomICPinMapping[] = [
        { pin: 1, pinNumber: 1, name: '1A', type: 'input', internalComponentId: g1.id, internalPinId: 'a' },
        { pin: 2, pinNumber: 2, name: '1B', type: 'input', internalComponentId: g1.id, internalPinId: 'b' },
        { pin: 3, pinNumber: 3, name: '1Y', type: 'output', internalComponentId: g1.id, internalPinId: 'out' },
        { pin: 4, pinNumber: 4, name: '2A', type: 'input', internalComponentId: g2.id, internalPinId: 'a' },
        { pin: 5, pinNumber: 5, name: '2B', type: 'input', internalComponentId: g2.id, internalPinId: 'b' },
        { pin: 6, pinNumber: 6, name: '2Y', type: 'output', internalComponentId: g2.id, internalPinId: 'out' },
        { pin: 7, pinNumber: 7, name: 'GND', type: 'power' },
        { pin: 8, pinNumber: 8, name: '3Y', type: 'output', internalComponentId: g3.id, internalPinId: 'out' },
        { pin: 9, pinNumber: 9, name: '3A', type: 'input', internalComponentId: g3.id, internalPinId: 'a' },
        { pin: 10, pinNumber: 10, name: '3B', type: 'input', internalComponentId: g3.id, internalPinId: 'b' },
        { pin: 11, pinNumber: 11, name: '4Y', type: 'output', internalComponentId: g4.id, internalPinId: 'out' },
        { pin: 12, pinNumber: 12, name: '4A', type: 'input', internalComponentId: g4.id, internalPinId: 'a' },
        { pin: 13, pinNumber: 13, name: '4B', type: 'input', internalComponentId: g4.id, internalPinId: 'b' },
        { pin: 14, pinNumber: 14, name: 'VCC', type: 'power' },
      ];

      return {
        id: `custom_ic_qand_${Date.now()}`,
        userId,
        partNumber: '74MY-08',
        name: 'Quad 2-Input AND Gate',
        code: '74MY-08',
        description: '4 independent 2-input AND gates mapped in 14-pin DIP package',
        pinCount: 14,
        vccPin: 14,
        gndPin: 7,
        packageType: 'DIP-14',
        circuitType: 'combinational',
        internalCircuit,
        pins: pinMappings,
        pinMappings,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  },
};
