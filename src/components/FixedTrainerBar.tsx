import React, { useState } from 'react';
import type { Circuit, LogicValue } from '../types/circuit';
import { soundFx } from '../audio/soundEffects';

interface FixedTrainerBarProps {
  circuit: Circuit;
  clockHz: number;
  onClockHzChange: (freq: number) => void;
  onToggleSwitch: (id: string) => void;
  onStepClock?: () => void;
  onFocusTrainer?: () => void;
}

export const FixedTrainerBar: React.FC<FixedTrainerBarProps> = ({
  circuit,
  clockHz,
  onClockHzChange,
  onToggleSwitch,
  onStepClock,
  onFocusTrainer,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Extract trainer components
  const clkComp = circuit.components.find((c) => c.id === 'trainer_clk');
  const isClkHigh = clkComp?.state?.toggleState === true || clkComp?.outputs[0]?.value === '1';

  // Read Inputs 0..15
  const inputs: { id: string; label: string; value: boolean; pinConnected: boolean }[] = [];
  for (let i = 0; i < 16; i++) {
    const id = `trainer_in_${i}`;
    const comp = circuit.components.find((c) => c.id === id);
    const isHigh = comp?.state?.toggleState === true || comp?.outputs[0]?.value === '1';
    const isConn = circuit.wires.some((w) => w.fromCompId === id || w.toCompId === id);
    inputs.push({
      id,
      label: `IN-${i}`,
      value: isHigh,
      pinConnected: isConn,
    });
  }

  // Read Outputs 0..15
  const outputs: { id: string; label: string; value: LogicValue; pinConnected: boolean }[] = [];
  for (let i = 0; i < 16; i++) {
    const id = `trainer_out_${i}`;
    const comp = circuit.components.find((c) => c.id === id);
    const pinVal: LogicValue = comp?.inputs[0]?.value || '0';
    const isConn = circuit.wires.some((w) => w.fromCompId === id || w.toCompId === id);
    outputs.push({
      id,
      label: `OUT-${i}`,
      value: pinVal,
      pinConnected: isConn,
    });
  }

  return (
    <div className={`trainer-bar-dock ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Dock Toggle Header */}
      <div className="trainer-bar-handle" onClick={() => setIsExpanded((prev) => !prev)}>
        <div className="trainer-bar-title">
          <span className="trainer-icon">🎛️</span>
          <span className="trainer-title-text">Digital Virtual Trainer Kit</span>
          <span className="trainer-badge">16 Inputs • 16 Outputs • Dual Rail</span>
        </div>

        <div className="trainer-handle-controls" onClick={(e) => e.stopPropagation()}>
          {onFocusTrainer && (
            <button
              className="trainer-mini-btn"
              onClick={onFocusTrainer}
              title="Focus view on Trainer Kit board in canvas"
            >
              🎯 Center Board
            </button>
          )}
          <button
            className="trainer-mini-btn"
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'Collapse Trainer Kit' : 'Expand Trainer Kit'}
          >
            {isExpanded ? '▼ Hide Dock' : '▲ Show Dock'}
          </button>
        </div>
      </div>

      {/* Expanded Console Body */}
      {isExpanded && (
        <div className="trainer-console-content">
          {/* Section 1: Power & Clock Controls */}
          <div className="trainer-section power-clock-section">
            <div className="trainer-section-header">POWER & CLOCK</div>
            <div className="trainer-power-grid">
              {/* VCC +5V */}
              <div className="trainer-power-node vcc" title="VCC: Continuous +5V logic HIGH reference">
                <div className="power-indicator on">5V</div>
                <span className="power-label">VCC</span>
              </div>

              {/* GND 0V */}
              <div className="trainer-power-node gnd" title="GND: Continuous 0V logic LOW reference">
                <div className="power-indicator off">0V</div>
                <span className="power-label">GND</span>
              </div>

              {/* Master Clock */}
              <div className="trainer-clock-node">
                <div className={`clock-pulse-led ${isClkHigh ? 'active' : ''}`} />
                <div className="clock-details">
                  <span className="clock-label">CLK: {clockHz}Hz</span>
                  <div className="clock-steppers">
                    <button
                      className="clk-step-btn"
                      onClick={() => onClockHzChange(Math.max(0.5, clockHz <= 1 ? clockHz - 0.25 : clockHz - 1))}
                      title="Decrease frequency"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className="clk-freq-input"
                      value={clockHz}
                      min={0.5}
                      max={100}
                      step={1}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          onClockHzChange(Math.min(Math.max(val, 0.1), 100));
                        }
                      }}
                    />
                    <button
                      className="clk-step-btn"
                      onClick={() => onClockHzChange(Math.min(100, clockHz < 1 ? clockHz + 0.25 : clockHz + 1))}
                      title="Increase frequency"
                    >
                      +
                    </button>
                  </div>
                </div>
                {onStepClock && (
                  <button
                    className="clk-manual-pulse-btn"
                    onClick={() => {
                      onStepClock();
                      soundFx.playButtonTap();
                    }}
                    title="Manual single clock edge pulse"
                  >
                    ⚡ Pulse
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="trainer-separator" />

          {/* Section 2: 16 Fixed Digital Inputs */}
          <div className="trainer-section inputs-section">
            <div className="trainer-section-header">
              <span>DIGITAL INPUT SWITCHES (IN-0 TO IN-15)</span>
              <span className="section-note">Click switch to toggle 0 / 1</span>
            </div>
            <div className="trainer-switches-scroll">
              <div className="trainer-switches-grid">
                {inputs.map((inp) => (
                  <div
                    key={inp.id}
                    className={`trainer-switch-card ${inp.value ? 'active' : ''} ${inp.pinConnected ? 'connected' : ''}`}
                    onClick={() => {
                      onToggleSwitch(inp.id);
                      soundFx.playSwitchClick(!inp.value);
                    }}
                    title={`${inp.label}: Click to toggle ${inp.value ? '0 (LOW)' : '1 (HIGH)'}${inp.pinConnected ? ' [Wire Connected]' : ' [Unwired]'}`}
                  >
                    <div className="switch-top-row">
                      <span className="switch-label">{inp.label}</span>
                      <div className={`switch-led-dot ${inp.value ? 'high' : 'low'}`} />
                    </div>
                    <div className="switch-toggle-housing">
                      <div className="switch-toggle-lever" />
                    </div>
                    <span className="switch-value-text">{inp.value ? '1' : '0'}</span>
                    {inp.pinConnected && <div className="connected-pin-badge" title="Wired to circuit" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="trainer-separator" />

          {/* Section 3: 16 Fixed Digital Outputs */}
          <div className="trainer-section outputs-section">
            <div className="trainer-section-header">
              <span>DIGITAL OUTPUT MONITORS (OUT-0 TO OUT-15)</span>
              <span className="section-note">Live Logic Status LEDs</span>
            </div>
            <div className="trainer-switches-scroll">
              <div className="trainer-outputs-grid">
                {outputs.map((out) => {
                  const isHigh = out.value === '1';
                  return (
                    <div
                      key={out.id}
                      className={`trainer-output-card ${isHigh ? 'active' : ''} ${out.pinConnected ? 'connected' : ''}`}
                      title={`${out.label}: State = ${out.value}${out.pinConnected ? ' [Wire Connected]' : ' [Unwired]'}`}
                    >
                      <div className="output-top-row">
                        <span className="output-label">{out.label}</span>
                      </div>
                      <div className={`output-lamp ${isHigh ? 'glowing' : ''}`}>
                        <div className="output-lamp-inner" />
                      </div>
                      <span className={`output-value-text ${isHigh ? 'high' : 'low'}`}>
                        {out.value}
                      </span>
                      {out.pinConnected && <div className="connected-pin-badge" title="Wired to circuit" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
