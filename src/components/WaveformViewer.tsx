import React, { useRef, useEffect } from 'react';
import type { Circuit, LogicValue } from '../types/circuit';

interface WaveformViewerProps {
  circuit: Circuit;
  history: { timestamp: number; values: Record<string, LogicValue> }[];
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
  circuit,
  history,
  isOpen,
  onToggle,
  onClear,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Channels to monitor: all clocks, toggles, buttons, leds, probes, and flip-flops
  const monitoredComps = circuit.components.filter((c) =>
    ['clock', 'toggle', 'push_button', 'led', 'probe', 'd_flipflop', 'jk_flipflop'].includes(c.type)
  );

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = '#090d12';
    ctx.fillRect(0, 0, width, height);

    // Channel parameters
    const channelHeight = 32;
    const headerWidth = 140;
    const traceWidth = width - headerWidth;
    const sampleStep = 12; // pixels per time step

    const totalSamples = Math.floor(traceWidth / sampleStep);
    const visibleHistory = history.slice(-totalSamples);

    monitoredComps.forEach((comp, idx) => {
      const yBase = idx * channelHeight;
      const yHigh = yBase + 6;
      const yLow = yBase + 24;

      // Channel background alternate striping
      ctx.fillStyle = idx % 2 === 0 ? '#0d131a' : '#090d12';
      ctx.fillRect(0, yBase, width, channelHeight);

      // Grid line
      ctx.strokeStyle = '#1a2432';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(headerWidth, yLow);
      ctx.lineTo(width, yLow);
      ctx.stroke();

      // Channel label sidebar
      ctx.fillStyle = '#161f2c';
      ctx.fillRect(0, yBase, headerWidth, channelHeight);
      ctx.strokeStyle = '#232f42';
      ctx.strokeRect(0, yBase, headerWidth, channelHeight);

      // Label text
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px JetBrains Mono, monospace';
      const labelText = `${comp.label.substring(0, 14)}`;
      ctx.fillText(labelText, 10, yBase + 20);

      // Trace color
      const isClock = comp.type === 'clock';
      ctx.strokeStyle = isClock ? '#06b6d4' : '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();

      let prevVal: LogicValue | null = null;

      visibleHistory.forEach((sample, sIdx) => {
        const x = headerWidth + sIdx * sampleStep;
        const val = sample.values[comp.id] || '0';
        const y = val === '1' ? yHigh : yLow;

        if (sIdx === 0) {
          ctx.moveTo(x, y);
        } else {
          // If value changed, draw sharp vertical transition edge
          if (prevVal !== val) {
            ctx.lineTo(x, prevVal === '1' ? yHigh : yLow);
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        prevVal = val;
      });

      ctx.stroke();
    });
  }, [circuit, history, isOpen, monitoredComps]);

  if (!isOpen) return null;

  return (
    <div className="waveform-drawer">
      <div className="waveform-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📊 TIMING DIAGRAM / LOGIC ANALYZER</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            ({monitoredComps.length} active channels)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="header-btn" onClick={onClear}>
            Clear Trace
          </button>
          <button className="header-btn" onClick={onToggle}>
            ✕ Close Analyzer
          </button>
        </div>
      </div>

      <div className="waveform-canvas-container">
        <canvas
          ref={canvasRef}
          className="waveform-canvas"
          width={1200}
          height={Math.max(monitoredComps.length * 32, 140)}
        />
      </div>
    </div>
  );
};
