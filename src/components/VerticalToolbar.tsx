import React from 'react';
import {
  IconSelect,
  IconPan,
  IconWire,
  IconJunction,
  IconMarquee,
  IconTrash,
  IconChip,
  IconBoard,
  IconClipboard,
  IconUndo,
  IconRedo,
} from './icons/AppIcons';

export type ToolMode = 'select' | 'pan' | 'wire' | 'junction' | 'delete' | 'multiselect';

interface VerticalToolbarProps {
  interactionMode: ToolMode;
  onSetInteractionMode: (mode: ToolMode) => void;
  isLibraryOpen: boolean;
  onToggleLibrary: () => void;
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
  onSelectAll,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddTrainerBoard,
  onPaste,
}) => {
  return (
    <aside className="vertical-floating-toolbar" onMouseDown={(e) => e.stopPropagation()} aria-label="Workspace Tools">
      {/* 1. Main Tools Card (Prioritizing Frequent Workspace Actions) */}
      <div className="v-tool-card" role="toolbar" aria-label="Editing Tools">
        {/* Select Tool (V) */}
        <button
          type="button"
          className={`v-tool-btn ${interactionMode === 'select' ? 'active' : ''}`}
          onClick={() => onSetInteractionMode('select')}
          title="Select Tool (V) - Click to select, drag components directly"
          aria-label="Select Tool (V)"
        >
          <IconSelect size={18} />
        </button>

        {/* Wire Tool (W) */}
        <button
          type="button"
          className={`v-tool-btn ${interactionMode === 'wire' ? 'active' : ''}`}
          onClick={() => onSetInteractionMode('wire')}
          title="Wire Router Tool (W) - Click & drag from any terminal pin"
          aria-label="Wire Router Tool (W)"
        >
          <IconWire size={18} />
        </button>

        {/* Pan Hand Tool (H) */}
        <button
          type="button"
          className={`v-tool-btn ${interactionMode === 'pan' ? 'active' : ''}`}
          onClick={() => onSetInteractionMode('pan')}
          title="Pan Canvas Tool (H / Space) - Drag to navigate canvas"
          aria-label="Pan Canvas Tool (H)"
        >
          <IconPan size={18} />
        </button>

        {/* Components & IC Library Toggle */}
        <button
          type="button"
          className={`v-tool-btn ${isLibraryOpen ? 'active highlight' : ''}`}
          onClick={onToggleLibrary}
          title="Components & IC Library (Drag and drop onto canvas)"
          aria-label="Components & IC Library"
        >
          <IconChip size={18} />
        </button>

        <div className="v-tool-divider" />

        {/* Junction Branch Tool (J) */}
        <button
          type="button"
          className={`v-tool-btn ${interactionMode === 'junction' ? 'active' : ''}`}
          onClick={() => onSetInteractionMode('junction')}
          title="Junction Branch Tool (J) - Tap wire to insert branching node"
          aria-label="Junction Branch Tool (J)"
        >
          <IconJunction size={18} />
        </button>

        {/* Marquee Multi-Select Box */}
        <button
          type="button"
          className={`v-tool-btn ${interactionMode === 'multiselect' ? 'active' : ''}`}
          onClick={() => onSetInteractionMode('multiselect')}
          title="Multi-Select Tool - Drag rectangular box to select multiple items"
          aria-label="Multi-Select Box Tool"
        >
          <IconMarquee size={18} />
        </button>

        {/* Delete Tool */}
        <button
          type="button"
          className={`v-tool-btn danger ${interactionMode === 'delete' ? 'active' : ''}`}
          onClick={() => {
            onSetInteractionMode(interactionMode === 'delete' ? 'select' : 'delete');
          }}
          title={interactionMode === 'delete' ? 'Delete Mode Active (Click component or wire to remove)' : 'Delete Eraser Tool (Del)'}
          aria-label="Delete Eraser Tool (Del)"
        >
          <IconTrash size={18} />
        </button>

        <div className="v-tool-divider" />

        {/* Select All */}
        <button
          type="button"
          className="v-tool-btn"
          onClick={onSelectAll}
          title="Select All Circuit (Ctrl+A)"
          aria-label="Select All Circuit (Ctrl+A)"
        >
          <svg className="v-tool-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
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
            aria-label="Paste from Clipboard (Ctrl+V)"
          >
            <IconClipboard size={18} />
          </button>
        )}

        {/* Add Trainer Board */}
        {onAddTrainerBoard && (
          <button
            type="button"
            className="v-tool-btn highlight"
            onClick={onAddTrainerBoard}
            title="Add Digital Trainer Board to Workbench"
            aria-label="Add Digital Trainer Board"
          >
            <IconBoard size={18} />
          </button>
        )}
      </div>

      {/* 2. History Undo / Redo Card */}
      <div className="v-tool-card history-card" role="group" aria-label="History Actions">
        {/* Undo */}
        <button
          type="button"
          className="v-tool-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo Action (Ctrl+Z)"
          aria-label="Undo Action (Ctrl+Z)"
        >
          <IconUndo size={18} />
        </button>

        {/* Redo */}
        <button
          type="button"
          className="v-tool-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo Action (Ctrl+Y)"
          aria-label="Redo Action (Ctrl+Y)"
        >
          <IconRedo size={18} />
        </button>
      </div>
    </aside>
  );
};

export default VerticalToolbar;
