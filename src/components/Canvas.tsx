import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Circuit, Pin, Wire } from '../types/circuit';
import { GateComponent } from './GateComponent';
import { WireRenderer } from './WireRenderer';
import { TrainerBoard } from './TrainerBoard';
import { VerticalToolbar } from './VerticalToolbar';
import { soundFx } from '../audio/soundEffects';
import { TRAINER_BOARD_LAYOUT, getTrainerBoards } from '../engine/trainerKit';

interface InProgressWire {
  fromCompId: string;
  fromPinId: string;
  fromPinType: 'input' | 'output';
  toX: number;
  toY: number;
}

interface CanvasProps {
  circuit: Circuit;
  selectedCompId: string | null;
  selectedWireId?: string | null;
  selectedBoardIndex?: number | null;
  isAllSelected?: boolean;
  onSelectComponent: (id: string | null) => void;
  onSelectWire?: (wireId: string | null) => void;
  onSelectBoard?: (boardIndex: number | null) => void;
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
}

export const Canvas: React.FC<CanvasProps> = ({
  circuit,
  selectedCompId,
  selectedWireId,
  selectedBoardIndex = null,
  isAllSelected,
  onSelectComponent,
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseWorldPosRef = useRef<{ x: number; y: number }>({ x: 300, y: 300 });

  // Canvas interaction mode: 'wire' (default, locks parts) | 'move' (hand tool) | 'delete' (instant wire eraser)
  const [interactionMode, setInteractionMode] = useState<'wire' | 'move' | 'delete'>('wire');

  // Dragging states
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Wiring states
  const [inProgressWire, setInProgressWire] = useState<InProgressWire | null>(null);

  // Board Dragging states
  const [draggingBoardIndex, setDraggingBoardIndex] = useState<number | null>(null);
  const boardDragStartWorldRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const boardInitialCompPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const handleStartDragBoard = (boardIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectComponent(null);
    onSelectWire?.(null);
    onSelectBoard?.(boardIndex);

    const world = screenToWorld(e.clientX, e.clientY);
    boardDragStartWorldRef.current = world;

    const initialMap = new Map<string, { x: number; y: number }>();
    const prefix = boardIndex === 0 ? 'trainer_' : `trainer_b${boardIndex}_`;

    const boards = getTrainerBoards(circuit.components);
    const thisBoard = boards.find((b) => b.boardIndex === boardIndex);
    const bOffsetX = thisBoard?.offsetX ?? 0;
    const bOffsetY = thisBoard?.offsetY ?? boardIndex * 560;
    const bMinX = TRAINER_BOARD_LAYOUT.boardX + bOffsetX - 20;
    const bMaxX = bMinX + TRAINER_BOARD_LAYOUT.boardWidth + 40;
    const bMinY = TRAINER_BOARD_LAYOUT.boardY + bOffsetY - 20;
    const bMaxY = bMinY + TRAINER_BOARD_LAYOUT.boardHeight + 40;

    for (const c of circuit.components) {
      const isBoardComp =
        c.customProps?.boardIndex === boardIndex ||
        (boardIndex === 0 && c.id.startsWith('trainer_') && !c.id.match(/^trainer_b\d+_/)) ||
        c.id.startsWith(prefix) ||
        (c.x >= bMinX && c.x <= bMaxX && c.y >= bMinY && c.y <= bMaxY);

      if (isBoardComp) {
        initialMap.set(c.id, { x: c.x, y: c.y });
      }
    }

    boardInitialCompPositionsRef.current = initialMap;
    setDraggingBoardIndex(boardIndex);
    onBoardDragStart?.(boardIndex);
  };

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
  } | null>(null);

  // Convert mouse screen coordinates to canvas world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (screenX - rect.left - pan.x) / zoom;
      const y = (screenY - rect.top - pan.y) / zoom;
      return { x, y };
    },
    [pan, zoom]
  );

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.4), 2.5);

    // Zoom centered towards mouse pointer
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
      const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

      onPanChange({ x: newPanX, y: newPanY });
      onZoomChange(newZoom);
    }
  };

  // Right-click context menu handler
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const world = screenToWorld(e.clientX, e.clientY);
    setContextMenu({
      visible: true,
      screenX: Math.min(e.clientX, window.innerWidth - 200),
      screenY: Math.min(e.clientY, window.innerHeight - 240),
      worldX: Math.round(world.x),
      worldY: Math.round(world.y),
    });
  };

  // Canvas background click & pan start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (contextMenu) setContextMenu(null);

    if (e.button === 1 || e.altKey || (e.button === 0 && e.target === containerRef.current)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (e.target === containerRef.current) {
      onSelectComponent(null);
      onSelectWire?.(null);
      onSelectBoard?.(null);
      if (inProgressWire) {
        setInProgressWire(null);
      }
    }
  };

  // Helper to find the nearest connectable pin within a snap radius
  const findNearestPin = useCallback(
    (worldX: number, worldY: number, maxDist = 24, excludeCompId?: string, excludePinId?: string) => {
      let nearest: { compId: string; pin: Pin; x: number; y: number; dist: number } | null = null;
      for (const comp of circuit.components) {
        if (comp.id === excludeCompId && !excludePinId) continue;
        const allPins = [...comp.inputs, ...comp.outputs];
        for (const pin of allPins) {
          if (comp.id === excludeCompId && pin.id === excludePinId) continue;
          const pinWorldX = comp.x + pin.x;
          const pinWorldY = comp.y + pin.y;
          const dist = Math.hypot(worldX - pinWorldX, worldY - pinWorldY);
          if (dist < maxDist && (!nearest || dist < nearest.dist)) {
            nearest = { compId: comp.id, pin, x: pinWorldX, y: pinWorldY, dist };
          }
        }
      }
      return nearest;
    },
    [circuit.components]
  );

  // Component Drag Start - ONLY allowed in 'move' mode (Hand Tool)
  const handleComponentSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectWire?.(null);
    onSelectBoard?.(null);
    onSelectComponent(id);

    const comp = circuit.components.find((c) => c.id === id);
    if (!comp || comp.isTrainerFixed) return; // Prevent moving fixed trainer kit ports

    // When in Wire Mode or Delete Mode, components and ICs are firmly locked!
    if (interactionMode !== 'move') return;

    const world = screenToWorld(e.clientX, e.clientY);
    setDraggingCompId(id);
    setDragOffset({
      x: world.x - comp.x,
      y: world.y - comp.y,
    });
    onDragStart?.(id);
  };

  // Pin Connection Handlers - ONLY allowed in 'wire' mode
  const handlePinMouseDown = (pin: Pin, compId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (interactionMode !== 'wire') return;

    const world = screenToWorld(e.clientX, e.clientY);

    setInProgressWire({
      fromCompId: compId,
      fromPinId: pin.id,
      fromPinType: pin.type,
      toX: world.x,
      toY: world.y,
    });
    soundFx.playButtonTap();
  };

  const handlePinMouseUp = (pin: Pin, compId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!inProgressWire) return;

    // Do not connect a pin to itself or same component
    if (inProgressWire.fromCompId === compId && inProgressWire.fromPinId === pin.id) {
      setInProgressWire(null);
      return;
    }

    // Connect output to input or vice-versa
    let fromCompId = inProgressWire.fromCompId;
    let fromPinId = inProgressWire.fromPinId;
    let toCompId = compId;
    let toPinId = pin.id;

    // If user dragged from input to output, reverse direction for clean signal flow
    if (inProgressWire.fromPinType === 'input' && pin.type === 'output') {
      fromCompId = compId;
      fromPinId = pin.id;
      toCompId = inProgressWire.fromCompId;
      toPinId = inProgressWire.fromPinId;
    }

    // Check if wire already exists
    const exists = circuit.wires.some(
      (w) =>
        (w.fromCompId === fromCompId &&
          w.fromPinId === fromPinId &&
          w.toCompId === toCompId &&
          w.toPinId === toPinId) ||
        (w.fromCompId === toCompId &&
          w.fromPinId === toPinId &&
          w.toCompId === fromCompId &&
          w.toPinId === fromPinId)
    );

    if (!exists) {
      const newWire: Wire = {
        id: `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fromCompId,
        fromPinId,
        toCompId,
        toPinId,
        value: '0',
      };
      onAddWire(newWire);
      soundFx.playSwitchClick(true);
    }

    setInProgressWire(null);
  };

  // Mouse Move: Component Dragging & Wire Drawing with Smart Snapping
  const handleMouseMove = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    mouseWorldPosRef.current = world;
    onMouseMoveWorld?.(world);

    if (isPanning) {
      onPanChange({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // Dragging an entire Digital Trainer Board
    if (draggingBoardIndex !== null && boardInitialCompPositionsRef.current.size > 0) {
      const deltaX = world.x - boardDragStartWorldRef.current.x;
      const deltaY = world.y - boardDragStartWorldRef.current.y;
      const snappedDeltaX = Math.round(deltaX / 10) * 10;
      const snappedDeltaY = Math.round(deltaY / 10) * 10;

      const updates: Array<{ id: string; x: number; y: number }> = [];
      boardInitialCompPositionsRef.current.forEach((pos, compId) => {
        updates.push({
          id: compId,
          x: pos.x + snappedDeltaX,
          y: pos.y + snappedDeltaY,
        });
      });

      if (onUpdateMultipleComponentPositions) {
        onUpdateMultipleComponentPositions(updates);
      } else {
        updates.forEach((u) => onUpdateComponentPosition(u.id, u.x, u.y));
      }
      return;
    }

    if (draggingCompId) {
      // Snap to 10px grid
      const rawX = world.x - dragOffset.x;
      const rawY = world.y - dragOffset.y;
      const snappedX = Math.round(rawX / 10) * 10;
      const snappedY = Math.round(rawY / 10) * 10;
      onUpdateComponentPosition(draggingCompId, snappedX, snappedY);
    }

    if (inProgressWire) {
      // Snap to nearest target pin if within 22px
      const nearest = findNearestPin(
        world.x,
        world.y,
        22,
        inProgressWire.fromCompId,
        inProgressWire.fromPinId
      );
      if (nearest) {
        setInProgressWire((prev) => (prev ? { ...prev, toX: nearest.x, toY: nearest.y } : null));
      } else {
        setInProgressWire((prev) => (prev ? { ...prev, toX: world.x, toY: world.y } : null));
      }
    }
  };

  // Mouse Up & Drag End (with auto snap-connect)
  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) setIsPanning(false);
    if (draggingBoardIndex !== null) {
      onBoardDragEnd?.(draggingBoardIndex);
      setDraggingBoardIndex(null);
    }
    if (draggingCompId) {
      onDragEnd?.(draggingCompId);
      setDraggingCompId(null);
    }
    if (inProgressWire) {
      const world = screenToWorld(e.clientX, e.clientY);
      const nearest = findNearestPin(
        world.x,
        world.y,
        24,
        inProgressWire.fromCompId,
        inProgressWire.fromPinId
      );
      if (nearest) {
        handlePinMouseUp(nearest.pin, nearest.compId, e);
      } else {
        setInProgressWire(null);
      }
    }
  };

  // Global mouse up safety & Context menu dismissal on Escape
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPanning(false);
      if (draggingBoardIndex !== null) {
        onBoardDragEnd?.(draggingBoardIndex);
        setDraggingBoardIndex(null);
      }
      if (draggingCompId) {
        onDragEnd?.(draggingCompId);
        setDraggingCompId(null);
      }
      setInProgressWire(null);
    };
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [draggingBoardIndex, draggingCompId, onBoardDragEnd, onDragEnd]);

  // Wire double-click handler for creating in-line junction node
  const handleWireDoubleClick = (wireId: string, clientX: number, clientY: number) => {
    const world = screenToWorld(clientX, clientY);
    onBranchWire?.(wireId, Math.round(world.x / 10) * 10, Math.round(world.y / 10) * 10);
  };

  // Wire release handler: drop wire onto existing wire to create branch junction
  const handleWireMouseUp = (wireId: string, clientX: number, clientY: number) => {
    if (!inProgressWire) return;
    const world = screenToWorld(clientX, clientY);
    onBranchWire?.(
      wireId,
      Math.round(world.x / 10) * 10,
      Math.round(world.y / 10) * 10,
      {
        compId: inProgressWire.fromCompId,
        pinId: inProgressWire.fromPinId,
        pinType: inProgressWire.fromPinType,
      }
    );
    setInProgressWire(null);
  };

  return (
    <div
      ref={containerRef}
      className={`canvas-viewport ${isPanning ? 'panning' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {/* Sleek Floating Workbench Toolbar (matching reference design) */}
      <VerticalToolbar
        interactionMode={interactionMode}
        onSetInteractionMode={(mode) => {
          setInteractionMode(mode);
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

      {/* Right-Click Context Menu with Cursor-Aware Paste Here */}
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

      <div
        className="canvas-transform-layer"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* Hardware Trainer Board (Outputs, Horizontal IC Sockets, Inputs) */}
        {workbenchMode !== 'freeform' && (
          <TrainerBoard
            components={circuit.components}
            selectedBoardIndex={selectedBoardIndex}
            onSelectBoard={onSelectBoard}
            onOpenICPicker={onOpenICPicker}
            onRemoveBoard={onRemoveTrainerBoard}
            onStartDragBoard={handleStartDragBoard}
            onCopyBoard={onCopyBoard}
          />
        )}

        {/* Wire Paths */}
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
          isDeleteMode={interactionMode === 'delete'}
          inProgressWire={inProgressWire}
          onSelectWire={onSelectWire}
          onDeleteWire={onDeleteWire}
          onWireDoubleClick={handleWireDoubleClick}
          onWireMouseUp={handleWireMouseUp}
          onAddJunctionAtCoords={(wireId, x, y) => onBranchWire?.(wireId, x, y)}
        />

        {/* Component Nodes */}
        {(workbenchMode === 'freeform'
          ? circuit.components.filter((c) => !c.isTrainerFixed && !c.id.startsWith('trainer_'))
          : circuit.components
        ).map((comp) => (
          <GateComponent
            key={comp.id}
            component={comp}
            isSelected={Boolean(isAllSelected || comp.id === selectedCompId)}
            onSelect={handleComponentSelect}
            onPinMouseDown={handlePinMouseDown}
            onPinMouseUp={handlePinMouseUp}
            onToggleSwitch={onToggleSwitch}
            onButtonPress={onButtonPress}
          />
        ))}
      </div>
    </div>
  );
};
