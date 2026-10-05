import React from 'react';
import type { WorkbenchView } from '../../hooks/useUIState';
import type { Circuit } from '../../types/circuit';

interface MainWorkspaceProps {
  currentView: WorkbenchView;
  onViewChange: (view: WorkbenchView) => void;
  children: React.ReactNode;
  onOpenTruthTable?: () => void;
  circuit?: Circuit;
  isRunning?: boolean;
}

export const MainWorkspace: React.FC<MainWorkspaceProps> = ({
  currentView,
  onViewChange,
  children,
  onOpenTruthTable,
  circuit,
  isRunning = false,
}) => {
  if (currentView === 'analysis') {
    const totalComponents = circuit?.components.length || 0;
    const totalWires = circuit?.wires.length || 0;
    const inputCount =
      circuit?.components.filter(
        (c) =>
          c.type === 'toggle' ||
          c.type === 'push_button' ||
          c.customProps?.isTrainerInput ||
          (c.inputs.length === 0 && c.outputs.length > 0)
      ).length || 0;
    const outputCount =
      circuit?.components.filter(
        (c) =>
          c.type === 'led' ||
          c.type === 'probe' ||
          c.type === 'seven_segment' ||
          c.type === 'hex_display' ||
          c.type === 'buzzer' ||
          c.customProps?.isTrainerOutput ||
          (c.outputs.length === 0 && c.inputs.length > 0)
      ).length || 0;
    const hasClock = Boolean(
      circuit?.components.some((c) => c.type === 'clock' || c.customProps?.isTrainerClock)
    );
    const sequentialCount =
      circuit?.components.filter(
        (c) =>
          c.type.includes('7474') ||
          c.type.includes('7476') ||
          c.type.includes('74193') ||
          c.type.includes('flip_flop') ||
          c.type.includes('counter')
      ).length || 0;
    const simStatus = isRunning ? 'Active / Running' : 'Idle / Step Mode';

    return (
      <main className="analysis-workspace-view">
        <div className="analysis-header">
          <div className="analysis-title">
            <span>📊 Circuit Analysis & State Verification</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="shell-btn primary"
              onClick={onOpenTruthTable}
            >
              <span>📋 Open Truth Table Matrix</span>
            </button>
            <button
              type="button"
              className="shell-btn"
              onClick={() => onViewChange('hardware')}
            >
              <span>↩ Return to Workbench</span>
            </button>
          </div>
        </div>

        {/* Live Unified Circuit Telemetry Panel */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Components</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{totalComponents}</div>
          </div>
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Wires</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{totalWires}</div>
          </div>
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inputs</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{inputCount}</div>
          </div>
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Outputs</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{outputCount}</div>
          </div>
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clock Source</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: hasClock ? 'var(--signal-high)' : 'var(--text-muted)', marginTop: '6px' }}>
              {hasClock ? '● Present' : '○ None'}
            </div>
          </div>
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sequential ICs</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{sequentialCount}</div>
          </div>
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Simulation</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: isRunning ? 'var(--signal-high)' : 'var(--text-secondary)', marginTop: '8px' }}>
              {simStatus}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '24px',
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <h3 style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
            Integrated Analysis Engine
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            The analysis engine evaluates the unified circuit model across combinational and sequential domains.
            Click <strong>Open Truth Table Matrix</strong> above to generate the full state transition table, or return to the workbench to modify inputs and inspect live waveform dynamics.
          </p>


          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              marginTop: '12px',
            }}
          >
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                🧮 Combinational Truth Tables
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Exhaustive 2ⁿ input excitation evaluation with cycle detection and contention identification.
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                ⏱ Sequential State Transitions
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Flip-flop and counter state tracking (Qₙ → Qₙ₊₁) on clock transition boundaries.
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '6px',
                border: '1px solid var(--border-strong)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                🗺 Karnaugh Maps (Phase 5)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                SOP / POS algebraic minimization and prime implicant grouping.
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-workspace-container main-workspace">
      {currentView === 'circuit' && (
        <div className="schematic-view-banner">
          <span>📐 Circuit Editor — Schematic Mode (Same Engine & Model)</span>
          <button
            type="button"
            className="shell-btn"
            style={{ padding: '2px 8px', fontSize: '11px' }}
            onClick={() => onViewChange('hardware')}
          >
            Switch to Hardware Lab
          </button>
        </div>
      )}

      {children}
    </main>
  );
};
export default MainWorkspace;
