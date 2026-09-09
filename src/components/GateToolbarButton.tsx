import React, { useState, useRef, useEffect } from 'react';
import type { ComponentType } from '../types/circuit';
import { GateSymbol } from './GateSymbols';

interface GateToolbarButtonProps {
  onAddGate: (type: ComponentType) => void;
}

const BASIC_GATES: { type: ComponentType; label: string; code: string }[] = [
  { type: 'and', label: 'AND Gate', code: 'AND' },
  { type: 'or', label: 'OR Gate', code: 'OR' },
  { type: 'not', label: 'NOT Inverter', code: 'NOT' },
  { type: 'nand', label: 'NAND Gate', code: 'NAND' },
  { type: 'nor', label: 'NOR Gate', code: 'NOR' },
  { type: 'xor', label: 'XOR Gate', code: 'XOR' },
  { type: 'xnor', label: 'XNOR Gate', code: 'XNOR' },
  { type: 'buffer', label: 'Buffer', code: 'BUF' },
  { type: 'tri_state', label: 'Tri-State', code: '3-STATE' },
];

export const GateToolbarButton: React.FC<GateToolbarButtonProps> = ({ onAddGate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="gate-toolbar-container" ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`header-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Quick Access: Logic Gates (AND, OR, NOT, NAND, NOR, XOR, XNOR)"
      >
        <span>⚡</span>
        <span className="btn-label">Logic Gates</span>
        <span style={{ fontSize: '9px', marginLeft: '2px' }}>▾</span>
      </button>

      {isOpen && (
        <div
          className="gate-picker-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '280px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-strong)',
            borderRadius: '10px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            padding: '8px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            zIndex: 99999,
          }}
        >
          {BASIC_GATES.map((g) => (
            <button
              key={g.type}
              type="button"
              className="component-card"
              style={{ padding: '6px 4px', minHeight: '52px', border: '1px solid var(--border-subtle)' }}
              onClick={() => {
                onAddGate(g.type);
                setIsOpen(false);
              }}
              title={`Add ${g.label} to circuit`}
            >
              <div className="card-icon-svg" style={{ height: '22px' }}>
                <GateSymbol type={g.type} width={36} height={20} />
              </div>
              <span className="card-label" style={{ fontSize: '10px', marginTop: '2px' }}>{g.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GateToolbarButton;
