import React, { useRef, useCallback, useEffect } from 'react';
import type { Circuit, ComponentType, CustomICDefinition, Wire } from '../types/circuit';
import { GateComponent } from './GateComponent';
import { WireRenderer } from './WireRenderer';
import { TrainerBoard } from './TrainerBoard';
import { VerticalToolbar } from './VerticalToolbar';
import { soundFx } from '../audio/soundEffects';
import { calculateZoomAtPoint, screenToWorld, type Point } from '../hooks/useViewport';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import { useWireInteraction } from '../hooks/useWireInteraction';

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

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = React.useState<{
    visible: boolean;
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const world = screenToWorldCoord({ x: e.clientX, y: e.clientY });
    setContextMenu({
      visible: true,
      screenX: Math.min(e.clientX, window.innerWidth - 200),
      screenY: Math.min(e.clientY, window.innerHeight - 240),
      worldX: Math.round(world.x),
      worldY: Math.round(world.y),
    });
  };

  // Compound Mouse Handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (contextMenu) setContextMenu(null);
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
        selectedWireId={selectedWireId || null}
        onDeleteSelectedWire={() => {
          if (selectedWireId) {
            onDeleteWire(selectedWireId);
            soundFx.playButtonTap();
          }
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

      {/* Right-Click Context Menu (Fixed in screen coordinates) */}
      {contextMenu?.visible && (
        <div
          className="canvas-context-menu"
          style={{
            left: `${contextMenu.screenX}px`,
            top: `${contextMenu.screenY}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              onPasteAtPosition?.({ x: contextMenu.worldX, y: contextMenu.worldY });
              setContextMenu(null);
            }}
          >
            <span>📋 Paste Here</span>
            <span className="context-menu-shortcut">Ctrl+V</span>
          </button>

          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              onCopy?.();
              setContextMenu(null);
            }}
          >
            <span>📄 Copy Selection</span>
            <span className="context-menu-shortcut">Ctrl+C</span>
          </button>

          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              onSelectAll?.();
              setContextMenu(null);
            }}
          >
            <span>🔲 Select All</span>
            <span className="context-menu-shortcut">Ctrl+A</span>
          </button>

          <div className="context-menu-divider" />

          {onAddTrainerBoard && (
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                onAddTrainerBoard();
                setContextMenu(null);
              }}
            >
              <span>🎓 + Add Trainer Board</span>
            </button>
          )}

          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              onToggleLibrary();
              setContextMenu(null);
            }}
          >
            <span>📦 Add Components & ICs</span>
          </button>

          {(selectedCompId || selectedWireId || isAllSelected) && (
            <button
              type="button"
              className="context-menu-item danger"
              onClick={() => {
                onDeleteSelected?.();
                setContextMenu(null);
              }}
            >
              <span>🗑️ Delete Selected</span>
              <span className="context-menu-shortcut">Del</span>
            </button>
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
            selectedBoardId={selectedBoardId}
            selectedModuleId={selectedModuleId}
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
            onSelect={(id, e) => handleComponentDragStart(id, e)}
            onPinMouseDown={handlePinMouseDown}
            onPinMouseUp={handlePinMouseUp}
            onToggleSwitch={onToggleSwitch}
            onButtonPress={onButtonPress}
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
    </div>
  );
};

export default Canvas;
