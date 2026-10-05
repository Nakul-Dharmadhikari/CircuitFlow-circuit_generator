# Digital Trainer & Circuit Simulator (CircuitFlow) — Development & Redesign Summary

## 1. Executive Summary
This project is an advanced, high-fidelity **Digital Logic Circuit Simulator & Trainer Workbench** inspired by educational digital trainer kits and CAD tools like Logisim and Deldsim. It provides real-time digital logic simulation, multi-board hardware training, pure schematic modeling, custom IC creation, timing analysis, waveform analysis, truth table generation, secure per-user circuit saving, and an automatic Manhattan orthogonal wire routing engine on an infinite canvas.

---

## 🎨 Professional UX, Interaction & Manhattan Wire Routing Redesign

### 1. Fixed Application Shell & Responsive Layout
- **Strictly Fixed Navbar & Side Panels**: `<App>` shell provides a fixed 38px top control bar, docked left CAD toolbar, collapsible component library, infinite canvas viewport, and docked right properties inspector. UI components **never** pan, zoom, or jump.
- **Zero Page-Level Scrolling**: Canvas navigation is entirely internal to the canvas viewport (`100vw` by `calc(100vh - 38px)`).

### 2. Infinite Canvas with Cursor-Anchored Pan & Zoom
- **Cursor-Anchored Zooming**: Zooming (25% to 400%) preserves the world point under the cursor without jumping.
- **Navigation Controls**:
  - `Middle Mouse Drag` / `Spacebar + Left Drag`: Panning.
  - `Scroll Wheel` / `Ctrl + Wheel`: Cursor-anchored Zoom.
  - `Fit to Circuit (F)`: Automatically centers and scales all circuit components/boards with a 60px margin.
  - `Reset View (Ctrl+0)`: Restores 100% zoom and resets offset.

### 3. Automatic Manhattan Orthogonal Wire Routing Engine (`wireRouter.ts`)
- **Strict 90-Degree Orthogonal Geometry**: Eliminated oversized Bezier curves in favor of crisp horizontal/vertical routing segments with rounded fillet corners.
- **Obstacle Avoidance & Departure Normals**: Wires depart perpendicularly from pin orientations and intelligently route around obstacles.
- **Multi-Lane Channel Distribution**: Parallel wires traveling along identical channels are automatically offset by 10px lanes, eliminating spaghetti overlaps.
- **Interaction Hitboxes**: 2px visible wire stroke with a 14px invisible hit area for effortless clicking and selection.
- **Double-Click Branching**: Double-clicking any wire immediately creates an in-line junction node.

### 4. Working Centralized Action Layer & Dropdowns
- **File**: `New`, `Open`, `Save`, `Save As`, `Export JSON`, `Import JSON`.
- **Edit**: `Undo`, `Redo`, `Cut`, `Copy`, `Paste`, `Select All`, `Delete`.
- **View**: `Zoom In/Out`, `Reset View`, `Fit Circuit`, `Toggle Grid`, `Toggle Properties Panel`.
- **Simulation**: `Run/Pause`, `Step`, `Reset Simulation`.
- **Analysis**: `Truth Table Generator`, `Waveform Analyzer`.
- **Labs**: `Virtual Lab Experiments`, `Custom IC Builder`.

### 5. Floating Right Properties Inspector
- Live inspection and property editing for selected components (labels, coordinates, live pin values, rotation), selected wires (source/target endpoints, signal state, deletion), trainer boards (ID, duplication, removal), and circuit statistics.

---

## 2. Key Modules & Features Implemented

### 🎓 2.1 Authentic Digital Trainer Kit
- **Realistic Chassis & Hardware Ports**:
  - **Top Section (Outputs 15..0)**: 16 individual probe lamps with pin numbers and live visual logic states (HIGH/LOW/Z).
  - **Power & Reference**: Master ON/OFF power toggle switch, reference +5V VCC terminal, and dual 7-segment display module.
  - **Center Section**: 3 horizontal DIP-20 IC base sockets with top (pins 20..11) and bottom (pins 1..10) socket terminals, orientation notches, and interactive IC swapper dialogs.
  - **Bottom Section (Inputs 15..0)**: 16 tactile toggle switches with binary labels and live indicators.
  - **Clock & Pulse Section**: Frequency selectors (10Hz, 5Hz, 1Hz, 0.5Hz), static HIGH (+5V), static LOW (GND), and interactive **GENERATE PULSE** push button.
- **Power & VCC Strict Gating**:
  - ICs and output probes only evaluate when Master Power is ON and VCC (+5V) is actively connected.
  - Switches and clocks respect the trainer power state.

---

### 📦 2.2 Multi-Board Support & Draggable Chassis
- **Multi-Board Scalability**:
  - Option to add multiple Digital Trainer Boards (`🎓 + Trainer Board`) to the workbench canvas.
  - Each board is uniquely indexed (`Board 1`, `Board 2`, etc.) with its own independent hardware terminals, sockets, and switches.
- **Draggable Board Chassis**:
  - Top header drag bar (`⠿ DIGITAL TRAINER BOARD #X (Drag to Move)`) allows repositioning the entire board.
  - All 16 output LEDs, switches, dual 7-segments, clock pins, power toggle, and mounted IC chips move synchronously in lockstep.
  - Attached wires dynamically follow and maintain connections during movement.
- **Per-Board Actions**:
  - `📋 Copy Board` button for duplicating entire boards with mounted ICs and connections.
  - `✕ Remove Board` button for deleting specific boards and cleaning up orphan wires.

---

### 📐 2.3 Dual Workbench Modes
- **`🎓 Trainer Board Mode`**: Full physical chassis and socket layout for lab experiment simulations.
- **`📐 Schematic Mode (No Board)`**: Removes fixed trainer chassis elements to provide an open, freeform canvas for designing schematics using discrete gates, ICs, inputs, and probes.

---

### 🔌 2.4 Component Library & IC Ecosystem
- **Comprehensive Logic Gates**:
  - 2-Input Gates: AND, OR, NAND, NOR, XOR, XNOR, NOT (Inverter), Buffer, Tri-State Buffer.
  - 3-Input Gates: 3-Input AND, 3-Input OR, 3-Input NAND, 3-Input NOR.
- **Modular Digital Components**:
  - Multiplexers: 2-to-1 MUX, 4-to-1 MUX, 8-to-1 MUX.
  - Demultiplexers / Decoders: 1-to-2 DEMUX, 1-to-4 DEMUX, 2-to-4 Decoder, 3-to-8 Decoder.
  - Encoders: 4-to-2 Priority Encoder, 8-to-3 Priority Encoder.
  - Arithmetic & Memory: Half Adder, Full Adder, D Flip-Flop, JK Flip-Flop, SR Flip-Flop, T Flip-Flop.
  - I/O & Indicators: Dual 7-Segment Display, Hex Display, Audio Buzzer (with sound effects and settled state simulation), Probe Lamps, Push Buttons, Toggle Switches, Clock Generators.
- **DIP IC Chips**:
  - 7400 (Quad 2-In NAND), 7402 (Quad 2-In NOR), 7404 (Hex Inverter), 7408 (Quad 2-In AND), 7432 (Quad 2-In OR), 7486 (Quad 2-In XOR), 74151 (8-to-1 MUX), 74138 (3-to-8 Decoder), 74153 (Dual 4-to-1 MUX), 7447 (BCD to 7-Seg), 7474 (Dual D Flip-Flop), 7476 (Dual JK Flip-Flop).
- **Interactive IC Socket Swapper**:
  - Clicking any horizontal IC base socket allows mounting, swapping, or removing IC chips with one click.

---

### 🛠️ 2.5 20-Pin Custom IC Builder
- **Full-Screen Custom IC Architect Modal**:
  - Design user-defined IC chips with up to 20 pins.
  - Interactive pin mapping (Inputs, Outputs, VCC, GND, NC).
  - Internal logic expression editor and sub-circuit mapper.
  - Automatically saves custom ICs to the user's private library with immediate canvas placement support.

---

### ➰ 2.6 Advanced Wiring, Branching & Auto-Cleanup
- **Dynamic Wire Routing**:
  - Smooth Bezier curve rendering with logic-state color coding (Green for HIGH, Blue for LOW, Gray for High-Z, Red for Conflict).
  - Pin-to-pin snap detection within a 24px proximity threshold.
- **Wire Tapping / Branching**:
  - Double-clicking or dropping wires creates in-line junction nodes.
- **Automatic Cleanup**:
  - Deleting wires or components automatically cleans up orphan junctions and prevents disconnected wire loops.
- **Canvas Interaction Modes**:
  - `Wire Mode` (Default, prevents accidental component drags).
  - `Move Tool / Hand Mode` (Enables moving gates and components).
  - `Delete Mode` (Direct wire click-to-delete eraser).

---

### 📋 2.7 Clipboard & Cursor-Aware Paste
- **Cursor-Aware Paste ("Paste Here")**:
  - Right-clicking anywhere on the canvas and selecting `📋 Paste Here` (or `Ctrl+V`) pastes components or whole trainer boards right at the mouse coordinates.
- **Circuit Copying**:
  - Supports copying single components, multi-selected sub-circuits, specific Trainer Boards, or the entire canvas (`Ctrl+A` -> `Ctrl+C`).

---

### 👤 2.8 User Authentication & Private Vault Circuit Storage
- **Account Security & Isolation**:
  - User registration, login, and profile switching.
  - Strict privacy: Saved schematics are scoped per user (`circuitflow_saved_circuits_${userId}`). Switching users or logging out clears the active canvas to prevent unintended schematic sharing.
- **Pre-Built Lab Experiments**:
  - Included presets for Half Adder, Full Adder, Multiplexer, Flip-Flops, Logic Simplification, and 7-Segment display decoding.

---

### 📊 2.9 Circuit Analysis Tools
- **Timing Diagram Waveform Analyzer**:
  - Live multi-channel digital waveform oscilloscope tracking pin transitions over time.
- **Truth Table Generator**:
  - Automated combinatorial truth table extractor analyzing all input permutations and matching outputs.

---

### 🎨 2.10 UI Design & Styling
- **Minimalistic Modern Navbar**:
  - Sleek greenish theme matching lab aesthetics with direct simulation status indicators, frequency selector, zoom controls, and analysis modal triggers.
- **Clean Responsive Layout**:
  - Zero-scroll canvas viewport with pan, zoom, grid alignment, and auto-minimizing component toolbox drawers.

---

## 3. Project File Structure
```
c:\Users\dell\Desktop\Deldsim Digital MP\
├── src/
│   ├── audio/
│   │   └── soundEffects.ts            # Web Audio API buzzer and switch clicks
│   ├── components/
│   │   ├── AuthModal.tsx              # User login & registration modal
│   │   ├── Canvas.tsx                 # Interactive circuit canvas viewport
│   │   ├── CustomICModal.tsx          # 20-Pin Custom IC Designer
│   │   ├── GateComponent.tsx          # SVG/DOM component renderer
│   │   ├── GateSymbols.tsx            # Standard logic gate SVG schematics
│   │   ├── Header.tsx                 # Minimalistic top navbar & controls
│   │   ├── ICPickerModal.tsx          # IC socket mount/swap selector
│   │   ├── LabExperimentsModal.tsx    # Pre-built digital lab experiments
│   │   ├── LandingPage.tsx            # Initial entry and auth portal
│   │   ├── PropertiesPanel.tsx        # Component property inspector
│   │   ├── SavedCircuitsModal.tsx     # Private saved schematics manager
│   │   ├── ShortcutsModal.tsx         # Keyboard shortcuts reference
│   │   ├── Sidebar.tsx                # Auto-minimizing component toolbox
│   │   ├── TrainerBoard.tsx           # Multi-board chassis & DIP sockets
│   │   ├── TruthTableModal.tsx        # Combinatorial truth table analyzer
│   │   ├── VerticalToolbar.tsx        # Floating canvas quick tools
│   │   └── WaveformViewer.tsx         # Digital timing diagram viewer
│   ├── engine/
│   │   ├── logicGates.ts              # Logic gate evaluations & pin definitions
│   │   ├── simulator.ts               # Circuit simulation & cycle tick engine
│   │   └── trainerKit.ts              # Trainer board layout & multi-board offset
│   ├── hooks/
│   │   └── useCircuitHistory.ts       # 50-state Undo/Redo history engine
│   ├── presets/
│   │   └── labExperiments.ts          # Lab curriculum presets
│   ├── services/
│   │   ├── customIcStorage.ts         # User custom IC storage service
│   │   └── storage.ts                 # User accounts & schematic storage
│   ├── styles/
│   │   ├── canvas.css                 # Hardware chassis & canvas styling
│   │   ├── layout.css                 # Application layout grid
│   │   ├── theme.css                  # Color variables & themes
│   │   └── ui.css                     # Buttons, modals, toolbars
│   ├── types/
│   │   └── circuit.ts                 # TypeScript interfaces & types
│   ├── App.tsx                        # Master application coordinator
│   └── main.tsx                       # React application root
├── scripts/
│   ├── test-board-drag-paste.ts       # Board dragging & cursor paste tests
│   ├── test-custom-ic-buzzer.ts       # Buzzer & custom IC validation
│   ├── test-trainer-boards.ts         # Multi-trainer-board verification
│   └── verify-logic.ts                # Gate logic simulation tests
├── package.json
└── tsconfig.json
```

---

## 4. Verification & Testing Summary
1. **Multi-Board & Schematic Tests (`test-trainer-boards.ts`)**:
   - ✅ Verified default Board 0 instantiation with all 16 inputs/outputs.
   - ✅ Verified adding Board 1, namespaced ID mapping (`trainer_b1_...`), and offset discovery.
   - ✅ Verified board removal and clean detachment of connected wires.
   - ✅ Verified pure schematic mode operation without chassis interference.
2. **Board Dragging & Paste Tests (`test-board-drag-paste.ts`)**:
   - ✅ Dynamic offset discovery verified during board dragging.
   - ✅ Copying and pasting whole Trainer Boards creates isolated, fully-functioning boards.
   - ✅ Copying standalone gates and "Paste Here" centers gates precisely at the mouse cursor.
3. **Buzzer & Custom IC Tests (`test-custom-ic-buzzer.ts`)**:
   - ✅ Buzzer activates on HIGH and immediately silences on LOW.
   - ✅ 20-pin custom IC definition and mounting verified.
4. **Production Build**:
   - ✅ `npm run build` compiles with zero TypeScript errors.
