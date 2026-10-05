import React from 'react';
import type { User } from '../../types/circuit';
import type { LabExperiment } from '../../presets/labExperiments';
import type { WorkbenchView } from '../../hooks/useUIState';
import { soundFx } from '../../audio/soundEffects';

import { LandingNavbar } from './LandingNavbar';
import { HeroSection } from './HeroSection';
import { FeatureSection } from './FeatureSection';
import { DifferentiationSection } from './DifferentiationSection';
import { WorkspaceSection } from './WorkspaceSection';
import { PresetLabSection } from './PresetLabSection';
import './landing.css';

export interface LandingPageProps {
  currentUser: User | null;
  onUserLoggedIn: (user: User) => void;
  onUserLoggedOut: () => void;
  onEnterSimulator: (view?: WorkbenchView) => void;
  onLoadExperimentAndEnter: (exp: LabExperiment) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenShortcuts?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentUser,
  onUserLoggedIn,
  onUserLoggedOut,
  onEnterSimulator,
  onLoadExperimentAndEnter,
  onOpenShortcuts,
}) => {
  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleEnterView = (view: WorkbenchView = 'hardware') => {
    soundFx.playButtonTap();
    onEnterSimulator(view);
  };

  const handleOpenAuth = () => {
    scrollToSection('workspace-vault');
  };

  return (
    <div className="landing-page" role="document">
      {/* Background Engineering Grid (Light & Clean) */}
      <div className="landing-grid-bg" aria-hidden="true" />

      {/* Top Navigation */}
      <LandingNavbar
        currentUser={currentUser}
        onEnterSimulator={handleEnterView}
        onOpenAuth={handleOpenAuth}
        onLogout={onUserLoggedOut}
        onOpenShortcuts={onOpenShortcuts}
        onScrollToSection={scrollToSection}
      />

      {/* Hero Section with Live Schematic Preview */}
      <HeroSection
        onEnterSimulator={() => handleEnterView('hardware')}
        onExploreFeatures={() => scrollToSection('capabilities-section')}
      />

      {/* 3-Column Product Capabilities (Build / Hardware Lab / Analyze) */}
      <FeatureSection onSelectFeature={handleEnterView} />

      {/* Product Differentiation: One Circuit. Multiple Workspaces. */}
      <DifferentiationSection onSelectView={handleEnterView} />

      {/* Engineering Workspace & Private Isolated Vault */}
      <WorkspaceSection
        currentUser={currentUser}
        onUserLoggedIn={onUserLoggedIn}
        onUserLoggedOut={onUserLoggedOut}
        onEnterSimulator={() => handleEnterView('circuit')}
      />

      {/* Courseware & Verified Laboratory Experiments */}
      <PresetLabSection onLoadExperimentAndEnter={onLoadExperimentAndEnter} />

      {/* Engineering Footer */}
      <footer className="landing-footer">
        <div>
          <strong style={{ color: 'var(--lp-text-primary)' }}>CircuitFlow</strong> — Professional Digital Electronics & Logic Workbench
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {onOpenShortcuts && (
            <button
              type="button"
              className="landing-btn ghost"
              style={{ fontSize: '12.5px', padding: '4px 8px' }}
              onClick={onOpenShortcuts}
            >
              ⌨️ Keyboard Shortcuts
            </button>
          )}
          <span style={{ fontSize: '12px', color: 'var(--lp-text-muted)' }}>
            v2.6 Engineering Release • Multi-Pass Logic Solver
          </span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
