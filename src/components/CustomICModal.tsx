import React, { useState, useMemo, useEffect } from 'react';
import type {
  Circuit,
  CustomICDefinition,
  CustomICPinMapping,
  InternalGateType,
  InternalGateUnit,
  LogicValue,
} from '../types/circuit';
import { saveUserCustomIC } from '../services/customIcStorage';
import { apiSaveCustomIC } from '../services/apiClient';
import { soundFx } from '../audio/soundEffects';

interface CustomICModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCircuit?: Circuit;
  userId?: string;
  onSaveIC: (savedIC: CustomICDefinition, placeOnCanvas?: boolean) => void;
}

const GATE_TYPE_CONFIGS: Record<
  InternalGateType,
  { label: string; inCount: number; outCount: number; defaultName: string; category: string }
> = {
  and_2: { label: '2-Input AND Gate', inCount: 2, outCount: 1, defaultName: 'AND', category: 'Basic' },
  or_2: { label: '2-Input OR Gate', inCount: 2, outCount: 1, defaultName: 'OR', category: 'Basic' },
  nand_2: { label: '2-Input NAND Gate', inCount: 2, outCount: 1, defaultName: 'NAND', category: 'Basic' },
  nor_2: { label: '2-Input NOR Gate', inCount: 2, outCount: 1, defaultName: 'NOR', category: 'Basic' },
  xor_2: { label: '2-Input XOR Gate', inCount: 2, outCount: 1, defaultName: 'XOR', category: 'Basic' },
  xnor_2: { label: '2-Input XNOR Gate', inCount: 2, outCount: 1, defaultName: 'XNOR', category: 'Basic' },
  not: { label: '1-Input NOT (Inverter)', inCount: 1, outCount: 1, defaultName: 'NOT', category: 'Basic' },
  buffer: { label: '1-Input Buffer', inCount: 1, outCount: 1, defaultName: 'BUF', category: 'Basic' },
  and_3: { label: '3-Input AND Gate', inCount: 3, outCount: 1, defaultName: '3-AND', category: 'Multi-Input' },
  or_3: { label: '3-Input OR Gate', inCount: 3, outCount: 1, defaultName: '3-OR', category: 'Multi-Input' },
  nand_3: { label: '3-Input NAND Gate', inCount: 3, outCount: 1, defaultName: '3-NAND', category: 'Multi-Input' },
  nor_3: { label: '3-Input NOR Gate', inCount: 3, outCount: 1, defaultName: '3-NOR', category: 'Multi-Input' },
  and_4: { label: '4-Input AND Gate', inCount: 4, outCount: 1, defaultName: '4-AND', category: 'Multi-Input' },
  or_4: { label: '4-Input OR Gate', inCount: 4, outCount: 1, defaultName: '4-OR', category: 'Multi-Input' },
  and_6: { label: '6-Input AND Gate', inCount: 6, outCount: 1, defaultName: '6-AND', category: 'Multi-Input' },
  and_8: { label: '8-Input AND Gate', inCount: 8, outCount: 1, defaultName: '8-AND', category: 'Multi-Input' },
  mux_2to1: { label: '2-to-1 Multiplexer', inCount: 3, outCount: 1, defaultName: 'MUX', category: 'MSI' },
  d_flipflop: { label: 'D Flip-Flop Unit', inCount: 2, outCount: 1, defaultName: 'D-FF', category: 'Sequential' },
  jk_flipflop: { label: 'JK Flip-Flop Unit', inCount: 3, outCount: 1, defaultName: 'JK-FF', category: 'Sequential' },
};

export const CustomICModal: React.FC<CustomICModalProps> = ({
  isOpen,
  onClose,
  activeCircuit: _activeCircuit,
  userId = 'guest',
  onSaveIC,
}) => {
  const [partNumber, setPartNumber] = useState('74MY01');
  const [icName, setIcName] = useState('Custom Multi-Gate IC');
  const [description, setDescription] = useState('DIP Integrated Circuit with configured internal logic units');
  const [pinCount, setPinCount] = useState<14 | 16 | 20>(20);
  const [vccPin, setVccPin] = useState<number>(20);
  const [gndPin, setGndPin] = useState<number>(10);

  // Modular Internal Gate Units
  const [gateUnits, setGateUnits] = useState<InternalGateUnit[]>([
    {
      id: 'unit_1',
      type: 'and_2',
      label: 'Gate 1 (AND)',
      inputPins: [1, 2],
      outputPins: [3],
    },
    {
      id: 'unit_2',
      type: 'or_2',
      label: 'Gate 2 (OR)',
      inputPins: [4, 5],
      outputPins: [6],
    },
  ]);

  // Live Test Simulation Inputs for Modal Verification
  const [testPinInputs, setTestPinInputs] = useState<Record<number, LogicValue>>({});

  // Reset VCC and GND pins when pin count changes
  useEffect(() => {
    const newVcc = pinCount;
    const newGnd = Math.floor(pinCount / 2);
    setVccPin(newVcc);
    setGndPin(newGnd);
  }, [pinCount]);

  // Auto-generate pins from gateUnits
  const pinMappings = useMemo<CustomICPinMapping[]>(() => {
    const list: CustomICPinMapping[] = [];
    const pinOccupancy = new Map<number, { name: string; type: 'input' | 'output' | 'power' | 'nc'; unitLabel?: string }>();

    // Mark Power Pins
    pinOccupancy.set(vccPin, { name: 'VCC', type: 'power', unitLabel: '+5V Power' });
    pinOccupancy.set(gndPin, { name: 'GND', type: 'power', unitLabel: 'Ground' });

    // Mark Gate Unit Pins
    gateUnits.forEach((unit, uIdx) => {
      const uNum = uIdx + 1;
      const conf = GATE_TYPE_CONFIGS[unit.type];
      unit.inputPins.forEach((pNum, inIdx) => {
        if (pNum >= 1 && pNum <= pinCount) {
          const pinChar = String.fromCharCode(65 + inIdx); // A, B, C, D...
          pinOccupancy.set(pNum, {
            name: `${uNum}${pinChar}`,
            type: 'input',
            unitLabel: `${unit.label || conf.defaultName} Input ${pinChar}`,
          });
        }
      });

      unit.outputPins.forEach((pNum, outIdx) => {
        if (pNum >= 1 && pNum <= pinCount) {
          const outName = unit.outputPins.length === 1 ? `${uNum}Y` : `${uNum}Y${outIdx + 1}`;
          pinOccupancy.set(pNum, {
            name: outName,
            type: 'output',
            unitLabel: `${unit.label || conf.defaultName} Output`,
          });
        }
      });
    });

    // Build all pins 1..pinCount
    for (let p = 1; p <= pinCount; p++) {
      const occ = pinOccupancy.get(p);
      if (occ) {
        list.push({
          pin: p,
          pinNumber: p,
          name: occ.name,
          type: occ.type,
          inverted: false,
        });
      } else {
        list.push({
          pin: p,
          pinNumber: p,
          name: `NC`,
          type: 'nc',
          inverted: false,
        });
      }
    }

    return list;
  }, [pinCount, vccPin, gndPin, gateUnits]);

  // Compute live output for testing preview
  const testOutputs = useMemo<Record<number, LogicValue>>(() => {
    const isVccOn = (testPinInputs[vccPin] ?? '1') === '1'; // Default VCC to 1 for live test
    const results: Record<number, LogicValue> = {};

    if (!isVccOn) {
      pinMappings.forEach((p) => {
        if (p.type === 'output') results[p.pin] = '0';
      });
      return results;
    }

    gateUnits.forEach((unit) => {
      const inVals = unit.inputPins.map((pNum) => testPinInputs[pNum] ?? '0');
      let outVal: LogicValue = '0';

      switch (unit.type) {
        case 'and_2':
          outVal = inVals[0] === '1' && inVals[1] === '1' ? '1' : '0';
          break;
        case 'or_2':
          outVal = inVals[0] === '1' || inVals[1] === '1' ? '1' : '0';
          break;
        case 'nand_2':
          outVal = inVals[0] === '1' && inVals[1] === '1' ? '0' : '1';
          break;
        case 'nor_2':
          outVal = inVals[0] === '0' && inVals[1] === '0' ? '1' : '0';
          break;
        case 'xor_2':
          outVal = inVals[0] !== inVals[1] ? '1' : '0';
          break;
        case 'xnor_2':
          outVal = inVals[0] === inVals[1] ? '1' : '0';
          break;
        case 'not':
          outVal = inVals[0] === '1' ? '0' : '1';
          break;
        case 'buffer':
          outVal = inVals[0];
          break;
        case 'and_3':
          outVal = inVals.slice(0, 3).every((v) => v === '1') ? '1' : '0';
          break;
        case 'or_3':
          outVal = inVals.slice(0, 3).some((v) => v === '1') ? '1' : '0';
          break;
        case 'nand_3':
          outVal = inVals.slice(0, 3).every((v) => v === '1') ? '0' : '1';
          break;
        case 'nor_3':
          outVal = inVals.slice(0, 3).every((v) => v === '0') ? '1' : '0';
          break;
        case 'and_4':
          outVal = inVals.slice(0, 4).every((v) => v === '1') ? '1' : '0';
          break;
        case 'or_4':
          outVal = inVals.slice(0, 4).some((v) => v === '1') ? '1' : '0';
          break;
        case 'and_6':
          outVal = inVals.slice(0, 6).every((v) => v === '1') ? '1' : '0';
          break;
        case 'and_8':
          outVal = inVals.slice(0, 8).every((v) => v === '1') ? '1' : '0';
          break;
        case 'mux_2to1':
          outVal = inVals[2] === '1' ? inVals[1] : inVals[0];
          break;
        default:
          outVal = inVals[0];
      }

      unit.outputPins.forEach((pNum) => {
        results[pNum] = outVal;
      });
    });

    return results;
  }, [testPinInputs, vccPin, gateUnits, pinMappings]);

  // Add a new Logic Gate Unit
  const handleAddGateUnit = (type: InternalGateType = 'and_2') => {
    const conf = GATE_TYPE_CONFIGS[type];
    const unitCount = gateUnits.length + 1;

    // Find available pins not already taken
    const usedPins = new Set<number>([vccPin, gndPin]);
    gateUnits.forEach((u) => {
      u.inputPins.forEach((p) => usedPins.add(p));
      u.outputPins.forEach((p) => usedPins.add(p));
    });

    const freePins: number[] = [];
    for (let p = 1; p <= pinCount; p++) {
      if (!usedPins.has(p)) freePins.push(p);
    }

    const assignedInputs: number[] = [];
    for (let i = 0; i < conf.inCount; i++) {
      assignedInputs.push(freePins[i] ?? Math.min(pinCount - 1, 1 + i));
    }

    const assignedOutputs: number[] = [];
    for (let i = 0; i < conf.outCount; i++) {
      assignedOutputs.push(freePins[conf.inCount + i] ?? Math.min(pinCount - 1, conf.inCount + 1 + i));
    }

    const newUnit: InternalGateUnit = {
      id: `unit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      label: `Gate ${unitCount} (${conf.defaultName})`,
      inputPins: assignedInputs,
      outputPins: assignedOutputs,
    };

    setGateUnits([...gateUnits, newUnit]);
    soundFx.playButtonTap();
  };

  // Remove Gate Unit
  const handleRemoveGateUnit = (id: string) => {
    setGateUnits(gateUnits.filter((u) => u.id !== id));
    soundFx.playButtonTap();
  };

  // Update Gate Unit
  const handleUpdateGateUnit = (id: string, updates: Partial<InternalGateUnit>) => {
    setGateUnits(
      gateUnits.map((u) => {
        if (u.id !== id) return u;
        const next = { ...u, ...updates };
        if (updates.type && updates.type !== u.type) {
          const conf = GATE_TYPE_CONFIGS[updates.type];
          next.inputPins = Array.from({ length: conf.inCount }, (_, i) => u.inputPins[i] || (i + 1));
          next.outputPins = Array.from({ length: conf.outCount }, (_, i) => u.outputPins[i] || (conf.inCount + 1 + i));
          next.label = `Gate (${conf.defaultName})`;
        }
        return next;
      })
    );
  };

  // Load Presets
  const handleLoadPreset = (presetName: string) => {
    soundFx.playButtonTap();
    if (presetName === 'quad_and') {
      setPartNumber('74LS08');
      setIcName('Quad 2-Input AND Gate');
      setPinCount(14);
      setVccPin(14);
      setGndPin(7);
      setGateUnits([
        { id: 'g1', type: 'and_2', label: 'Gate 1', inputPins: [1, 2], outputPins: [3] },
        { id: 'g2', type: 'and_2', label: 'Gate 2', inputPins: [4, 5], outputPins: [6] },
        { id: 'g3', type: 'and_2', label: 'Gate 3', inputPins: [9, 10], outputPins: [8] },
        { id: 'g4', type: 'and_2', label: 'Gate 4', inputPins: [12, 13], outputPins: [11] },
      ]);
    } else if (presetName === 'quad_or') {
      setPartNumber('74LS32');
      setIcName('Quad 2-Input OR Gate');
      setPinCount(14);
      setVccPin(14);
      setGndPin(7);
      setGateUnits([
        { id: 'g1', type: 'or_2', label: 'Gate 1', inputPins: [1, 2], outputPins: [3] },
        { id: 'g2', type: 'or_2', label: 'Gate 2', inputPins: [4, 5], outputPins: [6] },
        { id: 'g3', type: 'or_2', label: 'Gate 3', inputPins: [9, 10], outputPins: [8] },
        { id: 'g4', type: 'or_2', label: 'Gate 4', inputPins: [12, 13], outputPins: [11] },
      ]);
    } else if (presetName === 'multi_combo') {
      setPartNumber('74COMBO');
      setIcName('2-AND + 2-OR + 6-AND Multi-Logic IC');
      setPinCount(20);
      setVccPin(20);
      setGndPin(10);
      setGateUnits([
        { id: 'g1', type: 'and_2', label: 'Gate 1 (AND)', inputPins: [1, 2], outputPins: [3] },
        { id: 'g2', type: 'or_2', label: 'Gate 2 (OR)', inputPins: [4, 5], outputPins: [6] },
        { id: 'g3', type: 'and_6', label: 'Gate 3 (6-Input AND)', inputPins: [7, 8, 9, 11, 12, 13], outputPins: [14] },
        { id: 'g4', type: 'not', label: 'Gate 4 (Inverter)', inputPins: [15], outputPins: [16] },
      ]);
    } else if (presetName === 'hex_inv') {
      setPartNumber('74LS04');
      setIcName('Hex Inverter NOT Gate');
      setPinCount(14);
      setVccPin(14);
      setGndPin(7);
      setGateUnits([
        { id: 'g1', type: 'not', label: 'Inverter 1', inputPins: [1], outputPins: [2] },
        { id: 'g2', type: 'not', label: 'Inverter 2', inputPins: [3], outputPins: [4] },
        { id: 'g3', type: 'not', label: 'Inverter 3', inputPins: [5], outputPins: [6] },
        { id: 'g4', type: 'not', label: 'Inverter 4', inputPins: [9], outputPins: [8] },
        { id: 'g5', type: 'not', label: 'Inverter 5', inputPins: [11], outputPins: [10] },
        { id: 'g6', type: 'not', label: 'Inverter 6', inputPins: [13], outputPins: [12] },
      ]);
    }
  };

  // Toggle Test Pin
  const handleToggleTestPin = (pNum: number) => {
    const cur = testPinInputs[pNum] ?? '0';
    setTestPinInputs({ ...testPinInputs, [pNum]: cur === '1' ? '0' : '1' });
    soundFx.playSwitchClick(cur !== '1');
  };

  // Save Custom IC Definition
  const handleSave = async (placeOnCanvas: boolean) => {
    const cleanPart = partNumber.trim() || 'CUSTOM_IC';
    const cleanName = icName.trim() || 'Custom IC';

    const newIC: CustomICDefinition = {
      id: `custom_ic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      partNumber: cleanPart,
      name: cleanName,
      code: cleanPart,
      description: description.trim(),
      pinCount,
      vccPin,
      gndPin,
      gateUnits,
      pins: pinMappings,
      pinMappings,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save to local vault and backend database API
    saveUserCustomIC(newIC);
    try {
      await apiSaveCustomIC(newIC);
    } catch {
      // Offline or guest mode fallback
    }

    soundFx.playButtonTap();
    onSaveIC(newIC, placeOnCanvas);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="custom-ic-modal-overlay" onClick={onClose}>
      <div
        className="custom-ic-studio-container"
        style={{ maxWidth: '1200px', width: '95vw', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Studio Header */}
        <div className="custom-ic-studio-header">
          <div className="studio-brand">
            <div className="studio-icon">📐</div>
            <div className="studio-titles">
              <h2 className="studio-title">CUSTOM IC ARCHITECT & LOGIC DESIGNER</h2>
              <span className="studio-subtitle">
                Configure internal logic gates, pin mappings, and build reusable DIP IC chips
              </span>
            </div>
          </div>
          <button className="custom-ic-close-btn" onClick={onClose} title="Close Studio">
            ✕
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="custom-ic-top-bar" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '12px 20px', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>PART NUMBER</label>
            <input
              type="text"
              className="text-input"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value.toUpperCase())}
              placeholder="e.g. 74MY01"
              style={{ width: '130px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>IC NAME</label>
            <input
              type="text"
              className="text-input"
              value={icName}
              onChange={(e) => setIcName(e.target.value)}
              placeholder="e.g. Quad 2-Input AND + Dual OR"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>DESCRIPTION</label>
            <input
              type="text"
              className="text-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internal logic and pin descriptions..."
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>DIP PACKAGE</label>
            <select
              className="matrix-select"
              value={pinCount}
              onChange={(e) => setPinCount(Number(e.target.value) as 14 | 16 | 20)}
              style={{ fontWeight: 800 }}
            >
              <option value={14}>14-Pin DIP</option>
              <option value={16}>16-Pin DIP</option>
              <option value={20}>20-Pin DIP (Trainer Base)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>PRESET TEMPLATES</label>
            <select
              className="matrix-select"
              onChange={(e) => {
                if (e.target.value) {
                  handleLoadPreset(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>-- Load Template --</option>
              <option value="quad_and">Quad 2-Input AND (7408)</option>
              <option value="quad_or">Quad 2-Input OR (7432)</option>
              <option value="hex_inv">Hex Inverter NOT (7404)</option>
              <option value="multi_combo">2-AND + 2-OR + 6-AND (Combo IC)</option>
            </select>
          </div>
        </div>

        {/* Studio Main Workspace (Split View) */}
        <div className="custom-ic-studio-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', padding: '16px 20px', flex: 1, overflow: 'hidden' }}>
          {/* Left Column: Modular Logic Gate Units Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                🧩 INTERNAL LOGIC UNITS ({gateUnits.length} Gate Units)
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="header-btn primary"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => handleAddGateUnit('and_2')}
                >
                  ➕ + 2-In AND
                </button>
                <button
                  type="button"
                  className="header-btn"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => handleAddGateUnit('or_2')}
                >
                  ➕ + 2-In OR
                </button>
                <button
                  type="button"
                  className="header-btn"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => handleAddGateUnit('and_6')}
                >
                  ➕ + 6-In AND
                </button>
                <button
                  type="button"
                  className="header-btn"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                  onClick={() => handleAddGateUnit('not')}
                >
                  ➕ + Inverter
                </button>
              </div>
            </div>

            {/* Units Scroll Container */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '6px' }}>
              {gateUnits.map((unit, uIdx) => {
                return (
                  <div
                    key={unit.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--accent-primary)' }}>
                          UNIT {uIdx + 1}:
                        </span>
                        <select
                          className="matrix-select"
                          value={unit.type}
                          onChange={(e) =>
                            handleUpdateGateUnit(unit.id, { type: e.target.value as InternalGateType })
                          }
                          style={{ fontWeight: 700 }}
                        >
                          {Object.entries(GATE_TYPE_CONFIGS).map(([typeKey, c]) => (
                            <option key={typeKey} value={typeKey}>
                              {c.label} ({c.inCount} in, {c.outCount} out)
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="trainer-remove-board-btn"
                        onClick={() => handleRemoveGateUnit(unit.id)}
                        title="Remove Logic Unit"
                      >
                        ✕ Remove
                      </button>
                    </div>

                    {/* Pin Mapping Selectors for this Gate */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '6px' }}>
                      {/* Input Pins */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8' }}>📥 Inputs:</span>
                        {unit.inputPins.map((pNum, inIdx) => (
                          <div key={inIdx} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                              {String.fromCharCode(65 + inIdx)}:
                            </span>
                            <select
                              className="matrix-select"
                              value={pNum}
                              onChange={(e) => {
                                const newInPins = [...unit.inputPins];
                                newInPins[inIdx] = Number(e.target.value);
                                handleUpdateGateUnit(unit.id, { inputPins: newInPins });
                              }}
                              style={{ width: '60px', padding: '2px 4px', fontSize: '11px', fontWeight: 800 }}
                            >
                              {Array.from({ length: pinCount }, (_, i) => i + 1).map((p) => (
                                <option key={p} value={p} disabled={p === vccPin || p === gndPin}>
                                  Pin {p} {p === vccPin ? '(VCC)' : p === gndPin ? '(GND)' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      {/* Arrow */}
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 900 }}>➔</span>

                      {/* Output Pin */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#22c55e' }}>📤 Output:</span>
                        {unit.outputPins.map((pNum, outIdx) => (
                          <select
                            key={outIdx}
                            className="matrix-select"
                            value={pNum}
                            onChange={(e) => {
                              const newOutPins = [...unit.outputPins];
                              newOutPins[outIdx] = Number(e.target.value);
                              handleUpdateGateUnit(unit.id, { outputPins: newOutPins });
                            }}
                            style={{ width: '60px', padding: '2px 4px', fontSize: '11px', fontWeight: 800, borderColor: '#22c55e' }}
                          >
                            {Array.from({ length: pinCount }, (_, i) => i + 1).map((p) => (
                              <option key={p} value={p} disabled={p === vccPin || p === gndPin}>
                                Pin {p}
                              </option>
                            ))}
                          </select>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {gateUnits.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
                  No logic gate units added yet. Click "+ Add Logic Gate Unit" or load a preset above!
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive DIP Visualizer & Live Truth Test */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-panel)', padding: '14px', borderRadius: '8px', border: '1.5px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                🔬 DIP PIN MAP & LIVE SIMULATOR
              </h3>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Click input pins to test logic</span>
            </div>

            {/* Visual DIP Chip Representation */}
            <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '2px solid #334155', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Top Row: Pins (pinCount down to pinCount/2 + 1) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                {Array.from({ length: pinCount / 2 }, (_, i) => pinCount - i).map((pinNum) => {
                  const pMap = pinMappings.find((p) => p.pin === pinNum);
                  const isPower = pMap?.type === 'power';
                  const isInput = pMap?.type === 'input';
                  const isOutput = pMap?.type === 'output';
                  const testVal = isOutput ? testOutputs[pinNum] : testPinInputs[pinNum] ?? (isPower && pinNum === vccPin ? '1' : '0');

                  return (
                    <div
                      key={pinNum}
                      onClick={() => isInput && handleToggleTestPin(pinNum)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        cursor: isInput ? 'pointer' : 'default',
                      }}
                      title={`Pin ${pinNum}: ${pMap?.name} (${pMap?.type})${isInput ? ' - Click to toggle test input' : ''}`}
                    >
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8' }}>{pinNum}</span>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          border: `1.5px solid ${isPower ? '#f59e0b' : isOutput ? '#22c55e' : isInput ? '#38bdf8' : '#475569'}`,
                          background: testVal === '1' ? '#22c55e' : '#1e293b',
                          color: testVal === '1' ? '#000' : '#fff',
                          fontWeight: 900,
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: testVal === '1' ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none',
                        }}
                      >
                        {testVal}
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: isPower ? '#f59e0b' : isOutput ? '#22c55e' : isInput ? '#38bdf8' : '#64748b' }}>
                        {pMap?.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* DIP Center Body */}
              <div style={{ height: '36px', background: '#1e293b', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '1px solid #334155' }}>
                <div style={{ position: 'absolute', left: '-6px', width: '12px', height: '12px', borderRadius: '50%', background: '#0f172a' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '13px', letterSpacing: '2px', color: '#f8fafc' }}>
                  {partNumber}
                </span>
              </div>

              {/* Bottom Row: Pins 1 to pinCount/2 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                {Array.from({ length: pinCount / 2 }, (_, i) => i + 1).map((pinNum) => {
                  const pMap = pinMappings.find((p) => p.pin === pinNum);
                  const isPower = pMap?.type === 'power';
                  const isInput = pMap?.type === 'input';
                  const isOutput = pMap?.type === 'output';
                  const testVal = isOutput ? testOutputs[pinNum] : testPinInputs[pinNum] ?? (isPower && pinNum === vccPin ? '1' : '0');

                  return (
                    <div
                      key={pinNum}
                      onClick={() => isInput && handleToggleTestPin(pinNum)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        cursor: isInput ? 'pointer' : 'default',
                      }}
                      title={`Pin ${pinNum}: ${pMap?.name} (${pMap?.type})${isInput ? ' - Click to toggle test input' : ''}`}
                    >
                      <span style={{ fontSize: '9px', fontWeight: 800, color: isPower ? '#f59e0b' : isOutput ? '#22c55e' : isInput ? '#38bdf8' : '#64748b' }}>
                        {pMap?.name}
                      </span>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          border: `1.5px solid ${isPower ? '#f59e0b' : isOutput ? '#22c55e' : isInput ? '#38bdf8' : '#475569'}`,
                          background: testVal === '1' ? '#22c55e' : '#1e293b',
                          color: testVal === '1' ? '#000' : '#fff',
                          fontWeight: 900,
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: testVal === '1' ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none',
                        }}
                      >
                        {testVal}
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8' }}>{pinNum}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pin Details Summary Table */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '6px 8px' }}>Pin</th>
                    <th style={{ padding: '6px 8px' }}>Label</th>
                    <th style={{ padding: '6px 8px' }}>Role</th>
                    <th style={{ padding: '6px 8px' }}>Logic Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pinMappings.map((p) => {
                    const isOut = p.type === 'output';
                    const isPow = p.type === 'power';
                    const val = isOut ? testOutputs[p.pin] : testPinInputs[p.pin] ?? (isPow && p.pin === vccPin ? '1' : '0');

                    return (
                      <tr key={p.pin} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '4px 8px', fontWeight: 800 }}>Pin {p.pin}</td>
                        <td style={{ padding: '4px 8px', fontWeight: 800, color: isPow ? '#f59e0b' : isOut ? '#22c55e' : '#38bdf8' }}>{p.name}</td>
                        <td style={{ padding: '4px 8px', textTransform: 'uppercase', fontSize: '10px' }}>{p.type}</td>
                        <td style={{ padding: '4px 8px', fontWeight: 900, color: val === '1' ? '#22c55e' : '#94a3b8' }}>
                          {val === '1' ? 'HIGH (1)' : 'LOW (0)'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Studio Footer Actions */}
        <div className="custom-ic-studio-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: 'var(--bg-panel)', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
            <span className="summary-pill input">📥 {pinMappings.filter((p) => p.type === 'input').length} Inputs</span>
            <span className="summary-pill output">📤 {pinMappings.filter((p) => p.type === 'output').length} Outputs</span>
            <span className="summary-pill power">⚡ {pinMappings.filter((p) => p.type === 'power').length} Power</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="header-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="header-btn" onClick={() => handleSave(false)}>
              💾 Save to IC Vault
            </button>
            <button type="button" className="header-btn primary" onClick={() => handleSave(true)}>
              ✨ Save & Mount to Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomICModal;
