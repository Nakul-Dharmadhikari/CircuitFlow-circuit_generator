import type { CircuitComponent } from '../../types/circuit';
import type { Box, Point } from './geometry';
import { pointInBox } from './geometry';

export const COMPONENT_ROUTING_MARGIN = 6;

/**
 * Returns the exact bounding box in world coordinates for a circuit component
 */
export function getComponentBounds(comp: CircuitComponent, margin: number = 0): Box {
  return {
    x: comp.x - margin,
    y: comp.y - margin,
    width: comp.width + margin * 2,
    height: comp.height + margin * 2,
  };
}

/**
 * Calculates the bounding box of a Trainer Board by index from its components
 */
export function getBoardBounds(
  boardIndex: number,
  components: CircuitComponent[],
  margin: number = 20
): Box | null {
  const prefix = boardIndex === 0 ? 'trainer_' : `trainer_b${boardIndex}_`;
  const boardComps = components.filter(
    (c) =>
      c.customProps?.boardIndex === boardIndex ||
      (boardIndex === 0 && c.id.startsWith('trainer_') && !c.id.match(/^trainer_b\d+_/)) ||
      c.id.startsWith(prefix)
  );

  if (boardComps.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const c of boardComps) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x + c.width);
    maxY = Math.max(maxY, c.y + c.height);
  }

  return {
    x: minX - margin,
    y: minY - margin,
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
  };
}

/**
 * Determines if a component is an obstacle that wires should detour around
 * Note: Dynamic check that works for any logic gate, standard IC (74xx), custom IC, or breadboard
 */
export function isRoutingObstacle(comp: CircuitComponent): boolean {
  // Fixed trainer I/O pins (switches, output probes, clocks, VCC, GND) allow wires to depart from their pins directly
  if (
    comp.customProps?.isTrainerOutput ||
    comp.customProps?.isTrainerInput ||
    comp.customProps?.isTrainerClock ||
    comp.customProps?.isTrainerVcc ||
    comp.customProps?.isTrainerGnd
  ) {
    return false;
  }

  // Any IC (built-in 74-series, custom user IC, 555 timer, etc.)
  if (comp.type.startsWith('ic_') || comp.type === 'custom_ic') {
    return true;
  }

  // Any logic gate or MSI combinational/sequential block
  const obstacleTypes = new Set([
    'and',
    'and_3',
    'or',
    'or_3',
    'nand',
    'nand_3',
    'nor',
    'nor_3',
    'xor',
    'xnor',
    'not',
    'buffer',
    'tri_state',
    'full_adder',
    'half_adder',
    'mux_2to1',
    'mux_4to1',
    'demux_1to2',
    'demux_1to4',
    'decoder_2to4',
    'comparator_4bit',
    'priority_encoder_4to2',
    'parity_gen',
    'sr_latch',
    'd_latch',
    'd_flipflop',
    'jk_flipflop',
    't_flipflop',
    'counter_4bit',
    'shift_reg_4bit',
    'seven_segment',
    'hex_display',
    'buzzer',
    'led_bar_4',
  ]);

  return obstacleTypes.has(comp.type);
}

/**
 * Collects bounding boxes of all components on the canvas that act as routing obstacles
 * Excludes source and destination components to allow wires to connect cleanly to pins
 */
export function getComponentObstacles(
  components: CircuitComponent[],
  excludeCompIds: string[] = [],
  margin: number = COMPONENT_ROUTING_MARGIN
): Box[] {
  const excludeSet = new Set(excludeCompIds);
  const boxes: Box[] = [];

  for (const comp of components) {
    if (excludeSet.has(comp.id)) continue;
    if (isRoutingObstacle(comp)) {
      boxes.push(getComponentBounds(comp, margin));
    }
  }

  return boxes;
}

/**
 * Cached Obstacle Map data structure to avoid rebuilding bounding box arrays when no components have changed
 */
export class ObstacleMap {
  private boxes: Box[] = [];
  private compHash: string = '';

  public update(components: CircuitComponent[], excludeCompIds: string[] = []): Box[] {
    const hash = components
      .map((c) => `${c.id}:${Math.round(c.x)}:${Math.round(c.y)}:${c.width}:${c.height}`)
      .join('|');

    if (hash !== this.compHash || excludeCompIds.length > 0) {
      this.boxes = getComponentObstacles(components, excludeCompIds);
      if (excludeCompIds.length === 0) {
        this.compHash = hash;
      }
    }

    return this.boxes;
  }

  public getObstacles(): Box[] {
    return this.boxes;
  }

  public isPointBlocked(p: Point, margin: number = 0): boolean {
    return this.boxes.some((b) => pointInBox(p, b, margin));
  }
}
