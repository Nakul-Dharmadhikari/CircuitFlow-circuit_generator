import type { ComponentCategory, ComponentType, LogicValue } from '../../types/circuit';
import * as RawGates from '../../engine/logicGates';
import { getComponentDisplayName } from '../../engine/simulator';

export interface ComponentDefinition {
  type: ComponentType;
  displayName: string;
  category: ComponentCategory;
  defaultWidth: number;
  defaultHeight: number;
  isDIP: boolean;
  pinCount?: number;
}

/**
 * Clean boundary over pure gate evaluation
 */
export function evaluateGate(type: ComponentType, inputs: LogicValue[]): LogicValue {
  const in0 = inputs[0] ?? '0';
  const in1 = inputs[1] ?? '0';

  switch (type) {
    case 'buffer':
      return in0 === '1' ? '1' : in0 === '0' ? '0' : in0;
    case 'not':
      return RawGates.notGate(in0);
    case 'and':
      return inputs.reduce((acc, v) => RawGates.andGate(acc, v), '1' as LogicValue);
    case 'or':
      return inputs.reduce((acc, v) => RawGates.orGate(acc, v), '0' as LogicValue);
    case 'nand':
      return RawGates.nandGate(in0, in1);
    case 'nor':
      return RawGates.norGate(in0, in1);
    case 'xor':
      return RawGates.xorGate(in0, in1);
    case 'xnor':
      return RawGates.xnorGate(in0, in1);
    case 'tri_state':
      return RawGates.triStateBuffer(in0, in1);
    default:
      return '0';
  }
}

/**
 * Clean boundary over 74-series and modular IC logic evaluation
 */
export function evaluateIC(
  type: ComponentType,
  inputs: Record<string, LogicValue>,
  _state?: any
): { outputs: Record<string, LogicValue>; newState?: any } {
  const getIn = (pinId: string, defVal: LogicValue = '0'): LogicValue =>
    inputs[pinId] !== undefined ? inputs[pinId] : defVal;

  switch (type) {
    case 'ic_7408': // Quad 2-In AND Gate
      return {
        outputs: {
          '3': RawGates.andGate(getIn('1'), getIn('2')),
          '6': RawGates.andGate(getIn('4'), getIn('5')),
          '8': RawGates.andGate(getIn('9'), getIn('10')),
          '11': RawGates.andGate(getIn('12'), getIn('13')),
        },
      };

    case 'ic_7432': // Quad 2-In OR Gate
      return {
        outputs: {
          '3': RawGates.orGate(getIn('1'), getIn('2')),
          '6': RawGates.orGate(getIn('4'), getIn('5')),
          '8': RawGates.orGate(getIn('9'), getIn('10')),
          '11': RawGates.orGate(getIn('12'), getIn('13')),
        },
      };

    case 'ic_7404': // Hex Inverter
      return {
        outputs: {
          '2': RawGates.notGate(getIn('1')),
          '4': RawGates.notGate(getIn('3')),
          '6': RawGates.notGate(getIn('5')),
          '8': RawGates.notGate(getIn('9')),
          '10': RawGates.notGate(getIn('11')),
          '12': RawGates.notGate(getIn('13')),
        },
      };

    case 'ic_7400': // Quad 2-In NAND
      return {
        outputs: {
          '3': RawGates.nandGate(getIn('1'), getIn('2')),
          '6': RawGates.nandGate(getIn('4'), getIn('5')),
          '8': RawGates.nandGate(getIn('9'), getIn('10')),
          '11': RawGates.nandGate(getIn('12'), getIn('13')),
        },
      };

    case 'ic_7402': // Quad 2-In NOR
      return {
        outputs: {
          '1': RawGates.norGate(getIn('2'), getIn('3')),
          '4': RawGates.norGate(getIn('5'), getIn('6')),
          '10': RawGates.norGate(getIn('8'), getIn('9')),
          '13': RawGates.norGate(getIn('11'), getIn('12')),
        },
      };

    case 'ic_7486': // Quad 2-In XOR
      return {
        outputs: {
          '3': RawGates.xorGate(getIn('1'), getIn('2')),
          '6': RawGates.xorGate(getIn('4'), getIn('5')),
          '8': RawGates.xorGate(getIn('9'), getIn('10')),
          '11': RawGates.xorGate(getIn('12'), getIn('13')),
        },
      };

    case 'ic_74151': { // 8:1 Multiplexer
      const d: [
        LogicValue,
        LogicValue,
        LogicValue,
        LogicValue,
        LogicValue,
        LogicValue,
        LogicValue,
        LogicValue,
      ] = [
        getIn('4'),
        getIn('3'),
        getIn('2'),
        getIn('1'),
        getIn('15'),
        getIn('14'),
        getIn('13'),
        getIn('12'),
      ];
      const s: [LogicValue, LogicValue, LogicValue] = [getIn('11'), getIn('10'), getIn('9')];
      const gbar = getIn('7', '0');
      const res = RawGates.evaluate74151(d, s, gbar);
      return { outputs: { '5': res.y, '6': res.w } };
    }

    case 'ic_7483': { // 4-bit Binary Full Adder
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
      const c0 = getIn('13', '0');
      const res = RawGates.evaluate7483(a, b, c0);
      return {
        outputs: {
          '9': res.s1,
          '6': res.s2,
          '2': res.s3,
          '15': res.s4,
          '14': res.c4,
        },
      };
    }

    default:
      return { outputs: {} };
  }
}

/**
 * Returns metadata and packaging definition for a given component type
 */
export function getComponentDefinition(type: ComponentType): ComponentDefinition {
  const displayName = getComponentDisplayName(type);
  const isDIP = type.startsWith('ic_') || type === 'custom_ic';

  let category: ComponentCategory = 'gates';
  if (isDIP) category = 'dip_ics';
  else if (type === 'led' || type === 'seven_segment' || type === 'hex_display') category = 'display';
  else if (type === 'toggle' || type === 'push_button' || type === 'clock' || type === 'vcc' || type === 'gnd' || type === 'probe') category = 'io';
  else if (type.includes('adder') || type.includes('mux') || type.includes('decoder') || type.includes('comparator')) category = 'combinational';
  else if (type.includes('flipflop') || type.includes('latch') || type.includes('counter') || type.includes('shift')) category = 'sequential';
  else if (type === 'breadboard' || type === 'junction') category = 'wiring';

  return {
    type,
    displayName,
    category,
    defaultWidth: isDIP ? 240 : 60,
    defaultHeight: isDIP ? 85 : 40,
    isDIP,
    pinCount: isDIP ? 20 : undefined,
  };
}

export * from '../../engine/logicGates';
