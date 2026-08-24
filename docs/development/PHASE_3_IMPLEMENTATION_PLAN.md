# Phase 3 Implementation Plan — Interactive UI, History, Undo/Redo, and Scramble

> **Phase Status:** `IMPLEMENTED / READY_FOR_INDEPENDENT_ACCEPTANCE`
> **Phase 3A Status:** `COMPLETED / ACCEPTED`
> **Phase 3B Status:** `COMPLETED / ACCEPTED`
> **Phase 3C Status:** `IMPLEMENTED / READY_FOR_INDEPENDENT_ACCEPTANCE`
> **Phase 3 Preflight Status:** `ACCEPTED`
> **Authoritative Baseline Provenance:**
> - Phase 3 Plan Accepted Head: `7b409066905cf3bb81da1eee1f5bcb7e3af85204`
> - Phase 3 Preflight Accepted Head: `8824f8286d5a702f4c4f0abee82e4306d19b5610`
> - Phase 3C Preflight Accepted Head: `58299ffb9c105da2d14eee1fb4985e2c854b8c1c`
> - Starting Production Main Baseline: `7a2d442f14ca61d257b41ba9178b1ec457b6ce2b` (Commit `Record Phase 3 preflight acceptance` on `main`)
> **Applicability:** Web Application (`apps/web`), Interactive Play Mode, Canonical History Timeline, Undo/Redo, Deterministic Scramble, Keyboard Navigation, Playwright Browser E2E Automation

---

## 1. Executive Summary & Objective

Phase 3 builds the complete user-facing interactive puzzle experience on top of the accepted Phase 2 3D visual and kinematic engine. It introduces:
1. **Architecture & Test Documentation Preflight Sync:** Reconciling historical architectural docs (`SYSTEM_ARCHITECTURE.md`, `TEST_STRATEGY.md`, `PROJECT_BLUEPRINT.md`, `DEVELOPMENT_GUIDE.md`) with actual accepted `apps/web` topology prior to code implementation.
2. **Canonical Move History & Timeline:** Linear history of committed canonical moves and resulting `(GearCubeState, SpatialFrame)` pairs without wall-clock timestamp metadata.
3. **Instant Snapshot Undo & Redo:** Immediate, deterministic state/frame restoration and arbitrary timeline scrubbing while puzzle is `IDLE`.
4. **Deterministic Seeded Scramble Generator:** FNV-1a UTF-16 seed hashing, Mulberry32 PRNG-driven move sequence generation with consecutive same-face filtering, and atomic baseline establishment.
5. **Keyboard Interaction:** Ergonomic key bindings for 12 face moves (`U/D/F/B/R/L` with Shift for CCW) and `Ctrl+Z` / `Ctrl+Y` undo/redo with input focus guarding.
6. **Responsive Play Mode UI:** Minimalist, high-performance control layout with timeline scrubber, scramble panel, mode toggle, and "Back to baseline" navigation.
7. **Playwright Browser E2E Automation:** Headless browser integration tests validating end-to-end user workflows, state integrity, and focus management.

---

## 2. Architecture, State Ownership & Invariants

### 2.1. Single Source of Truth & Session Consistency Invariant
- **`RECOMMENDED_APPLICATION_STATE_ARCHITECTURE`:** `APPS_WEB_LOCAL_APPLICATION_STATE`
- **`ONE_APPLICATION_CANONICAL_SESSION_AUTHORITY`:** `YES`
- **`SESSION_HISTORY_CONSISTENCY_REQUIRED`:** `YES`
- **`HISTORY_IS_SECOND_PUZZLE_AUTHORITY`:** `NO` (History is immutable canonical navigation evidence; `GearCubeSessionState` remains the live application authority).
- At every stable `IDLE` endpoint:
  - If `cursorIndex === -1`: `session.currentState` and `session.currentFrame` structurally equal `initialBaselineState` and `initialBaselineFrame`.
  - If `cursorIndex >= 0`: `session.currentState` and `session.currentFrame` structurally equal `entries[cursorIndex].resultingState` and `entries[cursorIndex].resultingFrame`.
- Every operation changing the history cursor restores the session from the corresponding canonical snapshot in the same atomic transition.

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
- **`ARCHITECTURE_DOC_SYNC_REQUIRED_BEFORE_IMPLEMENTATION`:** `SATISFIED`
- **`PHASE3_IMPLEMENTATION_BLOCKED_BY_DOC_SYNC`:** `NO`
- **`PHASE3_PREFLIGHT_STATUS`:** `ACCEPTED`
- **`PHASE3_IMPLEMENTATION_STATUS`:** `READY_FOR_PHASE3A`
- **`PHASE3A_START_PREREQUISITE`:** `ACCEPTED_PHASE3_DOCUMENTATION_LINEAGE_ON_MAIN`
- **`PHASE3_PREFLIGHT_REQUIRED_DOCS`:** `4` (All 4 synchronized and accepted at `8824f8286d5a702f4c4f0abee82e4306d19b5610`):
  1. `docs/architecture/SYSTEM_ARCHITECTURE.md`
  2. `docs/development/TEST_STRATEGY.md`
  3. `docs/project/PROJECT_BLUEPRINT.md`
  4. `docs/development/DEVELOPMENT_GUIDE.md`
- **`PROJECT_BLUEPRINT_SYNC_REQUIRED`:** `SATISFIED`
- **`DEVELOPMENT_GUIDE_SYNC_REQUIRED`:** `SATISFIED`
- **`PHASE3_NEW_ADR_REQUIRED`:** `NO`
- **Reasoning:** Architecture documents have been synchronized with the actual accepted `apps/web` topology (React local state, R3F viewport, zero runtime Zustand dependency) while preserving conceptual layer boundaries (`UI -> Renderer -> Kinematics -> Core`). With Preflight documentation sync independently accepted, Phase 3A implementation is unlocked once the accepted documentation lineage is promoted to `main`.

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
  - **`INTERACTIVE_AGENT_BROWSER_TOOL`:** `AVAILABLE` (Utilizing `chrome-devtools-mcp` for interactive browser-in-the-loop acceptance and reconnaissance, including WebGL rendering, orbit/zoom gestures, overlay pointer isolation, and live console inspection).
  - **`REPOSITORY_BROWSER_AUTOMATION`:** `PLANNED_VIA_PLAYWRIGHT` (Repository-owned, repeatable, deterministic Chromium CLI-driven E2E regression test runner in Phase 3C).

---

## 3. Canonical History & Timeline Specification

### 3.1. History Unit & Entry Definition
- **`HISTORY_UNIT`:** `CANONICAL_COMMITTED_MOVE`
- **`CANONICAL_HISTORY_CONTAINS_WALL_CLOCK_TIME`:** `NO` (Timestamps are non-canonical and omitted from domain history).
- A history entry is created **only** when a canonical 180° move completes and commits:
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
- **`SCRAMBLE_FRAME_AWARE`:** `YES`
- Every history step explicitly pairs `GearCubeState` with its corresponding `SpatialFrame`. Restoring any history point restores both domain state and spatial frame simultaneously.

---

## 4. Undo, Redo, Scrubber & Reset Semantics

### 4.1. Lifecycle Constraints
- **`UNDO_ALLOWED_WHEN`:** `IDLE_ONLY` (`session.stagedMove === null`)
- **`REDO_ALLOWED_WHEN`:** `IDLE_ONLY` (`session.stagedMove === null`)
- **`SCRUB_ALLOWED_WHEN`:** `IDLE_ONLY` (`session.stagedMove === null`)
- **`RESET_ALLOWED_WHEN`:** `IDLE_ONLY` (`session.stagedMove === null`)
- **`UNDO_PRESERVES_INTERACTION_MODE`:** `YES`
- **`REDO_PRESERVES_INTERACTION_MODE`:** `YES`
- **`SCRUB_PRESERVES_INTERACTION_MODE`:** `YES`
- While puzzle is busy (`FIRST_HALF_ANIMATING`, `HALF_TURN_LOCKED`, `SECOND_HALF_ANIMATING`, `CANCEL_HALF_ANIMATING`, `DIRECT_FULL_ANIMATING`), Undo, Redo, Timeline Scrubbing, and Reset are strictly disabled.

### 4.2. Undo / Redo Model & Core Invariants
- **`UNDO_REDO_MODEL`:** `INSTANT_CANONICAL_SNAPSHOT_RESTORE`
- **`UNDO_ANIMATION`:** `NO`
- **`REDO_ANIMATION`:** `NO`
- **`CORE_INVERSE_MOVE_PUBLIC_API_EXISTS`:** `NO`
- **`CORE_API_EXTENSION_REQUIRED`:** `NO`
- **`UI_DUPLICATES_INVERSE_MOVE_ALGEBRA`:** `NO` (Restoration directly uses recorded snapshots and fresh projection materialization without calculating or applying inverse moves).

### 4.3. Navigation & Truncation Rules
1. **Undo (`cursorIndex > -1`):**
   - Decrements `cursorIndex` by 1.
   - Target snapshot: `cursorIndex === -1 ? (initialBaselineState, initialBaselineFrame) : (entries[cursorIndex].resultingState, entries[cursorIndex].resultingFrame)`.
   - Restores session state, frame, preserves `interactionMode`, and recalculates fresh display transforms: `placementToTransforms(materializeState(targetState, targetFrame))`.
2. **Redo (`cursorIndex < entries.length - 1`):**
   - Increments `cursorIndex` by 1.
   - Restores snapshot at `entries[cursorIndex]`.
   - Preserves `interactionMode` and updates display transforms to fresh projection.
3. **Arbitrary Scrub (`-1 <= targetIndex < entries.length`):**
   - Instant-snaps cursor to `targetIndex`.
   - Restores snapshot, preserves `interactionMode`, and derives fresh display transforms.
4. **Branching on New Move (`NEW_MOVE_AFTER_UNDO: TRUNCATE_REDO_BRANCH`):**
   - When user executes a new move while `cursorIndex < entries.length - 1`, all entries with index `> cursorIndex` are discarded.
   - The new move is appended at `cursorIndex + 1`, and `cursorIndex` advances to point to the new entry.
5. **Reset Action (`RESET_ACTION: RETURN_TO_CURRENT_HISTORY_BASELINE`):**
   - UI Label: `"Back to baseline"`.
   - Restores `initialBaselineState` and `initialBaselineFrame`.
   - Sets `cursorIndex = -1`.
   - Preserves existing `entries` as redoable future history.
   - Preserves `interactionMode` and derives fresh display transforms. Semantically equivalent to `scrub(-1)`.

---

## 5. Deterministic Seeded Scramble Contract

### 5.1. Seed Normalization & Hashing Specification
- **`SCRAMBLE_SEED_INPUT_TYPE`:** `string`
- **`SCRAMBLE_SEED_NORMALIZATION`:** `USE_EXACT_UTF16_JS_STRING` (Do NOT trim, lowercase, or perform locale normalization; `"abc"` != `" abc"` != `"ABC"`).
- **`EMPTY_SEED_POLICY`:** `VALID` (Empty string `""` is a valid deterministic seed; does not auto-generate a random string).
- **`SCRAMBLE_SEED_HASH`:** `FNV1A_32_UTF16`
  ```typescript
  export function hashSeed(seed: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash;
  }
  ```
- **`SCRAMBLE_PRNG`:** `MULBERRY32`
  ```typescript
  export function createMulberry32(seedU32: number): () => number {
    let a = seedU32 >>> 0;
    return function next(): number {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  ```

### 5.2. Move Generation & Filtering
- **`SCRAMBLE_OUTPUT`:** `readonly Move[]`
- **`SOURCE_MOVE_VOCABULARY`:** `@gearcube/core` `ALL_MOVES` (12 directed moves).
- **`DEFAULT_SCRAMBLE_LENGTH`:** `20`
- **`ALLOWED_LENGTH_RANGE`:** `1 .. 50`
- **`INVALID_LENGTH_BEHAVIOR`:** `REJECT` (Non-integer, NaN, <1, >50 throws/rejects; no silent clamping).
- **`CONSECUTIVE_SAME_FACE`:** `REJECT_AND_REDRAW` (Both `U CW -> U CW` and `U CW -> U CCW` rejected; opposite faces allowed).
- **`SCRAMBLE_FILTER_DEPENDS_ONLY_ON_FACE`:** `YES`
- **`UNIFORM_RANDOM_STATE_CLAIM`:** `NO` (Pseudorandom move walk, not uniform state sampling).

### 5.3. Atomic Scramble Application Transaction
- **`SCRAMBLE_ALLOWED_WHEN`:** `IDLE_ONLY`
- **`SCRAMBLE_CREATES_HISTORY_ENTRIES`:** `NO`
- **`SCRAMBLE_ESTABLISHES_NEW_BASELINE`:** `YES`
- **`SCRAMBLE_PRESERVES_INTERACTION_MODE`:** `YES`
- **`SCRAMBLE_SESSION_HISTORY_UPDATE`:** `ATOMIC`
- **Application Steps:**
  1. Starting from current canonical session endpoint `(session.currentState, session.currentFrame)`:
  2. Sequentially compute final `(scrambledState, scrambledFrame)` by applying `applyMove` and `nextSpatialFrame` for each move in the scramble sequence.
  3. Atomically update session and history:
     ```typescript
     session.currentState = scrambledState;
     session.currentFrame = scrambledFrame;
     session.stagedMove = null;
     session.displayTransforms = placementToTransforms(materializeState(scrambledState, scrambledFrame));
     // session.interactionMode remains unchanged

     history.initialBaselineState = scrambledState;
     history.initialBaselineFrame = scrambledFrame;
     history.entries = [];
     history.cursorIndex = -1;
     ```

---

## 6. Keyboard Interaction Contract

### 6.1. Key Mapping Table
| Key | Modifier Requirements | Resolved Move / Action | Valid Conditions |
| :--- | :--- | :--- | :--- |
| `u`, `d`, `f`, `b`, `r`, `l` | None (`!ctrl && !meta && !alt && !shift`) | `U+`, `D+`, `F+`, `B+`, `R+`, `L+` (Clockwise) | `IDLE` (initiates move) OR `HALF_TURN_LOCKED` (direction-relative) |
| `u`, `d`, `f`, `b`, `r`, `l` | `Shift` only (`!ctrl && !meta && !alt && shift`) | `U-`, `D-`, `F-`, `B-`, `R-`, `L-` (Counter-Clockwise) | `IDLE` (initiates move) OR `HALF_TURN_LOCKED` (direction-relative) |
| `z` | `Ctrl` only (`ctrl && !meta && !alt && !shift`) | `Undo` | `IDLE` & `canUndo(history)` |
| `z` | `Cmd` only (`meta && !ctrl && !alt && !shift`) | `Undo` | `IDLE` & `canUndo(history)` |
| `z` | `Ctrl+Shift` (`ctrl && !meta && !alt && shift`) | `Redo` | `IDLE` & `canRedo(history)` |
| `z` | `Cmd+Shift` (`meta && !ctrl && !alt && shift`) | `Redo` | `IDLE` & `canRedo(history)` |
| `y` | `Ctrl` only (`ctrl && !meta && !alt && !shift`) | `Redo` | `IDLE` & `canRedo(history)` |
| `y` | `Cmd` (`meta && !ctrl`) | **REJECTED** (Ignored without `preventDefault`) | — |
| Any | `Alt` (`alt === true`) | **REJECTED** (Ignored without `preventDefault`) | — |

### 6.2. Exact Event Interpretation & Modifier Normalization
- **Key Normalization:** `event.key.toLowerCase()` extracts base character (`'u'`, `'d'`, `'f'`, `'b'`, `'r'`, `'l'`, `'z'`, `'y'`).
- **Exact Modifier Matching:**
  - **Face Move Shortcuts (`u`, `d`, `f`, `b`, `r`, `l`):**
    - Require `event.altKey === false && event.ctrlKey === false && event.metaKey === false`.
    - `event.shiftKey === false` -> Clockwise (`+`).
    - `event.shiftKey === true` -> Counter-Clockwise (`-`).
    - Any shortcut contaminated with `Ctrl`, `Meta`, or `Alt` (e.g. `Ctrl+u`, `Cmd+u`, `Alt+u`, `Ctrl+Shift+u`, `Meta+Shift+u`) is strictly rejected as a puzzle face move.
  - **Undo Shortcuts:**
    - `Ctrl+Z` (`event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey`).
    - `Cmd+Z` (`event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey`).
  - **Redo Shortcuts:**
    - `Ctrl+Shift+Z` (`event.ctrlKey && !event.metaKey && event.shiftKey && !event.altKey`).
    - `Cmd+Shift+Z` (`event.metaKey && !event.ctrlKey && event.shiftKey && !event.altKey`).
    - `Ctrl+Y` (`event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey`).
    - `Cmd+Y` is explicitly REJECTED (avoids hijacking browser/system history shortcuts on macOS).
  - **Alt Key Prohibition:** Any modifier combination containing `Alt` (`event.altKey === true`) is strictly rejected.
- **Repeat Key Policy:** `if (event.repeat) return;` — key repeat is strictly dropped to prevent queueing rapid-fire actions.
- **Focus Exclusion Policy:**
  - Target checking: `isEditableTarget(event.target)` verifies if the event target is an `<input>`, `<textarea>`, `<select>`, or has `isContentEditable === true`.
  - When focus is in any editable target (e.g. Scramble seed input), all puzzle shortcuts are ignored, allowing text editing with full modifier support without triggering moves or history navigation.
- **`preventDefault()` Policy:**
  - `event.preventDefault()` is invoked ONLY when a keystroke matches a recognized, accepted shortcut AND is actionable in the current application state.
  - Unrecognized, rejected, or blocked keystrokes NEVER call `preventDefault()`, preserving browser and operating system defaults.

### 6.3. Direction-Relative Midpoint & Busy State Delegation
- **`HALF_TURN_LOCKED` State:**
  - Keystroke resolves to standard `(face, direction)`: no Shift -> CW (`+`), Shift -> CCW (`-`).
  - **Face Matching:** If `resolved.face !== stagedMove.move.face`, the keystroke is rejected/ignored.
  - **Continuation:** If `resolved.face === stagedMove.move.face` AND `resolved.direction === stagedMove.move.direction`, completes the second half-turn to finish the 180° move.
  - **Cancellation:** If `resolved.face === stagedMove.move.face` AND `resolved.direction !== stagedMove.move.direction`, cancels and reverses to the origin state.
  - **Concrete Examples:**
    - Staged `U CW (+)`: pressing `u` (CW) finishes the turn; pressing `Shift+u` (CCW) cancels to origin.
    - Staged `U CCW (-)`: pressing `Shift+u` (CCW) finishes the turn; pressing `u` (CW) cancels to origin.
  - Unrelated face keys, Undo, Redo, Mode toggle, and Scramble are rejected.
  - Seed text input remains focused and editable.
- **Active Animation State:** When `isSessionAnimating(session)` is `true`, all action keystrokes are ignored.
- **Minimal Hook API:**
  - `useKeyboardControls({ isIdle, isAnimating, stagedMove, onTriggerMove, onUndo, onRedo })`
  - No reset-baseline shortcut or API callback is included.
- **Node-Vitest Testability Contract:**
  - `useKeyboardControls.ts` structures pure, framework-independent resolution helpers (`resolveKeyboardAction`, `isEditableTarget`) that are exercised by `apps/web/src/components/controls/useKeyboardControls.test.ts` under the existing Node Vitest environment (`environment: node` in `vitest.config.ts`).
  - Planned unit tests explicitly cover:
    - Face shortcuts reject Ctrl/Meta/Alt contamination (`Ctrl+u`, `Cmd+u`, `Alt+u`, `Ctrl+Shift+u`, `Meta+Shift+u`).
    - `Ctrl+Z` and `Cmd+Z` recognized as Undo.
    - `Ctrl+Shift+Z`, `Cmd+Shift+Z`, and `Ctrl+Y` recognized as Redo.
    - `Cmd+Y` explicitly rejected.
    - Alt-modified shortcuts rejected.
    - Repeat events ignored.
    - Focus exclusion for `<input>`, `<textarea>`, `<select>`, and `isContentEditable`.
    - Midpoint direction-relative acceptance and cancellation logic.
    - `preventDefault` eligibility true only for recognized, accepted, actionable actions.
  - Zero DOM test dependencies: NO `jsdom`, NO `happy-dom`, NO `@testing-library/react`.
  - Actual window event listener registration, focus changes, and React lifecycle integration are verified via Playwright E2E.

---

## 7. Responsive UI & Visual Design Contract

### 7.1. Empirical Reconnaissance Findings
Real browser inspection across representative viewports revealed:
- **1440x900 / 1024x768 (Desktop):** All floating overlays (History top-left, Scramble top-right, MoveControls bottom-center, Timeline bottom-left) render cleanly without collision.
- **768x1024 (Tablet Portrait):** MoveControls width (614px) leaves only 77px side margins, causing direct bounding-box collision with bottom-left TimelineScrubber (width 152px) (`bottomOverlap: true`).
- **390x844 / 360x800 (Mobile Portrait):** MoveControls fixed width (614px) severely overflows window boundaries (`width > 390px / 360px`), ScramblePanel overflows right boundary (`right: 541px`), and TimelineScrubber sits directly under/over the overflowing move controls.

### 7.2. Responsive Breakpoint Specification
| Viewport Class | Breakpoint Range | Overlay Positioning & Layout Strategy |
| :--- | :--- | :--- |
| **Desktop** | `> 900px` | 4-quadrant desktop layout: floating top bar (History left, Scramble right), centered bottom MoveControls (6 columns), bottom-left TimelineScrubber. |
| **Tablet** | `641px .. 900px` | MoveControls compacted; TimelineScrubber elevated above bottom controls (`bottom: 160px; left: 16px;`) to eliminate collision with bottom-centered MoveControls. |
| **Mobile Portrait** | `<= 640px` | Top bar elements wrap with responsive max-width (`calc(100vw - 32px)`); MoveControls wrap face cards into 2 rows of 3 columns (`grid-template-columns: repeat(3, 1fr)`); TimelineScrubber renders as horizontal scroll strip above bottom controls (`bottom: 190px; left: 16px; right: 16px; width: auto; overflow-x: auto;`). |

### 7.3. Responsive Invariants
- **Canvas Region:** Center 3D WebGL Gear Cube canvas retains $\ge 40\text{vh}$ interactive orbit area across all supported viewports.
- **Zero Document Scroll:** Document `overflow: hidden; width: 100vw; height: 100vh;` with zero horizontal overflow or clipping.
- **Accessibility & Actionability:** All primary buttons (12 face moves, mode toggle, undo, redo, baseline, scramble) remain clickable without obscuring each other.
- **CSS-Only Implementation:** Pure CSS media queries (`@media (max-width: 900px)`, `@media (max-width: 640px)`) in `App.css` without runtime JavaScript window resize listeners.

---

## 8. Phase 3 Subphase Decomposition

Phase 3 is decomposed into four dependency-ordered, independently verifiable subphases:

```text
[ Phase 3 Preflight: Architecture & Test Documentation Sync ]
  - Synchronize SYSTEM_ARCHITECTURE.md, TEST_STRATEGY.md, PROJECT_BLUEPRINT.md, DEVELOPMENT_GUIDE.md with accepted apps/web topology.
  - Record Playwright E2E testing strategy and dependency boundaries.
        │
        ▼
[ Phase 3A: Application History & Deterministic Scramble Foundation ]
  - Pure domain modules: history state transitions & Mulberry32/FNV-1a scramble generator.
  - Comprehensive Vitest unit tests (100% pure TypeScript).
        │
        ▼
[ Phase 3B: Undo / Redo / Timeline / Play UI Integration ]
  - Wire history engine to session orchestration in apps/web.
  - Timeline Scrubber component, Undo/Redo controls, Scramble UI panel, "Back to baseline".
        │
        ▼
[ Phase 3C: Keyboard Controls, Responsive Layout & Playwright Browser E2E ]
  - Global keyboard listener, responsive mobile/desktop layout styles.
  - Root Playwright E2E configuration and automated browser acceptance test suite.
```

### 8.1. Phase 3 Preflight: Architecture & Test Documentation Sync
- **Objective:** Synchronize all 4 concrete architecture and development documents with the accepted codebase.
- **Status:** `ACCEPTED` (`8824f8286d5a702f4c4f0abee82e4306d19b5610`)
- **Deliverables:**
  - `docs/architecture/SYSTEM_ARCHITECTURE.md`: Document actual `apps/web` renderer/UI placement, zero runtime Zustand dependency, and layer boundaries.
  - `docs/development/TEST_STRATEGY.md`: Formalize Playwright browser E2E test plan for interaction flows.
  - `docs/project/PROJECT_BLUEPRINT.md`: Update historical concrete package/state topology.
  - `docs/development/DEVELOPMENT_GUIDE.md`: Align dev workflows and workspace boundaries.
- **Preconditions:** Phase 3 planning accepted (`SATISFIED`).

### 8.2. Phase 3A: Application History & Scramble Engine
- **Objective:** Pure domain logic for history state transitions and deterministic scramble generation.
- **Status:** `COMPLETED / ACCEPTED` (Pure history module, FNV-1a UTF-16 hash, Mulberry32 PRNG, scramble generator with same-face rejection, and 24 unit tests across 2 test files created and passing).
- **Deliverables:**
  - `apps/web/src/components/history/history.ts`: Pure history data types, push entry, undo, redo, scrub, and branch truncation functions.
  - `apps/web/src/components/history/scramble.ts`: FNV-1a UTF-16 hasher, Mulberry32 PRNG, and deterministic scramble sequence generator.
  - `apps/web/src/components/history/history.test.ts`: 100% pure unit test coverage for all history operations (11 tests).
  - `apps/web/src/components/history/scramble.test.ts`: FNV-1a hashing, PRNG determinism, seed repeatability, and move vocabulary validation (13 tests).
- **Preconditions:** Phase 3 Preflight accepted (`SATISFIED`) and promoted to `main` (`SATISFIED`).

### 8.3. Phase 3B: Interactive Play Store, Undo/Redo & Scrubber UI
- **Objective:** Interactive UI components and session history wiring via pure application orchestration.
- **Status:** `COMPLETED / ACCEPTED` (Pure application orchestration module `play-session.ts`, `HistoryControls`, `TimelineScrubber`, `ScramblePanel`, `GearCubeViewport` integration, 70 targeted tests PASS, 17 files / 210 tests root verify PASS, web typecheck PASS, real interactive Chrome DevTools MCP browser acceptance PASS with zero runtime errors; accepted candidate head `1d2dc0982eed1cdb52a7a4b65884d9bdd495ede2`).
- **Deliverables:**
  - `apps/web/src/components/history/play-session.ts`: Pure application orchestration connecting `GearCubeSessionState` and `PlayHistoryState`.
  - `apps/web/src/components/history/play-session.test.ts`: Pure unit and integration tests covering session/history state transitions.
  - `apps/web/src/components/history/HistoryControls.tsx`: Undo, Redo, and "Back to baseline" buttons with dynamic disablement.
  - `apps/web/src/components/history/TimelineScrubber.tsx`: Scrollable move list with clickable chips for arbitrary scrub.
  - `apps/web/src/components/history/ScramblePanel.tsx`: Seed input and scramble trigger with deterministic preview.
  - `apps/web/src/components/history/history-ui.test.tsx`: Structural server-rendered component tests.
  - `apps/web/src/components/canvas/GearCubeViewport.tsx`: Viewport state orchestration integration.
  - `apps/web/src/App.css`: Desktop layout overlay styles.
- **Preconditions:** Phase 3A accepted & committed (`SATISFIED`).

### 8.4. Phase 3C: Keyboard Controls, Responsive Layout & Playwright Browser E2E
- **Objective:** Keyboard shortcuts, responsive CSS layout, root Playwright Chromium E2E infrastructure, and automated browser verification.
- **Status:** `IMPLEMENTED / READY_FOR_INDEPENDENT_ACCEPTANCE` (Implementation candidate created at branch `phase/3c-keyboard-responsive-e2e`; formal independent acceptance pending).
- **Deliverables:**
  - `apps/web/src/components/controls/useKeyboardControls.ts`: Keyboard event listener with focus detection, repeat guarding, exact modifier normalization, and direction-relative midpoint delegation.
  - `apps/web/src/components/controls/useKeyboardControls.test.ts`: Unit tests for keyboard event parsing, focus exclusion, modifier rejection, and move triggering.
  - `apps/web/src/components/canvas/GearCubeViewport.tsx`: Mount `useKeyboardControls` hook to active session state.
  - `apps/web/src/App.css`: Responsive media queries (`max-width: 900px`, `max-width: 640px`) for tablet and mobile portrait layouts.
  - `playwright.config.ts`: Root Playwright configuration pinning Chromium, dedicated webServer on port 4173 (`http://127.0.0.1:4173`), and outputDir in `.cache/playwright/test-results`.
  - `tests/e2e/play-mode.spec.ts`: Automated browser E2E test suite covering 19 interaction flows.
  - `package.json` & `package-lock.json`: Add pinned `@playwright/test@1.62.1` devDependency and `npm run test:e2e` script.
  - `docs/development/PHASE_3_IMPLEMENTATION_PLAN.md`: Synchronized Phase 3C implementation plan.
  - `docs/development/TEST_STRATEGY.md`: Synchronized Level 9 Playwright testing strategy.
  - `docs/development/ROADMAP.md`: Synchronized Phase 3 roadmap status.
- **Preconditions:** Phase 3B accepted & promoted to `main` (`SATISFIED`).
- **Dependencies & Infrastructure:**
  - **`PLAYWRIGHT_DEV_DEPENDENCY`:** `@playwright/test@1.62.1 / IMPLEMENTED IN CANDIDATE` (Node `>=20` engine compatible with project `>=22.12.0 <23`).
  - **Browser Engine:** `chromium` only (Firefox/WebKit deferred).
  - **WebServer:** `npm run dev --workspace=@gearcube/web -- --port 4173 --strictPort --host 127.0.0.1` on `http://127.0.0.1:4173`.
  - **Script Ownership:** `npm run verify` preserved as fast non-browser verification; `npm run test:e2e` added for root Playwright E2E execution.
  - **Browser Installation Command:** `npx playwright install chromium`.

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
11. **`RESET_TO_BASELINE_GATE`:** Reset restores initial baseline, sets `cursorIndex = -1`, and preserves future redo entries.
12. **`SESSION_HISTORY_ALIGNMENT_GATE`:** At every IDLE endpoint, session state/frame matches corresponding history cursor snapshot.
13. **`SEEDED_SCRAMBLE_DETERMINISM_GATE`:** Exact seed string + length produces identical move sequence.
14. **`EMPTY_SEED_DETERMINISM_GATE`:** Empty string seed deterministically produces reproducible move sequence.
15. **`SCRAMBLE_VALID_MOVE_GATE`:** All scramble moves belong to `ALL_MOVES` without consecutive same-face moves.
16. **`SCRAMBLE_BASELINE_GATE`:** Applying scramble atomically establishes new initial baseline, clears prior history, and snaps projection.
17. **`MODE_COMPATIBILITY_GATE`:** Mode switches do not alter history entries or cursor.
18. **`BUSY_INPUT_BLOCK_GATE`:** History navigation and scramble rejected while puzzle is busy.
19. **`IMMUTABILITY_GATE`:** State, frame, and history entries remain strictly unmutated.
20. **`KEYBOARD_EVENT_NORMALIZATION_GATE`:** `useKeyboardControls` correctly normalizes base keys, shift modifiers, and exact Ctrl/Meta/Shift combinations while rejecting Alt and unauthorized modifier combinations.
21. **`KEYBOARD_FOCUS_EXCLUSION_GATE`:** Key events targeting `<input>`, `<textarea>`, `<select>`, or contenteditable elements produce zero move calls.
22. **`KEYBOARD_REPEAT_IGNORING_GATE`:** Key repeat events (`event.repeat === true`) are strictly dropped.

### 9.2. Playwright Browser E2E Verification Flows (`tests/e2e/play-mode.spec.ts`)
1. **`E2E_APP_LOAD_FLOW`:** Viewport, controls, canvas, and overlays render cleanly on initial page load (`http://127.0.0.1:4173`).
2. **`E2E_MOVE_HISTORY_FLOW`:** In TWO_STEP mode, clicking a face move button (e.g. U CW) stops at midpoint without committing history; clicking continuation (U CW) completes the 180° turn and commits exactly one entry (`Step 1: U+`) in the timeline.
3. **`E2E_TWO_STEP_MIDPOINT_FLOW`:** In TWO_STEP mode, clicking U CW stops at midpoint lock; timeline remains at 0 entries.
4. **`E2E_TWO_STEP_CANCEL_FLOW`:** In TWO_STEP midpoint lock, clicking U CCW cancels back to origin; timeline remains at 0 entries.
5. **`E2E_TWO_STEP_COMPLETE_FLOW`:** In TWO_STEP midpoint lock, clicking U CW finishes 180° turn; exactly 1 entry (`Step 1: U+`) appears.
6. **`E2E_DIRECT_180_COMPLETE_FLOW`:** In Direct 180 mode, clicking R CW completes in one continuous turn and commits `Step 2: R+`.
7. **`E2E_UNDO_FLOW`:** Clicking Undo steps backward in history, restores snapshot, and updates UI cursor indicator.
8. **`E2E_REDO_FLOW`:** Clicking Redo steps forward in history and re-enables snapshot.
9. **`E2E_REDO_TRUNCATION_FLOW`:** Executing a new move after Undo truncates subsequent redo entries and disables Redo button.
10. **`E2E_ARBITRARY_SCRUB_FLOW`:** Clicking any chip in timeline scrubber navigates directly to that exact historical step.
11. **`E2E_RESET_BASELINE_FLOW`:** Clicking "Back to baseline" navigates to cursor -1 while preserving future redo chips.
12. **`E2E_SEEDED_SCRAMBLE_FLOW`:** Entering seed `"abc"` and clicking Scramble applies deterministic sequence and establishes new baseline with 0 history entries.
13. **`E2E_KEYBOARD_MOVE_FLOW`:** Pressing `u` triggers `U+` move; `Shift+u` triggers `U-`; shortcuts with unsupported modifiers (e.g. `Ctrl+u`, `Alt+u`) are ignored without hijacking (`KEYBOARD_BROWSER_SHORTCUT_NON_HIJACK`).
14. **`E2E_KEYBOARD_UNDO_FLOW`:** Pressing `Ctrl+Z` / `Cmd+Z` executes Undo.
15. **`E2E_KEYBOARD_REDO_FLOW`:** Pressing `Ctrl+Shift+Z`, `Cmd+Shift+Z`, or `Ctrl+Y` executes Redo; `Cmd+Y` is rejected.
16. **`E2E_INPUT_FOCUS_EXCLUSION_FLOW`:** Focusing Scramble seed input and typing `u`, `r`, `z` changes input value without triggering puzzle moves or undo.
17. **`E2E_BUSY_STATE_BLOCKING_FLOW`:** During active animation, all move buttons, mode toggle, undo, redo, and scramble button are disabled. At `HALF_TURN_LOCKED` midpoint (`MIDPOINT_SELECTIVE_MOVE_ENABLEMENT`), only the staged face controls remain actionable (same direction finishes, opposite direction cancels); all unrelated face buttons, mode toggle, undo, redo, timeline navigation, Back to baseline, and scramble button are disabled; scramble seed text input remains editable.
18. **`E2E_RESPONSIVE_LAYOUT_FLOW`:** At viewports `1440x900`, `768x1024`, and `375x667`, all primary controls remain visible, non-overlapping, and clickable without document horizontal overflow.
19. **`E2E_CONSOLE_ERROR_GATE`:** Zero unhandled JavaScript exceptions, React runtime errors, or WebGL errors during entire test run.

### 9.3. Regression Invariants
- All 28 animation tests, 4 renderer tests, 12 kinematics tests, 24 history/scramble tests, 18 play-session tests, and exhaustive core tests remain 100% passing.
- `npm run verify` passes with 0 errors.

---

## 10. Architecture Review & Decision Status

- **`PHASE3_NEW_ADR_REQUIRED`:** `NO` (All Phase 3 features operate within existing contracts under ADR-0004, ADR-0005, and ADR-0006).
- **`NEW_RUNTIME_DEPENDENCIES`:** `NONE`
- **`PLAYWRIGHT_DEV_DEPENDENCY`:** `@playwright/test@1.62.1 / IMPLEMENTED IN CANDIDATE` (Root devDependency, Chromium project only)
- **`PHASE3_PLAN_STATUS`:** `PLANNING / ACCEPTED`
- **`PHASE3_PREFLIGHT_STATUS`:** `ACCEPTED`
- **`PHASE3A_STATUS`:** `COMPLETED / ACCEPTED`
- **`PHASE3A_ACCEPTED`:** `YES`
- **`PHASE3B_STATUS`:** `COMPLETED / ACCEPTED`
- **`PHASE3B_ACCEPTED`:** `YES`
- **`PHASE3B_ACCEPTED_HEAD`:** `1d2dc0982eed1cdb52a7a4b65884d9bdd495ede2`
- **`PHASE3C_PREFLIGHT_STATUS`:** `ACCEPTED`
- **`PHASE3C_PREFLIGHT_ACCEPTED`:** `YES`
- **`PHASE3C_PREFLIGHT_ACCEPTED_HEAD`:** `58299ffb9c105da2d14eee1fb4985e2c854b8c1c`
- **`PHASE3C_STATUS`:** `IMPLEMENTED / READY_FOR_INDEPENDENT_ACCEPTANCE`
- **`PHASE3C_IMPLEMENTATION_STATUS`:** `IMPLEMENTED / READY_FOR_INDEPENDENT_ACCEPTANCE`
- **`PHASE3C_STARTED`:** `YES`
- **`PHASE3C_ACCEPTED`:** `NO` (Candidate for independent review)
- **`PHASE3_OVERALL_COMPLETE`:** `NO`
- **`SCOPE_FROZEN`:** `YES`
- **`PROPOSED_FUTURE_IMPLEMENTATION_FILES`:**
  1. `apps/web/src/App.css`
  2. `apps/web/src/components/canvas/GearCubeViewport.tsx`
  3. `apps/web/src/components/controls/useKeyboardControls.ts`
  4. `apps/web/src/components/controls/useKeyboardControls.test.ts`
  5. `playwright.config.ts`
  6. `tests/e2e/play-mode.spec.ts`
  7. `package.json`
  8. `package-lock.json`
  9. `docs/development/PHASE_3_IMPLEMENTATION_PLAN.md`
  10. `docs/development/TEST_STRATEGY.md`
  11. `docs/development/ROADMAP.md`
- **`EXPLICITLY_FORBIDDEN_FILES`:**
  - `packages/core/**`
  - `packages/kinematics/**`
  - `apps/web/src/components/cube/animation.ts`
  - `apps/web/src/components/history/history.ts`
  - `apps/web/src/components/history/scramble.ts`
  - `apps/web/src/components/history/play-session.ts`
