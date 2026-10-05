import { useState, useRef, useCallback, useEffect } from 'react';
import type { CircuitComponent } from '../types/circuit';
import type { Box, Point } from '../engine/wiring/geometry';
import { snapToGrid } from '../engine/wiring/routingGrid';
import { selectObjectsInBox } from '../engine/wiring/hitTesting';
import type { ToolMode } from '../components/VerticalToolbar';

export interface UseCanvasInteractionProps {
  components: CircuitComponent[];
  selectedCompId: string | null;
  selectedCompIds?: string[];
  selectedBoardIndex: number | null;
  onSelectComponent: (id: string | null) => void;
  onSelectMultipleComponents?: (ids: string[]) => void;
  onSelectBoard?: (boardIndex: number | null) => void;
  onUpdateComponentPosition: (id: string, x: number, y: number) => void;
  onUpdateMultipleComponentPositions?: (updates: Array<{ id: string; x: number; y: number }>) => void;
  onDragStart?: (compId: string) => void;
  onDragEnd?: (compId: string) => void;
  onBoardDragStart?: (boardIndex: number) => void;
  onBoardDragEnd?: (boardIndex: number) => void;
  screenToWorld: (screenPt: Point) => Point;
  onPanByDelta: (deltaX: number, deltaY: number) => void;
  onDeleteSelected?: () => void;
  onRotateComponent?: (id: string) => void;
  onFitCircuit?: () => void;
  onToggleGrid?: () => void;
}

export function useCanvasInteraction({
  components,
  selectedCompId,
  selectedCompIds = [],
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
  screenToWorld,
  onPanByDelta,
  onDeleteSelected,
  onRotateComponent,
  onFitCircuit,
  onToggleGrid,
}: UseCanvasInteractionProps) {
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartClientRef = useRef<Point>({ x: 0, y: 0 });

  // Marquee selection box in world coordinates
  const [marqueeBox, setMarqueeBox] = useState<Box | null>(null);
  const marqueeStartWorldRef = useRef<Point | null>(null);

  // Single & Group component drag state
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const compDragStartWorldRef = useRef<Point>({ x: 0, y: 0 });
  const compInitialPositionsRef = useRef<Map<string, Point>>(new Map());

  // Board dragging state
  const [draggingBoardIndex, setDraggingBoardIndex] = useState<number | null>(null);
  const boardDragStartWorldRef = useRef<Point>({ x: 0, y: 0 });
  const boardInitialPositionsRef = useRef<Map<string, Point>>(new Map());

  // RAF Throttling for high performance during drag
  const rafPendingRef = useRef(false);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === 'v' || e.key === 'V') {
        setToolMode('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setToolMode('pan');
      } else if (e.key === 'w' || e.key === 'W') {
        setToolMode('wire');
      } else if (e.key === 'j' || e.key === 'J') {
        setToolMode('junction');
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedCompId) {
          onRotateComponent?.(selectedCompId);
        }
      } else if (e.key === 'f' || e.key === 'F') {
        onFitCircuit?.();
      } else if (e.key === 'g' || e.key === 'G') {
        onToggleGrid?.();
      } else if (e.key === 'Escape') {
        // Cancel in-progress actions
        setMarqueeBox(null);
        marqueeStartWorldRef.current = null;
        onSelectComponent(null);
        onSelectBoard?.(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (toolMode === 'delete' || selectedCompId || selectedBoardIndex !== null) {
          onDeleteSelected?.();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    isSpacePressed,
    selectedCompId,
    selectedBoardIndex,
    toolMode,
    onRotateComponent,
    onFitCircuit,
    onToggleGrid,
    onSelectComponent,
    onSelectBoard,
    onDeleteSelected,
  ]);

  // Handle start of canvas pan or marquee box
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle click, Space+Left click, or Pan mode -> Pan
      if (e.button === 1 || isSpacePressed || toolMode === 'pan' || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        panStartClientRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Left click on empty canvas in Select or Multiselect mode -> Begin marquee box
      if (e.button === 0 && (toolMode === 'select' || toolMode === 'multiselect')) {
        const world = screenToWorld({ x: e.clientX, y: e.clientY });
        marqueeStartWorldRef.current = world;
        setMarqueeBox({ x: world.x, y: world.y, width: 0, height: 0 });
        onSelectComponent(null);
        onSelectBoard?.(null);
      }
    },
    [isSpacePressed, toolMode, screenToWorld, onSelectComponent, onSelectBoard]
  );

  // Component Drag Start (single or multi-selected group)
  const handleComponentDragStart = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();

      if (toolMode === 'pan') return;

      const comp = components.find((c) => c.id === id);
      if (!comp || comp.isTrainerFixed) return;

      const world = screenToWorld({ x: e.clientX, y: e.clientY });
      compDragStartWorldRef.current = world;

      // Group drag: if clicked component is part of multi-selection, drag all selected components
      const initialMap = new Map<string, Point>();
      const isMulti = selectedCompIds.includes(id) && selectedCompIds.length > 1;
      const targetIds = isMulti ? selectedCompIds : [id];

      for (const targetId of targetIds) {
        const targetComp = components.find((c) => c.id === targetId);
        if (targetComp && !targetComp.isTrainerFixed) {
          initialMap.set(targetId, { x: targetComp.x, y: targetComp.y });
        }
      }

      compInitialPositionsRef.current = initialMap;
      setDraggingCompId(id);
      onSelectComponent(id);
      onDragStart?.(id);
    },
    [components, selectedCompIds, toolMode, screenToWorld, onSelectComponent, onDragStart]
  );

  // Trainer Board Drag Start
  const handleBoardDragStart = useCallback(
    (boardIndex: number, e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectComponent(null);
      onSelectBoard?.(boardIndex);

      const world = screenToWorld({ x: e.clientX, y: e.clientY });
      boardDragStartWorldRef.current = world;

      const initialMap = new Map<string, Point>();
      const prefix = boardIndex === 0 ? 'trainer_' : `trainer_b${boardIndex}_`;

      for (const c of components) {
        const isBoardComp =
          c.customProps?.boardIndex === boardIndex ||
          (boardIndex === 0 && c.id.startsWith('trainer_') && !c.id.match(/^trainer_b\d+_/)) ||
          c.id.startsWith(prefix);

        if (isBoardComp) {
          initialMap.set(c.id, { x: c.x, y: c.y });
        }
      }

      boardInitialPositionsRef.current = initialMap;
      setDraggingBoardIndex(boardIndex);
      onBoardDragStart?.(boardIndex);
    },
    [components, screenToWorld, onSelectComponent, onSelectBoard, onBoardDragStart]
  );

  // Canvas Mouse Move (RAF Throttled for 60fps performance)
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const deltaX = e.clientX - panStartClientRef.current.x;
        const deltaY = e.clientY - panStartClientRef.current.y;
        panStartClientRef.current = { x: e.clientX, y: e.clientY };
        onPanByDelta(deltaX, deltaY);
        return;
      }

      const world = screenToWorld({ x: e.clientX, y: e.clientY });

      // Update marquee box
      if (marqueeStartWorldRef.current) {
        const start = marqueeStartWorldRef.current;
        const x = Math.min(start.x, world.x);
        const y = Math.min(start.y, world.y);
        const width = Math.abs(world.x - start.x);
        const height = Math.abs(world.y - start.y);
        setMarqueeBox({ x, y, width, height });
        return;
      }

      // RAF Throttled Movement
      if (rafPendingRef.current) return;
      rafPendingRef.current = true;

      requestAnimationFrame(() => {
        rafPendingRef.current = false;

        // 1. Dragging Trainer Board
        if (draggingBoardIndex !== null && boardInitialPositionsRef.current.size > 0) {
          const deltaX = world.x - boardDragStartWorldRef.current.x;
          const deltaY = world.y - boardDragStartWorldRef.current.y;
          const snappedDeltaX = snapToGrid(deltaX, 10);
          const snappedDeltaY = snapToGrid(deltaY, 10);

          const updates: Array<{ id: string; x: number; y: number }> = [];
          boardInitialPositionsRef.current.forEach((initPos, cId) => {
            updates.push({
              id: cId,
              x: initPos.x + snappedDeltaX,
              y: initPos.y + snappedDeltaY,
            });
          });

          if (onUpdateMultipleComponentPositions) {
            onUpdateMultipleComponentPositions(updates);
          } else {
            updates.forEach((u) => onUpdateComponentPosition(u.id, u.x, u.y));
          }
          return;
        }

        // 2. Dragging Single or Multi-Selected Components
        if (draggingCompId && compInitialPositionsRef.current.size > 0) {
          const deltaX = world.x - compDragStartWorldRef.current.x;
          const deltaY = world.y - compDragStartWorldRef.current.y;
          const snappedDeltaX = snapToGrid(deltaX, 10);
          const snappedDeltaY = snapToGrid(deltaY, 10);

          if (compInitialPositionsRef.current.size === 1) {
            const initPos = compInitialPositionsRef.current.get(draggingCompId);
            if (initPos) {
              onUpdateComponentPosition(draggingCompId, initPos.x + snappedDeltaX, initPos.y + snappedDeltaY);
            }
          } else {
            const updates: Array<{ id: string; x: number; y: number }> = [];
            compInitialPositionsRef.current.forEach((initPos, cId) => {
              updates.push({
                id: cId,
                x: initPos.x + snappedDeltaX,
                y: initPos.y + snappedDeltaY,
              });
            });

            if (onUpdateMultipleComponentPositions) {
              onUpdateMultipleComponentPositions(updates);
            } else {
              updates.forEach((u) => onUpdateComponentPosition(u.id, u.x, u.y));
            }
          }
        }
      });
    },
    [
      isPanning,
      draggingBoardIndex,
      draggingCompId,
      screenToWorld,
      onPanByDelta,
      onUpdateComponentPosition,
      onUpdateMultipleComponentPositions,
    ]
  );

  // Canvas Mouse Up
  const handleCanvasMouseUp = useCallback(
    (_e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
      }

      // Marquee Box commit
      if (marqueeBox) {
        if (marqueeBox.width > 15 || marqueeBox.height > 15) {
          const selection = selectObjectsInBox(marqueeBox, components, []);
          if (selection.componentIds.length === 1) {
            onSelectComponent(selection.componentIds[0]);
          } else if (selection.componentIds.length > 1) {
            onSelectMultipleComponents?.(selection.componentIds);
          }
        }
        setMarqueeBox(null);
        marqueeStartWorldRef.current = null;
      }

      // End Board Drag (commits undo action ONCE)
      if (draggingBoardIndex !== null) {
        onBoardDragEnd?.(draggingBoardIndex);
        setDraggingBoardIndex(null);
        boardInitialPositionsRef.current.clear();
      }

      // End Component Drag (commits undo action ONCE)
      if (draggingCompId) {
        onDragEnd?.(draggingCompId);
        setDraggingCompId(null);
        compInitialPositionsRef.current.clear();
      }
    },
    [
      isPanning,
      marqueeBox,
      components,
      draggingBoardIndex,
      draggingCompId,
      onSelectComponent,
      onSelectMultipleComponents,
      onBoardDragEnd,
      onDragEnd,
    ]
  );

  return {
    toolMode,
    setToolMode,
    isSpacePressed,
    isPanning,
    marqueeBox,
    draggingCompId,
    draggingBoardIndex,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleComponentDragStart,
    handleBoardDragStart,
  };
}
