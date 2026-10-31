import React from 'react';
import type { WorkbenchView } from '../../hooks/useUIState';

interface DifferentiationSectionProps {
  onSelectView: (view: WorkbenchView) => void;
}

export const DifferentiationSection: React.FC<DifferentiationSectionProps> = ({ onSelectView }) => {
  return (
    <section className="landing-section" aria-label="Unified Architecture">
      <div className="differentiation-card">
        {/* Left Side: Architectural narrative */}
        <div className="diff-copy-side">
          <div className="section-eyebrow">Architectural Synergy</div>
          <h2 className="section-title" style={{ fontSize: '30px' }}>
            One Circuit. Multiple Workspaces.
          </h2>
          <p className="section-subtitle" style={{ fontSize: '15px', marginBottom: '20px' }}>
            Unlike traditional simulators that force you to choose between abstract schematic diagrams and physical laboratory hardware, CircuitFlow delivers a single unified circuit model powering three complementary presentation layers.
          </p>

          <ul style={{ paddingLeft: '18px', margin: '0 0 24px 0', color: 'var(--lp-text-secondary)', fontSize: '13.5px', lineHeight: 1.8 }}>
            <li>
              <strong style={{ color: 'var(--lp-text-primary)' }}>Circuit Editor:</strong> Free-form Logisim-level schematic design with clean orthogonal wiring and grid snapping.
            </li>
            <li>
              <strong style={{ color: 'var(--lp-text-primary)' }}>Hardware Lab:</strong> DELDSIM-style virtual trainer board with 16-bit I/O, clock generators, and DIP sockets.
            </li>
            <li>
              <strong style={{ color: 'var(--lp-text-primary)' }}>Analysis View:</strong> Exhaustive combinational truth tables and sequential state transition tracking.
            </li>
            <li>
              <strong style={{ color: 'var(--lp-primary)' }}>Zero State Drift:</strong> Modifying a component in one view is instantaneously reflected across all other views.
            </li>
          </ul>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="landing-btn primary"
              onClick={() => onSelectView('hardware')}
            >
              <span>Try Unified Dual Workspace →</span>
            </button>
          </div>
        </div>

        {/* Right Side: Architecture Pipeline Flow Diagram */}
        <div className="diff-workflow-diagram">
          {/* Node 1: Circuit Editor */}
          <div
            className="workflow-node"
            onClick={() => onSelectView('circuit')}
            style={{ cursor: 'pointer' }}
            title="Click to view Circuit Editor"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '20px' }}>📐</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--lp-text-primary)' }}>
                  Circuit Editor
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--lp-text-secondary)' }}>
                  Freeform Schematic • Orthogonal Wires • Gates & ICs
                </div>
              </div>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--lp-primary)', fontWeight: 700 }}>Open →</span>
          </div>

          <div className="workflow-connector">↓ Synchronized Data Flow ↓</div>

          {/* Node 2: Central Unified Circuit Model */}
          <div className="workflow-node central">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '20px' }}>⚡</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0891B2' }}>
                  Unified Circuit Model & Engine
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--lp-text-secondary)' }}>
                  Single Source of Truth • 60 FPS Multi-Pass Solver
                </div>
              </div>
            </div>
            <span style={{ fontSize: '10px', background: 'var(--lp-primary)', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              CORE
            </span>
          </div>

          <div className="workflow-connector">↓ Continuous Simulation Bridge ↓</div>

          {/* Node 3: Hardware Lab */}
          <div
            className="workflow-node"
            onClick={() => onSelectView('hardware')}
            style={{ cursor: 'pointer' }}
            title="Click to view Hardware Lab"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '20px' }}>🎛️</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--lp-text-primary)' }}>
                  Hardware Lab
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--lp-text-secondary)' }}>
                  DELDSIM Trainer Board • 16 In/Out • Dual 7-Segments
                </div>
              </div>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--lp-primary)', fontWeight: 700 }}>Open →</span>
          </div>

          <div className="workflow-connector">↓ Mathematical State Analysis ↓</div>

          {/* Node 4: Analysis View */}
          <div
            className="workflow-node"
            onClick={() => onSelectView('analysis')}
            style={{ cursor: 'pointer' }}
            title="Click to view Analysis"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '20px' }}>📊</div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--lp-text-primary)' }}>
                  Analysis View
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--lp-text-secondary)' }}>
                  Truth Table Matrices • Sequential Qₙ₊₁ Transitions
                </div>
              </div>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--lp-primary)', fontWeight: 700 }}>Open →</span>
          </div>
        </div>
      </div>
    </section>
  );
};
