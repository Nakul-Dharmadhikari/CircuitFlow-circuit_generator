import React from 'react';
import type { CircuitComponent, LogicValue, Pin } from '../types/circuit';
import { GateSymbol } from './GateSymbols';

interface GateComponentProps {
  component: CircuitComponent;
  isSelected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onPinMouseDown: (pin: Pin, compId: string, e: React.MouseEvent) => void;
  onPinMouseUp: (pin: Pin, compId: string, e: React.MouseEvent) => void;
  onToggleSwitch?: (id: string) => void;
  onButtonPress?: (id: string, pressed: boolean) => void;
}

export const GateComponent: React.FC<GateComponentProps> = ({
  component,
  isSelected,
  onSelect,
  onPinMouseDown,
  onPinMouseUp,
  onToggleSwitch,
  onButtonPress,
}) => {
  const { id, type, label, x, y, width, height, inputs, outputs, state } = component;

  const isBasicGate = [
    'not',
    'buffer',
    'and',
    'or',
    'nand',
    'nor',
    'xor',
    'xnor',
    'tri_state',
  ].includes(type);

  // Hex display calculation
  const getHexChar = () => {
    const d0 = inputs.find((p) => p.id === 'd0')?.value === '1' ? 1 : 0;
    const d1 = inputs.find((p) => p.id === 'd1')?.value === '1' ? 2 : 0;
    const d2 = inputs.find((p) => p.id === 'd2')?.value === '1' ? 4 : 0;
    const d3 = inputs.find((p) => p.id === 'd3')?.value === '1' ? 8 : 0;
    const val = d0 + d1 + d2 + d3;
    return val.toString(16).toUpperCase();
  };

  const getPinClass = (val: LogicValue) => {
    if (val === '1') return 'high';
    if (val === '0') return 'low';
    if (val === 'Z') return 'z';
    return 'conflict';
  };

  const isDipIC = type.startsWith('ic_') || type === 'custom_ic';

  const isTrainerOutput = component.customProps?.isTrainerOutput;
  const isTrainerInput = component.customProps?.isTrainerInput;
  const isTrainerVcc = component.customProps?.isTrainerVcc;
  const isTrainerGnd = component.customProps?.isTrainerGnd;
  const isTrainerClock = component.customProps?.isTrainerClock;
  const isTrainerPulse = component.customProps?.isTrainerPulseButton;
  const isTrainerPower = component.customProps?.isTrainerPower;
  const isTrainerHigh = component.customProps?.isTrainerHigh;
  const isTrainerLow = component.customProps?.isTrainerLow;
  const isTrainerSpecial =
    Boolean(isTrainerOutput ||
    isTrainerInput ||
    isTrainerVcc ||
    isTrainerGnd ||
    isTrainerClock ||
    isTrainerPulse ||
    isTrainerPower ||
    isTrainerHigh ||
    isTrainerLow);

  return (
    <div
      className={`circuit-node ${!isBasicGate && type !== 'toggle' && type !== 'push_button' && type !== 'led' && type !== 'probe' && !isTrainerSpecial ? 'ic-chip' : ''} ${isDipIC ? 'dip-ic-package' : ''} ${isTrainerSpecial ? 'trainer-node' : ''} ${component.isTrainerFixed ? 'fixed-trainer-node' : ''} ${isSelected ? 'selected' : ''}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        cursor: component.isTrainerFixed ? 'default' : 'move',
      }}
      onMouseDown={(e) => {
        if (component.isTrainerFixed) {
          e.stopPropagation();
          return;
        }
        onSelect(id, e);
      }}
    >
      {/* DIP Package Physical Notch & Pin 1 Indicator */}
      {isDipIC && (
        <>
          <div className="dip-hardware-notch" />
          <div className="dip-hardware-pin1-dot" />
        </>
      )}

      {/* Component Title / Badge */}
      {isBasicGate && (
        <GateSymbol type={type} width={width} height={height} selected={isSelected} />
      )}

      {!isTrainerSpecial && (type === 'vcc' || type === 'gnd') && (
        <div style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GateSymbol type={type} width={width} height={height} />
        </div>
      )}

      {type === 'buzzer' && (
        <div style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GateSymbol type="buzzer" width={width - 12} height={height - 12} />
        </div>
      )}

      {/* IC Chip Internal Badge & Schematic Diagram */}
      {!isBasicGate &&
        !isTrainerSpecial &&
        type !== 'toggle' &&
        type !== 'push_button' &&
        type !== 'junction' &&
        type !== 'clock' &&
        type !== 'led' &&
        type !== 'probe' &&
        type !== 'seven_segment' &&
        type !== 'hex_display' &&
        type !== 'vcc' &&
        type !== 'gnd' &&
        type !== 'buzzer' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              padding: '2px 4px',
              maxWidth: `${width - 24}px`,
              maxHeight: `${height - 10}px`,
              overflow: 'hidden',
            }}
          >
            <div style={{ transform: isDipIC ? 'scale(0.8)' : 'scale(0.85)', transformOrigin: 'center center' }}>
              <GateSymbol type={type} width={Math.min(width - 24, 48)} height={24} />
            </div>
            <div
              className="circuit-node-label"
              style={{
                fontSize: width > 90 ? '10px' : '9px',
                marginTop: '1px',
                opacity: 0.95,
                fontWeight: 700,
                letterSpacing: '0.4px',
              }}
            >
              {component.label || type.toUpperCase()}
            </div>
          </div>
        )}

      {/* Floating Canvas Label Banner (Visible ONLY when user explicitly assigns a custom label) */}
      {component.isCustomLabel && Boolean(label && label.trim().length > 0) && type !== 'junction' && (
        <div className="circuit-node-banner" title={`Custom Label: ${label}`}>
          <span className="circuit-node-banner-text">{label}</span>
        </div>
      )}

      {/* Hardware Board Output Socket with LED & Pin Number */}
      {isTrainerOutput && (
        <div className="trainer-output-unit" title={`Output ${component.label}: State = ${inputs[0]?.value || '0'}`}>
          <span className="trainer-unit-lbl top">{component.label}</span>
          <div className={`trainer-led-lamp ${inputs[0]?.value === '1' ? 'on' : ''}`} />
          <div className="trainer-terminal-stem" />
          <div className="trainer-jack-socket" />
        </div>
      )}

      {/* Hardware Board Input Switch with Terminal Jack & Pin Number */}
      {isTrainerInput && (
        <div className="trainer-input-unit" title={`Input ${component.label}: Click to toggle`}>
          <div className="trainer-jack-socket" />
          <div className="trainer-terminal-stem" />
          <div
            className={`trainer-toggle-switch ${state?.toggleState ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSwitch?.(id);
            }}
          >
            <div className="trainer-toggle-lever" />
          </div>
          <span className="trainer-unit-lbl bottom">{component.label}</span>
        </div>
      )}

      {/* Hardware Board VCC Socket */}
      {isTrainerVcc && (
        <div className="trainer-power-unit vcc" title="Continuous +5V VCC Power Jack">
          <span className="trainer-unit-lbl top">VCC</span>
          <div className="trainer-led-lamp on" style={{ width: '10px', height: '10px', marginTop: '2px' }} />
          <div className="trainer-terminal-stem" />
          <div className="trainer-jack-socket vcc" />
        </div>
      )}

      {/* Hardware Board Power Switch Unit */}
      {isTrainerPower && (
        <div
          className="trainer-board-power-housing"
          title="Trainer Kit Master Power Switch (Click to toggle)"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSwitch?.(id);
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="power-housing-header">
            <span className="power-text-tag">POWER</span>
            <div className={`power-lamp ${state?.toggleState ? 'on' : ''}`} />
          </div>
          <div
            className={`trainer-power-rocker ${state?.toggleState ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSwitch?.(id);
            }}
          >
            <span className="rocker-lbl on-lbl">I</span>
            <div className="rocker-switch-thumb" />
            <span className="rocker-lbl off-lbl">O</span>
          </div>
        </div>
      )}

      {/* Hardware Board GND Socket */}
      {isTrainerGnd && (
        <div className="trainer-power-unit gnd" title="Continuous 0V GND Ground Jack">
          <div className="trainer-jack-socket gnd" />
          <div className="trainer-terminal-stem" />
          <span className="trainer-unit-lbl bottom">GND</span>
        </div>
      )}

      {/* Hardware Clock Frequency Jack with live pulsing LED */}
      {isTrainerClock && (
        <div className="trainer-clock-unit" title={`Clock Generator (${component.label}Hz)`}>
          <div className="trainer-jack-socket clk" />
          <div className="trainer-terminal-stem" />
          <div className={`trainer-clk-lamp ${outputs[0]?.value === '1' ? 'on' : ''}`} />
          <span className="trainer-unit-lbl bottom">{component.label}</span>
        </div>
      )}

      {/* Hardware HIGH Reference Pin (+5V) */}
      {isTrainerHigh && (
        <div className="trainer-ref-unit high" title="Continuous +5V Logic HIGH Output">
          <div className="trainer-jack-socket vcc" />
          <div className="trainer-terminal-stem" />
          <span className="trainer-unit-lbl bottom high-text">HIGH</span>
        </div>
      )}

      {/* Hardware LOW Reference Pin (GND) */}
      {isTrainerLow && (
        <div className="trainer-ref-unit low" title="Continuous 0V Logic LOW Output">
          <div className="trainer-jack-socket gnd" />
          <div className="trainer-terminal-stem" />
          <span className="trainer-unit-lbl bottom low-text">LOW</span>
        </div>
      )}

      {/* Hardware Generate Pulse Button */}
      {isTrainerPulse && (
        <button
          className={`trainer-pulse-btn ${state?.buttonPressed ? 'pressed' : ''}`}
          onMouseDown={(e) => {
            e.stopPropagation();
            onButtonPress?.(id, true);
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            onButtonPress?.(id, false);
          }}
          onMouseLeave={() => {
            if (state?.buttonPressed) {
              onButtonPress?.(id, false);
            }
          }}
          title="Manual clock pulse trigger"
        >
          <span className="pulse-icon">⚡</span>
          <span>GENERATE PULSE</span>
        </button>
      )}

      {/* Standard Interactive Controls (when not a specialized trainer board component) */}
      {!isTrainerSpecial && type === 'toggle' && (
        <div
          className={`switch-control ${state?.toggleState ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSwitch?.(id);
          }}
          title="Click to toggle switch"
        >
          <span className="switch-indicator-label label-on">1</span>
          <div className="switch-thumb" />
          <span className="switch-indicator-label label-off">0</span>
        </div>
      )}

      {type === 'junction' && (
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: inputs[0]?.value === '1' ? 'var(--signal-high)' : 'var(--signal-low)',
            boxShadow: inputs[0]?.value === '1' ? '0 0 8px var(--signal-high)' : 'none',
          }}
        />
      )}

      {!isTrainerSpecial && type === 'push_button' && (
        <button
          className={`button-control ${state?.buttonPressed ? 'pressed' : ''}`}
          onMouseDown={(e) => {
            e.stopPropagation();
            onButtonPress?.(id, true);
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            onButtonPress?.(id, false);
          }}
          onMouseLeave={() => {
            if (state?.buttonPressed) {
              onButtonPress?.(id, false);
            }
          }}
          title="Hold to pulse HIGH"
        >
          PUSH
        </button>
      )}

      {!isTrainerSpecial && type === 'clock' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '13px', lineHeight: 1 }}>⏱</span>
          <div
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: state?.toggleState ? 'var(--signal-high)' : 'var(--text-muted)',
              fontWeight: 'bold',
              marginTop: '2px',
            }}
          >
            {state?.toggleState ? 'HIGH' : 'LOW'}
          </div>
        </div>
      )}

      {!isTrainerSpecial && type === 'led' && (
        <div
          className={`led-indicator ${inputs[0]?.value === '1' ? 'on green' : ''}`}
        >
          <span className="led-digit-readout">{inputs[0]?.value || '0'}</span>
        </div>
      )}

      {!isTrainerSpecial && type === 'probe' && (
        <div className={`probe-readout val-${inputs[0]?.value?.toLowerCase() || '0'}`}>
          {inputs[0]?.value === '1' ? 'HIGH 5V' : inputs[0]?.value === '0' ? 'LOW 0V' : inputs[0]?.value === 'Z' ? 'HIGH-Z' : 'ERR'}
        </div>
      )}

      {/* Standalone Input Pin (0/1 Toggle) */}
      {type === 'input_pin' && (
        <div
          className="modular-pin-container input-pin"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSwitch?.(id);
          }}
          title="Click to toggle logic state (0/1)"
        >
          <div className={`modular-pin-badge ${state?.toggleState ? 'active' : ''}`}>
            {state?.toggleState ? '1' : '0'}
          </div>
          <span className="modular-pin-tag">IN</span>
        </div>
      )}

      {/* Standalone Output Pin (Logic Indicator) */}
      {type === 'output_pin' && (
        <div
          className="modular-pin-container output-pin"
          title={`Output Logic State: ${inputs[0]?.value || '0'}`}
        >
          <div className={`modular-pin-badge out ${inputs[0]?.value === '1' ? 'active' : ''}`}>
            {inputs[0]?.value || '0'}
          </div>
          <span className="modular-pin-tag">OUT</span>
        </div>
      )}

      {/* Modular Solderless Breadboard */}
      {type === 'breadboard' && (
        <div className="modular-breadboard-surface">
          <div className="bb-top-rails">
            <div className="bb-rail red"><span className="bb-rail-lbl">+</span></div>
            <div className="bb-rail blue"><span className="bb-rail-lbl">-</span></div>
          </div>
          <div className="bb-terminal-grid">
            <div className="bb-trough-divider" />
            <div className="bb-section-labels top">
              <span>A</span><span>B</span><span>C</span><span>D</span><span>E</span>
            </div>
            <div className="bb-section-labels bot">
              <span>F</span><span>G</span><span>H</span><span>I</span><span>J</span>
            </div>
          </div>
          <div className="bb-bot-rails">
            <div className="bb-rail red"><span className="bb-rail-lbl">+</span></div>
            <div className="bb-rail blue"><span className="bb-rail-lbl">-</span></div>
          </div>
          <div className="bb-brand-watermark">PROTOBOARD</div>
        </div>
      )}

      {type === 'seven_segment' && (
        <div className="seven-seg-box" style={{ width: '46px', height: '62px' }}>
          <svg className="seven-seg-svg" viewBox="0 0 50 80" style={{ width: '38px', height: '54px' }}>
            {/* Segment A */}
            <rect
              x="10"
              y="4"
              width="30"
              height="6"
              rx="2"
              className={inputs.find((p) => p.id === 'a')?.value === '1' ? 'seg-on' : 'seg-off'}
            />
            {/* Segment B */}
            <rect
              x="38"
              y="11"
              width="6"
              height="26"
              rx="2"
              className={inputs.find((p) => p.id === 'b')?.value === '1' ? 'seg-on' : 'seg-off'}
            />
            {/* Segment C */}
            <rect
              x="38"
              y="41"
              width="6"
              height="26"
              rx="2"
              className={inputs.find((p) => p.id === 'c')?.value === '1' ? 'seg-on' : 'seg-off'}
            />
            {/* Segment D */}
            <rect
              x="10"
              y="68"
              width="30"
              height="6"
              rx="2"
              className={inputs.find((p) => p.id === 'd')?.value === '1' ? 'seg-on' : 'seg-off'}
            />
            {/* Segment E */}
            <rect
              x="6"
              y="41"
              width="6"
              height="26"
              rx="2"
              className={inputs.find((p) => p.id === 'e')?.value === '1' ? 'seg-on' : 'seg-off'}
            />
            {/* Segment F */}
            <rect
              x="6"
              y="11"
              width="6"
              height="26"
              rx="2"
              className={inputs.find((p) => p.id === 'f')?.value === '1' ? 'seg-on' : 'seg-off'}
            />
            {/* Segment G */}
            <rect
              x="10"
              y="37"
              width="30"
              height="6"
              rx="2"
              className={inputs.find((p) => p.id === 'g')?.value === '1' ? 'seg-on' : 'seg-off'}
            />
            {/* Dot (DP) */}
            <circle
              cx="44"
              cy="72"
              r="3.5"
              className={inputs.find((p) => p.id === 'dp')?.value === '1' ? 'seg-on' : 'seg-off'}
            />
          </svg>
        </div>
      )}

      {type === 'hex_display' && (
        <div className="hex-display-container">
          <div className="hex-char-readout">{getHexChar()}</div>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            HEX
          </span>
        </div>
      )}

      {/* Inputs Pins */}
      {inputs.map((pin) => {
        let labelLeft = 'auto';
        let labelRight = 'auto';
        let labelTop = '-3px';

        if (pin.y === 0) {
          labelTop = '-15px';
          labelLeft = '-8px';
        } else if (pin.y === height) {
          labelTop = '13px';
          labelLeft = '-8px';
        } else if (pin.x === 0) {
          labelLeft = '14px';
        } else if (pin.x === width) {
          labelRight = '14px';
        }

        return (
          <div
            key={pin.id}
            className={`circuit-pin ${getPinClass(pin.value)} ${isTrainerSpecial ? 'trainer-pin' : ''}`}
            style={{
              left: `${pin.x}px`,
              top: `${pin.y}px`,
              border: pin.inverted ? '2px solid #ef4444' : undefined,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onPinMouseDown(pin, id, e);
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              onPinMouseUp(pin, id, e);
            }}
            title={`Input: ${pin.name} (${pin.value})`}
          >
            {!isTrainerSpecial && (
              <span
                className="circuit-pin-label"
                style={{
                  left: labelLeft,
                  right: labelRight,
                  top: labelTop,
                }}
              >
                {pin.name}
              </span>
            )}
          </div>
        );
      })}

      {/* Output Pins */}
      {outputs.map((pin) => {
        let labelLeft = 'auto';
        let labelRight = 'auto';
        let labelTop = '-3px';

        if (pin.y === 0) {
          labelTop = '-15px';
          labelLeft = '-8px';
        } else if (pin.y === height) {
          labelTop = '13px';
          labelLeft = '-8px';
        } else if (pin.x === width) {
          labelRight = '14px';
        } else if (pin.x === 0) {
          labelLeft = '14px';
        }

        return (
          <div
            key={pin.id}
            className={`circuit-pin ${getPinClass(pin.value)} ${isTrainerSpecial ? 'trainer-pin' : ''}`}
            style={{
              left: `${pin.x}px`,
              top: `${pin.y}px`,
              border: pin.inverted ? '2px solid #ef4444' : undefined,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onPinMouseDown(pin, id, e);
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              onPinMouseUp(pin, id, e);
            }}
            title={`Output: ${pin.name} (${pin.value})`}
          >
            {!isTrainerSpecial && (
              <span
                className="circuit-pin-label"
                style={{
                  left: labelLeft,
                  right: labelRight,
                  top: labelTop,
                }}
              >
                {pin.name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
