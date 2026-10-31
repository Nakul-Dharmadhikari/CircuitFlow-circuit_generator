import React from 'react';

interface CanvasEmptyStateProps {
  onOpenLibrary: () => void;
  onOpenLabs: () => void;
  onSwitchToTrainer?: () => void;
  onStartTour?: () => void;
}

export const CanvasEmptyState: React.FC<CanvasEmptyStateProps> = ({
  onOpenLibrary,
  onOpenLabs,
  onSwitchToTrainer,
  onStartTour,
}) => {
  return (
    <div className="canvas-empty-state-overlay" aria-label="Empty Canvas Quick Start">
      <div className="canvas-empty-state-card">
        {/* Subtle Brand Badge */}
        <div className="empty-state-badge">
          <span className="badge-dot">●</span>
          <span>CIRCUITFLOW COPPER LAB</span>
        </div>

        {/* Title & Introduction */}
        <h2 className="empty-state-title">Schematic Canvas is Ready</h2>
        <p className="empty-state-desc">
          Design combinational and sequential digital circuits, verify electrical states with real-time
          simulation, and analyze logic equations. Choose a starting workflow below:
        </p>

        {/* Quick Actions Grid */}
        <div className="empty-state-actions">
          <button
            type="button"
            className="empty-action-card primary"
            onClick={onOpenLibrary}
            title="Open Component Library drawer to place gates and ICs"
          >
            <div className="action-icon">➕</div>
            <div className="action-info">
              <strong className="action-title">Add Components</strong>
              <span className="action-desc">Pick logic gates, multiplexers, flip-flops & switches</span>
            </div>
          </button>

          <button
            type="button"
            className="empty-action-card secondary"
            onClick={onOpenLabs}
            title="Browse 12 pre-built curriculum laboratory experiments"
          >
            <div className="action-icon">🔬</div>
            <div className="action-info">
              <strong className="action-title">Pre-Built Labs</strong>
              <span className="action-desc">Explore 12 verified experiments with guided checkpoints</span>
            </div>
          </button>

          {onSwitchToTrainer && (
            <button
              type="button"
              className="empty-action-card"
              onClick={onSwitchToTrainer}
              title="Switch to physical Digital Trainer Board layout with DIP sockets"
            >
              <div className="action-icon">📟</div>
              <div className="action-info">
                <strong className="action-title">Hardware Trainer</strong>
                <span className="action-desc">Work with virtual IC sockets, 16 logic switches & LEDs</span>
              </div>
            </button>
          )}

          {onStartTour && (
            <button
              type="button"
              className="empty-action-card accent"
              onClick={onStartTour}
              title="Take a quick interactive walkthrough of the simulator"
            >
              <div className="action-icon">🎓</div>
              <div className="action-info">
                <strong className="action-title">Interactive Tour</strong>
                <span className="action-desc">Learn the 6-step core workflow in 60 seconds</span>
              </div>
            </button>
          )}
        </div>

        {/* Quick Hint */}
        <div className="empty-state-footnote">
          <span>💡 Press <kbd className="mono-kbd">Space</kbd> to toggle simulation, <kbd className="mono-kbd">T</kbd> to single-step, <kbd className="mono-kbd">?</kbd> for shortcuts.</span>
        </div>
      </div>
    </div>
  );
};

export default CanvasEmptyState;
