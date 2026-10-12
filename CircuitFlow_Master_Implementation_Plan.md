# CircuitFlow Launch-Ready Implementation Plan
## Master Implementation Specification — Follow This File as the Source of Truth

**Project:** CircuitFlow — Digital Logic Circuit Simulator & Trainer  
**Baseline:** Existing integrated and browser-verified `integration/circuitflow-complete` version  
**Purpose:** Transform the current integrated application into a reliable, polished, student-focused product suitable for college-wide use and future public launch.

---

# 0. EXECUTION RULE — READ THIS FIRST

This document is the **master implementation plan** for the next CircuitFlow development phase.

The implementation agent must treat this document as a **binding specification**, not as a suggestion list.

### Rules

1. **Inspect the existing codebase before changing code.**
2. Preserve the already-working integrated functionality unless this plan explicitly changes it.
3. Do not perform a blind rewrite.
4. Do not create duplicate circuit models, simulation engines, wiring engines, or state-management systems when an existing implementation can be extended safely.
5. Do not remove existing functionality merely to make a new feature easier.
6. Do not introduce placeholder UI that looks functional but is not implemented.
7. Do not add a button simply because there is room for it.
8. If a requirement conflicts with the existing architecture, stop and identify the conflict before choosing an arbitrary workaround.
9. Every structural change must be covered by tests before the phase is considered complete.
10. Never force-push, reset, or overwrite `main`, `nakul`, or `atharv`.
11. Keep the current tested integration branch as the baseline and preserve its ability to build and run throughout the work.
12. Do not claim a feature is complete until it has been tested through the actual application flow, not only by inspecting code.
13. If a feature cannot be made reliable within the existing architecture without major risk, document the limitation before implementing a risky redesign.
14. Destructive actions must never happen directly from a right-click or context-menu invocation.
15. Confirmation UI must never become an intrusive workspace-blocking modal for ordinary component removal.

### Practical quality standard

“Error free” means:

- no known TypeScript/build errors;
- no known runtime exceptions;
- no browser console errors from the application;
- no broken core interaction;
- no regression in existing tests;
- no broken save/load;
- no broken simulation;
- no broken trainer-board behavior;
- no broken zoom/pan/wiring;
- no known layout overflow or inaccessible controls;
- no placeholder primary features presented as finished.

A feature that merely appears visually complete but fails one of those conditions is **not complete**.

---

# 1. PRODUCT VISION

CircuitFlow should become:

> **A modern digital electronics laboratory for students.**

The student mental model should be:

**Build → Wire → Simulate → Analyze → Learn → Save/Reuse**

CircuitFlow is intended to be a tool that a college can confidently recommend to students so they do not need to pay for unrelated commercial subscriptions just to learn and practice digital electronics.

The product therefore needs to be:

- easy for beginners to approach;
- powerful enough for serious student projects;
- predictable;
- fast enough for normal student circuits;
- visually coherent;
- educational without being childish;
- professional without being intimidating.

CircuitFlow must **learn from existing digital-logic tools**, but must not become a direct clone of Logisim, Deldsim, Digital, CircuitVerse, or any other existing product.

Use proven ideas where useful, improve weak ideas, and establish a distinct CircuitFlow interaction model and visual identity.

---

# 2. EXISTING BASELINE — DO NOT REGRESS

The current integrated branch already contains substantial working functionality. The implementation must start from the current integration state and treat the following as protected baseline behavior unless this plan explicitly modifies it.

## 2.1 Canvas and viewport

Preserve:

- cursor-centered zoom;
- approximately 25%–400% zoom range;
- pan;
- middle-mouse pan;
- world/screen coordinate conversion;
- grid;
- snapping;
- selection;
- marquee selection;
- component movement;
- wire creation;
- wire preview;
- orthogonal routing;
- wire hit-testing;
- wire selection;
- wire deletion;
- affected-wire rerouting;
- fixed UI shell while the circuit world transforms.

The fixed application shell must never zoom or pan with the circuit world.

## 2.2 Trainer Board

Preserve:

- trainer-board mode;
- schematic mode;
- board dragging;
- dynamic board model;
- initial 4 IC sockets;
- 16 inputs;
- Add Module;
- Module 2: 6 IC sockets / 24 inputs;
- Module 3: 8 IC sockets / 32 inputs;
- board movement with attached components/wires;
- persistence;
- board copy/paste behavior where already supported.

## 2.3 Simulation

Preserve:

- existing logic simulation;
- clock behavior;
- Run/Pause;
- Single Step;
- supported gate/component simulation;
- custom IC simulation infrastructure;
- save/load;
- undo/redo.

## 2.4 Application infrastructure

Preserve:

- authentication/backend where currently supported;
- project saving;
- JSON export/import;
- custom IC storage;
- properties/inspector infrastructure;
- test infrastructure.

## 2.5 Baseline verification

The previous integrated version passed:

- 34/34 Chrome browser checks;
- 24/24 Canvas/Wiring checks;
- trainer regression checks;
- logic verification;
- unified circuit-model tests;
- wire-router tests;
- custom-IC tests;
- server/auth tests;
- production build.

These are regression gates. Any new change that breaks them must be fixed before proceeding.

---

# 3. HIGH-LEVEL IMPLEMENTATION ORDER

Do not redesign everything simultaneously.

Implement in this order:

### Phase 0 — Repository/codebase audit
### Phase 1 — Trainer IC correctness
### Phase 2 — Wire routing correctness
### Phase 3 — Destructive actions/context menus
### Phase 4 — Workspace scrolling
### Phase 5 — Navigation and interaction UX
### Phase 6 — Unified visual design system
### Phase 7 — Custom IC Studio
### Phase 8 — Circuit Analysis
### Phase 9 — Integration/polish
### Phase 10 — Full launch-quality validation

The order is deliberate:

**Reliability → interaction safety → navigation → design system → major feature redesign → analysis → final polish.**

---

# 4. PHASE 0 — CODEBASE AUDIT

Before editing anything:

## 4.1 Create an architecture map

Identify the actual source-of-truth modules for:

- circuit state;
- trainer-board state;
- mounted IC state;
- component rendering;
- wire rendering;
- wire routing;
- simulation;
- custom IC definitions;
- custom IC persistence;
- analysis;
- context menus;
- properties panel;
- navigation;
- theme/CSS;
- undo/redo;
- save/load;
- export/import.

Document which files are authoritative.

## 4.2 Identify duplication

Look specifically for:

- duplicate component representations;
- duplicate pin definitions;
- duplicate simulation rules;
- old/new custom IC representations;
- hardcoded trainer-board socket assumptions;
- CSS values that bypass theme variables;
- repeated action definitions in multiple menus;
- UI controls that invoke the same action from multiple places.

## 4.3 Do not delete old architecture yet

First understand it.

Compatibility layers should be introduced where needed rather than deleting working data paths immediately.

## 4.4 Baseline test

Run:

- production build;
- all existing test scripts;
- current Chrome browser suite.

Record the baseline before modifications.

---

# 5. PHASE 1 — TRAINER BOARD AND MOUNTED IC CORRECTNESS

## 5.1 Mounted IC ownership model

A mounted IC must no longer behave like a freely movable canvas component.

The correct conceptual ownership is:

```text
Trainer Board
  └── Module
       └── IC Socket
            └── Mounted IC
```

The socket owns the mounted IC position.

A mounted IC's world position must be derived from its socket/module relationship.

Do not rely only on a boolean such as `isFixed`.

The data model should clearly represent:

- mounted socket ID;
- trainer board ID;
- module ID;
- IC identity/definition;
- mounted state;
- pin mapping/state.

## 5.2 Mounted IC locking

Once mounted:

- dragging the IC itself does nothing;
- marquee selection cannot reposition it;
- rotation is disabled through normal canvas controls;
- resize is disabled;
- wire interaction cannot reposition it;
- rerouting cannot move it;
- zoom/pan cannot alter its logical position;
- re-rendering cannot cause drift;
- loading cannot convert it into a free-floating component.

The only normal ways to change location are:

1. move the trainer board/module/socket as appropriate;
2. eject/unmount the IC.

## 5.3 Board movement

When the board moves:

```text
Board
 ↓
Module
 ↓
Socket
 ↓
Mounted IC
 ↓
Attached trainer hardware
 ↓
Affected wire endpoints/routing
```

Everything must remain spatially synchronized.

## 5.4 Mounted IC selection

Selecting a mounted IC should provide contextual information such as:

- IC name/part;
- socket name;
- mounted board/module;
- pinout;
- electrical state;
- available actions.

The user should clearly understand that the IC is mounted and locked to a socket.

## 5.5 IC removal

Use terminology appropriate to a trainer board:

**Eject IC** / **Remove IC**

Do not expose a destructive action as the primary control over the socket.

Recommended interaction:

```text
Select/right-click mounted IC
→ Context menu
→ Eject IC
→ compact contextual confirmation
```

The confirmation must:

- appear near the relevant action/object where practical;
- not cover the circuit;
- not cover the power control;
- not block the whole workspace;
- disappear when clicking elsewhere;
- offer Cancel and explicit Eject.

If connected wires exist, clearly state the consequence.

Example:

> Eject 74LS08 from IC2?  
> 3 connected wires will be disconnected.

Do not silently delete connected circuitry.

## 5.6 Socket layout

The IC eject/remove action must never sit behind:

- power button;
- socket hardware;
- board controls;
- other overlay elements.

Separate power and IC-management controls into independent control zones.

---

# 6. PHASE 2 — WIRE ROUTING CORRECTNESS

## 6.1 Core rule

A wire must never visually pass through a component body.

This applies to:

- mounted ICs;
- DIP sockets where appropriate;
- logic gates;
- flip-flops;
- MUX;
- DEMUX;
- decoders;
- encoders;
- custom ICs;
- displays;
- LEDs/output components;
- trainer hardware obstacle regions.

## 6.2 Hard obstacle model

Every routable component must expose an obstacle/keep-out region.

Obstacle should include a safety margin around the body.

The router must treat it as an impassable region.

Do not merely route first and check collision afterward.

## 6.3 Pin corridors

A pin should have a controlled approach corridor.

Wires should:

1. exit from the pin;
2. move outward from the component;
3. then route orthogonally around the component;
4. re-enter toward the destination pin.

Conceptually:

```text
        ┌──────────────┐
────────┤              │
        │     IC       │
────────┤              │
        └──────────────┘
```

Never route directly through the IC body.

## 6.4 Router behavior

Preserve:

- 90° routing;
- rounded orthogonal corners if visually appropriate;
- 2px normal visual stroke;
- larger invisible hit area;
- lane separation;
- reroute-on-move;
- routing around obstacles.

Routing cost should prioritize:

1. no collision;
2. safe clearance;
3. no illegal overlap;
4. sensible pin approach;
5. fewer bends;
6. shorter path.

## 6.5 Wire crossing

Crossing wires do not connect automatically unless there is an explicit junction/branch rule.

Junction markers should appear only where an actual electrical branch exists.

## 6.6 Electrical connectivity vs visual routing

Keep these separate.

```text
Electrical model
    !=
Rendered route points
```

A routing change must not alter circuit connectivity.

## 6.7 Regression tests

Explicitly test:

- wire around IC;
- wire around gate;
- dense IC arrangement;
- multiple parallel wires;
- component movement;
- board movement;
- zoom;
- pan;
- module expansion;
- save/load;
- JSON import/export.

---

# 7. PHASE 3 — CONTEXT MENUS AND SAFE DESTRUCTIVE ACTIONS

## 7.1 Global rule

**Right-click must never directly delete anything.**

Right-click always opens a contextual menu.

## 7.2 Context-menu design

Show relevant actions based on selection.

For an IC:

```text
Inspect
Edit Properties
View Pinout
Rotate (if allowed)
Duplicate
Lock / Unlock
Open Internal Logic (custom IC)
────────────
Eject / Remove
```

For a wire:

```text
Inspect
Edit Route
Add Junction (where valid)
Disconnect
Remove Wire
```

For a trainer board:

```text
Board Properties
Move
Copy
Add Module
Power
────────────
Remove Board
```

The available actions must be context-specific. Do not fill every menu with generic options.

## 7.3 Destructive confirmation

Destructive operations require explicit confirmation unless the action is genuinely low-risk and fully undoable.

IC/component removal should always warn.

Confirmation must be:

- compact;
- contextual;
- non-blocking;
- non-overlapping;
- non-intrusive;
- keyboard/mouse accessible.

Do not use giant central confirmation dialogs for ordinary editor operations.

## 7.4 Consequence information

Show consequences.

Example:

> Remove this IC?  
> 3 connected wires will be disconnected.

For a module:

> Remove Module 3?  
> 2 mounted ICs and 6 connected wires will be affected.

## 7.5 Undo

After confirmed destructive actions:

- create an undo state;
- show a small non-blocking “Removed” toast;
- provide Undo where appropriate.

Do not treat Undo as a substitute for confirmation.

---

# 8. PHASE 4 — WORKSPACE SCROLLING

The browser page itself should remain controlled.

Add workspace-level:

- vertical scrollbar on the right;
- horizontal scrollbar on the bottom.

Do not destroy:

- zoom;
- pan;
- cursor-centered zoom;
- middle-mouse navigation;
- world/screen transforms.

## 8.1 Intended interaction model

```text
Wheel               → current zoom behavior
Middle mouse        → pan
Scrollbar           → navigate large workspace extents
Zoomed canvas       → larger scrollable work area
Fixed shell         → remains fixed
```

The scrollbars must belong to the workspace/canvas navigation layer, not the browser page.

## 8.2 Prevent regressions

Verify:

- page itself does not unexpectedly scroll;
- zoom remains cursor-centered;
- scrollbars do not intercept circuit interactions incorrectly;
- horizontal scrolling works;
- vertical scrolling works;
- 25%–400% zoom still works;
- pan remains useful.

---

# 9. PHASE 5 — NAVIGATION AND UX RESTRUCTURE

## 9.1 Product mental model

Primary activities:

```text
BUILD
ANALYZE
SIMULATE
PROJECTS
```

Do not expose every feature as a top-level navigation item.

## 9.2 Recommended information architecture

### BUILD

- Trainer Board
- Schematic
- Components
- Custom IC Studio

### ANALYZE

- Overview
- Truth Table
- Karnaugh Map
- Timing
- State Analysis
- Test Bench
- Errors/Warnings

### SIMULATE

- Run
- Pause
- Step
- Reset
- Clock

### PROJECTS

- New
- Open
- Saved Projects
- Examples/Labs
- My Components

## 9.3 Left navigation

Use a compact icon-first tool rail.

Suggested primary tools:

- Select
- Wire
- Pan
- Components
- Delete/Remove only where appropriate

Do not put every analysis, project, simulation, settings, and feature shortcut into the left rail.

## 9.4 Remove repetition

If a setting already exists in:

- Properties;
- Simulation controls;
- Components panel;
- File menu;

do not duplicate it unnecessarily in another navigation area.

## 9.5 Icons

Replace ambiguous text-only/emoji-heavy primary controls with a consistent SVG icon system.

Use:

- icon + label for major navigation;
- icon-first compact controls for frequent tools;
- tooltip for unfamiliar icon.

Tooltip example:

> Wire  
> Shortcut: W

## 9.6 Keyboard shortcuts

Preserve or establish a coherent system:

- Esc / V = Select;
- W = Wire;
- Space = Pan;
- Delete = Remove flow;
- R = Rotate where valid;
- Ctrl+Z = Undo;
- Ctrl+Y = Redo;
- Ctrl+S = Save;
- Ctrl+C / Ctrl+V = Copy/Paste.

Do not conflict with browser behavior.

## 9.7 Component library

Provide a searchable component library with logical categories.

Example:

```text
Components
[ Search ]

Basic Gates
Sequential
MSI
Memory
I/O
Trainer
Custom
```

Support both:

- drag from library to canvas;
- select component then click destination.

## 9.8 Contextual inspector

Properties panel should change according to selection.

Nothing selected:
- workspace information;
- grid;
- zoom;
- simulation state.

IC selected:
- identity;
- pins;
- state;
- valid actions.

Wire selected:
- endpoints;
- state;
- route;
- valid actions.

Trainer board selected:
- board info;
- modules;
- power;
- valid actions.

Do not display irrelevant controls.

## 9.9 Onboarding

Provide an optional first-use walkthrough.

Do not force a tutorial every session.

Recommended:

> Build your first circuit

with:

- Add component;
- wire it;
- simulate;
- inspect output;
- save.

---

# 10. PHASE 6 — VISUAL DESIGN SYSTEM

## 10.1 Design objective

CircuitFlow should feel like one product.

Current problem to solve:

- unrelated colors;
- different control styles;
- inconsistent panels;
- too many visual accents;
- “prototype dashboard” feeling.

## 10.2 Do not use

- generic blue/purple AI-dashboard palette;
- excessive gradients;
- excessive glassmorphism;
- childish illustrations;
- heavy animation;
- hyper-realistic electronics rendering;
- copied Logisim/Deldsim styling.

## 10.3 Recommended visual identity

Use a distinctive **Copper Lab** design language.

Core role families:

- graphite/charcoal neutrals;
- warm ivory/cream surfaces where appropriate;
- copper/burnt-orange as brand accent;
- signal green for electrical HIGH/active state;
- amber for warnings/high-Z where appropriate;
- red for fault/error.

Do not use brand colors to represent electrical states inconsistently.

## 10.4 Theme tokens

Create/normalize CSS variables for:

- background;
- surface;
- elevated surface;
- border;
- text primary;
- text secondary;
- copper accent;
- hover;
- active;
- selected;
- success;
- warning;
- error;
- HIGH;
- LOW;
- HIGH-Z;
- disabled.

All major components must use theme variables rather than ad-hoc colors.

## 10.5 Typography

Use one coherent type hierarchy for:

- page headings;
- panel headings;
- controls;
- labels;
- status text;
- code/technical information.

Avoid mixing unrelated visual styles.

## 10.6 Component language

Buttons, cards, menus, inputs, tabs, drawers, tooltips, and notifications must share:

- radius system;
- border system;
- spacing;
- typography;
- icon treatment;
- hover/active states.

## 10.7 Animation

Use animation only when it communicates:

- opening/closing;
- state change;
- focus;
- successful operation.

Avoid decorative animation.

No animation should interfere with circuit manipulation.

---

# 11. PHASE 7 — CUSTOM IC STUDIO

This is a major redesign and must reuse the existing circuit/simulation infrastructure.

## 11.1 Primary design principle

A Custom IC is:

> **A reusable circuit with a defined external interface and physical/symbolic package.**

The preferred architecture is:

```text
Internal Circuit
      ↓
External Input/Output Interface
      ↓
Pin Mapping
      ↓
Package / Appearance
      ↓
Validation
      ↓
Testing
      ↓
Reusable Component
```

## 11.2 Do not create a second circuit engine

Custom IC Studio must reuse:

- CircuitFlow circuit model;
- components;
- pins;
- wiring;
- router;
- simulator;
- undo/redo;
- selection;
- snapping;
- coordinate system.

Use a special editing context rather than a parallel circuit editor.

## 11.3 Entry screen

Custom IC creation should be a planned workflow.

Start with:

```text
Create Custom IC

[ Build from Circuit ]      Primary

[ Build from Truth Table ]  Secondary/future-safe path

[ Use Existing Circuit ]    Where supported
```

Do not open a random giant modal with all configuration fields at once.

## 11.4 Internal logic editor

The user should build the internal circuit visually.

Example:

```text
A ─────┐
       AND ─────┐
B ─────┘        OR ─── Y
C ──────────────┘
```

The internal circuit is the actual logic source of truth.

## 11.5 Define interface

Allow the user to identify:

### Inputs
- name;
- direction;
- pin label;
- associated internal input node/pin.

### Outputs
- name;
- direction;
- pin label;
- associated internal output node/pin.

Optional:
- VCC;
- GND;
- NC;
- bidirectional only where technically supported.

## 11.6 Explicit pin mapping

Do not assume first input/first output.

Every external pin mapping must explicitly resolve to:

```text
externalPin
    ↓
internalComponentId
    ↓
internalPinId
```

This is required for reliability.

## 11.7 Source of truth

For new Custom ICs:

**`internalCircuit` is the source of truth.**

`gateUnits` may remain temporarily as a legacy compatibility mechanism for older saved custom ICs.

Do not maintain two independent representations for new components.

## 11.8 Backward compatibility

Existing saved Custom ICs using the older gate-unit representation must continue to load if possible.

Implement a compatibility layer:

```text
Old Custom IC
  → legacy representation
  → existing evaluator

New Custom IC
  → internalCircuit
  → unified simulator
```

Do not delete the old representation until a safe migration strategy exists.

## 11.9 Validation

Before saving, validate:

### Identity
- name exists;
- unique internal ID;
- valid package choice.

### Pins
- unique pin numbers;
- valid pin ranges;
- valid types;
- no conflicting VCC/GND assignments.

### Internal circuit
- serializable;
- valid component IDs;
- valid wires;
- valid pins.

### Mapping
- every required external input maps to a valid internal pin;
- every required external output maps to a valid internal pin;
- no broken references;
- no invalid direction.

### Simulation
- internal circuit can execute;
- outputs can be resolved.

Never display a generic “Something went wrong.”

Show actionable errors.

Example:

> Output “Y” is not connected to a valid internal output pin.

## 11.10 Testing

For manageable combinational circuits:

- generate input combinations;
- simulate;
- show outputs;
- mark valid/invalid.

Allow:

> Run Test

and, where appropriate:

> Generate Truth Table

For sequential circuits, provide a controlled test workflow rather than pretending a simple truth table is sufficient.

## 11.11 Package stage

After logic is valid:

- name;
- part number;
- description;
- package type;
- pin numbering;
- visual preview.

Start with package types already supported by the application, such as DIP-14/DIP-16/DIP-20 where applicable.

Do not make package drawing affect internal logic.

## 11.12 Pin arrangement

Recommended model:

**Auto-layout with manual adjustment**

The user should be able to:

- choose side;
- reorder pins;
- rename;
- inspect numbering.

Avoid requiring manual pixel-level placement.

## 11.13 Save to My Components

After successful validation/test:

```text
Save Custom IC
    ↓
My Components
    ↓
Place on Canvas
    or
Mount on Trainer Board
```

## 11.14 Edit existing Custom IC

Editing should create a safe version/update strategy.

Do not silently change already-placed copies unless a deliberate versioning model exists.

Recommended:

- edit opens Custom IC Studio;
- save creates a new version or explicit update;
- existing placed components remain stable;
- user can intentionally replace/update them.

## 11.15 Open internal logic

Context menu for Custom IC:

- Inspect;
- Open Internal Logic;
- Edit;
- Duplicate;
- Rename;
- Remove.

Opening Internal Logic enters the same Custom IC Studio.

## 11.16 Nested Custom ICs

Do not implement unrestricted recursive nesting without validation.

If nested Custom ICs are supported:

- detect cycles;
- prevent self-reference;
- prevent recursion loops;
- validate dependency graph.

If safe nested support is not already available, limit this feature to a later controlled phase.

---

# 12. PHASE 8 — CIRCUIT ANALYSIS

## 12.1 Core requirement

Analysis must work from the unified circuit representation rather than creating separate logic for:

- trainer board;
- schematic;
- custom IC.

Architecture:

```text
              Unified Circuit Model
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
      Trainer       Schematic      Custom IC
        │              │              │
        └──────────────┼──────────────┘
                       ↓
                Analysis Engine
```

## 12.2 Analysis Center

Implement or stabilize these modules:

### Overview
- inputs;
- outputs;
- gates;
- ICs;
- custom ICs;
- wires;
- clocks;
- floating pins;
- conflicts/errors;
- circuit classification.

### Truth Table
- automatic input permutation;
- output evaluation;
- sensible input-count limit;
- clear warning when too large.

### Karnaugh Map
For supported combinational circuits.
Initial safe scope: 2–6 variables.

### Timing / Waveform
- signals;
- time range;
- zoom timeline;
- add/remove signals;
- run/pause/reset interaction;
- export where supported.

### State / Sequential Analysis
Where supported:
- state;
- next state;
- transition;
- clock;
- state table;
- state diagram.

### Test Bench
Allow test vectors:

```text
Inputs → Expected Outputs
```

Run tests and report:
- pass;
- fail;
- actual output;
- expected output.

### Errors / Diagnostics
Show:
- unconnected required pins;
- invalid connections;
- conflicting outputs;
- floating inputs where relevant;
- unsupported analysis cases.

## 12.3 Unsupported cases

Never show a fake feature.

If analysis is not possible:

- explain why;
- provide the next useful action if one exists.

Example:

> Truth table generation is not practical for 18 inputs because it would require 262,144 input combinations. Use Test Bench or Timing Analysis instead.

## 12.4 Technology/mode compatibility

All supported analysis must work consistently across:

- Trainer Board;
- Schematic;
- Custom IC internal circuits,

using the same underlying model.

Where a feature is genuinely impossible for a component/mode, show a reason instead of failing silently.

---

# 13. PHASE 9 — INTERACTION AND STUDENT EXPERIENCE

## 13.1 Empty state

The editor should help a new student begin.

Example:

```text
Start Building

[ New Schematic ]
[ Trainer Board ]
[ Open Example ]

or drag a component here
```

## 13.2 Examples/Labs

Use the existing lab/preset idea, but organize it under:

**Examples / Labs**

Recommended starter examples:

- Half Adder;
- Full Adder;
- Multiplexer;
- Decoder;
- Flip-Flop;
- 7-Segment Decoder;
- Counter;
- Register;
- ALU where the current simulation engine supports it reliably.

Every example must actually work.

## 13.3 No fake “coming soon” primary actions

Do not expose a prominent button such as:

> AI Assistant — Soon

unless it is a real working feature.

Unused/future features belong outside the primary workflow.

## 13.4 Feedback

Use subtle non-blocking feedback for:

- save;
- import;
- export;
- successful creation;
- deletion;
- errors;
- validation.

Do not flood the screen with notifications.

---

# 14. PHASE 10 — LAUNCH HARDENING

Every phase must end with:

## Build

```text
npm run build
```

must pass.

## Existing tests

All existing tests must pass.

## New tests

Add tests for every new behavioral rule.

## Browser verification

Use the available native Chrome/Puppeteer verification where the standard Playwright browser binary is unavailable.

Verify:

- startup;
- navigation;
- component insertion;
- selection;
- right-click menus;
- non-destructive actions;
- confirmation;
- delete/eject safety;
- trainer board;
- mounted IC lock;
- board movement;
- wire routing;
- wire collision avoidance;
- scrollbars;
- zoom;
- pan;
- save/load;
- undo/redo;
- Custom IC creation;
- Custom IC validation;
- Custom IC simulation;
- Custom IC save/load;
- Custom IC placement;
- Custom IC trainer mounting;
- analysis;
- export/import.

## Console

No unexpected application console errors.

## Runtime

No uncaught exceptions.

## Layout

Check at least:

- 1280 × 720;
- 1600 × 900.

Check:

- top bar;
- left rail;
- component library;
- inspector;
- canvas;
- vertical scrollbar;
- horizontal scrollbar;
- contextual menus;
- confirmation controls.

## Persistence

Test:

- save;
- load;
- reload;
- JSON export;
- JSON import;
- custom IC storage.

---

# 15. REQUIRED NEW TEST SCENARIOS

At minimum, add or update automated tests for:

## Mounted IC

1. Mount IC.
2. Attempt direct drag — position must not change.
3. Attempt rotation — must remain unchanged.
4. Move board — IC moves exactly with socket.
5. Save/load — socket relationship remains.
6. Add module — existing IC position/ownership remains correct.
7. Reroute wires — IC does not move.
8. Zoom/pan — logical location remains correct.
9. Eject — requires confirmation.
10. Eject with wires — consequence warning appears.

## Routing

11. Route between two components separated by IC.
12. Confirm no route segment intersects IC body.
13. Move connected component.
14. Reroute affected wire.
15. Confirm unrelated routes remain.
16. Dense multiple-wire case.
17. Parallel wire lane case.
18. Zoom/pan after routing.

## Context menu

19. Right-click component opens context menu.
20. Right-click does not delete.
21. Remove opens confirmation.
22. Cancel preserves component.
23. Confirm removes component.
24. Undo restores it.
25. Relevant non-destructive actions appear.
26. Context menu disappears cleanly when clicking elsewhere.

## Custom IC

27. Create simple AND custom IC.
28. Create multi-gate custom IC.
29. Explicit input mapping.
30. Explicit output mapping.
31. Invalid pin mapping rejected.
32. Unconnected output rejected.
33. Save custom IC.
34. Reload custom IC.
35. Place custom IC on schematic.
36. Simulate custom IC.
37. Connect custom IC externally.
38. Verify outputs.
39. Open internal logic.
40. Duplicate custom IC.
41. Mount custom IC on trainer board.
42. Move trainer board.
43. Verify custom IC remains mounted.
44. Export/import circuit containing custom IC.
45. Test legacy custom IC definitions.

## Analysis

46. Truth table on schematic.
47. Truth table on trainer-derived circuit.
48. Truth table inside eligible custom IC.
49. K-map on supported circuit.
50. Timing/waveform.
51. Sequential analysis.
52. Test bench.
53. Invalid/unsupported analysis error.
54. Analysis after save/load.

---

# 16. DATA-MODEL RULES

## 16.1 Single source of truth

Prefer the existing unified circuit model.

Do not create:

- separate trainer simulation model;
- separate schematic simulation model;
- separate Custom IC logic engine;

unless absolutely unavoidable and documented.

## 16.2 IDs

Do not hardcode:

- IC1–IC4;
- module counts;
- socket positions;
- board positions;
- wire endpoints.

All must come from current model/state.

## 16.3 Spatial behavior

Visual position must always be derived from authoritative state.

Mounted IC position should be socket-owned.

## 16.4 Electrical vs visual

Keep:

- circuit connectivity;
- pin states;
- simulation;
- rendering;
- route geometry

as distinct layers.

---

# 17. PERFORMANCE RULES

Do not sacrifice reliability for premature optimization.

However:

- reroute only affected wires;
- avoid unnecessary full-canvas recomputation;
- avoid creating excessive DOM/SVG objects during interaction;
- debounce expensive analysis where appropriate;
- avoid recomputing analysis on every pointer movement;
- keep large circuits navigable.

Custom IC simulation should not recursively explode without checks.

---

# 18. ACCESSIBILITY AND DISCOVERABILITY

At minimum:

- buttons must have accessible labels;
- icon-only controls need tooltips/accessible names;
- keyboard focus should remain visible;
- menus should be keyboard navigable;
- confirmation actions should have clear focus;
- signal colors should not be the only way state is communicated;
- text contrast must be readable;
- destructive actions should not be easy to trigger accidentally.

---

# 19. ERROR HANDLING

Every new user-visible error must be:

- specific;
- actionable;
- non-destructive;
- recoverable where possible.

Avoid:

> Error.

Prefer:

> Cannot save Custom IC: output `Y` is not mapped to an internal output pin.

or:

> Cannot generate a truth table for 15 inputs. Use Test Bench or Timing Analysis instead.

No raw stack traces should be exposed to ordinary users.

---

# 20. FILE/ARCHITECTURE STRATEGY FOR CUSTOM IC

The exact file names may differ after code audit, but the implementation should map functionality roughly to:

```text
src/
  core/
    circuit-model/
    logic/
    simulation-engine/
    analysis/

  engine/
    wiring/
    trainer/
    custom-ic/

  components/
    CustomICStudio/
    CustomICBuilder/
    CustomICLibrary/
    AnalysisCenter/
    ContextMenu/
    Confirmation/
    ComponentLibrary/

  services/
    customIcStorage/

  hooks/
    customIC/
    circuit/
    analysis/

  styles/
    theme/
```

Do not blindly create this exact folder tree if the existing architecture already has better locations. Extend the real architecture consistently.

---

# 21. MIGRATION STRATEGY FOR CURRENT CUSTOM ICs

Current definitions using gate-based `gateUnits` must not suddenly become unreadable.

Implement:

### New ICs
Use `internalCircuit`.

### Existing ICs
Continue to load through compatibility behavior.

### Optional migration
Provide a safe conversion path where possible:

```text
Legacy Custom IC
     ↓
Convert
     ↓
Internal Circuit
     ↓
Validate
     ↓
Save New Version
```

Never silently corrupt an old Custom IC.

---

# 22. UI DESIGN RULES FOR THE CUSTOM IC STUDIO

The Studio should feel like a professional mini-workbench.

Suggested layout:

```text
┌─────────────────────────────────────────────────────┐
│ Create Custom IC                       Save / Exit  │
├─────────────┬─────────────────────────┬─────────────┤
│ Components  │                         │ Properties  │
│             │     Internal Circuit   │             │
│ Gates       │                         │ Pin Mapping │
│ Sequential  │                         │ Validation  │
│ I/O         │                         │             │
│             │                         │             │
├─────────────┴─────────────────────────┴─────────────┤
│ Step: Logic → Interface → Package → Test → Save    │
└─────────────────────────────────────────────────────┘
```

This must not be a giant form.

Use a guided workflow.

The student should always know:

- where they are;
- what remains;
- whether the current step is valid;
- how to go back.

---

# 23. VISUAL CHARACTER OF THE CUSTOM IC STUDIO

The Custom IC Studio must use the same CircuitFlow design system.

Do not create a separate visual theme for it.

It should feel like:

> CircuitFlow inside a focused workbench.

Not:

> a different application opened on top of CircuitFlow.

---

# 24. COMPONENT LIBRARY ORGANIZATION

Recommended categories:

```text
Basic Gates
Sequential
MSI / Functional
Arithmetic
Memory
I/O
Trainer Hardware
Custom
```

Use meaningful icons and concise labels.

Search must work by:

- name;
- abbreviation;
- common term;
- part number where applicable.

Example:

Searching:

`and`

should locate:

- AND;
- 2-input AND;
- 3-input AND;
- AND-related ICs.

Searching:

`7408`

should find the relevant IC if present.

---

# 25. TRAINER BOARD VISUAL/UX RULES

The trainer board should look like a **modern stylized laboratory instrument**, not a photorealistic PCB.

Use:

- clear sockets;
- readable pin labels;
- distinct power section;
- obvious IC mounting area;
- compact controls;
- clean module boundaries;
- visually consistent electrical states.

Do not use overly realistic textures that reduce clarity.

---

# 26. WHAT MUST NOT CHANGE ACCIDENTALLY

During implementation, do not accidentally break:

- existing board module expansion;
- board movement;
- schematic mode;
- save/load;
- JSON import/export;
- authentication;
- project storage;
- undo/redo;
- existing component simulation;
- custom IC mounting;
- cursor-centered zoom;
- pan;
- grid;
- snapping;
- wire selection;
- wire deletion;
- existing test suite.

Any regression blocks completion.

---

# 27. GIT / BRANCH SAFETY

Use a dedicated feature branch for this redesign.

Do not:

- force push;
- reset integration;
- overwrite main;
- delete `nakul`;
- delete `atharv`;
- merge unfinished work.

Commit in logical units such as:

```text
fix: lock mounted trainer ICs
fix: route wires around component obstacles
feat: add safe component context menus
feat: add workspace scrollbars
refactor: unify CircuitFlow theme tokens
feat: redesign navigation
feat: implement Custom IC Studio
feat: complete analysis center
test: add launch regression suite
```

Keep commits reviewable.

---

# 28. FINAL RELEASE GATE

The work is complete only when ALL are true:

### Reliability
- mounted ICs cannot accidentally move;
- wire paths cannot cross component bodies;
- destructive actions are safe;
- no important control is obscured.

### Custom IC
- a user can visually build an internal circuit;
- define external pins;
- validate;
- test;
- save;
- place;
- mount;
- reopen/edit;
- simulate.

### Analysis
- supported analysis features work on supported modes;
- unsupported cases are clearly explained;
- no fake placeholder features remain.

### UX
- core actions are discoverable;
- navigation is simplified;
- context menus are useful;
- right-click never directly deletes;
- confirmation is contextual and non-intrusive;
- undo works.

### Workspace
- right scrollbar works;
- bottom scrollbar works;
- zoom works;
- pan works;
- browser scrolling does not take over the canvas.

### Design
- one coherent theme;
- distinctive CircuitFlow identity;
- no generic AI-dashboard appearance;
- no excessive animation;
- no childish styling;
- no excessive realism;
- no direct Logisim/Deldsim clone appearance.

### Testing
- build passes;
- all old tests pass;
- all new tests pass;
- Chrome browser validation passes;
- no unexpected runtime console errors;
- no known layout overflow;
- no save/load regression.

---

# 29. DEFINITION OF DONE

Do not declare the project “finished” because:

- the build passes;
- the screen looks good;
- the feature opens;
- a happy path works.

A feature is done only when:

```text
Model
  ↓
State
  ↓
UI
  ↓
Interaction
  ↓
Simulation
  ↓
Persistence
  ↓
Undo/Redo
  ↓
Error handling
  ↓
Browser validation
  ↓
Regression suite
```

all agree.

---

# 30. FINAL PRODUCT PRINCIPLES

Keep these principles throughout every implementation decision:

### Principle 1
**Reliability before visual polish.**

### Principle 2
**Reuse proven existing architecture instead of duplicating systems.**

### Principle 3
**Contextual complexity instead of permanent clutter.**

### Principle 4
**Never surprise the user with destructive actions.**

### Principle 5
**Do not hide important functionality behind obscure UI.**

### Principle 6
**A student should understand what the tool is doing.**

### Principle 7
**Build a reusable component from a real circuit, not merely from a list of gate presets.**

### Principle 8
**One circuit model should power Build, Simulate, Analyze, Trainer Board, Schematic, and Custom IC behavior.**

### Principle 9
**Learn from other tools; do not clone them.**

### Principle 10
**Every visible primary feature must actually work.**

### Principle 11
**The interface should feel like one product.**

### Principle 12
**Do not trade away the good Canvas/Wiring/Trainer foundation merely for cosmetic changes.**

---

# 31. TARGET END-STATE

The final student workflow should feel like:

```text
Open CircuitFlow
      ↓
Choose Trainer Board / Schematic
      ↓
Open Component Library
      ↓
Place components
      ↓
Wire them
      ↓
Simulate
      ↓
Analyze
      ↓
Fix warnings
      ↓
Save
      ↓
Optional: turn working circuit into Custom IC
      ↓
Test Custom IC
      ↓
Save to My Components
      ↓
Reuse it in larger circuits
      ↓
Save/share project
```

And the most important reusable-design loop becomes:

```text
Build circuit
     ↓
Define interface
     ↓
Validate
     ↓
Test
     ↓
Package
     ↓
Custom IC
     ↓
Reuse
     ↓
Build larger system
```

This is the core educational value that should differentiate CircuitFlow.

---

# 32. IMPLEMENTATION AGENT STOP CONDITIONS

The implementation agent must STOP and report rather than improvise when:

- the current circuit model cannot safely support the requested behavior;
- changing a subsystem would break existing saved data;
- a required feature needs a new incompatible storage schema;
- a browser interaction cannot be made reliable with current architecture;
- a feature cannot be implemented consistently across supported modes;
- test results disagree with expected behavior;
- a migration would risk existing user projects;
- a UI requirement creates an accessibility or interaction conflict.

In those cases, report:

1. the conflict;
2. affected files/modules;
3. why it occurs;
4. safest alternatives;
5. recommended solution.

Do not silently choose a risky shortcut.

---

# 33. MASTER SUCCESS CRITERIA

CircuitFlow is successful when a student can:

- open it without confusion;
- build a circuit without fighting the UI;
- understand where components belong;
- wire circuits without wires crossing components;
- mount ICs without them drifting;
- remove components safely;
- create a reusable IC from a real circuit;
- test that IC;
- reuse it in larger designs;
- analyze the resulting circuit;
- save/load without corruption;
- undo mistakes;
- navigate large circuits without losing zoom/pan behavior;
- visually recognize CircuitFlow as one coherent product.

That is the launch target.

**Do not optimize for “maximum number of features.” Optimize for a small number of reliable, understandable, polished workflows that students will actually use.**
