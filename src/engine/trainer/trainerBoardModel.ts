import type { Circuit, CircuitComponent } from '../../types/circuit';
import { createComponent, simulateCircuit } from '../simulator';

export interface TrainerICSlot {
  id: string; // e.g. "board_1_ic_1"
  label: string; // "IC1", "IC2", etc.
  x: number; // world X coordinate
  y: number; // world Y coordinate
  width: number;
  height: number;
  baseIndex: number; // 0, 1, 2, ...
  moduleId: string;
  boardId: string;
}

export interface TrainerModuleConfig {
  id: string; // e.g. "mod_1", "mod_2"
  index: number; // 0, 1, 2...
  name: string; // "Module 1", "Module 2"
  x: number; // world X coordinate of module
  y: number; // world Y coordinate
  width: number;
  height: number;
  icCount: number; // 4 for Module 1, 2 for Module 2+
  inputCount: number; // 16 for Module 1, 8 for Module 2+
  startInputIndex: number; // 0 for Mod 1 (15..0), 16 for Mod 2 (23..16), 24 for Mod 3 (31..24)
  icSlotIds: string[];
  inputComponentIds: string[];
}

export interface TrainerBoardModel {
  id: string; // e.g. "board_1"
  name: string; // "Trainer Board 1"
  x: number; // Origin X (default: 20)
  y: number; // Origin Y (default: 15)
  width: number; // Total board width (calculated dynamically)
  height: number; // Board height (compact: 470px)
  modules: TrainerModuleConfig[];
  icSlots: TrainerICSlot[];
  isPowerOn: boolean;
  clockHz: number;
  activeModuleCount: number;
}

// ----------------------------------------------------------------------------
// Layout Constants
// ----------------------------------------------------------------------------
export const TRAINER_CONSTANTS = {
  DEFAULT_BOARD_X: 20,
  DEFAULT_BOARD_Y: 15,
  BOARD_HEIGHT: 470, // Compact height (reduced empty vertical space)

  // IC Socket Specs (Authentic 20-Pin DIP package mount)
  IC_SOCKET_WIDTH: 250,
  IC_SOCKET_HEIGHT: 88,
  IC_SOCKET_PITCH_X: 274, // 250 width + 24 gap
  IC_Y_OFFSET: 135, // Distance from board.y to top of IC socket

  // Module Dimensions
  // Module 1: 4 ICs -> 18 padding + 4 * 250 + 3 * 24 + 18 padding = 1108px
  MODULE_1_IC_COUNT: 4,
  MODULE_1_INPUT_COUNT: 16,
  MODULE_1_WIDTH: 1108,

  // Module 2+: 2 ICs -> 18 padding + 2 * 250 + 1 * 24 + 18 padding = 548px
  MODULE_N_IC_COUNT: 2,
  MODULE_N_INPUT_COUNT: 8,
  MODULE_N_WIDTH: 548,
  MODULE_GAP: 14, // Visual divider gap between modules

  // Fixed Left / Right Margins
  BOARD_PADDING_LEFT: 16,
  BOARD_PADDING_RIGHT: 16,

  // Output Section (Top)
  OUTPUTS_Y_OFFSET: 24,
  OUTPUTS_START_X_OFFSET: 40,
  OUTPUTS_PITCH_X: 38,

  // Input Section (Bottom)
  INPUTS_Y_OFFSET: 360,
  INPUTS_PITCH_X: 38,
  INPUTS_START_X_OFFSET: 40,

  // Clock & Power Controls Section
  CLOCK_SECTION_WIDTH: 320,
  CLOCK_Y_OFFSET: 360,
};

/**
 * Calculates all IC socket descriptors for a given module and board origin
 */
export function calculateModuleICSlots(
  boardId: string,
  moduleId: string,
  moduleX: number,
  moduleY: number,
  startSlotIndex: number,
  count: number
): TrainerICSlot[] {
  const slots: TrainerICSlot[] = [];
  const startX = moduleX + 18;
  const socketY = moduleY + TRAINER_CONSTANTS.IC_Y_OFFSET;

  for (let i = 0; i < count; i++) {
    const globalIdx = startSlotIndex + i;
    const socketX = startX + i * TRAINER_CONSTANTS.IC_SOCKET_PITCH_X;
    const slotId = `${boardId}_ic_${globalIdx + 1}`;

    slots.push({
      id: slotId,
      label: `IC${globalIdx + 1}`,
      x: socketX,
      y: socketY,
      width: TRAINER_CONSTANTS.IC_SOCKET_WIDTH,
      height: TRAINER_CONSTANTS.IC_SOCKET_HEIGHT,
      baseIndex: globalIdx,
      moduleId,
      boardId,
    });
  }

  return slots;
}

/**
 * Calculates the total board width based on its modules and control sections
 */
export function calculateBoardWidth(modules: TrainerModuleConfig[]): number {
  if (modules.length === 0) return TRAINER_CONSTANTS.MODULE_1_WIDTH + 60;

  let totalModulesWidth = 0;
  for (let i = 0; i < modules.length; i++) {
    totalModulesWidth += modules[i].width;
    if (i > 0) totalModulesWidth += TRAINER_CONSTANTS.MODULE_GAP;
  }

  // Board width accommodates all modules + padding + space for + ADD MODULE button on right
  const minWidth = totalModulesWidth + TRAINER_CONSTANTS.BOARD_PADDING_LEFT + TRAINER_CONSTANTS.BOARD_PADDING_RIGHT + 130;
  return Math.max(1180, Math.round(minWidth));
}

/**
 * Creates the components for a trainer input bank (e.g. 15..0 or 23..16 or 31..24)
 */
export function createTrainerInputComponents(
  boardId: string,
  startIndex: number,
  count: number,
  startX: number,
  startY: number
): CircuitComponent[] {
  const comps: CircuitComponent[] = [];

  // Display inputs from highest index to lowest index left-to-right (standard digital lab format: e.g. 15 to 0)
  for (let i = 0; i < count; i++) {
    const n = startIndex + count - 1 - i;
    const x = startX + i * TRAINER_CONSTANTS.INPUTS_PITCH_X;
    const y = startY;

    const inComp = createComponent('toggle', x, y);
    inComp.id = boardId === 'board_1' ? `trainer_in_${n}` : `${boardId}_trainer_in_${n}`;
    inComp.label = `${n}`;
    inComp.width = 28;
    inComp.height = 54;
    inComp.isTrainerFixed = true;
    inComp.customProps = {
      isTrainerInput: true,
      inputIndex: n,
      trainerInputIndex: n,
      boardId,
    };
    inComp.state = { toggleState: false };
    // Terminal pin at top, toggle switch in middle, number label at bottom
    inComp.outputs = [
      {
        id: 'out',
        name: `${n}`,
        type: 'output',
        x: 14,
        y: 6,
        value: '0',
      },
    ];
    comps.push(inComp);
  }

  return comps;
}

/**
 * Creates the standard digital trainer control and output components (Top outputs, Clock section, Power, VCC, GND)
 */
export function createTrainerChassisComponents(
  boardId: string,
  boardX: number,
  boardY: number,
  boardWidth: number
): CircuitComponent[] {
  const comps: CircuitComponent[] = [];
  const idPrefix = boardId === 'board_1' ? 'trainer_' : `${boardId}_trainer_`;

  // 1. TOP OUTPUT SECTION (15 to 0 from left to right)
  for (let n = 15; n >= 0; n--) {
    const colIndex = 15 - n;
    const x = boardX + TRAINER_CONSTANTS.OUTPUTS_START_X_OFFSET + colIndex * TRAINER_CONSTANTS.OUTPUTS_PITCH_X;
    const y = boardY + TRAINER_CONSTANTS.OUTPUTS_Y_OFFSET;

    const outComp = createComponent('probe', x, y);
    outComp.id = `${idPrefix}out_${n}`;
    outComp.label = `${n}`;
    outComp.width = 28;
    outComp.height = 36;
    outComp.isTrainerFixed = true;
    outComp.customProps = {
      isTrainerOutput: true,
      outputIndex: n,
      boardId,
    };
    outComp.inputs = [
      {
        id: 'in',
        name: `${n}`,
        type: 'input',
        x: 14,
        y: 28,
        value: '0',
      },
    ];
    comps.push(outComp);
  }

  // VCC (+5V reference terminal)
  const vccX = boardX + TRAINER_CONSTANTS.OUTPUTS_START_X_OFFSET + 16 * TRAINER_CONSTANTS.OUTPUTS_PITCH_X + 16;
  const vccY = boardY + TRAINER_CONSTANTS.OUTPUTS_Y_OFFSET;
  const vcc = createComponent('vcc', vccX, vccY);
  vcc.id = `${idPrefix}vcc`;
  vcc.label = 'VCC';
  vcc.width = 32;
  vcc.height = 44;
  vcc.isTrainerFixed = true;
  vcc.customProps = { isTrainerVcc: true, boardId };
  vcc.outputs = [
    {
      id: 'out',
      name: 'VCC',
      type: 'output',
      x: 16,
      y: 28,
      value: '1',
    },
  ];
  comps.push(vcc);

  // Compact Dual 7-Segment Displays (Positioned near top right)
  const seg1X = boardX + boardWidth - 235;
  const seg2X = boardX + boardWidth - 175;
  const segY = boardY + 16;

  const seg1 = createComponent('seven_segment', seg1X, segY);
  seg1.id = `${idPrefix}seg_1`;
  seg1.label = 'DISP 1';
  seg1.isTrainerFixed = true;
  seg1.customProps = { boardId };
  comps.push(seg1);

  const seg2 = createComponent('seven_segment', seg2X, segY);
  seg2.id = `${idPrefix}seg_2`;
  seg2.label = 'DISP 2';
  seg2.isTrainerFixed = true;
  seg2.customProps = { boardId };
  comps.push(seg2);

  // Master Board Power Switch Unit (Top far right)
  const powerX = boardX + boardWidth - 95;
  const powerY = boardY + 18;
  const power = createComponent('toggle', powerX, powerY);
  power.id = `${idPrefix}power`;
  power.label = 'POWER';
  power.width = 72;
  power.height = 46;
  power.isTrainerFixed = true;
  power.customProps = { isTrainerPower: true, boardId };
  power.state = { toggleState: true }; // On by default
  power.outputs = [
    {
      id: 'out',
      name: 'PWR',
      type: 'output',
      x: 36,
      y: 24,
      value: '1',
    },
  ];
  comps.push(power);

  // GND (0V reference terminal placed at bottom right of Module 1)
  const gndX = boardX + TRAINER_CONSTANTS.INPUTS_START_X_OFFSET + 16 * TRAINER_CONSTANTS.INPUTS_PITCH_X + 16;
  const gndY = boardY + TRAINER_CONSTANTS.INPUTS_Y_OFFSET;
  const gnd = createComponent('gnd', gndX, gndY);
  gnd.id = `${idPrefix}gnd`;
  gnd.label = 'GND';
  gnd.width = 32;
  gnd.height = 54;
  gnd.isTrainerFixed = true;
  gnd.customProps = { isTrainerGnd: true, boardId };
  gnd.outputs = [
    {
      id: 'out',
      name: 'GND',
      type: 'output',
      x: 16,
      y: 6,
      value: '0',
    },
  ];
  comps.push(gnd);

  // CLOCK SECTION (Positioned on the bottom right of the board)
  const clockStartX = boardX + boardWidth - 340;
  const clockY = boardY + TRAINER_CONSTANTS.CLOCK_Y_OFFSET;

  const frequencies = [
    { freq: 10, label: '10', offset: 0 },
    { freq: 5, label: '5', offset: 45 },
    { freq: 1, label: '1', offset: 90 },
    { freq: 0.5, label: '0.5', offset: 135 },
  ];

  frequencies.forEach((f) => {
    const clkComp = createComponent('clock', clockStartX + f.offset, clockY);
    clkComp.id = `${idPrefix}clk_${f.label.replace('.', '_')}`;
    clkComp.label = f.label;
    clkComp.width = 32;
    clkComp.height = 54;
    clkComp.isTrainerFixed = true;
    clkComp.customProps = {
      isTrainerClock: true,
      frequency: f.freq,
      boardId,
    };
    clkComp.outputs = [
      {
        id: 'out',
        name: f.label,
        type: 'output',
        x: 16,
        y: 6,
        value: '0',
      },
    ];
    comps.push(clkComp);
  });

  // Master Clock Alias (maps to 1Hz)
  const masterClk = createComponent('clock', clockStartX + 90, clockY);
  masterClk.id = `${idPrefix}clk`;
  masterClk.label = 'CLK';
  masterClk.width = 32;
  masterClk.height = 54;
  masterClk.isTrainerFixed = true;
  masterClk.customProps = { isTrainerClock: true, frequency: 1, boardId };
  masterClk.outputs = [
    {
      id: 'out',
      name: 'CLK',
      type: 'output',
      x: 16,
      y: 6,
      value: '0',
    },
  ];
  comps.push(masterClk);

  // HIGH Reference Pin (+5V)
  const clkHigh = createComponent('vcc', clockStartX + 190, clockY);
  clkHigh.id = `${idPrefix}high`;
  clkHigh.label = 'HIGH';
  clkHigh.width = 32;
  clkHigh.height = 54;
  clkHigh.isTrainerFixed = true;
  clkHigh.customProps = { isTrainerHigh: true, boardId };
  clkHigh.outputs = [
    {
      id: 'out',
      name: 'HIGH',
      type: 'output',
      x: 16,
      y: 6,
      value: '1',
    },
  ];
  comps.push(clkHigh);

  // LOW Reference Pin (GND)
  const clkLow = createComponent('gnd', clockStartX + 235, clockY);
  clkLow.id = `${idPrefix}low`;
  clkLow.label = 'LOW';
  clkLow.width = 32;
  clkLow.height = 54;
  clkLow.isTrainerFixed = true;
  clkLow.customProps = { isTrainerLow: true, boardId };
  clkLow.outputs = [
    {
      id: 'out',
      name: 'LOW',
      type: 'output',
      x: 16,
      y: 6,
      value: '0',
    },
  ];
  comps.push(clkLow);

  // GENERATE PULSE Push Button
  const pulseBtn = createComponent('push_button', clockStartX + 175, clockY + 48);
  pulseBtn.id = `${idPrefix}pulse`;
  pulseBtn.label = 'GENERATE PULSE';
  pulseBtn.width = 120;
  pulseBtn.height = 32;
  pulseBtn.isTrainerFixed = true;
  pulseBtn.customProps = { isTrainerPulseButton: true, boardId };
  pulseBtn.outputs = [
    {
      id: 'out',
      name: 'PLS',
      type: 'output',
      x: 12,
      y: 16,
      value: '0',
    },
  ];
  comps.push(pulseBtn);

  return comps;
}

/**
 * Creates an initial TrainerBoardModel with Module 1 (4 IC sockets, 16 inputs)
 */
export function createInitialTrainerBoard(
  boardId: string = 'board_1',
  originX: number = TRAINER_CONSTANTS.DEFAULT_BOARD_X,
  originY: number = TRAINER_CONSTANTS.DEFAULT_BOARD_Y
): { board: TrainerBoardModel; components: CircuitComponent[] } {
  const mod1Id = `${boardId}_mod_1`;
  const mod1X = originX + TRAINER_CONSTANTS.BOARD_PADDING_LEFT;
  const mod1Y = originY;

  const mod1Slots = calculateModuleICSlots(
    boardId,
    mod1Id,
    mod1X,
    mod1Y,
    0, // start slot index: 0 (IC1..IC4)
    TRAINER_CONSTANTS.MODULE_1_IC_COUNT
  );

  const mod1Inputs = createTrainerInputComponents(
    boardId,
    0, // input index 0..15
    TRAINER_CONSTANTS.MODULE_1_INPUT_COUNT,
    originX + TRAINER_CONSTANTS.INPUTS_START_X_OFFSET,
    originY + TRAINER_CONSTANTS.INPUTS_Y_OFFSET
  );

  const module1: TrainerModuleConfig = {
    id: mod1Id,
    index: 0,
    name: 'Module 1',
    x: mod1X,
    y: mod1Y,
    width: TRAINER_CONSTANTS.MODULE_1_WIDTH,
    height: TRAINER_CONSTANTS.BOARD_HEIGHT,
    icCount: TRAINER_CONSTANTS.MODULE_1_IC_COUNT,
    inputCount: TRAINER_CONSTANTS.MODULE_1_INPUT_COUNT,
    startInputIndex: 0,
    icSlotIds: mod1Slots.map((s) => s.id),
    inputComponentIds: mod1Inputs.map((c) => c.id),
  };

  const initialModules = [module1];
  const boardWidth = calculateBoardWidth(initialModules);

  const chassisComps = createTrainerChassisComponents(boardId, originX, originY, boardWidth);

  const board: TrainerBoardModel = {
    id: boardId,
    name: 'Digital Trainer Board',
    x: originX,
    y: originY,
    width: boardWidth,
    height: TRAINER_CONSTANTS.BOARD_HEIGHT,
    modules: initialModules,
    icSlots: mod1Slots,
    isPowerOn: true,
    clockHz: 1,
    activeModuleCount: 1,
  };

  return {
    board,
    components: [...mod1Inputs, ...chassisComps],
  };
}

/**
 * Adds an expandable module to the trainer board (Module 2, Module 3, etc.)
 * Module 2: Adds IC5, IC6 and IN16..IN23
 * Module 3: Adds IC7, IC8 and IN24..IN31
 */
export function addModuleToTrainerBoard(
  circuit: Circuit,
  boardId: string = 'board_1'
): { circuit: Circuit; newModule: TrainerModuleConfig } {
  const boards = circuit.trainerBoards || [];
  let targetBoard = boards.find((b) => b.id === boardId);

  // If no board exists in circuit model, create initial first
  let updatedComponents = [...circuit.components];
  if (!targetBoard) {
    const initial = createInitialTrainerBoard(boardId);
    targetBoard = initial.board;
    updatedComponents = [...updatedComponents, ...initial.components];
  }

  const existingModules = targetBoard.modules;
  const newModuleIndex = existingModules.length; // e.g. 1 for Module 2, 2 for Module 3
  const newModuleNum = newModuleIndex + 1; // 2, 3...
  const newModId = `${targetBoard.id}_mod_${newModuleNum}`;

  // Calculate start slot index and start input index
  const totalExistingICs = targetBoard.icSlots.length; // e.g. 4 for mod 1, 6 for mod 1+2
  const totalExistingInputs = existingModules.reduce((acc, m) => acc + m.inputCount, 0); // e.g. 16, 24

  // Calculate position after previous module
  const lastModule = existingModules[existingModules.length - 1];
  const newModX = lastModule.x + lastModule.width + TRAINER_CONSTANTS.MODULE_GAP;
  const newModY = targetBoard.y;
  const newModWidth = TRAINER_CONSTANTS.MODULE_N_WIDTH;

  // 1. Generate new IC slots
  const newSlots = calculateModuleICSlots(
    targetBoard.id,
    newModId,
    newModX,
    newModY,
    totalExistingICs,
    TRAINER_CONSTANTS.MODULE_N_IC_COUNT
  );

  // 2. Generate new trainer input toggle components
  // Under the new module, inputs are positioned from highest index down to lowest (e.g. IN23..IN16)
  const inputsStartX = newModX + 24;
  const newInputs = createTrainerInputComponents(
    targetBoard.id,
    totalExistingInputs,
    TRAINER_CONSTANTS.MODULE_N_INPUT_COUNT,
    inputsStartX,
    targetBoard.y + TRAINER_CONSTANTS.INPUTS_Y_OFFSET
  );

  const newModule: TrainerModuleConfig = {
    id: newModId,
    index: newModuleIndex,
    name: `Module ${newModuleNum}`,
    x: newModX,
    y: newModY,
    width: newModWidth,
    height: TRAINER_CONSTANTS.BOARD_HEIGHT,
    icCount: TRAINER_CONSTANTS.MODULE_N_IC_COUNT,
    inputCount: TRAINER_CONSTANTS.MODULE_N_INPUT_COUNT,
    startInputIndex: totalExistingInputs,
    icSlotIds: newSlots.map((s) => s.id),
    inputComponentIds: newInputs.map((c) => c.id),
  };

  const updatedModules = [...existingModules, newModule];
  const newBoardWidth = calculateBoardWidth(updatedModules);
  const widthDelta = newModWidth + TRAINER_CONSTANTS.MODULE_GAP;

  // 3. Shift the Clock section, Displays, and Power button to the right to maintain clean board layout
  const idPrefix = targetBoard.id === 'board_1' ? 'trainer_' : `${targetBoard.id}_trainer_`;
  const componentsToShift = new Set([
    `${idPrefix}clk_10`,
    `${idPrefix}clk_5`,
    `${idPrefix}clk_1`,
    `${idPrefix}clk_0_5`,
    `${idPrefix}clk`,
    `${idPrefix}high`,
    `${idPrefix}low`,
    `${idPrefix}pulse`,
    `${idPrefix}seg_1`,
    `${idPrefix}seg_2`,
    `${idPrefix}power`,
  ]);

  updatedComponents = updatedComponents.map((c) => {
    if (componentsToShift.has(c.id)) {
      return {
        ...c,
        x: c.x + widthDelta,
      };
    }
    return c;
  });

  // Add the newly generated inputs to the circuit component array
  updatedComponents.push(...newInputs);

  // Update target board model
  const updatedBoard: TrainerBoardModel = {
    ...targetBoard,
    width: newBoardWidth,
    modules: updatedModules,
    icSlots: [...targetBoard.icSlots, ...newSlots],
    activeModuleCount: updatedModules.length,
  };

  const otherBoards = boards.filter((b) => b.id !== boardId);
  const updatedBoards = [...otherBoards, updatedBoard];

  const nextCircuit: Circuit = {
    ...circuit,
    components: updatedComponents,
    trainerBoards: updatedBoards,
  };

  return {
    circuit: simulateCircuit(nextCircuit).circuit,
    newModule,
  };
}

/**
 * Safely removes the last added module from the board (reverting Module 3 -> 2, or Module 2 -> 1)
 * Module 1 (the 4 IC / 16 inputs foundation) cannot be removed.
 */
export function removeLastModuleFromTrainerBoard(
  circuit: Circuit,
  boardId: string = 'board_1'
): Circuit {
  const boards = circuit.trainerBoards || [];
  const targetBoard = boards.find((b) => b.id === boardId);
  if (!targetBoard || targetBoard.modules.length <= 1) {
    return circuit; // Cannot remove initial module
  }

  const existingModules = targetBoard.modules;
  const lastModule = existingModules[existingModules.length - 1];
  const updatedModules = existingModules.slice(0, -1);
  const newBoardWidth = calculateBoardWidth(updatedModules);
  const widthDelta = lastModule.width + TRAINER_CONSTANTS.MODULE_GAP;

  // Collect component IDs to remove (generated inputs and any ICs mounted on this module's sockets)
  const inputIdsToRemove = new Set(lastModule.inputComponentIds);
  const slotIdsToRemove = new Set(lastModule.icSlotIds);

  // Find any ICs mounted on these sockets
  const mountedICsToRemove = new Set<string>();
  const lastModuleSlots = targetBoard.icSlots.filter((s) => slotIdsToRemove.has(s.id));
  circuit.components.forEach((c) => {
    if (c.type.startsWith('ic_') || c.type === 'custom_ic') {
      const isMountedOnRemovedSlot = lastModuleSlots.some(
        (s) => Math.abs(c.x - s.x) < 50 && Math.abs(c.y - s.y) < 40
      );
      if (isMountedOnRemovedSlot) {
        mountedICsToRemove.add(c.id);
      }
    }
  });

  const allCompsToRemove = new Set([...inputIdsToRemove, ...mountedICsToRemove]);

  // Remove components and any wires attached to them
  const idPrefix = targetBoard.id === 'board_1' ? 'trainer_' : `${targetBoard.id}_trainer_`;
  const componentsToShift = new Set([
    `${idPrefix}clk_10`,
    `${idPrefix}clk_5`,
    `${idPrefix}clk_1`,
    `${idPrefix}clk_0_5`,
    `${idPrefix}clk`,
    `${idPrefix}high`,
    `${idPrefix}low`,
    `${idPrefix}pulse`,
    `${idPrefix}seg_1`,
    `${idPrefix}seg_2`,
    `${idPrefix}power`,
  ]);

  const remainingComponents = circuit.components
    .filter((c) => !allCompsToRemove.has(c.id))
    .map((c) => {
      if (componentsToShift.has(c.id)) {
        return {
          ...c,
          x: c.x - widthDelta,
        };
      }
      return c;
    });

  const remainingWires = circuit.wires.filter(
    (w) => !allCompsToRemove.has(w.fromCompId) && !allCompsToRemove.has(w.toCompId)
  );

  const remainingSlots = targetBoard.icSlots.filter((s) => !slotIdsToRemove.has(s.id));

  const updatedBoard: TrainerBoardModel = {
    ...targetBoard,
    width: newBoardWidth,
    modules: updatedModules,
    icSlots: remainingSlots,
    activeModuleCount: updatedModules.length,
  };

  const otherBoards = boards.filter((b) => b.id !== boardId);
  const updatedBoards = [...otherBoards, updatedBoard];

  const nextCircuit: Circuit = {
    ...circuit,
    components: remainingComponents,
    wires: remainingWires,
    trainerBoards: updatedBoards,
  };

  return simulateCircuit(nextCircuit).circuit;
}

/**
 * Duplicates a complete trainer board with all its modules and mounted ICs, regenerating safe unique IDs
 */
export function copyTrainerBoard(
  circuit: Circuit,
  sourceBoardId: string,
  offsetX: number = 40,
  offsetY: number = 520
): { circuit: Circuit; newBoardId: string; newBoard?: TrainerBoardModel } {
  const boards = circuit.trainerBoards || [];
  const srcBoard = boards.find((b) => b.id === sourceBoardId) || boards[0];
  if (!srcBoard) {
    return { circuit, newBoardId: '' };
  }

  const newBoardId = `board_${Date.now().toString(36).substring(2, 7)}`;
  const newOriginX = srcBoard.x + offsetX;
  const newOriginY = srcBoard.y + offsetY;

  // Build ID mapping from source component IDs to cloned component IDs
  const idMap: Record<string, string> = {};
  const srcPrefix = srcBoard.id === 'board_1' ? 'trainer_' : `${srcBoard.id}_trainer_`;
  const dstPrefix = `${newBoardId}_trainer_`;

  // Find all components belonging to the source board
  const srcComps = circuit.components.filter(
    (c) => c.customProps?.boardId === srcBoard.id || c.id.startsWith(srcPrefix)
  );

  const clonedComps: CircuitComponent[] = srcComps.map((orig) => {
    const clonedId = orig.id.replace(srcPrefix, dstPrefix);
    idMap[orig.id] = clonedId;

    return {
      ...orig,
      id: clonedId,
      x: orig.x + offsetX,
      y: orig.y + offsetY,
      customProps: {
        ...orig.customProps,
        boardId: newBoardId,
      },
    };
  });

  // Clone module definitions and IC slots with new coordinates and IDs
  const clonedSlots: TrainerICSlot[] = srcBoard.icSlots.map((s) => ({
    ...s,
    id: `${newBoardId}_ic_${s.baseIndex + 1}`,
    x: s.x + offsetX,
    y: s.y + offsetY,
    boardId: newBoardId,
  }));

  const clonedModules: TrainerModuleConfig[] = srcBoard.modules.map((m) => {
    const modSlots = clonedSlots.filter((s) => s.moduleId === m.id);
    return {
      ...m,
      id: `${newBoardId}_mod_${m.index + 1}`,
      x: m.x + offsetX,
      y: m.y + offsetY,
      icSlotIds: modSlots.map((s) => s.id),
      inputComponentIds: m.inputComponentIds.map((id) => idMap[id] || id),
    };
  });

  const newBoard: TrainerBoardModel = {
    ...srcBoard,
    id: newBoardId,
    name: `Trainer Board (${newBoardId})`,
    x: newOriginX,
    y: newOriginY,
    modules: clonedModules,
    icSlots: clonedSlots,
    activeModuleCount: clonedModules.length,
  };

  const nextCircuit: Circuit = {
    ...circuit,
    components: [...circuit.components, ...clonedComps],
    trainerBoards: [...boards, newBoard],
  };

  return {
    circuit: simulateCircuit(nextCircuit).circuit,
    newBoardId,
    newBoard,
  };
}

/**
 * Removes an entire trainer board and all its associated components and wires
 */
export function deleteTrainerBoard(circuit: Circuit, boardId: string): Circuit {
  const boards = circuit.trainerBoards || [];
  const targetBoard = boards.find((b) => b.id === boardId);
  if (!targetBoard) return circuit;

  const idPrefix = boardId === 'board_1' ? 'trainer_' : `${boardId}_trainer_`;

  // Find all components belonging to this board
  const boardCompIds = new Set(
    circuit.components
      .filter((c) => c.customProps?.boardId === boardId || c.id.startsWith(idPrefix))
      .map((c) => c.id)
  );

  // Also include any ICs mounted on this board's sockets
  targetBoard.icSlots.forEach((slot) => {
    const mounted = circuit.components.find(
      (c) =>
        (c.type.startsWith('ic_') || c.type === 'custom_ic') &&
        Math.abs(c.x - slot.x) < 50 &&
        Math.abs(c.y - slot.y) < 40
    );
    if (mounted) boardCompIds.add(mounted.id);
  });

  const remainingComponents = circuit.components.filter((c) => !boardCompIds.has(c.id));
  const remainingWires = circuit.wires.filter(
    (w) => !boardCompIds.has(w.fromCompId) && !boardCompIds.has(w.toCompId)
  );
  const remainingBoards = boards.filter((b) => b.id !== boardId);

  return {
    ...circuit,
    components: remainingComponents,
    wires: remainingWires,
    trainerBoards: remainingBoards,
  };
}

/**
 * Finds which IC is currently mounted on a given IC socket slot
 */
export function getMountedICOnSocket(
  circuit: Circuit,
  slotOrId: TrainerICSlot | string
): CircuitComponent | undefined {
  let slot: TrainerICSlot | undefined;
  if (typeof slotOrId === 'string') {
    for (const b of circuit.trainerBoards || []) {
      slot = b.icSlots.find((s) => s.id === slotOrId);
      if (slot) break;
    }
  } else {
    slot = slotOrId;
  }
  if (!slot) return undefined;

  return circuit.components.find(
    (c) =>
      (c.type.startsWith('ic_') || c.type === 'custom_ic') &&
      (c.customProps?.trainerMount?.socketId === slot.id ||
        (Math.abs(c.x - slot.x) < 50 && Math.abs(c.y - slot.y) < 40))
  );
}

/**
 * Finds the first available (empty) IC socket on the trainer board
 */
export function findAvailableICSocket(
  circuit: Circuit,
  boardId: string = 'board_1'
): TrainerICSlot | null {
  const board = (circuit.trainerBoards || []).find((b) => b.id === boardId) || circuit.trainerBoards?.[0];
  if (!board) return null;

  for (const slot of board.icSlots) {
    const occupied = getMountedICOnSocket(circuit, slot);
    if (!occupied) return slot;
  }
  return null;
}
