import React, { useRef, useCallback, useMemo } from 'react';
import type { Circuit } from '../types/circuit';

export interface WorkspaceScrollbarsProps {
  circuit: Circuit;
  pan: { x: number; y: number };
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  onPanChange: (pan: { x: number; y: number }) => void;
  workbenchMode?: 'trainer' | 'freeform';
  isSchematicMode?: boolean;
}

export interface NavigableBounds {
  contentMinX: number;
  contentMaxX: number;
  contentMinY: number;
  contentMaxY: number;
  navMinX: number;
  navMaxX: number;
  navMinY: number;
  navMaxY: number;
  visibleWorldMinX: number;
  visibleWorldMaxX: number;
  visibleWorldMinY: number;
  visibleWorldMaxY: number;
  totalNavWidth: number;
  totalNavHeight: number;
  visibleWidth: number;
  visibleHeight: number;
  fracX: number;
  fracY: number;
  thumbWidth: number;
  thumbHeight: number;
  thumbLeft: number;
  thumbTop: number;
  travelTrackX: number;
  travelTrackY: number;
  travelWorldX: number;
  travelWorldY: number;
  ratioX: number;
  ratioY: number;
  showH: boolean;
  showV: boolean;
}

export const SCROLLBAR_SIZE = 12;

/**
 * Calculates complete world-space bounds and scrollbar dimensions
 */
export function calculateNavigableBounds(
  circuit: Circuit,
  pan: { x: number; y: number },
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
  workbenchMode?: 'trainer' | 'freeform',
  isSchematicMode?: boolean
): NavigableBounds {
  const z = Math.max(0.1, zoom);
  const vW = Math.max(100, viewportWidth);
  const vH = Math.max(100, viewportHeight);

  // Visible world extent under current pan/zoom
  const visibleWorldMinX = -pan.x / z;
  const visibleWorldMaxX = (vW - pan.x) / z;
  const visibleWorldMinY = -pan.y / z;
  const visibleWorldMaxY = (vH - pan.y) / z;

  // Compute bounding box of all circuit content (components, trainer boards, wires)
  let cMinX = Infinity;
  let cMaxX = -Infinity;
  let cMinY = Infinity;
  let cMaxY = -Infinity;

  // Components
  const comps = circuit.components || [];
  for (const c of comps) {
    if (workbenchMode === 'freeform' && c.isTrainerFixed) continue;
    cMinX = Math.min(cMinX, c.x);
    cMaxX = Math.max(cMaxX, c.x + (c.width || 80));
    cMinY = Math.min(cMinY, c.y);
    cMaxY = Math.max(cMaxY, c.y + (c.height || 60));
  }

  // Trainer boards
  if (!isSchematicMode && workbenchMode !== 'freeform' && circuit.trainerBoards) {
    for (const b of circuit.trainerBoards) {
      cMinX = Math.min(cMinX, b.x);
      cMaxX = Math.max(cMaxX, b.x + (b.width || 1200));
      cMinY = Math.min(cMinY, b.y);
      cMaxY = Math.max(cMaxY, b.y + (b.height || 650));
    }
  }

  // Fallback for empty workspace
  const hasContent = isFinite(cMinX) && isFinite(cMinY);
  const contentMinX = hasContent ? cMinX : 0;
  const contentMaxX = hasContent ? cMaxX : 600;
  const contentMinY = hasContent ? cMinY : 0;
  const contentMaxY = hasContent ? cMaxY : 400;

  // Comfortable world padding
  const paddingX = Math.max(120, 240 / z);
  const paddingY = Math.max(120, 240 / z);

  const navMinX = Math.min(contentMinX - paddingX, visibleWorldMinX);
  const navMaxX = Math.max(contentMaxX + paddingX, visibleWorldMaxX);
  const navMinY = Math.min(contentMinY - paddingY, visibleWorldMinY);
  const navMaxY = Math.max(contentMaxY + paddingY, visibleWorldMaxY);

  const totalNavWidth = Math.max(1, navMaxX - navMinX);
  const totalNavHeight = Math.max(1, navMaxY - navMinY);

  const visibleWidth = Math.max(1, visibleWorldMaxX - visibleWorldMinX);
  const visibleHeight = Math.max(1, visibleWorldMaxY - visibleWorldMinY);

  const trackWidth = Math.max(20, vW - SCROLLBAR_SIZE);
  const trackHeight = Math.max(20, vH - SCROLLBAR_SIZE);

  const fracX = Math.min(1, visibleWidth / totalNavWidth);
  const fracY = Math.min(1, visibleHeight / totalNavHeight);

  const thumbWidth = Math.max(30, Math.min(trackWidth, trackWidth * fracX));
  const thumbHeight = Math.max(30, Math.min(trackHeight, trackHeight * fracY));

  const travelTrackX = Math.max(1, trackWidth - thumbWidth);
  const travelTrackY = Math.max(1, trackHeight - thumbHeight);

  const travelWorldX = totalNavWidth - visibleWidth;
  const travelWorldY = totalNavHeight - visibleHeight;

  const ratioX = travelWorldX > 0 ? Math.min(1, Math.max(0, (visibleWorldMinX - navMinX) / travelWorldX)) : 0;
  const ratioY = travelWorldY > 0 ? Math.min(1, Math.max(0, (visibleWorldMinY - navMinY) / travelWorldY)) : 0;

  const thumbLeft = ratioX * travelTrackX;
  const thumbTop = ratioY * travelTrackY;

  // Show rules:
  // Scrollbars are active when content extends beyond visible area,
  // or user has navigated away from centered position, or zoom is zoomed in/out
  const contentExtendsH = contentMinX < visibleWorldMinX - 10 || contentMaxX > visibleWorldMaxX + 10;
  const contentExtendsV = contentMinY < visibleWorldMinY - 10 || contentMaxY > visibleWorldMaxY + 10;
  const isNavigatedH = Math.abs(ratioX - 0.5) > 0.05 && fracX < 0.95;
  const isNavigatedV = Math.abs(ratioY - 0.5) > 0.05 && fracY < 0.95;

  const showH = (contentExtendsH || isNavigatedH || fracX < 0.90) && hasContent;
  const showV = (contentExtendsV || isNavigatedV || fracY < 0.90) && hasContent;

  return {
    contentMinX,
    contentMaxX,
    contentMinY,
    contentMaxY,
    navMinX,
    navMaxX,
    navMinY,
    navMaxY,
    visibleWorldMinX,
    visibleWorldMaxX,
    visibleWorldMinY,
    visibleWorldMaxY,
    totalNavWidth,
    totalNavHeight,
    visibleWidth,
    visibleHeight,
    fracX,
    fracY,
    thumbWidth,
    thumbHeight,
    thumbLeft,
    thumbTop,
    travelTrackX,
    travelTrackY,
    travelWorldX,
    travelWorldY,
    ratioX,
    ratioY,
    showH,
    showV,
  };
}

export const WorkspaceScrollbars: React.FC<WorkspaceScrollbarsProps> = ({
  circuit,
  pan,
  zoom,
  viewportWidth,
  viewportHeight,
  onPanChange,
  workbenchMode = 'trainer',
  isSchematicMode = false,
}) => {
  const isDraggingHRef = useRef(false);
  const isDraggingVRef = useRef(false);

  const bounds = useMemo(() => {
    return calculateNavigableBounds(
      circuit,
      pan,
      zoom,
      viewportWidth,
      viewportHeight,
      workbenchMode,
      isSchematicMode
    );
  }, [circuit, pan, zoom, viewportWidth, viewportHeight, workbenchMode, isSchematicMode]);

  // Dragging horizontal thumb
  const handleThumbMouseDownH = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingHRef.current = true;
      const startClientX = e.clientX;
      const startPanX = pan.x;
      const { travelTrackX, travelWorldX } = bounds;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingHRef.current) return;
        const deltaPx = moveEvent.clientX - startClientX;
        if (travelTrackX <= 0) return;
        const deltaRatio = deltaPx / travelTrackX;
        const deltaWorld = deltaRatio * travelWorldX;
        const newPanX = startPanX - deltaWorld * zoom;
        onPanChange({ x: newPanX, y: pan.y });
      };

      const onMouseUp = () => {
        isDraggingHRef.current = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [bounds, pan, zoom, onPanChange]
  );

  // Dragging vertical thumb
  const handleThumbMouseDownV = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingVRef.current = true;
      const startClientY = e.clientY;
      const startPanY = pan.y;
      const { travelTrackY, travelWorldY } = bounds;

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingVRef.current) return;
        const deltaPx = moveEvent.clientY - startClientY;
        if (travelTrackY <= 0) return;
        const deltaRatio = deltaPx / travelTrackY;
        const deltaWorld = deltaRatio * travelWorldY;
        const newPanY = startPanY - deltaWorld * zoom;
        onPanChange({ x: pan.x, y: newPanY });
      };

      const onMouseUp = () => {
        isDraggingVRef.current = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [bounds, pan, zoom, onPanChange]
  );

  // Clicking horizontal track
  const handleTrackClickH = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('.workspace-scrollbar-thumb')) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const { thumbLeft, thumbWidth, visibleWidth } = bounds;
      const pageStep = visibleWidth * 0.75 * zoom;

      if (clickX < thumbLeft) {
        onPanChange({ x: pan.x + pageStep, y: pan.y });
      } else if (clickX > thumbLeft + thumbWidth) {
        onPanChange({ x: pan.x - pageStep, y: pan.y });
      }
    },
    [bounds, pan, zoom, onPanChange]
  );

  // Clicking vertical track
  const handleTrackClickV = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('.workspace-scrollbar-thumb')) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const { thumbTop, thumbHeight, visibleHeight } = bounds;
      const pageStep = visibleHeight * 0.75 * zoom;

      if (clickY < thumbTop) {
        onPanChange({ x: pan.x, y: pan.y + pageStep });
      } else if (clickY > thumbTop + thumbHeight) {
        onPanChange({ x: pan.x, y: pan.y - pageStep });
      }
    },
    [bounds, pan, zoom, onPanChange]
  );

  // Keyboard navigation for horizontal scrollbar
  const handleKeyDownH = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 50 * zoom;
      const pageStep = bounds.visibleWidth * 0.75 * zoom;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPanChange({ x: pan.x + step, y: pan.y });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onPanChange({ x: pan.x - step, y: pan.y });
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        onPanChange({ x: pan.x + pageStep, y: pan.y });
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        onPanChange({ x: pan.x - pageStep, y: pan.y });
      }
    },
    [bounds, pan, zoom, onPanChange]
  );

  // Keyboard navigation for vertical scrollbar
  const handleKeyDownV = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 50 * zoom;
      const pageStep = bounds.visibleHeight * 0.75 * zoom;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onPanChange({ x: pan.x, y: pan.y + step });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onPanChange({ x: pan.x, y: pan.y - step });
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        onPanChange({ x: pan.x, y: pan.y + pageStep });
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        onPanChange({ x: pan.x, y: pan.y - pageStep });
      }
    },
    [bounds, pan, zoom, onPanChange]
  );

  const valueNowH = Math.round(bounds.ratioX * 100);
  const valueNowV = Math.round(bounds.ratioY * 100);

  return (
    <>
      {/* Horizontal Scrollbar (Bottom) */}
      <div
        className={`workspace-scrollbar-horizontal ${bounds.showH ? 'visible' : 'workspace-scrollbar-hidden'}`}
        data-testid="workspace-scrollbar-h"
        onClick={handleTrackClickH}
        title="Workspace Horizontal Scroll"
      >
        <div
          className="workspace-scrollbar-thumb horizontal-thumb"
          data-testid="scrollbar-thumb-h"
          role="scrollbar"
          aria-orientation="horizontal"
          aria-valuenow={valueNowH}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={bounds.showH ? 0 : -1}
          style={{
            left: `${bounds.thumbLeft}px`,
            width: `${bounds.thumbWidth}px`,
            height: '8px',
            top: '2px',
          }}
          onMouseDown={handleThumbMouseDownH}
          onKeyDown={handleKeyDownH}
        />
      </div>

      {/* Vertical Scrollbar (Right) */}
      <div
        className={`workspace-scrollbar-vertical ${bounds.showV ? 'visible' : 'workspace-scrollbar-hidden'}`}
        data-testid="workspace-scrollbar-v"
        onClick={handleTrackClickV}
        title="Workspace Vertical Scroll"
      >
        <div
          className="workspace-scrollbar-thumb vertical-thumb"
          data-testid="scrollbar-thumb-v"
          role="scrollbar"
          aria-orientation="vertical"
          aria-valuenow={valueNowV}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={bounds.showV ? 0 : -1}
          style={{
            top: `${bounds.thumbTop}px`,
            height: `${bounds.thumbHeight}px`,
            width: '8px',
            left: '2px',
          }}
          onMouseDown={handleThumbMouseDownV}
          onKeyDown={handleKeyDownV}
        />
      </div>

      {/* Corner Junction */}
      {(bounds.showH || bounds.showV) && <div className="workspace-scrollbar-corner" />}
    </>
  );
};
