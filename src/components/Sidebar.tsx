import React, { useState } from 'react';
import type { ComponentCategory, ComponentType, CustomICDefinition } from '../types/circuit';
import { GateSymbol } from './GateSymbols';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAddComponent: (type: ComponentType) => void;
  customICs?: CustomICDefinition[];
  onOpenCreateIC?: () => void;
  onAddCustomIC?: (ic: CustomICDefinition) => void;
  onDeleteCustomIC?: (id: string) => void;
}

interface ToolboxItem {
  type: ComponentType;
  name: string;
  code?: string;
  category: ComponentCategory;
}

const TOOLBOX_ITEMS: ToolboxItem[] = [
  // 74-Series DIP ICs
  { type: 'ic_7408', name: '7408 Quad AND', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_7432', name: '7432 Quad OR', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_7404', name: '7404 Hex NOT', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_7400', name: '7400 Quad NAND', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_7402', name: '7402 Quad NOR', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_7486', name: '7486 Quad XOR', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_74151', name: '74151 8:1 MUX', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_74153', name: '74153 Dual 4:1 MUX', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_74138', name: '74138 3:8 DEMUX', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_74139', name: '74139 Dual 2:4 DEC', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_7490', name: '7490 BCD Counter', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_7493', name: '7493 4-Bit Counter', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_7483', name: '7483 4-Bit Adder', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_7485', name: '7485 4-Bit Comparator', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_7474', name: '7474 Dual D-FF', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_7476', name: '7476 Dual JK-FF', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_74194', name: '74194 Bi-Shift Reg', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_7447', name: '7447 BCD-to-7Seg', code: 'DIP-20', category: 'dip_ics' },
  { type: 'ic_555', name: 'NE555 Timer IC', code: 'DIP-8', category: 'dip_ics' },

  // Inputs, Logic Probes & Wiring
  { type: 'input_pin', name: 'Input Pin (0/1)', code: 'IN-PIN', category: 'io' },
  { type: 'output_pin', name: 'Output Pin (Probe)', code: 'OUT-PIN', category: 'io' },
  { type: 'toggle', name: 'Toggle Switch', code: 'SPST', category: 'io' },
  { type: 'push_button', name: 'Push Button', code: 'PULSE', category: 'io' },
  { type: 'clock', name: 'Clock Gen', code: 'CLK', category: 'io' },
  { type: 'vcc', name: 'VCC (+5V)', code: 'HIGH', category: 'io' },
  { type: 'gnd', name: 'GND (0V)', code: 'LOW', category: 'io' },
  { type: 'probe', name: 'Logic Probe', code: 'VMET', category: 'io' },
  { type: 'junction', name: 'Junction Tap', code: 'NODE', category: 'io' },

  // Logic Gates (2-Input & 3-Input)
  { type: 'not', name: 'NOT Inverter', code: 'INV', category: 'gates' },
  { type: 'buffer', name: 'Buffer', code: 'BUF', category: 'gates' },
  { type: 'and', name: '2-In AND Gate', code: 'AND-2', category: 'gates' },
  { type: 'and_3', name: '3-In AND Gate', code: 'AND-3', category: 'gates' },
  { type: 'or', name: '2-In OR Gate', code: 'OR-2', category: 'gates' },
  { type: 'or_3', name: '3-In OR Gate', code: 'OR-3', category: 'gates' },
  { type: 'nand', name: '2-In NAND Gate', code: 'NAND-2', category: 'gates' },
  { type: 'nand_3', name: '3-In NAND Gate', code: 'NAND-3', category: 'gates' },
  { type: 'nor', name: '2-In NOR Gate', code: 'NOR-2', category: 'gates' },
  { type: 'nor_3', name: '3-In NOR Gate', code: 'NOR-3', category: 'gates' },
  { type: 'xor', name: 'XOR Gate', code: 'XOR', category: 'gates' },
  { type: 'xnor', name: 'XNOR Gate', code: 'XNOR', category: 'gates' },
  { type: 'tri_state', name: 'Tri-State Buf', code: '3-STATE', category: 'gates' },

  // Combinational MSI
  { type: 'half_adder', name: 'Half Adder', code: 'HA', category: 'combinational' },
  { type: 'full_adder', name: 'Full Adder', code: 'FA', category: 'combinational' },
  { type: 'mux_2to1', name: '2:1 MUX', code: 'MUX2', category: 'combinational' },
  { type: 'mux_4to1', name: '4:1 MUX', code: 'MUX4', category: 'combinational' },
  { type: 'demux_1to2', name: '1:2 DEMUX', code: 'DMUX2', category: 'combinational' },
  { type: 'demux_1to4', name: '1:4 DEMUX', code: 'DMUX4', category: 'combinational' },
  { type: 'decoder_2to4', name: '2:4 Decoder', code: 'DEC', category: 'combinational' },
  { type: 'comparator_4bit', name: '4-Bit Comp', code: 'COMP', category: 'combinational' },
  { type: 'priority_encoder_4to2', name: '4:2 Priority Encoder', code: 'PRI-ENC', category: 'combinational' },
  { type: 'parity_gen', name: 'Parity Generator', code: 'PARITY', category: 'combinational' },

  // Sequential
  { type: 'sr_latch', name: 'SR Latch', code: 'LATCH', category: 'sequential' },
  { type: 'd_latch', name: 'D Latch', code: 'D-LATCH', category: 'sequential' },
  { type: 'd_flipflop', name: 'D Flip-Flop', code: 'D-FF', category: 'sequential' },
  { type: 'jk_flipflop', name: 'JK Flip-Flop', code: 'JK-FF', category: 'sequential' },
  { type: 't_flipflop', name: 'T Flip-Flop', code: 'T-FF', category: 'sequential' },
  { type: 'counter_4bit', name: '4-Bit Counter', code: 'COUNT', category: 'sequential' },
  { type: 'shift_reg_4bit', name: '4-Bit Shift Reg', code: 'SHIFT', category: 'sequential' },

  // Displays & Indicators
  { type: 'led', name: 'LED Indicator', code: 'DIODE', category: 'display' },
  { type: 'rgb_led', name: 'RGB Multi-LED', code: 'RGB', category: 'display' },
  { type: 'led_bar_4', name: '4-Bit LED Bar', code: 'LED-BAR', category: 'display' },
  { type: 'seven_segment', name: '7-Segment', code: 'LTS-547', category: 'display' },
  { type: 'hex_display', name: 'Hex Display', code: 'HEX-DEC', category: 'display' },
  { type: 'buzzer', name: 'Audio Buzzer', code: 'PIEZO', category: 'display' },
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

  if (!isOpen) return null;

  const handleSelectComponent = (type: ComponentType) => {
    onAddComponent(type);
    onClose?.(); // Auto-minimize drawer when an IC or gate is added!
  };

  const handleSelectCustomIC = (ic: CustomICDefinition) => {
    onAddCustomIC?.(ic);
    onClose?.(); // Auto-minimize drawer when custom IC is added!
  };

  const filteredItems = TOOLBOX_ITEMS.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustomICs = customICs.filter(
    (ic) =>
      ic.name.toLowerCase().includes(search.toLowerCase()) ||
      ic.code.toLowerCase().includes(search.toLowerCase()) ||
      (ic.partNumber && ic.partNumber.toLowerCase().includes(search.toLowerCase()))
  );

  const categories: { id: ComponentCategory; title: string; badge?: string }[] = [
    { id: 'dip_ics', title: '74-Series DIP-20 ICs', badge: '20-Pin' },
    { id: 'gates', title: 'Logic Gates', badge: 'Basic' },
    { id: 'my_ics', title: 'My Custom ICs', badge: `${customICs.length} ICs` },
    { id: 'io', title: 'Inputs & Controls' },
    { id: 'combinational', title: 'Combinational MSI' },
    { id: 'sequential', title: 'Sequential ICs' },
    { id: 'display', title: 'Output & Displays' },
  ];

  return (
    <aside className="component-toolbox drawer-mode">
      <div className="toolbox-header">
        <div className="toolbox-header-top">
          <span className="toolbox-header-title">COMPONENT LIBRARY</span>
          {onClose && (
            <button
              type="button"
              className="toolbox-close-btn"
              onClick={onClose}
              title="Close Component Library"
            >
              ✕
            </button>
          )}
        </div>
        <input
          type="text"
          className="toolbox-search"
          placeholder="🔍 Search 74xx, gates, ICs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className="toolbox-body">
        {/* Create IC Action Banner */}
        {onOpenCreateIC && (
          <div className="create-ic-banner">
            <button className="create-ic-btn" onClick={onOpenCreateIC} title="Create and package custom IC">
              <span>✨</span>
              <span>Create Custom IC</span>
            </button>
          </div>
        )}

        {categories.map((cat) => {
          // Special rendering for 'my_ics' category
          if (cat.id === 'my_ics') {
            return (
              <div key={cat.id} className="toolbox-category">
                <div className="toolbox-category-title">
                  <span>{cat.title}</span>
                  {cat.badge && <span className="cat-badge">{cat.badge}</span>}
                </div>

                {filteredCustomICs.length === 0 ? (
                  <div className="empty-custom-ics-hint">
                    No custom ICs saved yet.{' '}
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
                        onClick={() => handleSelectCustomIC(ic)}
                        title={`Place ${ic.partNumber || ic.code} on canvas`}
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
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const items = filteredItems.filter((i) => i.category === cat.id);
          if (items.length === 0) return null;

          return (
            <div key={cat.id} className="toolbox-category">
              <div className="toolbox-category-title">
                <span>{cat.title}</span>
                {cat.badge && <span className="cat-badge">{cat.badge}</span>}
              </div>
              <div className="toolbox-grid">
                {items.map((item) => (
                  <div
                    key={item.type}
                    className="component-card"
                    onClick={() => handleSelectComponent(item.type)}
                    title={`Click to place ${item.name} on canvas`}
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
      </div>
    </aside>
  );
};
