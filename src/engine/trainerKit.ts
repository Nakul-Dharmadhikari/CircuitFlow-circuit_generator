import type { Circuit, CircuitComponent } from '../types/circuit';
import { createComponent } from './simulator';

export const TRAINER_BOARD_LAYOUT = {
  boardX: 20,
  boardY: 15,
  boardWidth: 1080,
  boardHeight: 520,

  // Outputs (Top Section)
  outputsY: 28,
  outputsStartX: 50,
  outputsPitchX: 38,
  vccX: 665,
  vccY: 28,
  seg1X: 745,
  seg2X: 815,
  segY: 18,
  powerX: 920,
  powerY: 22,

  // Horizontal 20-Pin IC Bases (Center)
  icBasesY: 195,
  icBasesX: [70, 410, 750], // 3 spacious horizontal 250px x 88px DIP-20 sockets
  icBaseWidth: 250,
  icBaseHeight: 88,

  // Inputs (Bottom-Left Section)
  inputsY: 400,
  inputsStartX: 50,
  inputsPitchX: 38,
  gndX: 665,
  gndY: 400,

  // Clock Section (Bottom-Right Section)
  clockY: 400,
  clk10X: 740,
  clk5X: 785,
  clk1X: 830,
  clk05X: 875,
  clkHighX: 935,
  clkLowX: 980,
  pulseBtnX: 920,
  pulseBtnY: 450,
};

/**
 * Creates all Digital Trainer Kit fixed hardware components matching the layout:
 * - Top: 16 Outputs (15..0), VCC, Dual 7-segment displays, Power button
 * - Middle: 3 Horizontal 20-pin IC Bases (positions)
 * - Bottom: 16 Inputs (15..0), GND, Clock section with 10/5/1/0.5Hz selectors and GENERATE PULSE
 */
export function createTrainerKitComponents(
  offsetX = 0,
  offsetY = 0,
  boardIndex = 0
): CircuitComponent[] {
  const comps: CircuitComponent[] = [];
  const prefix = boardIndex === 0 ? 'trainer_' : `trainer_b${boardIndex}_`;

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
      boardIndex,
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
  vcc.customProps = { isTrainerVcc: true, boardIndex };
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
  seg1.customProps = { boardIndex };
  comps.push(seg1);

  const seg2 = createComponent(
    'seven_segment',
    TRAINER_BOARD_LAYOUT.seg2X + offsetX,
    TRAINER_BOARD_LAYOUT.segY + offsetY
  );
  seg2.id = `${prefix}seg_2`;
  seg2.label = 'DISP 2';
  seg2.isTrainerFixed = true;
  seg2.customProps = { boardIndex };
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
  power.customProps = { isTrainerPower: true, boardIndex };
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
      boardIndex,
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
  gnd.customProps = { isTrainerGnd: true, boardIndex };
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
  masterClk.customProps = { isTrainerClock: true, frequency: 1, boardIndex };
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
  clkHigh.customProps = { isTrainerHigh: true, boardIndex };
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
  clkLow.customProps = { isTrainerLow: true, boardIndex };
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
  pulseBtn.customProps = { isTrainerPulseButton: true, boardIndex };
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
 * Checks if a circuit has Digital Trainer Kit components; if not, injects them cleanly
 */
export function ensureTrainerKit(circuit: Circuit): Circuit {
  const existingTrainer = circuit.components.some((c) => c.isTrainerFixed || c.id.startsWith('trainer_'));
  if (existingTrainer) {
    return circuit;
  }
  const defaultTrainerComps = createTrainerKitComponents();
  return {
    ...circuit,
    components: [...circuit.components, ...defaultTrainerComps],
  };
}

export function isTrainerComponentId(id: string): boolean {
  return id.startsWith('trainer_');
}
