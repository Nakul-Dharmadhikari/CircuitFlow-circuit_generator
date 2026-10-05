import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../../types/circuit';
import type { WorkbenchView } from '../../hooks/useUIState';

interface TopBarProps {
  projectName: string;
  isDirty?: boolean;
  onProjectNameChange?: (name: string) => void;
  currentView: WorkbenchView;
  onViewChange: (view: WorkbenchView) => void;
  isRunning: boolean;
  onToggleRun: () => void;
  onStep: () => void;
  onReset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canCopy?: boolean;
  canPaste?: boolean;
  hasSelection?: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenSavedCircuits: () => void;
  onOpenTruthTable: () => void;
  onOpenWaveform: () => void;
  onOpenLabPresets: () => void;
  onOpenShortcuts: () => void;
  onOpenCustomIC: () => void;
  onNewCircuit: () => void;
  onClearCanvas: () => void;
  onSelectAll?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDeleteSelected?: () => void;
  onResetViewport?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  zoom?: number;
  onSaveCircuit?: () => void;
  onToggleLibrary?: () => void;
  onToggleInspector?: () => void;
  clockHz: number;
  onClockHzChange: (hz: number) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectName,
  isDirty = false,
  onProjectNameChange,
  currentView,
  onViewChange,
  isRunning,
  onToggleRun,
  onStep,
  onReset,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canCopy = true,
  canPaste = true,
  hasSelection = false,
  soundEnabled,
  onToggleSound,
  theme,
  onToggleTheme,
  currentUser,
  onOpenAuth,
  onLogout: _onLogout,
  onOpenSavedCircuits,
  onOpenTruthTable,
  onOpenWaveform,
  onOpenLabPresets,
  onOpenShortcuts,
  onOpenCustomIC,
  onNewCircuit,
  onClearCanvas,
  onSelectAll,
  onCopy,
  onPaste,
  onDeleteSelected,
  onResetViewport,
  onZoomIn,
  onZoomOut,
  zoom = 1,
  onSaveCircuit,
  onToggleLibrary,
  onToggleInspector,
  clockHz,
  onClockHzChange,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const closeMenu = () => setActiveMenu(null);

  return (
    <header className="app-topbar">
      {/* -------------------------------------------------------------------
          LEFT: CircuitFlow Brand + Trainer / Schematic Mode Switch
          ------------------------------------------------------------------- */}
      <div className="topbar-left">
        <div
          className="app-brand"
          onClick={() => onViewChange('landing')}
          title="Return to CircuitFlow Overview / Landing"
        >
          <div className="brand-icon">⚡</div>
          <div className="brand-title">
            <span>CircuitFlow</span>
            <span className="brand-badge">SIM</span>
          </div>
        </div>

        {/* Mode Toggle: Trainer Mode vs Schematic Mode */}
        <div className="mode-toggle-segmented" title="Switch Between Hardware Trainer Kit and Schematic Editor">
          <button
            type="button"
            className={`mode-seg-btn ${currentView === 'hardware' ? 'active' : ''}`}
            onClick={() => onViewChange('hardware')}
          >
            ⚡ Trainer
          </button>
          <button
            type="button"
            className={`mode-seg-btn ${currentView === 'circuit' ? 'active' : ''}`}
            onClick={() => onViewChange('circuit')}
          >
            📐 Schematic
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------
          CENTER: Dropdown Menus Bar (File, Edit, View, Simulation, Analysis, Labs)
          ------------------------------------------------------------------- */}
      <div className="topbar-center-section" ref={menuBarRef}>
        <nav className="menu-bar">
          {/* FILE MENU */}
          <div className="menu-item-wrapper">
            <button
              type="button"
              className={`menu-item-btn ${activeMenu === 'file' ? 'active' : ''}`}
              onClick={() => handleMenuClick('file')}
            >
              File ▾
            </button>
            {activeMenu === 'file' && (
              <div className="menu-dropdown">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onNewCircuit();
                    closeMenu();
                  }}
                >
                  <span>New Circuit</span>
                  <span className="dropdown-shortcut">Ctrl+N</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenSavedCircuits();
                    closeMenu();
                  }}
                >
                  <span>Open Saved Circuit...</span>
                  <span className="dropdown-shortcut">Ctrl+O</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onSaveCircuit?.();
                    closeMenu();
                  }}
                >
                  <span>Save Circuit (.deld)</span>
                  <span className="dropdown-shortcut">Ctrl+S</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenSavedCircuits();
                    closeMenu();
                  }}
                >
                  <span>Save As / Project Vault...</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenLabPresets();
                    closeMenu();
                  }}
                >
                  <span>Lab Experiments & Presets...</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item danger-item"
                  onClick={() => {
                    onClearCanvas();
                    closeMenu();
                  }}
                >
                  <span>Clear Workbench</span>
                </button>
              </div>
            )}
          </div>

          {/* EDIT MENU */}
          <div className="menu-item-wrapper">
            <button
              type="button"
              className={`menu-item-btn ${activeMenu === 'edit' ? 'active' : ''}`}
              onClick={() => handleMenuClick('edit')}
            >
              Edit ▾
            </button>
            {activeMenu === 'edit' && (
              <div className="menu-dropdown">
                <button
                  type="button"
                  className="dropdown-item"
                  disabled={!canUndo}
                  onClick={() => {
                    onUndo();
                    closeMenu();
                  }}
                >
                  <span>Undo</span>
                  <span className="dropdown-shortcut">Ctrl+Z</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  disabled={!canRedo}
                  onClick={() => {
                    onRedo();
                    closeMenu();
                  }}
                >
                  <span>Redo</span>
                  <span className="dropdown-shortcut">Ctrl+Y</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  disabled={!canCopy || !hasSelection}
                  onClick={() => {
                    onCopy?.();
                    closeMenu();
                  }}
                >
                  <span>Copy</span>
                  <span className="dropdown-shortcut">Ctrl+C</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  disabled={!canPaste}
                  onClick={() => {
                    onPaste?.();
                    closeMenu();
                  }}
                >
                  <span>Paste</span>
                  <span className="dropdown-shortcut">Ctrl+V</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onSelectAll?.();
                    closeMenu();
                  }}
                >
                  <span>Select All</span>
                  <span className="dropdown-shortcut">Ctrl+A</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item danger-item"
                  disabled={!hasSelection}
                  onClick={() => {
                    onDeleteSelected?.();
                    closeMenu();
                  }}
                >
                  <span>Delete Selection</span>
                  <span className="dropdown-shortcut">Del</span>
                </button>
              </div>
            )}
          </div>

          {/* VIEW MENU */}
          <div className="menu-item-wrapper">
            <button
              type="button"
              className={`menu-item-btn ${activeMenu === 'view' ? 'active' : ''}`}
              onClick={() => handleMenuClick('view')}
            >
              View ▾
            </button>
            {activeMenu === 'view' && (
              <div className="menu-dropdown">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onResetViewport?.();
                    closeMenu();
                  }}
                >
                  <span>Fit Circuit / Reset View</span>
                  <span className="dropdown-shortcut">100%</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onZoomIn?.();
                    closeMenu();
                  }}
                >
                  <span>Zoom In</span>
                  <span className="dropdown-shortcut">+</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onZoomOut?.();
                    closeMenu();
                  }}
                >
                  <span>Zoom Out</span>
                  <span className="dropdown-shortcut">-</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onToggleLibrary?.();
                    closeMenu();
                  }}
                >
                  <span>Toggle Component Library</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onToggleInspector?.();
                    closeMenu();
                  }}
                >
                  <span>Toggle Inspector Panel</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onViewChange('hardware');
                    closeMenu();
                  }}
                >
                  <span>Trainer Board Mode</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onViewChange('circuit');
                    closeMenu();
                  }}
                >
                  <span>Schematic Mode</span>
                </button>
              </div>
            )}
          </div>

          {/* SIMULATION MENU */}
          <div className="menu-item-wrapper">
            <button
              type="button"
              className={`menu-item-btn ${activeMenu === 'simulation' ? 'active' : ''}`}
              onClick={() => handleMenuClick('simulation')}
            >
              Simulation ▾
            </button>
            {activeMenu === 'simulation' && (
              <div className="menu-dropdown">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onToggleRun();
                    closeMenu();
                  }}
                >
                  <span>{isRunning ? 'Pause Simulation' : 'Run Simulation'}</span>
                  <span className="dropdown-shortcut">Space</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onStep();
                    closeMenu();
                  }}
                >
                  <span>Single Step Clock Tick</span>
                  <span className="dropdown-shortcut">T</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onReset();
                    closeMenu();
                  }}
                >
                  <span>Reset States</span>
                </button>
                <div className="dropdown-divider" />
                <div className="dropdown-header">Clock Speed</div>
                <button
                  type="button"
                  className={`dropdown-item ${clockHz === 0.5 ? 'selected' : ''}`}
                  onClick={() => {
                    onClockHzChange(0.5);
                    closeMenu();
                  }}
                >
                  <span>0.5 Hz (Slow)</span>
                </button>
                <button
                  type="button"
                  className={`dropdown-item ${clockHz === 1 ? 'selected' : ''}`}
                  onClick={() => {
                    onClockHzChange(1);
                    closeMenu();
                  }}
                >
                  <span>1.0 Hz (Standard)</span>
                </button>
                <button
                  type="button"
                  className={`dropdown-item ${clockHz === 2 ? 'selected' : ''}`}
                  onClick={() => {
                    onClockHzChange(2);
                    closeMenu();
                  }}
                >
                  <span>2.0 Hz</span>
                </button>
                <button
                  type="button"
                  className={`dropdown-item ${clockHz === 5 ? 'selected' : ''}`}
                  onClick={() => {
                    onClockHzChange(5);
                    closeMenu();
                  }}
                >
                  <span>5.0 Hz</span>
                </button>
                <button
                  type="button"
                  className={`dropdown-item ${clockHz === 10 ? 'selected' : ''}`}
                  onClick={() => {
                    onClockHzChange(10);
                    closeMenu();
                  }}
                >
                  <span>10.0 Hz (Fast)</span>
                </button>
              </div>
            )}
          </div>

          {/* ANALYSIS MENU */}
          <div className="menu-item-wrapper">
            <button
              type="button"
              className={`menu-item-btn ${activeMenu === 'analysis' ? 'active' : ''}`}
              onClick={() => handleMenuClick('analysis')}
            >
              Analysis ▾
            </button>
            {activeMenu === 'analysis' && (
              <div className="menu-dropdown">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenTruthTable();
                    closeMenu();
                  }}
                >
                  <span>Truth Table & State Analyzer...</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenWaveform();
                    closeMenu();
                  }}
                >
                  <span>Oscilloscope Waveform Scope...</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onViewChange('analysis');
                    closeMenu();
                  }}
                >
                  <span>Full Analysis Workspace View</span>
                </button>
              </div>
            )}
          </div>

          {/* LABS MENU */}
          <div className="menu-item-wrapper">
            <button
              type="button"
              className={`menu-item-btn ${activeMenu === 'labs' ? 'active' : ''}`}
              onClick={() => handleMenuClick('labs')}
            >
              Labs ▾
            </button>
            {activeMenu === 'labs' && (
              <div className="menu-dropdown">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenLabPresets();
                    closeMenu();
                  }}
                >
                  <span>Lab Experiments & Presets...</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenCustomIC();
                    closeMenu();
                  }}
                >
                  <span>Custom IC Packaging Builder...</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenShortcuts();
                    closeMenu();
                  }}
                >
                  <span>Keyboard Shortcuts Reference</span>
                  <span className="dropdown-shortcut">?</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Project Name Input */}
        <div className="project-title-container">
          <input
            type="text"
            className="project-name-input"
            value={projectName}
            onChange={(e) => onProjectNameChange?.(e.target.value)}
            title="Click to rename project"
            placeholder="Untitled Circuit"
          />
          {isDirty && <div className="unsaved-dot" title="Unsaved changes" />}
        </div>
      </div>

      {/* -------------------------------------------------------------------
          RIGHT: Primary Actions (Run, Step, Clock, Zoom, Save, Theme, User)
          ------------------------------------------------------------------- */}
      <div className="topbar-right">
        {/* Run / Pause Primary Button */}
        <button
          type="button"
          className={`shell-btn ${isRunning ? 'running pulse' : 'primary'}`}
          onClick={onToggleRun}
          title="Toggle Simulation Run/Pause (Space)"
        >
          <span>{isRunning ? '⏸ Pause' : '▶ Simulate'}</span>
        </button>

        {/* Single Step Tick */}
        <button
          type="button"
          className="shell-btn icon-only"
          onClick={onStep}
          title="Single Clock Step (T)"
        >
          ⏭
        </button>

        {/* Reset Simulation State */}
        <button
          type="button"
          className="shell-btn icon-only"
          onClick={onReset}
          title="Reset Simulation State"
        >
          🔄
        </button>

        {/* Clock Frequency Quick Selector */}
        <div className="clock-quick-selector" title="Clock Frequency">
          <select
            className="clock-select-badge"
            value={clockHz}
            onChange={(e) => onClockHzChange(Number(e.target.value))}
          >
            <option value={0.5}>0.5 Hz</option>
            <option value={1}>1.0 Hz</option>
            <option value={2}>2.0 Hz</option>
            <option value={5}>5.0 Hz</option>
            <option value={10}>10 Hz</option>
          </select>
        </div>

        {/* Zoom Controls */}
        <div className="zoom-controls-group">
          <button
            type="button"
            className="zoom-btn"
            onClick={onZoomOut}
            title="Zoom Out (-)"
          >
            -
          </button>
          <button
            type="button"
            className="zoom-btn zoom-level"
            onClick={onResetViewport}
            title="Reset Zoom (100%)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className="zoom-btn"
            onClick={onZoomIn}
            title="Zoom In (+)"
          >
            +
          </button>
        </div>

        {/* Save Quick Action Button */}
        <button
          type="button"
          className="shell-btn icon-only"
          onClick={onSaveCircuit}
          title="Save Circuit (.deld)"
        >
          💾
        </button>

        {/* Sound Toggle */}
        <button
          type="button"
          className="shell-btn icon-only"
          onClick={onToggleSound}
          title={soundEnabled ? 'Audio Sound Effects: Enabled' : 'Audio Sound Effects: Muted'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          className="shell-btn icon-only"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* User Account / Profile */}
        <button
          type="button"
          className="shell-btn user-btn"
          onClick={onOpenAuth}
          title={currentUser ? `Signed in as @${currentUser.username}` : 'Sign In / Register'}
        >
          <span>👤 {currentUser ? currentUser.displayName : 'Account'}</span>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
