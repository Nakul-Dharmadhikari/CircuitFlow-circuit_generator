import React, { useState, useRef } from 'react';
import type { Circuit, SavedCircuit, User } from '../types/circuit';
import {
  deleteUserCircuit,
  downloadCircuitToFile,
  getUserCircuits,
  importCircuitFromFile,
  saveUserCircuit,
} from '../services/storage';

interface SavedCircuitsModalProps {
  isOpen: boolean;
  currentUser: User | null;
  currentCircuit: Circuit;
  onClose: () => void;
  onLoadCircuit: (circuit: Circuit, name: string) => void;
  onNewCircuit?: () => void;
}

export const SavedCircuitsModal: React.FC<SavedCircuitsModalProps> = ({
  isOpen,
  currentUser,
  currentCircuit,
  onClose,
  onLoadCircuit,
  onNewCircuit,
}) => {
  const [circuits, setCircuits] = useState<SavedCircuit[]>(() =>
    currentUser ? getUserCircuits(currentUser.id) : []
  );
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [circuitName, setCircuitName] = useState('');
  const [circuitDesc, setCircuitDesc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !currentUser) return null;

  const refreshList = () => {
    setCircuits(getUserCircuits(currentUser.id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!circuitName.trim()) return;
    saveUserCircuit(currentUser.id, circuitName, circuitDesc, currentCircuit);
    refreshList();
    setIsSavingCurrent(false);
    setCircuitName('');
    setCircuitDesc('');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this saved circuit from your library?')) {
      deleteUserCircuit(currentUser.id, id);
      refreshList();
    }
  };

  const handleDownload = (c: SavedCircuit, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadCircuitToFile(c.circuit, c.name);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedCircuit = await importCircuitFromFile(file);
      onLoadCircuit(importedCircuit, file.name.replace(/\.[^/.]+$/, ''));
      onClose();
    } catch (err: any) {
      alert(`Error importing circuit: ${err.message}`);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div className="modal-title">💾 Circuit Library — @{currentUser.username}</div>
          <button className="panel-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Action Row */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {onNewCircuit && (
              <button
                className="header-btn"
                style={{ flex: '1 1 auto', justifyContent: 'center' }}
                onClick={() => {
                  onNewCircuit();
                  onClose();
                }}
                title="Create a fresh blank circuit canvas from scratch"
              >
                📄 New Circuit
              </button>
            )}
            <button
              className="header-btn primary"
              style={{ flex: '1 1 auto', justifyContent: 'center' }}
              onClick={() => setIsSavingCurrent(!isSavingCurrent)}
            >
              {isSavingCurrent ? '✕ Cancel Save' : '💾 Save Active Circuit'}
            </button>
            <button
              className="header-btn"
              style={{ flex: '1 1 auto', justifyContent: 'center' }}
              onClick={() => downloadCircuitToFile(currentCircuit, 'workbench_schematic')}
              title="Download current schematic directly to desktop"
            >
              ⬇ Export .deld File
            </button>
            <button
              className="header-btn"
              style={{ flex: '1 1 auto', justifyContent: 'center' }}
              onClick={() => fileInputRef.current?.click()}
              title="Open a .deld or .json file from your desktop"
            >
              ⬆ Open from Desktop
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".deld,.json"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>

          {/* Inline Save Form */}
          {isSavingCurrent && (
            <form
              onSubmit={handleSave}
              style={{
                backgroundColor: 'var(--bg-subtle)',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid var(--border-focus)',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div className="property-row">
                <label className="property-label">Circuit Name</label>
                <input
                  type="text"
                  className="property-input"
                  placeholder="e.g. 4-Bit ALU Experiment"
                  value={circuitName}
                  onChange={(e) => setCircuitName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="property-row">
                <label className="property-label">Description (Optional)</label>
                <input
                  type="text"
                  className="property-input"
                  placeholder="Lab notes, theory, or component details..."
                  value={circuitDesc}
                  onChange={(e) => setCircuitDesc(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="header-btn primary"
                style={{ alignSelf: 'flex-end', marginTop: '4px' }}
              >
                Save to Profile
              </button>
            </form>
          )}

          {/* List of Saved Circuits */}
          <div style={{ marginTop: '8px' }}>
            <h4
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '8px',
                letterSpacing: '0.8px',
              }}
            >
              Saved Circuits ({circuits.length})
            </h4>

            {circuits.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '30px 10px',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                }}
              >
                No saved circuits in this profile yet. Click "Save Active Circuit" above!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {circuits.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onLoadCircuit(c.circuit, c.name);
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.name}
                      </div>
                      {c.description && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {c.description}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                          marginTop: '4px',
                        }}
                      >
                        {c.componentCount} components • {c.wireCount} wires • {new Date(c.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="header-btn"
                        onClick={(e) => handleDownload(c, e)}
                        title="Download .deld file to desktop"
                      >
                        ⬇
                      </button>
                      <button
                        className="header-btn danger"
                        onClick={(e) => handleDelete(c.id, e)}
                        title="Delete circuit"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="header-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
