# Phase 3 Implementation Plan — Interactive UI, History, Undo/Redo, and Scramble

> **Phase Status:** `PLANNING / READY_FOR_INDEPENDENT_ACCEPTANCE`
> **Implementation Readiness:** `BLOCKED_PENDING_ARCHITECTURE_DOC_SYNC`
> **Authoritative Starting Baseline:** `0560ed06b1c8204096f75a69ae494eb6f22261df` (Commit `Close Phase 2 documentation` on `main`)
> **Applicability:** Web Application (`apps/web`), Interactive Play Mode, Canonical History Timeline, Undo/Redo, Deterministic Scramble, Keyboard Navigation, Playwright Browser E2E Automation

---

## 1. Executive Summary & Objective

Phase 3 builds the complete user-facing interactive puzzle experience on top of the accepted Phase 2 3D visual and kinematic engine. It introduces:
1. **Architecture & Test Documentation Preflight Sync:** Reconciling historical architectural docs (`SYSTEM_ARCHITECTURE.md`, `TEST_STRATEGY.md`) with actual accepted `apps/web` topology prior to implementation.
2. **Canonical Move History & Timeline:** Linear history of committed canonical moves and resulting `(GearCubeState, SpatialFrame)` pairs.
3. **Undo & Redo Operations:** Reversible step navigation and arbitrary timeline scrubbing while puzzle is `IDLE`.
4. **Deterministic Seeded Scramble Generator:** PRNG-driven move sequence generation from user seed with instant baseline reset.
5. **Keyboard Interaction:** Ergonomic key bindings for 12 face moves (`U/D/F/B/R/L` with Shift for CCW) and `Ctrl+Z` / `Ctrl+Y` undo/redo.
6. **Responsive Play Mode UI:** Minimalist, high-performance control layout with timeline scrubber, scramble panel, and mode toggle.
7. **Playwright Browser E2E Automation:** Headless browser integration tests validating end-to-end user workflows, state integrity, and focus management.

---

## 2. Architecture, State Ownership & Dependencies

### 2.1. Single Source of Truth Invariant
- **`RECOMMENDED_APPLICATION_STATE_ARCHITECTURE`:** `APPS_WEB_LOCAL_APPLICATION_STATE`
- **`ONE_APPLICATION_CANONICAL_SESSION_AUTHORITY`:** `YES`
- No secondary or duplicate state stores are introduced. The application state maintains a single coherent session model.
- History snapshots store pure domain `(GearCubeState, SpatialFrame)` structures. Render transforms are **never** stored as history truth.
- `apps/web` retains sole ownership of application-level session orchestration. No artificial extraction of `packages/ui` or `packages/renderer` is needed for Phase 3.

### 2.2. State Model Hierarchy
```text
┌─────────────────────────────────────────────────────────────────┐
│                    Application State Model                      │
│                                                                 │
│  ┌───────────────────────┐         ┌─────────────────────────┐  │
│  │   PlayHistoryState    │         │  GearCubeSessionState   │  │
│  │                       │         │                         │  │
│  │ - initialBaseline     │◄────────┤ - currentState          │  │
│  │ - entries: Entry[]    │ (snaps) │ - currentFrame          │  │
│  │ - cursorIndex: number │         │ - stagedMove (Plan)     │  │
│  │                       │         │ - displayTransforms     │  │
│  │                       │         │ - interactionMode       │  │
│  └───────────────────────┘         └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3. Architecture Document Drift & Preflight Gate
- **`ARCHITECTURE_DOCUMENT_DRIFT`:** `NON_BLOCKING_FOR_PHASE3_PLAN`
- **`ARCHITECTURE_DOC_SYNC_REQUIRED_BEFORE_IMPLEMENTATION`:** `YES`
- **`PHASE3_IMPLEMENTATION_BLOCKED_BY_DOC_SYNC`:** `YES`
- **`PHASE3_NEW_ADR_REQUIRED`:** `NO`
- **Reasoning:** Current architecture documents (`SYSTEM_ARCHITECTURE.md`, `TEST_STRATEGY.md`) historically describe concrete modular packages (`packages/ui`, `packages/renderer`, Zustand) that were consolidated into `apps/web` during accepted Phase 2. Because canonical dependency direction (`UI -> Renderer -> Kinematics -> Core`) and domain authority remain strictly preserved, no new ADR is required. However, a dedicated preflight documentation sync must be executed before Phase 3A implementation begins.

### 2.4. Dependency & Tooling Evaluation (Zustand & Playwright)
- **`ZUSTAND_RECOMMENDATION`:** `DO_NOT_USE` (React state / reducer with pure state transition functions is 100% sufficient; zero extra runtime dependencies).
- **`NEW_RUNTIME_DEPENDENCY_REQUIRED`:** `NO`
- **`PLAYWRIGHT_RECOMMENDATION`:** `ADD_IN_PHASE3`
- **`PLAYWRIGHT_RUNTIME_DEPENDENCY`:** `NO`
- **`PLAYWRIGHT_DEV_DEPENDENCY`:** `YES` (Introduced in Phase 3C at root repository level).
- **`PLAYWRIGHT_CONFIG_LOCATION`:** `playwright.config.ts` (root) and tests in `tests/e2e/**`.
- **`PLAYWRIGHT_PIXEL_PERFECT_ASSERTIONS`:** `NO`
- **`RENDERER_PIXELS_USED_AS_STATE_ORACLE`:** `NO` (Assertions verify DOM interactions, disabled states, focus exclusion, and text/attribute state indicators; not WebGL canvas pixels).
- **Agent Browser vs Playwright Distinction:**
  - **`INTERACTIVE_AGENT_BROWSER_TOOL`:** `UNAVAILABLE` (Agent UI lacks interactive WebGL browser driver).
  - **`REPOSITORY_BROWSER_AUTOMATION`:** `PLANNED_VIA_PLAYWRIGHT` (CLI-driven automated E2E test runner).

---

## 3. Canonical History & Timeline Specification

### 3.1. History Unit & Entry Definition
- **`HISTORY_UNIT`:** `CANONICAL_COMMITTED_MOVE`
- A history entry is created **only** when a canonical 180° move completes and commits.
  - Completed `TWO_STEP` second half: **Created**.
  - Completed `DIRECT_180` turn: **Created**.
  - `TWO_STEP` midpoint lock (`HALF_TURN_LOCKED`): **NOT Created**.
  - `TWO_STEP` cancellation from midpoint: **NOT Created**.
  - Mode switches (`TWO_STEP` <-> `DIRECT_180`): **NOT Created**.
  - Camera orbit / zoom: **NOT Created**.

### 3.2. History Entry Schema
```typescript
export interface HistoryEntry {
  readonly move: Move;
  readonly resultingState: GearCubeState;
  readonly resultingFrame: SpatialFrame;
  readonly notation: string; // e.g. "U+", "F-", "R+"
  readonly timestamp: number;
}

export interface PlayHistoryState {
  readonly initialBaselineState: GearCubeState;
  readonly initialBaselineFrame: SpatialFrame;
  readonly entries: readonly HistoryEntry[];
  readonly cursorIndex: number; // -1 = initialBaseline, 0..entries.length - 1
}
```

### 3.3. SpatialFrame Invariant
- **`HISTORY_FRAME_AWARE`:** `YES`
- **`UNDO_FRAME_AWARE`:** `YES`
- **`REDO_FRAME_AWARE`:** `YES`
- Every history step explicitly pairs `GearCubeState` with its corresponding `SpatialFrame`. Restoring any history point restores both domain state and spatial frame simultaneously.

---

## 4. Undo, Redo, and Scrubber Semantics

### 4.1. Lifecycle Constraints
- **`UNDO_ALLOWED_WHEN`:** `IDLE_ONLY` (`session.stagedMove === null`)
- **`REDO_ALLOWED_WHEN`:** `IDLE_ONLY` (`session.stagedMove === null`)
- **`SCRUB_ALLOWED_WHEN`:** `IDLE_ONLY` (`session.stagedMove === null`)
- While puzzle is busy (`FIRST_HALF_ANIMATING`, `HALF_TURN_LOCKED`, `SECOND_HALF_ANIMATING`, `CANCEL_HALF_ANIMATING`, `DIRECT_FULL_ANIMATING`), Undo, Redo, and Timeline Scrubbing are strictly disabled.

### 4.2. Navigation & Truncation Rules
1. **Undo (`cursorIndex > -1`):**
   - Decrements `cursorIndex` by 1.
   - Target snapshot: `cursorIndex === -1 ? (initialBaselineState, initialBaselineFrame) : (entries[cursorIndex].resultingState, entries[cursorIndex].resultingFrame)`.
   - Restores session state, frame, and recalculates fresh display transforms: `placementToTransforms(materializeState(targetState, targetFrame))`.
2. **Redo (`cursorIndex < entries.length - 1`):**
   - Increments `cursorIndex` by 1.
   - Restores snapshot at `entries[cursorIndex]`.
   - Updates display transforms to fresh projection.
3. **Arbitrary Scrub (`-1 <= targetIndex < entries.length`):**
   - Instant-snaps cursor to `targetIndex`.
   - Restores snapshot and derives fresh display transforms.
4. **Branching on New Move (`NEW_MOVE_AFTER_UNDO: TRUNCATE_REDO_BRANCH`):**
   - When user executes a new move while `cursorIndex < entries.length - 1`, all entries with index `> cursorIndex` are discarded.
   - The new move is appended at `cursorIndex + 1`, and `cursorIndex` advances to point to the new entry.

---

## 5. Deterministic Seeded Scramble Contract

### 5.1. Scramble Specification
- **`SCRAMBLE_OUTPUT`:** `readonly Move[]`
- **`SOURCE_MOVE_VOCABULARY`:** `@gearcube/core` `ALL_MOVES` (12 directed moves).
- **`DEFAULT_SCRAMBLE_LENGTH`:** `20`
- **`ALLOWED_LENGTH_RANGE`:** `1 .. 50`
- **`PRNG_ALGORITHM`:** Mulberry32 seeded with 32-bit integer hash of user seed string.
- **`UNIFORM_RANDOM_STATE_CLAIM`:** `NO` (Pseudorandom move walk, not uniform distribution).
- **`ADJACENT_MOVE_FILTERING`:** No two consecutive moves on the same face (e.g. `U+` followed by `U-` or `U+` on face `U` is rejected and redrawn).

### 5.2. Scramble Application Model
- Applying a scramble computes the final `(scrambledState, scrambledFrame)` by sequentially applying `applyMove` and `nextSpatialFrame` across the scramble sequence.
- Sets `initialBaselineState = scrambledState` and `initialBaselineFrame = scrambledFrame`.
- Resets `entries = []` and `cursorIndex = -1`.
- Snaps display transforms to fresh projection: `placementToTransforms(materializeState(scrambledState, scrambledFrame))`.
- Displays the generated scramble sequence notation in the Scramble panel for user reference.

---

## 6. Keyboard Interaction Contract

### 6.1. Key Mapping Table
| Key | Modifier | Move / Action | Condition |
| :--- | :--- | :--- | :--- |
| `u`, `d`, `f`, `b`, `r`, `l` | None | `U+`, `D+`, `F+`, `B+`, `R+`, `L+` | IDLE (or valid TWO_STEP active face) |
| `U`, `D`, `F`, `B`, `R`, `L` | `Shift` | `U-`, `D-`, `F-`, `B-`, `R-`, `L-` | IDLE (or valid TWO_STEP active face) |
| `z` | `Ctrl` / `Cmd` | `Undo` | IDLE & `cursorIndex > -1` |
| `z` | `Ctrl+Shift` / `Cmd+Shift` | `Redo` | IDLE & `cursorIndex < entries.length - 1` |
| `y` | `Ctrl` / `Cmd` | `Redo` | IDLE & `cursorIndex < entries.length - 1` |

### 6.2. Keyboard Guarding Rules
- Shortcuts are strictly ignored when focus is inside text inputs (`<input>`, `<textarea>`, `<select>`, `contenteditable`).
- `event.repeat` is ignored to avoid rapid-fire uncontrolled input.
- Inactive moves or moves during busy animation states are ignored.

---

## 7. Responsive UI & Visual Design

### 7.1. Component Layout
- **Canvas Area (Center):** 3D WebGL Gear Cube Viewport with OrbitControls.
- **Header Overlay (Top):**
  - Project Title & Status Badge.
  - `Direct 180°` Toggle Switch (OFF = TWO_STEP, ON = DIRECT_180).
  - Scramble Generator Toolbar (Seed input, Scramble button, Notation badge).
- **Control Overlay (Bottom / Side):**
  - 12 Move Buttons Grid (Grouped by Face with +/- directions).
  - History Toolbar (Undo, Redo, Reset Baseline buttons).
  - Timeline Scrubber (Horizontal chip list showing move index and notation with active cursor highlight).
  - Collapsible Keyboard Shortcuts Help Drawer.

---

## 8. Phase 3 Subphase Decomposition

Phase 3 is decomposed into four dependency-ordered, independently verifiable subphases:

```text
[ Phase 3 Preflight: Architecture & Test Documentation Sync ]
  - Synchronize SYSTEM_ARCHITECTURE.md and TEST_STRATEGY.md with accepted apps/web topology.
  - Record Playwright E2E testing strategy and dependency boundaries.
        │
        ▼
[ Phase 3A: Application History & Deterministic Scramble Foundation ]
  - Pure domain modules: history state transitions & Mulberry32 scramble generator.
  - Comprehensive Vitest unit tests (100% pure TypeScript).
        │
        ▼
[ Phase 3B: Undo / Redo / Timeline / Play UI Integration ]
  - Wire history engine to session orchestration in apps/web.
  - Timeline Scrubber component, Undo/Redo controls, Scramble UI panel.
        │
        ▼
[ Phase 3C: Keyboard Controls, Responsive Layout & Playwright Browser E2E ]
  - Global keyboard listener, responsive mobile/desktop layout styles.
  - Root Playwright E2E configuration and automated browser acceptance test suite.
```

### 8.1. Phase 3 Preflight: Architecture & Test Documentation Sync
- **Objective:** Synchronize concrete architecture and test strategy documents with the accepted codebase.
- **Deliverables:**
  - `docs/architecture/SYSTEM_ARCHITECTURE.md`: Document actual `apps/web` renderer/UI placement, zero runtime Zustand dependency, and layer boundaries.
  - `docs/development/TEST_STRATEGY.md`: Formalize Playwright browser E2E test plan for interaction flows.
- **Preconditions:** Phase 3 planning accepted.

### 8.2. Phase 3A: Application History & Scramble Engine
- **Objective:** Pure domain logic for history state transitions and deterministic scramble generation.
- **Deliverables:**
  - `apps/web/src/components/history/history.ts`: Pure history data types, push entry, undo, redo, scrub, and branch truncation functions.
  - `apps/web/src/components/history/scramble.ts`: Mulberry32 seeded PRNG and deterministic scramble sequence generator.
  - `apps/web/src/components/history/history.test.ts`: 100% pure unit test coverage for all history operations.
  - `apps/web/src/components/history/scramble.test.ts`: Determinism, seed repeatability, and move vocabulary validation.
- **Preconditions:** Phase 3 Preflight accepted & committed.

### 8.3. Phase 3B: Interactive Play Store, Undo/Redo & Scrubber UI
- **Objective:** Interactive UI components and session history wiring.
- **Deliverables:**
  - Wire history state into `GearCubeViewport.tsx` / `animation.ts`.
  - `HistoryControls.tsx`: Undo, Redo, and Reset buttons with dynamic disablement.
  - `TimelineScrubber.tsx`: Scrollable move list with clickable chips for arbitrary scrub.
  - `ScramblePanel.tsx`: Seed input and scramble trigger.
  - Unit and component tests for UI interactions.
- **Preconditions:** Phase 3A accepted & committed.

### 8.4. Phase 3C: Keyboard Controls, Responsive Layout & Playwright Browser E2E
- **Objective:** Keyboard shortcuts, responsive CSS layout, and automated browser E2E verification.
- **Deliverables:**
  - `useKeyboardControls.ts`: Keyboard event listener with focus detection and modifier parsing.
  - `App.css`: Responsive styling for desktop sidebars and mobile stacked drawers.
  - `playwright.config.ts`: Root Playwright E2E configuration (devDependency).
  - `tests/e2e/play-mode.spec.ts`: Automated browser E2E test suite covering all interaction workflows.
  - Human Browser Acceptance: Full verification of moves, undo/redo, scrub, scramble, keyboard, and orbit controls.
- **Preconditions:** Phase 3B accepted & committed.

---

## 9. Verification & Acceptance Gates

### 9.1. Pure Automated Vitest Gates
1. **`HISTORY_INITIAL_GATE`:** New history starts with empty entries and `cursorIndex === -1`.
2. **`HISTORY_COMMIT_GATE`:** Completed canonical move appends entry and increments cursor.
3. **`NO_HISTORY_AT_HALF_GATE`:** `HALF_TURN_LOCKED` creates zero history entries.
4. **`NO_HISTORY_ON_CANCEL_GATE`:** Cancelling from half-turn creates zero history entries.
5. **`DIRECT_HISTORY_COMMIT_GATE`:** Direct 180° move commits single canonical history entry.
6. **`UNDO_GATE`:** Undo steps backward to previous canonical state and frame.
7. **`REDO_GATE`:** Redo steps forward to next recorded state and frame.
8. **`REDO_TRUNCATION_GATE`:** Move made at earlier cursor truncates future redo branch.
9. **`FRAME_AWARE_HISTORY_GATE`:** SpatialFrame correctly restored across all undo/redo/scrub operations.
10. **`ARBITRARY_SCRUB_GATE`:** Scrubbing directly to index $k$ restores exact snapshot $k$.
11. **`SEEDED_SCRAMBLE_DETERMINISM_GATE`:** Same seed + length produces identical move sequence.
12. **`SCRAMBLE_VALID_MOVE_GATE`:** All scramble moves belong to `ALL_MOVES` without same-face repeats.
13. **`SCRAMBLE_BASELINE_GATE`:** Applying scramble sets new initial baseline and clears prior play history.
14. **`MODE_COMPATIBILITY_GATE`:** Mode switches do not alter history entries or cursor.
15. **`BUSY_INPUT_BLOCK_GATE`:** History navigation and scramble rejected while puzzle is busy.
16. **`IMMUTABILITY_GATE`:** State, frame, and history entries remain strictly unmutated.

### 9.2. Playwright Browser E2E Verification Flows (`tests/e2e/play-mode.spec.ts`)
1. **`E2E_APP_LOAD_FLOW`:** Viewport, controls, and canvas render cleanly on initial page load.
2. **`E2E_MOVE_HISTORY_FLOW`:** Clicking a face move button commits one entry in the timeline.
3. **`E2E_TWO_STEP_MIDPOINT_FLOW`:** In TWO_STEP mode, midpoint lock creates no history entry.
4. **`E2E_TWO_STEP_CANCEL_FLOW`:** Cancelling from midpoint creates no history entry.
5. **`E2E_TWO_STEP_COMPLETE_FLOW`:** Completing two-step move creates exactly one history entry.
6. **`E2E_DIRECT_180_COMPLETE_FLOW`:** In Direct 180 mode, full turn creates exactly one history entry.
7. **`E2E_UNDO_FLOW`:** Clicking Undo steps backward in history and updates UI state.
8. **`E2E_REDO_FLOW`:** Clicking Redo steps forward in history.
9. **`E2E_REDO_TRUNCATION_FLOW`:** Executing a new move after Undo discards subsequent redo entries.
10. **`E2E_ARBITRARY_SCRUB_FLOW`:** Clicking any chip in timeline scrubber navigates to that exact step.
11. **`E2E_SEEDED_SCRAMBLE_FLOW`:** Entering seed and clicking Scramble produces reproducible sequence and resets baseline.
12. **`E2E_KEYBOARD_MOVE_FLOW`:** Pressing `u` triggers `U+` move; `Shift+u` triggers `U-`.
13. **`E2E_KEYBOARD_UNDO_FLOW`:** Pressing `Ctrl+Z` / `Cmd+Z` executes Undo.
14. **`E2E_KEYBOARD_REDO_FLOW`:** Pressing `Ctrl+Shift+Z` / `Ctrl+Y` executes Redo.
15. **`E2E_INPUT_FOCUS_EXCLUSION_FLOW`:** Typing `u` inside seed text input does not trigger puzzle move.
16. **`E2E_BUSY_STATE_BLOCKING_FLOW`:** Undo/Redo/Scramble/Mode buttons are disabled while animating or at midpoint lock.
17. **`E2E_RESPONSIVE_LAYOUT_FLOW`:** UI controls remain functional and accessible across narrow viewport widths.
18. **`E2E_CONSOLE_ERROR_GATE`:** Zero unhandled JavaScript / WebGL console errors during test run.

### 9.3. Regression Invariant
- All 28 animation tests, 4 renderer tests, 12 kinematics tests, and exhaustive core tests remain 100% passing.
- `npm run verify` passes with 0 errors.

---

## 10. Architecture Review & Decision Status

- **`PHASE3_NEW_ADR_REQUIRED`:** `NO` (All Phase 3 features operate within existing contracts under ADR-0004, ADR-0005, and ADR-0006).
- **`NEW_RUNTIME_DEPENDENCIES`:** `NONE`
- **`DEV_DEPENDENCY_PLANNED`:** `@playwright/test` (Introduced in Phase 3C)
- **`PHASE3_PLAN_STATUS`:** `PLANNING / READY_FOR_INDEPENDENT_ACCEPTANCE`
- **`PHASE3_IMPLEMENTATION_STATUS`:** `BLOCKED_PENDING_ARCHITECTURE_DOC_SYNC`
- **`SCOPE_FROZEN`:** `YES`
