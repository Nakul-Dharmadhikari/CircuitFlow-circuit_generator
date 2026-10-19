# CircuitFlow — Unified UI Redesign, Logo Integration & Critical Engineering Fixes
## Revised & Finalized Technical Implementation Plan (Version 2.2.0)

**Project:** CircuitFlow (`C:\Users\dell\Desktop\Deldsim Digital MP`)  
**Target Branch:** `integration/circuitflow-complete`  
**Verified Git HEAD:** `fe3e5da` (All 84/84 regression and browser test checks passing)  
**Status:** Revised Master Plan (Post-Review Engineering Clarifications) — Awaiting User Approval Before Code Implementation  

---

## 1. Executive Summary & Git Verification

### 1.1 Git Workspace Audit
- **Current Branch:** `integration/circuitflow-complete` (verified via `git branch --show-current`).
- **Current HEAD Commit:** `fe3e5da` (`test(regression): add targeted wiring, obstacle detour, and live Chrome verification suites`).
- **Working Tree State:** Clean; zero uncommitted modifications to existing code; only this Markdown planning document is present.
- **Safety Policy:**
  - All work remains strictly confined to `integration/circuitflow-complete`.
  - Zero modifications, merges, or pushes to `main`, `nakul`, or `atharv`.
  - Zero rebases, force-pushes, or history rewriting.
  - Implementation will execute in reviewable, logical commits only after explicit user approval of this plan.

---

## 2. Root Cause Analysis & Exact Source File Mapping

| Defect Domain | Exact File & Function / Line Range | Root Cause Diagnosis | Required Technical Correction |
|---|---|---|---|
| **Excessively Long Wire Detours** | `src/engine/wiring/wireRouter.ts` -> `buildSafePerimeterRoute()` (lines 550-602) | Global perimeter fallback computes `Math.min(...activeObstacles.map(o => o.y))` over the *entire canvas*. A wire between two IC pins jumps around the whole board instead of navigating local channels. | Replace global perimeter search with localized bounding box bypasses. Implement strict lexicographic search: exact Manhattan length first, bend count second. |
| **Silent Obstacle Cutting** | `src/engine/wiring/wireRouter.ts` -> `calculateOrthogonalWireRoute()` (lines 601-603) | When detour routes encounter obstacles, line 602 returns `primaryRoute` anyway, drawing straight through component bodies. | If all local corridors and A* channels are blocked, return `null` / unroutable flag. Do NOT draw through obstacles; render wire with a clear blocked state without corrupting the circuit. |
| **Accidental Branching / Net Hijack** | `src/hooks/useWireInteraction.ts` -> `handleWireMouseUp()` & `updateInProgressWire()` (lines 75-107, 210-250) | Wire stroke hit testing (`ROUTING_CONFIG.HIT_STROKE_WIDTH = 14px`) competes with pin hit testing (`24px`). Dropping a wire near another wire creates a branch junction even if a pin is nearby. | Enforce that any valid component pin within 24px takes absolute priority over wire stroke hits. Disable wire branching when starting/ending on power sources (VCC/GND). Preserve legitimate intentional branching. |
| **Unintended Net Merging at Crossings** | `src/core/circuit-model/adapters.ts` & `src/engine/wiring/hitTesting.ts` | Crossing wires in visual space risk being treated as electrical junctions if coordinate checks lack component-type gating. | Enforce that geometric crossings never merge electrical nets. Only explicit `junction` components represent electrical branching. |
| **IC Socket & Package Misalignment** | `src/engine/trainer/trainerBoardModel.ts` (`IC_SOCKET_WIDTH: 250, HEIGHT: 88`) vs `src/engine/simulator.ts` (`width: 240, height: 85`) | **9.09px cumulative pitch mismatch:** Socket holes in `TrainerBoard.tsx` use `col * (250 / 11)` (22.73px step) while IC pins use `col * (240 / 11)` (21.82px step). | Preserve existing chassis and module dimensions. Unify the socket-hole coordinate calculation in `TrainerBoard.tsx` to match the IC pin coordinates in `simulator.ts` using `DIP20_GEOMETRY`, achieving < 0.5px discrepancy across all 20 pins. |
| **Trainer Hardware Injected in Schematic** | `src/App.tsx:98` & `handleNewCircuit()` (lines 1569-1590) | Unconditional call to `ensureTrainerKit({ components: [], wires: [] })` instantiates 30+ physical trainer chassis components into every circuit. | Decouple circuit initialization by mode: Schematic mode initializes with `{ components: [], wires: [] }` on a clean grid; Trainer mode initializes with the trainer chassis. Mode switching never deletes user circuitry. |
| **Disjointed Branding & Old Favicon** | `src/app/layout/TopBar.tsx:179-185`, `LandingNavbar.tsx:34-46`, `public/favicon.svg` | Placeholder `<IconLightning>`, generic inline SVGs, and default Vite purple/cyan favicon remain in place. | Ingest the verified user master logo (`media_1791877554205.jpg`) into `public/assets/branding/`. Create `<CircuitFlowLogo>` component. Derive favicon from the supplied emblem. |
| **Cyan/Teal Public Homepage** | `src/features/landing/landing.css:8-25` | Dedicated homepage palette defines cyan (`#06B6D4`), teal (`#14B8A6`), and sky blue (`#38BDF8`). | Refactor all homepage variables to use Copper Lab tokens (`--accent-copper`: `#d97736`, `--bg-app`: `#121417` / `#f4f1ea`). |
| **Unrequested Homepage Section** | `src/features/landing/landing.css` & `src/presets/labExperiments.ts` | "Verified Laboratory Experiments" references in styles/navigation. | Completely remove all remnants of the section and dead CSS from public landing; keep curriculum labs strictly inside the authenticated workbench. |
| **Custom IC Studio Viewport Bleed** | `src/components/CustomICModal.tsx` & `src/styles/ui.css:2410-2440` | Modal allows canvas interaction bleed-through, uses fixed inline widths (`360px`), and retains inline non-theme styling. | Enforce full-screen viewport ownership (`100vw × 100vh`), suppress underlying canvas events, and migrate all controls to Copper Lab design tokens. |

---

## 3. Shortest Valid Wire Routing Engine — Highest Priority

### 3.1 Strict Lexicographic Objective: Exact Manhattan Length First, Bend Count Second
To resolve the contradiction between strict lexicographic ordering and arbitrary scalar relaxation:
1. **Objective Definition:**
   Two candidate collision-free routes $R_A$ and $R_B$ are compared lexicographically:
   $$R_A \prec R_B \iff \text{Length}(R_A) < \text{Length}(R_B) \lor \Big(\text{Length}(R_A) = \text{Length}(R_B) \land \text{Bends}(R_A) < \text{Bends}(R_B)\Big)$$
   - Total Manhattan length $\sum |x_{i+1} - x_i| + |y_{i+1} - y_i|$ is the **strictly primary** metric.
   - A route with shorter Manhattan length will **always** be selected over a longer route, regardless of bend count.
   - Bend count serves strictly as a secondary tie-breaker if and only if Manhattan lengths are identically equal.
   - There is zero "within 2px" relaxation; no longer route can ever defeat a shorter route.

2. **Search State, Priority Ordering & Termination Guarantee:**
   - **Search Graph:** The discrete orthogonal channel grid $G = (V, E)$ constructed from pin departure/arrival stubs, obstacle boundary offset lines ($X \pm \text{clearance}$, $Y \pm \text{clearance}$), and midpoints between adjacent obstacles.
   - **State Tuple:** $u = (x, y, d)$ where $(x, y) \in V$ and $d \in \{\text{'H'}, \text{'V'}, \text{'NONE'}\}$ represents the orientation of the arriving segment.
   - **Cost Tuple:** $\vec{g}(u) = (g_{\text{len}}, \; g_{\text{bends}})$.
     When transitioning from $u = (x, y, d)$ to adjacent neighbor $v = (x', y', d')$:
     $$g_{\text{len}}(v) = g_{\text{len}}(u) + (|x' - x| + |y' - y|)$$
     $$g_{\text{bends}}(v) = g_{\text{bends}}(u) + \begin{cases} 1 & \text{if } d \ne d' \text{ and } d \ne \text{'NONE'} \\ 0 & \text{otherwise} \end{cases}$$
   - **Admissible Heuristic Tuple:** $\vec{h}(u) = (h_{\text{manhattan}}, \; 0)$ where:
     $$h_{\text{manhattan}}(u) = |u.x - \text{target}.x| + |u.y - \text{target}.y|$$
     Because $h_{\text{manhattan}}$ never overestimates actual $L_1$ distance and $h_{\text{bends}} = 0$ is monotonic, the heuristic is admissible and consistent.
   - **Priority Queue Evaluation:** State $A$ has higher priority than State $B$ if and only if:
     $$(g_{\text{len}}(A) + h_{\text{manhattan}}(A)) < (g_{\text{len}}(B) + h_{\text{manhattan}}(B)) \lor \Big((g_{\text{len}}(A) + h_{\text{manhattan}}(A)) = (g_{\text{len}}(B) + h_{\text{manhattan}}(B)) \land g_{\text{bends}}(A) < g_{\text{bends}}(B)\Big)$$
   - **Termination Condition:** When the target state $(x_{\text{target}}, y_{\text{target}})$ is extracted from the priority queue, the algorithm is mathematically guaranteed to have found the route of minimal Manhattan length on the channel graph $G$, and among all minimal-length routes on $G$, one with minimal bends.

3. **Hard Component Keep-Out Zones & Safe Pin Approach:**
   - **Keep-Out Boundaries:** Every component body $C$ defines a solid bounding box with an 8px safety clearance:
     $$\text{KeepOutBox}(C) = [C.x - 8, \; C.y - 8, \; C.width + 16, \; C.height + 16]$$
     No route segment may intersect this region.
   - **Safe Pin Stubs:** Wires depart and arrive perpendicular to component package edges using a 16px normal stub vector (`computeSafeStub`), preventing corner clipping.

4. **Localized Obstacle-Aware Channels vs Global Perimeter:**
   - The fallback function `buildSafePerimeterRoute` in `wireRouter.ts` will no longer compute canvas-wide minimums across all obstacles.
   - When a direct 2-point or 3-point Manhattan segment is obstructed by an obstacle $O$, the router inspects the immediate bounding perimeter channels of $O$ (top, bottom, left, right) and channels between adjacent components.
   - **Unroutable Wire State:** If all local channels and A* paths are physically blocked, the router returns `isBlocked: true` (or `null`).
     - The wire is rendered with a distinct dashed blocked state and a collision badge.
     - The router **never** silently falls back to drawing through a component body.
     - Logical connectivity (`Wire.fromCompId`, `Wire.toCompId`) is preserved; simulation is not corrupted.

5. **Reference Comparison Testing:**
   - A trusted reference test script (`scripts/test-shortest-path-lexicographic.ts`) will compare routes against a reference grid Dijkstra/BFS implementation, validating:
     - Equal-length alternatives (asserting minimal bend selection).
     - Single obstacle detours (asserting minimal path length).
     - Multi-obstacle narrow corridors (asserting obstacle avoidance).
     - Fully blocked paths (asserting `isBlocked: true` without obstacle penetration).

---

## 4. Electrical Net Integrity & Branching Rules

### 4.1 Audit of Existing Connectivity Model
- In `src/engine/simulator.ts:2496-2510`, electrical nets are built as connected graph components formed by wires and component pins.
- A legitimate branch in CircuitFlow consists of an explicit `junction` component (`createComponent('junction', x-8, y-8)`) that splits an existing wire into two segments and connects a third.
- Geometric crossings in visual space do not share pin endpoints in `circuit.wires`, and the simulator engine already treats them as independent.

### 4.2 Pin Snapping Priority vs Wire Hit-Testing
- **24px Pin Priority Rule:** When dragging a wire endpoint in `useWireInteraction.ts`, if the cursor is within 24px of any valid component pin, that pin receives absolute priority over wire stroke hits (`ROUTING_CONFIG.HIT_STROKE_WIDTH = 14px`).
- **Branch Suppression Near Pins:** Dropping a wire within 24px of a pin will **never** create a branch junction on a nearby wire. The connection binds strictly to the intended terminal.
- **Power Rail Guard:** Wires originating from or terminating at VCC or GND rails (`vcc`, `gnd`, `trainer_vcc`, `trainer_gnd`) cannot create branch junctions on signal wires.
- **Preservation of Legitimate Branches:**
  - Double-clicking an existing wire to insert a branch junction remains fully supported.
  - Intentionally dropping an in-progress signal wire onto an existing signal wire in open space (greater than 24px away from any pin) continues to create a valid branch junction.

---

## 5. Trainer Board & Mounted IC Geometry — Verification & Shared Standard

### 5.1 Verification of Actual Codebase Geometry
Inspection of the real code confirms:
- In `src/engine/simulator.ts:223-224`: `ic_7408` has `width: 240, height: 85`.
- In `src/engine/trainer/trainerBoardModel.ts:55-56`: `IC_SOCKET_WIDTH: 250, IC_SOCKET_HEIGHT: 88, IC_SOCKET_PITCH_X: 274, IC_Y_OFFSET: 135`.
- In `src/engine/trainer/trainerBoardModel.ts`: `mountICOnSocket` sets `mountedIC.x = slot.x, mountedIC.y = slot.y`.
- In `src/components/TrainerBoard.tsx:394, 473`: Socket holes are computed using `col * (slot.width / 11)` = `col * (250 / 11) = 22.727px`.
- In `src/engine/simulator.ts:159`: IC pins are computed using `col * (width / 11)` = `col * (240 / 11) = 21.818px`.
- **Confirmed Cumulative Discrepancy:** Pin 10 is at $218.18\text{px}$ while Socket Hole 10 is at $227.27\text{px}$ — a **9.09px physical misalignment**.

### 5.2 Assessment of Changing Socket Dimensions vs Shared Coordinate Alignment
- **Chassis Stability Constraint:** Changing `IC_SOCKET_WIDTH` from 250 to 240 in `trainerBoardModel.ts` would shrink `MODULE_1_WIDTH` (currently $18 + 4 \times 250 + 3 \times 24 + 18 = 1108\text{px}$), change `IC_SOCKET_PITCH_X` from 274 to 264, and misalign the 16 inputs and 16 outputs spaced across the board.
- **The Correct Technical Solution:**
  - Keep the physical socket outer bounds ($250 \times 88\text{px}$) and module pitch in `trainerBoardModel.ts` to preserve existing board layout, module expansion, and wire attachment points.
  - Define `DIP20_GEOMETRY` as the shared coordinate definition for the 20 pins:
    ```ts
    export const DIP20_GEOMETRY = {
      PACKAGE_WIDTH: 240,
      PACKAGE_HEIGHT: 85,
      PINS_PER_SIDE: 10,
      // Shared horizontal pin center offset from socket left origin
      getPinX: (col: number) => Math.round(col * (240 / 11)),
      // Top row (pins 20..11): y = 0; Bottom row (pins 1..10): y = 85
    } as const;
    ```
  - In `TrainerBoard.tsx`, socket hole positions for both the top row (pins 20..11) and bottom row (pins 1..10) will use `DIP20_GEOMETRY.getPinX(col)` directly.
  - In `simulator.ts`, IC pin generation will use `DIP20_GEOMETRY.getPinX(col)`.
  - Because `mountedIC.x = slot.x` and `mountedIC.y = slot.y`, every pin center and socket hole center will match with **$< 0.5\text{px}$ discrepancy across all 20 pins**.

### 5.3 Rigid Socket Ownership & Synchronous Translation
- **Derived Coordinates:** Mounted IC position is strictly derived from the socket: `ic.x = slot.x, ic.y = slot.y`.
- **Independent Drag Disabled:** Dragging a mounted IC directly is blocked in `GateComponent.tsx` and `useCanvasInteraction.ts`.
- **Synchronous Board Movement:** Moving the board or module translates board origin, modules, sockets, mounted ICs, pin coordinates, and attached wire endpoints by $(\Delta x, \Delta y)$ synchronously.
- **Transform Invariance:** Panning, zooming, module expansion, and reloads maintain 100% stable seating and pin alignment.

---

## 6. Official Logo, Shared Component & Browser Favicon

### 6.1 Verified Canonical Master Asset on Local Filesystem
The exact master image supplied by the user has been verified on disk at:
```
C:\Users\dell\.gemini\antigravity-ide\brain\e2cf468d-f307-4987-96c0-94aec3408609\.user_uploaded\media_1791877554205.jpg
```
- **File Size:** 175,606 bytes.
- **Visual Description:** Deep dark background (`#101010`), 3D metallic copper capital "C" emblem with 3 horizontal circuit traces ending in glowing circular amber pads, with the bold geometric wordmark "CircuitFlow" ("Circuit" in warm ivory `#F5F0E6`, "Flow" in glowing burnt orange `#E06A26`).
- **Asset Placement:** In Stage 5, this exact file will be ingested into:
  `C:\Users\dell\Desktop\Deldsim Digital MP\public\assets\branding\circuitflow-logo-master.jpg`
  No replacement or redrawn logo will be substituted.

### 6.2 Shared Component: `<CircuitFlowLogo>`
Implemented at `src/components/common/CircuitFlowLogo.tsx`:
- Props: `variant?: 'full' | 'emblem' | 'wordmark'`, `size?: 'sm' | 'md' | 'lg' | 'xl'`, `className?: string`.
- Employs `object-fit: contain` to preserve artwork aspect ratio.
- On dark surfaces: renders natively over charcoal backgrounds.
- On light surfaces: contained within a dark technical badge (`background: #121417; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 4px 10px;`) preserving glowing pads and ivory lettering.

### 6.3 Browser Favicon
- Derived strictly from the emblem portion of the master asset.
- Placed at `public/favicon.svg` and `public/favicon.ico`.
- `index.html` updated to `<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=2" />`.

### 6.4 Comprehensive Brand Audit Across Surfaces
- **Public Landing Navbar:** Replaces inline SVG with `<CircuitFlowLogo variant="full" size="md" />`.
- **Public Landing Hero:** Centered `<CircuitFlowLogo variant="full" size="xl" />`.
- **Application TopBar:** Replaces `<IconLightning>` with `<CircuitFlowLogo variant="full" size="sm" />`.
- **Custom IC Studio:** Replaces text header with `<CircuitFlowLogo variant="full" size="sm" />`.
- **Auth Modal:** Replaces generic text with `<CircuitFlowLogo variant="full" size="lg" />`.

### 6.5 Theme Semantics & Functional Signal Colors (Strictly Protected)
- **Brand Palette:** Orange/copper, charcoal, warm ivory, and neutral slate only.
- **Functional Logic State Colors (Strictly Protected):**
  - **HIGH (5V / Logic 1):** `--signal-high: #22c55e` (Emerald Green)
  - **LOW (0V / Logic 0):** `--signal-low: #64748b` (Slate Grey)
  - **HIGH-Z (Tri-State):** `--signal-z: #9ca3af` [Dark] / `#52525b` [Light] (Neutral Zinc/Grey — **strictly distinct from warning amber**)
  - **ERROR / Contention:** `--signal-x: #ef4444` [Dark] / `#dc2626` [Light] (Crimson)
  - **WARNING:** `--signal-warning: #f59e0b` [Dark] / `#92400e` [Light] (Accessible Amber)

---

## 7. Schematic and Trainer Mode Safety & Isolation

### 7.1 Defined Mode Behaviors
| Mode | Canvas Grid State | Hardware Presence | Circuit Data Model |
|---|---|---|---|
| **Trainer Mode (`hardware`)** | Drafting grid with Trainer Board chassis | Chassis, sockets, switches, power, clock, and probes are visible and interactive | All components and wires preserved |
| **Schematic Mode (`circuit`)** | Pure CAD drafting grid | Trainer chassis and fixed hardware peripherals are hidden; zero auto-injected hardware | All components and wires preserved |

### 7.2 Safety Guarantees During Mode Switching
- **Zero Data Loss:** Switching between Trainer and Schematic mode **never** deletes, truncates, or overwrites components or wires in the circuit model.
- **Rendering Gate in Canvas:** In Schematic mode, `Canvas.tsx` filters out fixed trainer hardware (`c.isTrainerFixed && !c.customProps?.trainerMount`), rendering only user-created logic gates, custom ICs, and user wires.
- **"New Project" Behavior:**
  - In Trainer mode: "New Project" initializes the hardware trainer board ready for lab use.
  - In Schematic mode: "New Project" initializes an empty `{ components: [], wires: [] }` canvas on a pristine drafting grid without injecting trainer hardware.

---

## 8. Public Homepage Alignment & Section Removal

### 8.1 Palette & Style Unification
- Complete refactoring of `src/features/landing/landing.css` to use Copper Lab tokens (`--accent-copper`, `--bg-app`, `--border-subtle`).
- Radial background glows updated from cyan/teal to restrained copper/amber (`rgba(217, 119, 54, 0.06)`).
- CTA buttons, feature cards, and navigation links aligned with the authenticated workbench.

### 8.2 Total Removal of "Verified Laboratory Experiments"
- Confirm complete absence of the section from `LandingPage.tsx` JSX.
- Purge all leftover CSS selectors, classes, and spacing rules from `landing.css`.
- Zero unsolicited replacement sections introduced. Existing working navigation, auth flows, and simulator launch buttons fully preserved.

---

## 9. Custom IC Studio — Full-Screen & Theme Unification

### 9.1 Viewport Ownership & Event Isolation
- In `src/styles/ui.css` and `src/components/CustomICModal.tsx`:
  `position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 2500; border-radius: 0; border: none;`
- Backdrop completely suppresses underlying canvas pointer and keyboard interactions.
- Dual-pane layout (left sidebar 360px, right workspace flex 1) reflows cleanly without clipping at 1280×720 and 1600×900.

### 9.2 Complete Theme Token Integration
- All inline `#34d399` and hardcoded colors migrated to Copper Lab semantic tokens.
- Tabs, package visualizer, truth table headers, testing stepper, and save buttons standardized.

---

## 10. Implementation Sequence (9 Gated Stages)

```
Stage 1: Wire Routing Lexicographic Optimization & Pin Snap Priority
    ├── Commit: fix(router): implement lexicographic shortest-path routing and 24px pin-snap priority
Stage 2: Obstacle Keep-Out Hardening & Unroutable State Reporting
    ├── Commit: fix(router): enforce hard component keep-outs and clear unroutable state reporting
Stage 3: Unified Trainer Board & IC Socket Geometry
    ├── Commit: fix(trainer): align socket-hole coordinates with IC pin coordinates via DIP20_GEOMETRY
Stage 4: Schematic Mode Canvas Isolation & Switching Safety
    ├── Commit: fix(schematic): decouple initialization from trainer auto-injection and preserve user circuits
Stage 5: Official Master Logo Asset Ingestion & Favicon
    ├── Commit: feat(brand): integrate canonical CircuitFlow logo component and tab favicon
Stage 6: Orange/Copper Design System Unification (Landing & App Shell)
    ├── Commit: style(theme): unify public landing and application shell with Copper Lab tokens
Stage 7: Public Homepage Experiments Section Purge
    ├── Commit: fix(landing): purge unrequested experiments section styles and residual spacing
Stage 8: Full-Screen Custom IC Studio Viewport Ownership
    ├── Commit: fix(studio): enforce full-screen viewport ownership and theme consistency
Stage 9: Comprehensive Automated Regression & Real Chrome Browser Verification
    └── Commit: test(verification): execute full test suites and capture multi-viewport audit
```

---

## 11. Accurate Test Plan: Baseline, New Suites & Browser Verification

### 11.1 Baseline Existing Test Suites (Must Continue Passing 100%)
These suites currently exist in `scripts/` and passed on HEAD `fe3e5da`:
1. `npx tsx scripts/test-wiring-correctness-regression.ts` (Net isolation, obstacle detours, board movement)
2. `npx tsx scripts/test-phase1-mounted-ic.ts` (10 tests: socket ownership, locking, board movement, ejection)
3. `npx tsx scripts/test-phase2-wire-routing.ts` (14 tests: Manhattan routing, lanes, zoom invariance)
4. `npx tsx scripts/test-phase7-custom-ic.ts` (11 tests: truth tables, pin mappings, validation, trainer mounting)
5. `npx tsx scripts/test-phase8-browser.ts` (11 checks: analysis center, 7 tabs, theme switching)
6. `npx tsx scripts/test-phase9-learning.ts` (6 tests: curriculum lab validation)
7. `npx tsx scripts/test-phase9-browser.ts` (21 checks: onboarding tour, HUD, lab assistant, themes)
8. `npx tsx scripts/test-phase6-browser.ts` (7 checks: theme persistence, toolbar, contrast)

### 11.2 Newly Planned Test Suites (Created in Appropriate Stages)
1. **`scripts/test-shortest-path-lexicographic.ts` (Stage 1):**
   - Compares candidate routes against a trusted reference shortest-path implementation.
   - Tests routing between adjacent IC pins, distant gates, and through narrow corridors.
   - Asserts that a longer route is never chosen over a shorter valid route.
   - Tests equal-length alternatives, asserting minimal bend selection.
   - Verifies 0 intersections with component keep-out boxes.
   - Verifies that fully blocked routes report `isBlocked: true` without cutting through obstacles.
2. **`scripts/test-pin-snap-priority.ts` (Stage 1):**
   - Asserts 24px pin snap over 14px wire hit stroke.
   - Tests VCC/GND drop near signal wire: verifies zero branch creation and zero net contamination.
   - Asserts visual wire crossings maintain separate electrical net IDs.
   - Verifies legitimate branches (via double-click or dropping in open space) remain intact.
3. **`scripts/test-socket-pin-alignment.ts` (Stage 3):**
   - Calculates coordinates of pins 1..20 and socket holes 1..20.
   - Asserts maximum discrepancy $\le 0.5\text{px}$ across all 20 pins.
   - Verifies alignment is preserved after board translation, module expansion, zoom, and reload.
4. **`scripts/test-schematic-mode-safety.ts` (Stage 4):**
   - Verifies Schematic mode "New Project" contains 0 trainer chassis components.
   - Verifies repeated mode toggling (Trainer <-> Schematic) preserves user gates, custom ICs, and wires.
5. **`scripts/verify-unified-ui-redesign-browser.ts` (Stage 9):**
   - Live Puppeteer Chrome verification:
     - Canonical logo rendered on Landing, TopBar, Studio, Auth modal.
     - Favicon verified in browser document head.
     - Zero cyan/teal brand accents present.
     - Homepage "Verified Laboratory Experiments" absent.
     - Custom IC Studio occupies 100vw × 100vh.
     - 0 browser console errors.

### 11.3 Production Build Check
- `npm run build` executed to verify TypeScript compilation and bundle validity.

---

## 12. Viewport Review Matrix (1280×720 & 1600×900)

| Interface Element | 1280×720 Desktop Benchmark | 1600×900 Desktop Benchmark |
|---|---|---|
| **TopBar Header** | Brand logo, mode switcher, menus, and sim controls fit without wrapping or truncation. | Generous horizontal breathing room; centered navigation bar. |
| **Public Landing Hero** | Logo emblem and wordmark crisp; CTA button prominent; no horizontal scrolling. | Expansive, balanced technical hero with copper accent glow. |
| **Trainer Board Workspace** | Module 1 accessible with smooth horizontal pan and scrollbars. | Full 1180px Module 1 visible without scrolling. |
| **Custom IC Studio** | Dual-pane layout (340px sidebar + flex workspace) fits comfortably. | Full expanded dual-pane layout with spacious internal visualizer. |
| **Analysis Center Modal** | Tabs reflow cleanly; truth tables scroll vertically within viewport. | Side-by-side K-Map layers and expanded test bench rows. |
| **Contrast Compliance** | Light theme $\ge$ 4.5:1 on Warm Ivory; Dark theme $\ge$ 7:1 on Graphite. | Full WCAG 2.1 AA compliance verified across both themes. |

---

## 13. Safety & Control Confirmations

- **Workspace:** `C:\Users\dell\Desktop\Deldsim Digital MP`
- **Branch:** `integration/circuitflow-complete` (HEAD: `fe3e5da`)
- **No Unapproved Actions:** No application code, stylesheets, configuration, or tests have been modified during this planning phase.
- **Next Step:** Awaiting your explicit approval of this revised plan before beginning implementation of Stage 1.
