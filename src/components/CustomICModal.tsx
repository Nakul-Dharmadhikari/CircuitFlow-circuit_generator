import React, { useState, useMemo, useRef } from 'react';
import type { Circuit, CustomICDefinition, CustomICPinMapping } from '../types/circuit';
import { saveUserCustomIC } from '../services/customIcStorage';
import { soundFx } from '../audio/soundEffects';

interface CustomICModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCircuit: Circuit;
  userId?: string;
  onSaveIC: (savedIC: CustomICDefinition, placeOnCanvas?: boolean) => void;
}

export const CustomICModal: React.FC<CustomICModalProps> = ({
  isOpen,
  onClose,
  activeCircuit,
  userId = 'guest',
  onSaveIC,
}) => {
  const [partNumber, setPartNumber] = useState('74MY01');
  const [icName, setIcName] = useState('Custom Logic IC');
  const [description, setDescription] = useState('Custom subcircuit packaged into DIP IC');
  const [pinCount, setPinCount] = useState<14 | 16 | 20>(20);
  const [sourceMode, setSourceMode] = useState<'canvas' | 'custom'>('canvas');
  const [filterType, setFilterType] = useState<'all' | 'input' | 'output' | 'power' | 'nc'>('all');
  const [searchPin, setSearchPin] = useState('');
  const [selectedPinNum, setSelectedPinNum] = useState<number | null>(null);

  const tableWrapperRef = useRef<HTMLDivElement>(null);

  // Detect canvas I/O components
  const detectedInputs = useMemo(() => {
    return activeCircuit.components.filter(
      (c) =>
        !c.isTrainerFixed &&
        ['toggle', 'push_button', 'clock', 'input_pin'].includes(c.type)
    );
  }, [activeCircuit]);

  const detectedOutputs = useMemo(() => {
    return activeCircuit.components.filter(
      (c) =>
        !c.isTrainerFixed &&
        ['probe', 'led', 'buzzer', 'seven_segment', 'hex_display', 'output_pin'].includes(c.type)
    );
  }, [activeCircuit]);

  // Dynamic pin mappings initialization based on pinCount
  const [customPins, setCustomPins] = useState<CustomICPinMapping[]>(() => {
    return generateDefaultPins(20, detectedInputs, detectedOutputs);
  });

  function generateDefaultPins(
    count: 14 | 16 | 20,
    inputs: typeof detectedInputs,
    outputs: typeof detectedOutputs
  ): CustomICPinMapping[] {
    const list: CustomICPinMapping[] = [];
    let inIdx = 0;
    let outIdx = 0;
    const gndPin = Math.floor(count / 2);
    const vccPin = count;

    for (let p = 1; p <= count; p++) {
      // VCC & GND assignments
      if (p === vccPin) {
        list.push({
          pin: p,
          pinNumber: p,
          name: 'VCC',
          type: 'power',
          inverted: false,
        });
      } else if (p === gndPin) {
        list.push({
          pin: p,
          pinNumber: p,
          name: 'GND',
          type: 'power',
          inverted: false,
        });
      } else if (inIdx < inputs.length && p < gndPin) {
        const comp = inputs[inIdx++];
        list.push({
          pin: p,
          pinNumber: p,
          name: comp.label || `IN${inIdx}`,
          type: 'input',
          internalComponentId: comp.id,
          internalCompId: comp.id,
          inverted: false,
        });
      } else if (outIdx < outputs.length) {
        const comp = outputs[outIdx++];
        list.push({
          pin: p,
          pinNumber: p,
          name: comp.label || `OUT${outIdx}`,
          type: 'output',
          internalComponentId: comp.id,
          internalCompId: comp.id,
          inverted: false,
        });
      } else if (count === 20 && p > 14 && p < 20) {
        // 20-pin socket standard with 14 active pins pattern!
        list.push({
          pin: p,
          pinNumber: p,
          name: `NC`,
          type: 'nc',
          inverted: false,
        });
      } else {
        list.push({
          pin: p,
          pinNumber: p,
          name: p % 2 === 0 ? `Y${p}` : `A${p}`,
          type: p % 2 === 0 ? 'output' : 'input',
          inverted: false,
        });
      }
    }
    return list;
  }

  // Handle pin count change
  const handlePinCountChange = (newCount: 14 | 16 | 20) => {
    setPinCount(newCount);
    setCustomPins(generateDefaultPins(newCount, detectedInputs, detectedOutputs));
    setSelectedPinNum(null);
    soundFx.playButtonTap();
  };

  const handlePinChange = (index: number, updates: Partial<CustomICPinMapping>) => {
    setCustomPins((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // Focus & highlight pin row when clicked on visual package
  const handleSelectPinOnVisualizer = (pNum: number) => {
    setSelectedPinNum(pNum);
    const rowEl = document.getElementById(`pin-row-${pNum}`);
    if (rowEl && tableWrapperRef.current) {
      rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Quick Preset Pin Templates
  const handleApplyPreset = (template: 'automap' | 'quad_gates' | 'counter' | 'mux' | 'reset') => {
    soundFx.playButtonTap();
    const count = pinCount;
    const gndPin = Math.floor(count / 2);
    const vccPin = count;

    if (template === 'automap') {
      setCustomPins(generateDefaultPins(count, detectedInputs, detectedOutputs));
      return;
    }

    const list: CustomICPinMapping[] = [];

    if (template === 'quad_gates') {
      // Classic 7400/7408 Quad 2-Input Pinout
      for (let p = 1; p <= count; p++) {
        if (p === vccPin) list.push({ pin: p, pinNumber: p, name: 'VCC', type: 'power', inverted: false });
        else if (p === gndPin) list.push({ pin: p, pinNumber: p, name: 'GND', type: 'power', inverted: false });
        else if (p === 1) list.push({ pin: p, pinNumber: p, name: '1A', type: 'input', inverted: false });
        else if (p === 2) list.push({ pin: p, pinNumber: p, name: '1B', type: 'input', inverted: false });
        else if (p === 3) list.push({ pin: p, pinNumber: p, name: '1Y', type: 'output', inverted: false });
        else if (p === 4) list.push({ pin: p, pinNumber: p, name: '2A', type: 'input', inverted: false });
        else if (p === 5) list.push({ pin: p, pinNumber: p, name: '2B', type: 'input', inverted: false });
        else if (p === 6) list.push({ pin: p, pinNumber: p, name: '2Y', type: 'output', inverted: false });
        else if (p === (count === 20 ? 14 : count === 16 ? 8 : 8)) list.push({ pin: p, pinNumber: p, name: '3Y', type: 'output', inverted: false });
        else if (p === (count === 20 ? 15 : count === 16 ? 9 : 9)) list.push({ pin: p, pinNumber: p, name: '3A', type: 'input', inverted: false });
        else if (p === (count === 20 ? 16 : count === 16 ? 10 : 10)) list.push({ pin: p, pinNumber: p, name: '3B', type: 'input', inverted: false });
        else if (p === (count === 20 ? 17 : count === 16 ? 11 : 11)) list.push({ pin: p, pinNumber: p, name: '4Y', type: 'output', inverted: false });
        else if (p === (count === 20 ? 18 : count === 16 ? 12 : 12)) list.push({ pin: p, pinNumber: p, name: '4A', type: 'input', inverted: false });
        else if (p === (count === 20 ? 19 : count === 16 ? 13 : 13)) list.push({ pin: p, pinNumber: p, name: '4B', type: 'input', inverted: false });
        else list.push({ pin: p, pinNumber: p, name: 'NC', type: 'nc', inverted: false });
      }
    } else if (template === 'counter') {
      // Counter / Shift Register Pinout
      for (let p = 1; p <= count; p++) {
        if (p === vccPin) list.push({ pin: p, pinNumber: p, name: 'VCC', type: 'power', inverted: false });
        else if (p === gndPin) list.push({ pin: p, pinNumber: p, name: 'GND', type: 'power', inverted: false });
        else if (p === 1) list.push({ pin: p, pinNumber: p, name: 'CLK', type: 'input', inverted: false });
        else if (p === 2) list.push({ pin: p, pinNumber: p, name: 'CLR̄', type: 'input', inverted: true });
        else if (p === 3) list.push({ pin: p, pinNumber: p, name: 'EN', type: 'input', inverted: false });
        else if (p === 4) list.push({ pin: p, pinNumber: p, name: 'QA', type: 'output', inverted: false });
        else if (p === 5) list.push({ pin: p, pinNumber: p, name: 'QB', type: 'output', inverted: false });
        else if (p === 6) list.push({ pin: p, pinNumber: p, name: 'QC', type: 'output', inverted: false });
        else if (p === (count === 20 ? 14 : count === 16 ? 10 : 9)) list.push({ pin: p, pinNumber: p, name: 'QD', type: 'output', inverted: false });
        else if (p === (count === 20 ? 15 : count === 16 ? 11 : 10)) list.push({ pin: p, pinNumber: p, name: 'TC', type: 'output', inverted: false });
        else list.push({ pin: p, pinNumber: p, name: 'NC', type: 'nc', inverted: false });
      }
    } else if (template === 'mux') {
      // 4:1 Multiplexer Pinout
      for (let p = 1; p <= count; p++) {
        if (p === vccPin) list.push({ pin: p, pinNumber: p, name: 'VCC', type: 'power', inverted: false });
        else if (p === gndPin) list.push({ pin: p, pinNumber: p, name: 'GND', type: 'power', inverted: false });
        else if (p === 1) list.push({ pin: p, pinNumber: p, name: 'D0', type: 'input', inverted: false });
        else if (p === 2) list.push({ pin: p, pinNumber: p, name: 'D1', type: 'input', inverted: false });
        else if (p === 3) list.push({ pin: p, pinNumber: p, name: 'D2', type: 'input', inverted: false });
        else if (p === 4) list.push({ pin: p, pinNumber: p, name: 'D3', type: 'input', inverted: false });
        else if (p === 5) list.push({ pin: p, pinNumber: p, name: 'S0', type: 'input', inverted: false });
        else if (p === 6) list.push({ pin: p, pinNumber: p, name: 'S1', type: 'input', inverted: false });
        else if (p === (count === 20 ? 14 : count === 16 ? 9 : 8)) list.push({ pin: p, pinNumber: p, name: 'Ḡ', type: 'input', inverted: true });
        else if (p === (count === 20 ? 15 : count === 16 ? 10 : 9)) list.push({ pin: p, pinNumber: p, name: 'Y', type: 'output', inverted: false });
        else if (p === (count === 20 ? 16 : count === 16 ? 11 : 10)) list.push({ pin: p, pinNumber: p, name: 'W̄', type: 'output', inverted: true });
        else list.push({ pin: p, pinNumber: p, name: 'NC', type: 'nc', inverted: false });
      }
    } else {
      // Reset to plain numbering
      for (let p = 1; p <= count; p++) {
        if (p === vccPin) list.push({ pin: p, pinNumber: p, name: 'VCC', type: 'power', inverted: false });
        else if (p === gndPin) list.push({ pin: p, pinNumber: p, name: 'GND', type: 'power', inverted: false });
        else list.push({ pin: p, pinNumber: p, name: p % 2 === 0 ? `Y${p}` : `A${p}`, type: p % 2 === 0 ? 'output' : 'input', inverted: false });
      }
    }

    setCustomPins(list);
  };

  // Batch auto-rename / set NC
  const handleBatchSetUnboundNC = () => {
    soundFx.playButtonTap();
    setCustomPins((prev) =>
      prev.map((p) => {
        if (p.type === 'power' || p.internalComponentId) return p;
        return { ...p, name: 'NC', type: 'nc' };
      })
    );
  };

  const handleBatchAutoNumber = (type: 'input' | 'output') => {
    soundFx.playButtonTap();
    let num = 1;
    const prefix = type === 'input' ? 'A' : 'Y';
    setCustomPins((prev) =>
      prev.map((p) => {
        if (p.type === type) {
          return { ...p, name: `${prefix}${num++}` };
        }
        return p;
      })
    );
  };

  const handleSave = (placeOnCanvas: boolean = false) => {
    const cleanPins: CustomICPinMapping[] = customPins.map((p) => ({
      pin: p.pin,
      pinNumber: p.pin,
      name: p.name.trim() || `PIN${p.pin}`,
      type: p.type,
      internalComponentId: p.internalComponentId,
      internalCompId: p.internalComponentId,
      inverted: p.inverted || false,
    }));

    // Clone internal circuit (stripping fixed trainer kit components)
    const filteredComponents = activeCircuit.components.filter((c) => !c.isTrainerFixed);
    const internalCircuit: Circuit = {
      components: JSON.parse(JSON.stringify(filteredComponents)),
      wires: JSON.parse(JSON.stringify(activeCircuit.wires)),
    };

    const newIC: CustomICDefinition = {
      id: `custom_ic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      name: icName.trim() || 'Custom Logic IC',
      code: partNumber.trim() || '74CUSTOM',
      partNumber: partNumber.trim() || '74CUSTOM',
      description: description.trim(),
      pinCount,
      internalCircuit,
      circuit: internalCircuit,
      pins: cleanPins,
      pinMappings: cleanPins,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    saveUserCustomIC(newIC);
    soundFx.playSuccessChime();
    onSaveIC(newIC, placeOnCanvas);
    onClose();
  };

  if (!isOpen) return null;

  // Pin category counts
  const inputCount = customPins.filter((p) => p.type === 'input').length;
  const outputCount = customPins.filter((p) => p.type === 'output').length;
  const powerCount = customPins.filter((p) => p.type === 'power').length;
  const ncCount = customPins.filter((p) => p.type === 'nc').length;

  // Filtered rows for assignment matrix
  const filteredPinsWithIndex = customPins
    .map((p, idx) => ({ ...p, originalIndex: idx }))
    .filter((p) => {
      if (filterType !== 'all' && p.type !== filterType) return false;
      if (searchPin.trim()) {
        const query = searchPin.trim().toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          String(p.pin).includes(query) ||
          p.type.toLowerCase().includes(query)
        );
      }
      return true;
    });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content custom-ic-modal-studio"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Studio Header */}
        <div className="custom-ic-studio-header">
          <div className="studio-title-block">
            <span className="studio-icon-badge">✨</span>
            <div>
              <div className="studio-title-row">
                <h2 className="studio-heading">Custom IC Design & Packaging Studio</h2>
                <span className="studio-package-pill">DIP-{pinCount} Package</span>
              </div>
              <p className="studio-subtext">
                Encapsulate subcircuits, configure JEDEC pin mappings, and generate reusable IC components
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close Studio">
            ✕
          </button>
        </div>

        {/* Studio Dual-Pane Workspace */}
        <div className="custom-ic-studio-workspace">
          {/* ================================================================= */}
          {/* LEFT SIDEBAR: IC Identity, Visual Package & Quick Presets         */}
          {/* ================================================================= */}
          <div className="studio-sidebar-pane">
            {/* Identity Form */}
            <div className="studio-card">
              <div className="studio-card-title">IC Identity & Form Factor</div>

              <div className="studio-form-field">
                <label className="studio-label">Part Number / Silkscreen Code</label>
                <input
                  type="text"
                  className="studio-input mono uppercase"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 74MY01, ALU_4B"
                  maxLength={12}
                />
              </div>

              <div className="studio-form-field">
                <label className="studio-label">IC Display Name</label>
                <input
                  type="text"
                  className="studio-input"
                  value={icName}
                  onChange={(e) => setIcName(e.target.value)}
                  placeholder="e.g. 4-Bit Arithmetic Unit"
                />
              </div>

              <div className="studio-form-field">
                <label className="studio-label">DIP Package Sockets</label>
                <div className="studio-pkg-toggle-group">
                  <button
                    type="button"
                    className={`pkg-toggle-btn ${pinCount === 14 ? 'active' : ''}`}
                    onClick={() => handlePinCountChange(14)}
                  >
                    14-Pin
                  </button>
                  <button
                    type="button"
                    className={`pkg-toggle-btn ${pinCount === 16 ? 'active' : ''}`}
                    onClick={() => handlePinCountChange(16)}
                  >
                    16-Pin
                  </button>
                  <button
                    type="button"
                    className={`pkg-toggle-btn ${pinCount === 20 ? 'active' : ''}`}
                    onClick={() => handlePinCountChange(20)}
                    title="20-Pin DIP Trainer Socket Standard"
                  >
                    20-Pin (Trainer)
                  </button>
                </div>
              </div>

              <div className="studio-form-field">
                <label className="studio-label">Description & Architecture Notes</label>
                <textarea
                  className="studio-textarea"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Custom subcircuit packaged into 20-pin DIP IC socket"
                />
              </div>
            </div>

            {/* Source Mode Switcher */}
            <div className="studio-card">
              <div className="studio-card-title">Source Architecture</div>
              <div className="studio-source-toggle-row">
                <button
                  type="button"
                  className={`source-toggle-btn ${sourceMode === 'canvas' ? 'active' : ''}`}
                  onClick={() => setSourceMode('canvas')}
                >
                  <span className="source-btn-icon">📄</span>
                  <div className="source-btn-text">
                    <strong>Package Active Canvas</strong>
                    <small>{activeCircuit.components.filter((c) => !c.isTrainerFixed).length} components detected</small>
                  </div>
                </button>
                <button
                  type="button"
                  className={`source-toggle-btn ${sourceMode === 'custom' ? 'active' : ''}`}
                  onClick={() => setSourceMode('custom')}
                >
                  <span className="source-btn-icon">🛠️</span>
                  <div className="source-btn-text">
                    <strong>Custom Pin Specification</strong>
                    <small>Direct pinout assignment</small>
                  </div>
                </button>
              </div>
            </div>

            {/* Interactive DIP Package Visualizer */}
            <div className="studio-card">
              <div className="studio-card-title-row">
                <span className="studio-card-title">Interactive DIP-{pinCount} Package</span>
                <span className="studio-hint-pill">Click pin to focus</span>
              </div>

              <div className="studio-dip-visualizer">
                <div className="studio-dip-chip">
                  <div className="studio-dip-notch" />
                  <div className="studio-dip-pin1-dot" />
                  <div className="studio-dip-label">{partNumber || 'CUSTOM_IC'}</div>

                  {/* Top Pins (N down to N/2 + 1) */}
                  <div className="studio-dip-pins-row top-row">
                    {customPins
                      .slice(pinCount / 2, pinCount)
                      .reverse()
                      .map((p) => {
                        const isSelected = selectedPinNum === p.pin;
                        return (
                          <div
                            key={p.pin}
                            className={`studio-dip-pin ${p.type} ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSelectPinOnVisualizer(p.pin)}
                            title={`Pin ${p.pin}: ${p.name} (${p.type.toUpperCase()}) — Click to jump`}
                          >
                            <span className="pin-num-tag">{p.pin}</span>
                            <span className="pin-name-tag">{p.name}</span>
                          </div>
                        );
                      })}
                  </div>

                  {/* Bottom Pins (1 up to N/2) */}
                  <div className="studio-dip-pins-row bottom-row">
                    {customPins.slice(0, pinCount / 2).map((p) => {
                      const isSelected = selectedPinNum === p.pin;
                      return (
                        <div
                          key={p.pin}
                          className={`studio-dip-pin ${p.type} ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectPinOnVisualizer(p.pin)}
                          title={`Pin ${p.pin}: ${p.name} (${p.type.toUpperCase()}) — Click to jump`}
                        >
                          <span className="pin-name-tag">{p.name}</span>
                          <span className="pin-num-tag">{p.pin}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Presets & Templates */}
            <div className="studio-card">
              <div className="studio-card-title">Quick Pinout Templates</div>
              <div className="studio-presets-grid">
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => handleApplyPreset('automap')}
                  title="Auto-map canvas inputs & outputs"
                >
                  ⚡ Auto-Map Canvas
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => handleApplyPreset('quad_gates')}
                  title="Quad 2-Input logic gate pinout (7400/7408 style)"
                >
                  🔷 Quad 2-In Gates
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => handleApplyPreset('counter')}
                  title="Clocked counter / register pinout"
                >
                  🔄 Counter / Reg
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  onClick={() => handleApplyPreset('mux')}
                  title="4:1 Multiplexer / Data Selector pinout"
                >
                  🔀 MUX / Decoder
                </button>
                <button
                  type="button"
                  className="preset-btn danger"
                  onClick={() => handleApplyPreset('reset')}
                  title="Reset all pin assignments"
                >
                  ↺ Reset Defaults
                </button>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* RIGHT MAIN PANEL: Comprehensive Pin Assignment Matrix Table       */}
          {/* ================================================================= */}
          <div className="studio-matrix-pane">
            {/* Matrix Control Bar */}
            <div className="matrix-toolbar">
              <div className="matrix-filter-pills">
                <button
                  type="button"
                  className={`matrix-filter-pill ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  All Pins ({pinCount})
                </button>
                <button
                  type="button"
                  className={`matrix-filter-pill input ${filterType === 'input' ? 'active' : ''}`}
                  onClick={() => setFilterType('input')}
                >
                  Inputs ({inputCount})
                </button>
                <button
                  type="button"
                  className={`matrix-filter-pill output ${filterType === 'output' ? 'active' : ''}`}
                  onClick={() => setFilterType('output')}
                >
                  Outputs ({outputCount})
                </button>
                <button
                  type="button"
                  className={`matrix-filter-pill power ${filterType === 'power' ? 'active' : ''}`}
                  onClick={() => setFilterType('power')}
                >
                  Power ({powerCount})
                </button>
                <button
                  type="button"
                  className={`matrix-filter-pill nc ${filterType === 'nc' ? 'active' : ''}`}
                  onClick={() => setFilterType('nc')}
                >
                  NC ({ncCount})
                </button>
              </div>

              <div className="matrix-search-box">
                <input
                  type="text"
                  className="matrix-search-input"
                  placeholder="Filter by pin name or #..."
                  value={searchPin}
                  onChange={(e) => setSearchPin(e.target.value)}
                />
                {searchPin && (
                  <button className="matrix-search-clear" onClick={() => setSearchPin('')}>
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Batch Helper Actions Bar */}
            <div className="matrix-batch-bar">
              <span className="batch-label">Batch Actions:</span>
              <button
                type="button"
                className="batch-btn"
                onClick={() => handleBatchAutoNumber('input')}
                title="Renumber inputs sequentially A1, A2..."
              >
                Auto-Name Inputs (A1..An)
              </button>
              <button
                type="button"
                className="batch-btn"
                onClick={() => handleBatchAutoNumber('output')}
                title="Renumber outputs sequentially Y1, Y2..."
              >
                Auto-Name Outputs (Y1..Yn)
              </button>
              <button
                type="button"
                className="batch-btn"
                onClick={handleBatchSetUnboundNC}
                title="Set unmapped pins to NC"
              >
                Set Unbound to NC
              </button>
            </div>

            {/* Dedicated Scrollable High-Res Table */}
            <div className="studio-table-container" ref={tableWrapperRef}>
              <table className="studio-pin-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>Pin #</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Row</th>
                    <th style={{ width: '140px' }}>Pin Name / Signal</th>
                    <th style={{ width: '130px' }}>Signal Type</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Active-Low</th>
                    <th>Internal Canvas Component Binding</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPinsWithIndex.map((p) => {
                    const idx = p.originalIndex;
                    const isTopRow = p.pin > pinCount / 2;
                    const isSelected = selectedPinNum === p.pin;

                    return (
                      <tr
                        key={p.pin}
                        id={`pin-row-${p.pin}`}
                        className={`pin-matrix-row ${isSelected ? 'highlighted' : ''} ${p.type}`}
                      >
                        {/* Pin Number Badge */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`matrix-pin-badge ${p.type}`}>
                            {p.pin}
                          </span>
                        </td>

                        {/* Top / Bottom Physical Position */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="matrix-row-indicator">
                            {isTopRow ? 'Top' : 'Bottom'}
                          </span>
                        </td>

                        {/* Pin Name Input */}
                        <td>
                          <input
                            type="text"
                            className="matrix-name-input"
                            value={p.name}
                            onChange={(e) =>
                              handlePinChange(idx, { name: e.target.value.toUpperCase() })
                            }
                            placeholder={`PIN${p.pin}`}
                          />
                        </td>

                        {/* Signal Type Selector */}
                        <td>
                          <select
                            className={`matrix-type-select ${p.type}`}
                            value={p.type}
                            onChange={(e) =>
                              handlePinChange(idx, {
                                type: e.target.value as CustomICPinMapping['type'],
                              })
                            }
                          >
                            <option value="input">📥 Input (IN)</option>
                            <option value="output">📤 Output (OUT)</option>
                            <option value="power">⚡ Power Rail</option>
                            <option value="nc">⚪ NC (Unconnected)</option>
                          </select>
                        </td>

                        {/* Active-Low Inverted Bubble */}
                        <td style={{ textAlign: 'center' }}>
                          <label className="matrix-checkbox-label" title="Active-Low signal (adds inverted bar over pin)">
                            <input
                              type="checkbox"
                              checked={Boolean(p.inverted)}
                              onChange={(e) =>
                                handlePinChange(idx, { inverted: e.target.checked })
                              }
                            />
                            <span className="checkbox-custom" />
                          </label>
                        </td>

                        {/* Internal Canvas Binding */}
                        <td>
                          <select
                            className="matrix-binding-select"
                            value={p.internalComponentId || ''}
                            onChange={(e) =>
                              handlePinChange(idx, {
                                internalComponentId: e.target.value || undefined,
                              })
                            }
                          >
                            <option value="">-- Direct Pin Node (No internal binding) --</option>
                            {p.type === 'input' && (
                              <optgroup label="Detected Canvas Inputs">
                                {detectedInputs.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label || c.type} [{c.type.toUpperCase()}] ({c.id.substring(0, 10)})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {p.type === 'output' && (
                              <optgroup label="Detected Canvas Outputs / Displays">
                                {detectedOutputs.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label || c.type} [{c.type.toUpperCase()}] ({c.id.substring(0, 10)})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredPinsWithIndex.length === 0 && (
                <div className="matrix-empty-msg">
                  No pins match filter "{filterType}" {searchPin && `or query "${searchPin}"`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Studio Footer */}
        <div className="custom-ic-studio-footer">
          <div className="footer-summary-pills">
            <span className="summary-pill input">📥 {inputCount} Inputs</span>
            <span className="summary-pill output">📤 {outputCount} Outputs</span>
            <span className="summary-pill power">⚡ {powerCount} Power</span>
            <span className="summary-pill nc">⚪ {ncCount} NC</span>
          </div>

          <div className="footer-action-buttons">
            <button className="header-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="header-btn" onClick={() => handleSave(false)}>
              💾 Save to IC Library
            </button>
            <button className="header-btn primary" onClick={() => handleSave(true)}>
              ✨ Save & Mount to Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomICModal;
