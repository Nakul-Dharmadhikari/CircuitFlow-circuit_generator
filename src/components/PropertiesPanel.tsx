import React, { useState } from 'react';
import type { Circuit, CircuitComponent, Wire } from '../types/circuit';
import { getComponentDisplayName } from '../engine/simulator';
import type { TrainerBoardModel, TrainerModuleConfig } from '../engine/trainer/trainerBoardModel';

interface PropertiesPanelProps {
  circuit?: Circuit;
  component?: CircuitComponent | null;
  selectedComponent?: CircuitComponent | null;
  selectedWire?: Wire | null;
  selectedBoardId?: string | null;
  selectedModuleId?: string | null;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateProps: (id: string, props: Record<string, any>) => void;
  onDeleteComponent: (id: string) => void;
  onRotateComponent?: (id: string) => void;
  onDeleteWire?: (wireId: string) => void;
  onAddModule?: () => void;
  onRemoveModule?: (moduleId?: string) => void;
  onCopyBoard?: (boardId: string) => void;
  onDeleteBoard?: (boardId: string) => void;
  onClose: () => void;
  isTrainerMode?: boolean;
  clockHz?: number;
  isRunning?: boolean;
  onToggleRun?: () => void;
  onStep?: () => void;
  onReset?: () => void;
  onClearCanvas?: () => void;
  onSelectBoard?: (boardId: string | null) => void;
  onSelectModule?: (moduleId: string | null) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  circuit,
  component,
  selectedComponent = component,
  selectedWire,
  selectedBoardId,
  selectedModuleId,
  onUpdateLabel,
  onUpdateProps,
  onDeleteComponent,
  onRotateComponent,
  onDeleteWire,
  onAddModule,
  onRemoveModule,
  onCopyBoard,
  onDeleteBoard,
  onClose,
  isTrainerMode = true,
  clockHz = 1,
  isRunning = false,
  onToggleRun,
  onStep,
  onReset,
  onClearCanvas,
  onSelectBoard,
  onSelectModule,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeBoard: TrainerBoardModel | undefined = circuit?.trainerBoards?.find(
    (b) => b.id === (selectedBoardId || 'board_1')
  ) || circuit?.trainerBoards?.[0];

  const activeModule: TrainerModuleConfig | undefined = activeBoard?.modules.find(
    (m) => m.id === selectedModuleId
  );

  // If collapsed, show a minimal expandable tab
  if (isCollapsed) {
    return (
      <div
        className="properties-panel collapsed"
        onClick={() => setIsCollapsed(false)}
        title="Expand Inspector Panel"
      >
        <button type="button" className="panel-expand-btn">
          <span>⚙️ INSPECTOR</span>
          <span style={{ fontSize: '10px' }}>◀</span>
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 1. COMPONENT INSPECTOR (When a component is selected)
  // ---------------------------------------------------------------------------
  if (selectedComponent) {
    const typeName = getComponentDisplayName(selectedComponent.type);
    const isMountedIC =
      (selectedComponent.type.startsWith('ic_') || selectedComponent.type === 'custom_ic') &&
      activeBoard?.icSlots.some(
        (s) => Math.abs(selectedComponent.x - s.x) < 50 && Math.abs(selectedComponent.y - s.y) < 40
      );

    return (
      <div className="properties-panel">
        <div className="panel-header">
          <span className="panel-header-title" title={typeName}>
            ⚙️ COMPONENT INSPECTOR
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="panel-min-btn"
              onClick={() => setIsCollapsed(true)}
              title="Minimize panel"
            >
              ─
            </button>
            <button type="button" className="panel-close-btn" onClick={onClose} title="Close Inspector">
              ✕
            </button>
          </div>
        </div>

        <div className="panel-body">
          {/* Component Type & Badge */}
          <div className="property-row">
            <label className="property-label">Component Type</label>
            <div className="property-badge-box">
              <span style={{ color: 'var(--signal-high)' }}>●</span>
              <span>{typeName}</span>
              {isMountedIC && (
                <span className="property-tag-badge">MOUNTED IC</span>
              )}
              {selectedComponent.isTrainerFixed && (
                <span className="property-tag-badge">TRAINER PORT</span>
              )}
            </div>
          </div>

          {/* Component Label Input Field */}
          <div className="property-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="property-label">Component Label</label>
              {selectedComponent.isCustomLabel && selectedComponent.label ? (
                <span style={{ fontSize: '10px', color: 'var(--signal-high)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  ● Active
                </span>
              ) : (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  (Default)
                </span>
              )}
            </div>
            <input
              type="text"
              className="property-input"
              value={selectedComponent.isCustomLabel ? selectedComponent.label : selectedComponent.label || ''}
              placeholder="e.g. U1, CLK, OUT..."
              onChange={(e) => onUpdateLabel(selectedComponent.id, e.target.value)}
            />
          </div>

          {/* Coordinates Position Display */}
          <div className="property-row">
            <label className="property-label">Position</label>
            <div className="coords-readout">
              <span>X: <strong>{selectedComponent.x}px</strong></span>
              <span>Y: <strong>{selectedComponent.y}px</strong></span>
              <span>W: {selectedComponent.width}px</span>
              <span>H: {selectedComponent.height}px</span>
            </div>
          </div>

          {/* Component Orientation & Rotation Controls */}
          {!selectedComponent.isTrainerFixed && (
            <div className="property-row">
              <label className="property-label">Orientation</label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span className="mono-readout-pill">
                  {selectedComponent.rotation || 0}°
                </span>
                <button
                  type="button"
                  className="header-btn"
                  style={{ fontSize: '11px', padding: '4px 10px', height: '28px', gap: '4px' }}
                  onClick={() => onRotateComponent?.(selectedComponent.id)}
                  title="Rotate 90 degrees clockwise (Hotkey: R)"
                >
                  🔄 Rotate 90°
                </button>
              </div>
            </div>
          )}

          {/* Clock Frequency selector */}
          {selectedComponent.type === 'clock' && (
            <div className="property-row">
              <label className="property-label">Clock Frequency</label>
              <select
                className="select-input"
                value={selectedComponent.customProps?.frequency || 1}
                onChange={(e) =>
                  onUpdateProps(selectedComponent.id, {
                    ...selectedComponent.customProps,
                    frequency: Number(e.target.value),
                  })
                }
              >
                <option value={0.5}>0.5 Hz (Slow)</option>
                <option value={1}>1.0 Hz (Standard)</option>
                <option value={2}>2.0 Hz</option>
                <option value={5}>5.0 Hz</option>
                <option value={10}>10.0 Hz (Fast)</option>
              </select>
            </div>
          )}

          {/* Live Pin States Readout */}
          <div className="property-row">
            <label className="property-label">
              Live Pin States ({selectedComponent.inputs.length + selectedComponent.outputs.length} Pins)
            </label>
            <div className="pins-scroll-list">
              {selectedComponent.inputs.map((p) => (
                <div key={p.id} className="pin-item-row">
                  <span className="pin-name">IN: {p.name}</span>
                  <span className={`pin-value val-${p.value}`}>
                    {p.value}
                  </span>
                </div>
              ))}
              {selectedComponent.outputs.map((p) => (
                <div key={p.id} className="pin-item-row">
                  <span className="pin-name">OUT: {p.name}</span>
                  <span className={`pin-value val-${p.value}`}>
                    {p.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delete Action (Available for user gates and mounted IC chips) */}
          {(!selectedComponent.isTrainerFixed || isMountedIC) && (
            <button
              type="button"
              className="header-btn danger"
              style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
              onClick={() => onDeleteComponent(selectedComponent.id)}
            >
              🗑️ Delete Component
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. WIRE INSPECTOR (When a wire is selected)
  // ---------------------------------------------------------------------------
  if (selectedWire) {
    const fromComp = circuit?.components.find((c) => c.id === selectedWire.fromCompId);
    const toComp = circuit?.components.find((c) => c.id === selectedWire.toCompId);
    const fromPin = fromComp?.outputs.find((p) => p.id === selectedWire.fromPinId) || fromComp?.inputs.find((p) => p.id === selectedWire.fromPinId);
    const toPin = toComp?.inputs.find((p) => p.id === selectedWire.toPinId) || toComp?.outputs.find((p) => p.id === selectedWire.toPinId);

    const fromLabel = fromComp ? `${fromComp.label || fromComp.type}:${fromPin?.name || selectedWire.fromPinId}` : selectedWire.fromCompId;
    const toLabel = toComp ? `${toComp.label || toComp.type}:${toPin?.name || selectedWire.toPinId}` : selectedWire.toCompId;

    return (
      <div className="properties-panel">
        <div className="panel-header">
          <span className="panel-header-title">
            🔌 WIRE INSPECTOR
          </span>
          <button type="button" className="panel-close-btn" onClick={onClose} title="Close Inspector">
            ✕
          </button>
        </div>

        <div className="panel-body">
          <div className="property-row">
            <label className="property-label">Wire Identity</label>
            <div className="property-badge-box">
              <span style={{ color: 'var(--border-focus)' }}>●</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{selectedWire.id}</span>
            </div>
          </div>

          <div className="property-row">
            <label className="property-label">Connection Source</label>
            <div className="property-badge-box">
              <span>{fromLabel}</span>
            </div>
          </div>

          <div className="property-row">
            <label className="property-label">Connection Destination</label>
            <div className="property-badge-box">
              <span>{toLabel}</span>
            </div>
          </div>

          <div className="property-row">
            <label className="property-label">Signal Logic State</label>
            <div className="signal-state-badge">
              <span className={`signal-indicator-dot val-${selectedWire.value}`} />
              <span style={{ fontSize: '13px', fontWeight: 800 }}>
                {selectedWire.value === '1' ? 'HIGH (+5V)' : selectedWire.value === '0' ? 'LOW (0V)' : selectedWire.value}
              </span>
            </div>
          </div>

          {onDeleteWire && (
            <button
              type="button"
              className="header-btn danger"
              style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
              onClick={() => onDeleteWire(selectedWire.id)}
            >
              🗑️ Delete Wire
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. MODULE INSPECTOR (When a module is selected)
  // ---------------------------------------------------------------------------
  if (activeModule && selectedModuleId) {
    const modSlots = activeBoard?.icSlots.filter((s) => s.moduleId === activeModule.id) || [];

    return (
      <div className="properties-panel">
        <div className="panel-header">
          <span className="panel-header-title">
            📦 {activeModule.name.toUpperCase()} INSPECTOR
          </span>
          <button type="button" className="panel-close-btn" onClick={() => onSelectModule?.(null)}>
            ✕
          </button>
        </div>

        <div className="panel-body">
          <div className="property-row">
            <label className="property-label">Module Name</label>
            <div className="property-badge-box">
              <span>{activeModule.name}</span>
              <span className="property-tag-badge">EXPANSION UNIT</span>
            </div>
          </div>

          <div className="property-row">
            <label className="property-label">Hardware Resources</label>
            <div className="coords-readout">
              <span>IC Slots: <strong>{modSlots.length}</strong></span>
              <span>Inputs: <strong>{activeModule.inputCount}</strong></span>
              <span>Width: {activeModule.width}px</span>
            </div>
          </div>

          <div className="property-row">
            <label className="property-label">IC Sockets in Module</label>
            <div className="chips-tags-list">
              {modSlots.map((s) => (
                <span key={s.id} className="chip-slot-tag">
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          <div className="property-row">
            <label className="property-label">Trainer Inputs Range</label>
            <div className="property-badge-box">
              <span>IN{activeModule.startInputIndex + activeModule.inputCount - 1} ... IN{activeModule.startInputIndex}</span>
            </div>
          </div>

          {activeModule.index > 0 && onRemoveModule && (
            <button
              type="button"
              className="header-btn danger"
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
              onClick={() => {
                if (window.confirm(`Remove ${activeModule.name}?`)) {
                  onRemoveModule(activeModule.id);
                  onSelectModule?.(null);
                }
              }}
            >
              ✕ Remove This Module
            </button>
          )}

          <button
            type="button"
            className="header-btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
            onClick={() => onSelectBoard?.(activeBoard?.id || null)}
          >
            ← Back to Board Inspector
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 4. TRAINER BOARD INSPECTOR (When a trainer board is selected)
  // ---------------------------------------------------------------------------
  if (selectedBoardId && activeBoard) {
    const totalInputs = activeBoard.modules.reduce((acc, m) => acc + m.inputCount, 0);

    return (
      <div className="properties-panel">
        <div className="panel-header">
          <span className="panel-header-title">
            📟 BOARD INSPECTOR
          </span>
          <button type="button" className="panel-close-btn" onClick={() => onSelectBoard?.(null)}>
            ✕
          </button>
        </div>

        <div className="panel-body">
          <div className="property-row">
            <label className="property-label">Board Identity</label>
            <div className="property-badge-box">
              <span style={{ color: 'var(--signal-high)' }}>●</span>
              <span>{activeBoard.name || activeBoard.id}</span>
              <span className="property-tag-badge">DELDSIM</span>
            </div>
          </div>

          <div className="property-row">
            <label className="property-label">Architecture Metrics</label>
            <div className="coords-readout">
              <span>Modules: <strong>{activeBoard.modules.length}</strong></span>
              <span>IC Slots: <strong>{activeBoard.icSlots.length}</strong></span>
              <span>Inputs: <strong>{totalInputs}</strong></span>
              <span>Width: {activeBoard.width}px</span>
            </div>
          </div>

          <div className="property-row">
            <label className="property-label">Active Modules List</label>
            <div className="modules-list-box">
              {activeBoard.modules.map((m) => (
                <div
                  key={m.id}
                  className="module-item-row"
                  onClick={() => onSelectModule?.(m.id)}
                  title="Click to inspect module"
                >
                  <span style={{ fontWeight: 700 }}>{m.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {m.icCount} ICs • {m.inputCount} Ins
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Board Actions */}
          <div className="property-row" style={{ marginTop: '6px' }}>
            <label className="property-label">Board Extension & Actions</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              {onAddModule && (
                <button
                  type="button"
                  className="header-btn"
                  style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--border-focus)', color: '#38bdf8' }}
                  onClick={onAddModule}
                >
                  ➕ Add Module (+2 ICs, +8 Inputs)
                </button>
              )}

              {activeBoard.modules.length > 1 && onRemoveModule && (
                <button
                  type="button"
                  className="header-btn"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => onRemoveModule()}
                >
                  − Remove Last Module
                </button>
              )}

              {onCopyBoard && (
                <button
                  type="button"
                  className="header-btn"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => onCopyBoard(activeBoard.id)}
                >
                  📋 Duplicate Board
                </button>
              )}

              {onDeleteBoard && (circuit?.trainerBoards || []).length > 1 && (
                <button
                  type="button"
                  className="header-btn danger"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => onDeleteBoard(activeBoard.id)}
                >
                  🗑️ Delete Board
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            className="header-btn"
            style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
            onClick={() => onSelectBoard?.(null)}
          >
            ← View Circuit Overview
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 5. CIRCUIT OVERVIEW (Default state when nothing is selected)
  // ---------------------------------------------------------------------------
  const totalComponents = circuit?.components.length || 0;
  const totalWires = circuit?.wires.length || 0;
  const icCount =
    circuit?.components.filter((c) => c.type.startsWith('ic_') || c.type === 'custom_ic').length || 0;
  const totalSlots = activeBoard?.icSlots.length || 4;
  const totalInputs =
    activeBoard?.modules.reduce((acc, m) => acc + m.inputCount, 0) || 16;
  const totalOutputs =
    circuit?.components.filter((c) => c.customProps?.isTrainerOutput).length || 16;

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <span className="panel-header-title">
          📊 CIRCUIT OVERVIEW
        </span>
        <button
          type="button"
          className="panel-min-btn"
          onClick={() => setIsCollapsed(true)}
          title="Minimize panel"
        >
          ─
        </button>
      </div>

      <div className="panel-body">
        {/* Metric Summary Grid */}
        <div className="overview-stats-grid">
          <div className="overview-stat-tile">
            <span className="stat-label">Components</span>
            <span className="stat-value">{totalComponents}</span>
          </div>
          <div className="overview-stat-tile">
            <span className="stat-label">Wires</span>
            <span className="stat-value">{totalWires}</span>
          </div>
          <div className="overview-stat-tile">
            <span className="stat-label">ICs Mounted</span>
            <span className="stat-value">
              {icCount} / {totalSlots}
            </span>
          </div>
          <div className="overview-stat-tile">
            <span className="stat-label">Inputs</span>
            <span className="stat-value">{totalInputs}</span>
          </div>
          <div className="overview-stat-tile">
            <span className="stat-label">Outputs</span>
            <span className="stat-value">{totalOutputs}</span>
          </div>
          <div className="overview-stat-tile">
            <span className="stat-label">Clock</span>
            <span className="stat-value" style={{ color: 'var(--signal-clock)' }}>
              {clockHz} Hz
            </span>
          </div>
        </div>

        {/* Operating Mode & Telemetry */}
        <div className="property-row">
          <label className="property-label">Operating Environment</label>
          <div className="property-badge-box">
            <span style={{ color: 'var(--signal-high)' }}>●</span>
            <span>Mode: <strong>{isTrainerMode ? 'Hardware Trainer' : 'Schematic Editor'}</strong></span>
          </div>
          <div className="property-badge-box" style={{ marginTop: '4px' }}>
            <span>Power State: <strong style={{ color: 'var(--signal-high)' }}>ON (+5.0V VCC)</strong></span>
          </div>
        </div>

        {/* Trainer Board System info & Inspect action */}
        {activeBoard && isTrainerMode && (
          <div className="property-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="property-label">Trainer Board Hardware</label>
              <span style={{ fontSize: '10.5px', color: 'var(--border-focus)' }}>
                {activeBoard.modules.length} {activeBoard.modules.length === 1 ? 'Module' : 'Modules'}
              </span>
            </div>
            <div
              className="trainer-board-card-button"
              onClick={() => onSelectBoard?.(activeBoard.id)}
              title="Click to inspect Trainer Board"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  📟 {activeBoard.name || 'Trainer Board'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Inspect →</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {activeBoard.icSlots.length} DIP Sockets • {totalInputs} Toggle Switches
              </div>
            </div>

            {onAddModule && (
              <button
                type="button"
                className="header-btn"
                style={{ width: '100%', justifyContent: 'center', marginTop: '6px', borderColor: 'var(--border-focus)', color: '#38bdf8' }}
                onClick={onAddModule}
              >
                ➕ Extend Board (+ Module)
              </button>
            )}
          </div>
        )}

        {/* Quick Simulation Actions */}
        <div className="property-row">
          <label className="property-label">Workbench Quick Controls</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
            {onToggleRun && (
              <button
                type="button"
                className={`header-btn ${isRunning ? 'primary' : ''}`}
                style={{ justifyContent: 'center' }}
                onClick={onToggleRun}
              >
                {isRunning ? '⏸ Pause' : '▶ Simulate'}
              </button>
            )}
            {onStep && (
              <button
                type="button"
                className="header-btn"
                style={{ justifyContent: 'center' }}
                onClick={onStep}
              >
                ⏭ Step
              </button>
            )}
            {onReset && (
              <button
                type="button"
                className="header-btn"
                style={{ justifyContent: 'center' }}
                onClick={onReset}
              >
                🔄 Reset
              </button>
            )}
            {onClearCanvas && (
              <button
                type="button"
                className="header-btn danger"
                style={{ justifyContent: 'center' }}
                onClick={onClearCanvas}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
