import React from 'react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + N', desc: 'Create new circuit from scratch' },
    { key: 'Space', desc: 'Run / Pause simulation' },
    { key: 'T', desc: 'Single Clock Step / Tick' },
    { key: 'Ctrl + Z / Ctrl + Y', desc: 'Undo / Redo canvas changes' },
    { key: 'Ctrl + A', desc: 'Select complete circuit' },
    { key: 'Ctrl + C / Ctrl + V', desc: 'Copy / Paste circuit schematic' },
    { key: 'Delete / Backspace', desc: 'Delete selected component' },
    { key: 'Scroll Wheel', desc: 'Zoom canvas in & out' },
    { key: 'Click + Drag Pin', desc: 'Create connection wire between pins' },
    { key: 'Click Wire', desc: 'Delete wire' },
    { key: 'Middle Drag / Canvas Drag', desc: 'Pan around workbench' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">⌨️ Workbench Shortcuts & Guide</div>
          <button className="panel-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Digital Logic Workbench Controls
            </h4>
            {shortcuts.map((s, idx) => (
              <div key={idx} className="shortcut-row">
                <span>{s.desc}</span>
                <span className="kbd-badge">{s.key}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '6px',
              fontSize: '12px',
              lineHeight: '1.5',
              color: 'var(--text-secondary)',
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>💡 Engineering Tips:</strong>
            <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
              <li>Connect outputs (right) to inputs (left). Multiple inputs can share an output driver.</li>
              <li>LED colors can be inspected or switched in the component properties inspector.</li>
              <li>Use the <strong>Timing Diagram</strong> to observe clock pulses and propagation delays.</li>
              <li>Open the <strong>Truth Table</strong> anytime to verify full binary combinational outputs.</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="header-btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
