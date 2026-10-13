import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../../types/circuit';
import type { LabExperiment } from '../../presets/labExperiments';
import type { WorkbenchView } from '../../hooks/useUIState';
import {
  IconLightning,
  IconBoard,
  IconSchematic,
  IconPlay,
  IconPause,
  IconStep,
  IconReset,
  IconSave,
  IconVolume,
  IconMute,
  IconSun,
  IconMoon,
  IconUser,
  IconChip,
  IconCustomIC,
  IconTable,
  IconWaveform,
  IconChart,
  IconFolder,
  IconHelp,
  IconFit,
  IconUpload,
  IconDownload,
  IconTrash,
} from '../../components/icons/AppIcons';

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
  onExportJson?: () => void;
  onImportJson?: () => void;
  onToggleLibrary?: () => void;
  onToggleInspector?: () => void;
  clockHz: number;
  onClockHzChange: (hz: number) => void;
  onOpenAnalysisModal?: (tab?: 'overview' | 'truth_table' | 'kmap' | 'timing' | 'sequential' | 'testbench' | 'diagnostics') => void;
  onOpenOnboarding?: () => void;
  activeLab?: LabExperiment | null;
  onOpenGuidedAssistant?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectName,
  isDirty = false,
  onProjectNameChange,
  currentView,
  onViewChange,
  onOpenAnalysisModal,
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
  onExportJson,
  onImportJson,
  onToggleLibrary,
  onToggleInspector,
  clockHz,
  onClockHzChange,
  onOpenOnboarding,
  activeLab,
  onOpenGuidedAssistant,
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
    <header className="app-topbar" aria-label="CircuitFlow Workbench TopBar">
      {/* -------------------------------------------------------------------
          LEFT: CircuitFlow Brand + Primary Mode Switcher (Trainer vs Schematic)
          ------------------------------------------------------------------- */}
      <div className="topbar-left">
        <div
          className="app-brand"
          onClick={() => onViewChange('landing')}
          title="Return to CircuitFlow Overview / Landing"
          role="button"
          tabIndex={0}
        >
          <div className="brand-icon" aria-hidden="true">
            <IconLightning size={16} />
          </div>
          <div className="brand-title">
            <span>CircuitFlow</span>
            <span className="brand-badge">SIM</span>
          </div>
        </div>

        {/* Primary View Switcher: Trainer Board vs Schematic Editor */}
        <div className="mode-toggle-segmented" title="Switch Between Hardware Trainer Kit and Schematic Editor">
          <button
            type="button"
            className={`mode-seg-btn ${currentView === 'hardware' ? 'active' : ''}`}
            onClick={() => onViewChange('hardware')}
            aria-label="Hardware Trainer Board Mode"
          >
            <IconBoard size={14} style={{ marginRight: 5 }} />
            <span>Trainer</span>
          </button>
          <button
            type="button"
            className={`mode-seg-btn ${currentView === 'circuit' ? 'active' : ''}`}
            onClick={() => onViewChange('circuit')}
            aria-label="Schematic Editor Mode"
          >
            <IconSchematic size={14} style={{ marginRight: 5 }} />
            <span>Schematic</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------
          CENTER: The 4 Primary Activity Menus (PROJECTS, BUILD, SIMULATE, ANALYZE)
          ------------------------------------------------------------------- */}
      <div className="topbar-center-section" ref={menuBarRef}>
        <nav className="menu-bar" aria-label="Application Menus">
          {/* 1. PROJECTS MENU (First Child) */}
          <div className="menu-item-wrapper">
            <button
              type="button"
              className={`menu-item-btn ${activeMenu === 'projects' ? 'active' : ''}`}
              onClick={() => handleMenuClick('projects')}
              aria-haspopup="true"
              aria-expanded={activeMenu === 'projects'}
              title="Project File & Storage Actions"
            >
              Projects ▾
            </button>
            {activeMenu === 'projects' && (
              <div className="menu-dropdown" role="menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onNewCircuit();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconFolder size={14} /> New Project
                  </span>
                  <span className="dropdown-shortcut">Ctrl+N</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenSavedCircuits();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconFolder size={14} /> Open Saved Circuit...
                  </span>
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
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconSave size={14} /> Save Circuit (.deld)
                  </span>
                  <span className="dropdown-shortcut">Ctrl+S</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenSavedCircuits();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconFolder size={14} /> Saved Projects Vault...
                  </span>
                </button>
                <div className="dropdown-divider" />
                {onExportJson && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      onExportJson();
                      closeMenu();
                    }}
                    role="menuitem"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <IconDownload size={14} /> Export Circuit JSON
                    </span>
                  </button>
                )}
                {onImportJson && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      onImportJson();
                      closeMenu();
                    }}
                    role="menuitem"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <IconUpload size={14} /> Import Circuit JSON
                    </span>
                  </button>
                )}
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenLabPresets();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span>Examples & Lab Presets...</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  disabled={!canUndo}
                  onClick={() => {
                    onUndo();
                    closeMenu();
                  }}
                  role="menuitem"
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
                  role="menuitem"
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
                  role="menuitem"
                >
                  <span>Copy Selection</span>
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
                  role="menuitem"
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
                  role="menuitem"
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
                  role="menuitem"
                >
                  <span>Delete Selection</span>
                  <span className="dropdown-shortcut">Del</span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item danger-item"
                  onClick={() => {
                    onClearCanvas();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconTrash size={14} /> Clear Workbench
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* 2. BUILD MENU (Includes Labs & Custom IC Studio) */}
          <div className="menu-item-wrapper">
            <button
              type="button"
              className={`menu-item-btn ${activeMenu === 'build' ? 'active' : ''}`}
              onClick={() => handleMenuClick('build')}
              aria-haspopup="true"
              aria-expanded={activeMenu === 'build'}
              title="Build, Circuit Modes, Components & Custom IC Studio"
            >
              Build & Labs ▾
            </button>
            {activeMenu === 'build' && (
              <div className="menu-dropdown" role="menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onViewChange('hardware');
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconBoard size={14} /> Trainer Board Mode
                  </span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onViewChange('circuit');
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconSchematic size={14} /> Schematic Mode
                  </span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onToggleLibrary?.();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconChip size={14} /> Component Library
                  </span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenCustomIC();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconCustomIC size={14} /> Custom IC Packaging Builder...
                  </span>
                </button>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenLabPresets();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span>Lab Experiments & Presets...</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onResetViewport?.();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconFit size={14} /> Fit Circuit to Viewport
                  </span>
                  <span className="dropdown-shortcut">F</span>
                </button>
                {onToggleInspector && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      onToggleInspector();
                      closeMenu();
                    }}
                    role="menuitem"
                  >
                    <span>Toggle Inspector Panel</span>
                  </button>
                )}
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenShortcuts();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconHelp size={14} /> Keyboard Shortcuts Reference
                  </span>
                  <span className="dropdown-shortcut">?</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. SIMULATE MENU */}
          <div className="menu-item-wrapper">
            <button
              type="button"
              className={`menu-item-btn ${activeMenu === 'simulation' ? 'active' : ''}`}
              onClick={() => handleMenuClick('simulation')}
              aria-haspopup="true"
              aria-expanded={activeMenu === 'simulation'}
              title="Simulation Controls & Clock Speeds"
            >
              Simulate ▾
            </button>
            {activeMenu === 'simulation' && (
              <div className="menu-dropdown" role="menu">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onToggleRun();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {isRunning ? <IconPause size={14} /> : <IconPlay size={14} />}
                    {isRunning ? 'Pause Simulation' : 'Run Simulation'}
                  </span>
                  <span className="dropdown-shortcut">Space</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onStep();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconStep size={14} /> Single Step Clock Tick
                  </span>
                  <span className="dropdown-shortcut">T</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onReset();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconReset size={14} /> Reset Simulation States
                  </span>
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
                  role="menuitem"
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
                  role="menuitem"
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
                  role="menuitem"
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
                  role="menuitem"
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
                  role="menuitem"
                >
                  <span>10.0 Hz (Fast)</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. ANALYZE MENU */}
          <div className="menu-item-wrapper">
            <button
              type="button"
              className={`menu-item-btn ${activeMenu === 'analysis' ? 'active' : ''}`}
              onClick={() => handleMenuClick('analysis')}
              aria-haspopup="true"
              aria-expanded={activeMenu === 'analysis'}
              title="Circuit Analysis, Truth Tables & Waveforms"
            >
              Analyze ▾
            </button>
            {activeMenu === 'analysis' && (
              <div className="menu-dropdown" role="menu">
                {onOpenAnalysisModal && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      onOpenAnalysisModal('overview');
                      closeMenu();
                    }}
                    role="menuitem"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      🔬 Circuit Analysis Center...
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    if (onOpenAnalysisModal) {
                      onOpenAnalysisModal('truth_table');
                    } else {
                      onOpenTruthTable();
                    }
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconTable size={14} /> Truth Table & State Analyzer...
                  </span>
                </button>
                {onOpenAnalysisModal && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      onOpenAnalysisModal('kmap');
                      closeMenu();
                    }}
                    role="menuitem"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      🗺️ Karnaugh Map (2–6 Var)...
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenWaveform();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconWaveform size={14} /> Oscilloscope Waveform Scope...
                  </span>
                </button>
                {onOpenAnalysisModal && (
                  <>
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        onOpenAnalysisModal('sequential');
                        closeMenu();
                      }}
                      role="menuitem"
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        🔄 Sequential State Machine...
                      </span>
                    </button>
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        onOpenAnalysisModal('testbench');
                        closeMenu();
                      }}
                      role="menuitem"
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        🧪 Test Bench Suite...
                      </span>
                    </button>
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        onOpenAnalysisModal('diagnostics');
                        closeMenu();
                      }}
                      role="menuitem"
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        ⚠️ Circuit Diagnostics...
                      </span>
                    </button>
                  </>
                )}
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onViewChange('analysis');
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconChart size={14} /> Full Analysis Workspace View
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* 5. HELP & COURSEWARE MENU */}
          <div className="menu-item-wrapper">
            <button
              type="button"
              className={`menu-item-btn ${activeMenu === 'help' ? 'active' : ''}`}
              onClick={() => handleMenuClick('help')}
              aria-haspopup="true"
              aria-expanded={activeMenu === 'help'}
              title="Student Tour, Curriculum Labs & Keyboard Shortcuts"
            >
              Help ▾
            </button>
            {activeMenu === 'help' && (
              <div className="menu-dropdown" role="menu">
                {onOpenOnboarding && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      onOpenOnboarding();
                      closeMenu();
                    }}
                    role="menuitem"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      🎓 Interactive Student Tour...
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenLabPresets();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    🔬 Verified Curriculum Labs...
                  </span>
                </button>
                {activeLab && onOpenGuidedAssistant && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      onOpenGuidedAssistant();
                      closeMenu();
                    }}
                    role="menuitem"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      📋 Active Lab: {activeLab.title}
                    </span>
                  </button>
                )}
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onOpenShortcuts();
                    closeMenu();
                  }}
                  role="menuitem"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <IconHelp size={14} /> Keyboard Shortcuts Reference
                  </span>
                  <span className="dropdown-shortcut">?</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Project Name Editable Input or Active Lab Chip */}
        {/* Project Name Editable Input */}
        <div className="project-title-container">
          <input
            type="text"
            className="project-name-input"
            value={projectName}
            onChange={(e) => onProjectNameChange?.(e.target.value)}
            title="Click to rename project"
            placeholder="Untitled Circuit"
            aria-label="Project Name"
          />
          {isDirty && <div className="unsaved-dot" title="Unsaved changes" />}
        </div>
      </div>

      {/* -------------------------------------------------------------------
          RIGHT: Primary Controls (Run, Step, Reset, Clock, Zoom, Save, Theme, User)
          ------------------------------------------------------------------- */}
      <div className="topbar-right">
        {/* Active Guided Lab Pill */}
        {activeLab && (
          <button
            type="button"
            className="shell-btn highlight-btn active-lab-btn"
            onClick={onOpenGuidedAssistant}
            title={`Active Lab: ${activeLab.title}. Click to view objectives & checkpoints.`}
            aria-label="Active Guided Lab Assistant"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span>🔬</span>
              <span className="active-lab-name-truncate">{activeLab.title}</span>
            </span>
          </button>
        )}

        {/* Run / Pause Primary Simulation Button */}
        <button
          type="button"
          className={`shell-btn ${isRunning ? 'running pulse' : 'primary'}`}
          onClick={onToggleRun}
          title="Toggle Simulation Run/Pause (Space)"
          aria-label={isRunning ? 'Pause Simulation' : 'Run Simulation'}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {isRunning ? <IconPause size={14} /> : <IconPlay size={14} />}
            <span>{isRunning ? 'Pause' : 'Simulate'}</span>
          </span>
        </button>

        {/* Single Step Tick */}
        <button
          type="button"
          className="shell-btn icon-only"
          onClick={onStep}
          title="Single Clock Step (T)"
          aria-label="Single Step Clock Tick"
        >
          <IconStep size={15} />
        </button>

        {/* Reset Simulation State */}
        <button
          type="button"
          className="shell-btn icon-only"
          onClick={onReset}
          title="Reset Simulation State"
          aria-label="Reset Simulation State"
        >
          <IconReset size={15} />
        </button>

        {/* Clock Frequency Selector */}
        <div className="clock-quick-selector" title="Clock Frequency">
          <select
            className="clock-select-badge"
            value={clockHz}
            onChange={(e) => onClockHzChange(Number(e.target.value))}
            aria-label="Clock Frequency"
          >
            <option value={0.5}>0.5 Hz</option>
            <option value={1}>1.0 Hz</option>
            <option value={2}>2.0 Hz</option>
            <option value={5}>5.0 Hz</option>
            <option value={10}>10 Hz</option>
          </select>
        </div>

        {/* Zoom Controls */}
        <div className="zoom-controls-group" role="group" aria-label="Zoom Controls">
          <button
            type="button"
            className="zoom-btn"
            onClick={onZoomOut}
            title="Zoom Out (-)"
            aria-label="Zoom Out"
          >
            -
          </button>
          <button
            type="button"
            className="zoom-btn zoom-level"
            onClick={onResetViewport}
            title="Reset Zoom to 100%"
            aria-label="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className="zoom-btn"
            onClick={onZoomIn}
            title="Zoom In (+)"
            aria-label="Zoom In"
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
          aria-label="Save Circuit"
        >
          <IconSave size={15} />
        </button>

        {/* Sound Effects Toggle */}
        <button
          type="button"
          className="shell-btn icon-only"
          onClick={onToggleSound}
          title={soundEnabled ? 'Audio Sound Effects: Enabled' : 'Audio Sound Effects: Muted'}
          aria-label={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
        >
          {soundEnabled ? <IconVolume size={15} /> : <IconMute size={15} />}
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          className="shell-btn icon-only"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
        </button>

        {/* Interactive Tour Quick Button */}
        {onOpenOnboarding && (
          <button
            type="button"
            className="shell-btn tour-quick-btn"
            onClick={onOpenOnboarding}
            title="Start Interactive Student Tour"
            aria-label="Student Tour"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span>🎓</span>
              <span>Tour</span>
            </span>
          </button>
        )}

        {/* User Account Button */}
        <button
          type="button"
          className="shell-btn user-btn"
          onClick={onOpenAuth}
          title={currentUser ? `Signed in as @${currentUser.username}` : 'Sign In / Register'}
          aria-label="User Account"
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <IconUser size={14} />
            <span>{currentUser ? currentUser.displayName : 'Account'}</span>
          </span>
        </button>
      </div>
    </header>
  );
};

export default TopBar;
