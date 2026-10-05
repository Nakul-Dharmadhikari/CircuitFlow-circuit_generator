import React from 'react';
import { CircuitPreview } from './CircuitPreview';

interface HeroSectionProps {
  onEnterSimulator: () => void;
  onExploreFeatures: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onEnterSimulator,
  onExploreFeatures,
}) => {
  return (
    <section className="landing-hero" aria-label="Product Introduction">
      <div className="hero-content-grid">
        {/* Left Column: Headlines & CTAs */}
        <div className="hero-copy-col">
          <div className="hero-eyebrow">
            <span className="pulse-dot" />
            <span>Digital Logic Workbench & Laboratory</span>
          </div>

          <h1 className="hero-heading">
            Design. Simulate. Understand.{' '}
            <span className="brand-highlight">Digital Logic.</span>
          </h1>

          <p className="hero-subtitle">
            Build digital circuits, experiment with 74xx ICs, simulate hardware, and analyze
            sequential systems in a professional browser-based laboratory.
          </p>

          <div className="hero-cta-group">
            <button
              type="button"
              className="landing-btn primary hero-cta-btn"
              onClick={onEnterSimulator}
            >
              <span>Open Simulator →</span>
            </button>

            <button
              type="button"
              className="landing-btn secondary hero-cta-btn"
              onClick={onExploreFeatures}
            >
              <span>Explore Features</span>
            </button>
          </div>

          <div className="hero-stats-row">
            <div className="hero-stat-item">
              <span className="hero-stat-num">60+</span>
              <span className="hero-stat-label">Verified Gate Tests</span>
            </div>
            <div className="hero-stat-item">
              <span className="hero-stat-num">16-Bit</span>
              <span className="hero-stat-label">Trainer Hardware I/O</span>
            </div>
            <div className="hero-stat-item">
              <span className="hero-stat-num">60 FPS</span>
              <span className="hero-stat-label">Multi-Pass Solver</span>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Circuit Preview */}
        <div className="hero-preview-col">
          <CircuitPreview />
        </div>
      </div>
    </section>
  );
};
