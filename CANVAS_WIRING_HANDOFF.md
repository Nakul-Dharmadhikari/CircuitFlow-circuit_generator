# CircuitFlow: Canvas, Viewport, Interaction & Orthogonal Wiring Interface Contract

## 🤝 Team Member Handoff & Interface Guide

This document defines the interface contract between the **Canvas, Viewport & Wiring Engine** and the **Application Shell, Navbar, Properties Panel & Dynamic Trainer Board UI**.

---

### 1. Viewport & Coordinate Transformation System
The application shell (navbar, inspector, menus, modal dialogs) is strictly fixed. Only the internal circuit world is transformed by viewport translation and scale.

#### Coordinate Helpers (`src/hooks/useViewport.ts`)
```typescript
import {
  screenToWorld,
  worldToScreen,
  calculateZoomAtPoint,
  type Point,
  type ViewportState
} from './hooks/useViewport';

// 1. Screen (mouse clientX/Y) -> World coordinate
const worldPoint = screenToWorld({ x: e.clientX, y: e.clientY }, viewport, containerBoundingRect);

// 2. World coordinate -> Screen (browser pixel)
const screenPoint = worldToScreen({ x: comp.x, y: comp.y }, viewport, containerBoundingRect);

// 3. Cursor-Anchored Zoom calculation (preserves mouse anchor)
const updatedViewport = calculateZoomAtPoint(
  { x: e.clientX, y: e.clientY },
  targetZoom, // clamped between 0.25 and 4.0
  currentViewport,
  containerBoundingRect
);
```

---

### 2. TrainerBoard & Dynamic Module Expectations
The wiring and routing engine does **NOT** hardcode IC1–IC4 or fixed board coordinates. It dynamically discovers all components and pins using geometry.

When expanding the trainer board from 4 ICs / 16 inputs to 6 ICs / 24 inputs, 8 ICs / 32 inputs, or adding breadboards:
- Emit each new socket or input switch as a normal `CircuitComponent` with its world `x`, `y`, `width`, `height`, and `inputs`/`outputs` arrays.
- Sockets can have any ID (`trainer_ic1`, `trainer_ic2` ... `trainer_ic5`, `trainer_ic6`, `trainer_ic7`, etc.).
- The routing engine automatically recognizes them as routing obstacles and valid connection endpoints.

#### Helper Methods Provided by Wiring Engine (`src/engine/wiring/`)
```typescript
import {
  getComponentBounds,
  getBoardBounds,
  getPinEndpoint,
  type Box,
  type PinEndpoint
} from './engine/wiring';

// Returns component bounding box with optional routing clearance margin
const compBounds: Box = getComponentBounds(comp, margin);

// Returns bounding box for board index (e.g. boardIndex = 0, 1, 2...)
const boardBounds: Box | null = getBoardBounds(boardIndex, circuit.components, 20);

// Resolves pin world position and outward normal departure vector
const pinEp: PinEndpoint | null = getPinEndpoint(componentId, pinId, circuit.components);
// pinEp.x, pinEp.y -> world coordinates
// pinEp.dir -> { dx: 0, dy: -1 } for UP, { dx: 0, dy: 1 } for DOWN, etc.
```

---

### 3. Wire Data Model & Separation of Concerns
The logical digital circuit connection is separate from visual route points:
```typescript
export interface Wire {
  id: string;

  // Electrical connectivity (Simulation Engine truth)
  fromCompId: string;
  fromPinId: string;
  toCompId: string;
  toPinId: string;
  value: LogicValue; // '0' | '1' | 'Z' | 'X'

  // Visual geometric routing points (Optional cached Manhattan route)
  points?: Array<{ x: number; y: number }>;
  junctions?: string[];
  selected?: boolean;
}
```
*Note: Modifying or rerouting visual `points` never mutates electrical simulation connectivity.*

---

### 4. Affected-Wire Rerouting API
When moving or rotating a component or moving a board, do not recompute the entire circuit. Use `getAffectedWires`:
```typescript
import { getAffectedWires } from './engine/wiring';

// Find only wires directly connected to the moved components
const affectedWireIds = getAffectedWires(circuit.wires, ['and_gate_1', 'ic_7408_socket']);
```

---

### 5. Multi-Selection & Undo/Redo Contract
- **Marquee Selection**: Dragging empty canvas in `select` mode creates a marquee box selecting all components inside.
- **Group Dragging**: If multiple components are selected, dragging any one of them moves all selected items together maintaining relative offsets.
- **Undo History Commit**: During dragging, positions update smoothly via `requestAnimationFrame`. Only a **single** history action is committed upon `pointerup`/`dragEnd`.
