import React, { useState, useMemo } from 'react';
import type { CircuitComponent, LogicValue, Wire } from '../types/circuit';
import type { TrainerBoardModel } from '../engine/trainer/trainerBoardModel';
import type { Box } from '../engine/wiring/geometry';
import {
  calculateOrthogonalWireRoute,
  getComponentObstacles,
  getPinEndpoint,
  isRouteBlocked,
  pointsToSvgPath,
  ROUTING_CONFIG,
} from '../engine/wiring';

export type WireRole = 'input' | 'output' | 'power' | 'ground' | 'logic';

/**
 * Classifies wire by its circuit role (input jumper, output jumper, VCC, GND, or logic gate-to-gate)
 */
export function getWireRole(wire: Wire, components: CircuitComponent[]): WireRole {
  const fromComp = components.find((c) => c.id === wire.fromCompId);
  const toComp = components.find((c) => c.id === wire.toCompId);

  // 1. Power (+5V VCC / HIGH)
  if (
    fromComp?.type === 'vcc' ||
    toComp?.type === 'vcc' ||
    Boolean(fromComp?.customProps?.isTrainerVcc) ||
    Boolean(toComp?.customProps?.isTrainerVcc) ||
    Boolean(fromComp?.customProps?.isTrainerHigh) ||
    Boolean(toComp?.customProps?.isTrainerHigh)
  ) {
    return 'power';
  }

  // 2. Ground (0V GND / LOW)
  if (
    fromComp?.type === 'gnd' ||
    toComp?.type === 'gnd' ||
    Boolean(fromComp?.customProps?.isTrainerGnd) ||
    Boolean(toComp?.customProps?.isTrainerGnd) ||
    Boolean(fromComp?.customProps?.isTrainerLow) ||
    Boolean(toComp?.customProps?.isTrainerLow)
  ) {
    return 'ground';
  }

  // 3. Output wire (connects to trainer output probe lamp, external probe, LED, 7-segment, or buzzer)
  if (
    Boolean(fromComp?.customProps?.isTrainerOutput) ||
    Boolean(toComp?.customProps?.isTrainerOutput) ||
    fromComp?.type === 'probe' ||
    toComp?.type === 'probe' ||
    fromComp?.type === 'seven_segment' ||
    toComp?.type === 'seven_segment' ||
    fromComp?.type === 'led' ||
    toComp?.type === 'led' ||
    fromComp?.type === 'buzzer' ||
    toComp?.type === 'buzzer'
  ) {
    return 'output';
  }

  // 4. Input wire (connects from trainer input switches, toggle switch, clock, or push button)
  if (
    Boolean(fromComp?.customProps?.isTrainerInput) ||
    Boolean(toComp?.customProps?.isTrainerInput) ||
    Boolean(fromComp?.customProps?.isTrainerClock) ||
    Boolean(toComp?.customProps?.isTrainerClock) ||
    fromComp?.type === 'toggle' ||
    toComp?.type === 'toggle' ||
    fromComp?.type === 'clock' ||
    toComp?.type === 'clock' ||
    fromComp?.type === 'push_button' ||
    toComp?.type === 'push_button'
  ) {
    return 'input';
  }

  // 5. Default internal logic wire (gate-to-gate, IC-to-IC)
  return 'logic';
}

/**
 * Role-Based Wire Color Palette:
 * - Input Wires: Royal Blue (0) / Glowing Electric Cyan (1)
 * - Output Wires: Vibrant Tangerine Orange (0) / Luminous Amber Gold (1)
 * - Power (+5V VCC): Vivid Crimson Red
 * - Ground (0V GND): Technical Charcoal Slate
 * - Logic Wires: Technical Slate (0) / Emerald Green (1)
 */
export function getWireVisualColor(
  role: WireRole,
  val: LogicValue,
  isSelected: boolean,
  isHovered: boolean,
  isBlocked: boolean
): { stroke: string; glow: string; roleName: string } {
  if (isBlocked) {
    return {
      stroke: 'var(--signal-x, #ef4444)',
      glow: isSelected || isHovered ? 'rgba(239, 68, 68, 0.6)' : 'rgba(239, 68, 68, 0.3)',
      roleName: 'Blocked',
    };
  }

  if (isSelected) {
    return {
      stroke: 'var(--selection-stroke, #d97736)',
      glow: 'var(--selection-glow, rgba(217, 119, 54, 0.4))',
      roleName: 'Selected',
    };
  }

  if (isHovered) {
    return {
      stroke: 'var(--wire-hover, #ea8a47)',
      glow: 'rgba(217, 119, 54, 0.35)',
      roleName: 'Hovered',
    };
  }

  switch (role) {
    case 'input':
      if (val === '1') {
        return {
          stroke: '#38bdf8', // Electric Cyan
          glow: 'rgba(56, 189, 248, 0.55)',
          roleName: 'Input [HIGH]',
        };
      }
      return {
        stroke: '#2563eb', // Rich Royal Blue (distinct input jumper)
        glow: 'transparent',
        roleName: 'Input [LOW]',
      };

    case 'output':
      if (val === '1') {
        return {
          stroke: '#f59e0b', // Luminous Amber Gold
          glow: 'rgba(245, 158, 11, 0.55)',
          roleName: 'Output [HIGH]',
        };
      }
      return {
        stroke: '#ea580c', // Vibrant Deep Orange (distinct output jumper)
        glow: 'transparent',
        roleName: 'Output [LOW]',
      };

    case 'power':
      return {
        stroke: '#ef4444', // Crimson Red
        glow: val === '1' ? 'rgba(239, 68, 68, 0.5)' : 'transparent',
        roleName: 'VCC (+5V)',
      };

    case 'ground':
      return {
        stroke: '#475569', // Charcoal Slate
        glow: 'transparent',
        roleName: 'GND (0V)',
      };

    case 'logic':
    default:
      if (val === '1') {
        return {
          stroke: 'var(--signal-high, #22c55e)',
          glow: 'var(--signal-high-glow, rgba(34, 197, 94, 0.45))',
          roleName: 'Logic [HIGH]',
        };
      }
      if (val === 'X') {
        return {
          stroke: 'var(--signal-x, #ef4444)',
          glow: 'rgba(239, 68, 68, 0.4)',
          roleName: 'Conflict [X]',
        };
      }
      if (val === 'Z') {
        return {
          stroke: 'var(--signal-z, #9ca3af)',
          glow: 'transparent',
          roleName: 'High-Z',
        };
      }
      return {
        stroke: '#64748b',
        glow: 'transparent',
        roleName: 'Logic [LOW]',
      };
  }
}

interface WireRendererProps {
  wires: Wire[];
  components: CircuitComponent[];
  trainerBoards?: TrainerBoardModel[];
  selectedWireId?: string | null;
  isAllSelected?: boolean;
  isDeleteMode?: boolean;
  isSchematicMode?: boolean;
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
  onWireContextMenu?: (wire: Wire, e: React.MouseEvent) => void;
}

export const WireRenderer: React.FC<WireRendererProps> = ({
  wires,
  components,
  trainerBoards,
  selectedWireId,
  isAllSelected,
  isDeleteMode,
  inProgressWire,
  onSelectWire,
  onDeleteWire,
  onWireDoubleClick,
  onWireMouseUp,
  onAddJunctionAtCoords,
  onWireContextMenu,
}) => {
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);

  // Pre-calculate component obstacles and unmounted IC socket obstacles for collision-free routing
  const obstacles = useMemo(() => {
    const compObs = getComponentObstacles(components);
    if (!trainerBoards || trainerBoards.length === 0) {
      return compObs;
    }
    const socketObs: Box[] = [];
    for (const board of trainerBoards) {
      for (const slot of board.icSlots) {
        // If an IC is NOT mounted on this slot, treat the socket footprint as an obstacle
        // so wires never cut across unmounted IC sockets or their pins!
        if (!slot.mountedComponentId) {
          socketObs.push({
            x: slot.x,
            y: slot.y,
            width: slot.width,
            height: slot.height,
            compId: slot.id,
          });
        }
      }
    }
    return [...compObs, ...socketObs];
  }, [components, trainerBoards]);

  // Memoize routes so that moving one component only reroutes affected wires
  const computedRoutes = useMemo(() => {
    return wires.map((wire, wireIdx) => {
      const startEp = getPinEndpoint(wire.fromCompId, wire.fromPinId, components);
      const endEp = getPinEndpoint(wire.toCompId, wire.toPinId, components);
      if (!startEp || !endEp) return null;

      const role = getWireRole(wire, components);
      const points = calculateOrthogonalWireRoute(startEp, endEp, wireIdx, obstacles, components);
      const isBlocked = isRouteBlocked(points);
      const pathData = pointsToSvgPath(points, ROUTING_CONFIG.CORNER_RADIUS);
      const blockedGuidePath = isBlocked
        ? `M ${points[points.length - 1]?.x ?? startEp.x} ${points[points.length - 1]?.y ?? startEp.y} L ${endEp.x} ${endEp.y}`
        : null;

      return { wire, startEp, endEp, points, pathData, isBlocked, blockedGuidePath, role };
    });
  }, [wires, components, obstacles]);

  return (
    <svg className="canvas-svg-layer">
      {/* Existing Orthogonal Wires */}
      {computedRoutes.map((item) => {
        if (!item) return null;
        const { wire, startEp, endEp, points, pathData, isBlocked, blockedGuidePath, role } = item;

        const isSelected = Boolean(isAllSelected || selectedWireId === wire.id);
        const isHovered = hoveredWireId === wire.id;
        const color = getWireVisualColor(role, wire.value, isSelected, isHovered, isBlocked);

        const midPoint = isBlocked
          ? { x: Math.round((startEp.x + endEp.x) / 2), y: Math.round((startEp.y + endEp.y) / 2) }
          : points[Math.floor(points.length / 2)] || {
              x: (startEp.x + endEp.x) / 2,
              y: (startEp.y + endEp.y) / 2,
            };

        return (
          <g
            key={wire.id}
            className={`wire-group ${isSelected ? 'selected' : ''} ${isBlocked ? 'blocked' : ''} wire-role-${role}`}
            onMouseEnter={() => setHoveredWireId(wire.id)}
            onMouseLeave={() => setHoveredWireId(null)}
          >
            {/* 1. Large Invisible Interaction Hit Area */}
            <path
              d={isBlocked && blockedGuidePath ? `${pathData} ${blockedGuidePath}` : pathData}
              fill="none"
              stroke="transparent"
              strokeWidth={ROUTING_CONFIG.HIT_STROKE_WIDTH}
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
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onWireContextMenu?.(wire, e);
              }}
            >
              <title>
                {isBlocked
                  ? `⚠️ Blocked Route: ${startEp.pinId} ➔ ${endEp.pinId} (Path obstructed by components)`
                  : `${color.roleName}: ${startEp.pinId} ➔ ${endEp.pinId} [${wire.value}]`}
              </title>
            </path>

            {/* 2. Crisp Orthogonal Wire Line */}
            <path
              d={pathData}
              fill="none"
              stroke={color.stroke}
              strokeWidth={
                isSelected
                  ? ROUTING_CONFIG.WIRE_SELECTED_STROKE_WIDTH
                  : isHovered
                  ? ROUTING_CONFIG.WIRE_HOVER_STROKE_WIDTH
                  : ROUTING_CONFIG.WIRE_STROKE_WIDTH
              }
              strokeDasharray={isBlocked ? '6 4' : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                pointerEvents: 'none',
                filter: color.glow !== 'transparent' ? `drop-shadow(0 0 3px ${color.glow})` : undefined,
                transition: 'stroke-width 0.1s ease, stroke 0.15s ease',
              }}
            />

            {/* Blocked Route Guide Dash */}
            {isBlocked && blockedGuidePath && (
              <path
                d={blockedGuidePath}
                fill="none"
                stroke="var(--signal-x, #ef4444)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                style={{ pointerEvents: 'none', opacity: 0.65 }}
              />
            )}

            {/* Blocked Collision Warning Badge */}
            {isBlocked && (
              <g className="wire-blocked-badge" style={{ pointerEvents: 'none' }}>
                <rect
                  x={midPoint.x - 44}
                  y={midPoint.y - 12}
                  width="88"
                  height="22"
                  rx="4"
                  fill="var(--signal-x, #ef4444)"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  filter="drop-shadow(0 2px 6px rgba(239, 68, 68, 0.4))"
                />
                <text
                  x={midPoint.x}
                  y={midPoint.y + 3}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9.5"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  ⚠️ BLOCKED
                </text>
              </g>
            )}

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
                  x={midPoint.x - 60}
                  y={midPoint.y - 12}
                  width="120"
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
                  {color.roleName}: {startEp.pinId} ➔ {endEp.pinId} [{wire.value}]
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

      {/* In-Progress Wire Preview (Live Orthogonal Tracking with Role Preview) */}
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

        const fromComp = components.find((c) => c.id === inProgressWire.fromCompId);
        let previewColor = 'var(--accent-copper, #d97736)';
        let previewGlow = 'rgba(217, 119, 54, 0.4)';

        if (
          Boolean(fromComp?.customProps?.isTrainerInput) ||
          fromComp?.type === 'toggle' ||
          fromComp?.type === 'clock' ||
          fromComp?.type === 'push_button'
        ) {
          previewColor = '#38bdf8'; // Electric Cyan for input
          previewGlow = 'rgba(56, 189, 248, 0.5)';
        } else if (
          Boolean(fromComp?.customProps?.isTrainerOutput) ||
          fromComp?.type === 'probe' ||
          fromComp?.type === 'led' ||
          fromComp?.type === 'seven_segment' ||
          fromComp?.type === 'buzzer'
        ) {
          previewColor = '#f97316'; // Tangerine Orange for output
          previewGlow = 'rgba(249, 115, 22, 0.5)';
        } else if (fromComp?.type === 'vcc' || Boolean(fromComp?.customProps?.isTrainerVcc)) {
          previewColor = '#ef4444'; // Crimson Red for VCC
          previewGlow = 'rgba(239, 68, 68, 0.5)';
        } else if (fromComp?.type === 'gnd' || Boolean(fromComp?.customProps?.isTrainerGnd)) {
          previewColor = '#475569'; // Slate for GND
          previewGlow = 'transparent';
        }

        const points = calculateOrthogonalWireRoute(startEp, endEp, 0, obstacles, components);
        const isBlocked = isRouteBlocked(points);
        const pathData = pointsToSvgPath(points, ROUTING_CONFIG.CORNER_RADIUS);
        const inProgressGuidePath = isBlocked
          ? `M ${points[points.length - 1]?.x ?? startEp.x} ${points[points.length - 1]?.y ?? startEp.y} L ${endEp.x} ${endEp.y}`
          : null;

        const effectiveStroke = isBlocked ? 'var(--signal-x, #ef4444)' : previewColor;
        const effectiveGlow = isBlocked ? 'rgba(239, 68, 68, 0.5)' : previewGlow;

        return (
          <g style={{ pointerEvents: 'none' }}>
            <path
              d={pathData}
              fill="none"
              stroke={effectiveStroke}
              strokeWidth="2"
              strokeDasharray={isBlocked ? '6 4' : '4 3'}
              style={{
                filter: effectiveGlow !== 'transparent' ? `drop-shadow(0 0 4px ${effectiveGlow})` : undefined,
              }}
            />
            {isBlocked && inProgressGuidePath && (
              <path
                d={inProgressGuidePath}
                fill="none"
                stroke="var(--signal-x, #ef4444)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                style={{ opacity: 0.65 }}
              />
            )}
            <circle
              cx={inProgressWire.toX}
              cy={inProgressWire.toY}
              r={4}
              fill={effectiveStroke}
              stroke="var(--bg-app, #121417)"
              strokeWidth="1.5"
            />
          </g>
        );
      })()}
    </svg>
  );
};

export default WireRenderer;
