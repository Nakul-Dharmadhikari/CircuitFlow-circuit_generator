import React from 'react';
import { getLabExperiments, type LabExperiment } from '../presets/labExperiments';

interface LabExperimentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadExperiment: (exp: LabExperiment) => void;
}

export const LabExperimentsModal: React.FC<LabExperimentsModalProps> = ({
  isOpen,
  onClose,
  onLoadExperiment,
}) => {
  const experiments = getLabExperiments();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🔬 Pre-Built DELD Laboratory Experiments</div>
          <button className="panel-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Select a verified curriculum experiment below to instantly load its schematic, wire netlist,
            and component setup onto your workbench.
          </p>

          {experiments.map((exp) => (
            <div
              key={exp.id}
              className="experiment-card"
              onClick={() => {
                onLoadExperiment(exp);
                onClose();
              }}
            >
              <div className="exp-category">{exp.category}</div>
              <div className="exp-title">{exp.title}</div>
              <div className="exp-desc">{exp.description}</div>
              <div className="exp-theory">
                <strong>Formula / Theory:</strong> {exp.theory}
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="header-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
