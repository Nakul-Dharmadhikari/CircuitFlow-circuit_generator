import React from 'react';
import type { CircuitComponent, Wire } from '../types/circuit';

interface WireRendererProps {
  wires: Wire[];
  components: CircuitComponent[];
  selectedWireId?: string | null;
  isAllSelected?: boolean;
  isDeleteMode?: boolean;
  inProgressWire: {
    fromCompId: string;
    fromPinId: string;
    toX: number;
    toY: number;
  } | null;
  onSelectWire?: (wireId: string | null) => void;
  onDeleteWire: (wireId: string) => void;
  onWireDoubleClick?: (wireId: string, clientX: number, clientY: number, e: React.MouseEvent) => void;
  onWireMouseUp?: (wireId: string, clientX: number, clientY: number, e: React.MouseEvent) => void;
  onAddJunctionAtCoords?: (wireId: string, x: number, y: number) => void;
}

const WIRE_PALETTE = [
  { name: 'Red', hex: '#ef4444', glow: 'rgba(239, 68, 68, 0.65)' },
  { name: 'Blue', hex: '#3b82f6', glow: 'rgba(59, 130, 246, 0.65)' },
  { name: 'Green', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.65)' },
  { name: 'Amber', hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.65)' },
  { name: 'Purple', hex: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.65)' },
  { name: 'Cyan', hex: '#06b6d4', glow: 'rgba(6, 182, 212, 0.65)' },
  { name: 'Pink', hex: '#ec4899', glow: 'rgba(236, 72, 153, 0.65)' },
  { name: 'Orange', hex: '#f97316', glow: 'rgba(249, 115, 22, 0.65)' },
  { name: 'White', hex: '#f8fafc', glow: 'rgba(248, 250, 252, 0.65)' },
];

function getWireColor(wireId: string) {
  let hash = 0;
  for (let i = 0; i < wireId.length; i++) {
    hash = (hash << 5) - hash + wireId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % WIRE_PALETTE.length;
  return WIRE_PALETTE[index];
}

export const WireRenderer: React.FC<WireRendererProps> = ({
  wires,
  components,
  selectedWireId,
  isAllSelected,
  isDeleteMode,
  inProgressWire,
  onSelectWire,
  onDeleteWire,
  onWireDoubleClick,
  onWireMouseUp,
  onAddJunctionAtCoords,
}) => {
  // Find pin absolute coordinates
  const getPinCoords = (compId: string, pinId: string) => {
    const comp = components.find((c) => c.id === compId);
    if (!comp) return null;

    const pin =
      comp.inputs.find((p) => p.id === pinId) ||
      comp.outputs.find((p) => p.id === pinId);
    if (!pin) return null;

    return {
      x: comp.x + pin.x,
      y: comp.y + pin.y,
    };
  };

  // Get pin departure normal vector (so wires loop around side of ICs instead of crossing through)
  const getPinDirection = (compId: string, pinId: string) => {
    const comp = components.find((c) => c.id === compId);
    if (!comp) return { dx: 0, dy: 1 };
    const pin = comp.inputs.find((p) => p.id === pinId) || comp.outputs.find((p) => p.id === pinId);
    if (!pin) return { dx: 0, dy: 1 };

    // For horizontal DIP ICs
    if (comp.type.startsWith('ic_') || comp.type === 'custom_ic') {
      if (pin.y === 0) return { dx: 0, dy: -1 }; // top pins route UP
      return { dx: 0, dy: 1 }; // bottom pins route DOWN
    }
    if (comp.customProps?.isTrainerOutput) return { dx: 0, dy: 1 }; // output lamps route DOWN
    if (comp.customProps?.isTrainerInput || comp.customProps?.isTrainerClock || comp.customProps?.isTrainerGnd) return { dx: 0, dy: -1 }; // inputs route UP
    if (comp.customProps?.isTrainerVcc) return { dx: 0, dy: 1 };
    if (pin.x === 0) return { dx: -1, dy: 0 };
    if (pin.x === comp.width) return { dx: 1, dy: 0 };
    if (pin.y === 0) return { dx: 0, dy: -1 };
    return { dx: 0, dy: 1 };
  };

  // Generate smooth natural jumper wire path looping around sides
  const createRoutedPath = (
    x1: number,
    y1: number,
    v1: { dx: number; dy: number },
    x2: number,
    y2: number,
    v2: { dx: number; dy: number }
  ) => {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const lead = Math.min(Math.max(dist * 0.42, 35), 140);

    const cp1x = x1 + v1.dx * lead;
    const cp1y = y1 + v1.dy * lead;
    const cp2x = x2 + v2.dx * lead;
    const cp2y = y2 + v2.dy * lead;

    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  };

  return (
    <svg className="canvas-svg-layer">
      {/* Existing Wires */}
      {wires.map((wire) => {
        const fromCoords = getPinCoords(wire.fromCompId, wire.fromPinId);
        const toCoords = getPinCoords(wire.toCompId, wire.toPinId);
        if (!fromCoords || !toCoords) return null;

        const v1 = getPinDirection(wire.fromCompId, wire.fromPinId);
        const v2 = getPinDirection(wire.toCompId, wire.toPinId);

        const pathData = createRoutedPath(fromCoords.x, fromCoords.y, v1, toCoords.x, toCoords.y, v2);
        const isSelected = Boolean(isAllSelected || selectedWireId === wire.id);
        const midX = (fromCoords.x + toCoords.x) / 2;
        const midY = (fromCoords.y + toCoords.y) / 2;

        const wireColor = getWireColor(wire.id);
        const isHigh = wire.value === '1';

        return (
          <g key={wire.id} className={`wire-group ${isSelected ? 'selected' : ''}`}>
            {/* Click & Interaction Hit Area */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth="24"
              style={{
                pointerEvents: 'stroke',
                cursor: isDeleteMode ? 'not-allowed' : inProgressWire ? 'crosshair' : 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (isDeleteMode) {
                  onDeleteWire(wire.id);
                } else {
                  onSelectWire?.(wire.id);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!isDeleteMode) {
                  onWireDoubleClick?.(wire.id, e.clientX, e.clientY, e);
                }
              }}
              onMouseUp={(e) => {
                if (inProgressWire) {
                  e.stopPropagation();
                  onWireMouseUp?.(wire.id, e.clientX, e.clientY, e);
                }
              }}
            >
              <title>{isDeleteMode ? 'Click to delete this wire' : 'Click to select wire | Double-click to add Junction Tap | Del to remove'}</title>
            </path>

            {/* High-Contrast Underlay Outline (Black jacket border) */}
            <path
              d={pathData}
              fill="none"
              stroke="#0f172a"
              strokeWidth={isSelected ? 8 : 6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.92}
              style={{ pointerEvents: 'none' }}
            />

            {/* Vibrant Colored Jacket */}
            <path
              d={pathData}
              fill="none"
              stroke={wireColor.hex}
              strokeWidth={isSelected ? 5 : 3.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                pointerEvents: 'none',
                filter: isHigh
                  ? `drop-shadow(0 0 6px ${wireColor.hex}) drop-shadow(0 0 10px #22c55e)`
                  : `drop-shadow(0 1px 2px rgba(0,0,0,0.3))`,
              }}
            />

            {/* Core Signal Indicator Line (Electric Green Glow on HIGH '1') */}
            {isHigh && (
              <path
                d={pathData}
                fill="none"
                stroke="#86efac"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pointerEvents: 'none', opacity: 0.9 }}
              />
            )}

            {/* Selected Wire Glowing Outline */}
            {isSelected && (
              <path
                d={pathData}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="6 4"
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* Selected Wire Action Controls */}
            {!isAllSelected && isSelected && (
              <foreignObject
                x={midX - 70}
                y={midY - 18}
                width={140}
                height={36}
                style={{ overflow: 'visible', pointerEvents: 'none' }}
              >
                <div className="wire-action-badge">
                  <button
                    type="button"
                    className="wire-action-btn junction"
                    title="Add Junction tap here"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddJunctionAtCoords?.(wire.id, Math.round(midX / 10) * 10, Math.round(midY / 10) * 10);
                    }}
                  >
                    ＋ Tap
                  </button>
                  <button
                    type="button"
                    className="wire-action-btn delete"
                    title="Delete wire"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWire(wire.id);
                    }}
                  >
                    ✕ Del
                  </button>
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}

      {/* Wire being actively drawn/dragged */}
      {inProgressWire && (() => {
        const fromCoords = getPinCoords(inProgressWire.fromCompId, inProgressWire.fromPinId);
        if (!fromCoords) return null;

        const v1 = getPinDirection(inProgressWire.fromCompId, inProgressWire.fromPinId);
        const dx = inProgressWire.toX - fromCoords.x;
        const dy = inProgressWire.toY - fromCoords.y;
        const v2 = Math.abs(dy) > Math.abs(dx) ? { dx: 0, dy: dy > 0 ? -1 : 1 } : { dx: dx > 0 ? -1 : 1, dy: 0 };

        const pathData = createRoutedPath(
          fromCoords.x,
          fromCoords.y,
          v1,
          inProgressWire.toX,
          inProgressWire.toY,
          v2
        );

        return (
          <g>
            {/* Thick Dark Outline */}
            <path
              d={pathData}
              fill="none"
              stroke="#0f172a"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
            {/* Bright Cyan Glowing In-Progress Wire */}
            <path
              d={pathData}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray="8, 5"
              style={{
                filter: 'drop-shadow(0 0 8px #38bdf8)',
                animation: 'wire-dash 0.6s linear infinite',
              }}
            />
          </g>
        );
      })()}
    </svg>
  );
};
export default WireRenderer;
