import React, { useState } from 'react';
import type { ComponentType, CustomICDefinition } from '../types/circuit';
import { GateSymbol } from './GateSymbols';

interface ICPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseIndex: number;
  currentICLabel?: string | null;
  customICs?: CustomICDefinition[];
  onSelectIC: (baseIndex: number, type: ComponentType, customICDef?: CustomICDefinition) => void;
  onRemoveIC?: (baseIndex: number) => void;
}

interface ICItem {
  type: ComponentType;
  part: string;
  name: string;
  desc: string;
  category: 'gates' | 'combinational' | 'sequential';
  pinsSummary: string;
}

const AVAILABLE_ICS: ICItem[] = [
  // Basic Gates
  {
    type: 'ic_7408',
    part: '74LS08',
    name: 'Quad 2-Input AND',
    desc: '4 independent 2-input positive-AND gates',
    category: 'gates',
    pinsSummary: '4x AND Gates (1A, 1B, 1Y...) + VCC/GND',
  },
  {
    type: 'ic_7432',
    part: '74LS32',
    name: 'Quad 2-Input OR',
    desc: '4 independent 2-input positive-OR gates',
    category: 'gates',
    pinsSummary: '4x OR Gates (1A, 1B, 1Y...) + VCC/GND',
  },
  {
    type: 'ic_7404',
    part: '74LS04',
    name: 'Hex Inverter NOT',
    desc: '6 independent inverter logic circuits',
    category: 'gates',
    pinsSummary: '6x Inverters (1A, 1Y...) + VCC/GND',
  },
  {
    type: 'ic_7400',
    part: '74LS00',
    name: 'Quad 2-Input NAND',
    desc: '4 independent 2-input NAND gates',
    category: 'gates',
    pinsSummary: '4x NAND Gates (1A, 1B, 1Y...) + VCC/GND',
  },
  {
    type: 'ic_7402',
    part: '74LS02',
    name: 'Quad 2-Input NOR',
    desc: '4 independent 2-input NOR gates',
    category: 'gates',
    pinsSummary: '4x NOR Gates (1Y, 1A, 1B...) + VCC/GND',
  },
  {
    type: 'ic_7486',
    part: '74LS86',
    name: 'Quad 2-Input XOR',
    desc: '4 independent 2-input exclusive-OR gates',
    category: 'gates',
    pinsSummary: '4x XOR Gates (1A, 1B, 1Y...) + VCC/GND',
  },

  // Combinational
  {
    type: 'ic_74151',
    part: '74LS151',
    name: '8-to-1 Multiplexer',
    desc: '8-line to 1-line data selector with true & inverted outputs',
    category: 'combinational',
    pinsSummary: '8 Inputs (D0-D7), 3 Select (S0-S2), Y/W Outputs',
  },
  {
    type: 'ic_74153',
    part: '74LS153',
    name: 'Dual 4-to-1 Multiplexer',
    desc: 'Dual 4-line to 1-line data selector / multiplexer with common selects',
    category: 'combinational',
    pinsSummary: '2x 4:1 MUX (1C0-3, 2C0-3), Select (A,B), Strobes (1G,2G)',
  },
  {
    type: 'ic_74138',
    part: '74LS138',
    name: '3-to-8 Demultiplexer',
    desc: '3-to-8 line decoder with 3 enable inputs',
    category: 'combinational',
    pinsSummary: '3 Inputs (A,B,C), 8 Outputs (Y0-Y7), 3 Enables',
  },
  {
    type: 'ic_74139',
    part: '74LS139',
    name: 'Dual 2-to-4 Line Decoder',
    desc: 'Dual 2-to-4 line decoder/demultiplexer with individual enables',
    category: 'combinational',
    pinsSummary: '2x 2:4 Decoders (1A,1B / 2A,2B), Enables (1G,2G)',
  },
  {
    type: 'ic_7483',
    part: '74LS83',
    name: '4-Bit Binary Adder',
    desc: '4-bit binary full adder with fast internal lookahead carry',
    category: 'combinational',
    pinsSummary: 'A1-A4, B1-B4, C0 Carry-in, S1-S4, C4 Carry-out',
  },
  {
    type: 'ic_7485',
    part: '74LS85',
    name: '4-Bit Magnitude Comparator',
    desc: '4-bit magnitude comparator with cascading expansion inputs',
    category: 'combinational',
    pinsSummary: 'A0-A3, B0-B3, Cascades (A>B, A=B, A<B), Outputs',
  },
  {
    type: 'ic_7447',
    part: '74LS47',
    name: 'BCD to 7-Segment Decoder',
    desc: 'BCD-to-7-segment decoder/driver with active-low outputs',
    category: 'combinational',
    pinsSummary: 'BCD Inputs (A-D), Lamp Test (LT), Ripple Blanking (RBI), a-g Outs',
  },

  // Sequential & Timing
  {
    type: 'ic_7490',
    part: '74LS90',
    name: 'Decade / BCD Counter',
    desc: '4-bit ripple-through decade counter with reset controls',
    category: 'sequential',
    pinsSummary: 'CKA, CKB, R0(1,2), R9(1,2), Outputs QA-QD',
  },
  {
    type: 'ic_7493',
    part: '74LS93',
    name: '4-Bit Binary Ripple Counter',
    desc: '4-bit binary counter composed of mod-2 and mod-8 counters',
    category: 'sequential',
    pinsSummary: 'CKA, CKB, Reset Inputs R0(1), R0(2), Outputs QA-QD',
  },
  {
    type: 'ic_7474',
    part: '74LS74',
    name: 'Dual D Flip-Flop',
    desc: 'Dual D-type positive-edge triggered flip-flops with PRE & CLR',
    category: 'sequential',
    pinsSummary: 'Dual D-FF: CLK, D, PRE, CLR, Q, Q_bar',
  },
  {
    type: 'ic_7476',
    part: '74LS76',
    name: 'Dual JK Flip-Flop',
    desc: 'Dual JK flip-flops with individual clock, PRE, and CLR',
    category: 'sequential',
    pinsSummary: 'Dual JK-FF: CLK, J, K, PRE, CLR, Q, Q_bar',
  },
  {
    type: 'ic_74194',
    part: '74LS194',
    name: '4-Bit Bidirectional Shift Reg',
    desc: '4-bit universal bidirectional shift register with parallel load',
    category: 'sequential',
    pinsSummary: 'CLK, Mode (S0, S1), Serial (SR, SL), Parallel D0-D3, Q0-Q3',
  },
  {
    type: 'ic_555',
    part: 'NE555',
    name: 'Precision Timer IC',
    desc: 'Industry standard timer for monostable pulse and astable clock generation',
    category: 'sequential',
    pinsSummary: 'TRIG, THRES, OUT, RESET, DISCH, VCC, GND',
  },
];

export const ICPickerModal: React.FC<ICPickerModalProps> = ({
  isOpen,
  onClose,
  baseIndex,
  currentICLabel,
  customICs = [],
  onSelectIC,
  onRemoveIC,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'gates' | 'combinational' | 'sequential' | 'custom'>('all');

  if (!isOpen) return null;

  const filteredStandard = AVAILABLE_ICS.filter((ic) => {
    const matchesTab = activeTab === 'all' || ic.category === activeTab;
    const matchesSearch =
      ic.part.toLowerCase().includes(search.toLowerCase()) ||
      ic.name.toLowerCase().includes(search.toLowerCase()) ||
      ic.desc.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const filteredCustom = customICs.filter((ic) => {
    const matchesTab = activeTab === 'all' || activeTab === 'custom';
    const matchesSearch =
      (ic.partNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      ic.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ic-picker-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">🎛️</span>
            <div>
              <h2 className="modal-title">Mount IC to Base {baseIndex + 1}</h2>
              <p className="modal-subtitle">
                {currentICLabel
                  ? `Currently mounted: ${currentICLabel} (Click any IC below to swap)`
                  : 'Select a standard 20-pin horizontal DIP IC to insert into this socket'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Current IC Action Bar (if an IC is already mounted) */}
        {currentICLabel && (
          <div className="current-ic-banner">
            <div className="current-ic-info">
              <span className="current-ic-badge">MOUNTED</span>
              <span className="current-ic-name">{currentICLabel}</span>
            </div>
            {onRemoveIC && (
              <button
                className="btn-danger-sm"
                onClick={() => {
                  onRemoveIC(baseIndex);
                  onClose();
                }}
              >
                ✕ Remove IC from Base
              </button>
            )}
          </div>
        )}

        {/* Search & Tabs */}
        <div className="ic-picker-controls">
          <input
            type="text"
            className="ic-picker-search"
            placeholder="Search ICs by part number (e.g. 7408, 7432), name, or logic function..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          <div className="ic-picker-tabs">
            <button
              className={`ic-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All ICs (20-Pin)
            </button>
            <button
              className={`ic-tab-btn ${activeTab === 'gates' ? 'active' : ''}`}
              onClick={() => setActiveTab('gates')}
            >
              Logic Gates
            </button>
            <button
              className={`ic-tab-btn ${activeTab === 'combinational' ? 'active' : ''}`}
              onClick={() => setActiveTab('combinational')}
            >
              Combinational
            </button>
            <button
              className={`ic-tab-btn ${activeTab === 'sequential' ? 'active' : ''}`}
              onClick={() => setActiveTab('sequential')}
            >
              Sequential
            </button>
            {customICs.length > 0 && (
              <button
                className={`ic-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
                onClick={() => setActiveTab('custom')}
              >
                My ICs ({customICs.length})
              </button>
            )}
          </div>
        </div>

        {/* IC Grid */}
        <div className="ic-picker-grid">
          {/* Standard 74-Series 20-Pin ICs */}
          {activeTab !== 'custom' &&
            filteredStandard.map((ic) => (
              <div
                key={ic.type}
                className="ic-card-select"
                onClick={() => {
                  onSelectIC(baseIndex, ic.type);
                  onClose();
                }}
              >
                <div className="ic-card-header">
                  <span className="ic-part-pill">{ic.part}</span>
                  <span className="ic-package-tag">DIP-20</span>
                </div>

                {/* Logic Symbol Graphic Preview */}
                <div className="ic-card-symbol-wrap">
                  <GateSymbol type={ic.type} width={68} height={36} />
                </div>

                <div className="ic-card-title">{ic.name}</div>
                <div className="ic-card-desc">{ic.desc}</div>
                <div className="ic-card-pin-info">{ic.pinsSummary}</div>

                <div className="ic-card-footer">
                  <span className="ic-action-hint">Click to Mount ➔</span>
                </div>
              </div>
            ))}

          {/* User Custom ICs */}
          {(activeTab === 'all' || activeTab === 'custom') &&
            filteredCustom.map((cic) => (
              <div
                key={cic.id}
                className="ic-card-select custom"
                onClick={() => {
                  onSelectIC(baseIndex, 'custom_ic', cic);
                  onClose();
                }}
              >
                <div className="ic-card-header">
                  <span className="ic-part-pill custom">{cic.partNumber || 'CUSTOM'}</span>
                  <span className="ic-package-tag">DIP-20</span>
                </div>

                <div className="ic-card-symbol-wrap">
                  <GateSymbol type="custom_ic" width={68} height={36} />
                </div>

                <div className="ic-card-title">{cic.name}</div>
                <div className="ic-card-desc">{cic.description || 'Custom packaged 20-pin subcircuit'}</div>
                <div className="ic-card-pin-info">{cic.pins ? `${cic.pins.length} configured pins` : '20 DIP pins'}</div>

                <div className="ic-card-footer">
                  <span className="ic-action-hint">Click to Mount ➔</span>
                </div>
              </div>
            ))}

          {filteredStandard.length === 0 && filteredCustom.length === 0 && (
            <div className="ic-empty-state">No integrated circuits found matching "{search}"</div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ICPickerModal;

