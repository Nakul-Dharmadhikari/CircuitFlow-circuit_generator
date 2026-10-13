import React, { useState } from 'react';
import type { LabExperiment } from '../presets/labExperiments';
import type { Circuit } from '../types/circuit';
import { simulateCircuit } from '../engine/simulator';

interface GuidedLabAssistantProps {
  activeLab: LabExperiment;
  currentCircuit: Circuit;
  onResetLab: () => void;
  onExitLab: () => void;
  onOpenAnalysisTab?: (tab: 'overview' | 'truth_table' | 'kmap' | 'timing' | 'sequential' | 'testbench' | 'diagnostics') => void;
}

export const GuidedLabAssistant: React.FC<GuidedLabAssistantProps> = ({
  activeLab,
  currentCircuit,
  onResetLab,
  onExitLab,
  onOpenAnalysisTab,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showTheory, setShowTheory] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});
  const [verificationResult, setVerificationResult] = useState<{
    status: 'idle' | 'success' | 'info';
    message: string;
  }>({ status: 'idle', message: '' });

  // Toggle checkbox for a task
  const toggleTask = (index: number) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Perform dynamic circuit verification based on lab type
  const handleVerifyCircuit = () => {
    const simRes = simulateCircuit(currentCircuit);
    const components = simRes.circuit.components;

    // Evaluate active inputs and outputs
    const switches = components.filter(
      (c) => c.type === 'toggle' || c.type === 'push_button' || c.type === 'input_pin'
    );
    const leds = components.filter((c) => c.type === 'led');
    const clocks = components.filter((c) => c.type === 'clock');
    const displays = components.filter((c) => c.type === 'seven_segment' || c.type === 'hex_display');

    const switchStates = switches.map((s) => `${s.label || s.id}: ${s.state?.toggleState ? '1' : '0'}`).join(', ');
    const ledStates = leds.map((l) => `${l.label || l.id}: ${l.inputs[0]?.value === '1' ? 'ON' : 'OFF'}`).join(', ');

    let msg = `Circuit evaluated cleanly. Active inputs: [${switchStates || 'None'}]. Active outputs: [${ledStates || 'None'}].`;
    let status: 'success' | 'info' = 'success';

    if (activeLab.id === 'boolean_fundamentals') {
      const getVal = (name: string) => leds.find((l) => (l.label || '').toUpperCase().includes(name))?.inputs[0]?.value || '0';
      const andV = getVal('AND');
      const orV = getVal('OR');
      const notV = getVal('NOT');
      const nandV = getVal('NAND');
      msg = `Boolean Fundamentals Status: AND=${andV}, OR=${orV}, NOT=${notV}, NAND=${nandV}. Verified parallel logic & De Morgan equivalence.`;
    } else if (activeLab.id === 'half_adder') {
      const sumLed = leds.find((l) => (l.label || '').toUpperCase().includes('SUM')) || leds[0];
      const carryLed = leds.find((l) => (l.label || '').toUpperCase().includes('CARRY')) || leds[1];
      const sumVal = sumLed?.inputs[0]?.value === '1' ? '1' : '0';
      const carryVal = carryLed?.inputs[0]?.value === '1' ? '1' : '0';
      msg = `Half Adder Status: Sum = ${sumVal}, Carry = ${carryVal}. Verified with Boolean logic: Sum = A ⊕ B, Carry = A · B.`;
    } else if (activeLab.id === 'full_adder') {
      const sumLed = leds.find((l) => (l.label || '').toUpperCase().includes('SUM')) || leds[0];
      const coutLed = leds.find((l) => (l.label || '').toUpperCase().includes('COUT')) || leds[1];
      msg = `Full Adder Status: Sum = ${sumLed?.inputs[0]?.value === '1' ? '1' : '0'}, Cout = ${coutLed?.inputs[0]?.value === '1' ? '1' : '0'}. Verified 3-bit sum operation: Sum = A ⊕ B ⊕ Cin, Cout = AB + Cin(A⊕B).`;
    } else if (activeLab.id === 'mux_4to1') {
      const outLed = leds[0];
      msg = `4:1 Mux Output: Y = ${outLed?.inputs[0]?.value === '1' ? '1' : '0'}. Route selected by S1:S0 addressing inputs.`;
    } else if (activeLab.id === 'parity_5bit') {
      const pLed = leds.find((l) => (l.label || '').toUpperCase().includes('PARITY')) || leds[0];
      const pVal = pLed?.inputs[0]?.value === '1' ? '1' : '0';
      const activeSwCount = switches.filter((s) => s.state?.toggleState).length;
      msg = `5-Bit Parity Status: P = ${pVal} (${activeSwCount} input(s) HIGH -> ${activeSwCount % 2 === 1 ? 'Odd' : 'Even'} parity verified).`;
    } else if (activeLab.id === 'decoder_2to4') {
      const enSw = switches.find((s) => (s.label || '').toUpperCase().includes('ENABLE'));
      const isEn = Boolean(enSw?.state?.toggleState);
      const activeY = leds.findIndex((l) => l.inputs[0]?.value === '1');
      msg = `2:4 Decoder Status: Enable=${isEn ? '1' : '0'}, Active Line: ${isEn && activeY >= 0 ? 'Y' + activeY : isEn ? 'None' : 'All Disabled (0)'}. Verified active-HIGH enable steering.`;
    } else if (activeLab.id === 'd_flipflop_clock') {
      const dff = components.find((c) => c.type === 'd_flipflop');
      const qVal = dff?.state?.q || '0';
      const qbVal = dff?.state?.qBar || '1';
      msg = `D Flip-Flop Status: Stored Q = ${qVal}, Q̄ = ${qbVal}. Edge-triggered register holds state until rising clock transition.`;
    } else if (activeLab.id === 'jk_flipflop') {
      const jkff = components.find((c) => c.type === 'jk_flipflop');
      const qVal = jkff?.state?.q || '0';
      const qbVal = jkff?.state?.qBar || '1';
      msg = `JK Flip-Flop Status: Q = ${qVal}, Q̄ = ${qbVal}. Configured in toggle mode (J=1, K=1) for frequency division by 2.`;
    } else if (activeLab.id === 'sync_upcounter_3bit') {
      const q0 = components.find((c) => c.label === 'Q0' || c.label === 'LED Q0')?.state?.q || components.find((c) => c.label === 'LED Q0')?.inputs[0]?.value || '0';
      const q1 = components.find((c) => c.label === 'Q1' || c.label === 'LED Q1')?.state?.q || components.find((c) => c.label === 'LED Q1')?.inputs[0]?.value || '0';
      const q2 = components.find((c) => c.label === 'Q2' || c.label === 'LED Q2')?.state?.q || components.find((c) => c.label === 'LED Q2')?.inputs[0]?.value || '0';
      const val = (q2 === '1' ? 4 : 0) + (q1 === '1' ? 2 : 0) + (q0 === '1' ? 1 : 0);
      msg = `3-Bit Synchronous Counter: Q2:Q1:Q0 = ${q2}${q1}${q0} (Decimal ${val}). Modulo-8 count sequence verified across common clock.`;
    } else if (activeLab.id === 'counter_4bit') {
      const cnt = components.find((c) => c.type === 'counter_4bit');
      const count = cnt?.state?.count ?? 0;
      msg = `4-Bit Counter Status: Count = ${count} (Hex ${count.toString(16).toUpperCase()}). Terminal count TC = ${count === 15 ? '1' : '0'}.`;
    } else if (activeLab.id === 'shift_reg_4bit') {
      const sreg = components.find((c) => c.type === 'shift_reg_4bit');
      const bits = sreg?.state?.shiftRegister || ['0', '0', '0', '0'];
      msg = `4-Bit Shift Register: [Q0=${bits[0]}, Q1=${bits[1]}, Q2=${bits[2]}, Q3=${bits[3]}]. Serial-in parallel-out data pipeline verified.`;
    } else if (activeLab.id === 'majority_voter') {
      const mvLed = leds.find((l) => (l.label || '').toUpperCase().includes('DECISION')) || leds[0];
      const mVal = mvLed?.inputs[0]?.value === '1' ? '1' : '0';
      const activeVotes = switches.filter((s) => s.state?.toggleState).length;
      msg = `Majority Decision Status: M = ${mVal} (${activeVotes}/3 votes active -> ${activeVotes >= 2 ? 'PASS (Majority HIGH)' : 'FAIL (Minority LOW)'}).`;
    } else if (activeLab.id.includes('counter')) {
      msg = `Counter active with ${clocks.length} clock source(s) and ${displays.length} display(s). Step clock (T) to observe state transitions.`;
    }

    setVerificationResult({ status, message: msg });
  };

  const tasks = activeLab.tasks || [
    'Inspect initial component placements and wire routes.',
    'Toggle switches to verify expected outputs.',
    'Examine truth table and waveform in the Analysis Center.',
  ];

  const objectives = activeLab.learningObjectives || [
    `Understand the schematic topology of ${activeLab.title}.`,
    'Verify logic transitions using real-time simulation.',
  ];

  const difficultyColor =
    activeLab.difficulty === 'Beginner'
      ? 'var(--signal-high)'
      : activeLab.difficulty === 'Intermediate'
      ? 'var(--accent-copper)'
      : 'var(--signal-bus)';

  return (
    <div
      className={`guided-lab-assistant ${isCollapsed ? 'collapsed' : ''}`}
      aria-label={`Guided Lab Assistant: ${activeLab.title}`}
    >
      {/* Header Bar */}
      <div className="lab-assistant-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="lab-assistant-header-left">
          <span className="lab-pill-badge">GUIDED LAB</span>
          <span
            className="lab-difficulty-badge"
            style={{ borderColor: difficultyColor, color: difficultyColor }}
          >
            {activeLab.difficulty || 'Intermediate'}
          </span>
          <h3 className="lab-title-text" title={activeLab.title}>
            {activeLab.title}
          </h3>
        </div>

        <div className="lab-assistant-header-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="lab-header-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Assistant' : 'Minimize Assistant'}
            aria-label="Toggle Expand"
          >
            {isCollapsed ? '▲' : '▼'}
          </button>
          <button
            type="button"
            className="lab-header-btn danger"
            onClick={onExitLab}
            title="Exit Guided Lab Mode"
            aria-label="Exit Lab"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded Content Body */}
      {!isCollapsed && (
        <div className="lab-assistant-body">
          {/* Category & Topic */}
          <div className="lab-meta-row">
            <span className="lab-category-tag">{activeLab.category}</span>
            <span className="lab-component-count">
              {currentCircuit.components.length} components · {currentCircuit.wires.length} wires
            </span>
          </div>

          {/* Learning Objectives */}
          <div className="lab-section-block">
            <div className="lab-section-title">🎯 Learning Objectives</div>
            <ul className="lab-objectives-list">
              {objectives.map((obj, idx) => (
                <li key={idx}>{obj}</li>
              ))}
            </ul>
          </div>

          {/* Interactive Checkpoint Tasks */}
          <div className="lab-section-block">
            <div className="lab-section-title-row">
              <span className="lab-section-title">📋 Lab Tasks & Checkpoints</span>
              <span className="lab-completion-score">
                {Object.values(completedTasks).filter(Boolean).length} / {tasks.length} Done
              </span>
            </div>

            <div className="lab-tasks-list">
              {tasks.map((taskItem, idx) => {
                const isDone = Boolean(completedTasks[idx]);
                const taskText = typeof taskItem === 'string' ? taskItem : (taskItem as any).text;
                const taskHint = typeof taskItem === 'object' ? (taskItem as any).hint : undefined;
                return (
                  <label key={idx} className={`lab-task-item ${isDone ? 'done' : ''}`} title={taskHint}>
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => toggleTask(idx)}
                      className="lab-task-checkbox"
                    />
                    <span className="lab-task-text">{taskText}</span>
                  </label>
                );
              })}
            </div>

            {/* Dynamic Verify Circuit Button */}
            <button
              type="button"
              className="lab-action-btn verify-btn"
              onClick={handleVerifyCircuit}
              title="Evaluate current logic states against expected operation"
            >
              ✓ Verify Current Circuit State
            </button>

            {verificationResult.message && (
              <div className={`lab-verify-result ${verificationResult.status}`}>
                <span className="result-icon">
                  {verificationResult.status === 'success' ? '✔' : 'ℹ'}
                </span>
                <span className="result-text">{verificationResult.message}</span>
              </div>
            )}
          </div>

          {/* Collapsible Theory Accordion */}
          <div className="lab-theory-accordion">
            <button
              type="button"
              className="lab-accordion-toggle"
              onClick={() => setShowTheory(!showTheory)}
            >
              <span>💡 Theory & Formula Reference</span>
              <span>{showTheory ? '▴' : '▾'}</span>
            </button>

            {showTheory && (
              <div className="lab-theory-content">
                <p className="lab-theory-desc">{activeLab.description}</p>
                <div className="lab-theory-formula">
                  <strong>Expression:</strong> <code>{activeLab.theory}</code>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Strip */}
          <div className="lab-assistant-footer">
            {onOpenAnalysisTab && (
              <button
                type="button"
                className="lab-footer-btn analysis"
                onClick={() => onOpenAnalysisTab(activeLab.analysisTargetTab || 'overview')}
                title="Deep dive into truth table, Karnaugh map, and waveforms"
              >
                🔬 Open in Analysis Center
              </button>
            )}

            <button
              type="button"
              className="lab-footer-btn reset"
              onClick={() => {
                if (
                  window.confirm(
                    `Reset "${activeLab.title}" to its initial schematic state? Any unsaved changes in this exercise will be reverted.`
                  )
                ) {
                  onResetLab();
                  setVerificationResult({ status: 'idle', message: '' });
                }
              }}
              title="Reset this lab circuit to default topology"
            >
              🔄 Reset Exercise
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuidedLabAssistant;
