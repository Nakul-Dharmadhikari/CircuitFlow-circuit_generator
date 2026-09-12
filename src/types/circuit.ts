export type LogicValue = '0' | '1' | 'Z' | 'X';

export type PinType = 'input' | 'output';

export interface Pin {
  id: string;
  name: string;
  type: PinType;
  x: number; // Offset relative to component top-left
  y: number; // Offset relative to component top-left
  value: LogicValue;
  inverted?: boolean; // Inverted bubble symbol
  labelPosition?: 'left' | 'right' | 'top' | 'bottom';
}

export type ComponentCategory = 'dip_ics' | 'my_ics' | 'io' | 'gates' | 'combinational' | 'sequential' | 'display' | 'wiring';

export type ComponentType =
  // 74-Series DIP ICs (Standard 14/16-pin horizontal)
  | 'ic_7408' // Quad 2-Input AND Gate (14-pin DIP)
  | 'ic_7432' // Quad 2-Input OR Gate (14-pin DIP)
  | 'ic_7404' // Hex Inverter NOT Gate (14-pin DIP)
  | 'ic_7400' // Quad 2-Input NAND Gate (14-pin DIP)
  | 'ic_7402' // Quad 2-Input NOR Gate (14-pin DIP)
  | 'ic_7486' // Quad 2-Input XOR Gate (14-pin DIP)
  | 'ic_74151' // 8-to-1 Line Multiplexer (16-pin DIP)
  | 'ic_74153' // Dual 4-to-1 Line Multiplexer (16-pin DIP)
  | 'ic_74138' // 3-to-8 Line Decoder / DEMUX (16-pin DIP)
  | 'ic_74139' // Dual 2-to-4 Line Decoder / DEMUX (16-pin DIP)
  | 'ic_7490' // Decade / BCD Counter (14-pin DIP)
  | 'ic_7493' // 4-Bit Binary Ripple Counter (14-pin DIP)
  | 'ic_7483' // 4-Bit Binary Full Adder (16-pin DIP)
  | 'ic_7485' // 4-Bit Magnitude Comparator (16-pin DIP)
  | 'ic_7474' // Dual D Flip-Flop with PRE/CLR (14-pin DIP)
  | 'ic_7476' // Dual JK Flip-Flop with PRE/CLR (16-pin DIP)
  | 'ic_74194' // 4-Bit Universal Bidirectional Shift Register (16-pin DIP)
  | 'ic_7447' // BCD to 7-Segment Decoder / Driver (16-pin DIP)
  | 'ic_555' // NE555 Precision Timer IC (8-pin DIP)
  | 'custom_ic' // User-Defined Custom Reusable IC (14/16/20-pin)
  // Basic & Multi-Input Logic Gates
  | 'buffer'
  | 'not'
  | 'and'
  | 'and_3' // 3-Input AND Gate
  | 'or'
  | 'or_3' // 3-Input OR Gate
  | 'nand'
  | 'nand_3' // 3-Input NAND Gate
  | 'nor'
  | 'nor_3' // 3-Input NOR Gate
  | 'xor'
  | 'xnor'
  | 'tri_state'
  // I/O Controls & Modular Pins
  | 'input_pin' // Standalone configurable input pin (0/1 toggle)
  | 'output_pin' // Standalone logic probe / output pin indicator
  | 'toggle'
  | 'push_button'
  | 'clock'
  | 'vcc'
  | 'gnd'
  | 'probe'
  // Output & Indicators
  | 'led'
  | 'rgb_led' // RGB Multi-Color LED (Red, Green, Blue inputs)
  | 'led_bar_4' // 4-Bit Bar Graph LED Indicator
  | 'seven_segment'
  | 'hex_display'
  | 'buzzer'
  // Combinational MSI
  | 'half_adder'
  | 'full_adder'
  | 'mux_2to1'
  | 'mux_4to1'
  | 'demux_1to2'
  | 'demux_1to4'
  | 'decoder_2to4'
  | 'comparator_4bit'
  | 'priority_encoder_4to2' // 4-to-2 Priority Encoder
  | 'parity_gen' // 4-Bit Even/Odd Parity Generator
  // Sequential & Storage
  | 'sr_latch'
  | 'd_latch' // Transparent D Latch with Enable
  | 'd_flipflop'
  | 'jk_flipflop'
  | 't_flipflop'
  | 'counter_4bit'
  | 'shift_reg_4bit'
  // Wiring, Breadboarding & Branching
  | 'breadboard' // Full Solderless Breadboard (830 tie-points)
  | 'breadboard_half' // Half Solderless Breadboard (400 tie-points)
  | 'breadboard_mini' // Mini Solderless Breadboard (170 tie-points)
  | 'junction';

export interface CustomICPinMapping {
  pin: number; // 1..pinCount
  pinNumber?: number;
  name: string;
  type: 'input' | 'output' | 'power' | 'nc';
  internalCompId?: string;
  internalComponentId?: string;
  internalPinId?: string;
  inverted?: boolean;
}

export interface CustomICDefinition {
  id: string;
  userId: string;
  name: string;
  code: string;
  partNumber?: string;
  description?: string;
  pinCount: 14 | 16 | 20;
  circuit?: Circuit;
  internalCircuit?: Circuit;
  pins: CustomICPinMapping[];
  pinMappings?: CustomICPinMapping[];
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  displayName: string;
  avatarColor: string;
  createdAt: number;
}

export interface SavedCircuit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  circuit: Circuit;
  createdAt: number;
  updatedAt: number;
  componentCount: number;
  wireCount: number;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  label: string;
  isCustomLabel?: boolean; // Set to true when user explicitly sets or edits the component label
  isTrainerFixed?: boolean; // Marks components belonging to fixed hardware trainer kit
  x: number;
  y: number;
  width: number;
  height: number;
  inputs: Pin[];
  outputs: Pin[];
  state?: {
    internal?: LogicValue;
    q?: LogicValue;
    qBar?: LogicValue;
    prevClock?: LogicValue;
    count?: number;
    shiftRegister?: LogicValue[];
    toggleState?: boolean;
    buttonPressed?: boolean;
    [key: string]: any;
  };
  customProps?: {
    color?: string; // for LED: 'green' | 'red' | 'amber' | 'blue'
    frequency?: number; // for Clock: in Hz
    audioTone?: number; // for Buzzer: in Hz
    inputCount?: number;
    [key: string]: any;
  };
  customIcId?: string; // ID referencing CustomICDefinition
  customIC?: CustomICDefinition; // Inline custom IC definition
}

export interface Wire {
  id: string;
  fromCompId: string;
  fromPinId: string;
  toCompId: string;
  toPinId: string;
  value: LogicValue;
}

export interface Circuit {
  components: CircuitComponent[];
  wires: Wire[];
}

export interface WaveformChannel {
  id: string;
  compId: string;
  pinId: string;
  label: string;
  color: string;
}

export interface WaveformSample {
  timeIndex: number;
  values: Record<string, LogicValue>; // channelId -> LogicValue
}

export interface SimulationStats {
  running: boolean;
  stepCount: number;
  clockHz: number;
  activeNets: number;
  cycleDetected: boolean;
}
