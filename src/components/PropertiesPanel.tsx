import React from 'react';
import type { CircuitComponent } from '../types/circuit';
import { getComponentDisplayName } from '../engine/simulator';

interface PropertiesPanelProps {
  component: CircuitComponent | null;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateProps: (id: string, props: Record<string, any>) => void;
  onDeleteComponent: (id: string) => void;
  onClose: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  component,
  onUpdateLabel,
  onUpdateProps,
  onDeleteComponent,
  onClose,
}) => {
  if (!component) return null;

  const typeName = getComponentDisplayName(component.type);

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <span title={typeName}>
          ⚙️ {component.isCustomLabel && component.label ? `${component.label} (${typeName})` : typeName}
        </span>
        <button className="panel-close-btn" onClick={onClose} title="Close Properties Panel">
          ✕
        </button>
      </div>

      <div className="panel-body">
        {/* Component Readable Name Box */}
        <div className="property-row">
          <label className="property-label">Component</label>
          <div
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-canvas)',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              fontSize: '13px',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ color: 'var(--signal-high)' }}>●</span>
            {typeName}
          </div>
        </div>

        {/* Custom Label Input Field */}
        <div className="property-row">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label className="property-label">Component Label</label>
            {component.isCustomLabel && component.label ? (
              <span style={{ fontSize: '10px', color: 'var(--signal-high)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                ● Active on Component
              </span>
            ) : (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                (Unlabeled)
              </span>
            )}
          </div>
          <input
            type="text"
            className="property-input"
            value={component.isCustomLabel ? component.label : ''}
            placeholder="e.g. J-K-0, CLK, Out..."
            onChange={(e) => onUpdateLabel(component.id, e.target.value)}
          />
          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.3 }}>
            Type a label (e.g. <strong style={{ color: 'var(--text-primary)' }}>J-K-0</strong>) to display it on the canvas component in small text.
          </div>
        </div>

        {/* Clock Frequency selector */}
        {component.type === 'clock' && (
          <div className="property-row">
            <label className="property-label">Clock Frequency</label>
            <select
              className="select-input"
              value={component.customProps?.frequency || 1}
              onChange={(e) =>
                onUpdateProps(component.id, {
                  ...component.customProps,
                  frequency: Number(e.target.value),
                })
              }
            >
              <option value={0.5}>0.5 Hz (Slow)</option>
              <option value={1}>1 Hz (Standard)</option>
              <option value={2}>2 Hz</option>
              <option value={5}>5 Hz</option>
              <option value={10}>10 Hz (Fast)</option>
            </select>
          </div>
        )}

        {/* Live Pin States Readout */}
        <div className="property-row">
          <label className="property-label">Pin Readout</label>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              backgroundColor: 'var(--bg-canvas)',
              padding: '6px 8px',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
            }}
          >
            {component.inputs.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>IN: {p.name}</span>
                <span style={{ color: p.value === '1' ? 'var(--signal-high)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                  {p.value}
                </span>
              </div>
            ))}
            {component.outputs.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>OUT: {p.name}</span>
                <span style={{ color: p.value === '1' ? 'var(--signal-high)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                  {p.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          className="header-btn danger"
          style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
          onClick={() => onDeleteComponent(component.id)}
        >
          🗑️ Delete Component
        </button>
      </div>
    </div>
  );
};
