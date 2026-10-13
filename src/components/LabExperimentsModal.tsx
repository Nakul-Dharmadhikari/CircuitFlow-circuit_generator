import React, { useState, useMemo, useEffect } from 'react';
import { getLabExperiments, type LabExperiment } from '../presets/labExperiments';

interface LabExperimentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadExperiment: (exp: LabExperiment, startGuided?: boolean) => void;
}

export const LabExperimentsModal: React.FC<LabExperimentsModalProps> = ({
  isOpen,
  onClose,
  onLoadExperiment,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const experiments = useMemo(() => getLabExperiments(), []);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    experiments.forEach((exp) => set.add(exp.category));
    return ['All', ...Array.from(set)];
  }, [experiments]);

  // Filter experiments
  const filteredExperiments = useMemo(() => {
    return experiments.filter((exp) => {
      if (selectedCategory !== 'All' && exp.category !== selectedCategory) {
        return false;
      }
      if (selectedDifficulty !== 'All' && exp.difficulty !== selectedDifficulty) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = exp.title.toLowerCase().includes(query);
        const matchesDesc = exp.description.toLowerCase().includes(query);
        const matchesTheory = (exp.theory || '').toLowerCase().includes(query);
        const matchesCategory = exp.category.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesTheory && !matchesCategory) {
          return false;
        }
      }
      return true;
    });
  }, [experiments, selectedCategory, selectedDifficulty, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog lab-curriculum-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '960px', width: '92vw', maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-title-badge">CURRICULUM COURSEWARE</span>
            <div className="modal-title">🔬 Verified Digital Logic Laboratory Experiments</div>
          </div>
          <button className="panel-close-btn" onClick={onClose} title="Close (Esc)">
            ✕
          </button>
        </div>

        {/* Filter Bar */}
        <div className="lab-modal-filter-bar">
          {/* Search Input */}
          <div className="lab-search-wrapper">
            <input
              type="text"
              className="lab-search-input"
              placeholder="Search experiments by name, gate, or formula (e.g. adder, mux, k-map)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search Experiments"
            />
            {searchQuery && (
              <button
                type="button"
                className="lab-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Difficulty Dropdown */}
          <div className="lab-difficulty-selector">
            <label className="lab-filter-label">Difficulty:</label>
            <select
              className="lab-filter-select"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              aria-label="Filter by Difficulty"
            >
              <option value="All">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Category Pills Strip */}
        <div className="lab-category-pills" role="tablist" aria-label="Curriculum Categories">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat}
              className={`lab-category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              <span>{cat}</span>
              <span className="cat-count">
                {cat === 'All'
                  ? experiments.length
                  : experiments.filter((e) => e.category === cat).length}
              </span>
            </button>
          ))}
        </div>

        {/* Body Grid */}
        <div className="modal-body lab-experiments-grid">
          {filteredExperiments.length === 0 ? (
            <div className="lab-empty-search">
              <span className="empty-icon">🔍</span>
              <h4>No experiments match your search filter</h4>
              <p>Try resetting the category filter or searching for another keyword.</p>
              <button
                type="button"
                className="header-btn"
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedDifficulty('All');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredExperiments.map((exp) => {
              const diffColor =
                exp.difficulty === 'Beginner'
                  ? 'var(--signal-high)'
                  : exp.difficulty === 'Intermediate'
                  ? 'var(--accent-copper)'
                  : 'var(--signal-bus)';

              return (
                <div
                  key={exp.id}
                  className="experiment-card experiment-card-enhanced"
                  onClick={() => {
                    onLoadExperiment(exp, true);
                    onClose();
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Card Header */}
                  <div className="exp-card-header">
                    <div className="exp-meta-tags">
                      <span className="exp-category exp-category-pill">{exp.category}</span>
                      <span
                        className="exp-diff-tag"
                        style={{ color: diffColor, borderColor: diffColor }}
                      >
                        {exp.difficulty || 'Intermediate'}
                      </span>
                    </div>
                    <span className="exp-comp-badge">
                      {exp.circuit.components.length} components · {exp.circuit.wires.length} wires
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="exp-title exp-card-title">{exp.title}</h3>
                  <p className="exp-desc exp-card-desc">{exp.description}</p>

                  {/* Learning Objectives Preview */}
                  {exp.learningObjectives && exp.learningObjectives.length > 0 && (
                    <div className="exp-objectives-preview">
                      <div className="obj-label">🎯 Key Objectives:</div>
                      <ul>
                        {exp.learningObjectives.slice(0, 2).map((obj, i) => (
                          <li key={i}>{obj}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Theory Snippet */}
                  <div className="exp-theory exp-card-theory">
                    <span className="theory-tag">Theory:</span>
                    <code>{exp.theory}</code>
                  </div>

                  {/* Actions */}
                  <div className="exp-card-actions">
                    <button
                      type="button"
                      className="exp-btn-guided primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadExperiment(exp, true);
                        onClose();
                      }}
                      title="Open this lab with the interactive step-by-step assistant"
                    >
                      <span>🚀 Start Guided Lab</span>
                    </button>

                    <button
                      type="button"
                      className="exp-btn-schematic"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadExperiment(exp, false);
                        onClose();
                      }}
                      title="Load schematic directly onto canvas without the assistant"
                    >
                      <span>Load Schematic</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="modal-footer-hint">
            <span>💡 All experiments feature verified logic topology, green indicators, and analysis tools.</span>
          </div>
          <button type="button" className="header-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabExperimentsModal;
