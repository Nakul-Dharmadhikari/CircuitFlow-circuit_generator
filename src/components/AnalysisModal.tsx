import React, { useState, useMemo, useEffect } from 'react';
import type { Circuit, CustomICDefinition } from '../types/circuit';
import {
  analyzeCircuitOverview,
  runCircuitDiagnostics,
  generateUnifiedTruthTable,
  generateKMap,
  analyzeSequentialCircuit,
  runTestBench,
  runTimingSimulation,
  type TestCaseVector,
} from '../engine/analysis';

export type AnalysisTab =
  | 'overview'
  | 'truth_table'
  | 'kmap'
  | 'timing'
  | 'sequential'
  | 'testbench'
  | 'diagnostics';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  circuit: Circuit;
  customICs?: CustomICDefinition[];
  initialTab?: AnalysisTab;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  onClose,
  circuit,
  customICs = [],
  initialTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>(initialTab);
  const [targetType, setTargetType] = useState<'schematic' | 'trainer' | 'custom_ic'>('schematic');
  const [selectedCustomIcId, setSelectedCustomIcId] = useState<string>(customICs[0]?.id || '');
  const [selectedKMapOutput, setSelectedKMapOutput] = useState<string>('');
  const [timingStepCount, setTimingStepCount] = useState<number>(16);
  const [forceLargeTruthTable, setForceLargeTruthTable] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Default test bench vectors state
  const [customVectors, setCustomVectors] = useState<TestCaseVector[]>([
    { id: 'v1', name: 'Vector 1: All Inputs Low', inputs: {}, expectedOutputs: {} },
    { id: 'v2', name: 'Vector 2: Active Stimulus', inputs: {}, expectedOutputs: {} },
  ]);

  const handleAddBenchVector = () => {
    const nextNum = customVectors.length + 1;
    setCustomVectors((prev) => [
      ...prev,
      {
        id: `v_${Date.now()}`,
        name: `Vector ${nextNum}`,
        inputs: {},
        expectedOutputs: {},
      },
    ]);
  };

  const handleAddFailingVector = () => {
    const nextNum = customVectors.length + 1;
    const outName = truthTable?.outputNames?.[0] || 'Out';
    setCustomVectors((prev) => [
      ...prev,
      {
        id: `v_fail_${Date.now()}`,
        name: `Vector ${nextNum} (Deliberate Mismatch)`,
        inputs: {},
        expectedOutputs: { [outName]: '1' },
      },
    ]);
  };

  const handleResetBenchVectors = () => {
    setCustomVectors([
      { id: 'v1', name: 'Vector 1: All Inputs Low', inputs: {}, expectedOutputs: {} },
      { id: 'v2', name: 'Vector 2: Active Stimulus', inputs: {}, expectedOutputs: {} },
    ]);
  };

  // Determine current target to analyze
  const targetDefinition = useMemo(() => {
    if (targetType === 'custom_ic') {
      return customICs.find((ic) => ic.id === selectedCustomIcId) || customICs[0];
    }
    return circuit;
  }, [targetType, selectedCustomIcId, customICs, circuit]);

  // 1. Overview facts
  const overview = useMemo(() => {
    if (!isOpen) return null;
    if (targetType === 'custom_ic' && targetDefinition && 'internalCircuit' in targetDefinition) {
      return analyzeCircuitOverview((targetDefinition as CustomICDefinition).internalCircuit || { components: [], wires: [] });
    }
    return analyzeCircuitOverview(circuit);
  }, [isOpen, targetType, targetDefinition, circuit]);

  // 2. Diagnostics
  const diagnostics = useMemo(() => {
    if (!isOpen) return null;
    if (targetType === 'custom_ic' && targetDefinition && 'internalCircuit' in targetDefinition) {
      return runCircuitDiagnostics((targetDefinition as CustomICDefinition).internalCircuit || { components: [], wires: [] });
    }
    return runCircuitDiagnostics(circuit);
  }, [isOpen, targetType, targetDefinition, circuit]);

  // 3. Truth table
  const truthTable = useMemo(() => {
    if (!isOpen || !targetDefinition) return null;
    return generateUnifiedTruthTable(targetDefinition, {
      sourceType: targetType,
      maxInputs: 6,
      forceGenerateLarge: forceLargeTruthTable,
    });
  }, [isOpen, targetDefinition, targetType, forceLargeTruthTable]);

  // 4. Karnaugh map
  const kmapData = useMemo(() => {
    if (!isOpen || !truthTable || !truthTable.valid) return null;
    return generateKMap(truthTable as any, selectedKMapOutput);
  }, [isOpen, truthTable, selectedKMapOutput]);

  // 5. Sequential analysis
  const seqAnalysis = useMemo(() => {
    if (!isOpen || !targetDefinition) return null;
    if (targetType === 'custom_ic' && 'internalCircuit' in targetDefinition) {
      return analyzeSequentialCircuit((targetDefinition as CustomICDefinition).internalCircuit || { components: [], wires: [] }, { stepsCount: 8 });
    }
    return analyzeSequentialCircuit(circuit, { stepsCount: 8 });
  }, [isOpen, targetDefinition, targetType, circuit]);

  // 6. Test bench results
  const testBenchResults = useMemo(() => {
    if (!isOpen || !targetDefinition) return null;
    const testTarget = targetType === 'custom_ic' && 'internalCircuit' in targetDefinition
      ? (targetDefinition as CustomICDefinition).internalCircuit || { components: [], wires: [] }
      : circuit;
    return runTestBench(testTarget, customVectors);
  }, [isOpen, targetDefinition, targetType, circuit, customVectors]);

  // 7. Timing analysis
  const timingData = useMemo(() => {
    if (!isOpen || !targetDefinition) return null;
    const timingTarget = targetType === 'custom_ic' && 'internalCircuit' in targetDefinition
      ? (targetDefinition as CustomICDefinition).internalCircuit || { components: [], wires: [] }
      : circuit;
    return runTimingSimulation(timingTarget, { steps: timingStepCount });
  }, [isOpen, targetDefinition, targetType, circuit, timingStepCount]);

  if (!isOpen) return null;

  // Export handlers
  const handleCopyMarkdown = () => {
    if (!truthTable || !truthTable.valid) return;
    const header = `| ${truthTable.inputNames.join(' | ')} | ${truthTable.outputNames.join(' | ')} |`;
    const divider = `| ${truthTable.inputNames.map(() => '---').join(' | ')} | ${truthTable.outputNames.map(() => '---').join(' | ')} |`;
    const rows = truthTable.rows.map(
      (r) => `| ${truthTable.inputNames.map((n) => r.inputs[n]).join(' | ')} | ${truthTable.outputNames.map((n) => r.outputs[n]).join(' | ')} |`
    );
    const md = [header, divider, ...rows].join('\n');
    navigator.clipboard.writeText(md);
    alert('Truth table copied as Markdown for your lab report!');
  };

  const handleCopyCSV = () => {
    if (!truthTable || !truthTable.valid) return;
    const header = [...truthTable.inputNames, ...truthTable.outputNames].join(',');
    const rows = truthTable.rows.map(
      (r) => [...truthTable.inputNames.map((n) => r.inputs[n]), ...truthTable.outputNames.map((n) => r.outputs[n])].join(',')
    );
    const csv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(csv);
    alert('Truth table copied as CSV!');
  };

  return (
    <div className="custom-ic-modal-overlay" onClick={onClose}>
      <div
        id="analysis-center-modal"
        data-testid="analysis-modal"
        className="custom-ic-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '960px', width: '95vw', height: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header Bar */}
        <div className="custom-ic-modal-header" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>🔬</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Circuit Analysis Center
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Phase 8 Unified Digital Analysis, Karnaugh Maps, State Machines & Test Bench
              </span>
            </div>
          </div>

          {/* Target Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Target:</span>
              <select
                id="analysis-target-selector"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as any)}
                style={{ background: 'transparent', border: 'none', color: 'var(--copper-accent)', fontWeight: 600, fontSize: '12px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="schematic" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Active Schematic</option>
                {circuit.trainerBoards && circuit.trainerBoards.length > 0 && (
                  <option value="trainer" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Trainer Board Chassis</option>
                )}
                {customICs.length > 0 && (
                  <option value="custom_ic" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Custom IC Library</option>
                )}
              </select>

              {targetType === 'custom_ic' && (
                <select
                  value={selectedCustomIcId}
                  onChange={(e) => setSelectedCustomIcId(e.target.value)}
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '11px', borderRadius: '4px', padding: '2px 6px' }}
                >
                  {customICs.map((ic) => (
                    <option key={ic.id} value={ic.id} style={{ background: 'var(--bg-elevated)' }}>
                      {ic.partNumber || ic.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button id="btn-close-analysis" className="panel-close-btn" onClick={onClose} aria-label="Close Analysis Center">
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-subtle)', padding: '0 16px', borderBottom: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'truth_table', label: '📋 Truth Table' },
            { id: 'kmap', label: '🗺️ K-Map (2–6 Var)' },
            { id: 'timing', label: '📈 Timing / Waveform' },
            { id: 'sequential', label: '🔄 Sequential State' },
            { id: 'testbench', label: '🧪 Test Bench' },
            {
              id: 'diagnostics',
              label: `⚠️ Diagnostics${diagnostics && diagnostics.issues.length > 0 ? ` (${diagnostics.issues.length})` : ''}`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`analysis-tab-${tab.id}`}
              data-tab={tab.id}
              onClick={() => setActiveTab(tab.id as AnalysisTab)}
              style={{
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? 'var(--copper-accent)' : 'var(--text-secondary)',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === tab.id ? '2px solid var(--copper-accent)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'var(--bg-app)' }}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && overview && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Classification</span>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: overview.circuitType === 'sequential' ? 'var(--signal-warning)' : 'var(--signal-high)', marginTop: '4px' }}>
                    ● {overview.circuitType.toUpperCase()}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    {overview.feedbackDetected ? 'Feedback loop detected' : 'Stateless acyclic logic'}
                  </span>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Components</span>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {overview.totalComponents} Total
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    {overview.categories.gates} Gates, {overview.categories.msi} MSI, {overview.categories.sequential} Seq
                  </span>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Signals & Wires</span>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {overview.inputs.length} In / {overview.outputs.length} Out
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                    {overview.totalWires} Wires, {overview.clocksCount} Clock Sources
                  </span>
                </div>
              </div>

              {/* Summary Description Card */}
              <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--copper-accent)' }}>Circuit Topology Summary</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.6 }}>{overview.summaryText}</p>
                {overview.truthTableFeasibilityReason && (
                  <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-subtle)', borderRadius: '6px', fontSize: '12px', color: 'var(--signal-warning)' }}>
                    ℹ {overview.truthTableFeasibilityReason}
                  </div>
                )}
              </div>

              {/* I/O Pin Mappings Table */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-primary)' }}>Input Pins ({overview.inputs.length})</h4>
                  {overview.inputs.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No inputs identified.</span>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {overview.inputs.map((inp, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                          <strong style={{ color: 'var(--copper-accent)' }}>{inp.displayName}</strong> ({inp.compLabel})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-primary)' }}>Output Pins ({overview.outputs.length})</h4>
                  {overview.outputs.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No outputs identified.</span>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {overview.outputs.map((out, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>
                          <strong style={{ color: 'var(--copper-accent)' }}>{out.displayName}</strong> ({out.compLabel})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRUTH TABLE */}
          {activeTab === 'truth_table' && truthTable && (
            <div>
              {!truthTable.valid ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '16px', color: 'var(--signal-warning)', fontWeight: 600 }}>
                    ⚠️ Truth Table Unavailable
                  </p>
                  <p style={{ fontSize: '13px', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
                    {truthTable.unsupportedMessage}
                  </p>
                  {truthTable.circuitType === 'sequential' && (
                    <button
                      className="header-btn primary"
                      style={{ marginTop: '16px' }}
                      onClick={() => setActiveTab('sequential')}
                    >
                      Go to Sequential State Analysis →
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Showing {truthTable.rows.length} of {truthTable.rowEstimateText}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="header-btn" onClick={handleCopyMarkdown} style={{ fontSize: '11px' }}>
                        📋 Markdown
                      </button>
                      <button className="header-btn" onClick={handleCopyCSV} style={{ fontSize: '11px' }}>
                        📥 CSV
                      </button>
                    </div>
                  </div>

                  {truthTable.sizeWarning && (
                    <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--signal-warning)', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: 'var(--signal-warning)', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>⚠️ {truthTable.sizeWarning}</span>
                      {!forceLargeTruthTable && (
                        <button
                          className="header-btn"
                          style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                          onClick={() => setForceLargeTruthTable(true)}
                        >
                          Generate More Rows (Up to 1024)
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)' }}>#</th>
                          {truthTable.inputNames.map((name) => (
                            <th key={name} style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-primary)' }}>
                              {name}
                            </th>
                          ))}
                          <th style={{ width: '1px', background: 'var(--border-subtle)', padding: 0 }} />
                          {truthTable.outputNames.map((name) => (
                            <th key={name} style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--copper-accent)' }}>
                              {name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {truthTable.rows.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-subtle)' }}>
                            <td style={{ padding: '6px 12px', color: 'var(--text-muted)' }}>{idx}</td>
                            {truthTable.inputNames.map((name) => (
                              <td key={name} style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, color: row.inputs[name] === '1' ? 'var(--signal-high)' : 'var(--signal-low)' }}>
                                {row.inputs[name]}
                              </td>
                            ))}
                            <td style={{ width: '1px', background: 'var(--border-subtle)', padding: 0 }} />
                            {truthTable.outputNames.map((name) => (
                              <td key={name} style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 700, color: row.outputs[name] === '1' ? 'var(--copper-accent)' : 'var(--signal-low)' }}>
                                {row.outputs[name]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {truthTable.booleanAnalyses && truthTable.booleanAnalyses.length > 0 && (
                    <div style={{ marginTop: '20px', background: 'var(--bg-surface)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-primary)' }}>Canonical Sum of Products (SOP)</h4>
                      {truthTable.booleanAnalyses.map((ba) => (
                        <div key={ba.outputName} style={{ marginBottom: '8px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                          <strong style={{ color: 'var(--copper-accent)' }}>{ba.outputName}</strong> = {ba.sopExpression}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 3: KARNAUGH MAP (2-6 VAR) */}
          {activeTab === 'kmap' && (
            <div>
              {!kmapData ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '16px', color: 'var(--signal-warning)', fontWeight: 600 }}>
                    ⚠️ Karnaugh Map Not Available
                  </p>
                  <p style={{ fontSize: '13px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
                    Karnaugh Maps require between 2 and 6 inputs on a stateless combinational circuit. Current circuit has {overview?.inputs.length || 0} inputs.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Select Output:</span>
                      <select
                        id="kmap-output-select"
                        value={selectedKMapOutput || kmapData.selectedOutput}
                        onChange={(e) => setSelectedKMapOutput(e.target.value)}
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--copper-accent)', fontWeight: 700, borderRadius: '4px', padding: '4px 8px' }}
                      >
                        {truthTable?.outputNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Standard Gray Code Ordering ({kmapData.numVariables} Variables: {kmapData.variables.join(', ')})
                    </span>
                  </div>

                  {/* Render Grids */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', marginBottom: '24px' }}>
                    {kmapData.grids.map((grid, gIdx) => (
                      <div key={gIdx} className="kmap-grid-card" style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        {grid.layerValue && (
                          <div className="kmap-layer-label" style={{ textAlign: 'center', marginBottom: '10px', fontSize: '13px', fontWeight: 700, color: 'var(--copper-accent)' }}>
                            Layer {grid.layerValue}
                          </div>
                        )}

                        <table className="kmap-table" style={{ borderCollapse: 'collapse', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                          <thead>
                            <tr>
                              <th className="kmap-var-header" style={{ padding: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                {grid.rowVariables.join('')} \ {grid.colVariables.join('')}
                              </th>
                              {grid.colHeaders.map((ch) => (
                                <th key={ch} className="kmap-col-header" style={{ padding: '6px 14px', fontSize: '12px', color: 'var(--text-primary)', borderBottom: '2px solid var(--border-subtle)' }}>
                                  {ch}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {grid.cells.map((rowCells, rIdx) => (
                              <tr key={rIdx}>
                                <td className="kmap-row-header" style={{ padding: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', borderRight: '2px solid var(--border-subtle)' }}>
                                  {grid.rowHeaders[rIdx]}
                                </td>
                                {rowCells.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className="kmap-cell"
                                    data-minterm={cell.minterm}
                                    style={{
                                      width: '48px',
                                      height: '48px',
                                      border: '1px solid var(--border-subtle)',
                                      position: 'relative',
                                      background: cell.value === '1' ? 'rgba(217, 119, 54, 0.15)' : 'transparent',
                                    }}
                                  >
                                    <span className="kmap-cell-value" style={{ fontSize: '16px', fontWeight: 700, color: cell.value === '1' ? 'var(--copper-accent)' : 'var(--text-muted)' }}>
                                      {cell.value}
                                    </span>
                                    <span className="kmap-cell-minterm" style={{ position: 'absolute', bottom: '2px', right: '4px', fontSize: '9px', color: 'var(--text-muted)' }}>
                                      {cell.minterm}
                                    </span>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>

                  {/* Calculated Boolean Simplification */}
                  <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--copper-accent)' }}>
                      Quine-McCluskey Minimal Sum of Products (SOP)
                    </h4>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
                      {kmapData.selectedOutput} = {kmapData.simplifiedSop}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <strong>Canonical Minterms:</strong> {kmapData.canonicalSop} | <strong>Maxterms:</strong> {kmapData.canonicalPos}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: TIMING / WAVEFORM */}
          {activeTab === 'timing' && timingData && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Discrete-Step Logic Analyzer ({timingData.channels.length} Channels traced over {timingData.stepCount} simulation steps)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span>Steps:</span>
                  <select
                    id="timing-step-select"
                    value={timingStepCount}
                    onChange={(e) => setTimingStepCount(Number(e.target.value))}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', padding: '4px 8px' }}
                  >
                    <option value={8}>8 Steps</option>
                    <option value={16}>16 Steps</option>
                    <option value={32}>32 Steps</option>
                    <option value={64}>64 Steps</option>
                  </select>
                </div>
              </div>

              {/* Timing Waveform Display */}
              <div style={{ background: '#090d12', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
                {timingData.channels.map((ch) => (
                  <div key={ch.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ width: '140px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ch.name}
                    </div>
                    <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
                      {ch.values.map((val, stepIdx) => (
                        <div
                          key={stepIdx}
                          style={{
                            width: '24px',
                            height: '28px',
                            display: 'flex',
                            alignItems: val === '1' ? 'flex-start' : 'flex-end',
                            justifyContent: 'center',
                            borderRight: '1px solid #1a2432',
                            background: stepIdx % 2 === 0 ? '#0d131a' : '#090d12',
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: '3px',
                              background: ch.type === 'clock' ? '#06b6d4' : val === '1' ? 'var(--signal-high)' : '#4b5563',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
                ℹ {timingData.limitationsNote}
              </p>
            </div>
          )}

          {/* TAB 5: SEQUENTIAL STATE ANALYSIS */}
          {activeTab === 'sequential' && seqAnalysis && (
            <div>
              {!seqAnalysis.isSequential ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Stateless Circuit Detected
                  </p>
                  <p style={{ fontSize: '13px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
                    This circuit contains no state-dependent elements (D/JK Flip-Flops, Counters, Latches). Truth table and K-map analysis are best suited for this circuit.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {seqAnalysis.summary}
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)' }}>Step</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>Clock</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-primary)' }}>Current State (Q)</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--copper-accent)' }}>Next State (Q+)</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--signal-high)' }}>Output</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>Transition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {seqAnalysis.transitions.map((row) => (
                          <tr key={row.step} style={{ borderBottom: '1px solid var(--border-subtle)', background: row.step % 2 === 0 ? 'var(--bg-subtle)' : 'transparent' }}>
                            <td style={{ padding: '6px 12px' }}>#{row.step}</td>
                            <td style={{ padding: '6px 12px', textAlign: 'center', color: row.clockPhase === 'HIGH' ? '#06b6d4' : '#64748b' }}>
                              {row.clockPhase}
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                              {JSON.stringify(row.currentState).replace(/[{}"]/g, '')}
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--copper-accent)' }}>
                              {JSON.stringify(row.nextState).replace(/[{}"]/g, '')}
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                              {JSON.stringify(row.outputs).replace(/[{}"]/g, '')}
                            </td>
                            <td style={{ padding: '6px 12px', textAlign: 'center', color: row.stateChanged ? 'var(--signal-high)' : 'var(--text-muted)' }}>
                              {row.stateChanged ? '⚡ CHANGED' : 'STABLE'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 6: TEST BENCH */}
          {activeTab === 'testbench' && testBenchResults && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Automated Test Vector Suite</h4>
                  <span id="testbench-stats" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {testBenchResults.passedTests} / {testBenchResults.totalTests} Passed ({testBenchResults.passRate}%) in {testBenchResults.executionTimeMs}ms
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    id="btn-add-test-vector"
                    className="header-btn"
                    style={{ fontSize: '11px' }}
                    onClick={handleAddBenchVector}
                  >
                    ➕ Add Vector
                  </button>
                  <button
                    id="btn-add-failing-vector"
                    className="header-btn"
                    style={{ fontSize: '11px', color: 'var(--signal-warning)' }}
                    onClick={handleAddFailingVector}
                  >
                    🧪 Add Mismatch Test
                  </button>
                  <button
                    id="btn-reset-vectors"
                    className="header-btn"
                    style={{ fontSize: '11px' }}
                    onClick={handleResetBenchVectors}
                  >
                    🔄 Reset
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)' }}>Test #</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-primary)' }}>Vector Name</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>Inputs</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--copper-accent)' }}>Expected</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--signal-high)' }}>Observed</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testBenchResults.results.map((r) => {
                      const inputStr = Object.entries(r.inputs).length > 0
                        ? Object.entries(r.inputs).map(([k, v]) => `${k}=${v}`).join(', ')
                        : 'Default';
                      const expStr = Object.entries(r.expectedOutputs).length > 0
                        ? Object.entries(r.expectedOutputs).map(([k, v]) => `${k}=${v}`).join(', ')
                        : '—';
                      const obsStr = Object.entries(r.observedOutputs).length > 0
                        ? Object.entries(r.observedOutputs).map(([k, v]) => `${k}=${v}`).join(', ')
                        : 'None';
                      return (
                        <React.Fragment key={r.id}>
                          <tr className={`testbench-row ${r.passed ? 'testbench-pass' : 'testbench-fail'}`} style={{ borderBottom: '1px solid var(--border-subtle)', background: r.passed ? 'transparent' : 'rgba(239, 68, 68, 0.08)' }}>
                            <td style={{ padding: '8px 12px' }}>{r.stepNumber}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.name}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>{inputStr}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--copper-accent)', fontWeight: 600 }}>{expStr}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: r.passed ? 'var(--signal-high)' : 'var(--signal-error)', fontWeight: 600 }}>{obsStr}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: r.passed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: r.passed ? 'var(--signal-high)' : 'var(--signal-error)' }}>
                                {r.passed ? '✔ PASS' : '✖ FAIL'}
                              </span>
                            </td>
                          </tr>
                          {r.mismatches && r.mismatches.length > 0 && (
                            <tr className="testbench-mismatch-row" style={{ background: 'rgba(239, 68, 68, 0.12)', borderBottom: '1px solid var(--border-subtle)' }}>
                              <td colSpan={6} style={{ padding: '6px 14px', fontSize: '11px', color: 'var(--signal-error)' }}>
                                ⚠️ Mismatch: {r.mismatches.map((m) => `${m.outputName} expected '${m.expected}', got '${m.observed}'`).join('; ')}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: DIAGNOSTICS */}
          {activeTab === 'diagnostics' && diagnostics && (
            <div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--signal-error)' }}>● {diagnostics.errorsCount} Errors</span>
                <span style={{ fontSize: '12px', color: 'var(--signal-warning)' }}>● {diagnostics.warningsCount} Warnings</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>● {diagnostics.infosCount} Informational</span>
              </div>

              {diagnostics.issues.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--signal-high)' }}>
                  ✔ No topological or electrical issues detected in current circuit.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {diagnostics.issues.map((issue) => (
                    <div
                      key={issue.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        borderLeft: `4px solid ${issue.severity === 'error' ? 'var(--signal-error)' : issue.severity === 'warning' ? 'var(--signal-warning)' : 'var(--text-muted)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{issue.title}</strong>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                          {issue.category}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {issue.message}
                      </p>
                      {issue.suggestedAction && (
                        <div style={{ fontSize: '11px', color: 'var(--copper-accent)', fontWeight: 600 }}>
                          💡 Action: {issue.suggestedAction}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
