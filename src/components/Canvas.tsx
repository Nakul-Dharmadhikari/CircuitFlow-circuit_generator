import React, { useRef, useCallback, useEffect } from 'react';
import type { Circuit, CircuitComponent, ComponentType, CustomICDefinition, Wire } from '../types/circuit';
import type { TrainerBoardModel, TrainerModuleConfig } from '../engine/trainer/trainerBoardModel';
import { GateComponent } from './GateComponent';
import { WireRenderer } from './WireRenderer';
import { TrainerBoard } from './TrainerBoard';
import { VerticalToolbar } from './VerticalToolbar';
import { soundFx } from '../audio/soundEffects';
import { calculateZoomAtPoint, screenToWorld, type Point } from '../hooks/useViewport';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { useWireInteraction } from '../hooks/useWireInteraction';
import { WorkspaceScrollbars } from './WorkspaceScrollbars';

interface CanvasProps {
  circuit: Circuit;
  selectedCompId: string | null;
  selectedCompIds?: string[];
  selectedWireId?: string | null;
  selectedBoardIndex?: number | null;
  isAllSelected?: boolean;
  showGrid?: boolean;
  onSelectComponent: (id: string | null) => void;
  onSelectMultipleComponents?: (ids: string[]) => void;
  onSelectWire?: (wireId: string | null) => void;
  onSelectBoard?: (boardIndexOrId: any) => void;
  onUpdateComponentPosition: (id: string, x: number, y: number) => void;
  onUpdateMultipleComponentPositions?: (updates: Array<{ id: string; x: number; y: number }>) => void;
  onDragStart?: (compId: string) => void;
  onDragEnd?: (compId: string) => void;
  onBoardDragStart?: (boardIndex: number) => void;
  onBoardDragEnd?: (boardIndex: number) => void;
  onAddWire: (wire: Wire) => void;
  onDeleteWire: (wireId: string) => void;
  onBranchWire?: (
    wireId: string,
    x: number,
    y: number,
    connectFrom?: { compId: string; pinId: string; pinType: 'input' | 'output' }
  ) => void;
  onToggleSwitch: (id: string) => void;
  onButtonPress: (id: string, pressed: boolean) => void;
  onOpenICPicker?: (baseIndex: number) => void;
  isLibraryOpen: boolean;
  onToggleLibrary: () => void;
  onSelectAll?: () => void;
  onCopy?: () => void;
  onCopyBoard?: (boardIndex: number) => void;
  onPasteAtPosition?: (pos: { x: number; y: number }) => void;
  onDeleteSelected?: () => void;
  onRotateComponent?: (id: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onAddTrainerBoard?: () => void;
  onRemoveTrainerBoard?: (boardIndex: number) => void;
  onMouseMoveWorld?: (pos: { x: number; y: number }) => void;
  workbenchMode?: 'trainer' | 'freeform';
  zoom: number;
  pan: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  isSchematicMode?: boolean;
  onAddModule?: () => void;
  onRemoveModule?: (moduleId?: string) => void;
  onSelectModule?: (moduleId: string | null) => void;
  selectedBoardId?: string | null;
  selectedModuleId?: string | null;
  onDropComponent?: (type: ComponentType, pos: { x: number; y: number }) => void;
  onDropCustomIC?: (ic: CustomICDefinition, pos: { x: number; y: number }) => void;
  onFitCircuit?: () => void;
  onToggleGrid?: () => void;
  onRequestEjectIC?: (baseIndex: number, compId: string) => void;
  onRequestDeleteComponent?: (compId: string) => void;
  onRequestDeleteSelected?: () => void;
  onRequestRemoveModule?: (boardId: string, moduleId: string) => void;
  onRequestRemoveBoard?: (boardIndex: number, boardId: string) => void;
  onTogglePower?: () => void;
  onOpenCustomICStudio?: (comp: CircuitComponent) => void;
  onToggleLockComponent?: (compId: string) => void;
  pendingPlacementType?: ComponentType | null;
  onClearPendingPlacement?: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  circuit,
  selectedCompId,
  selectedCompIds = [],
  selectedWireId,
  selectedBoardIndex = null,
  isAllSelected,
  showGrid = true,
  onSelectComponent,
  onSelectMultipleComponents,
  onSelectWire,
  onSelectBoard,
  onUpdateComponentPosition,
  onUpdateMultipleComponentPositions,
  onDragStart,
  onDragEnd,
  onBoardDragStart,
  onBoardDragEnd,
  onAddWire,
  onDeleteWire,
  onBranchWire,
  onToggleSwitch,
  onButtonPress,
  onOpenICPicker,
  isLibraryOpen,
  onToggleLibrary,
  onSelectAll,
  onCopy,
  onCopyBoard,
  onPasteAtPosition,
  onDeleteSelected,
  onRotateComponent,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onAddTrainerBoard,
  onRemoveTrainerBoard,
  onMouseMoveWorld,
  workbenchMode = 'trainer',
  zoom,
  pan,
  onPanChange,
  onZoomChange,
  isSchematicMode = false,
  onAddModule,
  onRemoveModule,
  onSelectModule,
  selectedBoardId,
  selectedModuleId,
  onDropComponent,
  onDropCustomIC,
  onFitCircuit,
  onToggleGrid,
  onRequestEjectIC,
  onRequestDeleteComponent,
  onRequestDeleteSelected,
  onRequestRemoveModule,
  onRequestRemoveBoard,
  onTogglePower,
  onOpenCustomICStudio,
  onToggleLockComponent,
  pendingPlacementType,
  onClearPendingPlacement,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseWorldPosRef = useRef<Point>({ x: 300, y: 300 });

  // Coordinate Conversion Helpers (Screen <-> World)
  const screenToWorldCoord = useCallback(
    (screenPt: Point): Point => {
      const rect = containerRef.current?.getBoundingClientRect() || null;
      return screenToWorld(screenPt, { x: pan.x, y: pan.y, zoom }, rect);
    },
    [pan, zoom]
  );

  // Pan by Delta Helper
  const handlePanByDelta = useCallback(
    (deltaX: number, deltaY: number) => {
      onPanChange({ x: pan.x + deltaX, y: pan.y + deltaY });
    },
    [pan, onPanChange]
  );

  // Canvas Interactions Hook (Pan, Drag, Marquee Selection)
  const {
    toolMode,
    setToolMode,
    isSpacePressed,
    isPanning,
    marqueeBox,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleComponentDragStart,
    handleBoardDragStart,
  } = useCanvasInteraction({
    components: circuit.components,
    selectedCompId,
    selectedCompIds,
    selectedBoardIndex,
    onSelectComponent,
    onSelectMultipleComponents,
    onSelectBoard,
    onUpdateComponentPosition,
    onUpdateMultipleComponentPositions,
    onDragStart,
    onDragEnd,
    onBoardDragStart,
    onBoardDragEnd,
    screenToWorld: screenToWorldCoord,
    onPanByDelta: handlePanByDelta,
    onDeleteSelected,
    onRotateComponent,
    onFitCircuit,
    onToggleGrid,
  });

  // Wire Interactions Hook (Creation, Routing Preview, Junctions)
  const {
    inProgressWire,
    handlePinMouseDown,
    handlePinMouseUp,
    updateInProgressWire,
    handleCanvasMouseUpForWire,
    handleWireDoubleClick,
    handleWireMouseUp,
  } = useWireInteraction({
    wires: circuit.wires,
    components: circuit.components,
    onAddWire,
    onBranchWire,
    screenToWorld: screenToWorldCoord,
  });

  // Wheel Zoom with Cursor Anchoring (Zero Browser Page Scrolling - passive: false)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
      const targetZoom = zoom * zoomFactor;

      const rect = el.getBoundingClientRect();
      const nextVp = calculateZoomAtPoint(
        { x: e.clientX, y: e.clientY },
        targetZoom,
        { x: pan.x, y: pan.y, zoom },
        rect
      );
      onPanChange({ x: nextVp.x, y: nextVp.y });
      onZoomChange(nextVp.zoom);
    };

    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheelNative);
    };
  }, [zoom, pan, onPanChange, onZoomChange]);

  // Viewport Container Size Measurement for Phase 4 Workspace Scrollbars
  const [viewportSize, setViewportSize] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1600,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize({
        width: Math.max(100, rect.width || window.innerWidth),
        height: Math.max(100, rect.height || window.innerHeight),
      });
    };

    measure();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Unified Right-Click Context Menu State (Phase 3)
  type ActiveContextMenu =
    | { type: 'canvas'; screenX: number; screenY: number; worldX: number; worldY: number }
    | { type: 'component'; screenX: number; screenY: number; component: CircuitComponent }
    | { type: 'wire'; screenX: number; screenY: number; wire: Wire }
    | { type: 'board'; screenX: number; screenY: number; board: TrainerBoardModel; boardIndex: number }
    | { type: 'module'; screenX: number; screenY: number; board: TrainerBoardModel; module: TrainerModuleConfig }
    | null;

  const [activeContextMenu, setActiveContextMenu] = React.useState<ActiveContextMenu>(null);

  // Viewport-safe Context Menu clamping helper
  const clampMenuPosition = useCallback((clientX: number, clientY: number, width = 240, height = 310) => {
    const pad = 12;
    const topPad = 64; // Clear top app navigation bar
    const maxX = Math.max(pad, window.innerWidth - width - pad);
    const maxY = Math.max(topPad, window.innerHeight - height - pad);
    return {
      x: Math.min(Math.max(pad, clientX), maxX),
      y: Math.min(Math.max(topPad, clientY), maxY),
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    const pos = clampMenuPosition(e.clientX, e.clientY, 230, 310);
    const world = screenToWorldCoord({ x: e.clientX, y: e.clientY });
    setActiveContextMenu({
      type: 'canvas',
      screenX: pos.x,
      screenY: pos.y,
      worldX: Math.round(world.x),
      worldY: Math.round(world.y),
    });
  };

  const handleComponentContextMenu = (comp: CircuitComponent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectComponent(comp.id);
    const pos = clampMenuPosition(e.clientX, e.clientY, 240, 290);
    setActiveContextMenu({
      type: 'component',
      screenX: pos.x,
      screenY: pos.y,
      component: comp,
    });
  };

  const handleWireContextMenu = (wire: Wire, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectWire?.(wire.id);
    const pos = clampMenuPosition(e.clientX, e.clientY, 220, 220);
    setActiveContextMenu({
      type: 'wire',
      screenX: pos.x,
      screenY: pos.y,
      wire,
    });
  };

  const handleBoardContextMenu = (board: TrainerBoardModel, boardIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectBoard?.(board.id || boardIndex);
    const pos = clampMenuPosition(e.clientX, e.clientY, 240, 290);
    setActiveContextMenu({
      type: 'board',
      screenX: pos.x,
      screenY: pos.y,
      board,
      boardIndex,
    });
  };

  const handleModuleContextMenu = (board: TrainerBoardModel, module: TrainerModuleConfig, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectModule?.(module.id);
    const pos = clampMenuPosition(e.clientX, e.clientY, 240, 270);
    setActiveContextMenu({
      type: 'module',
      screenX: pos.x,
      screenY: pos.y,
      board,
      module,
    });
  };

  // Safe dismiss with Escape and clicking outside
  useEffect(() => {
    if (!activeContextMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveContextMenu(null);
      }
    };
    const handleClickAway = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('.canvas-context-menu')) {
        setActiveContextMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickAway);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickAway);
    };
  }, [activeContextMenu]);

  // Compound Mouse Handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (activeContextMenu) setActiveContextMenu(null);

    // If a component was selected from library for placement, click on canvas places it
    if (pendingPlacementType && e.button === 0 && !isSpacePressed && toolMode !== 'pan') {
      const world = screenToWorldCoord({ x: e.clientX, y: e.clientY });
      const snappedPos = {
        x: Math.round(world.x / 10) * 10,
        y: Math.round(world.y / 10) * 10,
      };
      onDropComponent?.(pendingPlacementType, snappedPos);
      onClearPendingPlacement?.();
      return;
    }

    handleCanvasMouseDown(e);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const world = screenToWorldCoord({ x: e.clientX, y: e.clientY });
    mouseWorldPosRef.current = world;
    onMouseMoveWorld?.(world);

    handleCanvasMouseMove(e);
    if (inProgressWire) {
      updateInProgressWire(e.clientX, e.clientY);
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    handleCanvasMouseUp(e);
    if (inProgressWire) {
      handleCanvasMouseUpForWire(e.clientX, e.clientY);
    }
  };

  // HTML5 Drag and Drop handlers for Library items
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const world = screenToWorldCoord({ x: e.clientX, y: e.clientY });
    const snappedPos = {
      x: Math.round(world.x / 10) * 10,
      y: Math.round(world.y / 10) * 10,
    };

    const compType = e.dataTransfer.getData('application/circuitflow-component') as ComponentType;
    if (compType) {
      onDropComponent?.(compType, snappedPos);
      return;
    }

    const customIcRaw = e.dataTransfer.getData('application/circuitflow-custom-ic');
    if (customIcRaw) {
      try {
        const ic = JSON.parse(customIcRaw) as CustomICDefinition;
        onDropCustomIC?.(ic, snappedPos);
      } catch {
        // ignore parse error
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`canvas-viewport ${isPanning || isSpacePressed || toolMode === 'pan' ? 'panning' : ''}`}
      style={{
        backgroundImage: showGrid
          ? 'radial-gradient(var(--grid-dot-color) var(--grid-dot-size), transparent var(--grid-dot-size))'
          : 'none',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Floating Left Workbench CAD Toolbar (Fixed, never zooms) */}
      <VerticalToolbar
        interactionMode={toolMode}
        onSetInteractionMode={(mode) => {
          setToolMode(mode);
          soundFx.playButtonTap();
        }}
        isLibraryOpen={isLibraryOpen}
        onToggleLibrary={() => {
          onToggleLibrary();
          soundFx.playButtonTap();
        }}
        onSelectAll={() => {
          onSelectAll?.();
          soundFx.playButtonTap();
        }}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => {
          onUndo?.();
          soundFx.playButtonTap();
        }}
        onRedo={() => {
          onRedo?.();
          soundFx.playButtonTap();
        }}
        onAddTrainerBoard={onAddTrainerBoard}
        onPaste={() => onPasteAtPosition?.(mouseWorldPosRef.current)}
      />

      {/* 1. Empty Canvas Right-Click Context Menu */}
      {activeContextMenu?.type === 'canvas' && (
        <div
          className="canvas-context-menu empty-canvas-menu"
          style={{
            left: `${activeContextMenu.screenX}px`,
            top: `${activeContextMenu.screenY}px`,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            <span className="context-menu-title">CANVAS ACTIONS</span>
          </div>
          <div className="context-menu-divider" />

          {onPasteAtPosition && (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                onPasteAtPosition({ x: activeContextMenu.worldX, y: activeContextMenu.worldY });
                setActiveContextMenu(null);
              }}
            >
              <span>📋 Paste Here</span>
              <span className="context-menu-shortcut">Ctrl+V</span>
            </button>
          )}

          {onSelectAll && (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                onSelectAll();
                setActiveContextMenu(null);
              }}
            >
              <span>🎯 Select All</span>
              <span className="context-menu-shortcut">Ctrl+A</span>
            </button>
          )}

          {onFitCircuit && (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                onFitCircuit();
                setActiveContextMenu(null);
              }}
            >
              <span>🔍 Fit Circuit to Screen</span>
              <span className="context-menu-shortcut">F</span>
            </button>
          )}

          {onToggleGrid && (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                onToggleGrid();
                setActiveContextMenu(null);
              }}
            >
              <span>▦ Toggle Grid</span>
              <span className="context-menu-shortcut">G</span>
            </button>
          )}

          <div className="context-menu-divider" />

          {onAddTrainerBoard && (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                onAddTrainerBoard();
                setActiveContextMenu(null);
              }}
            >
              <span>➕ Add Hardware Trainer</span>
            </button>
          )}

          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              onToggleLibrary();
              setActiveContextMenu(null);
            }}
          >
            <span>📦 Add Components & ICs</span>
          </button>

          {(selectedCompIds.length > 0 || selectedCompId || selectedWireId) && (
            <>
              <div className="context-menu-divider" />
              <button
                type="button"
                className="context-menu-item danger"
                onClick={() => {
                  if (selectedCompIds.length > 1) {
                    onRequestDeleteSelected?.();
                  } else if (selectedCompId) {
                    onRequestDeleteComponent?.(selectedCompId);
                  } else if (selectedWireId) {
                    onDeleteWire(selectedWireId);
                  }
                  setActiveContextMenu(null);
                }}
              >
                <span>🗑️ Delete Selected</span>
                <span className="context-menu-shortcut">Del</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* 2. Component Context Menu (Mounted IC, Custom IC, or Ordinary Component) */}
      {activeContextMenu?.type === 'component' && (() => {
        const comp = activeContextMenu.component;
        const isMounted = Boolean(comp.customProps?.trainerMount);
        const isCustomIC = Boolean(comp.customProps?.isCustomIC || comp.type === 'custom_ic');

        if (isMounted) {
          return (
            <div
              className="canvas-context-menu component-context-menu mounted-ic-menu"
              style={{
                left: `${activeContextMenu.screenX}px`,
                top: `${activeContextMenu.screenY}px`,
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="context-menu-header">
                <span className="context-menu-title">
                  📌 {comp.label} ({comp.customProps?.trainerMount?.slotLabel || 'Mounted'})
                </span>
              </div>
              <div className="context-menu-divider" />

              <button
                type="button"
                className="context-menu-item"
                onClick={() => {
                  onSelectComponent(comp.id);
                  setActiveContextMenu(null);
                }}
              >
                <span>🔍 Inspect Properties</span>
              </button>

              <button
                type="button"
                className="context-menu-item"
                onClick={() => {
                  onSelectComponent(comp.id);
                  setActiveContextMenu(null);
                }}
              >
                <span>📋 View Pinout</span>
              </button>

              {isCustomIC && onOpenCustomICStudio && (
                <button
                  type="button"
                  className="context-menu-item"
                  onClick={() => {
                    onOpenCustomICStudio(comp);
                    setActiveContextMenu(null);
                  }}
                >
                  <span>🧩 Open Internal Logic</span>
                </button>
              )}

              <div className="context-menu-divider" />

              <button
                type="button"
                className="context-menu-item danger eject-ic-item"
                onClick={() => {
                  const mount = comp.customProps?.trainerMount;
                  const baseIndex = mount?.baseIndex ?? 0;
                  onRequestEjectIC?.(baseIndex, comp.id);
                  setActiveContextMenu(null);
                }}
              >
                <span>⏏ Eject IC from Socket</span>
              </button>
            </div>
          );
        }

        return (
          <div
            className="canvas-context-menu component-context-menu"
            style={{
              left: `${activeContextMenu.screenX}px`,
              top: `${activeContextMenu.screenY}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="context-menu-header">
              <span className="context-menu-title">
                {isCustomIC ? `🧩 ${comp.label} (Custom IC)` : `⚡ ${comp.label}`}
              </span>
            </div>
            <div className="context-menu-divider" />

            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                onSelectComponent(comp.id);
                setActiveContextMenu(null);
              }}
            >
              <span>🔍 Inspect Properties</span>
            </button>

            {!comp.isTrainerFixed && onRotateComponent && (
              <button
                type="button"
                className="context-menu-item"
                onClick={() => {
                  onRotateComponent(comp.id);
                  setActiveContextMenu(null);
                }}
              >
                <span>🔄 Rotate 90°</span>
                <span className="context-menu-shortcut">R</span>
              </button>
            )}

            {!comp.isTrainerFixed && onCopy && (
              <button
                type="button"
                className="context-menu-item"
                onClick={() => {
                  onCopy();
                  setActiveContextMenu(null);
                }}
              >
                <span>📄 Duplicate</span>
                <span className="context-menu-shortcut">Ctrl+C</span>
              </button>
            )}

            {isCustomIC && onOpenCustomICStudio && (
              <button
                type="button"
                className="context-menu-item"
                onClick={() => {
                  onOpenCustomICStudio(comp);
                  setActiveContextMenu(null);
                }}
              >
                <span>🧩 Open Internal Logic</span>
              </button>
            )}

            {onToggleLockComponent && !comp.isTrainerFixed && (
              <button
                type="button"
                className="context-menu-item"
                onClick={() => {
                  onToggleLockComponent(comp.id);
                  setActiveContextMenu(null);
                }}
              >
                <span>{comp.customProps?.locked ? '🔓 Unlock Component' : '🔒 Lock Component'}</span>
              </button>
            )}

            {!comp.isTrainerFixed && (
              <>
                <div className="context-menu-divider" />
                <button
                  type="button"
                  className="context-menu-item danger remove-component-item"
                  onClick={() => {
                    if (onRequestDeleteComponent) {
                      onRequestDeleteComponent(comp.id);
                    } else {
                      onDeleteSelected?.();
                    }
                    setActiveContextMenu(null);
                  }}
                >
                  <span>🗑️ Remove Component</span>
                  <span className="context-menu-shortcut">Del</span>
                </button>
              </>
            )}
          </div>
        );
      })()}

      {/* 3. Wire Context Menu */}
      {activeContextMenu?.type === 'wire' && (
        <div
          className="canvas-context-menu wire-context-menu"
          style={{
            left: `${activeContextMenu.screenX}px`,
            top: `${activeContextMenu.screenY}px`,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            <span className="context-menu-title">⚡ WIRE ({activeContextMenu.wire.value})</span>
          </div>
          <div className="context-menu-divider" />

          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              onSelectWire?.(activeContextMenu.wire.id);
              setActiveContextMenu(null);
            }}
          >
            <span>🔍 Inspect Wire</span>
          </button>

          {onBranchWire && (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                const world = screenToWorldCoord({ x: activeContextMenu.screenX, y: activeContextMenu.screenY });
                onBranchWire(
                  activeContextMenu.wire.id,
                  Math.round(world.x / 10) * 10,
                  Math.round(world.y / 10) * 10
                );
                setActiveContextMenu(null);
              }}
            >
              <span>➕ Add Junction</span>
            </button>
          )}

          <div className="context-menu-divider" />

          <button
            type="button"
            className="context-menu-item danger remove-wire-item"
            onClick={() => {
              onDeleteWire(activeContextMenu.wire.id);
              setActiveContextMenu(null);
            }}
          >
            <span className="context-menu-label">🗑️ Remove Wire</span>
            <span className="context-menu-shortcut">Del</span>
          </button>
        </div>
      )}

      {/* 4. Trainer Board Context Menu */}
      {activeContextMenu?.type === 'board' && (
        <div
          className="canvas-context-menu board-context-menu"
          style={{
            left: `${activeContextMenu.screenX}px`,
            top: `${activeContextMenu.screenY}px`,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            <span className="context-menu-title">
              📟 {activeContextMenu.board.name || `Trainer Board #${activeContextMenu.boardIndex + 1}`}
            </span>
          </div>
          <div className="context-menu-divider" />

          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              onSelectBoard?.(activeContextMenu.board.id || activeContextMenu.boardIndex);
              setActiveContextMenu(null);
            }}
          >
            <span>🔍 Inspect Board</span>
          </button>

          {onCopyBoard && (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                onCopyBoard(activeContextMenu.boardIndex);
                setActiveContextMenu(null);
              }}
            >
              <span>📋 Duplicate Board</span>
            </button>
          )}

          {onAddModule && (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                onAddModule();
                setActiveContextMenu(null);
              }}
            >
              <span>➕ Extend Board (+ Module)</span>
            </button>
          )}

          {onTogglePower && (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                onTogglePower();
                setActiveContextMenu(null);
              }}
            >
              <span>⚡ Toggle Power (DC 5V)</span>
            </button>
          )}

          {(circuit.trainerBoards?.length || 1) > 1 && (
            <>
              <div className="context-menu-divider" />
              <button
                type="button"
                className="context-menu-item danger remove-board-item"
                onClick={() => {
                  if (onRequestRemoveBoard) {
                    onRequestRemoveBoard(activeContextMenu.boardIndex, activeContextMenu.board.id);
                  } else if (onRemoveTrainerBoard) {
                    onRemoveTrainerBoard(activeContextMenu.boardIndex);
                  }
                  setActiveContextMenu(null);
                }}
              >
                <span>🗑️ Remove Trainer Board</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* 5. Trainer Module Context Menu */}
      {activeContextMenu?.type === 'module' && (
        <div
          className="canvas-context-menu module-context-menu"
          style={{
            left: `${activeContextMenu.screenX}px`,
            top: `${activeContextMenu.screenY}px`,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            <span className="context-menu-title">
              🧩 {activeContextMenu.module.name} (Slot #{activeContextMenu.module.index + 1})
            </span>
          </div>
          <div className="context-menu-divider" />

          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              onSelectModule?.(activeContextMenu.module.id);
              setActiveContextMenu(null);
            }}
          >
            <span>🔍 Inspect Module</span>
          </button>

          {onAddModule && (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                onAddModule();
                setActiveContextMenu(null);
              }}
            >
              <span>➕ Add Module</span>
            </button>
          )}

          {activeContextMenu.module.index > 0 && (
            <>
              <div className="context-menu-divider" />
              <button
                type="button"
                className="context-menu-item danger remove-module-item"
                onClick={() => {
                  if (onRequestRemoveModule) {
                    onRequestRemoveModule(activeContextMenu.board.id, activeContextMenu.module.id);
                  } else if (onRemoveModule) {
                    onRemoveModule(activeContextMenu.module.id);
                  }
                  setActiveContextMenu(null);
                }}
              >
                <span>✕ Remove Module</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Circuit World Transform Layer (Pure infinite world, affected by pan/zoom) */}
      <div
        className="canvas-transform-layer"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* Hardware Trainer Board (Outputs, Horizontal IC Sockets, Inputs, Expandable Modules) */}
        {!isSchematicMode && workbenchMode !== 'freeform' && (
          <TrainerBoard
            circuit={circuit}
            components={circuit.components}
            selectedBoardIndex={selectedBoardIndex}
            onSelectBoard={onSelectBoard}
            onOpenICPicker={onOpenICPicker}
            onRemoveBoard={onRemoveTrainerBoard}
            onStartDragBoard={handleBoardDragStart}
            onCopyBoard={onCopyBoard}
            onAddModule={onAddModule}
            onRemoveModule={onRemoveModule}
            onSelectModule={onSelectModule}
            onRequestEjectIC={onRequestEjectIC}
            onRequestRemoveModule={onRequestRemoveModule}
            onRequestRemoveBoard={onRequestRemoveBoard}
            onBoardContextMenu={handleBoardContextMenu}
            onModuleContextMenu={handleModuleContextMenu}
            selectedBoardId={selectedBoardId}
            selectedModuleId={selectedModuleId}
            isDeleteMode={toolMode === 'delete'}
          />
        )}

        {/* Orthogonal Manhattan Wire Paths */}
        <WireRenderer
          wires={
            workbenchMode === 'freeform'
              ? circuit.wires.filter(
                  (w) => !w.fromCompId.startsWith('trainer_') && !w.toCompId.startsWith('trainer_')
                )
              : circuit.wires
          }
          components={
            workbenchMode === 'freeform'
              ? circuit.components.filter((c) => !c.isTrainerFixed && !c.id.startsWith('trainer_'))
              : circuit.components
          }
          selectedWireId={selectedWireId}
          isAllSelected={isAllSelected}
          isDeleteMode={toolMode === 'delete'}
          isSchematicMode={isSchematicMode}
          inProgressWire={inProgressWire}
          onSelectWire={onSelectWire}
          onDeleteWire={onDeleteWire}
          onWireDoubleClick={handleWireDoubleClick}
          onWireMouseUp={handleWireMouseUp}
          onAddJunctionAtCoords={(wireId, x, y) => onBranchWire?.(wireId, x, y)}
          onWireContextMenu={handleWireContextMenu}
        />

        {/* Circuit Component Nodes */}
        {(workbenchMode === 'freeform'
          ? circuit.components.filter((c) => !c.isTrainerFixed && !c.id.startsWith('trainer_'))
          : circuit.components
        ).map((comp) => (
          <GateComponent
            key={comp.id}
            component={comp}
            isSelected={Boolean(
              isAllSelected ||
                comp.id === selectedCompId ||
                selectedCompIds.includes(comp.id)
            )}
            onSelect={(id, e) => {
              if (toolMode === 'delete') {
                e.stopPropagation();
                const target = circuit.components.find((c) => c.id === id);
                if (!target) return;
                if (target.isTrainerFixed && !target.customProps?.trainerMount) {
                  return;
                }
                if (target.customProps?.trainerMount) {
                  onRequestEjectIC?.(target.customProps.trainerMount.baseIndex, target.id);
                } else if (onRequestDeleteComponent) {
                  onRequestDeleteComponent(id);
                } else {
                  onDeleteSelected?.();
                }
                return;
              }
              handleComponentDragStart(id, e);
            }}
            onPinMouseDown={handlePinMouseDown}
            onPinMouseUp={handlePinMouseUp}
            onToggleSwitch={onToggleSwitch}
            onButtonPress={onButtonPress}
            onContextMenu={handleComponentContextMenu}
          />
        ))}

        {/* Marquee Selection Box Rectangle in World Coordinates */}
        {marqueeBox && (
          <div
            className="canvas-marquee-box"
            style={{
              left: `${marqueeBox.x}px`,
              top: `${marqueeBox.y}px`,
              width: `${marqueeBox.width}px`,
              height: `${marqueeBox.height}px`,
            }}
          />
        )}
      </div>

      {/* Workspace Navigation Scrollbars (Phase 4) */}
      <WorkspaceScrollbars
        circuit={circuit}
        pan={pan}
        zoom={zoom}
        viewportWidth={viewportSize.width}
        viewportHeight={viewportSize.height}
        onPanChange={onPanChange}
        workbenchMode={workbenchMode}
        isSchematicMode={isSchematicMode}
      />
    </div>
  );
};

export default Canvas;
