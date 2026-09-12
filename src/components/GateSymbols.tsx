import React from 'react';
import type { ComponentType } from '../types/circuit';

interface GateSymbolProps {
  type: ComponentType;
  width: number;
  height: number;
  selected?: boolean;
}

export const GateSymbol: React.FC<GateSymbolProps> = ({ type, width, height }) => {
  const strokeColor = 'var(--gate-stroke)';
  const strokeWidth = 2;
  const fillColor = 'var(--bg-subtle)';
  const accentColor = 'var(--border-focus)';
  const textMuted = 'var(--text-muted)';
  const textPrimary = 'var(--text-primary)';

  switch (type) {
    // -------------------------------------------------------------------------
    // BASIC & EXTENDED LOGIC GATES
    // -------------------------------------------------------------------------
    case 'not':
      return (
        <svg width={width} height={height} viewBox="0 0 75 40">
          <polygon points="12,6 54,20 12,34" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <circle cx="60" cy="20" r="4.5" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );

    case 'buffer':
      return (
        <svg width={width} height={height} viewBox="0 0 70 40">
          <polygon points="12,6 58,20 12,34" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );

    case 'and':
      return (
        <svg width={width} height={height} viewBox="0 0 80 50">
          <path
            d="M 16,6 L 45,6 A 19,19 0 0,1 45,44 L 16,44 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        </svg>
      );

    case 'and_3':
      return (
        <svg width={width} height={height} viewBox="0 0 85 55">
          <path
            d="M 16,6 L 48,6 A 21,21 0 0,1 48,48 L 16,48 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <text x="35" y="32" fill={textMuted} fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            3-IN
          </text>
        </svg>
      );

    case 'nand':
      return (
        <svg width={width} height={height} viewBox="0 0 85 50">
          <path
            d="M 14,6 L 44,6 A 19,19 0 0,1 44,44 L 14,44 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <circle cx="69" cy="25" r="4.5" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );

    case 'nand_3':
      return (
        <svg width={width} height={height} viewBox="0 0 90 55">
          <path
            d="M 14,6 L 46,6 A 21,21 0 0,1 46,48 L 14,48 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <circle cx="73" cy="27" r="4.5" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <text x="33" y="32" fill={textMuted} fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            3-IN
          </text>
        </svg>
      );

    case 'or':
      return (
        <svg width={width} height={height} viewBox="0 0 80 50">
          <path
            d="M 14,6 Q 28,25 14,44 Q 45,44 65,25 Q 45,6 14,6 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        </svg>
      );

    case 'or_3':
      return (
        <svg width={width} height={height} viewBox="0 0 85 55">
          <path
            d="M 14,6 Q 28,27 14,48 Q 48,48 70,27 Q 48,6 14,6 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <text x="36" y="32" fill={textMuted} fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            3-IN
          </text>
        </svg>
      );

    case 'nor':
      return (
        <svg width={width} height={height} viewBox="0 0 85 50">
          <path
            d="M 12,6 Q 26,25 12,44 Q 43,44 62,25 Q 43,6 12,6 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <circle cx="68" cy="25" r="4.5" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );

    case 'nor_3':
      return (
        <svg width={width} height={height} viewBox="0 0 90 55">
          <path
            d="M 12,6 Q 26,27 12,48 Q 44,48 66,27 Q 44,6 12,6 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <circle cx="73" cy="27" r="4.5" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <text x="34" y="32" fill={textMuted} fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            3-IN
          </text>
        </svg>
      );

    case 'xor':
      return (
        <svg width={width} height={height} viewBox="0 0 85 50">
          <path d="M 10,6 Q 24,25 10,44" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
          <path
            d="M 17,6 Q 31,25 17,44 Q 48,44 68,25 Q 48,6 17,6 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        </svg>
      );

    case 'xnor':
      return (
        <svg width={width} height={height} viewBox="0 0 90 50">
          <path d="M 9,6 Q 23,25 9,44" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
          <path
            d="M 16,6 Q 30,25 16,44 Q 47,44 66,25 Q 47,6 16,6 Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <circle cx="72" cy="25" r="4.5" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );

    case 'tri_state':
      return (
        <svg width={width} height={height} viewBox="0 0 80 50">
          <polygon points="14,10 60,25 14,40" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <line x1="37" y1="46" x2="37" y2="28" stroke={strokeColor} strokeWidth={strokeWidth} />
          <circle cx="37" cy="46" r="2.5" fill={strokeColor} />
        </svg>
      );

    // -------------------------------------------------------------------------
    // INPUTS & CONTROLS
    // -------------------------------------------------------------------------
    case 'toggle':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          {/* Terminals */}
          <line x1="8" y1="22" x2="22" y2="22" stroke={strokeColor} strokeWidth={strokeWidth} />
          <line x1="58" y1="22" x2="72" y2="22" stroke={strokeColor} strokeWidth={strokeWidth} />
          <circle cx="22" cy="22" r="3.5" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <circle cx="58" cy="22" r="3.5" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Switch blade tilted open */}
          <line x1="24" y1="20" x2="54" y2="9" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="54" cy="9" r="3" fill={accentColor} />
          <text x="38" y="36" fill={textMuted} fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">
            SPST
          </text>
        </svg>
      );

    case 'push_button':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <line x1="10" y1="26" x2="26" y2="26" stroke={strokeColor} strokeWidth={strokeWidth} />
          <line x1="54" y1="26" x2="70" y2="26" stroke={strokeColor} strokeWidth={strokeWidth} />
          <circle cx="26" cy="26" r="3" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <circle cx="54" cy="26" r="3" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Button contact bar and actuator plunger */}
          <line x1="22" y1="18" x2="58" y2="18" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="40" y1="18" x2="40" y2="8" stroke={strokeColor} strokeWidth="2.5" />
          <rect x="30" y="6" width="20" height="4" rx="2" fill={accentColor} />
          <text x="40" y="38" fill={textMuted} fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
            PULSE
          </text>
        </svg>
      );

    case 'clock':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="12" y="6" width="56" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Square wave pulse icon */}
          <path
            d="M 20,27 L 29,27 L 29,15 L 40,15 L 40,27 L 51,27 L 51,15 L 60,15"
            fill="none"
            stroke={accentColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="miter"
          />
          <text x="40" y="34" fill={textMuted} fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            CLK
          </text>
        </svg>
      );

    case 'vcc':
      return (
        <svg width={width} height={height} viewBox="0 0 70 44">
          {/* Upward Power Rail */}
          <line x1="35" y1="36" x2="35" y2="16" stroke={strokeColor} strokeWidth={strokeWidth} />
          <line x1="18" y1="16" x2="52" y2="16" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
          <polygon points="35,8 27,16 43,16" fill="#ef4444" />
          <text x="35" y="32" fill="#ef4444" fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            +5V
          </text>
        </svg>
      );

    case 'gnd':
      return (
        <svg width={width} height={height} viewBox="0 0 70 44">
          {/* Ground Rake */}
          <line x1="35" y1="6" x2="35" y2="20" stroke={strokeColor} strokeWidth={strokeWidth} />
          <line x1="16" y1="20" x2="54" y2="20" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="22" y1="26" x2="48" y2="26" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" />
          <line x1="29" y1="32" x2="41" y2="32" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
          <text x="35" y="42" fill={textMuted} fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
            0V
          </text>
        </svg>
      );

    case 'probe':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          {/* Probe Body & Needle */}
          <line x1="8" y1="22" x2="24" y2="22" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="8" cy="22" r="2.5" fill="#38bdf8" />
          <rect x="24" y="11" width="48" height="22" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <rect x="28" y="14" width="22" height="16" rx="2" fill="var(--bg-active)" />
          <text x="39" y="26" fill="#38bdf8" fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            5V
          </text>
          <text x="60" y="25" fill={textMuted} fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
            VM
          </text>
        </svg>
      );

    case 'junction':
      return (
        <svg width={width} height={height} viewBox="0 0 50 40">
          <line x1="8" y1="20" x2="42" y2="20" stroke={strokeColor} strokeWidth={strokeWidth} />
          <line x1="25" y1="6" x2="25" y2="34" stroke={strokeColor} strokeWidth={strokeWidth} />
          <circle cx="25" cy="20" r="5" fill="#10b981" stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );

    // -------------------------------------------------------------------------
    // COMBINATIONAL MSI
    // -------------------------------------------------------------------------
    case 'half_adder':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="14" y="6" width="52" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <text x="40" y="20" fill={textPrimary} fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            HA
          </text>
          <text x="40" y="32" fill={accentColor} fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
            Σ / Co
          </text>
        </svg>
      );

    case 'full_adder':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="12" y="6" width="56" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <text x="40" y="19" fill={textPrimary} fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            FA
          </text>
          <text x="40" y="31" fill={accentColor} fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
            Σ / Cout
          </text>
        </svg>
      );

    case 'mux_2to1':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          {/* Classic Multiplexer Trapezoid */}
          <polygon
            points="18,6 60,13 60,31 18,38"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <text x="37" y="24" fill={accentColor} fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            2:1
          </text>
          <text x="37" y="33" fill={textMuted} fontSize="7" fontFamily="var(--font-mono)" textAnchor="middle">
            MUX
          </text>
        </svg>
      );

    case 'mux_4to1':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <polygon
            points="16,5 64,12 64,32 16,39"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <text x="38" y="22" fill={accentColor} fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            4:1
          </text>
          <text x="38" y="32" fill={textMuted} fontSize="7" fontFamily="var(--font-mono)" textAnchor="middle">
            MUX
          </text>
        </svg>
      );

    case 'demux_1to2':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          {/* Inverted Expanding Trapezoid */}
          <polygon
            points="20,13 62,6 62,38 20,31"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <text x="43" y="23" fill={accentColor} fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            1:2
          </text>
          <text x="43" y="32" fill={textMuted} fontSize="6.5" fontFamily="var(--font-mono)" textAnchor="middle">
            DEMUX
          </text>
        </svg>
      );

    case 'demux_1to4':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <polygon
            points="18,12 64,5 64,39 18,32"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          <text x="43" y="22" fill={accentColor} fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            1:4
          </text>
          <text x="43" y="32" fill={textMuted} fontSize="6.5" fontFamily="var(--font-mono)" textAnchor="middle">
            DEMUX
          </text>
        </svg>
      );

    case 'decoder_2to4':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="14" y="6" width="52" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <text x="40" y="20" fill={textPrimary} fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            2:4
          </text>
          <text x="40" y="32" fill={accentColor} fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
            DECODER
          </text>
        </svg>
      );

    case 'comparator_4bit':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="12" y="6" width="56" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <text x="40" y="19" fill={textPrimary} fontSize="9.5" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            COMP
          </text>
          <text x="40" y="31" fill={accentColor} fontSize="8.5" fontFamily="var(--font-mono)" textAnchor="middle">
            A ⋚ B
          </text>
        </svg>
      );

    case 'priority_encoder_4to2':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="12" y="6" width="56" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <text x="40" y="19" fill={textPrimary} fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            PRI-ENC
          </text>
          <text x="40" y="31" fill={accentColor} fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
            4:2 + V
          </text>
        </svg>
      );

    case 'parity_gen':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="12" y="6" width="56" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <text x="40" y="19" fill={textPrimary} fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            PARITY
          </text>
          <text x="40" y="31" fill={accentColor} fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
            EVEN/ODD
          </text>
        </svg>
      );

    // -------------------------------------------------------------------------
    // SEQUENTIAL ICs
    // -------------------------------------------------------------------------
    case 'sr_latch':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="14" y="6" width="52" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <text x="40" y="20" fill={textPrimary} fontSize="9.5" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            SR
          </text>
          <text x="40" y="32" fill={accentColor} fontSize="7.5" fontFamily="var(--font-mono)" textAnchor="middle">
            LATCH
          </text>
        </svg>
      );

    case 'd_latch':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="14" y="6" width="52" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <text x="40" y="19" fill={textPrimary} fontSize="9.5" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            D-LATCH
          </text>
          <text x="40" y="31" fill={accentColor} fontSize="7.5" fontFamily="var(--font-mono)" textAnchor="middle">
            EN LATCH
          </text>
        </svg>
      );

    case 'd_flipflop':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="14" y="6" width="52" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Clock dynamic triangle on left */}
          <path d="M 14,24 L 21,27 L 14,30" fill="none" stroke={strokeColor} strokeWidth="1.8" />
          <text x="42" y="19" fill={textPrimary} fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            D-FF
          </text>
          <text x="42" y="31" fill={accentColor} fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
            7474
          </text>
        </svg>
      );

    case 'jk_flipflop':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="14" y="6" width="52" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <path d="M 14,19 L 21,22 L 14,25" fill="none" stroke={strokeColor} strokeWidth="1.8" />
          <text x="42" y="19" fill={textPrimary} fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            JK-FF
          </text>
          <text x="42" y="31" fill={accentColor} fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
            7476
          </text>
        </svg>
      );

    case 't_flipflop':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="14" y="6" width="52" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <path d="M 14,24 L 21,27 L 14,30" fill="none" stroke={strokeColor} strokeWidth="1.8" />
          <text x="42" y="19" fill={textPrimary} fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            T-FF
          </text>
          <text x="42" y="31" fill={accentColor} fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
            TOGGLE
          </text>
        </svg>
      );

    case 'counter_4bit':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="12" y="6" width="56" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <path d="M 12,18 L 18,21 L 12,24" fill="none" stroke={strokeColor} strokeWidth="1.6" />
          <text x="40" y="18" fill={textPrimary} fontSize="8.5" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            CTR16
          </text>
          <text x="40" y="30" fill={accentColor} fontSize="7.5" fontFamily="var(--font-mono)" textAnchor="middle">
            Q0 - Q3
          </text>
        </svg>
      );

    case 'shift_reg_4bit':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          <rect x="12" y="6" width="56" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <path d="M 12,18 L 18,21 L 12,24" fill="none" stroke={strokeColor} strokeWidth="1.6" />
          <text x="40" y="18" fill={textPrimary} fontSize="8.5" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            SRG4
          </text>
          <text x="40" y="30" fill={accentColor} fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle">
            →→→
          </text>
        </svg>
      );

    // -------------------------------------------------------------------------
    // DISPLAYS & INDICATORS
    // -------------------------------------------------------------------------
    case 'led':
      return (
        <svg width={width} height={height} viewBox="0 0 70 44">
          {/* Diode triangle + bar */}
          <line x1="12" y1="22" x2="26" y2="22" stroke={strokeColor} strokeWidth={strokeWidth} />
          <polygon points="26,13 26,31 42,22" fill="#10b981" stroke={strokeColor} strokeWidth="1.5" />
          <line x1="42" y1="13" x2="42" y2="31" stroke={strokeColor} strokeWidth={strokeWidth} />
          <line x1="42" y1="22" x2="56" y2="22" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Light emission arrows */}
          <path d="M 37,11 L 45,5 M 42,5 L 45,5 L 45,8" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 43,15 L 51,9 M 48,9 L 51,9 L 51,12" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'rgb_led':
      return (
        <svg width={width} height={height} viewBox="0 0 70 44">
          <circle cx="35" cy="22" r="14" fill="#0f172a" stroke={strokeColor} strokeWidth="2" />
          <circle cx="28" cy="18" r="4" fill="#ef4444" opacity="0.9" />
          <circle cx="42" cy="18" r="4" fill="#10b981" opacity="0.9" />
          <circle cx="35" cy="28" r="4" fill="#3b82f6" opacity="0.9" />
        </svg>
      );

    case 'led_bar_4':
      return (
        <svg width={width} height={height} viewBox="0 0 70 44">
          <rect x="10" y="8" width="50" height="28" rx="3" fill="#0f172a" stroke={strokeColor} strokeWidth="1.5" />
          <rect x="15" y="13" width="8" height="18" rx="1.5" fill="#10b981" />
          <rect x="26" y="13" width="8" height="18" rx="1.5" fill="#10b981" />
          <rect x="37" y="13" width="8" height="18" rx="1.5" fill="#10b981" />
          <rect x="48" y="13" width="8" height="18" rx="1.5" fill="#10b981" />
        </svg>
      );

    case 'seven_segment':
      return (
        <svg width={width} height={height} viewBox="0 0 60 44">
          <rect x="14" y="5" width="32" height="34" rx="3" fill="var(--bg-active)" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* 7-Segment digit outline */}
          {/* a */}
          <line x1="22" y1="9" x2="38" y2="9" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
          {/* b */}
          <line x1="39" y1="11" x2="39" y2="20" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
          {/* c */}
          <line x1="39" y1="23" x2="39" y2="32" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
          {/* d */}
          <line x1="22" y1="34" x2="38" y2="34" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
          {/* e */}
          <line x1="21" y1="23" x2="21" y2="32" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
          {/* f */}
          <line x1="21" y1="11" x2="21" y2="20" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
          {/* g */}
          <line x1="22" y1="21" x2="38" y2="21" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
          {/* DP */}
          <circle cx="42" cy="34" r="1.5" fill="#ef4444" />
        </svg>
      );

    case 'hex_display':
      return (
        <svg width={width} height={height} viewBox="0 0 60 44">
          <rect x="12" y="5" width="36" height="34" rx="4" fill="var(--bg-active)" stroke={strokeColor} strokeWidth={strokeWidth} />
          <text x="30" y="27" fill="#38bdf8" fontSize="16" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            F
          </text>
          <text x="30" y="36" fill={textMuted} fontSize="6" fontFamily="var(--font-mono)" textAnchor="middle">
            HEX
          </text>
        </svg>
      );

    case 'buzzer':
      return (
        <svg width={width} height={height} viewBox="0 0 70 44">
          {/* Acoustic Speaker / Piezo Buzzer */}
          <rect x="18" y="14" width="14" height="16" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          <polygon points="32,18 46,10 46,34 32,26" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* Acoustic sound wave arcs */}
          <path d="M 50,15 A 7,7 0 0,1 50,29" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 55,11 A 13,13 0 0,1 55,33" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'input_pin':
      return (
        <svg width={width} height={height} viewBox="0 0 70 40">
          {/* Signal source terminal / Logic Pin */}
          <rect x="8" y="10" width="38" height="20" rx="4" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="46" y1="20" x2="62" y2="20" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="62" cy="20" r="3" fill="#38bdf8" />
          <text x="27" y="24" fill="#ffffff" fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            IN
          </text>
        </svg>
      );

    case 'output_pin':
      return (
        <svg width={width} height={height} viewBox="0 0 70 40">
          {/* Signal probe/output terminal */}
          <line x1="8" y1="20" x2="24" y2="20" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="8" cy="20" r="3" fill="#10b981" />
          <rect x="24" y="10" width="38" height="20" rx="4" fill="#047857" stroke="#10b981" strokeWidth="1.5" />
          <text x="43" y="24" fill="#ffffff" fontSize="10" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="bold">
            OUT
          </text>
        </svg>
      );

    case 'breadboard':
    case 'breadboard_half':
    case 'breadboard_mini':
      return (
        <svg width={width} height={height} viewBox="0 0 80 44">
          {/* Solderless Breadboard */}
          <rect x="6" y="4" width="68" height="36" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          {/* Red/Blue Power Rails */}
          <line x1="12" y1="8" x2="68" y2="8" stroke="#ef4444" strokeWidth="1.5" />
          <line x1="12" y1="36" x2="68" y2="36" stroke="#3b82f6" strokeWidth="1.5" />
          {/* Center Dividing Ravine */}
          <line x1="10" y1="22" x2="70" y2="22" stroke="#0f172a" strokeWidth="3" />
          {/* Tie Points Matrix */}
          <circle cx="20" cy="14" r="1.2" fill="#64748b" />
          <circle cx="30" cy="14" r="1.2" fill="#64748b" />
          <circle cx="40" cy="14" r="1.2" fill="#64748b" />
          <circle cx="50" cy="14" r="1.2" fill="#64748b" />
          <circle cx="60" cy="14" r="1.2" fill="#64748b" />

          <circle cx="20" cy="18" r="1.2" fill="#64748b" />
          <circle cx="30" cy="18" r="1.2" fill="#64748b" />
          <circle cx="40" cy="18" r="1.2" fill="#64748b" />
          <circle cx="50" cy="18" r="1.2" fill="#64748b" />
          <circle cx="60" cy="18" r="1.2" fill="#64748b" />

          <circle cx="20" cy="26" r="1.2" fill="#64748b" />
          <circle cx="30" cy="26" r="1.2" fill="#64748b" />
          <circle cx="40" cy="26" r="1.2" fill="#64748b" />
          <circle cx="50" cy="26" r="1.2" fill="#64748b" />
          <circle cx="60" cy="26" r="1.2" fill="#64748b" />

          <circle cx="20" cy="30" r="1.2" fill="#64748b" />
          <circle cx="30" cy="30" r="1.2" fill="#64748b" />
          <circle cx="40" cy="30" r="1.2" fill="#64748b" />
          <circle cx="50" cy="30" r="1.2" fill="#64748b" />
          <circle cx="60" cy="30" r="1.2" fill="#64748b" />
        </svg>
      );

    // -------------------------------------------------------------------------
    // 74-SERIES DIP INTEGRATED CIRCUITS & CUSTOM ICS
    // -------------------------------------------------------------------------
    case 'ic_7408':
    case 'ic_7432':
    case 'ic_7404':
    case 'ic_7400':
    case 'ic_7402':
    case 'ic_7486':
    case 'ic_74151':
    case 'ic_74153':
    case 'ic_74138':
    case 'ic_74139':
    case 'ic_7490':
    case 'ic_7493':
    case 'ic_7483':
    case 'ic_7485':
    case 'ic_7474':
    case 'ic_7476':
    case 'ic_74194':
    case 'ic_7447':
    case 'ic_555':
    case 'custom_ic': {
      const labelMap: Record<string, string> = {
        ic_7408: '7408',
        ic_7432: '7432',
        ic_7404: '7404',
        ic_7400: '7400',
        ic_7402: '7402',
        ic_7486: '7486',
        ic_74151: '74151',
        ic_74153: '74153',
        ic_74138: '74138',
        ic_74139: '74139',
        ic_7490: '7490',
        ic_7493: '7493',
        ic_7483: '7483',
        ic_7485: '7485',
        ic_7474: '7474',
        ic_7476: '7476',
        ic_74194: '74194',
        ic_7447: '7447',
        ic_555: 'NE555',
        custom_ic: 'CUSTOM',
      };
      const text = labelMap[type] || 'DIP-IC';
      return (
        <svg width={width} height={height} viewBox="0 0 60 36">
          {/* DIP Package Pin Legs (Top & Bottom) */}
          <line x1="12" y1="2" x2="12" y2="7" stroke="#94a3b8" strokeWidth="2" />
          <line x1="20" y1="2" x2="20" y2="7" stroke="#94a3b8" strokeWidth="2" />
          <line x1="28" y1="2" x2="28" y2="7" stroke="#94a3b8" strokeWidth="2" />
          <line x1="36" y1="2" x2="36" y2="7" stroke="#94a3b8" strokeWidth="2" />
          <line x1="44" y1="2" x2="44" y2="7" stroke="#94a3b8" strokeWidth="2" />

          <line x1="12" y1="29" x2="12" y2="34" stroke="#94a3b8" strokeWidth="2" />
          <line x1="20" y1="29" x2="20" y2="34" stroke="#94a3b8" strokeWidth="2" />
          <line x1="28" y1="29" x2="28" y2="34" stroke="#94a3b8" strokeWidth="2" />
          <line x1="36" y1="29" x2="36" y2="34" stroke="#94a3b8" strokeWidth="2" />
          <line x1="44" y1="29" x2="44" y2="34" stroke="#94a3b8" strokeWidth="2" />

          {/* DIP Epoxy Body */}
          <rect x="6" y="6" width="48" height="24" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />

          {/* Orientation Notch on left edge */}
          <path d="M 6,15 A 3,3 0 0,1 6,21 Z" fill="#0f172a" />

          {/* Pin 1 Index Dot */}
          <circle cx="10" cy="11" r="1.2" fill="#10b981" />

          {/* Chip Part Number */}
          <text
            x="31"
            y="21"
            fill="#f8fafc"
            fontSize={text.length > 5 ? '7.5' : '8.5'}
            fontFamily="var(--font-mono)"
            fontWeight="bold"
            letterSpacing="0.5"
            textAnchor="middle"
          >
            {text}
          </text>
        </svg>
      );
    }

    default:
      return null;
  }
};

export default GateSymbol;
