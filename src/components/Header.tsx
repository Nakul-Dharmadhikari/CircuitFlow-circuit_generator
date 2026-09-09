import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types/circuit';

interface HeaderProps {
  isRunning: boolean;
  onToggleRun: () => void;
  onStep: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onResetZoom: () => void;
  isWaveformOpen: boolean;
  onToggleWaveform: () => void;
  onOpenTruthTable: () => void;
  onOpenLabPresets: () => void;
  onOpenShortcuts: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onOpenSavedCircuits: () => void;
  onNewCircuit?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  clockHz: number;
  onClockHzChange: (freq: number) => void;
  onOpenCreateIC?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  onToggleRun,
  onStep,
  zoom,
  onZoomChange,
  onResetZoom,
  isWaveformOpen,
  onToggleWaveform,
  onOpenTruthTable,
  onOpenLabPresets,
  onOpenShortcuts,
  currentUser,
  onOpenAuth,
  onOpenSavedCircuits,
  onNewCircuit,
  soundEnabled,
  onToggleSound,
  theme,
  onToggleTheme,
  clockHz,
  onClockHzChange,
  onOpenCreateIC,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="workbench-header minimalistic-green">
      {/* 1. Brand Logo */}
      <div className="brand-section">
        <div className="brand-logo" title="CircuitFlow Digital Electronics Workbench">
          <div className="brand-icon">CF</div>
          <div className="brand-title">
            <span className="brand-name">CircuitFlow</span>
            <span className="brand-badge">PRO</span>
          </div>
        </div>
      </div>

      <div className="header-divider" />

      {/* 2. Simulation Run, Step & Clock Controls */}
      <div className="header-group sim-group">
        <button
          type="button"
          className={`header-btn ${isRunning ? 'active primary pulse' : ''}`}
          onClick={onToggleRun}
          title="Toggle Simulation Run / Pause (Space)"
        >
          <span>{isRunning ? '⏸' : '▶'}</span>
          <span className="btn-label">{isRunning ? 'Pause' : 'Run'}</span>
        </button>

        <button
          type="button"
          className="header-btn"
          onClick={onStep}
          disabled={isRunning}
          title="Single Clock Step (T)"
        >
          <span>⏭</span>
          <span className="btn-label">Step</span>
        </button>

        {/* Clock Frequency Input Widget */}
        <div className="clock-freq-widget" title="Clock generator frequency in Hertz (Hz)">
          <span className="clock-widget-label">CLK:</span>
          <button
            type="button"
            className="freq-step-btn"
            onClick={() => onClockHzChange(Math.max(0.5, clockHz <= 1 ? clockHz - 0.25 : clockHz - 1))}
            title="Decrease clock frequency"
          >
            −
          </button>
          <input
            type="number"
            className="freq-num-input"
            value={clockHz}
            min={0.1}
            max={100}
            step={0.5}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val > 0) {
                onClockHzChange(Math.min(Math.max(val, 0.1), 100));
              }
            }}
          />
          <span className="freq-unit">Hz</span>
          <button
            type="button"
            className="freq-step-btn"
            onClick={() => onClockHzChange(Math.min(100, clockHz < 1 ? clockHz + 0.25 : clockHz + 1))}
            title="Increase clock frequency"
          >
            +
          </button>
        </div>
      </div>

      <div className="header-divider" />

      {/* 3. Circuit Analysis & Tools (Directly Visible) */}
      <div className="header-group tools-group">
        <button
          type="button"
          className={`header-btn ${isWaveformOpen ? 'active primary' : ''}`}
          onClick={onToggleWaveform}
          title="Multi-channel digital waveform oscilloscope analyzer"
        >
          <span>📈</span>
          <span className="btn-label">Waveform</span>
        </button>

        <button
          type="button"
          className="header-btn"
          onClick={onOpenTruthTable}
          title="Truth Table & State Transition Matrix Generator"
        >
          <span>📋</span>
          <span className="btn-label">Truth Table</span>
        </button>

        <button
          type="button"
          className="header-btn"
          onClick={onOpenLabPresets}
          title="Pre-Built Verified Lab Experiments & Schematics"
        >
          <span>🔬</span>
          <span className="btn-label">Presets</span>
        </button>

        {onOpenCreateIC && (
          <button
            type="button"
            className="header-btn highlight-btn"
            onClick={onOpenCreateIC}
            title="Package subcircuit or design custom 20-pin DIP IC"
          >
            <span>✨</span>
            <span className="btn-label">Create IC</span>
          </button>
        )}
      </div>

      {/* 4. Right Controls: Zoom, Sound, Theme, Save, Account */}
      <div className="header-group right-group">
        {/* Zoom Controls */}
        <div className="zoom-controls-widget">
          <button
            type="button"
            className="zoom-step-btn"
            onClick={() => onZoomChange(Math.max(zoom * 0.9, 0.4))}
            title="Zoom Out"
          >
            −
          </button>
          <span
            className="zoom-val-text"
            onClick={onResetZoom}
            title="Click to reset zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="zoom-step-btn"
            onClick={() => onZoomChange(Math.min(zoom * 1.1, 2.5))}
            title="Zoom In"
          >
            +
          </button>
        </div>

        {/* Mute/Sound */}
        <button
          type="button"
          className={`header-btn icon-only ${!soundEnabled ? 'muted' : ''}`}
          onClick={onToggleSound}
          title={soundEnabled ? 'Sound Effects Enabled (Click to Mute)' : 'Sound Muted (Click to Unmute)'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          className="header-btn icon-only"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Keyboard Shortcuts */}
        <button
          type="button"
          className="header-btn icon-only"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts Guide"
        >
          ⌨️
        </button>

        {/* Saved Schematics */}
        <button
          type="button"
          className="header-btn icon-only"
          onClick={onOpenSavedCircuits}
          title="Saved Circuits & Schematics Library"
        >
          💾
        </button>

        {/* New Schematic */}
        {onNewCircuit && (
          <button
            type="button"
            className="header-btn icon-only"
            onClick={onNewCircuit}
            title="New Clean Workbench"
          >
            📄
          </button>
        )}

        {/* User Account / Profile */}
        <div className="user-profile-widget" ref={userMenuRef}>
          {currentUser ? (
            <button
              type="button"
              className="user-pill-btn"
              onClick={() => setIsUserMenuOpen((p) => !p)}
              title={`Logged in as ${currentUser.displayName}`}
            >
              <div className="user-avatar-dot">{currentUser.displayName.charAt(0).toUpperCase()}</div>
              <span className="user-pill-name">{currentUser.displayName}</span>
            </button>
          ) : (
            <button
              type="button"
              className="header-btn highlight-btn"
              onClick={onOpenAuth}
              title="Sign in or create account"
            >
              Log in
            </button>
          )}

          {isUserMenuOpen && currentUser && (
            <div className="user-dropdown-popover">
              <div className="user-info-row">
                <span className="user-role-badge">@{currentUser.username}</span>
                <span className="user-name-text">{currentUser.displayName}</span>
              </div>
              <div className="popover-divider" />
              <button
                type="button"
                className="user-menu-item danger"
                onClick={() => {
                  onOpenAuth();
                  setIsUserMenuOpen(false);
                }}
              >
                Switch Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
