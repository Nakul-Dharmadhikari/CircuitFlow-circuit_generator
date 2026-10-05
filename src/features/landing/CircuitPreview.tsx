import React, { useState, useEffect } from 'react';
import { soundFx } from '../../audio/soundEffects';

export const CircuitPreview: React.FC = () => {
  const [switchA, setSwitchA] = useState(true);
  const [switchB, setSwitchB] = useState(true);
  const [clockState, setClockState] = useState(false);
  const [qState, setQState] = useState(true);

  // AND gate logic
  const andOutput = switchA && switchB;

  // 1 Hz automatic clock oscillation
  useEffect(() => {
    const timer = setInterval(() => {
      setClockState((prev) => {
        const nextClk = !prev;
        // Rising edge of clock updates D flip-flop Q = D
        if (nextClk) {
          setQState(andOutput);
        }
        return nextClk;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [andOutput]);

  const toggleSwitchA = () => {
    const next = !switchA;
    setSwitchA(next);
    soundFx.playSwitchClick(next);
  };

  const toggleSwitchB = () => {
    const next = !switchB;
    setSwitchB(next);
    soundFx.playSwitchClick(next);
  };

  const highColor = '#22C55E';
  const lowColor = '#94A3B8';
  const clkColor = '#06B6D4';

  return (
    <div className="circuit-preview-card" aria-label="Interactive Digital Circuit Demonstration">
      {/* Header bar */}
      <div className="preview-header-bar">
        <div className="preview-header-title">
          <span>⚡ Live Synchronous Schematic</span>
          <span style={{ fontSize: '11px', color: 'var(--lp-text-muted)', fontWeight: 500 }}>
            (Interactive Preview)
          </span>
        </div>
        <div className="preview-pill">
          <span className="dot" />
          <span>SOLVER: 60 FPS</span>
        </div>
      </div>

      {/* Schematic SVG Canvas */}
      <div className="preview-schematic-canvas">
        <svg
          viewBox="0 0 520 220"
          className="schematic-svg-layer"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Signal Wires with color coding */}

          {/* Wire: Input A -> AND Gate Input 1 */}
          <path
            d="M 55 60 L 140 60"
            fill="none"
            stroke={switchA ? highColor : lowColor}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Wire: Input B -> AND Gate Input 2 */}
          <path
            d="M 55 120 L 140 120"
            fill="none"
            stroke={switchB ? highColor : lowColor}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Wire: AND Gate Output -> D Flip-Flop D input */}
          <path
            d="M 215 90 L 275 90"
            fill="none"
            stroke={andOutput ? highColor : lowColor}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Wire: Clock Source -> D Flip-Flop CLK input */}
          <path
            d="M 315 200 L 315 155"
            fill="none"
            stroke={clockState ? clkColor : lowColor}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Wire: D Flip-Flop Q -> Output Lamp */}
          <path
            d="M 355 90 L 415 90"
            fill="none"
            stroke={qState ? highColor : lowColor}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* ==============================================================
              INPUT TERMINALS (A & B)
             ============================================================== */}
          <g transform="translate(15, 42)">
            <rect width="40" height="34" rx="6" fill="#F8FAFC" stroke="var(--lp-border)" strokeWidth="1.5" />
            <text x="20" y="22" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--lp-text-primary)">
              IN A
            </text>
            <circle cx="40" cy="18" r="4.5" fill={switchA ? highColor : lowColor} />
          </g>

          <g transform="translate(15, 102)">
            <rect width="40" height="34" rx="6" fill="#F8FAFC" stroke="var(--lp-border)" strokeWidth="1.5" />
            <text x="20" y="22" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--lp-text-primary)">
              IN B
            </text>
            <circle cx="40" cy="18" r="4.5" fill={switchB ? highColor : lowColor} />
          </g>

          {/* ==============================================================
              2-INPUT AND GATE (ANSI SYMBOL)
             ============================================================== */}
          <g transform="translate(140, 50)">
            <path
              d="M 0 0 L 38 0 C 60 0, 75 18, 75 40 C 75 62, 60 80, 38 80 L 0 80 Z"
              fill="#FFFFFF"
              stroke="#06B6D4"
              strokeWidth="2.2"
            />
            {/* Input pin terminals */}
            <circle cx="0" cy="10" r="4" fill={switchA ? highColor : lowColor} />
            <circle cx="0" cy="70" r="4" fill={switchB ? highColor : lowColor} />
            {/* Output pin terminal */}
            <circle cx="75" cy="40" r="4" fill={andOutput ? highColor : lowColor} />
            <text x="32" y="46" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0891B2">
              AND
            </text>
            <text x="32" y="98" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--lp-text-secondary)">
              7408
            </text>
          </g>

          {/* ==============================================================
              D FLIP-FLOP (SEQUENTIAL IC / 7474)
             ============================================================== */}
          <g transform="translate(275, 45)">
            <rect width="80" height="110" rx="8" fill="#FFFFFF" stroke="#14B8A6" strokeWidth="2.2" />
            {/* D input */}
            <circle cx="0" cy="45" r="4" fill={andOutput ? highColor : lowColor} />
            <text x="14" y="50" fontSize="11" fontWeight="700" fill="var(--lp-text-primary)">D</text>

            {/* Clock triangular notch & input */}
            <path d="M 33 110 L 40 100 L 47 110" fill="none" stroke="#14B8A6" strokeWidth="1.8" />
            <circle cx="40" cy="110" r="4" fill={clockState ? clkColor : lowColor} />
            <text x="40" y="94" textAnchor="middle" fontSize="10" fontWeight="700" fill={clkColor}>CLK</text>

            {/* Q Output */}
            <circle cx="80" cy="45" r="4" fill={qState ? highColor : lowColor} />
            <text x="66" y="50" fontSize="11" fontWeight="700" fill="var(--lp-text-primary)">Q</text>

            <text x="40" y="30" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0D9488">
              D-FF
            </text>
            <text x="40" y="70" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--lp-text-secondary)">
              7474
            </text>
          </g>

          {/* Clock Pulse Generator Badge */}
          <g transform="translate(285, 190)">
            <rect width="60" height="24" rx="5" fill="#F0FDFA" stroke="#14B8A6" strokeWidth="1.2" />
            <text x="30" y="16" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#0F766E">
              {clockState ? 'CLK: 1' : 'CLK: 0'}
            </text>
          </g>

          {/* ==============================================================
              OUTPUT SEVEN-SEGMENT / DISPLAY READOUT
             ============================================================== */}
          <g transform="translate(415, 45)">
            <rect width="78" height="90" rx="8" fill="#FFFFFF" stroke="var(--lp-border)" strokeWidth="2" />
            <rect x="14" y="14" width="50" height="62" rx="6" fill="#0F172A" />
            
            {/* 7-Segment / Digit '1' or '0' readout */}
            <text
              x="39"
              y="58"
              textAnchor="middle"
              fontFamily="var(--font-mono, monospace)"
              fontSize="38"
              fontWeight="900"
              fill={qState ? highColor : '#334155'}
              style={{
                filter: qState ? 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.7))' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {qState ? '1' : '0'}
            </text>

            <circle cx="0" cy="45" r="4" fill={qState ? highColor : lowColor} />
            <text x="39" y="83" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--lp-text-muted)">
              OUTPUT
            </text>
          </g>
        </svg>
      </div>

      {/* Interactive controls footer */}
      <div className="preview-footer-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600 }}>Toggle Inputs:</span>
          <button
            type="button"
            className={`interactive-switch-chip ${switchA ? 'active' : ''}`}
            onClick={toggleSwitchA}
            title="Click to toggle Input A"
          >
            A = {switchA ? '1 (HIGH)' : '0 (LOW)'}
          </button>
          <button
            type="button"
            className={`interactive-switch-chip ${switchB ? 'active' : ''}`}
            onClick={toggleSwitchB}
            title="Click to toggle Input B"
          >
            B = {switchB ? '1 (HIGH)' : '0 (LOW)'}
          </button>
        </div>

        <div style={{ fontWeight: 700, color: qState ? 'var(--lp-high)' : 'var(--lp-text-muted)' }}>
          State: {qState ? '● HIGH (5.0V)' : '○ LOW (0.0V)'}
        </div>
      </div>
    </div>
  );
};
