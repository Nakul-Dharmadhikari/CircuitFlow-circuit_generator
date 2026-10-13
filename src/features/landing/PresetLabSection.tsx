import React from 'react';
import { getLabExperiments, type LabExperiment } from '../../presets/labExperiments';

interface PresetLabSectionProps {
  onLoadExperimentAndEnter: (exp: LabExperiment) => void;
}

export const PresetLabSection: React.FC<PresetLabSectionProps> = ({
  onLoadExperimentAndEnter,
}) => {
  const presets = getLabExperiments();

  return (
    <section className="landing-section" id="presets-section" aria-label="Laboratory Presets">
      <div className="section-header-center">
        <div className="section-eyebrow">Interactive Courseware</div>
        <h2 className="section-title">Verified Laboratory Experiments</h2>
        <p className="section-subtitle">
          Jumpstart your analysis with verified schematics including flip-flops, multiplexers, and synchronous counters.
        </p>
      </div>

      <div className="presets-grid-row">
        {presets.map((exp) => (
          <div key={exp.id} className="preset-card-light">
            <div>
              <div className="preset-header-row">
                <span className="preset-category-badge">{exp.category}</span>
                {exp.difficulty && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color:
                        exp.difficulty === 'Beginner'
                          ? '#10b981'
                          : exp.difficulty === 'Intermediate'
                          ? '#d97736'
                          : '#6366f1',
                      border: '1px solid currentColor',
                      borderRadius: '9999px',
                      padding: '1px 6px',
                    }}
                  >
                    {exp.difficulty}
                  </span>
                )}
                <span style={{ fontSize: '11px', color: 'var(--lp-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {exp.circuit.components.length} components
                </span>
              </div>
              <h3 className="preset-title-light">{exp.title}</h3>
              <p className="preset-desc-light">{exp.description}</p>
              {exp.theory && (
                <div style={{ fontSize: '11px', color: 'var(--lp-text-muted)', marginTop: '4px', marginBottom: '8px' }}>
                  <code style={{ fontFamily: 'var(--font-mono)', color: '#d97736' }}>{exp.theory}</code>
                </div>
              )}
            </div>

            <button
              type="button"
              className="landing-btn secondary"
              style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }}
              onClick={() => onLoadExperimentAndEnter(exp)}
            >
              <span>Load Schematic & Simulate →</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
