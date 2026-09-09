import React, { useMemo, useState } from 'react';
import type { Circuit } from '../types/circuit';
import { generateTruthTable } from '../engine/truthTableGen';

interface TruthTableModalProps {
  circuit: Circuit;
  isOpen: boolean;
  onClose: () => void;
}

export const TruthTableModal: React.FC<TruthTableModalProps> = ({
  circuit,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'boolean'>('table');

  const tableData = useMemo(() => {
    if (!isOpen) return null;
    return generateTruthTable(circuit);
  }, [circuit, isOpen]);

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    if (!tableData) return;
    const header = `| ${tableData.inputNames.join(' | ')} | ${tableData.outputNames.join(' | ')} |`;
    const divider = `| ${tableData.inputNames.map(() => '---').join(' | ')} | ${tableData.outputNames.map(() => '---').join(' | ')} |`;
    const rows = tableData.rows.map(
      (r) =>
        `| ${tableData.inputNames.map((n) => r.inputs[n]).join(' | ')} | ${tableData.outputNames.map((n) => r.outputs[n]).join(' | ')} |`
    );
    const md = [header, divider, ...rows].join('\n');
    navigator.clipboard.writeText(md);
    alert('Truth table Markdown copied to clipboard for your lab report!');
  };

  const handleCopyCSV = () => {
    if (!tableData) return;
    const header = [...tableData.inputNames, ...tableData.outputNames].join(',');
    const rows = tableData.rows.map((r) =>
      [...tableData.inputNames.map((n) => r.inputs[n]), ...tableData.outputNames.map((n) => r.outputs[n])].join(',')
    );
    const csv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(csv);
    alert('Truth table CSV copied to clipboard!');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
        <div className="modal-header">
          <div className="modal-title">
            {tableData?.tableType === 'sequential'
              ? '🔄 State Transition Table (Sequential Machine)'
              : '📋 Universal Circuit Analysis & Truth Table'}
          </div>
          <button className="panel-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {!tableData ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>
                ⚠️ No Active Components Found
              </p>
              <p style={{ fontSize: '13px', lineHeight: 1.6 }}>
                Place any gate, IC, arithmetic unit, or flip-flop on the canvas to generate its truth table, state transitions, and Boolean equations automatically.
              </p>
            </div>
          ) : (
            <>
              {/* Circuit Metrics Header Bar */}
              {tableData.metrics && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '14px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span style={{ color: 'var(--border-focus)', fontWeight: 'bold' }}>
                    ● {tableData.metrics.circuitType}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <span>{tableData.metrics.inputCount} Inputs</span>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <span>{tableData.metrics.outputCount} Outputs</span>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <span>{tableData.metrics.totalComponents} Components</span>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <span>{tableData.metrics.wireCount} Wires</span>
                </div>
              )}

              {/* View Switcher Tabs (Table vs Boolean Logic) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className={`header-btn ${activeTab === 'table' ? 'primary' : ''}`}
                    onClick={() => setActiveTab('table')}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    📊 Truth / State Table
                  </button>
                  {tableData.tableType === 'combinational' && tableData.booleanAnalyses && (
                    <button
                      className={`header-btn ${activeTab === 'boolean' ? 'primary' : ''}`}
                      onClick={() => setActiveTab('boolean')}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      ∑ Boolean SOP Equations
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="header-btn" onClick={handleCopyMarkdown} title="Copy Markdown table for reports">
                    📋 Markdown
                  </button>
                  <button className="header-btn" onClick={handleCopyCSV} title="Copy CSV data">
                    📥 CSV
                  </button>
                </div>
              </div>

              {tableData.isPartial && (
                <div
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: 'var(--signal-z)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    marginBottom: '12px',
                  }}
                >
                  Notice: Circuit has {tableData.totalCombinations} combinations. Displaying first 64 combinations to preserve performance.
                </div>
              )}

              {/* Tab 1: Truth / State Table */}
              {activeTab === 'table' && (
                <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                  <table className="truth-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {tableData.inputNames.map((name) => (
                          <th key={name} className="in-col" style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                            {name}
                          </th>
                        ))}
                        {tableData.outputNames.map((name) => (
                          <th key={name} className="out-col" style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                            {name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows.map((row, idx) => (
                        <tr key={idx}>
                          {tableData.inputNames.map((name) => (
                            <td key={name} className={row.inputs[name] === '1' ? 'bit-1' : 'bit-0'}>
                              {row.inputs[name]}
                            </td>
                          ))}
                          {tableData.outputNames.map((name) => (
                            <td key={name} className={row.outputs[name] === '1' ? 'bit-1' : 'bit-0'}>
                              {row.outputs[name]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Boolean Logic & Minterms */}
              {activeTab === 'boolean' && tableData.booleanAnalyses && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto' }}>
                  {tableData.booleanAnalyses.map((ba) => (
                    <div
                      key={ba.outputName}
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          Output: {ba.outputName}
                        </span>
                        {ba.simplifiedExpression && (
                          <span
                            style={{
                              fontSize: '11px',
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                            }}
                          >
                            Form: {ba.simplifiedExpression}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                        <strong>Minterms:</strong>{' '}
                        {ba.minterms.length > 0 ? `∑ m(${ba.minterms.join(', ')})` : 'None (Constant 0)'}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                        <strong>Maxterms:</strong>{' '}
                        {ba.maxterms.length > 0 ? `∏ M(${ba.maxterms.join(', ')})` : 'None (Constant 1)'}
                      </div>

                      <div
                        style={{
                          backgroundColor: 'var(--bg-panel)',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          color: 'var(--signal-high)',
                          wordBreak: 'break-all',
                        }}
                      >
                        <strong>SOP:</strong> {ba.outputName} = {ba.sopExpression}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="header-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default TruthTableModal;
