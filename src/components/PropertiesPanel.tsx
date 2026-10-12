import React, { useState } from 'react';
import type { Circuit, CircuitComponent, Wire } from '../types/circuit';
import { getComponentDisplayName } from '../engine/simulator';
import type { TrainerBoardModel, TrainerModuleConfig } from '../engine/trainer/trainerBoardModel';
import {
  IconGear,
  IconChart,
  IconWire,
  IconBoard,
  IconRotate,
  IconTrash,
  IconEject,
  IconPlay,
  IconPause,
  IconStep,
  IconReset,
} from './icons/AppIcons';

interface PropertiesPanelProps {
  circuit?: Circuit;
  component?: CircuitComponent | null;
  selectedComponent?: CircuitComponent | null;
  selectedWire?: Wire | null;
  selectedBoardId?: string | null;
  selectedBoardIndex?: number | null;
  selectedModuleId?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateProps: (id: string, props: Record<string, any>) => void;
  onDeleteComponent: (id: string) => void;
  onRotateComponent?: (id: string) => void;
  onDeleteWire?: (wireId: string) => void;
  onAddModule?: () => void;
  onRemoveModule?: (moduleId?: string) => void;
  onCopyBoard?: (boardIdOrIndex: any) => void;
  onDeleteBoard?: (boardIdOrIndex: any) => void;
  onRemoveBoard?: (boardIndexOrId: any) => void;
  isTrainerMode?: boolean;
  clockHz?: number;
  isRunning?: boolean;
  onToggleRun?: () => void;
  onStep?: () => void;
  onReset?: () => void;
  onClearCanvas?: () => void;
  onSelectBoard?: (boardId: string | null) => void;
  onSelectModule?: (moduleId: string | null) => void;
  onRequestEjectIC?: (baseIndex: number, compId: string) => void;
  onRequestDeleteComponent?: (compId: string) => void;
  onRequestDeleteBoard?: (boardIndex: number, boardId: string) => void;
  onRequestRemoveModule?: (boardId: string, moduleId: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  circuit,
  component,
  selectedComponent = component,
  selectedWire,
  selectedBoardId,
  selectedBoardIndex,
  selectedModuleId,
  isOpen = true,
  onClose,
  onUpdateLabel,
  onUpdateProps,
  onDeleteComponent,
  onRotateComponent,
  onDeleteWire,
  onAddModule,
  onRemoveModule,
  onCopyBoard: _onCopyBoard,
  onDeleteBoard: _onDeleteBoard,
  onRemoveBoard,
  isTrainerMode = true,
  clockHz = 1,
  isRunning = false,
  onToggleRun,
  onStep,
  onReset,
  onClearCanvas,
  onSelectBoard,
  onSelectModule,
  onRequestEjectIC,
  onRequestDeleteComponent,
  onRequestDeleteBoard,
  onRequestRemoveModule,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isOpen) return null;

  // Active target component
  const activeComp = selectedComponent || component;

  // Active target board
  const activeBoard: TrainerBoardModel | undefined =
    circuit?.trainerBoards?.find(
      (b) =>
        b.id ===
        (selectedBoardId ||
          (selectedBoardIndex !== undefined && selectedBoardIndex !== null
            ? `board_${selectedBoardIndex + 1}`
            : 'board_1'))
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
        role="button"
        tabIndex={0}
      >
        <button type="button" className="panel-expand-btn" aria-label="Expand Inspector">
          <IconGear size={14} style={{ marginRight: 4 }} />
          <span>INSPECTOR</span>
          <span style={{ fontSize: '10px', marginLeft: 4 }}>◀</span>
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 1. COMPONENT INSPECTOR (When a component is selected)
  // ---------------------------------------------------------------------------
  if (activeComp) {
    const typeName = getComponentDisplayName(activeComp.type);
    const isMountedIC =
      Boolean(activeComp.customProps?.trainerMount) ||
      ((activeComp.type.startsWith('ic_') || activeComp.type === 'custom_ic') &&
        (activeComp.isTrainerFixed ||
          activeBoard?.icSlots.some(
            (s) =>
              s.mountedComponentId === activeComp.id ||
              (Math.abs(activeComp.x - s.x) < 50 && Math.abs(activeComp.y - s.y) < 40)
          )));

    return (
      <aside className="properties-panel-dock properties-panel" aria-label="Component Inspector">
        <div className="panel-header">
          <div className="panel-header-title" title={typeName}>
            <IconGear size={16} className="panel-icon" />
            <span>COMPONENT INSPECTOR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="panel-min-btn"
              onClick={() => setIsCollapsed(true)}
              title="Minimize panel"
              aria-label="Minimize panel"
            >
              ─
            </button>
            {onClose && (
              <button
                type="button"
                className="panel-close-btn"
                onClick={onClose}
                title="Close Inspector"
                aria-label="Close Inspector"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="panel-body">
          {/* Component Type & Badge */}
          <div className="property-row">
            <label className="property-label">Component Type</label>
            <div className="property-badge-box">
              <span style={{ color: 'var(--signal-high)' }}>●</span>
              <span>{typeName}</span>
              {isMountedIC && <span className="property-tag-badge">MOUNTED IC</span>}
              {activeComp.isTrainerFixed && <span className="property-tag-badge">TRAINER PORT</span>}
            </div>
          </div>

          {/* Component Custom Label */}
          <div className="property-row">
            <label className="property-label">Label</label>
            <input
              type="text"
              className="property-input"
              value={activeComp.label}
              onChange={(e) => onUpdateLabel(activeComp.id, e.target.value)}
              placeholder="e.g. U1, AND1, CLK"
              aria-label="Component Label"
            />
          </div>

          {/* Clock Frequency Setting (if clock component) */}
          {activeComp.type === 'clock' && (
            <div className="property-row">
              <label className="property-label">Clock Frequency</label>
              <select
                className="property-select"
                value={activeComp.customProps?.frequency ?? 1}
                onChange={(e) =>
                  onUpdateProps(activeComp.id, {
                    ...activeComp.customProps,
                    frequency: Number(e.target.value),
                  })
                }
                aria-label="Clock Frequency"
              >
                <option value={0.5}>0.5 Hz (Slow Pulse)</option>
                <option value={1}>1 Hz (Standard 1 sec)</option>
                <option value={2}>2 Hz (2 pulses/sec)</option>
                <option value={5}>5 Hz (Fast)</option>
                <option value={10}>10 Hz (High Speed)</option>
              </select>
            </div>
          )}

          {/* Pin Terminals Live Readout */}
          <div className="property-row">
            <label className="property-label">Pin Terminals</label>
            <div className="property-pins-list">
              {activeComp.inputs.length > 0 && (
                <div className="pin-group">
                  <span className="pin-group-header">INPUTS</span>
                  {activeComp.inputs.map((p) => (
                    <div key={p.id} className="pin-item">
                      <span className="pin-name">{p.name || p.id}</span>
                      <span className={`pin-val val-${p.value}`}>
                        {p.value === '1' ? 'HIGH (1)' : p.value === '0' ? 'LOW (0)' : p.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {activeComp.outputs.length > 0 && (
                <div className="pin-group">
                  <span className="pin-group-header">OUTPUTS</span>
                  {activeComp.outputs.map((p) => (
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

          {/* Rotation Control */}
          {onRotateComponent && (
            <div className="property-row">
              <label className="property-label">Orientation</label>
              <button
                type="button"
                className="panel-action-btn rotate-btn"
                disabled={activeComp.isTrainerFixed || isMountedIC}
                style={
                  activeComp.isTrainerFixed || isMountedIC
                    ? { opacity: 0.5, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }
                    : { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }
                }
                onClick={() =>
                  !activeComp.isTrainerFixed && !isMountedIC && onRotateComponent(activeComp.id)
                }
                title={
                  isMountedIC
                    ? 'Rotation is locked for socket-mounted ICs'
                    : activeComp.isTrainerFixed
                    ? 'Rotation is locked for trainer hardware'
                    : 'Rotate component 90° (R)'
                }
              >
                <IconRotate size={14} />
                <span>Rotate 90° (R)</span>
              </button>
            </div>
          )}

          {/* Mounted IC Status Notice and Safe Eject Button */}
          {isMountedIC && (
            <div className="property-row" style={{ marginTop: 8 }}>
              <div
                className="property-coords-grid"
                style={{ gridTemplateColumns: '1fr', marginBottom: 6 }}
              >
                <div
                  className="coord-box"
                  style={{
                    padding: '6px 8px',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '2px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '4px',
                  }}
                >
                  <span
                    className="socket-lock-indicator"
                    style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8' }}
                  >
                    🔒 Socket-Locked (Non-Draggable)
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    Mounted on {activeComp.customProps?.trainerMount?.slotLabel || 'IC Socket'} ({activeBoard?.name || 'Trainer Board'})
                  </span>
                </div>
              </div>

              {onRequestEjectIC && (
                <button
                  type="button"
                  className="panel-action-btn eject-panel-btn"
                  style={{
                    background: 'rgba(217, 119, 54, 0.15)',
                    borderColor: '#d97736',
                    color: '#f59e0b',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  onClick={() => {
                    const baseIdx = activeComp.customProps?.trainerMount?.baseIndex ?? 0;
                    onRequestEjectIC(baseIdx, activeComp.id);
                  }}
                >
                  <IconEject size={14} />
                  <span>Eject from Socket {activeComp.customProps?.trainerMount?.slotLabel || ''}</span>
                </button>
              )}
            </div>
          )}

          {/* Free Component Actions (Delete) */}
          {!activeComp.isTrainerFixed && !isMountedIC && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
              <button
                type="button"
                className="panel-danger-btn"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={() => {
                  if (onRequestDeleteComponent) {
                    onRequestDeleteComponent(activeComp.id);
                  } else {
                    onDeleteComponent(activeComp.id);
                  }
                }}
              >
                <IconTrash size={14} />
                <span>Delete Component</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. WIRE INSPECTOR (When a wire is selected)
  // ---------------------------------------------------------------------------
  if (selectedWire) {
    return (
      <aside className="properties-panel-dock properties-panel" aria-label="Wire Inspector">
        <div className="panel-header">
          <div className="panel-header-title">
            <IconWire size={16} className="panel-icon" />
            <span>WIRE INSPECTOR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="panel-min-btn"
              onClick={() => setIsCollapsed(true)}
              title="Minimize panel"
              aria-label="Minimize panel"
            >
              ─
            </button>
            {onClose && (
              <button
                type="button"
                className="panel-close-btn"
                onClick={onClose}
                title="Close Inspector"
                aria-label="Close Inspector"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="panel-body">
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}
              onClick={() => onDeleteWire(selectedWire.id)}
            >
              <IconTrash size={14} />
              <span>Delete Wire</span>
            </button>
          )}
        </div>
      </aside>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. TRAINER MODULE INSPECTOR (When a specific module is selected)
  // ---------------------------------------------------------------------------
  if (activeModule) {
    return (
      <aside className="properties-panel-dock properties-panel" aria-label="Trainer Module Inspector">
        <div className="panel-header">
          <div className="panel-header-title">
            <IconBoard size={16} className="panel-icon" />
            <span>MODULE INSPECTOR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="panel-min-btn"
              onClick={() => setIsCollapsed(true)}
              title="Minimize panel"
              aria-label="Minimize panel"
            >
              ─
            </button>
            {onClose && (
              <button
                type="button"
                className="panel-close-btn"
                onClick={onClose}
                title="Close Inspector"
                aria-label="Close Inspector"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="panel-body">
          <div className="property-row">
            <label className="property-label">Module Name</label>
            <div className="property-badge-box">
              <span>{activeModule.name}</span>
              <span className="property-tag-badge">SLOT #{activeModule.index + 1}</span>
            </div>
          </div>

          <div className="property-row">
            <label className="property-label">Module Hardware Capacity</label>
            <div className="property-badge-box">
              <span>{activeModule.icCount} IC Sockets • {activeModule.inputCount} Toggle Switches</span>
            </div>
          </div>

          {onAddModule && (
            <button
              type="button"
              className="panel-action-btn"
              style={{ marginTop: '8px' }}
              onClick={onAddModule}
            >
              ➕ Add Another Module
            </button>
          )}

          {activeModule.index > 0 && (
            <button
              type="button"
              className="panel-danger-btn"
              style={{ marginTop: '6px' }}
              onClick={() => {
                if (onRequestRemoveModule && activeBoard) {
                  onRequestRemoveModule(activeBoard.id, activeModule.id);
                } else if (onRemoveModule) {
                  onRemoveModule(activeModule.id);
                }
              }}
            >
              ✕ Remove This Module
            </button>
          )}

          <button
            type="button"
            className="panel-action-btn"
            style={{ marginTop: '8px' }}
            onClick={() => {
              onSelectModule?.(null);
            }}
          >
            ← Back to Board
          </button>
        </div>
      </aside>
    );
  }

  // ---------------------------------------------------------------------------
  // 4. TRAINER BOARD INSPECTOR (When a trainer board is selected)
  // ---------------------------------------------------------------------------
  if (selectedBoardIndex !== null && selectedBoardIndex !== undefined && activeBoard) {
    return (
      <aside className="properties-panel-dock properties-panel" aria-label="Trainer Board Inspector">
        <div className="panel-header">
          <div className="panel-header-title">
            <IconBoard size={16} className="panel-icon" />
            <span>TRAINER BOARD #{selectedBoardIndex + 1}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="panel-min-btn"
              onClick={() => setIsCollapsed(true)}
              title="Minimize panel"
              aria-label="Minimize panel"
            >
              ─
            </button>
            {onClose && (
              <button
                type="button"
                className="panel-close-btn"
                onClick={onClose}
                title="Close Inspector"
                aria-label="Close Inspector"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="panel-body">
          <div className="property-row">
            <label className="property-label">Board Identifier</label>
            <div className="property-badge-box">
              <span>{activeBoard.name || `Trainer Board #${selectedBoardIndex + 1}`}</span>
              <span className="property-tag-badge">DC 5V VCC</span>
            </div>
          </div>

          <div className="property-row">
            <label className="property-label">Total Installed Modules</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {activeBoard.modules.map((m) => (
                <div
                  key={m.id}
                  className="property-badge-box"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectModule?.(m.id)}
                  title="Click to inspect module"
                >
                  <span>{m.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {m.icCount} Sockets, {m.inputCount} Inputs →
                  </span>
                </div>
              ))}
            </div>
          </div>

          {onAddModule && (
            <button
              type="button"
              className="panel-action-btn"
              style={{ marginTop: '8px' }}
              onClick={onAddModule}
            >
              ➕ Extend Board (+ Module)
            </button>
          )}

          {selectedBoardIndex > 0 && (
            <button
              type="button"
              className="panel-danger-btn"
              style={{ marginTop: '8px' }}
              onClick={() => {
                if (onRequestDeleteBoard) {
                  onRequestDeleteBoard(selectedBoardIndex, activeBoard.id);
                } else if (onRemoveBoard) {
                  onRemoveBoard(selectedBoardIndex);
                }
              }}
            >
              🗑️ Remove This Board
            </button>
          )}

          <button
            type="button"
            className="panel-action-btn"
            style={{ marginTop: '8px' }}
            onClick={() => {
              onSelectBoard?.(null);
            }}
          >
            ← View Circuit Overview
          </button>
        </div>
      </aside>
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
  const totalInputs = activeBoard?.modules.reduce((acc, m) => acc + m.inputCount, 0) || 16;
  const totalOutputs =
    circuit?.components.filter((c) => c.customProps?.isTrainerOutput).length || 16;

  return (
    <aside className="properties-panel-dock properties-panel" aria-label="Properties Inspector">
      <div className="panel-header">
        <div className="panel-header-title">
          <IconChart size={16} className="panel-icon" />
          <span>CIRCUIT OVERVIEW</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            className="panel-min-btn"
            onClick={() => setIsCollapsed(true)}
            title="Minimize panel"
            aria-label="Minimize panel"
          >
            ─
          </button>
          {onClose && (
            <button
              className="panel-close-btn"
              onClick={onClose}
              title="Collapse Properties Panel"
              aria-label="Collapse Properties Panel"
            >
              ✕
            </button>
          )}
        </div>
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

        {/* Operating Environment */}
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

        {/* Trainer Board Hardware Card */}
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
              role="button"
              tabIndex={0}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <IconBoard size={14} />
                  <span>{activeBoard.name || 'Trainer Board'}</span>
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
                className="panel-action-btn"
                style={{ marginTop: '6px' }}
                onClick={onAddModule}
              >
                ➕ Extend Board (+ Module)
              </button>
            )}
          </div>
        )}

        {/* Quick Simulation Controls */}
        <div className="property-row">
          <label className="property-label">Workbench Quick Controls</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
            {onToggleRun && (
              <button
                type="button"
                className={`panel-action-btn ${isRunning ? 'active' : ''}`}
                onClick={onToggleRun}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                {isRunning ? <IconPause size={13} /> : <IconPlay size={13} />}
                <span>{isRunning ? 'Pause' : 'Simulate'}</span>
              </button>
            )}
            {onStep && (
              <button
                type="button"
                className="panel-action-btn"
                onClick={onStep}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <IconStep size={13} />
                <span>Step</span>
              </button>
            )}
            {onReset && (
              <button
                type="button"
                className="panel-action-btn"
                onClick={onReset}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <IconReset size={13} />
                <span>Reset</span>
              </button>
            )}
            {onClearCanvas && (
              <button
                type="button"
                className="panel-danger-btn"
                onClick={onClearCanvas}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <IconTrash size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Shortcuts */}
        <div className="property-row">
          <label className="property-label">Quick Shortcuts</label>
          <div className="shortcuts-mini-list">
            <div className="sc-row"><kbd>V</kbd><span>Select Tool</span></div>
            <div className="sc-row"><kbd>H</kbd><span>Pan Tool</span></div>
            <div className="sc-row"><kbd>W</kbd><span>Wire Tool</span></div>
            <div className="sc-row"><kbd>R</kbd><span>Rotate Component</span></div>
            <div className="sc-row"><kbd>F</kbd><span>Fit to Circuit</span></div>
            <div className="sc-row"><kbd>G</kbd><span>Toggle Grid</span></div>
            <div className="sc-row"><kbd>Del</kbd><span>Delete Item</span></div>
            <div className="sc-row"><kbd>Ctrl+Z</kbd><span>Undo Action</span></div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default PropertiesPanel;
