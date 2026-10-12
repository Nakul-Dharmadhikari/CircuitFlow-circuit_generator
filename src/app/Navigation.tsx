import React from 'react';
import type { WorkbenchView } from '../hooks/useUIState';
import {
  IconBoard,
  IconSchematic,
  IconChart,
  IconFolder,
  IconGear,
} from '../components/icons/AppIcons';

interface NavigationProps {
  currentView: WorkbenchView;
  onViewChange: (view: WorkbenchView) => void;
  onOpenProjects: () => void;
  onOpenSettings: () => void;
  onOpenPresets: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
  onOpenProjects,
  onOpenSettings,
  onOpenPresets,
}) => {
  return (
    <nav className="app-nav" aria-label="Workbench Navigation">
      <div className="nav-tabs">
        {/* Home */}
        <button
          type="button"
          className={`nav-tab-btn ${currentView === 'landing' ? 'active' : ''}`}
          onClick={() => onViewChange('landing')}
          title="Return to Home Overview"
        >
          <span>Home</span>
        </button>

        {/* Hardware Lab (DELDSIM) */}
        <button
          type="button"
          className={`nav-tab-btn ${currentView === 'hardware' ? 'active' : ''}`}
          onClick={() => onViewChange('hardware')}
          title="Hardware Trainer Board"
        >
          <IconBoard size={16} />
          <span>Trainer Board</span>
        </button>

        {/* Circuit Editor (Schematic) */}
        <button
          type="button"
          className={`nav-tab-btn ${currentView === 'circuit' ? 'active' : ''}`}
          onClick={() => onViewChange('circuit')}
          title="Freeform Circuit Schematic Editor"
        >
          <IconSchematic size={16} />
          <span>Schematic</span>
        </button>

        {/* Analysis */}
        <button
          type="button"
          className={`nav-tab-btn ${currentView === 'analysis' ? 'active' : ''}`}
          onClick={() => onViewChange('analysis')}
          title="Circuit Analysis & State Verification"
        >
          <IconChart size={16} />
          <span>Analysis</span>
        </button>

        {/* Lab Presets */}
        <button
          type="button"
          className="nav-tab-btn"
          onClick={onOpenPresets}
          title="Pre-wired Lab Experiments & Counter Demonstrations"
        >
          <span>Lab Presets</span>
        </button>

        {/* Projects Vault */}
        <button
          type="button"
          className="nav-tab-btn"
          onClick={onOpenProjects}
          title="Open Saved Circuit Files"
        >
          <IconFolder size={16} />
          <span>Projects</span>
        </button>
      </div>

      <div className="nav-tabs">
        {/* Settings / Shortcuts */}
        <button
          type="button"
          className="nav-tab-btn"
          onClick={onOpenSettings}
          title="Workbench Preferences & Shortcuts"
        >
          <IconGear size={16} />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
