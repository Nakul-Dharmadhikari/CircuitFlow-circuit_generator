import React from 'react';
import type { WorkbenchView } from '../hooks/useUIState';

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
    <nav className="app-nav">
      <div className="nav-tabs">
        {/* Home */}
        <button
          type="button"
          className={`nav-tab-btn ${currentView === 'landing' ? 'active' : ''}`}
          onClick={() => onViewChange('landing')}
        >
          <span>🏠 Home</span>
        </button>

        {/* Hardware Lab (DELDSIM) */}
        <button
          type="button"
          className={`nav-tab-btn ${currentView === 'hardware' ? 'active' : ''}`}
          onClick={() => onViewChange('hardware')}
          title="DELDSIM Digital Hardware Trainer Board"
        >
          <span>⚡ Hardware Lab</span>
        </button>

        {/* Circuit Editor (Logisim-style Schematic) */}
        <button
          type="button"
          className={`nav-tab-btn ${currentView === 'circuit' ? 'active' : ''}`}
          onClick={() => onViewChange('circuit')}
          title="Logisim-style Freeform Circuit Schematic"
        >
          <span>📐 Circuit Editor</span>
        </button>

        {/* Analysis */}
        <button
          type="button"
          className={`nav-tab-btn ${currentView === 'analysis' ? 'active' : ''}`}
          onClick={() => onViewChange('analysis')}
          title="Truth Table & State Transition Analysis"
        >
          <span>📊 Analysis</span>
        </button>

        {/* Lab Presets */}
        <button
          type="button"
          className="nav-tab-btn"
          onClick={onOpenPresets}
          title="Pre-wired Lab Experiments & Counter Demonstrations"
        >
          <span>🧪 Lab Presets</span>
        </button>

        {/* Projects Vault */}
        <button
          type="button"
          className="nav-tab-btn"
          onClick={onOpenProjects}
          title="Open Saved Circuit Files"
        >
          <span>📁 Projects</span>
        </button>
      </div>

      <div className="nav-tabs">
        {/* AI Assistant (Placeholder / Disabled) */}
        <button
          type="button"
          className="nav-tab-btn"
          disabled
          title="AI Circuit Assistant (Coming in Phase 7)"
        >
          <span>✨ AI Assistant</span>
          <span className="nav-tab-badge">Soon</span>
        </button>

        {/* Settings / Shortcuts */}
        <button
          type="button"
          className="nav-tab-btn"
          onClick={onOpenSettings}
          title="Workbench Preferences & Shortcuts"
        >
          <span>⚙️ Settings</span>
        </button>
      </div>
    </nav>
  );
};
export default Navigation;
