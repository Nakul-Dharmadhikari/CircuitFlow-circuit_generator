import React from 'react';
import type { WorkbenchView } from '../../hooks/useUIState';

interface FeatureSectionProps {
  onSelectFeature: (view: WorkbenchView) => void;
}

export const FeatureSection: React.FC<FeatureSectionProps> = ({ onSelectFeature }) => {
  const capabilities = [
    {
      id: 'build',
      view: 'circuit' as WorkbenchView,
      tag: 'Freeform Schematic',
      title: 'Build Digital Circuits',
      desc: 'Create circuits using gates, flip-flops, counters, multiplexers, ICs and reusable components with orthogonal wiring and grid snapping.',
      action: 'Launch Circuit Editor →',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <path d="M10 6.5h4" />
          <path d="M17.5 10v4" />
          <path d="M6.5 10v7a2 2 0 0 0 2 2h5.5" />
        </svg>
      ),
    },
    {
      id: 'hardware',
      view: 'hardware' as WorkbenchView,
      tag: 'DELDSIM Virtual Trainer',
      title: 'Prototype Digital Hardware',
      desc: 'Experiment with virtual inputs, outputs, clocks, seven-segment displays, VCC, GND and 3 horizontal DIP-20 IC sockets.',
      action: 'Enter Hardware Lab →',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <path d="M9 1v3" />
          <path d="M15 1v3" />
          <path d="M9 20v3" />
          <path d="M15 20v3" />
          <path d="M20 9h3" />
          <path d="M20 14h3" />
          <path d="M1 9h3" />
          <path d="M1 14h3" />
        </svg>
      ),
    },
    {
      id: 'analyze',
      view: 'analysis' as WorkbenchView,
      tag: 'State Verification',
      title: 'Understand Circuit Behavior',
      desc: 'Explore truth tables, signals, timing behavior and sequential state transitions with cycle detection and contention warnings.',
      action: 'Open State Analysis →',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 5 5-9" />
          <circle cx="7" cy="16" r="1.5" fill="currentColor" />
          <circle cx="11" cy="8" r="1.5" fill="currentColor" />
          <circle cx="15" cy="13" r="1.5" fill="currentColor" />
          <circle cx="20" cy="4" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
  ];

  return (
    <section className="landing-section" id="capabilities-section" aria-label="Product Capabilities">
      <div className="section-header-center">
        <div className="section-eyebrow">Comprehensive Engineering Suite</div>
        <h2 className="section-title">Designed for Digital Electronics</h2>
        <p className="section-subtitle">
          Everything you need to design, test, verify, and understand logic networks in one seamless browser application.
        </p>
      </div>

      <div className="capabilities-grid">
        {capabilities.map((cap) => (
          <div
            key={cap.id}
            className="capability-card"
            onClick={() => onSelectFeature(cap.view)}
            role="button"
            tabIndex={0}
          >
            <div className="capability-icon-wrap">{cap.icon}</div>
            <span className="capability-card-tag">{cap.tag}</span>
            <h3 className="capability-card-title">{cap.title}</h3>
            <p className="capability-card-desc">{cap.desc}</p>
            <div className="capability-card-footer">
              <span>{cap.action}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
