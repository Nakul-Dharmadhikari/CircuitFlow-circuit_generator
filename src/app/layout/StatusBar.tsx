import React from 'react';
import type { InteractionTool } from '../../hooks/useUIState';

interface StatusBarProps {
  isRunning: boolean;
  clockHz: number;
  componentCount: number;
  wireCount: number;
  zoom: number;
  activeTool?: InteractionTool | string;
  isTrainerPowerOn?: boolean;
  activeICCount?: number;
  activeModuleCount?: number;
  mode?: 'hardware' | 'circuit' | 'analysis' | string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isRunning,
  clockHz,
  componentCount,
  wireCount,
  zoom,
  activeTool = 'select',
  isTrainerPowerOn = true,
  activeICCount,
  activeModuleCount = 1,
  mode = 'hardware',
}) => {
  const modeLabel = mode === 'circuit' ? 'SCHEMATIC' : mode === 'analysis' ? 'ANALYSIS' : 'TRAINER';

  return (
    <footer className="app-statusbar">
      <div className="statusbar-left">
        {/* Simulation State Indicator */}
        <div className="status-metric state-metric">
          <div
            className={`status-indicator-dot ${isRunning ? 'active pulse' : ''}`}
            title={isRunning ? `Simulation Running (${clockHz} Hz)` : 'Simulation Paused / Idle'}
          />
          <span style={{ fontWeight: 700, color: isRunning ? 'var(--signal-high)' : 'var(--text-secondary)' }}>
            {isRunning ? `RUNNING (${clockHz} Hz)` : 'PAUSED'}
          </span>
        </div>

        {/* Clock Frequency */}
        <div className="status-metric">
          <span className="status-label">CLK:</span>
          <span className="status-value">{clockHz} Hz</span>
        </div>

        {/* Master Power Status */}
        <div className="status-metric" style={{ opacity: isTrainerPowerOn ? 1 : 0.6 }}>
          <span className="status-label">PWR:</span>
          <span
            style={{
              color: isTrainerPowerOn ? 'var(--signal-high)' : 'var(--signal-low)',
              fontWeight: 700,
            }}
          >
            {isTrainerPowerOn ? '+5.0V ON' : '0.0V OFF'}
          </span>
        </div>

        {/* Operating Mode */}
        <div className="status-metric">
          <span className="status-label">MODE:</span>
          <span className="status-value status-mode-badge">{modeLabel}</span>
        </div>

        {/* Active Tool */}
        <div className="status-metric">
          <span className="status-label">TOOL:</span>
          <span className="status-value" style={{ color: 'var(--border-focus)', textTransform: 'uppercase' }}>
            {activeTool}
          </span>
        </div>
      </div>

      <div className="statusbar-right">
        {/* Modules Count if in Trainer mode */}
        {mode === 'hardware' && (
          <div className="status-metric">
            <span className="status-label">MODULES:</span>
            <span className="status-value">{activeModuleCount}</span>
          </div>
        )}

        {/* Active IC count */}
        {activeICCount !== undefined && (
          <div className="status-metric">
            <span className="status-label">ICS:</span>
            <span className="status-value">{activeICCount}</span>
          </div>
        )}

        {/* Component & Wire counts */}
        <div className="status-metric">
          <span className="status-label">PARTS:</span>
          <span className="status-value">{componentCount}</span>
        </div>
        <div className="status-metric">
          <span className="status-label">WIRES:</span>
          <span className="status-value">{wireCount}</span>
        </div>

        {/* Zoom */}
        <div className="status-metric">
          <span className="status-label">ZOOM:</span>
          <span className="status-value">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="status-metric" style={{ opacity: 0.6 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>CIRCUITFLOW DELDSIM</span>
        </div>
      </div>
    </footer>
  );
};

export default StatusBar;
