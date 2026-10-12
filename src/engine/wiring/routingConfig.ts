/**
 * CircuitFlow Centralized Wire Routing Configuration
 * 
 * Single source of truth for all obstacle clearance, pin approach,
 * channel lane management, and Manhattan grid parameters.
 * Eliminates scattered magic numbers (6px, 14px, 18px, 24px).
 */
export const ROUTING_CONFIG = {
  // Safety keep-out margin around component bodies (px)
  COMPONENT_KEEP_OUT_MARGIN: 8,

  // Outward stub length along pin departure/arrival normal (px)
  PIN_STUB_LENGTH: 16,

  // Minimum clearance distance between wires and obstacle edges (px)
  MIN_CLEARANCE: 12,

  // Distance between parallel wire lanes in a shared channel corridor (px)
  LANE_SPACING: 10,

  // Maximum number of parallel wire lanes before wrapping
  MAX_LANES: 9,

  // Standard orthogonal Manhattan grid step (px)
  GRID_SIZE: 10,

  // Corner fillet radius for SVG path visualization (px)
  CORNER_RADIUS: 4,

  // Turn penalty added to A* cost function to minimize unnecessary bends
  BEND_PENALTY: 35,

  // Invisible interaction hit stroke width (px)
  HIT_STROKE_WIDTH: 14,

  // Visual wire stroke widths
  WIRE_STROKE_WIDTH: 2,
  WIRE_SELECTED_STROKE_WIDTH: 3.5,
  WIRE_HOVER_STROKE_WIDTH: 3,

  // Maximum detour search boundary margin beyond endpoints (px)
  GRAPH_BOUNDS_MARGIN: 60,
} as const;

export type RoutingConfig = typeof ROUTING_CONFIG;
