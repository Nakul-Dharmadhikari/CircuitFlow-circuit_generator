import React from 'react';
import type { Circuit, CircuitComponent, Wire } from '../types/circuit';
import { getComponentDisplayName } from '../engine/simulator';

interface PropertiesPanelProps {
  component: CircuitComponent | null;
  selectedWire?: Wire | null;
  selectedBoardIndex?: number | null;
  circuit?: Circuit;
  isOpen?: boolean;
  onClose?: () => void;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateProps: (id: string, props: Record<string, any>) => void;
  onDeleteComponent: (id: string) => void;
  onDeleteWire?: (wireId: string) => void;
  onRemoveBoard?: (boardIndex: number) => void;
  onCopyBoard?: (boardIndex: number) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  component,
  selectedWire,
  selectedBoardIndex = null,
  circuit,
  isOpen = true,
  onClose,
  onUpdateLabel,
  onUpdateProps,
  onDeleteComponent,
  onDeleteWire,
  onRemoveBoard,
  onCopyBoard,
}) => {
  if (!isOpen) return null;

  return (
    <aside className="properties-panel-dock" aria-label="Properties Inspector">
      <div className="panel-header">
        <div className="panel-header-title">
          <span className="panel-icon">⚙️</span>
          <span>
            {component
              ? 'Component Inspector'
              : selectedWire
              ? 'Wire Inspector'
              : selectedBoardIndex !== null
              ? `Trainer Board #${selectedBoardIndex + 1}`
              : 'Circuit Overview'}
          </span>
        </div>
        {onClose && (
          <button className="panel-close-btn" onClick={onClose} title="Collapse Properties Panel">
            ✕
          </button>
        )}
      </div>

      <div className="panel-body">
        {/* =========================================================================
            1. COMPONENT SELECTED
            ========================================================================= */}
        {component && (
          <>
            {/* Component Readable Type */}
            <div className="property-row">
              <label className="property-label">Type</label>
              <div className="property-badge-type">
                <span className="badge-dot" />
                <span className="badge-text">{getComponentDisplayName(component.type)}</span>
              </div>
            </div>

            {/* Component Custom Label */}
            <div className="property-row">
              <div className="property-label-row">
                <label className="property-label">Custom Label</label>
                {component.isCustomLabel && component.label ? (
                  <span className="property-hint active">● Active</span>
                ) : (
                  <span className="property-hint">(Default)</span>
                )}
              </div>
              <input
                type="text"
                className="property-input"
                value={component.isCustomLabel ? component.label : ''}
                placeholder="e.g. U1, CLK_0, MUX_A..."
                onChange={(e) => onUpdateLabel(component.id, e.target.value)}
              />
            </div>

            {/* Position Coordinates */}
            <div className="property-row">
              <label className="property-label">Position (World Coordinates)</label>
              <div className="property-coords-grid">
                <div className="coord-box">
                  <span className="coord-label">X:</span>
                  <span className="coord-val">{Math.round(component.x)}px</span>
                </div>
                <div className="coord-box">
                  <span className="coord-label">Y:</span>
                  <span className="coord-val">{Math.round(component.y)}px</span>
                </div>
              </div>
            </div>

            {/* Clock Frequency Selector if Clock */}
            {component.type === 'clock' && (
              <div className="property-row">
                <label className="property-label">Clock Frequency</label>
                <select
                  className="select-input"
                  value={component.customProps?.frequency || 1}
                  onChange={(e) =>
                    onUpdateProps(component.id, {
                      ...component.customProps,
                      frequency: Number(e.target.value),
                    })
                  }
                >
                  <option value={0.5}>0.5 Hz (Slow Pulse)</option>
                  <option value={1}>1 Hz (Standard 1 sec)</option>
                  <option value={2}>2 Hz (2 pulses/sec)</option>
                  <option value={5}>5 Hz (Fast)</option>
                  <option value={10}>10 Hz (High Speed)</option>
                </select>
              </div>
            )}

            {/* Live Terminal / Pin Readout */}
            <div className="property-row">
              <label className="property-label">Pin Terminals</label>
              <div className="property-pins-list">
                {component.inputs.length > 0 && (
                  <div className="pin-group">
                    <span className="pin-group-header">INPUTS</span>
                    {component.inputs.map((p) => (
                      <div key={p.id} className="pin-item">
                        <span className="pin-name">{p.name || p.id}</span>
                        <span className={`pin-val val-${p.value}`}>
                          {p.value === '1' ? 'HIGH (1)' : p.value === '0' ? 'LOW (0)' : p.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {component.outputs.length > 0 && (
                  <div className="pin-group">
                    <span className="pin-group-header">OUTPUTS</span>
                    {component.outputs.map((p) => (
                      <div key={p.id} className="pin-item">
                        <span className="pin-name">{p.name || p.id}</span>
                        <span className={`pin-val val-${p.value}`}>
                          {p.value === '1' ? 'HIGH (1)' : p.value === '0' ? 'LOW (0)' : p.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Delete Component Button */}
            {!component.isTrainerFixed && (
              <button
                type="button"
                className="panel-danger-btn"
                onClick={() => onDeleteComponent(component.id)}
              >
                🗑️ Delete Component
              </button>
            )}
          </>
        )}

        {/* =========================================================================
            2. WIRE SELECTED
            ========================================================================= */}
        {!component && selectedWire && (
          <>
            <div className="property-row">
              <label className="property-label">Connection</label>
              <div className="property-wire-box">
                <div className="wire-point">
                  <span className="point-tag">SOURCE:</span>
                  <span className="point-text">{selectedWire.fromCompId} : {selectedWire.fromPinId}</span>
                </div>
                <div className="wire-arrow">↓</div>
                <div className="wire-point">
                  <span className="point-tag">TARGET:</span>
                  <span className="point-text">{selectedWire.toCompId} : {selectedWire.toPinId}</span>
                </div>
              </div>
            </div>

            <div className="property-row">
              <label className="property-label">Signal Level</label>
              <div className={`wire-signal-status val-${selectedWire.value || '0'}`}>
                <span className="signal-dot" />
                <span className="signal-name">
                  {selectedWire.value === '1'
                    ? 'HIGH (+5V Logic 1)'
                    : selectedWire.value === '0'
                    ? 'LOW (0V Logic 0)'
                    : selectedWire.value === 'Z'
                    ? 'HIGH-Z (High Impedance)'
                    : selectedWire.value === 'X'
                    ? 'CONFLICT (Bus Contention)'
                    : 'INACTIVE'}
                </span>
              </div>
            </div>

            {onDeleteWire && (
              <button
                type="button"
                className="panel-danger-btn"
                onClick={() => onDeleteWire(selectedWire.id)}
              >
                🗑️ Delete Wire
              </button>
            )}
          </>
        )}

        {/* =========================================================================
            3. TRAINER BOARD SELECTED
            ========================================================================= */}
        {!component && !selectedWire && selectedBoardIndex !== null && (
          <>
            <div className="property-row">
              <label className="property-label">Trainer Board</label>
              <div className="property-badge-type">
                <span className="badge-dot" />
                <span className="badge-text">Digital Trainer Kit #{selectedBoardIndex + 1}</span>
              </div>
            </div>

            <div className="property-row">
              <label className="property-label">Actions</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {onCopyBoard && (
                  <button
                    type="button"
                    className="panel-action-btn"
                    onClick={() => onCopyBoard(selectedBoardIndex)}
                  >
                    📋 Duplicate Trainer Board
                  </button>
                )}
                {onRemoveBoard && (
                  <button
                    type="button"
                    className="panel-danger-btn"
                    onClick={() => onRemoveBoard(selectedBoardIndex)}
                  >
                    ✕ Remove Trainer Board
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* =========================================================================
            4. NOTHING SELECTED: CIRCUIT OVERVIEW
            ========================================================================= */}
        {!component && !selectedWire && selectedBoardIndex === null && (
          <div className="circuit-summary-section">
            <div className="property-row">
              <label className="property-label">Circuit Statistics</label>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-num">{circuit?.components.length || 0}</span>
                  <span className="stat-title">Components</span>
                </div>
                <div className="stat-card">
                  <span className="stat-num">{circuit?.wires.length || 0}</span>
                  <span className="stat-title">Wires</span>
                </div>
              </div>
            </div>

            <div className="property-row">
              <label className="property-label">Quick Shortcuts</label>
              <div className="shortcuts-mini-list">
                <div className="sc-row"><kbd>V</kbd><span>Select Tool</span></div>
                <div className="sc-row"><kbd>H</kbd><span>Pan Tool</span></div>
                <div className="sc-row"><kbd>W</kbd><span>Wire Tool</span></div>
                <div className="sc-row"><kbd>F</kbd><span>Fit to Circuit</span></div>
                <div className="sc-row"><kbd>G</kbd><span>Toggle Grid</span></div>
                <div className="sc-row"><kbd>Del</kbd><span>Delete Item</span></div>
                <div className="sc-row"><kbd>Ctrl+Z</kbd><span>Undo Action</span></div>
                <div className="sc-row"><kbd>Ctrl+C / V</kbd><span>Copy & Paste</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

