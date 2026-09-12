import React from 'react';

interface VerticalToolbarProps {
  interactionMode: 'wire' | 'move' | 'delete';
  onSetInteractionMode: (mode: 'wire' | 'move' | 'delete') => void;
  isLibraryOpen: boolean;
  onToggleLibrary: () => void;
  selectedWireId: string | null;
  onDeleteSelectedWire: () => void;
  onSelectAll: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddTrainerBoard?: () => void;
  onPaste?: () => void;
}

export const VerticalToolbar: React.FC<VerticalToolbarProps> = ({
  interactionMode,
  onSetInteractionMode,
  isLibraryOpen,
  onToggleLibrary,
  selectedWireId,
  onDeleteSelectedWire,
  onSelectAll,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddTrainerBoard,
  onPaste,
}) => {
  return (
    <div className="vertical-floating-toolbar" onMouseDown={(e) => e.stopPropagation()}>
      {/* 1. Main Tools Card */}
      <div className="v-tool-card">
        {/* Wire / Select Mode (Default, Components Locked) */}
        <button
          type="button"
          className={`v-tool-btn ${interactionMode === 'wire' ? 'active' : ''}`}
          onClick={() => onSetInteractionMode('wire')}
          title="Wire & Select Mode (Components Locked in place)"
        >
          <svg className="v-tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Pointer / Sparkle Cursor */}
            <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="m13 13 6 6" />
          </svg>
        </button>

        {/* Move Circuitry Hand Tool */}
        <button
          type="button"
          className={`v-tool-btn ${interactionMode === 'move' ? 'active' : ''}`}
          onClick={() => onSetInteractionMode('move')}
          title="Move Circuitry (Hand Tool: Drag components and ICs)"
        >
          <svg className="v-tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Hand Icon */}
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
            <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
        </button>

        <div className="v-tool-divider" />

        {/* Component & IC Library Toggle */}
        <button
          type="button"
          className={`v-tool-btn ${isLibraryOpen ? 'active highlight' : ''}`}
          onClick={onToggleLibrary}
          title="Components & 74xx IC Library (Auto-minimizes when IC is placed)"
        >
          <svg className="v-tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Integrated Circuit Chip Icon */}
            <rect x="6" y="6" width="12" height="12" rx="2" />
            <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
          </svg>
        </button>

        {/* Quick Add Trainer Board */}
        {onAddTrainerBoard && (
          <button
            type="button"
            className="v-tool-btn highlight"
            onClick={onAddTrainerBoard}
            title="Add Digital Trainer Board to Workbench"
          >
            <span style={{ fontSize: '15px' }}>🎓</span>
          </button>
        )}

        {/* Delete Wire Tool */}
        <button
          type="button"
          className={`v-tool-btn danger ${interactionMode === 'delete' || selectedWireId ? 'active' : ''}`}
          onClick={() => {
            if (selectedWireId) {
              onDeleteSelectedWire();
            } else {
              onSetInteractionMode(interactionMode === 'delete' ? 'wire' : 'delete');
            }
          }}
          title={selectedWireId ? 'Delete currently selected wire' : 'Delete Wire Tool (Click any wire to remove)'}
        >
          <svg className="v-tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Trash Can */}
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
          </svg>
        </button>

        <div className="v-tool-divider" />

        {/* Select All Circuit */}
        <button
          type="button"
          className="v-tool-btn"
          onClick={onSelectAll}
          title="Select All Circuit (Ctrl+A)"
        >
          <svg className="v-tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {/* Marquee / Select All Box */}
            <path d="M4 8V4h4M16 4h4v4M4 16v4h4M16 20h4v-4" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </button>

        {/* Quick Paste Button */}
        {onPaste && (
          <button
            type="button"
            className="v-tool-btn"
            onClick={onPaste}
            title="Paste from Clipboard (Ctrl+V) at Cursor"
          >
            <svg className="v-tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          </button>
        )}
      </div>

      {/* 2. History Undo / Redo Card */}
      <div className="v-tool-card history-card">
        {/* Undo */}
        <button
          type="button"
          className="v-tool-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo Action (Ctrl+Z)"
        >
          <svg className="v-tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
          </svg>
        </button>

        {/* Redo */}
        <button
          type="button"
          className="v-tool-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo Action (Ctrl+Y)"
        >
          <svg className="v-tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
          </svg>
        </button>
      </div>
    </div>
  );
};
