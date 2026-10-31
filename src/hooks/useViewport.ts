import { useState, useCallback, useRef } from 'react';
import type { CircuitComponent } from '../types/circuit';
import type { Point, Box } from '../engine/wiring/geometry';
export type { Point, Box } from '../engine/wiring/geometry';

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4.0;
export const DEFAULT_VIEWPORT: ViewportState = { x: 20, y: 15, zoom: 1.0 };
export const DISCRETE_ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0];

/**
 * Transforms screen coordinates (e.g. mouse clientX, clientY) into world coordinates
 */
export function screenToWorld(
  screenPoint: Point,
  viewport: ViewportState,
  containerRect?: DOMRect | null
): Point {
  const offsetX = containerRect ? containerRect.left : 0;
  const offsetY = containerRect ? containerRect.top : 0;
  const x = (screenPoint.x - offsetX - viewport.x) / viewport.zoom;
  const y = (screenPoint.y - offsetY - viewport.y) / viewport.zoom;
  return { x, y };
}

/**
 * Transforms world coordinates into screen coordinates
 */
export function worldToScreen(
  worldPoint: Point,
  viewport: ViewportState,
  containerRect?: DOMRect | null
): Point {
  const offsetX = containerRect ? containerRect.left : 0;
  const offsetY = containerRect ? containerRect.top : 0;
  const x = worldPoint.x * viewport.zoom + viewport.x + offsetX;
  const y = worldPoint.y * viewport.zoom + viewport.y + offsetY;
  return { x, y };
}

/**
 * Calculates new pan and zoom such that the world point under the screen cursor remains fixed
 */
export function calculateZoomAtPoint(
  cursorScreenPoint: Point,
  targetZoom: number,
  currentViewport: ViewportState,
  containerRect?: DOMRect | null
): ViewportState {
  const clampedZoom = Math.min(Math.max(targetZoom, MIN_ZOOM), MAX_ZOOM);
  if (clampedZoom === currentViewport.zoom || isNaN(clampedZoom)) {
    return currentViewport;
  }

  const offsetX = containerRect ? containerRect.left : 0;
  const offsetY = containerRect ? containerRect.top : 0;
  const mouseX = cursorScreenPoint.x - offsetX;
  const mouseY = cursorScreenPoint.y - offsetY;

  const newPanX = mouseX - (mouseX - currentViewport.x) * (clampedZoom / currentViewport.zoom);
  const newPanY = mouseY - (mouseY - currentViewport.y) * (clampedZoom / currentViewport.zoom);

  return {
    x: newPanX,
    y: newPanY,
    zoom: clampedZoom,
  };
}

/**
 * Calculates the bounding box enclosing all components on the canvas
 */
export function calculateCircuitBounds(components: CircuitComponent[], margin: number = 60): Box | null {
  if (!components || components.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const c of components) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x + (c.width || 80));
    maxY = Math.max(maxY, c.y + (c.height || 60));
  }

  if (!isFinite(minX) || !isFinite(minY)) return null;

  return {
    x: minX - margin,
    y: minY - margin,
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
  };
}

export function useViewport(
  initialViewport: ViewportState = DEFAULT_VIEWPORT,
  onExternalChange?: (vp: ViewportState) => void
) {
  const [viewport, setViewportState] = useState<ViewportState>(initialViewport);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const updateViewport = useCallback(
    (newVp: ViewportState) => {
      setViewportState(newVp);
      onExternalChange?.(newVp);
    },
    [onExternalChange]
  );

  const setPan = useCallback(
    (pan: { x: number; y: number }) => {
      updateViewport({ ...viewportRef.current, x: pan.x, y: pan.y });
    },
    [updateViewport]
  );

  const setZoom = useCallback(
    (zoom: number) => {
      const clamped = Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
      updateViewport({ ...viewportRef.current, zoom: clamped });
    },
    [updateViewport]
  );

  const zoomAtPoint = useCallback(
    (cursorScreenPoint: Point, targetZoom: number, containerRect?: DOMRect | null) => {
      const next = calculateZoomAtPoint(cursorScreenPoint, targetZoom, viewportRef.current, containerRect);
      updateViewport(next);
    },
    [updateViewport]
  );

  const zoomIn = useCallback(
    (centerPoint?: Point, containerRect?: DOMRect | null) => {
      const current = viewportRef.current.zoom;
      const nextLevel = DISCRETE_ZOOM_LEVELS.find((lvl) => lvl > current + 0.05) || current * 1.25;
      if (centerPoint) {
        zoomAtPoint(centerPoint, nextLevel, containerRect);
      } else {
        setZoom(nextLevel);
      }
    },
    [setZoom, zoomAtPoint]
  );

  const zoomOut = useCallback(
    (centerPoint?: Point, containerRect?: DOMRect | null) => {
      const current = viewportRef.current.zoom;
      const reversed = [...DISCRETE_ZOOM_LEVELS].reverse();
      const prevLevel = reversed.find((lvl) => lvl < current - 0.05) || current * 0.8;
      if (centerPoint) {
        zoomAtPoint(centerPoint, prevLevel, containerRect);
      } else {
        setZoom(prevLevel);
      }
    },
    [setZoom, zoomAtPoint]
  );

  const resetView = useCallback(() => {
    updateViewport(DEFAULT_VIEWPORT);
  }, [updateViewport]);

  const fitCircuit = useCallback(
    (components: CircuitComponent[], containerWidth: number, containerHeight: number, margin = 60) => {
      const bounds = calculateCircuitBounds(components, margin);
      if (!bounds || containerWidth <= 0 || containerHeight <= 0) return;

      const scaleX = containerWidth / bounds.width;
      const scaleY = containerHeight / bounds.height;
      const bestZoom = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_ZOOM), 1.75);

      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;

      const newPanX = containerWidth / 2 - centerX * bestZoom;
      const newPanY = containerHeight / 2 - centerY * bestZoom;

      updateViewport({
        x: newPanX,
        y: newPanY,
        zoom: bestZoom,
      });
    },
    [updateViewport]
  );

  return {
    viewport,
    viewportRef,
    pan: { x: viewport.x, y: viewport.y },
    zoom: viewport.zoom,
    setPan,
    setZoom,
    updateViewport,
    zoomAtPoint,
    zoomIn,
    zoomOut,
    resetView,
    fitCircuit,
    screenToWorld: (screenPt: Point, rect?: DOMRect | null) => screenToWorld(screenPt, viewportRef.current, rect),
    worldToScreen: (worldPt: Point, rect?: DOMRect | null) => worldToScreen(worldPt, viewportRef.current, rect),
  };
}
