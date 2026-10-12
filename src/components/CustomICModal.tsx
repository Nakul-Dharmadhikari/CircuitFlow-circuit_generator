import React, { useState, useMemo, useEffect, useRef } from 'react';
import type {
  Circuit,
  CustomICDefinition,
  CustomICPinMapping,
  InternalGateUnit,
  LogicValue,
  Pin,
} from '../types/circuit';
import {
  saveUserCustomIC,
  getUserCustomICs,
  downloadCustomICJSON,
} from '../services/customIcStorage';
import { apiSaveCustomIC } from '../services/apiClient';
import { soundFx } from '../audio/soundEffects';
import {
  validateCustomICDefinition,
  validateCustomICJSON,
  type CustomICValidationResult,
} from '../utils/customIcValidator';
import {
  simulateCustomICInputs,
  runTruthTableOrSequentialTest,
  isSequentialCircuit,
  type CustomICTestResult,
} from '../utils/customIcSimulator';
import { CUSTOM_IC_TEMPLATES } from '../utils/customIcTemplates';

interface CustomICModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCircuit?: Circuit;
  userId?: string;
  editingIC?: CustomICDefinition | null;
  onSaveIC: (savedIC: CustomICDefinition, placeOnCanvas?: boolean) => void;
  onMountIC?: (savedIC: CustomICDefinition) => void;
}

type StudioTab = 'internal_circuit' | 'pin_mapping' | 'package' | 'validation' | 'testing';

export const CustomICModal: React.FC<CustomICModalProps> = ({
  isOpen,
  onClose,
  activeCircuit,
  userId = 'guest',
  editingIC,
  onSaveIC,
  onMountIC,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('internal_circuit');

  // Package & metadata state
  const [partNumber, setPartNumber] = useState('74MY-HA');
  const [icName, setIcName] = useState('Half Adder IC');
  const [description, setDescription] = useState('1-bit Half Adder with explicit XOR and AND logic mappings');
  const [pinCount, setPinCount] = useState<14 | 16 | 20>(14);
  const [vccPin, setVccPin] = useState<number>(14);
  const [gndPin, setGndPin] = useState<number>(7);
  const [packageType, setPackageType] = useState<'DIP-14' | 'DIP-16' | 'DIP-20'>('DIP-14');

  // Source of Truth: Internal Circuit
  const [internalCircuit, setInternalCircuit] = useState<Circuit>(() => {
    return CUSTOM_IC_TEMPLATES.half_adder.createDefinition(userId).internalCircuit || { components: [], wires: [] };
  });

  // Explicit Pin Mappings: externalPin -> internalComponentId -> internalPinId
  const [pinMappings, setPinMappings] = useState<CustomICPinMapping[]>(() => {
    return CUSTOM_IC_TEMPLATES.half_adder.createDefinition(userId).pinMappings || [];
  });

  // Legacy gateUnits fallback
  const [gateUnits, setGateUnits] = useState<InternalGateUnit[]>([]);

  // Testing & simulation states
  const [liveTestInputs, setLiveTestInputs] = useState<Record<number, LogicValue>>({});
  const [testResult, setTestResult] = useState<CustomICTestResult | null>(null);
  const [validationResult, setValidationResult] = useState<CustomICValidationResult | null>(null);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or re-populate when opened or editingIC changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingIC) {
      setPartNumber(editingIC.partNumber || editingIC.code || 'CUSTOM_IC');
      setIcName(editingIC.name || 'Custom IC');
      setDescription(editingIC.description || '');
      setPinCount(editingIC.pinCount || 14);
      setVccPin(editingIC.vccPin || (editingIC.pinCount || 14));
      setGndPin(editingIC.gndPin || Math.floor((editingIC.pinCount || 14) / 2));
      setPackageType(editingIC.packageType || (editingIC.pinCount === 20 ? 'DIP-20' : editingIC.pinCount === 16 ? 'DIP-16' : 'DIP-14'));

      if (editingIC.internalCircuit && editingIC.internalCircuit.components?.length > 0) {
        setInternalCircuit(editingIC.internalCircuit);
      } else {
        setInternalCircuit({ components: [], wires: [] });
      }

      setPinMappings(editingIC.pinMappings || editingIC.pins || []);
      setGateUnits(editingIC.gateUnits || []);
      setActiveTab('internal_circuit');
    } else {
      // Default to Half Adder starter template
      const def = CUSTOM_IC_TEMPLATES.half_adder.createDefinition(userId);
      setPartNumber(def.partNumber || '74MY-HA');
      setIcName(def.name);
      setDescription(def.description || '');
      setPinCount(def.pinCount);
      setVccPin(def.vccPin || 14);
      setGndPin(def.gndPin || 7);
      setPackageType('DIP-14');
      setInternalCircuit(def.internalCircuit || { components: [], wires: [] });
      setPinMappings(def.pinMappings || []);
      setGateUnits([]);
      setActiveTab('internal_circuit');
    }

    setTestResult(null);
    setValidationResult(null);
    setImportStatusMessage(null);
    setLiveTestInputs({});
  }, [isOpen, editingIC, userId]);

  // Adjust VCC & GND pins when pinCount changes
  const handlePinCountChange = (newCount: 14 | 16 | 20) => {
    setPinCount(newCount);
    setPackageType(newCount === 20 ? 'DIP-20' : newCount === 16 ? 'DIP-16' : 'DIP-14');
    const newVcc = newCount;
    const newGnd = newCount === 14 ? 7 : newCount === 16 ? 8 : 10;
    setVccPin(newVcc);
    setGndPin(newGnd);

    // Expand or truncate pin mappings list
    setPinMappings((prev) => {
      const updated: CustomICPinMapping[] = [];
      for (let p = 1; p <= newCount; p++) {
        const existing = prev.find((m) => m.pin === p || m.pinNumber === p);
        if (p === newVcc) {
          updated.push({ pin: p, pinNumber: p, name: 'VCC', type: 'power' });
        } else if (p === newGnd) {
          updated.push({ pin: p, pinNumber: p, name: 'GND', type: 'power' });
        } else if (existing) {
          updated.push(existing);
        } else {
          updated.push({ pin: p, pinNumber: p, name: `NC`, type: 'nc' });
        }
      }
      return updated;
    });
  };

  // Build the current CustomICDefinition object
  const currentDefinition = useMemo<CustomICDefinition>(() => {
    const isSeq = isSequentialCircuit(internalCircuit);
    return {
      id: editingIC ? editingIC.id : `custom_ic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      partNumber: partNumber.trim() || 'CUSTOM_IC',
      name: icName.trim() || 'Custom IC',
      code: partNumber.trim() || 'CUSTOM_IC',
      description: description.trim(),
      pinCount,
      vccPin,
      gndPin,
      packageType,
      circuitType: isSeq ? 'sequential' : 'combinational',
      internalCircuit,
      gateUnits: gateUnits.length > 0 ? gateUnits : undefined,
      pins: pinMappings,
      pinMappings,
      createdAt: editingIC?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
  }, [
    editingIC,
    userId,
    partNumber,
    icName,
    description,
    pinCount,
    vccPin,
    gndPin,
    packageType,
    internalCircuit,
    gateUnits,
    pinMappings,
  ]);

  // Run validation whenever definition changes or tab changes
  useEffect(() => {
    if (!isOpen) return;
    const libraryICs = getUserCustomICs(userId);
    const result = validateCustomICDefinition(currentDefinition, libraryICs);
    setValidationResult(result);
  }, [isOpen, currentDefinition, userId]);

  // Compute live test outputs
  const liveTestOutputs = useMemo<Record<number, LogicValue>>(() => {
    return simulateCustomICInputs(currentDefinition, liveTestInputs);
  }, [currentDefinition, liveTestInputs]);

  // Auto-map pins from internal circuit
  const handleAutoMapPins = () => {
    const comps = internalCircuit.components || [];

    // Find input components/nodes
    const inComps: Array<{ compId: string; pinId: string; label: string }> = [];
    comps.forEach((c) => {
      if (c.type === 'input_pin' || c.type === 'toggle' || c.type === 'clock') {
        inComps.push({ compId: c.id, pinId: 'out', label: c.label || c.type || 'IN' });
      }
    });

    // If no explicit input_pin components, pick unconnected input pins
    if (inComps.length === 0) {
      comps.forEach((c) => {
        (c.inputs || []).forEach((pin) => {
          inComps.push({ compId: c.id, pinId: pin.id, label: `${c.label || c.type}_${pin.name}` });
        });
      });
    }

    // Find output components/nodes
    const outComps: Array<{ compId: string; pinId: string; label: string }> = [];
    comps.forEach((c) => {
      if (c.type === 'output_pin' || c.type === 'led' || c.type === 'probe') {
        outComps.push({ compId: c.id, pinId: 'in', label: c.label || c.type || 'OUT' });
      }
    });

    // If no explicit output_pin components, pick gate output pins
    if (outComps.length === 0) {
      comps.forEach((c) => {
        (c.outputs || []).forEach((pin) => {
          outComps.push({ compId: c.id, pinId: pin.id, label: `${c.label || c.type}_${pin.name}` });
        });
      });
    }

    let inIdx = 0;
    let outIdx = 0;

    const nextMappings: CustomICPinMapping[] = [];
    for (let p = 1; p <= pinCount; p++) {
      if (p === vccPin) {
        nextMappings.push({ pin: p, pinNumber: p, name: 'VCC', type: 'power' });
      } else if (p === gndPin) {
        nextMappings.push({ pin: p, pinNumber: p, name: 'GND', type: 'power' });
      } else if (inIdx < inComps.length) {
        const item = inComps[inIdx++];
        nextMappings.push({
          pin: p,
          pinNumber: p,
          name: item.label,
          type: 'input',
          internalComponentId: item.compId,
          internalPinId: item.pinId,
        });
      } else if (outIdx < outComps.length) {
        const item = outComps[outIdx++];
        nextMappings.push({
          pin: p,
          pinNumber: p,
          name: item.label,
          type: 'output',
          internalComponentId: item.compId,
          internalPinId: item.pinId,
        });
      } else {
        nextMappings.push({ pin: p, pinNumber: p, name: 'NC', type: 'nc' });
      }
    }

    setPinMappings(nextMappings);
    soundFx.playButtonTap();
    setImportStatusMessage(`Auto-mapped ${inIdx} input(s) and ${outIdx} output(s) to DIP-${pinCount} pins.`);
  };

  // Import from Active Canvas Circuit
  const handleImportFromActiveCanvas = () => {
    if (!activeCircuit || !activeCircuit.components || activeCircuit.components.length === 0) {
      alert('Active schematic canvas is empty. Place some logic components first!');
      return;
    }

    // Filter out trainer base board components if any
    const pureComps = activeCircuit.components
      .filter((c) => !c.isTrainerFixed && !c.customProps?.trainerMount)
      .map((c) => ({ ...c }));

    const compIds = new Set(pureComps.map((c) => c.id));
    const pureWires = (activeCircuit.wires || []).filter(
      (w) => compIds.has(w.fromCompId) && compIds.has(w.toCompId)
    );

    if (pureComps.length === 0) {
      alert('No user components found on canvas (only fixed trainer modules).');
      return;
    }

    setInternalCircuit({
      components: pureComps,
      wires: pureWires,
    });

    setPartNumber('74MY-CANVAS');
    setIcName('Canvas Subcircuit IC');
    setDescription(`Imported circuit containing ${pureComps.length} components and ${pureWires.length} wires`);

    soundFx.playButtonTap();
    setImportStatusMessage(`Successfully imported ${pureComps.length} component(s) and ${pureWires.length} wire(s) from canvas.`);
  };

  // Load a starter template
  const handleLoadTemplate = (templateKey: string) => {
    const tmpl = CUSTOM_IC_TEMPLATES[templateKey];
    if (!tmpl) return;

    const def = tmpl.createDefinition(userId);
    setPartNumber(def.partNumber || '74MY-TEMPLATE');
    setIcName(def.name);
    setDescription(def.description || '');
    setPinCount(def.pinCount);
    setVccPin(def.vccPin || 14);
    setGndPin(def.gndPin || 7);
    setPackageType(def.packageType || 'DIP-14');
    setInternalCircuit(def.internalCircuit || { components: [], wires: [] });
    setPinMappings(def.pinMappings || []);
    setGateUnits([]);
    setTestResult(null);
    soundFx.playButtonTap();
    setImportStatusMessage(`Loaded template: ${tmpl.name}`);
  };

  // Handle Export to JSON
  const handleExportJSON = () => {
    downloadCustomICJSON(currentDefinition);
    soundFx.playButtonTap();
  };

  // Handle Import from JSON file
  const handleImportJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = validateCustomICJSON(content);
      if (!res.valid || !res.ic) {
        alert(`Failed to import Custom IC JSON:\n\n• ${res.errors.join('\n• ')}`);
        return;
      }

      const imported = res.ic;
      setPartNumber(imported.partNumber || imported.code || 'CUSTOM_IC');
      setIcName(imported.name || 'Imported IC');
      setDescription(imported.description || '');
      setPinCount(imported.pinCount || 14);
      setVccPin(imported.vccPin || (imported.pinCount || 14));
      setGndPin(imported.gndPin || Math.floor((imported.pinCount || 14) / 2));
      setPackageType(imported.packageType || (imported.pinCount === 20 ? 'DIP-20' : imported.pinCount === 16 ? 'DIP-16' : 'DIP-14'));
      setInternalCircuit(imported.internalCircuit || { components: [], wires: [] });
      setPinMappings(imported.pinMappings || imported.pins || []);
      setGateUnits(imported.gateUnits || []);
      setTestResult(null);

      soundFx.playButtonTap();
      setImportStatusMessage(`Successfully imported Custom IC: "${imported.name}"`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Run Test Verification
  const handleRunVerificationTest = () => {
    soundFx.playButtonTap();
    const result = runTruthTableOrSequentialTest(currentDefinition);
    setTestResult(result);
  };

  // Toggle Live Test Input Pin
  const handleToggleTestPin = (pNum: number) => {
    const cur = liveTestInputs[pNum] ?? '0';
    const next = cur === '1' ? '0' : '1';
    setLiveTestInputs({ ...liveTestInputs, [pNum]: next });
    soundFx.playSwitchClick(next === '1');
  };

  // Update a specific pin mapping
  const handleUpdatePinMapping = (pinNum: number, updates: Partial<CustomICPinMapping>) => {
    setPinMappings((prev) =>
      prev.map((p) => {
        if (p.pin !== pinNum && p.pinNumber !== pinNum) return p;
        return { ...p, ...updates };
      })
    );
  };

  // Save the custom IC definition
  const handleSave = async (placeOnCanvas = false) => {
    const libraryICs = getUserCustomICs(userId);
    const val = validateCustomICDefinition(currentDefinition, libraryICs);
    if (!val.valid) {
      alert(`Cannot save Custom IC due to validation errors:\n\n• ${val.errors.join('\n• ')}`);
      setActiveTab('validation');
      return;
    }

    try {
      saveUserCustomIC(currentDefinition);
    } catch (saveErr: any) {
      alert(`Failed to save Custom IC: ${saveErr?.message || 'Storage error'}`);
      return;
    }

    try {
      await apiSaveCustomIC(currentDefinition);
    } catch {
      // Offline fallback
    }

    soundFx.playButtonTap();
    onSaveIC(currentDefinition, placeOnCanvas);
    onClose();
  };

  // Mount directly to trainer socket
  const handleMountToSocket = () => {
    const libraryICs = getUserCustomICs(userId);
    const val = validateCustomICDefinition(currentDefinition, libraryICs);
    if (!val.valid) {
      alert(`Cannot mount Custom IC due to validation errors:\n\n• ${val.errors.join('\n• ')}`);
      setActiveTab('validation');
      return;
    }

    try {
      saveUserCustomIC(currentDefinition);
    } catch (saveErr: any) {
      alert(`Failed to save Custom IC: ${saveErr?.message || 'Storage error'}`);
      return;
    }

    soundFx.playButtonTap();

    if (onMountIC) {
      onMountIC(currentDefinition);
    } else {
      onSaveIC(currentDefinition, false);
      alert('Custom IC saved to My Components. You can now mount it from the IC Socket dropdown!');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="custom-ic-modal-overlay" onClick={onClose}>
      <div
        className="custom-ic-modal-studio"
        style={{ width: '96vw', maxWidth: '1360px', height: '94vh', maxHeight: '94vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Studio Top Header */}
        <div className="custom-ic-studio-header">
          <div className="studio-title-block">
            <div className="studio-icon-badge">📐</div>
            <div>
              <div className="studio-title-row">
                <h2 className="studio-heading">CUSTOM IC STUDIO</h2>
                <span className="studio-package-pill">{packageType}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    color: currentDefinition.circuitType === 'sequential' ? '#f59e0b' : '#34d399',
                    background: 'rgba(0,0,0,0.25)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {(currentDefinition.circuitType || 'combinational').toUpperCase()}
                </span>
              </div>
              <p className="studio-subtext">
                Build internal circuit logic, bind explicit external pins, validate topology, and deploy reusable DIP chips
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleImportJSONFile}
            />
            <button
              type="button"
              className="batch-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Import IC from JSON file"
            >
              📥 Import JSON
            </button>
            <button
              type="button"
              className="batch-btn"
              onClick={handleExportJSON}
              title="Export IC to JSON file"
            >
              📤 Export JSON
            </button>
            <button
              type="button"
              className="custom-ic-close-btn"
              onClick={onClose}
              title="Close Custom IC Studio"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Studio Navigation Stage Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 20px',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div className="studio-nav-tabs">
            <button
              type="button"
              className={`studio-nav-tab ${activeTab === 'internal_circuit' ? 'active' : ''}`}
              onClick={() => setActiveTab('internal_circuit')}
            >
              <span>1. Internal Circuit</span>
              <span className="studio-nav-tab-badge">
                {internalCircuit.components?.length || 0} Comps
              </span>
            </button>
            <button
              type="button"
              className={`studio-nav-tab ${activeTab === 'pin_mapping' ? 'active' : ''}`}
              onClick={() => setActiveTab('pin_mapping')}
            >
              <span>2. External Pin Mapping</span>
              <span className="studio-nav-tab-badge">{pinCount} Pins</span>
            </button>
            <button
              type="button"
              className={`studio-nav-tab ${activeTab === 'package' ? 'active' : ''}`}
              onClick={() => setActiveTab('package')}
            >
              <span>3. Package & Appearance</span>
            </button>
            <button
              type="button"
              className={`studio-nav-tab ${activeTab === 'validation' ? 'active' : ''}`}
              onClick={() => setActiveTab('validation')}
            >
              <span>4. Validation & Errors</span>
              {validationResult && (
                <span
                  className="studio-nav-tab-badge"
                  style={{
                    background: validationResult.valid ? '#10b981' : '#ef4444',
                    color: '#fff',
                  }}
                >
                  {validationResult.errors.length}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`studio-nav-tab ${activeTab === 'testing' ? 'active' : ''}`}
              onClick={() => setActiveTab('testing')}
            >
              <span>5. Verification & Test</span>
            </button>
          </div>

          {importStatusMessage && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--accent-copper)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>✨ {importStatusMessage}</span>
              <button
                type="button"
                onClick={() => setImportStatusMessage(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Studio Main Workspace Body */}
        <div className="custom-ic-studio-workspace" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* TAB 1: INTERNAL LOGIC CIRCUIT */}
          {activeTab === 'internal_circuit' && (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '360px 1fr', overflow: 'hidden' }}>
              <div className="studio-sidebar-pane">
                <div className="studio-card">
                  <div className="studio-card-title-row">
                    <span className="studio-card-title">SOURCE OF TRUTH</span>
                    <span className="studio-hint-pill">internalCircuit</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                    New Custom ICs execute their actual internal circuit graph rather than legacy gate units.
                  </p>

                  <div className="studio-source-toggle-row">
                    <button
                      type="button"
                      className="source-toggle-btn"
                      onClick={handleImportFromActiveCanvas}
                    >
                      <span className="source-btn-icon">⚡</span>
                      <div className="source-btn-text">
                        <strong>Use Active Canvas Circuit</strong>
                        <small>Import currently placed schematic gates and wires</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="source-toggle-btn"
                      onClick={() => handleAutoMapPins()}
                    >
                      <span className="source-btn-icon">🔄</span>
                      <div className="source-btn-text">
                        <strong>Auto-Map Interface Pins</strong>
                        <small>Scan internal inputs/outputs and map to DIP pins</small>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="studio-card">
                  <span className="studio-card-title">STARTER TEMPLATES</span>
                  <div className="studio-presets-grid" style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      className="preset-btn"
                      onClick={() => handleLoadTemplate('half_adder')}
                    >
                      ➕ Half Adder
                    </button>
                    <button
                      type="button"
                      className="preset-btn"
                      onClick={() => handleLoadTemplate('mux_2to1')}
                    >
                      ➕ 2:1 Multiplexer
                    </button>
                    <button
                      type="button"
                      className="preset-btn"
                      onClick={() => handleLoadTemplate('d_flipflop')}
                    >
                      ➕ D Flip-Flop
                    </button>
                    <button
                      type="button"
                      className="preset-btn"
                      onClick={() => handleLoadTemplate('quad_and')}
                    >
                      ➕ Quad 2-In AND
                    </button>
                  </div>
                </div>

                <div className="studio-card">
                  <span className="studio-card-title">INTERNAL CIRCUIT METRICS</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Components:</span>
                      <strong>{internalCircuit.components?.length || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Internal Wires:</span>
                      <strong>{internalCircuit.wires?.length || 0}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Circuit Type:</span>
                      <strong style={{ color: currentDefinition.circuitType === 'sequential' ? '#f59e0b' : '#34d399' }}>
                        {(currentDefinition.circuitType || 'combinational').toUpperCase()}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    INTERNAL COMPONENT INVENTORY ({internalCircuit.components?.length || 0})
                  </h3>
                  <button
                    type="button"
                    className="header-btn primary"
                    onClick={() => setActiveTab('pin_mapping')}
                    style={{ fontSize: '11px', padding: '4px 12px' }}
                  >
                    Next: Define Pin Mappings ➔
                  </button>
                </div>

                <div className="studio-table-container" style={{ maxHeight: '320px' }}>
                  <table className="studio-inventory-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Label</th>
                        <th>Inputs</th>
                        <th>Outputs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(internalCircuit.components || []).map((comp) => (
                        <tr key={comp.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)' }}>
                            {comp.id}
                          </td>
                          <td style={{ fontWeight: 800, color: 'var(--accent-copper)' }}>
                            {comp.type}
                          </td>
                          <td>{comp.label || comp.type}</td>
                          <td>
                            {(comp.inputs || []).map((p) => p.name || p.id).join(', ') || 'None'}
                          </td>
                          <td>
                            {(comp.outputs || []).map((p) => p.name || p.id).join(', ') || 'None'}
                          </td>
                        </tr>
                      ))}
                      {(!internalCircuit.components || internalCircuit.components.length === 0) && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No internal logic components loaded yet. Click "Use Active Canvas Circuit" or pick a template!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <h4 style={{ margin: '10px 0 0', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  INTERNAL NETLIST CONNECTIONS ({internalCircuit.wires?.length || 0})
                </h4>
                <div className="studio-table-container" style={{ maxHeight: '240px' }}>
                  <table className="studio-inventory-table">
                    <thead>
                      <tr>
                        <th>Wire ID</th>
                        <th>Source Component</th>
                        <th>Source Pin</th>
                        <th>Target Component</th>
                        <th>Target Pin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(internalCircuit.wires || []).map((w) => (
                        <tr key={w.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{w.id}</td>
                          <td>{w.fromCompId}</td>
                          <td style={{ fontWeight: 700, color: '#38bdf8' }}>{w.fromPinId}</td>
                          <td>{w.toCompId}</td>
                          <td style={{ fontWeight: 700, color: '#38bdf8' }}>{w.toPinId}</td>
                        </tr>
                      ))}
                      {(!internalCircuit.wires || internalCircuit.wires.length === 0) && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                            No internal wires present.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXPLICIT PIN MAPPING */}
          {activeTab === 'pin_mapping' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', overflow: 'hidden' }}>
              <div className="matrix-toolbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    EXPLICIT PIN MAPPING MATRIX
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Mapping format: <code>externalPin → internalComponentId → internalPinId</code>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="batch-btn"
                    onClick={handleAutoMapPins}
                  >
                    🔄 Auto-Map From Circuit
                  </button>
                  <button
                    type="button"
                    className="header-btn primary"
                    onClick={() => setActiveTab('package')}
                    style={{ fontSize: '11px', padding: '4px 12px' }}
                  >
                    Next: Package Preview ➔
                  </button>
                </div>
              </div>

              <div className="studio-table-container" style={{ flex: 1 }}>
                <table className="studio-pin-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>Pin #</th>
                      <th style={{ width: '130px' }}>Pin Label</th>
                      <th style={{ width: '110px' }}>Direction</th>
                      <th style={{ width: '70px', textAlign: 'center' }}>Inverted</th>
                      <th>Mapped Internal Component</th>
                      <th>Mapped Internal Pin</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pinMappings.map((pMap) => {
                      const pNum = pMap.pinNumber ?? pMap.pin;
                      const isVcc = pNum === vccPin;
                      const isGnd = pNum === gndPin;
                      const isPower = isVcc || isGnd;

                      const comps = internalCircuit.components || [];
                      const selectedComp = comps.find((c) => c.id === pMap.internalComponentId);

                      const availablePins: Pin[] = selectedComp
                        ? pMap.type === 'output'
                          ? selectedComp.outputs || []
                          : selectedComp.inputs || []
                        : [];

                      const allCompPins = selectedComp
                        ? [...(selectedComp.inputs || []), ...(selectedComp.outputs || [])]
                        : [];

                      const hasValidTarget =
                        isPower ||
                        pMap.type === 'nc' ||
                        (Boolean(pMap.internalComponentId) && Boolean(pMap.internalPinId));

                      return (
                        <tr key={pNum} className="pin-matrix-row">
                          <td>
                            <span className={`matrix-pin-badge ${pMap.type}`}>
                              {pNum}
                            </span>
                          </td>

                          <td>
                            <input
                              type="text"
                              className="matrix-name-input"
                              value={pMap.name || ''}
                              disabled={isPower}
                              onChange={(e) =>
                                handleUpdatePinMapping(pNum, { name: e.target.value.toUpperCase() })
                              }
                              placeholder={isVcc ? 'VCC' : isGnd ? 'GND' : `PIN ${pNum}`}
                            />
                          </td>

                          <td>
                            <select
                              className="matrix-type-select"
                              value={pMap.type}
                              disabled={isPower}
                              onChange={(e) =>
                                handleUpdatePinMapping(pNum, {
                                  type: e.target.value as 'input' | 'output' | 'power' | 'nc',
                                })
                              }
                            >
                              <option value="input">INPUT</option>
                              <option value="output">OUTPUT</option>
                              <option value="power">POWER</option>
                              <option value="nc">NC</option>
                            </select>
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={Boolean(pMap.inverted)}
                              disabled={isPower || pMap.type === 'nc'}
                              onChange={(e) =>
                                handleUpdatePinMapping(pNum, { inverted: e.target.checked })
                              }
                            />
                          </td>

                          <td>
                            {isPower || pMap.type === 'nc' ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                {isPower ? 'External Supply' : 'Unconnected'}
                              </span>
                            ) : (
                              <select
                                className="matrix-binding-select"
                                value={pMap.internalComponentId || ''}
                                onChange={(e) => {
                                  const compId = e.target.value;
                                  const targetC = comps.find((c) => c.id === compId);
                                  const defaultPinId =
                                    pMap.type === 'output'
                                      ? targetC?.outputs?.[0]?.id || 'out'
                                      : targetC?.inputs?.[0]?.id || 'in';
                                  handleUpdatePinMapping(pNum, {
                                    internalComponentId: compId || undefined,
                                    internalPinId: defaultPinId,
                                  });
                                }}
                              >
                                <option value="">-- Select Internal Component --</option>
                                {comps.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label || c.type} ({c.id})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>

                          <td>
                            {isPower || pMap.type === 'nc' ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>-</span>
                            ) : (
                              <select
                                className="matrix-binding-select"
                                value={pMap.internalPinId || ''}
                                disabled={!pMap.internalComponentId}
                                onChange={(e) =>
                                  handleUpdatePinMapping(pNum, {
                                    internalPinId: e.target.value || undefined,
                                  })
                                }
                              >
                                <option value="">-- Select Pin --</option>
                                {(availablePins.length > 0 ? availablePins : allCompPins).map((pin) => (
                                  <option key={pin.id} value={pin.id}>
                                    Pin: {pin.name || pin.id} ({pin.type})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            {hasValidTarget ? (
                              <span style={{ color: '#10b981', fontWeight: 900 }}>✓</span>
                            ) : (
                              <span style={{ color: '#f59e0b', fontWeight: 900 }} title="Unmapped interface pin">
                                ⚠
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PACKAGE & APPEARANCE */}
          {activeTab === 'package' && (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '400px 1fr', overflow: 'hidden' }}>
              <div className="studio-sidebar-pane">
                <div className="studio-card">
                  <span className="studio-card-title">IDENTIFICATION</span>
                  <div className="studio-form-field">
                    <label className="studio-label">PART NUMBER / CHIP CODE</label>
                    <input
                      type="text"
                      className="studio-input mono uppercase"
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. 74MY01"
                    />
                  </div>
                  <div className="studio-form-field">
                    <label className="studio-label">IC NAME / TITLE</label>
                    <input
                      type="text"
                      className="studio-input"
                      value={icName}
                      onChange={(e) => setIcName(e.target.value)}
                      placeholder="e.g. Quad 2-Input AND"
                    />
                  </div>
                  <div className="studio-form-field">
                    <label className="studio-label">FUNCTIONAL DESCRIPTION</label>
                    <textarea
                      className="studio-textarea"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe pin behavior, operation, and inputs/outputs..."
                    />
                  </div>
                </div>

                <div className="studio-card">
                  <span className="studio-card-title">PACKAGE CONFIGURATION</span>
                  <div className="studio-form-field">
                    <label className="studio-label">DIP PIN COUNT</label>
                    <div className="studio-pkg-toggle-group">
                      <button
                        type="button"
                        className={`pkg-toggle-btn ${pinCount === 14 ? 'active' : ''}`}
                        onClick={() => handlePinCountChange(14)}
                      >
                        14-PIN DIP
                      </button>
                      <button
                        type="button"
                        className={`pkg-toggle-btn ${pinCount === 16 ? 'active' : ''}`}
                        onClick={() => handlePinCountChange(16)}
                      >
                        16-PIN DIP
                      </button>
                      <button
                        type="button"
                        className={`pkg-toggle-btn ${pinCount === 20 ? 'active' : ''}`}
                        onClick={() => handlePinCountChange(20)}
                      >
                        20-PIN DIP (TRAINER)
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="studio-form-field">
                      <label className="studio-label">VCC (+5V) PIN</label>
                      <select
                        className="studio-input mono"
                        value={vccPin}
                        onChange={(e) => setVccPin(Number(e.target.value))}
                      >
                        {Array.from({ length: pinCount }, (_, i) => i + 1).map((p) => (
                          <option key={p} value={p}>
                            Pin {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="studio-form-field">
                      <label className="studio-label">GND PIN</label>
                      <select
                        className="studio-input mono"
                        value={gndPin}
                        onChange={(e) => setGndPin(Number(e.target.value))}
                      >
                        {Array.from({ length: pinCount }, (_, i) => i + 1).map((p) => (
                          <option key={p} value={p}>
                            Pin {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  AUTHENTIC DUAL IN-LINE PACKAGE (DIP-{pinCount})
                </h3>

                <div
                  style={{
                    background: '#090d16',
                    padding: '40px 30px',
                    borderRadius: '12px',
                    border: '2px solid #334155',
                    width: '100%',
                    maxWidth: '560px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
                    {Array.from({ length: pinCount / 2 }, (_, i) => pinCount - i).map((pNum) => {
                      const pMap = pinMappings.find((m) => m.pin === pNum || m.pinNumber === pNum);
                      const isVcc = pNum === vccPin;
                      const isGnd = pNum === gndPin;
                      const isOut = pMap?.type === 'output';
                      const isIn = pMap?.type === 'input';

                      return (
                        <div
                          key={pNum}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#94a3b8' }}>
                            {pNum}
                          </span>
                          <div
                            style={{
                              width: '28px',
                              height: '24px',
                              background: isVcc || isGnd ? '#b91c1c' : isOut ? '#047857' : isIn ? '#1e293b' : '#334155',
                              border: `1.5px solid ${isVcc || isGnd ? '#f87171' : isOut ? '#10b981' : isIn ? 'var(--accent-copper)' : '#64748b'}`,
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 900,
                              color: '#fff',
                            }}
                          >
                            {pMap?.name?.substring(0, 3) || pNum}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      height: '64px',
                      background: '#192333',
                      border: '2px solid #334155',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: '-8px',
                        width: '16px',
                        height: '24px',
                        borderRadius: '0 12px 12px 0',
                        background: '#090d16',
                        border: '1.5px solid #334155',
                        borderLeft: 'none',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: '14px',
                        bottom: '10px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#10b981',
                      }}
                    />
                    <div style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '16px',
                          fontWeight: 900,
                          letterSpacing: '2px',
                          color: '#f8fafc',
                        }}
                      >
                        {partNumber}
                      </span>
                      <div style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '0.5px' }}>
                        {icName}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
                    {Array.from({ length: pinCount / 2 }, (_, i) => i + 1).map((pNum) => {
                      const pMap = pinMappings.find((m) => m.pin === pNum || m.pinNumber === pNum);
                      const isVcc = pNum === vccPin;
                      const isGnd = pNum === gndPin;
                      const isOut = pMap?.type === 'output';
                      const isIn = pMap?.type === 'input';

                      return (
                        <div
                          key={pNum}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <div
                            style={{
                              width: '28px',
                              height: '24px',
                              background: isVcc || isGnd ? '#b91c1c' : isOut ? '#047857' : isIn ? '#1e293b' : '#334155',
                              border: `1.5px solid ${isVcc || isGnd ? '#f87171' : isOut ? '#10b981' : isIn ? 'var(--accent-copper)' : '#64748b'}`,
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 900,
                              color: '#fff',
                            }}
                          >
                            {pMap?.name?.substring(0, 3) || pNum}
                          </div>
                          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#94a3b8' }}>
                            {pNum}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  className="header-btn primary"
                  onClick={() => setActiveTab('validation')}
                  style={{ fontSize: '12px', padding: '6px 18px' }}
                >
                  Next: Validate & Check Errors ➔
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: VALIDATION & DIAGNOSTICS */}
          {activeTab === 'validation' && (
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    ARCHITECTURAL VALIDATION & RULE AUDIT
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Deep inspection of package bounds, VCC/GND isolation, explicit pin mappings, wire endpoints, and cycle detection.
                  </p>
                </div>

                <button
                  type="button"
                  className="header-btn primary"
                  onClick={() => setActiveTab('testing')}
                  style={{ fontSize: '11px', padding: '5px 14px' }}
                >
                  Proceed to Live Testing ➔
                </button>
              </div>

              {validationResult?.valid ? (
                <div className="studio-validation-card success">
                  <span style={{ fontSize: '20px' }}>✅</span>
                  <div>
                    <strong style={{ fontSize: '13px' }}>Custom IC Definition is 100% Valid</strong>
                    <div>All external pin mappings resolve to authentic internal nodes with zero circular dependencies.</div>
                  </div>
                </div>
              ) : (
                <div className="studio-validation-card error">
                  <span style={{ fontSize: '20px' }}>❌</span>
                  <div>
                    <strong style={{ fontSize: '13px' }}>
                      Validation Failed ({validationResult?.errors.length || 0} Error(s))
                    </strong>
                    <div>Actionable corrections required before saving or placing this IC:</div>
                  </div>
                </div>
              )}

              <div className="studio-validation-report">
                {(validationResult?.errors || []).map((err: string, idx: number) => (
                  <div key={idx} className="studio-validation-card error">
                    <span style={{ fontWeight: 900 }}>•</span>
                    <div>{err}</div>
                  </div>
                ))}

                {(validationResult?.warnings || []).map((warn: string, idx: number) => (
                  <div key={idx} className="studio-validation-card warning">
                    <span style={{ fontWeight: 900 }}>⚠</span>
                    <div>{warn}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: TESTING & VERIFICATION */}
          {activeTab === 'testing' && (
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '420px 1fr', overflow: 'hidden' }}>
              <div className="studio-sidebar-pane">
                <div className="studio-card">
                  <div className="studio-card-title-row">
                    <span className="studio-card-title">LIVE PIN INTERACTION</span>
                    <span className="studio-hint-pill">Interactive</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                    Click input pins below to toggle logic levels and watch real-time simulated outputs!
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#090d16', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {Array.from({ length: pinCount / 2 }, (_, i) => pinCount - i).map((pNum) => {
                        const pMap = pinMappings.find((m) => m.pin === pNum || m.pinNumber === pNum);
                        const isOut = pMap?.type === 'output';
                        const isIn = pMap?.type === 'input';
                        const isPower = pNum === vccPin || pNum === gndPin;
                        const val = isOut ? liveTestOutputs[pNum] : liveTestInputs[pNum] ?? (pNum === vccPin ? '1' : '0');

                        return (
                          <div
                            key={pNum}
                            onClick={() => isIn && handleToggleTestPin(pNum)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              cursor: isIn ? 'pointer' : 'default',
                              gap: '2px',
                            }}
                          >
                            <span style={{ fontSize: '9px', color: '#94a3b8' }}>{pNum}</span>
                            <div
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '4px',
                                background: val === '1' ? '#10b981' : '#1e293b',
                                color: val === '1' ? '#000' : '#fff',
                                fontWeight: 900,
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1.5px solid ${isPower ? '#f87171' : isOut ? '#10b981' : isIn ? 'var(--accent-copper)' : '#475569'}`,
                              }}
                            >
                              {val}
                            </div>
                            <span style={{ fontSize: '8px', fontWeight: 800, color: isPower ? '#f87171' : isOut ? '#10b981' : isIn ? 'var(--accent-copper)' : '#64748b' }}>
                              {pMap?.name || ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ textAlign: 'center', padding: '4px', background: '#192333', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '11px', color: '#f8fafc' }}>
                      {partNumber}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      {Array.from({ length: pinCount / 2 }, (_, i) => i + 1).map((pNum) => {
                        const pMap = pinMappings.find((m) => m.pin === pNum || m.pinNumber === pNum);
                        const isOut = pMap?.type === 'output';
                        const isIn = pMap?.type === 'input';
                        const isPower = pNum === vccPin || pNum === gndPin;
                        const val = isOut ? liveTestOutputs[pNum] : liveTestInputs[pNum] ?? (pNum === vccPin ? '1' : '0');

                        return (
                          <div
                            key={pNum}
                            onClick={() => isIn && handleToggleTestPin(pNum)}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              cursor: isIn ? 'pointer' : 'default',
                              gap: '2px',
                            }}
                          >
                            <span style={{ fontSize: '8px', fontWeight: 800, color: isPower ? '#f87171' : isOut ? '#10b981' : isIn ? 'var(--accent-copper)' : '#64748b' }}>
                              {pMap?.name || ''}
                            </span>
                            <div
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '4px',
                                background: val === '1' ? '#10b981' : '#1e293b',
                                color: val === '1' ? '#000' : '#fff',
                                fontWeight: 900,
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1.5px solid ${isPower ? '#f87171' : isOut ? '#10b981' : isIn ? 'var(--accent-copper)' : '#475569'}`,
                              }}
                            >
                              {val}
                            </div>
                            <span style={{ fontSize: '9px', color: '#94a3b8' }}>{pNum}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="header-btn primary"
                  onClick={handleRunVerificationTest}
                  style={{ width: '100%', padding: '10px', fontSize: '12px' }}
                >
                  🚀 Run Complete Truth Table / Test
                </button>
              </div>

              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {testResult?.circuitType === 'sequential'
                      ? 'SEQUENTIAL CLOCKED STATE RUNNER'
                      : 'AUTOMATED COMBINATIONAL TRUTH TABLE'}
                  </h3>

                  {testResult && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: testResult.passed ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {testResult.passed ? '✅ VERIFIED VALID' : '⚠ TEST WARNINGS'}
                    </span>
                  )}
                </div>

                {testResult ? (
                  <div className="studio-table-container">
                    <table className="truth-table">
                      <thead>
                        <tr>
                          {testResult.inputPinNumbers.map((pNum: number) => (
                            <th key={`in_${pNum}`} className="in-col">
                              Pin {pNum} ({testResult.inputNames[pNum]})
                            </th>
                          ))}
                          {testResult.circuitType === 'sequential' && (
                            <th style={{ background: '#3b82f6', color: '#fff' }}>CLK Step</th>
                          )}
                          {testResult.outputPinNumbers.map((pNum: number) => (
                            <th key={`out_${pNum}`} className="out-col">
                              Pin {pNum} ({testResult.outputNames[pNum]})
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {testResult.truthTableRows.map((row, rIdx: number) => (
                          <tr key={rIdx}>
                            {testResult.inputPinNumbers.map((pNum: number) => (
                              <td
                                key={`r_in_${pNum}`}
                                className={row.inputs[String(pNum)] === '1' ? 'bit-1' : 'bit-0'}
                              >
                                {row.inputs[String(pNum)] ?? '0'}
                              </td>
                            ))}
                            {testResult.circuitType === 'sequential' && (
                              <td style={{ fontWeight: 800, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                                T{rIdx}
                              </td>
                            )}
                            {testResult.outputPinNumbers.map((pNum: number) => (
                              <td
                                key={`r_out_${pNum}`}
                                className={row.outputs[String(pNum)] === '1' ? 'bit-1' : 'bit-0'}
                              >
                                {row.outputs[String(pNum)] ?? '0'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', border: '2px dashed var(--border-subtle)', borderRadius: '8px' }}>
                    Click "Run Complete Truth Table / Test" to permute all inputs and verify logic against the internal circuit model.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Studio Bottom Footer */}
        <div className="custom-ic-studio-footer">
          <div className="footer-summary-pills">
            <span className="summary-pill input">
              📥 {pinMappings.filter((p) => p.type === 'input').length} Inputs
            </span>
            <span className="summary-pill output">
              📤 {pinMappings.filter((p) => p.type === 'output').length} Outputs
            </span>
            <span className="summary-pill power">
              ⚡ VCC Pin {vccPin} / GND Pin {gndPin}
            </span>
            {validationResult?.valid ? (
              <span className="summary-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                ✓ Ready to Deploy
              </span>
            ) : (
              <span className="summary-pill" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                ⚠ {validationResult?.errors.length || 0} Error(s)
              </span>
            )}
          </div>

          <div className="footer-action-buttons">
            <button type="button" className="header-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="header-btn"
              onClick={() => handleSave(false)}
              disabled={Boolean(validationResult && !validationResult.valid)}
            >
              💾 Save to My Components
            </button>
            <button
              type="button"
              className="header-btn"
              onClick={handleMountToSocket}
              disabled={Boolean(validationResult && !validationResult.valid)}
              title="Mount directly into 20-Pin trainer board socket"
            >
              🔌 Mount in Trainer Socket
            </button>
            <button
              type="button"
              className="header-btn primary"
              onClick={() => handleSave(true)}
              disabled={Boolean(validationResult && !validationResult.valid)}
            >
              ✨ Save & Place on Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomICModal;
