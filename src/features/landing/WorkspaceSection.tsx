import React, { useState } from 'react';
import type { User } from '../../types/circuit';
import { loginUser, registerUser, getUserCircuits } from '../../services/storage';
import { getUserCustomICs } from '../../services/customIcStorage';
import { soundFx } from '../../audio/soundEffects';

interface WorkspaceSectionProps {
  currentUser: User | null;
  onUserLoggedIn: (user: User) => void;
  onUserLoggedOut: () => void;
  onEnterSimulator: () => void;
}

export const WorkspaceSection: React.FC<WorkspaceSectionProps> = ({
  currentUser,
  onUserLoggedIn,
  onUserLoggedOut,
  onEnterSimulator,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Real statistics from local persistence
  const userCircuits = currentUser ? getUserCircuits(currentUser.id) : [];
  const userCustomICs = currentUser ? getUserCustomICs(currentUser.id) : [];

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (authMode === 'login') {
      const res = loginUser(username, password);
      if (res.success && res.user) {
        soundFx.playButtonTap();
        onUserLoggedIn(res.user);
        setUsername('');
        setPassword('');
      } else {
        setAuthError(res.error || 'Login failed. Verify your username and password.');
      }
    } else {
      const res = registerUser(username, password, displayName);
      if (res.success && res.user) {
        soundFx.playButtonTap();
        onUserLoggedIn(res.user);
        setUsername('');
        setPassword('');
        setDisplayName('');
        setAuthSuccess('Account created successfully! Welcome to CircuitFlow.');
      } else {
        setAuthError(res.error || 'Registration failed.');
      }
    }
  };

  return (
    <section className="landing-section" id="workspace-vault" aria-label="Engineering Workspace">
      <div className="section-header-center">
        <div className="section-eyebrow">Isolated Data Vault</div>
        <h2 className="section-title">Engineering Workspace</h2>
        <p className="section-subtitle">
          Your circuits, customized 74-series subcircuit ICs, and lab configurations are stored with client-side isolation.
        </p>
      </div>

      <div className="workspace-vault-card">
        {currentUser ? (
          /* ================================================================
             AUTHENTICATED STATE: Clean Engineering Profile Card
             ================================================================ */
          <div>
            <div className="workspace-vault-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>📁</span>
                <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--lp-text-primary)' }}>
                  Personal Engineering Workspace
                </span>
              </div>
              <button
                type="button"
                className="landing-btn ghost"
                style={{ color: 'var(--lp-error)', fontSize: '12px', padding: '4px 10px' }}
                onClick={onUserLoggedOut}
                title="Log out of active workspace"
              >
                Sign Out
              </button>
            </div>

            <div className="workspace-vault-body">
              <div className="vault-authenticated-layout">
                {/* Avatar */}
                <div
                  className="vault-avatar"
                  style={{ backgroundColor: currentUser.avatarColor || '#06B6D4' }}
                >
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'E'}
                </div>

                {/* Profile info & real counts */}
                <div className="vault-user-info">
                  <div className="vault-user-name">
                    <span>{currentUser.displayName}</span>
                    <span className="vault-active-tag">● Vault Unlocked</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--lp-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    @{currentUser.username} • Personal Engineering Workspace
                  </div>

                  <div className="vault-metrics-row">
                    <div className="vault-metric-chip">
                      Projects: <strong>{userCircuits.length}</strong>
                    </div>
                    <div className="vault-metric-chip">
                      Saved Circuits: <strong>{userCircuits.length}</strong>
                    </div>
                    <div className="vault-metric-chip">
                      Custom ICs: <strong>{userCustomICs.length}</strong>
                    </div>
                  </div>
                </div>

                {/* Direct Action */}
                <div>
                  <button
                    type="button"
                    className="landing-btn primary"
                    style={{ padding: '12px 24px', fontSize: '14px', whiteSpace: 'nowrap' }}
                    onClick={onEnterSimulator}
                  >
                    <span>Open CircuitFlow Workbench →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================
             UNAUTHENTICATED STATE: Clean Tabbed Login / Register Portal
             ================================================================ */
          <div>
            <div className="workspace-vault-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>🔐</span>
                <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--lp-text-primary)' }}>
                  Sign In to Private Engineering Vault
                </span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--lp-text-muted)' }}>
                Client-Side Encryption Active
              </span>
            </div>

            <div className="workspace-vault-body">
              {/* Tab Selector */}
              <div className="vault-auth-tabs">
                <button
                  type="button"
                  className={`vault-auth-tab ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`vault-auth-tab ${authMode === 'register' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                  }}
                >
                  Create Account
                </button>
              </div>

              {authError && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--lp-error)',
                    color: 'var(--lp-error)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    maxWidth: '440px',
                    margin: '0 auto 16px auto',
                    textAlign: 'left',
                  }}
                >
                  ⚠️ {authError}
                </div>
              )}

              {authSuccess && (
                <div
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid var(--lp-high)',
                    color: '#15803D',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    maxWidth: '440px',
                    margin: '0 auto 16px auto',
                    textAlign: 'left',
                  }}
                >
                  ✓ {authSuccess}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="vault-auth-form-wrap">
                {authMode === 'register' && (
                  <div className="vault-input-group">
                    <label className="vault-input-label">Full Name / Display Name</label>
                    <input
                      type="text"
                      className="vault-input"
                      placeholder="e.g. Atharv"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                )}

                <div className="vault-input-group">
                  <label className="vault-input-label">Username / Handle *</label>
                  <input
                    type="text"
                    className="vault-input"
                    placeholder="e.g. engineer1"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>

                <div className="vault-input-group">
                  <label className="vault-input-label">Password *</label>
                  <input
                    type="password"
                    className="vault-input"
                    placeholder="Enter your private password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  />
                </div>

                <button
                  type="submit"
                  className="landing-btn primary"
                  style={{ width: '100%', padding: '11px', marginTop: '6px' }}
                >
                  {authMode === 'login' ? 'Sign In & Open Workspace →' : 'Register Profile & Launch →'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="landing-btn ghost"
                    style={{ fontSize: '12.5px', color: 'var(--lp-text-secondary)' }}
                    onClick={onEnterSimulator}
                  >
                    Or continue as Guest Engineer →
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
