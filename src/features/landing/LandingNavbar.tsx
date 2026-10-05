import React from 'react';
import type { User } from '../../types/circuit';
import type { WorkbenchView } from '../../hooks/useUIState';

interface LandingNavbarProps {
  currentUser: User | null;
  onEnterSimulator: (view?: WorkbenchView) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenShortcuts?: () => void;
  onScrollToSection: (sectionId: string) => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  currentUser,
  onEnterSimulator,
  onOpenAuth,
  onLogout,
  onOpenShortcuts,
  onScrollToSection,
}) => {
  return (
    <header className="landing-navbar" role="banner">
      {/* Brand */}
      <div
        className="landing-nav-brand"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        role="button"
        tabIndex={0}
        aria-label="CircuitFlow Home"
      >
        <div className="landing-brand-mark">
          {/* Authentic circuit node / CF symbol */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="2.5" fill="currentColor" />
            <circle cx="18" cy="18" r="2.5" fill="currentColor" />
            <path d="M6 8.5v4a2 2 0 0 0 2 2h4" />
            <path d="M12 14.5h4a2 2 0 0 1 2 2v1.5" />
            <path d="M14 6h4" />
            <circle cx="18" cy="6" r="1.5" />
          </svg>
        </div>
        <div className="landing-brand-text">
          <span className="landing-brand-title">CircuitFlow</span>
          <span className="landing-brand-badge">Digital Logic Lab</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="landing-nav-links" aria-label="Main Navigation">
        <button
          type="button"
          className="landing-nav-link"
          onClick={() => onEnterSimulator('circuit')}
          title="Open Freeform Schematic Editor"
        >
          <span>📐</span> Workbench
        </button>
        <button
          type="button"
          className="landing-nav-link"
          onClick={() => onEnterSimulator('hardware')}
          title="Open DELDSIM Hardware Trainer Lab"
        >
          <span>🎛️</span> Hardware Lab
        </button>
        <button
          type="button"
          className="landing-nav-link"
          onClick={() => onEnterSimulator('analysis')}
          title="Open State Analysis & Truth Tables"
        >
          <span>📊</span> Analysis
        </button>
        <button
          type="button"
          className="landing-nav-link"
          onClick={() => onScrollToSection('workspace-vault')}
          title="View Engineering Projects & Vault"
        >
          <span>📁</span> Projects
        </button>
      </nav>

      {/* Right Actions */}
      <div className="landing-nav-actions">
        {onOpenShortcuts && (
          <button
            type="button"
            className="landing-btn ghost"
            style={{ padding: '8px 12px', fontSize: '13px' }}
            onClick={onOpenShortcuts}
            title="Keyboard shortcuts and documentation"
          >
            <span>⌨️ Guide</span>
          </button>
        )}

        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                background: 'var(--lp-bg-secondary)',
                borderRadius: '6px',
                border: '1px solid var(--lp-border)',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--lp-text-primary)',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: currentUser.avatarColor || '#06B6D4',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {currentUser.displayName.charAt(0).toUpperCase()}
              </div>
              <span>{currentUser.displayName}</span>
            </div>

            <button
              type="button"
              className="landing-btn ghost"
              style={{ color: 'var(--lp-error)', padding: '6px 10px', fontSize: '12px' }}
              onClick={onLogout}
              title="Sign out of private engineering session"
            >
              Log Out
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="landing-btn secondary"
            onClick={onOpenAuth}
          >
            <span>🔐</span> Sign In
          </button>
        )}

        {/* Primary Strongest CTA */}
        <button
          type="button"
          className="landing-btn primary"
          onClick={() => onEnterSimulator('hardware')}
        >
          <span>Open Simulator →</span>
        </button>
      </div>
    </header>
  );
};
