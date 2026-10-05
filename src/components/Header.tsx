import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types/circuit';

interface HeaderProps {
  isRunning: boolean;
  onToggleRun: () => void;
  onStep: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onResetZoom: () => void;
  onFitCircuit?: () => void;
  isWaveformOpen: boolean;
  onToggleWaveform: () => void;
  onOpenTruthTable: () => void;
  onOpenLabPresets: () => void;
  onOpenShortcuts: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onOpenSavedCircuits: () => void;
  onNewCircuit?: () => void;
  onSaveCircuit?: () => void;
  onExportJson?: () => void;
  onImportJson?: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  clockHz: number;
  onClockHzChange: (freq: number) => void;
  onOpenCreateIC?: () => void;
  workbenchMode?: 'trainer' | 'freeform';
  onToggleWorkbenchMode?: (mode: 'trainer' | 'freeform') => void;
  onAddTrainerBoard?: () => void;
  // Edit actions
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  onDeleteSelected?: () => void;
  onClearCanvas?: () => void;
  // View toggles
  showGrid?: boolean;
  onToggleGrid?: () => void;
  isLibraryOpen?: boolean;
  onToggleLibrary?: () => void;
  isPropertiesOpen?: boolean;
  onToggleProperties?: () => void;
}

type MenuKey = 'file' | 'edit' | 'view' | 'sim' | 'analysis' | 'labs' | 'user' | null;

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  onToggleRun,
  onStep,
  zoom,
  onZoomChange,
  onResetZoom,
  onFitCircuit,
  isWaveformOpen,
  onToggleWaveform,
  onOpenTruthTable,
  onOpenLabPresets,
  onOpenShortcuts,
  currentUser,
  onOpenAuth,
  onOpenSavedCircuits,
  onNewCircuit,
  onSaveCircuit,
  onExportJson,
  onImportJson,
  soundEnabled,
  onToggleSound,
  theme,
  onToggleTheme,
  clockHz,
  onClockHzChange,
  onOpenCreateIC,
  workbenchMode = 'trainer',
  onToggleWorkbenchMode,
  onAddTrainerBoard,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onSelectAll,
  onDeleteSelected,
  onClearCanvas,
  showGrid = true,
  onToggleGrid,
  isLibraryOpen = false,
  onToggleLibrary,
  isPropertiesOpen = true,
  onToggleProperties,
}) => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (key: MenuKey) => {
    setActiveMenu((prev) => (prev === key ? null : key));
  };

  const handleAction = (action?: () => void) => {
    setActiveMenu(null);
    action?.();
  };

  return (
    <header className="workbench-header fixed-viewport-bar" ref={menuContainerRef}>
      {/* =====================================================================
          1. BRAND LOGO & MODE SWITCHER
          ===================================================================== */}
      <div className="brand-section">
        <div className="brand-logo" title="CircuitFlow Digital Design Workstation">
          <div className="brand-icon">CF</div>
          <div className="brand-title">
            <span className="brand-name">CircuitFlow</span>
            <span className="brand-badge">PRO</span>
          </div>
        </div>

        {/* Mode Switcher: Trainer Board Kit vs Freeform Schematic */}
        {onToggleWorkbenchMode && (
          <div className="workbench-mode-pill-toggle" title="Switch workspace layout">
            <button
              type="button"
              className={`mode-pill-btn ${workbenchMode === 'trainer' ? 'active' : ''}`}
              onClick={() => onToggleWorkbenchMode('trainer')}
              title="Trainer Board Mode: Digital hardware trainer board chassis"
            >
              🎓 Trainer
            </button>
            <button
              type="button"
              className={`mode-pill-btn ${workbenchMode === 'freeform' ? 'active' : ''}`}
              onClick={() => onToggleWorkbenchMode('freeform')}
              title="Schematic Mode: Infinite blank open canvas"
            >
              📐 Schematic
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          2. MENU BAR (File, Edit, View, Simulation, Analysis, Labs)
          ===================================================================== */}
      <nav className="header-menu-bar" aria-label="Main Application Menus">
        {/* FILE MENU */}
        <div className="menu-dropdown-item">
          <button
            type="button"
            className={`menu-bar-btn ${activeMenu === 'file' ? 'active' : ''}`}
            onClick={() => toggleMenu('file')}
          >
            File ▾
          </button>
          {activeMenu === 'file' && (
            <div className="menu-dropdown-popup">
              <button type="button" className="menu-item" onClick={() => handleAction(onNewCircuit)}>
                <span>✨ New Circuit</span>
                <span className="menu-shortcut">Ctrl+N</span>
              </button>
              <button type="button" className="menu-item" onClick={() => handleAction(onOpenSavedCircuits)}>
                <span>📂 Open Saved Circuits...</span>
                <span className="menu-shortcut">Ctrl+O</span>
              </button>
              <button type="button" className="menu-item" onClick={() => handleAction(onSaveCircuit || onOpenSavedCircuits)}>
                <span>💾 Save Circuit</span>
                <span className="menu-shortcut">Ctrl+S</span>
              </button>
              <div className="menu-separator" />
              {onExportJson && (
                <button type="button" className="menu-item" onClick={() => handleAction(onExportJson)}>
                  <span>📤 Export Circuit JSON</span>
                </button>
              )}
              {onImportJson && (
                <button type="button" className="menu-item" onClick={() => handleAction(onImportJson)}>
                  <span>📥 Import Circuit JSON...</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* EDIT MENU */}
        <div className="menu-dropdown-item">
          <button
            type="button"
            className={`menu-bar-btn ${activeMenu === 'edit' ? 'active' : ''}`}
            onClick={() => toggleMenu('edit')}
          >
            Edit ▾
          </button>
          {activeMenu === 'edit' && (
            <div className="menu-dropdown-popup">
              <button
                type="button"
                className={`menu-item ${!canUndo ? 'disabled' : ''}`}
                onClick={() => handleAction(onUndo)}
                disabled={!canUndo}
              >
                <span>↩️ Undo</span>
                <span className="menu-shortcut">Ctrl+Z</span>
              </button>
              <button
                type="button"
                className={`menu-item ${!canRedo ? 'disabled' : ''}`}
                onClick={() => handleAction(onRedo)}
                disabled={!canRedo}
              >
                <span>↪️ Redo</span>
                <span className="menu-shortcut">Ctrl+Y</span>
              </button>
              <div className="menu-separator" />
              {onCut && (
                <button type="button" className="menu-item" onClick={() => handleAction(onCut)}>
                  <span>✂️ Cut</span>
                  <span className="menu-shortcut">Ctrl+X</span>
                </button>
              )}
              {onCopy && (
                <button type="button" className="menu-item" onClick={() => handleAction(onCopy)}>
                  <span>📄 Copy</span>
                  <span className="menu-shortcut">Ctrl+C</span>
                </button>
              )}
              {onPaste && (
                <button type="button" className="menu-item" onClick={() => handleAction(onPaste)}>
                  <span>📋 Paste</span>
                  <span className="menu-shortcut">Ctrl+V</span>
                </button>
              )}
              <div className="menu-separator" />
              {onSelectAll && (
                <button type="button" className="menu-item" onClick={() => handleAction(onSelectAll)}>
                  <span>🔲 Select All</span>
                  <span className="menu-shortcut">Ctrl+A</span>
                </button>
              )}
              {onDeleteSelected && (
                <button type="button" className="menu-item danger" onClick={() => handleAction(onDeleteSelected)}>
                  <span>🗑️ Delete Selection</span>
                  <span className="menu-shortcut">Del</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* VIEW MENU */}
        <div className="menu-dropdown-item">
          <button
            type="button"
            className={`menu-bar-btn ${activeMenu === 'view' ? 'active' : ''}`}
            onClick={() => toggleMenu('view')}
          >
            View ▾
          </button>
          {activeMenu === 'view' && (
            <div className="menu-dropdown-popup">
              <button type="button" className="menu-item" onClick={() => handleAction(() => onZoomChange(Math.min(zoom * 1.2, 4.0)))}>
                <span>🔍 Zoom In</span>
                <span className="menu-shortcut">Ctrl++</span>
              </button>
              <button type="button" className="menu-item" onClick={() => handleAction(() => onZoomChange(Math.max(zoom * 0.8, 0.25)))}>
                <span>🔍 Zoom Out</span>
                <span className="menu-shortcut">Ctrl+-</span>
              </button>
              <button type="button" className="menu-item" onClick={() => handleAction(onResetZoom)}>
                <span>🎯 Reset View (100%)</span>
                <span className="menu-shortcut">Ctrl+0</span>
              </button>
              {onFitCircuit && (
                <button type="button" className="menu-item" onClick={() => handleAction(onFitCircuit)}>
                  <span>📐 Fit to Circuit</span>
                  <span className="menu-shortcut">F</span>
                </button>
              )}
              <div className="menu-separator" />
              {onToggleGrid && (
                <button type="button" className="menu-item" onClick={() => handleAction(onToggleGrid)}>
                  <span>{showGrid ? '✓ Grid Visible' : '⬜ Show Grid'}</span>
                  <span className="menu-shortcut">G</span>
                </button>
              )}
              {onToggleLibrary && (
                <button type="button" className="menu-item" onClick={() => handleAction(onToggleLibrary)}>
                  <span>{isLibraryOpen ? '✓ Hide Component Library' : '📦 Show Component Library'}</span>
                </button>
              )}
              {onToggleProperties && (
                <button type="button" className="menu-item" onClick={() => handleAction(onToggleProperties)}>
                  <span>{isPropertiesOpen ? '✓ Hide Inspector Panel' : '⚙️ Show Inspector Panel'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* SIMULATION MENU */}
        <div className="menu-dropdown-item">
          <button
            type="button"
            className={`menu-bar-btn ${activeMenu === 'sim' ? 'active' : ''}`}
            onClick={() => toggleMenu('sim')}
          >
            Simulation ▾
          </button>
          {activeMenu === 'sim' && (
            <div className="menu-dropdown-popup">
              <button type="button" className="menu-item" onClick={() => handleAction(onToggleRun)}>
                <span>{isRunning ? '⏸ Pause Simulation' : '▶ Run Simulation'}</span>
                <span className="menu-shortcut">Space</span>
              </button>
              <button
                type="button"
                className={`menu-item ${isRunning ? 'disabled' : ''}`}
                onClick={() => handleAction(onStep)}
                disabled={isRunning}
              >
                <span>⏭ Single Step Pulse</span>
                <span className="menu-shortcut">T</span>
              </button>
              <div className="menu-separator" />
              {onClearCanvas && (
                <button type="button" className="menu-item danger" onClick={() => handleAction(onClearCanvas)}>
                  <span>🧹 Reset / Clear Canvas</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ANALYSIS MENU */}
        <div className="menu-dropdown-item">
          <button
            type="button"
            className={`menu-bar-btn ${activeMenu === 'analysis' ? 'active' : ''}`}
            onClick={() => toggleMenu('analysis')}
          >
            Analysis ▾
          </button>
          {activeMenu === 'analysis' && (
            <div className="menu-dropdown-popup">
              <button type="button" className="menu-item" onClick={() => handleAction(onOpenTruthTable)}>
                <span>📋 Truth Table Generator</span>
              </button>
              <button type="button" className="menu-item" onClick={() => handleAction(onToggleWaveform)}>
                <span>{isWaveformOpen ? '✓ Timing Oscilloscope' : '📈 Timing Oscilloscope'}</span>
              </button>
            </div>
          )}
        </div>

        {/* LABS MENU */}
        <div className="menu-dropdown-item">
          <button
            type="button"
            className={`menu-bar-btn ${activeMenu === 'labs' ? 'active' : ''}`}
            onClick={() => toggleMenu('labs')}
          >
            Labs ▾
          </button>
          {activeMenu === 'labs' && (
            <div className="menu-dropdown-popup">
              <button type="button" className="menu-item" onClick={() => handleAction(onOpenLabPresets)}>
                <span>🔬 Lab Experiments & Presets</span>
              </button>
              {onOpenCreateIC && (
                <button type="button" className="menu-item" onClick={() => handleAction(onOpenCreateIC)}>
                  <span>✨ Custom IC Builder Studio</span>
                </button>
              )}
              {onAddTrainerBoard && (
                <button type="button" className="menu-item" onClick={() => handleAction(onAddTrainerBoard)}>
                  <span>🎓 + Add Digital Trainer Board</span>
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* =====================================================================
          3. RIGHT QUICK ACTION CONTROLS (Run, Step, Clock, Zoom, Save, Theme, User)
          ===================================================================== */}
      <div className="header-group right-group">
        {/* Run / Pause Quick Button */}
        <button
          type="button"
          className={`header-btn ${isRunning ? 'active primary pulse' : ''}`}
          onClick={onToggleRun}
          title="Toggle Simulation Run / Pause (Space)"
        >
          <span>{isRunning ? '⏸' : '▶'}</span>
          <span className="btn-label">{isRunning ? 'Pause' : 'Run'}</span>
        </button>

        {/* Step Button */}
        <button
          type="button"
          className="header-btn"
          onClick={onStep}
          disabled={isRunning}
          title="Single Clock Step Pulse (T)"
        >
          <span>⏭</span>
          <span className="btn-label">Step</span>
        </button>

        {/* Clock Frequency Selector */}
        <div className="clock-freq-widget" title="Clock Frequency in Hertz">
          <span className="clock-widget-label">⚡</span>
          <select
            className="freq-select-input"
            value={clockHz}
            onChange={(e) => onClockHzChange(Number(e.target.value))}
            title="Select Clock Frequency"
          >
            <option value={0.5}>0.5 Hz</option>
            <option value={1}>1 Hz</option>
            <option value={2}>2 Hz</option>
            <option value={5}>5 Hz</option>
            <option value={10}>10 Hz</option>
          </select>
        </div>

        {/* Zoom Controls */}
        <div className="zoom-controls-widget">
          <button
            type="button"
            className="zoom-step-btn"
            onClick={() => onZoomChange(Math.max(zoom * 0.85, 0.25))}
            title="Zoom Out (Ctrl+-)"
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
            onClick={() => onZoomChange(Math.min(zoom * 1.15, 4.0))}
            title="Zoom In (Ctrl++)"
          >
            +
          </button>
        </div>

        {/* Grid Toggle */}
        {onToggleGrid && (
          <button
            type="button"
            className={`header-btn icon-only ${showGrid ? 'active' : ''}`}
            onClick={onToggleGrid}
            title="Toggle Snap Grid (G)"
          >
            <span>▦</span>
          </button>
        )}

        {/* Shortcuts Guide Button */}
        <button
          type="button"
          className="header-btn icon-only"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts Guide (?)"
        >
          <span>⌨️</span>
        </button>

        {/* Sound FX Toggle */}
        <button
          type="button"
          className={`header-btn icon-only ${soundEnabled ? 'active' : ''}`}
          onClick={onToggleSound}
          title={soundEnabled ? 'Sound Effects Enabled' : 'Muted'}
        >
          <span>{soundEnabled ? '🔊' : '🔇'}</span>
        </button>

        {/* Save Circuit Quick Action */}
        <button
          type="button"
          className="header-btn highlight-btn"
          onClick={onSaveCircuit || onOpenSavedCircuits}
          title="Save Circuit (Ctrl+S)"
        >
          <span>💾</span>
          <span className="btn-label">Save</span>
        </button>

        {/* Theme Toggle (Dark / Light) */}
        <button
          type="button"
          className="header-btn icon-only"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
        >
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>

        {/* User Account / Profile */}
        <div className="user-menu-wrapper">
          <button
            type="button"
            className="header-btn user-btn"
            onClick={onOpenAuth}
            title={currentUser ? `Signed in as ${currentUser.username}` : 'Sign In / Register'}
          >
            <div
              className="user-avatar-dot"
              style={{ backgroundColor: currentUser?.avatarColor || 'var(--signal-high)' }}
            >
              {currentUser ? currentUser.username[0].toUpperCase() : '👤'}
            </div>
            <span className="user-name-label">
              {currentUser ? currentUser.displayName || currentUser.username : 'Account'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
export default Header;

