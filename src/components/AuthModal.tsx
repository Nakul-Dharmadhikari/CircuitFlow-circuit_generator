import React, { useState } from 'react';
import type { Circuit, User, SavedCircuit } from '../types/circuit';
import {
  loginUser,
  registerUser,
  logoutUser,
  getUserCircuits,
  saveUserCircuit,
  deleteUserCircuit,
  downloadCircuitToFile,
} from '../services/storage';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: User | null;
  currentCircuit?: Circuit;
  onClose: () => void;
  onUserChanged: (user: User) => void;
  onLoggedOut?: () => void;
  onLoadCircuit?: (circuit: Circuit, name: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  currentCircuit,
  onClose,
  onUserChanged,
  onLoggedOut,
  onLoadCircuit,
}) => {
  const [mode, setMode] = useState<'profile' | 'login' | 'register'>('profile');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');

  // Profile Save Form State
  const [isSavingCircuit, setIsSavingCircuit] = useState(false);
  const [saveCircuitName, setSaveCircuitName] = useState('');
  const [saveCircuitDesc, setSaveCircuitDesc] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const res = loginUser(username, password);
    if (res.success && res.user) {
      onUserChanged(res.user);
      setUsername('');
      setPassword('');
      onClose();
    } else {
      setAuthError(res.error || 'Login failed.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const res = registerUser(username, password, displayName);
    if (res.success && res.user) {
      onUserChanged(res.user);
      setUsername('');
      setPassword('');
      setDisplayName('');
      onClose();
    } else {
      setAuthError(res.error || 'Registration failed.');
    }
  };

  const handleLogout = () => {
    logoutUser();
    onLoggedOut?.();
    onClose();
  };

  const handleSaveActiveCircuit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentCircuit || !saveCircuitName.trim()) return;
    saveUserCircuit(currentUser.id, saveCircuitName, saveCircuitDesc, currentCircuit);
    setSaveSuccessMsg(`Saved "${saveCircuitName.trim()}" to your private vault!`);
    setSaveCircuitName('');
    setSaveCircuitDesc('');
    setIsSavingCircuit(false);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleDeleteCircuit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (window.confirm('Delete this circuit from your private vault?')) {
      deleteUserCircuit(currentUser.id, id);
      setSaveSuccessMsg('Circuit deleted from vault.');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }
  };

  const userCircuits: SavedCircuit[] = currentUser ? getUserCircuits(currentUser.id) : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <span>👤</span> Profile & Private Vault
          </div>
          <button className="panel-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {mode === 'profile' && currentUser && (
            <div>
              {/* Profile Card */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-focus)',
                  borderRadius: '10px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: currentUser.avatarColor,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '19px',
                    fontWeight: 800,
                  }}
                >
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {currentUser.displayName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    @{currentUser.username}
                  </div>
                  <div style={{ fontSize: '11px', color: '#10b981', marginTop: '3px', fontWeight: 600 }}>
                    🔒 Private Vault: {userCircuits.length} saved schematic{userCircuits.length === 1 ? '' : 's'} (Visible only to you)
                  </div>
                </div>
              </div>

              {saveSuccessMsg && (
                <div
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    color: '#86efac',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    marginBottom: '14px',
                    textAlign: 'left',
                  }}
                >
                  ✓ {saveSuccessMsg}
                </div>
              )}

              {/* Save Active Circuit Section */}
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '12px',
                  backgroundColor: 'var(--bg-panel)',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    💾 Save Current Workbench Circuit
                  </span>
                  <button
                    type="button"
                    className="header-btn primary"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => setIsSavingCircuit(!isSavingCircuit)}
                  >
                    {isSavingCircuit ? '✕ Cancel' : '＋ Save to Profile'}
                  </button>
                </div>

                {isSavingCircuit && (
                  <form onSubmit={handleSaveActiveCircuit} style={{ marginTop: '10px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <label className="property-label">Circuit Name *</label>
                        <input
                          type="text"
                          className="property-input"
                          placeholder="e.g. My Synchronous Counter"
                          value={saveCircuitName}
                          onChange={(e) => setSaveCircuitName(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="property-label">Lab Notes / Description (Optional)</label>
                        <input
                          type="text"
                          className="property-input"
                          placeholder="Components used, state table notes..."
                          value={saveCircuitDesc}
                          onChange={(e) => setSaveCircuitDesc(e.target.value)}
                        />
                      </div>
                      <button
                        type="submit"
                        className="header-btn primary"
                        style={{ alignSelf: 'flex-end', marginTop: '4px' }}
                      >
                        🔒 Confirm Save to Vault
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Private Saved Circuits Vault List */}
              <div style={{ marginBottom: '18px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    marginBottom: '8px',
                    letterSpacing: '0.8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>My Saved Circuits ({userCircuits.length})</span>
                  <span style={{ color: '#10b981', fontSize: '10px' }}>🔒 Strict Isolation</span>
                </div>

                {userCircuits.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '20px 10px',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: '6px',
                    }}
                  >
                    No saved circuits in this profile yet. Click "Save to Profile" above to save your schematic!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {userCircuits.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ textAlign: 'left', flex: 1, minWidth: 0, marginRight: '8px' }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.name}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {c.componentCount} comps • {c.wireCount} wires • {new Date(c.updatedAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '4px' }}>
                          {onLoadCircuit && (
                            <button
                              type="button"
                              className="header-btn primary"
                              style={{ padding: '3px 7px', fontSize: '11px' }}
                              onClick={() => {
                                onLoadCircuit(c.circuit, c.name);
                                onClose();
                              }}
                              title="Load schematic into workbench"
                            >
                              🚀 Load
                            </button>
                          )}
                          <button
                            type="button"
                            className="header-btn"
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                            onClick={() => downloadCircuitToFile(c.circuit, c.name)}
                            title="Download .deld file"
                          >
                            ⬇
                          </button>
                          <button
                            type="button"
                            className="header-btn danger"
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                            onClick={(e) => handleDeleteCircuit(c.id, e)}
                            title="Delete from profile"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Account Management Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  className="header-btn"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setMode('login');
                    setAuthError('');
                  }}
                >
                  Switch to Another Account
                </button>

                <button
                  type="button"
                  className="header-btn"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setMode('register');
                    setAuthError('');
                  }}
                >
                  ＋ Create New Account
                </button>

                <button
                  type="button"
                  className="header-btn danger"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleLogout}
                >
                  ⎋ Log Out & Clear Workbench
                </button>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px' }}>Sign In to Private Account</span>
                <button
                  type="button"
                  className="header-btn"
                  style={{ padding: '2px 8px', fontSize: '11px' }}
                  onClick={() => setMode('profile')}
                >
                  ← Back
                </button>
              </div>

              {authError && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>
                  ⚠️ {authError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="property-label">Username / Handle *</label>
                  <input
                    type="text"
                    className="property-input"
                    placeholder="e.g. engineer1"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="property-label">Password *</label>
                  <input
                    type="password"
                    className="property-input"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="header-btn primary" style={{ width: '100%', padding: '10px' }}>
                Unlock & Log In
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px' }}>Register New Profile</span>
                <button
                  type="button"
                  className="header-btn"
                  style={{ padding: '2px 8px', fontSize: '11px' }}
                  onClick={() => setMode('profile')}
                >
                  ← Back
                </button>
              </div>

              {authError && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>
                  ⚠️ {authError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="property-label">Full Name / Display Name</label>
                  <input
                    type="text"
                    className="property-input"
                    placeholder="e.g. Alex Turing"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="property-label">Username / Handle *</label>
                  <input
                    type="text"
                    className="property-input"
                    placeholder="e.g. alex_turing"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="property-label">Password *</label>
                  <input
                    type="password"
                    className="property-input"
                    placeholder="Choose password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="header-btn primary" style={{ width: '100%', padding: '10px' }}>
                Create Account & Log In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
