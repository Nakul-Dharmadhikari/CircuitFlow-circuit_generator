import type { Circuit, CircuitComponent } from '../../types/circuit';
import { TRAINER_BOARD_LAYOUT } from '../../engine/trainerKit';

export interface TrainerSocketInfo {
  baseIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  mountedComponent?: CircuitComponent;
}

export interface TrainerMapping {
  inputs: Record<number, string>; // inputIndex (0..15) -> componentId
  outputs: Record<number, string>; // outputIndex (0..15) -> componentId
  clocks: Record<string, string>; // freqLabel ('10'|'5'|'1'|'0.5'|'CLK') -> componentId
  vccId: string;
  gndId: string;
  powerSwitchId: string;
  displays: string[]; // ['trainer_seg_1', 'trainer_seg_2']
  sockets: TrainerSocketInfo[];
}

/**
 * Checks whether a component belongs to the fixed DELDSIM hardware trainer board
 */
export function isTrainerComponent(compId: string): boolean {
  return (
    compId.startsWith('trainer_') ||
    compId.startsWith('trainer_in_') ||
    compId.startsWith('trainer_out_') ||
    compId.startsWith('trainer_clk') ||
    compId === 'trainer_vcc' ||
    compId === 'trainer_gnd' ||
    compId === 'trainer_power'
  );
}

/**
 * Finds which IC is currently mounted on a specified horizontal DIP socket (0, 1, 2)
 */
export function getMountedIC(circuit: Circuit, baseIndex: number): CircuitComponent | undefined {
  const board = circuit.trainerBoards?.[0];
  const slot = board?.icSlots?.[baseIndex];
  const bx = slot ? slot.x : (TRAINER_BOARD_LAYOUT.icBasesX[baseIndex] ?? 54);
  const by = slot ? slot.y : TRAINER_BOARD_LAYOUT.icBasesY;

  return circuit.components.find(
    (c) =>
      (c.type.startsWith('ic_') || c.type === 'custom_ic') &&
      Math.abs(c.x - bx) < 80 &&
      Math.abs(c.y - by) < 50
  );
}

/**
 * Checks if coordinates correspond to an empty horizontal IC socket
 */
export function getAvailableSocket(circuit: Circuit): number | null {
  const board = circuit.trainerBoards?.[0];
  const slots = board?.icSlots;

  if (slots && slots.length > 0) {
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const occupied = circuit.components.some(
        (c) =>
          (c.type.startsWith('ic_') || c.type === 'custom_ic') &&
          Math.abs(c.x - slot.x) < 80 &&
          Math.abs(c.y - slot.y) < 50
      );
      if (!occupied) return i;
    }
    return null;
  }

  const { icBasesX, icBasesY } = TRAINER_BOARD_LAYOUT;
  for (let i = 0; i < icBasesX.length; i++) {
    const bx = icBasesX[i];
    const by = icBasesY;
    const occupied = circuit.components.some(
      (c) =>
        (c.type.startsWith('ic_') || c.type === 'custom_ic') &&
        Math.abs(c.x - bx) < 80 &&
        Math.abs(c.y - by) < 50
    );
    if (!occupied) return i;
  }
  return null;
}

/**
 * Extracts the explicit TrainerMapping graph from a Circuit
 */
export function getTrainerMapping(circuit: Circuit): TrainerMapping {
  const inputs: Record<number, string> = {};
  const outputs: Record<number, string> = {};
  const clocks: Record<string, string> = {};
  const displays: string[] = [];

  for (const comp of circuit.components) {
    if (comp.customProps?.isTrainerInput && comp.customProps?.inputIndex !== undefined) {
      inputs[comp.customProps.inputIndex] = comp.id;
    } else if (comp.customProps?.isTrainerOutput && comp.customProps?.outputIndex !== undefined) {
      outputs[comp.customProps.outputIndex] = comp.id;
    } else if (comp.customProps?.isTrainerClock) {
      clocks[comp.label] = comp.id;
    } else if (comp.id.startsWith('trainer_seg_')) {
      displays.push(comp.id);
    }
  }

  const board = circuit.trainerBoards?.[0];
  const sockets: TrainerSocketInfo[] = (board?.icSlots || []).length > 0
    ? board!.icSlots.map((slot, idx) => ({
        baseIndex: idx,
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
        mountedComponent: getMountedIC(circuit, idx),
      }))
    : TRAINER_BOARD_LAYOUT.icBasesX.map((bx, idx) => ({
        baseIndex: idx,
        x: bx,
        y: TRAINER_BOARD_LAYOUT.icBasesY,
        width: TRAINER_BOARD_LAYOUT.icBaseWidth,
        height: TRAINER_BOARD_LAYOUT.icBaseHeight,
        mountedComponent: getMountedIC(circuit, idx),
      }));

  return {
    inputs,
    outputs,
    clocks,
    vccId: 'trainer_vcc',
    gndId: 'trainer_gnd',
    powerSwitchId: 'trainer_power',
    displays,
    sockets,
  };
}
