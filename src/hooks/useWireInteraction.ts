import { useState, useCallback, useEffect } from 'react';
import type { CircuitComponent, Pin, Wire } from '../types/circuit';
import type { Point } from '../engine/wiring/geometry';
import { findNearestPin } from '../engine/wiring/hitTesting';
import { snapToGrid } from '../engine/wiring/routingGrid';
import { soundFx } from '../audio/soundEffects';

export interface InProgressWire {
  fromCompId: string;
  fromPinId: string;
  fromPinType: 'input' | 'output';
  toX: number;
  toY: number;
  snappedPin?: { compId: string; pin: Pin } | null;
}

export interface UseWireInteractionProps {
  wires: Wire[];
  components: CircuitComponent[];
  onAddWire: (wire: Wire) => void;
  onBranchWire?: (
    wireId: string,
    x: number,
    y: number,
    connectFrom?: { compId: string; pinId: string; pinType: 'input' | 'output' }
  ) => void;
  screenToWorld: (screenPt: Point) => Point;
}

export function useWireInteraction({
  wires,
  components,
  onAddWire,
  onBranchWire,
  screenToWorld,
}: UseWireInteractionProps) {
  const [inProgressWire, setInProgressWire] = useState<InProgressWire | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);

  // Esc key cancels in-progress wire creation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inProgressWire) {
        setInProgressWire(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inProgressWire]);

  // Start wire creation from a pin
  const handlePinMouseDown = useCallback(
    (pin: Pin, compId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const world = screenToWorld({ x: e.clientX, y: e.clientY });

      setInProgressWire({
        fromCompId: compId,
        fromPinId: pin.id,
        fromPinType: pin.type,
        toX: world.x,
        toY: world.y,
        snappedPin: null,
      });

      soundFx.playButtonTap();
    },
    [screenToWorld]
  );

  // Update in-progress wire cursor and pin snap
  const updateInProgressWire = useCallback(
    (clientX: number, clientY: number) => {
      if (!inProgressWire) return;

      const world = screenToWorld({ x: clientX, y: clientY });
      const nearest = findNearestPin(
        world,
        components,
        24,
        inProgressWire.fromCompId,
        inProgressWire.fromPinId
      );

      if (nearest) {
        setInProgressWire((prev) =>
          prev
            ? {
                ...prev,
                toX: nearest.x,
                toY: nearest.y,
                snappedPin: { compId: nearest.compId, pin: nearest.pin },
              }
            : null
        );
      } else {
        setInProgressWire((prev) =>
          prev
            ? {
                ...prev,
                toX: snapToGrid(world.x, 10),
                toY: snapToGrid(world.y, 10),
                snappedPin: null,
              }
            : null
        );
      }
    },
    [inProgressWire, components, screenToWorld]
  );

  // Complete wire connection on a pin
  const handlePinMouseUp = useCallback(
    (pin: Pin, compId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (!inProgressWire) return;

      // Cannot connect pin to itself
      if (inProgressWire.fromCompId === compId && inProgressWire.fromPinId === pin.id) {
        setInProgressWire(null);
        return;
      }

      let fromCompId = inProgressWire.fromCompId;
      let fromPinId = inProgressWire.fromPinId;
      let toCompId = compId;
      let toPinId = pin.id;

      // Standardize direction: output -> input
      if (inProgressWire.fromPinType === 'input' && pin.type === 'output') {
        fromCompId = compId;
        fromPinId = pin.id;
        toCompId = inProgressWire.fromCompId;
        toPinId = inProgressWire.fromPinId;
      }

      // Check for duplicate wire
      const alreadyExists = wires.some(
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

      if (!alreadyExists) {
        const newWire: Wire = {
          id: `wire_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
    },
    [inProgressWire, wires, onAddWire]
  );

  // Complete wire if user releases mouse over canvas
  const handleCanvasMouseUpForWire = useCallback(
    (clientX: number, clientY: number) => {
      if (!inProgressWire) return;

      const world = screenToWorld({ x: clientX, y: clientY });
      const nearest = findNearestPin(
        world,
        components,
        24,
        inProgressWire.fromCompId,
        inProgressWire.fromPinId
      );

      if (nearest) {
        handlePinMouseUp(nearest.pin, nearest.compId);
      } else {
        setInProgressWire(null);
      }
    },
    [inProgressWire, components, screenToWorld, handlePinMouseUp]
  );

  // Double-click wire -> creates junction
  const handleWireDoubleClick = useCallback(
    (wireId: string, clientX: number, clientY: number, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const world = screenToWorld({ x: clientX, y: clientY });
      const snappedX = snapToGrid(world.x, 10);
      const snappedY = snapToGrid(world.y, 10);
      onBranchWire?.(wireId, snappedX, snappedY);
      soundFx.playButtonTap();
    },
    [screenToWorld, onBranchWire]
  );

  // Dropping wire onto existing wire -> creates branch junction
  const handleWireMouseUp = useCallback(
    (wireId: string, clientX: number, clientY: number, e?: React.MouseEvent) => {
      if (!inProgressWire) return;
      e?.stopPropagation();

      const world = screenToWorld({ x: clientX, y: clientY });
      const snappedX = snapToGrid(world.x, 10);
      const snappedY = snapToGrid(world.y, 10);

      onBranchWire?.(wireId, snappedX, snappedY, {
        compId: inProgressWire.fromCompId,
        pinId: inProgressWire.fromPinId,
        pinType: inProgressWire.fromPinType,
      });

      setInProgressWire(null);
      soundFx.playSwitchClick(true);
    },
    [inProgressWire, screenToWorld, onBranchWire]
  );

  return {
    inProgressWire,
    hoveredWireId,
    setHoveredWireId,
    handlePinMouseDown,
    handlePinMouseUp,
    updateInProgressWire,
    handleCanvasMouseUpForWire,
    handleWireDoubleClick,
    handleWireMouseUp,
    cancelInProgressWire: () => setInProgressWire(null),
  };
}
