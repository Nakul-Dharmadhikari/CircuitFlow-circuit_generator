import React, { useState, useMemo } from 'react';
import type { CircuitComponent, LogicValue, Wire } from '../types/circuit';
import {
  calculateOrthogonalWireRoute,
  getComponentObstacles,
  getPinEndpoint,
  pointsToSvgPath,
} from '../engine/wiring';

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

/**
 * Technical CAD Wire Color Scheme
 */
function getWireStateColor(val: LogicValue, isSelected: boolean, isHovered: boolean): { stroke: string; glow: string } {
  if (isSelected) {
    return { stroke: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' };
  }
  if (isHovered) {
    return { stroke: '#60a5fa', glow: 'rgba(96, 165, 250, 0.35)' };
  }
  switch (val) {
    case '1':
      return { stroke: '#22c55e', glow: 'rgba(34, 197, 94, 0.3)' }; // HIGH: Vivid Green
    case '0':
      return { stroke: '#475569', glow: 'transparent' }; // LOW: Slate Blue-Gray
    case 'Z':
      return { stroke: '#94a3b8', glow: 'transparent' }; // HIGH-Z: Muted Gray
    case 'X':
      return { stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' }; // Conflict: Red
    default:
      return { stroke: '#64748b', glow: 'transparent' };
  }
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
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);

  // Pre-calculate component obstacles for collision-free routing
  const obstacles = useMemo(() => getComponentObstacles(components), [components]);

  // Memoize routes so that moving one component only reroutes affected wires
  const computedRoutes = useMemo(() => {
    return wires.map((wire, wireIdx) => {
      const startEp = getPinEndpoint(wire.fromCompId, wire.fromPinId, components);
      const endEp = getPinEndpoint(wire.toCompId, wire.toPinId, components);
      if (!startEp || !endEp) return null;

      const points = calculateOrthogonalWireRoute(startEp, endEp, wireIdx, obstacles);
      const pathData = pointsToSvgPath(points, 4);
      return { wire, startEp, endEp, points, pathData };
    });
  }, [wires, components, obstacles]);

  return (
    <svg className="canvas-svg-layer">
      {/* Existing Orthogonal Wires */}
      {computedRoutes.map((item) => {
        if (!item) return null;
        const { wire, startEp, endEp, points, pathData } = item;

        const isSelected = Boolean(isAllSelected || selectedWireId === wire.id);
        const isHovered = hoveredWireId === wire.id;
        const color = getWireStateColor(wire.value, isSelected, isHovered);

        const midPoint = points[Math.floor(points.length / 2)] || {
          x: (startEp.x + endEp.x) / 2,
          y: (startEp.y + endEp.y) / 2,
        };

        return (
          <g
            key={wire.id}
            className={`wire-group ${isSelected ? 'selected' : ''}`}
            onMouseEnter={() => setHoveredWireId(wire.id)}
            onMouseLeave={() => setHoveredWireId(null)}
          >
            {/* 1. Large 14px Invisible Interaction Hit Area */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth="14"
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
              <title>{`Wire: ${startEp.pinId} ➔ ${endEp.pinId} [${wire.value}]`}</title>
            </path>

            {/* 2. Crisp 2px/3.5px Orthogonal Wire Line */}
            <path
              d={pathData}
              fill="none"
              stroke={color.stroke}
              strokeWidth={isSelected ? 3.5 : isHovered ? 3 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                pointerEvents: 'none',
                filter: color.glow !== 'transparent' ? `drop-shadow(0 0 3px ${color.glow})` : undefined,
                transition: 'stroke-width 0.1s ease, stroke 0.15s ease',
              }}
            />

            {/* 3. Selected Wire Dashed Overlay */}
            {isSelected && (
              <path
                d={pathData}
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                style={{ pointerEvents: 'none', opacity: 0.8 }}
              />
            )}

            {/* 4. Connected Pin Highlight Dots (Shown on hover/selection) */}
            {(isHovered || isSelected) && (
              <>
                <circle
                  cx={startEp.x}
                  cy={startEp.y}
                  r={4}
                  fill={color.stroke}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  style={{ pointerEvents: 'none' }}
                />
                <circle
                  cx={endEp.x}
                  cy={endEp.y}
                  r={4}
                  fill={color.stroke}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  style={{ pointerEvents: 'none' }}
                />
              </>
            )}

            {/* 5. Clean Wire Tooltip Badge on Hover */}
            {isHovered && !isAllSelected && (
              <g style={{ pointerEvents: 'none' }}>
                <rect
                  x={midPoint.x - 48}
                  y={midPoint.y - 12}
                  width="96"
                  height="20"
                  rx="3"
                  fill="#1e293b"
                  stroke={color.stroke}
                  strokeWidth="1"
                  opacity={0.95}
                />
                <text
                  x={midPoint.x}
                  y={midPoint.y + 2}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="9.5"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  {startEp.pinId} ➔ {endEp.pinId} [{wire.value}]
                </text>
              </g>
            )}

            {/* 6. Selected Wire Action HUD (Add Tap / Delete) */}
            {!isAllSelected && isSelected && (
              <foreignObject
                x={midPoint.x - 60}
                y={midPoint.y - 36}
                width={120}
                height={30}
                style={{ overflow: 'visible', pointerEvents: 'none' }}
              >
                <div className="wire-action-badge">
                  <button
                    type="button"
                    className="wire-action-btn junction"
                    title="Add Junction tap here"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddJunctionAtCoords?.(
                        wire.id,
                        Math.round(midPoint.x / 10) * 10,
                        Math.round(midPoint.y / 10) * 10
                      );
                    }}
                  >
                    ＋ Tap
                  </button>
                  <button
                    type="button"
                    className="wire-action-btn delete"
                    title="Delete wire (Del)"
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

      {/* In-Progress Wire Preview (Live Orthogonal Tracking) */}
      {inProgressWire && (() => {
        const startEp = getPinEndpoint(inProgressWire.fromCompId, inProgressWire.fromPinId, components);
        if (!startEp) return null;

        const endEp = {
          x: inProgressWire.toX,
          y: inProgressWire.toY,
          dir:
            Math.abs(inProgressWire.toY - startEp.y) > Math.abs(inProgressWire.toX - startEp.x)
              ? { dx: 0, dy: inProgressWire.toY > startEp.y ? -1 : 1 }
              : { dx: inProgressWire.toX > startEp.x ? -1 : 1, dy: 0 },
          compId: 'cursor',
          pinId: 'cursor',
        };

        const points = calculateOrthogonalWireRoute(startEp, endEp, 0, obstacles);
        const pathData = pointsToSvgPath(points, 4);

        return (
          <g style={{ pointerEvents: 'none' }}>
            <path
              d={pathData}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="4 3"
              style={{
                filter: 'drop-shadow(0 0 4px #38bdf8)',
              }}
            />
            <circle
              cx={inProgressWire.toX}
              cy={inProgressWire.toY}
              r={4}
              fill="#38bdf8"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          </g>
        );
      })()}
    </svg>
  );
};

export default WireRenderer;
