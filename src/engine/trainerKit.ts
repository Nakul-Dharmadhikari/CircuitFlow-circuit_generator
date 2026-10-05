import type { Circuit, CircuitComponent } from '../types/circuit';
import { createComponent } from './simulator';
import {
  TRAINER_CONSTANTS,
  createInitialTrainerBoard,
  createTrainerChassisComponents,
  createTrainerInputComponents,
  addModuleToTrainerBoard,
  removeLastModuleFromTrainerBoard,
  copyTrainerBoard,
  deleteTrainerBoard,
  getMountedICOnSocket,
  findAvailableICSocket,
  calculateBoardWidth,
  type TrainerBoardModel,
  type TrainerModuleConfig,
  type TrainerICSlot,
} from './trainer/trainerBoardModel';

// Re-export dynamic model types & functions
export {
  TRAINER_CONSTANTS,
  createInitialTrainerBoard,
  addModuleToTrainerBoard,
  removeLastModuleFromTrainerBoard,
  copyTrainerBoard,
  deleteTrainerBoard,
  getMountedICOnSocket,
  findAvailableICSocket,
  calculateBoardWidth,
  type TrainerBoardModel,
  type TrainerModuleConfig,
  type TrainerICSlot,
};

export const TRAINER_BOARD_LAYOUT = {
  boardX: TRAINER_CONSTANTS.DEFAULT_BOARD_X,
  boardY: TRAINER_CONSTANTS.DEFAULT_BOARD_Y,
  boardWidth: 1180,
  boardHeight: TRAINER_CONSTANTS.BOARD_HEIGHT,

  // Outputs (Top Section)
  outputsY: 24,
  outputsStartX: 40,
  outputsPitchX: TRAINER_CONSTANTS.OUTPUTS_PITCH_X,
  vccX: 665,
  vccY: 24,
  seg1X: 945,
  seg2X: 1005,
  segY: 16,
  powerX: 1085,
  powerY: 18,

  // Horizontal 20-Pin IC Bases (Center) - Default: 4 IC Sockets (IC1, IC2, IC3, IC4)
  icBasesY: TRAINER_CONSTANTS.DEFAULT_BOARD_Y + TRAINER_CONSTANTS.IC_Y_OFFSET,
  icBasesX: [54, 328, 602, 876], // 4 spacious DIP-20 sockets
  icBaseWidth: TRAINER_CONSTANTS.IC_SOCKET_WIDTH,
  icBaseHeight: TRAINER_CONSTANTS.IC_SOCKET_HEIGHT,

  // Inputs (Bottom Section)
  inputsY: TRAINER_CONSTANTS.INPUTS_Y_OFFSET,
  inputsStartX: TRAINER_CONSTANTS.INPUTS_START_X_OFFSET,
  inputsPitchX: TRAINER_CONSTANTS.INPUTS_PITCH_X,
  gndX: 665,
  gndY: TRAINER_CONSTANTS.INPUTS_Y_OFFSET,

  // Clock Section (Bottom-Right Section)
  clockY: TRAINER_CONSTANTS.CLOCK_Y_OFFSET,
  clk10X: 840,
  clk5X: 885,
  clk1X: 930,
  clk05X: 975,
  clkHighX: 1030,
  clkLowX: 1075,
  pulseBtnX: 1015,
  pulseBtnY: 410,
};

/**
 * Creates all Digital Trainer Kit initial hardware components matching the layout:
 * - Module 1: 4 Horizontal 20-pin IC Bases (empty sockets), 16 Inputs (15..0)
 * - Top: 16 Outputs (15..0), VCC, Dual 7-segment displays, Power button
 * - Bottom Right: GND, Clock section with 10/5/1/0.5Hz selectors and GENERATE PULSE
 * Fully supports optional offsetX, offsetY, and boardIndex for multi-board placement.
 */
export function createTrainerKitComponents(
  offsetX = 0,
  offsetY = 0,
  boardIndex = 0
): CircuitComponent[] {
  const comps: CircuitComponent[] = [];
  const prefix = boardIndex === 0 ? 'trainer_' : `trainer_b${boardIndex}_`;
  const boardId = boardIndex === 0 ? 'board_1' : `board_${boardIndex + 1}`;

  // =========================================================================
  // 1. OUTPUT SECTION (Top: 15 to 0 from left to right)
  // =========================================================================
  for (let n = 15; n >= 0; n--) {
    const colIndex = 15 - n; // 0 for pin 15, 15 for pin 0
    const x = TRAINER_BOARD_LAYOUT.outputsStartX + colIndex * TRAINER_BOARD_LAYOUT.outputsPitchX + offsetX;
    const y = TRAINER_BOARD_LAYOUT.outputsY + offsetY;

    const outComp = createComponent('probe', x, y);
    outComp.id = `${prefix}out_${n}`;
    outComp.label = `${n}`;
    outComp.width = 28;
    outComp.height = 36;
    outComp.isTrainerFixed = true;
    outComp.customProps = {
      isTrainerOutput: true,
      outputIndex: n,
      trainerOutputIndex: n,
      boardIndex,
      boardId,
    };
    // Position terminal pin right below the lamp
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
  const vcc = createComponent(
    'vcc',
    TRAINER_BOARD_LAYOUT.vccX + offsetX,
    TRAINER_BOARD_LAYOUT.vccY + offsetY
  );
  vcc.id = `${prefix}vcc`;
  vcc.label = 'VCC';
  vcc.width = 32;
  vcc.height = 44;
  vcc.isTrainerFixed = true;
  vcc.customProps = { isTrainerVcc: true, boardIndex, boardId };
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

  // Compact Dual 7-Segment Displays
  const seg1 = createComponent(
    'seven_segment',
    TRAINER_BOARD_LAYOUT.seg1X + offsetX,
    TRAINER_BOARD_LAYOUT.segY + offsetY
  );
  seg1.id = `${prefix}seg_1`;
  seg1.label = 'DISP 1';
  seg1.isTrainerFixed = true;
  seg1.customProps = { boardIndex, boardId };
  comps.push(seg1);

  const seg2 = createComponent(
    'seven_segment',
    TRAINER_BOARD_LAYOUT.seg2X + offsetX,
    TRAINER_BOARD_LAYOUT.segY + offsetY
  );
  seg2.id = `${prefix}seg_2`;
  seg2.label = 'DISP 2';
  seg2.isTrainerFixed = true;
  seg2.customProps = { boardIndex, boardId };
  comps.push(seg2);

  // Board Power Switch Unit
  const power = createComponent(
    'toggle',
    TRAINER_BOARD_LAYOUT.powerX + offsetX,
    TRAINER_BOARD_LAYOUT.powerY + offsetY
  );
  power.id = `${prefix}power`;
  power.label = 'POWER';
  power.width = 72;
  power.height = 46;
  power.isTrainerFixed = true;
  power.customProps = { isTrainerPower: true, boardIndex, boardId };
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

  // =========================================================================
  // 2. INPUT SECTION (Bottom: 15 to 0 from left to right)
  // =========================================================================
  for (let n = 15; n >= 0; n--) {
    const colIndex = 15 - n; // 0 for pin 15, 15 for pin 0
    const x = TRAINER_BOARD_LAYOUT.inputsStartX + colIndex * TRAINER_BOARD_LAYOUT.inputsPitchX + offsetX;
    const y = TRAINER_BOARD_LAYOUT.inputsY + offsetY;

    const inComp = createComponent('toggle', x, y);
    inComp.id = `${prefix}in_${n}`;
    inComp.label = `${n}`;
    inComp.width = 28;
    inComp.height = 54;
    inComp.isTrainerFixed = true;
    inComp.customProps = {
      isTrainerInput: true,
      inputIndex: n,
      trainerInputIndex: n,
      boardIndex,
      boardId,
    };
    // Position terminal pin at top, toggle switch in middle, number at bottom
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

  // GND (0V reference terminal)
  const gnd = createComponent(
    'gnd',
    TRAINER_BOARD_LAYOUT.gndX + offsetX,
    TRAINER_BOARD_LAYOUT.gndY + offsetY
  );
  gnd.id = `${prefix}gnd`;
  gnd.label = 'GND';
  gnd.width = 32;
  gnd.height = 54;
  gnd.isTrainerFixed = true;
  gnd.customProps = { isTrainerGnd: true, boardIndex, boardId };
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

  // =========================================================================
  // 3. CLOCK SECTION (Bottom-Right: 10, 5, 1, 0.5 Hz + HIGH, LOW + GENERATE PULSE)
  // =========================================================================
  const frequencies = [
    { freq: 10, label: '10', x: TRAINER_BOARD_LAYOUT.clk10X + offsetX },
    { freq: 5, label: '5', x: TRAINER_BOARD_LAYOUT.clk5X + offsetX },
    { freq: 1, label: '1', x: TRAINER_BOARD_LAYOUT.clk1X + offsetX },
    { freq: 0.5, label: '0.5', x: TRAINER_BOARD_LAYOUT.clk05X + offsetX },
  ];

  frequencies.forEach((f) => {
    const clkComp = createComponent('clock', f.x, TRAINER_BOARD_LAYOUT.clockY + offsetY);
    clkComp.id = `${prefix}clk_${f.label.replace('.', '_')}`;
    clkComp.label = f.label;
    clkComp.width = 32;
    clkComp.height = 54;
    clkComp.isTrainerFixed = true;
    clkComp.customProps = {
      isTrainerClock: true,
      frequency: f.freq,
      boardIndex,
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

  // Master Clock Alias (maps to 1Hz by default)
  const masterClk = createComponent('clock', TRAINER_BOARD_LAYOUT.clk1X + offsetX, TRAINER_BOARD_LAYOUT.clockY + offsetY);
  masterClk.id = `${prefix}clk`;
  masterClk.label = 'CLK';
  masterClk.width = 32;
  masterClk.height = 54;
  masterClk.isTrainerFixed = true;
  masterClk.customProps = { isTrainerClock: true, frequency: 1, boardIndex, boardId };
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
  const clkHigh = createComponent(
    'vcc',
    TRAINER_BOARD_LAYOUT.clkHighX + offsetX,
    TRAINER_BOARD_LAYOUT.clockY + offsetY
  );
  clkHigh.id = `${prefix}high`;
  clkHigh.label = 'HIGH';
  clkHigh.width = 32;
  clkHigh.height = 54;
  clkHigh.isTrainerFixed = true;
  clkHigh.customProps = { isTrainerHigh: true, boardIndex, boardId };
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
  const clkLow = createComponent(
    'gnd',
    TRAINER_BOARD_LAYOUT.clkLowX + offsetX,
    TRAINER_BOARD_LAYOUT.clockY + offsetY
  );
  clkLow.id = `${prefix}low`;
  clkLow.label = 'LOW';
  clkLow.width = 32;
  clkLow.height = 54;
  clkLow.isTrainerFixed = true;
  clkLow.customProps = { isTrainerLow: true, boardIndex, boardId };
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
  const pulseBtn = createComponent(
    'push_button',
    TRAINER_BOARD_LAYOUT.pulseBtnX + offsetX,
    TRAINER_BOARD_LAYOUT.pulseBtnY + offsetY
  );
  pulseBtn.id = `${prefix}pulse`;
  pulseBtn.label = 'GENERATE PULSE';
  pulseBtn.width = 120;
  pulseBtn.height = 32;
  pulseBtn.isTrainerFixed = true;
  pulseBtn.customProps = { isTrainerPulseButton: true, boardIndex, boardId };
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
 * Discovers all unique Trainer Board instances present in a component array
 */
export function getTrainerBoards(components: CircuitComponent[]): Array<{
  boardIndex: number;
  offsetX: number;
  offsetY: number;
}> {
  const boardIndices = new Set<number>();
  for (const c of components) {
    if (c.customProps?.boardIndex !== undefined) {
      boardIndices.add(c.customProps.boardIndex);
    } else if (c.id.startsWith('trainer_')) {
      const match = c.id.match(/^trainer_b(\d+)_/);
      if (match) {
        boardIndices.add(parseInt(match[1], 10));
      } else {
        boardIndices.add(0);
      }
    }
  }

  return Array.from(boardIndices)
    .sort((a, b) => a - b)
    .map((bIdx) => {
      const prefix = bIdx === 0 ? 'trainer_' : `trainer_b${bIdx}_`;
      const refComp = components.find(
        (c) =>
          c.id === `${prefix}out_15` ||
          (c.customProps?.boardIndex === bIdx && c.customProps?.outputIndex === 15)
      );

      let offsetX = 0;
      let offsetY = bIdx * 560;

      if (refComp) {
        offsetX = refComp.x - TRAINER_BOARD_LAYOUT.outputsStartX;
        offsetY = refComp.y - TRAINER_BOARD_LAYOUT.outputsY;
      } else {
        const anyComp = components.find(
          (c) => c.customProps?.boardIndex === bIdx || c.id.startsWith(prefix)
        );
        if (anyComp) {
          if (anyComp.id.endsWith('vcc')) {
            offsetX = anyComp.x - TRAINER_BOARD_LAYOUT.vccX;
            offsetY = anyComp.y - TRAINER_BOARD_LAYOUT.vccY;
          } else if (anyComp.id.endsWith('power')) {
            offsetX = anyComp.x - TRAINER_BOARD_LAYOUT.powerX;
            offsetY = anyComp.y - TRAINER_BOARD_LAYOUT.powerY;
          }
        }
      }

      return {
        boardIndex: bIdx,
        offsetX,
        offsetY,
      };
    });
}

/**
 * Checks if a circuit has Digital Trainer Kit components; if not, injects them cleanly.
 * Preserves dynamic trainer board model, modules, and components across saves and reloads.
 */
export function ensureTrainerKit(circuit: Circuit): Circuit {
  let boards = circuit.trainerBoards ? [...circuit.trainerBoards] : [];
  let components = [...circuit.components];

  if (!boards || boards.length === 0) {
    const { board, components: initialComps } = createInitialTrainerBoard('board_1');
    boards = [board];
    const existingIds = new Set(components.map((c) => c.id));
    const missing = initialComps.filter((c) => !existingIds.has(c.id));
    components.push(...missing);
  } else {
    // If board model already exists (e.g. from saved circuit with 2 or 3 modules), ensure all components exist
    const board = boards[0];
    const existingIds = new Set(components.map((c) => c.id));
    const missingComps: CircuitComponent[] = [];

    // Ensure all inputs from all modules are in the circuit
    board.modules.forEach((mod) => {
      const inputs = createTrainerInputComponents(
        board.id,
        mod.startInputIndex,
        mod.inputCount,
        mod.x + 24,
        board.y + TRAINER_CONSTANTS.INPUTS_Y_OFFSET
      );
      inputs.forEach((comp) => {
        if (!existingIds.has(comp.id)) {
          missingComps.push(comp);
        }
      });
    });

    // Ensure chassis components are present
    const chassis = createTrainerChassisComponents(board.id, board.x, board.y, board.width);
    chassis.forEach((comp) => {
      if (!existingIds.has(comp.id)) {
        missingComps.push(comp);
      }
    });

    components.push(...missingComps);
  }

  // Also verify whether additional legacy trainer boards exist (e.g. from boardIndex > 0 in components)
  const legacyBoards = getTrainerBoards(components);
  if (legacyBoards.length > 1 && boards.length < legacyBoards.length) {
    for (let i = 1; i < legacyBoards.length; i++) {
      const bInfo = legacyBoards[i];
      const legacyBoardId = `board_${bInfo.boardIndex + 1}`;
      if (!boards.some((b) => b.id === legacyBoardId)) {
        const { board: extraBoard } = createInitialTrainerBoard(
          legacyBoardId,
          TRAINER_CONSTANTS.DEFAULT_BOARD_X + bInfo.offsetX,
          TRAINER_CONSTANTS.DEFAULT_BOARD_Y + bInfo.offsetY
        );
        boards.push(extraBoard);
      }
    }
  }

  return {
    ...circuit,
    components,
    trainerBoards: boards,
  };
}

export function isTrainerComponentId(id: string): boolean {
  return id.startsWith('trainer_') || id.includes('_trainer_');
}
