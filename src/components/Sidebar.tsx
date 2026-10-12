import React, { useState, useMemo } from 'react';
import type { ComponentType, CustomICDefinition } from '../types/circuit';
import { GateSymbol } from './GateSymbols';
import { IconSearch, IconCustomIC } from './icons/AppIcons';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAddComponent: (type: ComponentType) => void;
  customICs?: CustomICDefinition[];
  onOpenCreateIC?: () => void;
  onAddCustomIC?: (ic: CustomICDefinition) => void;
  onDeleteCustomIC?: (id: string) => void;
}

export type MasterCategoryId =
  | 'basic_gates'
  | 'sequential'
  | 'msi_functional'
  | 'arithmetic'
  | 'memory'
  | 'io'
  | 'trainer_hardware'
  | 'custom';

export interface ToolboxItem {
  type: ComponentType;
  name: string;
  code?: string;
  partNumber?: string;
  category: MasterCategoryId;
  keywords: string[];
}

export const MASTER_TOOLBOX_ITEMS: ToolboxItem[] = [
  // --- 1. BASIC GATES ---
  { type: 'not', name: 'NOT Inverter', code: 'INV', category: 'basic_gates', keywords: ['not', 'inv', 'inverter', 'negate', 'bubble'] },
  { type: 'buffer', name: 'Buffer', code: 'BUF', category: 'basic_gates', keywords: ['buffer', 'buf', 'driver'] },
  { type: 'and', name: '2-In AND Gate', code: 'AND-2', partNumber: '7408', category: 'basic_gates', keywords: ['and', 'and2', 'gate', '7408', 'conjunction'] },
  { type: 'and_3', name: '3-In AND Gate', code: 'AND-3', category: 'basic_gates', keywords: ['and', 'and3', '3-input and', 'gate'] },
  { type: 'or', name: '2-In OR Gate', code: 'OR-2', partNumber: '7432', category: 'basic_gates', keywords: ['or', 'or2', 'gate', '7432', 'disjunction'] },
  { type: 'or_3', name: '3-In OR Gate', code: 'OR-3', category: 'basic_gates', keywords: ['or', 'or3', '3-input or', 'gate'] },
  { type: 'nand', name: '2-In NAND Gate', code: 'NAND-2', partNumber: '7400', category: 'basic_gates', keywords: ['nand', 'nand2', 'gate', '7400', 'universal'] },
  { type: 'nand_3', name: '3-In NAND Gate', code: 'NAND-3', category: 'basic_gates', keywords: ['nand', 'nand3', '3-input nand', 'gate'] },
  { type: 'nor', name: '2-In NOR Gate', code: 'NOR-2', partNumber: '7402', category: 'basic_gates', keywords: ['nor', 'nor2', 'gate', '7402', 'universal'] },
  { type: 'nor_3', name: '3-In NOR Gate', code: 'NOR-3', category: 'basic_gates', keywords: ['nor', 'nor3', '3-input nor', 'gate'] },
  { type: 'xor', name: 'XOR Gate', code: 'XOR', partNumber: '7486', category: 'basic_gates', keywords: ['xor', 'exclusive or', '7486', 'gate', 'parity'] },
  { type: 'xnor', name: 'XNOR Gate', code: 'XNOR', category: 'basic_gates', keywords: ['xnor', 'exclusive nor', 'gate', 'equivalence'] },
  { type: 'tri_state', name: 'Tri-State Buf', code: '3-STATE', category: 'basic_gates', keywords: ['tri-state', 'tristate', 'bus buffer', 'high-z'] },

  // --- 2. SEQUENTIAL ---
  { type: 'd_flipflop', name: 'D Flip-Flop', code: 'D-FF', partNumber: '7474', category: 'sequential', keywords: ['d-ff', 'd flip flop', 'flip-flop', '7474', 'data', 'register', 'clock'] },
  { type: 'jk_flipflop', name: 'JK Flip-Flop', code: 'JK-FF', partNumber: '7476', category: 'sequential', keywords: ['jk-ff', 'jk flip flop', 'flip-flop', '7476', 'toggle'] },
  { type: 't_flipflop', name: 'T Flip-Flop', code: 'T-FF', category: 'sequential', keywords: ['t-ff', 't flip flop', 'toggle flip flop', 'divider'] },
  { type: 'counter_4bit', name: '4-Bit Counter', code: 'COUNT', partNumber: '7493', category: 'sequential', keywords: ['counter', 'binary counter', '4-bit', '7490', '7493'] },
  { type: 'ic_7474', name: '7474 Dual D-FF', code: 'DIP-20', partNumber: '7474', category: 'sequential', keywords: ['7474', 'd-ff', 'dual d', 'flip-flop', 'dip-20'] },
  { type: 'ic_7476', name: '7476 Dual JK-FF', code: 'DIP-20', partNumber: '7476', category: 'sequential', keywords: ['7476', 'jk-ff', 'dual jk', 'flip-flop', 'dip-20'] },
  { type: 'ic_7490', name: '7490 BCD Counter', code: 'DIP-20', partNumber: '7490', category: 'sequential', keywords: ['7490', 'bcd counter', 'decade counter', 'dip-20'] },
  { type: 'ic_7493', name: '7493 4-Bit Counter', code: 'DIP-20', partNumber: '7493', category: 'sequential', keywords: ['7493', 'ripple counter', '4-bit counter', 'dip-20'] },
  { type: 'ic_555', name: 'NE555 Timer IC', code: 'DIP-8', partNumber: '555', category: 'sequential', keywords: ['555', 'ne555', 'timer', 'oscillator', 'clock'] },

  // --- 3. MSI / FUNCTIONAL ---
  { type: 'mux_2to1', name: '2:1 MUX', code: 'MUX2', category: 'msi_functional', keywords: ['mux', 'multiplexer', '2 to 1', 'selector'] },
  { type: 'mux_4to1', name: '4:1 MUX', code: 'MUX4', partNumber: '74153', category: 'msi_functional', keywords: ['mux', 'multiplexer', '4 to 1', '74151', '74153'] },
  { type: 'demux_1to2', name: '1:2 DEMUX', code: 'DMUX2', category: 'msi_functional', keywords: ['demux', 'demultiplexer', '1 to 2'] },
  { type: 'demux_1to4', name: '1:4 DEMUX', code: 'DMUX4', partNumber: '74139', category: 'msi_functional', keywords: ['demux', 'demultiplexer', '1 to 4', '74138', '74139'] },
  { type: 'decoder_2to4', name: '2:4 Decoder', code: 'DEC', category: 'msi_functional', keywords: ['decoder', 'decode', '2 to 4', 'address'] },
  { type: 'priority_encoder_4to2', name: '4:2 Priority Encoder', code: 'PRI-ENC', category: 'msi_functional', keywords: ['encoder', 'priority encoder', '4 to 2'] },
  { type: 'parity_gen', name: 'Parity Generator', code: 'PARITY', category: 'msi_functional', keywords: ['parity', 'parity generator', 'even odd', 'error check'] },
  { type: 'ic_74151', name: '74151 8:1 MUX', code: 'DIP-20', partNumber: '74151', category: 'msi_functional', keywords: ['74151', '8 to 1 mux', 'multiplexer', 'dip-20'] },
  { type: 'ic_74153', name: '74153 Dual 4:1 MUX', code: 'DIP-20', partNumber: '74153', category: 'msi_functional', keywords: ['74153', 'dual 4 to 1 mux', 'multiplexer', 'dip-20'] },
  { type: 'ic_74138', name: '74138 3:8 DEMUX', code: 'DIP-20', partNumber: '74138', category: 'msi_functional', keywords: ['74138', '3 to 8 demux', 'demultiplexer', 'decoder', 'dip-20'] },
  { type: 'ic_74139', name: '74139 Dual 2:4 DEC', code: 'DIP-20', partNumber: '74139', category: 'msi_functional', keywords: ['74139', 'dual 2 to 4 decoder', 'dip-20'] },
  { type: 'ic_7447', name: '7447 BCD-to-7Seg', code: 'DIP-20', partNumber: '7447', category: 'msi_functional', keywords: ['7447', 'bcd to 7 segment', 'decoder', 'display driver', 'dip-20'] },

  // --- 4. ARITHMETIC ---
  { type: 'half_adder', name: 'Half Adder', code: 'HA', category: 'arithmetic', keywords: ['adder', 'half adder', 'ha', 'sum', 'carry', 'math'] },
  { type: 'full_adder', name: 'Full Adder', code: 'FA', partNumber: '7483', category: 'arithmetic', keywords: ['adder', 'full adder', 'fa', 'sum', 'carry in', '7483'] },
  { type: 'comparator_4bit', name: '4-Bit Comp', code: 'COMP', partNumber: '7485', category: 'arithmetic', keywords: ['comparator', 'magnitude comparator', 'compare', '4-bit', '7485'] },
  { type: 'ic_7483', name: '7483 4-Bit Adder', code: 'DIP-20', partNumber: '7483', category: 'arithmetic', keywords: ['7483', '4-bit full adder', 'arithmetic', 'dip-20'] },
  { type: 'ic_7485', name: '7485 4-Bit Comparator', code: 'DIP-20', partNumber: '7485', category: 'arithmetic', keywords: ['7485', '4-bit magnitude comparator', 'dip-20'] },

  // --- 5. MEMORY ---
  { type: 'sr_latch', name: 'SR Latch', code: 'LATCH', category: 'memory', keywords: ['latch', 'sr latch', 'memory', 'bistable', 'storage'] },
  { type: 'd_latch', name: 'D Latch', code: 'D-LATCH', category: 'memory', keywords: ['latch', 'd latch', 'transparent latch', 'memory', 'register'] },
  { type: 'shift_reg_4bit', name: '4-Bit Shift Reg', code: 'SHIFT', partNumber: '74194', category: 'memory', keywords: ['shift register', 'serial parallel', 'register', 'memory', '74194'] },
  { type: 'ic_74194', name: '74194 Bi-Shift Reg', code: 'DIP-20', partNumber: '74194', category: 'memory', keywords: ['74194', 'bidirectional shift register', 'universal register', 'dip-20'] },

  // --- 6. I/O & CONTROLS ---
  { type: 'input_pin', name: 'Input Pin (0/1)', code: 'IN-PIN', category: 'io', keywords: ['input', 'pin', 'in-pin', 'terminal', 'port'] },
  { type: 'output_pin', name: 'Output Pin (Probe)', code: 'OUT-PIN', category: 'io', keywords: ['output', 'pin', 'out-pin', 'probe', 'terminal', 'port'] },
  { type: 'toggle', name: 'Toggle Switch', code: 'SPST', category: 'io', keywords: ['switch', 'toggle', 'spst', 'input', 'logic level'] },
  { type: 'push_button', name: 'Push Button', code: 'PULSE', category: 'io', keywords: ['button', 'push button', 'pulse', 'momentary'] },
  { type: 'clock', name: 'Clock Gen', code: 'CLK', category: 'io', keywords: ['clock', 'clk', 'oscillator', 'pulse generator', 'frequency'] },
  { type: 'vcc', name: 'VCC (+5V)', code: 'HIGH', category: 'io', keywords: ['vcc', 'power', '+5v', 'high', 'logic 1'] },
  { type: 'gnd', name: 'GND (0V)', code: 'LOW', category: 'io', keywords: ['gnd', 'ground', '0v', 'low', 'logic 0'] },
  { type: 'probe', name: 'Logic Probe', code: 'VMET', category: 'io', keywords: ['probe', 'voltmeter', 'logic probe', 'measure', 'test'] },
  { type: 'junction', name: 'Junction Tap', code: 'NODE', category: 'io', keywords: ['junction', 'node', 'tap', 'branch', 'connection'] },
  { type: 'led', name: 'LED Indicator', code: 'DIODE', category: 'io', keywords: ['led', 'indicator', 'diode', 'light'] },
  { type: 'rgb_led', name: 'RGB Multi-LED', code: 'RGB', category: 'io', keywords: ['rgb', 'rgb led', 'color led'] },
  { type: 'led_bar_4', name: '4-Bit LED Bar', code: 'LED-BAR', category: 'io', keywords: ['led bar', 'bar graph', '4-bit display'] },
  { type: 'seven_segment', name: '7-Segment', code: 'LTS-547', category: 'io', keywords: ['7-segment', 'seven segment', 'display', 'digit'] },
  { type: 'hex_display', name: 'Hex Display', code: 'HEX-DEC', category: 'io', keywords: ['hex display', 'hexadecimal', 'digit'] },
  { type: 'buzzer', name: 'Audio Buzzer', code: 'PIEZO', category: 'io', keywords: ['buzzer', 'audio', 'piezo', 'sound', 'beeper'] },

  // --- 7. TRAINER HARDWARE (All standard 74-Series DIP ICs) ---
  { type: 'ic_7408', name: '7408 Quad AND', code: 'DIP-20', partNumber: '7408', category: 'trainer_hardware', keywords: ['7408', 'and', 'quad and', 'dip-20'] },
  { type: 'ic_7432', name: '7432 Quad OR', code: 'DIP-20', partNumber: '7432', category: 'trainer_hardware', keywords: ['7432', 'or', 'quad or', 'dip-20'] },
  { type: 'ic_7404', name: '7404 Hex NOT', code: 'DIP-20', partNumber: '7404', category: 'trainer_hardware', keywords: ['7404', 'not', 'hex inverter', 'inverter', 'dip-20'] },
  { type: 'ic_7400', name: '7400 Quad NAND', code: 'DIP-20', partNumber: '7400', category: 'trainer_hardware', keywords: ['7400', 'nand', 'quad nand', 'dip-20'] },
  { type: 'ic_7402', name: '7402 Quad NOR', code: 'DIP-20', partNumber: '7402', category: 'trainer_hardware', keywords: ['7402', 'nor', 'quad nor', 'dip-20'] },
  { type: 'ic_7486', name: '7486 Quad XOR', code: 'DIP-20', partNumber: '7486', category: 'trainer_hardware', keywords: ['7486', 'xor', 'quad xor', 'dip-20'] },
];

export const CATEGORY_DEFINITIONS: { id: MasterCategoryId | 'all'; title: string; badge?: string }[] = [
  { id: 'all', title: 'All Items' },
  { id: 'basic_gates', title: 'Basic Gates', badge: 'Gates' },
  { id: 'sequential', title: 'Sequential', badge: 'Flip-Flops' },
  { id: 'msi_functional', title: 'MSI / Functional', badge: 'MUX/DEC' },
  { id: 'arithmetic', title: 'Arithmetic', badge: 'Add/Comp' },
  { id: 'memory', title: 'Memory', badge: 'Storage' },
  { id: 'io', title: 'I/O & Controls', badge: 'Pins/LEDs' },
  { id: 'trainer_hardware', title: 'Trainer Hardware', badge: '74xx' },
  { id: 'custom', title: 'Custom ICs', badge: 'Custom' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = false,
  onClose,
  onAddComponent,
  customICs = [],
  onOpenCreateIC,
  onAddCustomIC,
  onDeleteCustomIC,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MasterCategoryId | 'all'>('all');

  // Filtered standard items based on query and active category
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MASTER_TOOLBOX_ITEMS.filter((item) => {
      // Category filter check
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;

      // Search matches name, code, partNumber, or keywords
      const matchName = item.name.toLowerCase().includes(q);
      const matchCode = item.code?.toLowerCase().includes(q) || false;
      const matchPart = item.partNumber?.toLowerCase().includes(q) || false;
      const matchKeywords = item.keywords.some((kw) => kw.toLowerCase().includes(q));

      return matchName || matchCode || matchPart || matchKeywords;
    });
  }, [search, selectedCategory]);

  // Filtered custom IC items
  const filteredCustomICs = useMemo(() => {
    if (selectedCategory !== 'all' && selectedCategory !== 'custom') {
      return [];
    }
    const q = search.trim().toLowerCase();
    return customICs.filter((ic) => {
      if (!q) return true;
      return (
        ic.name.toLowerCase().includes(q) ||
        ic.code.toLowerCase().includes(q) ||
        (ic.partNumber && ic.partNumber.toLowerCase().includes(q))
      );
    });
  }, [search, selectedCategory, customICs]);

  if (!isOpen) return null;

  const handleSelectComponent = (type: ComponentType) => {
    onAddComponent(type);
  };

  const handleSelectCustomIC = (ic: CustomICDefinition) => {
    onAddCustomIC?.(ic);
  };

  const showCustomSection = selectedCategory === 'all' || selectedCategory === 'custom';

  return (
    <aside className="component-toolbox drawer-mode" aria-label="Component Library">
      {/* Toolbox Header */}
      <div className="toolbox-header">
        <div className="toolbox-header-top">
          <span className="toolbox-header-title">COMPONENT LIBRARY</span>
          {onClose && (
            <button
              type="button"
              className="toolbox-close-btn"
              onClick={onClose}
              title="Close Component Library"
              aria-label="Close Component Library"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Input Box */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            className="toolbox-search"
            placeholder="Search 74xx, AND, MUX, D-FF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            aria-label="Search components"
          />
          <div
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
              display: 'flex',
            }}
          >
            <IconSearch size={14} />
          </div>
        </div>

        {/* Category Filter Chips / Pills */}
        <div
          className="toolbox-category-pills"
          style={{
            display: 'flex',
            gap: '4px',
            overflowX: 'auto',
            paddingTop: '6px',
            paddingBottom: '2px',
            scrollbarWidth: 'none',
          }}
          role="tablist"
          aria-label="Component Categories"
        >
          {CATEGORY_DEFINITIONS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`cat-pill-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: selectedCategory === cat.id ? 'var(--accent-copper)' : 'var(--border-subtle)',
                backgroundColor: selectedCategory === cat.id ? 'var(--accent-copper-subtle)' : 'transparent',
                color: selectedCategory === cat.id ? 'var(--accent-copper)' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s ease',
              }}
              role="tab"
              aria-selected={selectedCategory === cat.id}
            >
              {cat.title}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbox Body */}
      <div className="toolbox-body">
        {/* Create Custom IC Action Banner */}
        {onOpenCreateIC && (
          <div className="create-ic-banner">
            <button className="create-ic-btn" onClick={onOpenCreateIC} title="Create and package custom IC">
              <IconCustomIC size={14} style={{ marginRight: 6 }} />
              <span>Create Custom IC</span>
            </button>
          </div>
        )}

        {/* Custom ICs Section */}
        {showCustomSection && (
          <div className="toolbox-category">
            <div className="toolbox-category-title">
              <span>Custom ICs</span>
              <span className="cat-badge">{customICs.length} ICs</span>
            </div>

            {filteredCustomICs.length === 0 ? (
              <div className="empty-custom-ics-hint">
                {search ? 'No matching custom ICs.' : 'No custom ICs saved yet.'}{' '}
                {onOpenCreateIC && (
                  <button className="text-link-btn" onClick={onOpenCreateIC}>
                    Create one now
                  </button>
                )}
              </div>
            ) : (
              <div className="toolbox-grid">
                {filteredCustomICs.map((ic) => (
                  <div
                    key={ic.id}
                    className="component-card custom-ic-card"
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/circuitflow-custom-ic', JSON.stringify(ic));
                      e.dataTransfer.setData('text/plain', `custom_ic:${ic.id}`);
                    }}
                    onClick={() => handleSelectCustomIC(ic)}
                    title={`Click or Drag to place ${ic.partNumber || ic.code} on canvas`}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="card-icon-svg">
                      <GateSymbol type="custom_ic" width={42} height={24} />
                    </div>
                    <span className="card-label">{ic.partNumber || ic.code}</span>
                    <span className="card-code">{ic.pinCount}-PIN</span>
                    {onDeleteCustomIC && (
                      <button
                        className="card-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete custom IC "${ic.name}"?`)) {
                            onDeleteCustomIC(ic.id);
                          }
                        }}
                        title="Delete this IC"
                        aria-label={`Delete custom IC ${ic.name}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Standard Categorized Items */}
        {CATEGORY_DEFINITIONS.filter((c) => c.id !== 'all' && c.id !== 'custom').map((cat) => {
          if (selectedCategory !== 'all' && selectedCategory !== cat.id) {
            return null;
          }
          const itemsInCat = filteredItems.filter((i) => i.category === cat.id);
          if (itemsInCat.length === 0) return null;

          return (
            <div key={cat.id} className="toolbox-category">
              <div className="toolbox-category-title">
                <span>{cat.title}</span>
                {cat.badge && <span className="cat-badge">{cat.badge}</span>}
              </div>
              <div className="toolbox-grid">
                {itemsInCat.map((item) => (
                  <div
                    key={item.type}
                    className="component-card"
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/circuitflow-component', item.type);
                      e.dataTransfer.setData('text/plain', item.type);
                    }}
                    onClick={() => handleSelectComponent(item.type)}
                    title={`Click or Drag to place ${item.name} on canvas`}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="card-icon-svg">
                      <GateSymbol type={item.type} width={42} height={24} />
                    </div>
                    <span className="card-label">{item.name}</span>
                    {item.code && <span className="card-code">{item.code}</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && filteredCustomICs.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No components match "{search}".
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
