import React, { useState } from 'react';
import type { User } from '../types/circuit';
import { loginUser, registerUser, logoutUser, getUserCircuits } from '../services/storage';
import { getLabExperiments, type LabExperiment } from '../presets/labExperiments';
import { soundFx } from '../audio/soundEffects';

interface LandingPageProps {
  currentUser: User | null;
  onUserLoggedIn: (user: User) => void;
  onUserLoggedOut: () => void;
  onEnterSimulator: () => void;
  onLoadExperimentAndEnter: (exp: LabExperiment) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentUser,
  onUserLoggedIn,
  onUserLoggedOut,
  onEnterSimulator,
  onLoadExperimentAndEnter,
  theme,
  onToggleTheme,
}) => {
  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Interactive Live Gate Demo on Landing Page
  const [demoSwitchA, setDemoSwitchA] = useState(false);
  const [demoSwitchB, setDemoSwitchB] = useState(true);
  const [demoGateType, setDemoGateType] = useState<'xor' | 'and' | 'or' | 'nand'>('xor');

  // Compute live demo gate output
  const evaluateDemo = () => {
    const a = demoSwitchA;
    const b = demoSwitchB;
    switch (demoGateType) {
      case 'xor':
        return (a && !b) || (!a && b);
      case 'and':
        return a && b;
      case 'or':
        return a || b;
      case 'nand':
        return !(a && b);
      default:
        return false;
    }
  };

  const demoOutput = evaluateDemo();
  const activeUserCircuits = currentUser ? getUserCircuits(currentUser.id) : [];
  const presets = getLabExperiments();

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

  const handleLogout = () => {
    logoutUser();
    onUserLoggedOut();
    soundFx.playButtonTap();
  };

  const handlePresetClick = (exp: LabExperiment) => {
    if (!currentUser) {
      setAuthError('Please log in with your credentials to open and simulate this lab preset.');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }
    onLoadExperimentAndEnter(exp);
  };

  return (
    <div className="landing-page">
      {/* Background Cyber Grid */}
      <div className="landing-cyber-bg" />

      {/* Top Navigation */}
      <header className="landing-navbar">
        <div className="landing-nav-brand">
          <div className="landing-logo-icon">CF</div>
          <div className="landing-logo-text">
            <span className="landing-logo-title">CircuitFlow</span>
            <span className="landing-logo-subtitle">DIGITAL LOGIC LAB v2.5</span>
          </div>
        </div>

        <div className="landing-nav-actions">
          <div className="system-status-pill">
            <span className="status-dot" />
            ENGINE: ACTIVE 60FPS
          </div>

          <button
            className="header-btn"
            onClick={onToggleTheme}
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="launch-sim-btn"
                style={{ width: 'auto', padding: '7px 16px', fontSize: '12px' }}
                onClick={onEnterSimulator}
              >
                🚀 Open Simulator
              </button>
              <button
                className="header-btn"
                onClick={handleLogout}
                title="Log Out of your private session"
                style={{ color: '#f87171', padding: '6px 10px', fontSize: '12px' }}
              >
                ⎋ Log Out
              </button>
            </div>
          ) : (
            <button
              className="header-btn primary"
              onClick={() => {
                window.scrollTo({ top: 320, behavior: 'smooth' });
              }}
            >
              🔐 Log In / Sign Up
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="landing-hero">
        <div className="landing-badge">
          ⚡ NEXT-GENERATION LOGIC SYNTHESIS & SEQUENTIAL SIMULATION
        </div>

        <h1 className="landing-title">
          Architect Digital Circuits & <span>Synchronous State Machines</span>
        </h1>

        <p className="landing-desc">
          Build synchronous upcounters, flip-flops, combinational arithmetic units, and multi-channel timing diagrams.
          Featuring automated state transition tables, safe wire branching, and strictly isolated private vaults.
        </p>

        {/* Private Authentication & Workbench Launch Gateway */}
        <div className="gateway-card" id="auth-portal">
          <div className="gateway-header">
            <div className="gateway-title-group">
              <div className="gateway-title">
                <span>🔐</span> Private Engineering Vault
              </div>
              <div className="gateway-subtitle">
                {currentUser
                  ? `Authenticated session active. Your schematics are encrypted to your credentials.`
                  : `Please enter your private username and password to unlock the simulator workbench.`}
              </div>
            </div>

            {currentUser && (
              <button className="header-btn danger" onClick={handleLogout}>
                ⎋ Log Out
              </button>
            )}
          </div>

          {/* If Logged In: Show Private Session Card */}
          {currentUser ? (
            <>
              <div className="active-profile-banner">
                <div className="profile-info">
                  <div
                    className="profile-avatar-lg"
                    style={{ backgroundColor: currentUser.avatarColor }}
                  >
                    {currentUser.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="profile-meta">
                    <div className="profile-name">
                      {currentUser.displayName}{' '}
                      <span style={{ color: '#10b981', fontSize: '13px' }}>● Vault Unlocked</span>
                    </div>
                    <div className="profile-handle">@{currentUser.username}</div>
                    <div className="profile-stats-tag">
                      🔒 Private Schematics: {activeUserCircuits.length} saved circuit
                      {activeUserCircuits.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                    lineHeight: '1.5',
                  }}
                >
                  Strict Multi-User Isolation Active.<br />
                  Other users cannot access or view your circuits.
                </div>
              </div>

              <button
                type="button"
                className="launch-sim-btn"
                onClick={onEnterSimulator}
              >
                <span>🚀</span> ENTER CIRCUITFLOW SIMULATOR WORKBENCH
              </button>
            </>
          ) : (
            /* If Not Logged In: Show Secure Private Login / Register Form */
            <div>
              {/* Tab Selector */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '20px',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '10px',
                }}
              >
                <button
                  type="button"
                  className={`header-btn ${authMode === 'login' ? 'active primary' : ''}`}
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  style={{ flex: 1, padding: '10px', justifyContent: 'center', fontSize: '13px' }}
                >
                  🔑 Sign In to Vault
                </button>
                <button
                  type="button"
                  className={`header-btn ${authMode === 'register' ? 'active primary' : ''}`}
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                  }}
                  style={{ flex: 1, padding: '10px', justifyContent: 'center', fontSize: '13px' }}
                >
                  ＋ Create Private Profile
                </button>
              </div>

              {authError && (
                <div
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#fca5a5',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    marginBottom: '16px',
                    textAlign: 'left',
                  }}
                >
                  ⚠️ {authError}
                </div>
              )}

              {authSuccess && (
                <div
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    color: '#86efac',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    marginBottom: '16px',
                    textAlign: 'left',
                  }}
                >
                  ✓ {authSuccess}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                  {authMode === 'register' && (
                    <div>
                      <label className="property-label">Display Name / Full Name</label>
                      <input
                        type="text"
                        className="property-input"
                        placeholder="e.g. Lead Engineer"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <label className="property-label">Username / Handle *</label>
                    <input
                      type="text"
                      className="property-input"
                      placeholder="e.g. engineer1"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                    />
                  </div>

                  <div>
                    <label className="property-label">Password *</label>
                    <input
                      type="password"
                      className="property-input"
                      placeholder="Enter your private password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="launch-sim-btn"
                  style={{ width: '100%', marginBottom: '12px' }}
                >
                  {authMode === 'login' ? '🔓 Authenticate & Unlock Simulator' : '✨ Register Profile & Launch'}
                </button>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  🔒 Each account has a private isolated vault. No other users can see your credentials or schematics.
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Live Interactive Gate Demo */}
        <div className="interactive-demo-container">
          <div className="demo-title-bar">
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '15px', fontWeight: 800 }}>
                ⚡ Real-Time Logic Engine Live Preview
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Click the switches below to toggle inputs and test instant boolean logic evaluation.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {(['xor', 'and', 'or', 'nand'] as const).map((type) => (
                <button
                  key={type}
                  className={`header-btn ${demoGateType === type ? 'active primary' : ''}`}
                  onClick={() => {
                    setDemoGateType(type);
                    soundFx.playButtonTap();
                  }}
                  style={{ textTransform: 'uppercase', fontSize: '11px' }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="demo-gate-stage">
            {/* Input Switches */}
            <div className="demo-switch-col">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>
                  Input A:
                </span>
                <div
                  className={`switch-control ${demoSwitchA ? 'active' : ''}`}
                  onClick={() => {
                    const next = !demoSwitchA;
                    setDemoSwitchA(next);
                    soundFx.playSwitchClick(next);
                  }}
                  title="Click to toggle switch A"
                >
                  <span className="switch-indicator-label label-on">1</span>
                  <div className="switch-thumb" />
                  <span className="switch-indicator-label label-off">0</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>
                  Input B:
                </span>
                <div
                  className={`switch-control ${demoSwitchB ? 'active' : ''}`}
                  onClick={() => {
                    const next = !demoSwitchB;
                    setDemoSwitchB(next);
                    soundFx.playSwitchClick(next);
                  }}
                  title="Click to toggle switch B"
                >
                  <span className="switch-indicator-label label-on">1</span>
                  <div className="switch-thumb" />
                  <span className="switch-indicator-label label-off">0</span>
                </div>
              </div>
            </div>

            {/* Center Gate Display */}
            <div className="demo-gate-center">
              <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '1px', color: 'var(--text-primary)' }}>
                {demoGateType.toUpperCase()} GATE
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>
                {demoGateType === 'xor' && `${demoSwitchA ? 1 : 0} ⊕ ${demoSwitchB ? 1 : 0} = ${demoOutput ? 1 : 0}`}
                {demoGateType === 'and' && `${demoSwitchA ? 1 : 0} · ${demoSwitchB ? 1 : 0} = ${demoOutput ? 1 : 0}`}
                {demoGateType === 'or' && `${demoSwitchA ? 1 : 0} + ${demoSwitchB ? 1 : 0} = ${demoOutput ? 1 : 0}`}
                {demoGateType === 'nand' && `(${demoSwitchA ? 1 : 0} · ${demoSwitchB ? 1 : 0})' = ${demoOutput ? 1 : 0}`}
              </div>
            </div>

            {/* Output LED */}
            <div className="demo-output-col">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                Output Y:
              </span>
              <div
                className={`led-indicator ${demoOutput ? 'on green' : ''}`}
                style={{ width: '40px', height: '40px' }}
              >
                <span className="led-digit-readout" style={{ fontSize: '14px' }}>
                  {demoOutput ? '1' : '0'}
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: demoOutput ? 'var(--signal-high)' : 'var(--text-muted)' }}>
                {demoOutput ? 'LOGIC HIGH (5V)' : 'LOGIC LOW (0V)'}
              </span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="features-grid">
          <div className="feature-box">
            <div className="feature-icon-badge">🔄</div>
            <div className="feature-title">Synchronous State Tables</div>
            <div className="feature-desc">
              Automated state transition tables for 3-bit synchronous upcounters, ripple counters, and flip-flops with clock rising-edge detection.
            </div>
          </div>

          <div className="feature-box">
            <div className="feature-icon-badge">✂️</div>
            <div className="feature-title">Safe Wire Branching</div>
            <div className="feature-desc">
              Click wires safely to select them with glowing indicators. Double-click or click the Tap action to add junctions without accidental deletion.
            </div>
          </div>

          <div className="feature-box">
            <div className="feature-icon-badge">⏪</div>
            <div className="feature-title">Undo, Redo & Copy-Paste</div>
            <div className="feature-desc">
              Full 50-step history stack with Ctrl+Z / Ctrl+Y. Copy any component selection or complete schematics and paste them into new circuits.
            </div>
          </div>

          <div className="feature-box">
            <div className="feature-icon-badge">🔒</div>
            <div className="feature-title">Strict Multi-User Isolation</div>
            <div className="feature-desc">
              Username and password protected accounts. User A’s circuits are never leaked or visible to User B, backed by offline .deld desktop export.
            </div>
          </div>
        </div>

        {/* Lab Presets Section */}
        <div className="presets-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Verified Laboratory Experiments</h2>
              <p className="section-desc">
                Launch directly into verified digital electronics circuits with pre-wired schematics.
              </p>
            </div>
          </div>

          <div className="presets-grid">
            {presets.map((exp) => (
              <div key={exp.id} className="preset-card">
                <div>
                  <div className="preset-card-header">
                    <span className="preset-cat-tag">{exp.category}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {exp.circuit.components.length} components
                    </span>
                  </div>
                  <div className="preset-title">{exp.title}</div>
                  <div className="preset-desc">{exp.description}</div>
                </div>

                <button
                  type="button"
                  className="preset-launch-btn"
                  onClick={() => handlePresetClick(exp)}
                >
                  {currentUser ? 'Load & Launch Preset ➔' : '🔐 Log In to Launch Preset'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div>
          <strong>CircuitFlow Digital Lab</strong> — Real-time Digital Electronics Simulation Platform
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          Strict Per-User Vault Active • Passwords Protected
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
