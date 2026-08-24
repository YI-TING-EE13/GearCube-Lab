# Phase 4 Implementation Plan — Classical Solver Infrastructure

> **Phase Status:** `PLANNED / PREFLIGHT_READY_FOR_INDEPENDENT_ACCEPTANCE`
> **Phase 4 Started:** `NO`
> **Authoritative Main Baseline:** `f87403cb9e95919c272c5d713888497c8bd92602` (Commit `Record Phase 3C and Phase 3 acceptance` on `main`)
> **Applicability:** Solvers Package (`packages/solvers`), Web Application (`apps/web`), Web Worker Infrastructure (`apps/web/src/workers`), Solve Mode UI, Solution Playback, Playwright Browser E2E Automation

---

## 1. Executive Summary & Objective

Phase 4 introduces the classical graph search and automated solving infrastructure for the Standard Gear Cube. Operating purely over the discrete domain model established in Phase 1 and the interactive web application built in Phases 2 and 3, Phase 4 delivers:

1. **Dedicated Solver Package Boundary (`packages/solvers`):** A pure TypeScript workspace package containing domain-agnostic solver interfaces, state-space exploration utilities, and algorithm implementations. It depends strictly on `@gearcube/core` and contains zero external runtime dependencies.
2. **Optimal Baseline Solvers:**
   - **Breadth-First Search (BFS):** Uninformed exact-search baseline verifying global optimality under canonical move metric.
   - **Bidirectional BFS (BiBFS):** Two-frontier meeting search leveraging the exact algebraic move inverse relation.
   - **Iterative Deepening A* (IDA*):** Memory-bounded depth-first heuristic search (implementation conditional on independently accepted admissible heuristic preflight in Phase 4C).
3. **Web Worker-Isolated Execution:** Off-main-thread search execution hosted in `apps/web/src/workers/solver.worker.ts` via a clean serializable protocol with request ID tagging, termination-based cancellation, and throttled progress telemetry.
4. **Interactive Solve Mode UI & Solution Playback:** UI controls in `apps/web` for algorithm selection, progress monitoring, and step-by-step or automated solution playback delegating strictly through the single canonical application authority without calling frame-step functions directly.
5. **End-to-End Test & Acceptance Strategy:** Independent depth 1..8 optimality validation against a Phase 4A test-only exact-distance oracle, worker lifecycle integration tests, and Playwright browser responsiveness tests.

---

## 2. Architecture & Domain Truth Boundaries

### 2.1. Single Source of Truth Principle
- **`CORE_IS_ONLY_PUZZLE_AUTHORITY`:** `YES`. The discrete mathematical state `GearCubeState` from `@gearcube/core` is the sole source of puzzle truth.
- **`SOLVER_PACKAGE_ISOLATION`:** `@gearcube/solvers` depends **ONLY** on `@gearcube/core` (internal workspace dependency). It has zero external runtime dependencies.
- **`NO_RENDERER_OR_KINEMATIC_OR_BROWSER_DERIVATIONS`:** `@gearcube/solvers` must never import `@gearcube/kinematics`, `apps/web`, `@react-three/fiber`, Three.js, React, DOM libraries, or browser Worker global APIs (`self.postMessage`, `onmessage`).
- **`WORKER_OWNERSHIP_SEPARATION`:** Pure search algorithms, types, and serializable protocol definitions reside in `packages/solvers`. The actual browser Worker entry adapter resides in `apps/web/src/workers/solver.worker.ts` and imports `@gearcube/solvers`.
- **`PLAYBACK_DELEGATION_PRINCIPLE`:** Solvers return a sequence of canonical `Move[]` only. Solution playback dispatches each move through the existing `PlayApplicationState` / `play-session` / `animation` pipeline. Solvers never construct 3D transforms or maintain a secondary puzzle authority.

### 2.2. Package Dependency Hierarchy
```text
┌──────────────────────────────────────────────────────────────────┐
│                            apps/web                              │
│    (React 19, R3F Viewport, Solve Mode UI, Playback Controller,  │
│          Browser Worker Host: src/workers/solver.worker.ts)      │
└──────────────┬────────────────────────────┬──────────────────────┘
               │                            │
               ▼                            ▼
┌──────────────────────────────┐  ┌────────────────────────────────┐
│     @gearcube/kinematics     │  │       @gearcube/solvers        │
│  (3D Transforms, Projection) │  │  (BFS, BiBFS, IDA*, Types,     │
│                              │  │    Serializable Protocol)      │
└──────────────┬───────────────┘  └─────────┬──────────────────────┘
               │                            │
               └────────────────┬───────────┘
                                ▼
               ┌────────────────────────────────┐
               │         @gearcube/core         │
               │  (GearCubeState, Moves,        │
               │   applyMove, State Codecs)     │
               └────────────────────────────────┘
```

---

## 3. Canonical Move Metric & Graph Constants

### 3.1. Unit-Cost Directed Move Metric
- **Node Definition:** Canonical discrete `GearCubeState` (41,472 total reachable states).
- **Edge Definition:** The 12 directed canonical moves in `ALL_MOVES` (`U CW`, `U CCW`, `D CW`, `D CCW`, `F CW`, `F CCW`, `B CW`, `B CCW`, `R CW`, `R CCW`, `L CW`, `L CCW`).
- **Edge Cost:** Exactly 1 per directed move.
- **Goal Condition:** `isSolved(state) === true` (`SOLVED_GEAR_CUBE_STATE`: `C:0|X:0.0|Y:0.0|Z:0.0`).
- **Solution Length:** The count of directed canonical moves in the sequence ($L = \text{depth}$).
- **Midpoint Exclusion:** The physical two-step halfway lock (`HALF_TURN_LOCKED`) is purely an interactive animation/staging state and is **NOT** a solver node. One solver move corresponds to one complete 180° canonical transition.

### 3.2. Authoritative Graph Properties (from Phase 1E)
- **Total Reachable States:** Exactly 41,472 (100% of Cartesian domain).
- **Canonical Graph Diameter:** Exactly 8 directed canonical moves.
- **Observed / Informational Phase 1E Distance Characterization:**
  | Distance ($d$) | State Count | Percentage |
  | :--- | :--- | :--- |
  | $0$ (Solved) | $1$ | $0.002\%$ |
  | $1$ | $12$ | $0.029\%$ |
  | $2$ | $111$ | $0.268\%$ |
  | $3$ | $822$ | $1.982\%$ |
  | $4$ | $3,863$ | $9.315\%$ |
  | $5$ | $11,706$ | $28.226\%$ |
  | $6$ | $16,410$ | $39.569\%$ |
  | $7$ | $8,196$ | $19.763\%$ |
  | $8$ | $351$ | $0.846\%$ |
  | **Total** | **$41,472$** | **$100.000\%$** |
  *(Note: This histogram was established in Phase 1E test memory and is recorded informationally; Phase 4A establishes a dedicated test-only exact distance oracle for fixture selection).*

---

## 4. Move Ordering, Inverses & Determinism

### 4.1. Deterministic Expansion Ordering
- Successor generation always iterates `ALL_MOVES` in standard index order:
  1. `U CW`, 2. `U CCW`, 3. `D CW`, 4. `D CCW`,
  5. `F CW`, 6. `F CCW`, 7. `B CW`, 8. `B CCW`,
  9. `R CW`, 10. `R CCW`, 11. `L CW`, 12. `L CCW`.
- **BFS Determinism:** Traverses queue in FIFO order with `ALL_MOVES` successor order, deterministically returning the first-found optimal path.
- **BiBFS Determinism:** Deterministic layer expansion policy (expands smaller complete frontier, breaking ties toward forward frontier); deterministic frontier tie-breaking; deterministic meeting-state selection.
- **Cross-Algorithm Invariant:** For a given start state, BFS and BiBFS may return different move sequences if multiple optimal paths exist, but **both must return identical optimal solution lengths**.
- **Same-Algorithm Determinism:** Same start state + same algorithm + same options => identical solution sequence returned.

### 4.2. Exact Move Inverse Relation & Bidirectional BFS Reconstruction
- Every canonical move $M = (F, D)$ has an exact inverse $M^{-1} = (F, \text{opposite}(D))$:
  `inverse(F, CW) = (F, CCW)`, `inverse(F, CCW) = (F, CW)`.
- Mathematically verified across all 41,472 states in Phase 1E:
  $$\forall S \in \text{ReachableStates}, \forall M \in \text{ALL\_MOVES}: \quad \text{applyMove}(\text{applyMove}(S, M), M^{-1}) = S$$
- **Bidirectional BFS Representation:**
  - Backward frontier is rooted at `SOLVED_GEAR_CUBE_STATE`.
  - When backward search explores edge $u \xrightarrow{M} v$ where $v$ is already closer to solved, it discovers $u = \text{applyMove}(v, M^{-1})$ and stores at $u$:
    - `nextTowardGoalRank = rankState(v)`
    - `forwardMove = M`
  - When forward frontier ($S_{\text{start}} \dots m$) meets backward frontier ($m \dots S_{\text{solved}}$), reconstruction traces backward from $m$ to $S_{\text{start}}$ using forward parent moves, and traces forward from $m$ to $S_{\text{solved}}$ using stored `forwardMove` references.
  - Complete forward solution is concatenated directly without ambiguous double-inversion.

---

## 5. State Indexing, Memory Budget & Data Structures

### 5.1. Canonical State Key vs Solver-Internal Index
- **Canonical Cross-Layer Key:** `serializeLogicalState(state)` from `@gearcube/core` (`"C:0|X:0.0|Y:0.0|Z:0.0"`). This is the authoritative cross-thread and start-state identifier.
- **Solver-Internal Dense Rank Index:** `packages/solvers/src/state-index.ts` implements a solver-private bijective dense index pair:
  - `rankState(state: GearCubeState): number` mapping $S \mapsto [0 \dots 41471]$:
    $$\text{rank}(S) = C \cdot 1728 + (k_X \cdot 3 + p_X) \cdot 144 + (k_Y \cdot 3 + p_Y) \cdot 12 + (k_Z \cdot 3 + p_Z)$$
  - `unrankState(rank: number): GearCubeState` mapping $[0 \dots 41471] \mapsto S$.
- **Purity Gate:** Dense rank is strictly internal to `@gearcube/solvers` (for fast typed-array indexing) and is not exported as a replacement canonical serialization format.

### 5.2. Memory Budget Analysis
- **Raw Typed-Buffer Footprint (Exhaustive 41,472 States):**
  - Visited byte array: `new Uint8Array(41472)` $\approx 41.5\text{ KB}$.
  - Parent rank array: `new Int32Array(41472)` $\approx 165.9\text{ KB}$.
  - Parent move index array: `new Int8Array(41472)` $\approx 41.5\text{ KB}$.
  - Queue storage: `new Int32Array(41472)` $\approx 165.9\text{ KB}$.
  - Total raw typed buffers: $\approx 415\text{ KB}$.
- **Total JS Heap:** Modest runtime heap (< 5 MB including V8 object overhead), executing smoothly within standard browser Web Worker memory limits.

---

## 6. Algorithm Contracts, Metrics & Result Schemas

### 6.1. Search Counters & Telemetry Definitions
- **`nodesExpanded`:** Count of search nodes whose outgoing legal successors have been enumerated via `applyMove`. (For BiBFS, aggregate count from both frontiers).
- **`nodesGenerated`:** Count of successor candidate states produced by `applyMove`, including states subsequently pruned or already visited.
- **`elapsedMs`:** Observational wall-clock execution time in milliseconds (observational telemetry only, never a correctness oracle).
- **`solutionDepth`:** Exact move count (`moves.length`) of the returned solution (defined only when `status === 'SOLVED'`).

### 6.2. Result Types & Options
```typescript
export type SolverAlgorithm = 'BFS' | 'BIDIRECTIONAL_BFS' | 'IDA_STAR';

export interface SearchCounters {
  readonly nodesExpanded: number;
  readonly nodesGenerated: number;
}

export interface SearchTelemetry {
  readonly nodesExpanded: number;
  readonly nodesGenerated: number;
  readonly elapsedMs: number;
}

export interface SolveSuccess {
  readonly status: 'SOLVED';
  readonly algorithm: SolverAlgorithm;
  readonly moves: readonly Move[];
  readonly depth: number;
  readonly counters: SearchCounters;
  readonly elapsedMs: number;
}

export interface SolveLimitReached {
  readonly status: 'LIMIT_REACHED';
  readonly algorithm: SolverAlgorithm;
  readonly limit: 'MAX_NODES' | 'MAX_DEPTH';
  readonly counters: SearchCounters;
  readonly elapsedMs: number;
}

export type SolveResult = SolveSuccess | SolveLimitReached;

export interface SolverOptions {
  readonly maxNodes?: number;
  readonly maxDepth?: number;
  readonly progressIntervalNodes?: number;
  readonly onProgress?: (telemetry: SearchTelemetry) => void;
}
```

### 6.3. Search Limits & Option Validation
- `maxNodes`: Optional positive integer. Search terminates with `LIMIT_REACHED ('MAX_NODES')` if `nodesExpanded >= maxNodes`.
- `maxDepth`: Optional positive integer. Search terminates with `LIMIT_REACHED ('MAX_DEPTH')` if current search depth exceeds `maxDepth`.
- `progressIntervalNodes`: Optional positive integer (default: 500). Determines cadence of progress callbacks.
- `TIMEOUT_MS_INITIAL_PHASE4: DEFERRED` (wall-clock timeouts introduce nondeterminism; worker termination handles user cancellation).
- Invalid option values (e.g. negative or non-integer bounds) throw `TypeError` synchronously before search initialization.

---

## 7. Web Worker Architecture & Protocol

### 7.1. Worker Lifecycle: Single Worker per Active Search
- **One Active Worker Instance:** Each active search job runs in its own Worker instance.
- **Cancellation & Supersession:** When the user cancels a search or alters the puzzle state, the main thread invokes `worker.terminate()`.
- **State Invalidation:** The main thread invalidates the active `requestId`. Any future search constructs a fresh Worker instance.
- **Purity:** Cancellation never mutates puzzle state and does not require complex cooperative polling in the inner synchronous loop.

### 7.2. Message Protocol (Zero Status Duplication)
```typescript
// Main -> Worker
export type WorkerInboundMessage = {
  readonly type: 'START_SEARCH';
  readonly requestId: string;
  readonly algorithm: SolverAlgorithm;
  readonly state: GearCubeState;
  readonly options?: {
    readonly maxNodes?: number;
    readonly maxDepth?: number;
    readonly progressIntervalNodes?: number;
  };
};

// Worker -> Main
export type WorkerOutboundMessage =
  | {
      readonly type: 'SEARCH_STARTED';
      readonly requestId: string;
    }
  | {
      readonly type: 'SEARCH_PROGRESS';
      readonly requestId: string;
      readonly telemetry: SearchTelemetry;
    }
  | {
      readonly type: 'SEARCH_COMPLETE';
      readonly requestId: string;
      readonly result: SolveSuccess;
    }
  | {
      readonly type: 'SEARCH_LIMIT_REACHED';
      readonly requestId: string;
      readonly result: SolveLimitReached;
    }
  | {
      readonly type: 'SEARCH_ERROR';
      readonly requestId: string;
      readonly error: string;
    };
```

---

## 8. Solve Mode UI & Solution Playback Architecture

### 8.1. UI Components in `apps/web`
- **SolvePanel Overlay (`apps/web/src/components/solver/SolvePanel.tsx`):**
  - Algorithm selector: `BFS`, `Bidirectional BFS`, `IDA*`.
  - Actions: `Solve`, `Cancel`.
  - Live Telemetry Display: Nodes expanded, nodes generated, elapsed time.
  - Solution Display: Move sequence chips and total step count.
- **Playback Controls (`apps/web/src/components/solver/PlaybackControls.tsx`):**
  - `Play` / `Pause` toggle button.
  - `Step Forward` (dispatches next move).
  - `Step Backward` (triggers Undo down to playback start baseline).
  - Speed selector ($1\times, 2\times, 4\times$).

### 8.2. Solve Action Preconditions & Stale-State Guard
- **Precondition:** A solve job can be initiated **ONLY** when `isSessionIdle(app.session) === true`. Solving is disabled during any active animation or halfway lock.
- **Start Key Association:** The solution is bound to `startStateKey = serializeLogicalState(app.session.currentState)`.
- **Generic Invalidation Policy:** If the canonical state key changes from `startStateKey` (via manual move, Undo, Redo, scrub, reset baseline, scramble, or playback state change), the active worker is terminated and any solution is invalidated.
- **Mode Toggle Independence:** Toggling between `TWO_STEP` and `DIRECT_180` interaction modes while IDLE does not alter canonical state and does not invalidate a computed solution.

### 8.3. Playback Authority & Interaction Rules
1. **`PLAYBACK_MUST_NOT_CALL_stepPlayAnimation_DIRECTLY`:** The R3F frame loop in `GearCubeViewport` / `AnimatedGearCubeScene` remains the sole animation stepping driver.
2. **Move Dispatch Orchestration:**
   - **In `DIRECT_180` mode:** Dispatches move once via `startPlayMove` -> frame loop animates -> settles to IDLE -> commits 1 history entry.
   - **In `TWO_STEP` mode:** Dispatches move once -> waits for `HALF_TURN_LOCKED` -> dispatches same move again -> frame loop animates second half -> settles to IDLE -> commits 1 history entry.
   - **Invariant:** Exactly one committed canonical 180° move is appended to the timeline per solver move regardless of UI mode.
3. **Atomic Unit & Pause:** The canonical 180° move is the atomic unit of playback. A pause request during an active animation takes effect after the move completes and settles to IDLE.
4. **History Bounds:** Solution playback records `playbackStartHistoryCursor` and `completedMoveCount`. Step Backward invokes `undoPlay` and is blocked from traversing earlier than `playbackStartHistoryCursor`.
5. **External Interaction Invalidation:** Any manual move, scramble, or timeline scrub while playback is active or paused immediately cancels remaining playback.

---

## 9. Phase 4 Decomposition & Subphase Boundaries

Phase 4 is structured into 5 strictly sequential subphases:

### 9.1. Phase 4A: Solver Package Bootstrap & Common Contracts
- **Objective:** Create `@gearcube/solvers` package, define TypeScript types and serializable protocol, implement dense rank/unrank index with exhaustive bijection tests, and build test-only exact-distance oracle.
- **Allowed Files:**
  - `packages/solvers/package.json`
  - `packages/solvers/tsconfig.json`
  - `packages/solvers/src/index.ts`
  - `packages/solvers/src/types.ts`
  - `packages/solvers/src/protocol.ts`
  - `packages/solvers/src/state-index.ts`
  - `packages/solvers/src/search-utils.ts`
  - `packages/solvers/tests/state-index.test.ts`
  - `packages/solvers/tests/exact-distance-oracle.ts`
  - `packages/solvers/tests/fixtures.ts`
  - `package-lock.json`
- **Acceptance Gate:** 100% passing Vitest unit tests in `packages/solvers`; 41,472/41,472 rank bijection verified; exact distance oracle generates deterministic fixtures.

### 9.2. Phase 4B: BFS & Bidirectional BFS Exact Solvers
- **Objective:** Implement pure BFS and Bidirectional BFS solvers with deterministic expansion, exact move inverse predecessor expansion, and deterministic tie-breaking.
- **Allowed Files:**
  - `packages/solvers/src/bfs.ts`
  - `packages/solvers/src/bidirectional-bfs.ts`
  - `packages/solvers/src/index.ts`
  - `packages/solvers/tests/bfs.test.ts`
  - `packages/solvers/tests/bidirectional-bfs.test.ts`
  - `packages/solvers/tests/optimality.test.ts`
- **Acceptance Gate:** 100% optimal solutions across all depth 1..8 test fixtures; BFS and BiBFS return identical optimal solution lengths; solved state returns empty solution.

### 9.3. Phase 4C: IDA* Search & Admissible Heuristic
- **Objective:** Following an independently accepted Phase 4C heuristic preflight, implement memory-bounded IDA* search and admissible heuristic estimator.
- **Status:** **BLOCKED / NOT UNBLOCKED** until Phase 4C dedicated preflight is accepted.
- **Allowed Files:**
  - `packages/solvers/src/heuristics.ts`
  - `packages/solvers/src/ida-star.ts`
  - `packages/solvers/src/index.ts`
  - `packages/solvers/tests/heuristics.test.ts`
  - `packages/solvers/tests/ida-star.test.ts`
- **Acceptance Gate:** Admissibility proof verified across state domain ($0 \le h(s) \le d^*(s)$); IDA* finds optimal solutions for depth 1..8 fixtures.

### 9.4. Phase 4D: Web Worker Infrastructure & Protocol
- **Objective:** Add `@gearcube/solvers` dependency to `@gearcube/web`, implement browser Worker entry adapter (`apps/web/src/workers/solver.worker.ts`), and build `useSolverWorker` lifecycle hook with termination-based cancellation and request ID guarding.
- **Allowed Files:**
  - `apps/web/package.json`
  - `apps/web/src/workers/solver.worker.ts`
  - `apps/web/src/hooks/useSolverWorker.ts`
  - `apps/web/src/hooks/useSolverWorker.test.ts`
  - `package-lock.json`
- **Acceptance Gate:** Pure worker reducer tests pass in Node Vitest; Worker starts, emits telemetry, returns results, and terminates cleanly upon cancellation.

### 9.5. Phase 4E: Solve Mode UI, Playback & Playwright Browser Acceptance
- **Objective:** Implement SolvePanel UI, playback controller, and automated Playwright E2E tests validating real Worker isolation, main-thread responsiveness, and solution playback.
- **Allowed Files:**
  - `apps/web/src/components/solver/SolvePanel.tsx`
  - `apps/web/src/components/solver/PlaybackControls.tsx`
  - `apps/web/src/components/solver/solve-controller.ts`
  - `apps/web/src/components/solver/solve-controller.test.ts`
  - `apps/web/src/components/canvas/GearCubeViewport.tsx`
  - `apps/web/src/App.css`
  - `tests/e2e/solve-mode.spec.ts`
  - `docs/development/PHASE_4_IMPLEMENTATION_PLAN.md`
  - `docs/development/ROADMAP.md`
- **Acceptance Gate:** 100% passing Playwright E2E suite; `WORKER_EXECUTION_GATE` and `MAIN_THREAD_ACTIONABILITY_GATE` pass in Chromium; zero console errors.

---

## 10. Test Strategy & Ground-Truth Oracle

### 10.1. Test-Only Exact Distance Oracle & Fixtures
- **Test-Only Oracle (`packages/solvers/tests/exact-distance-oracle.ts`):**
  - Imports `@gearcube/core` only (zero production solver imports).
  - Performs simple exhaustive BFS from solved state to build an exact shortest-path depth lookup table across all 41,472 states.
  - Used exclusively by tests to construct deterministic fixtures (`packages/solvers/tests/fixtures.ts`) for each distance $d \in [1 \dots 8]$.
- **Test Invariant:** For each depth $d \in [1 \dots 8]$, fixtures verify:
  1. $\text{length}(\text{BFS}(\text{state})) = d$
  2. $\text{length}(\text{BiBFS}(\text{state})) = d$
  3. $\text{length}(\text{IDA*}(\text{state})) = d$ (when Phase 4C heuristic is accepted)
  4. Applying returned move sequence to `state` produces `isSolved(result) === true`.

### 10.2. Vitest vs Playwright Test Boundaries
- **Node Vitest (`*.test.ts`):** Pure unit tests, state-index bijection tests, search algorithm optimality tests, and controller state reducers. (No React `.test.tsx`, no DOM, no JSDOM).
- **Playwright Chromium E2E (`tests/e2e/solve-mode.spec.ts`):** Real browser tests covering:
  1. **`WORKER_EXECUTION_GATE`:** Proves production solve executes inside a real background Web Worker.
  2. **`MAIN_THREAD_ACTIONABILITY_GATE`:** Proves main thread processes DOM clicks and camera interactions immediately after starting a solve without freezing.
  3. **`PLAYBACK_GATE`:** Proves solution playback completes moves and advances history accurately in both `TWO_STEP` and `DIRECT_180` modes.
  4. **`STALE_RESULT_GATE`:** Proves that modifying the cube during search terminates the worker and prevents stale solution application.

---

## 11. Decisions & Status Summary

- **`PHASE4_NEW_ADR_REQUIRED`:** `NO` (Architecture strictly adheres to ADR-0004, ADR-0005, and ADR-0006).
- **`PHASE4_NEW_RUNTIME_DEPENDENCY_REQUIRED`:** `NO_EXTERNAL_RUNTIME_DEPENDENCY` (`@gearcube/solvers` depends only on `@gearcube/core`).
- **`OPTIONAL_ALGORITHMS_PHASE4_INITIAL_SCOPE`:** `DEFERRED` (IDDFS, A*, and Pattern Databases deferred to avoid blocking primary baselines).
- **`IDA_STAR_HEURISTIC_DECISION`:** `DEFER_TO_PHASE_4C_PREFLIGHT`.
- **`IDA_STAR_OPTIMALITY`:** `DEFERRED_PENDING_ADMISSIBLE_HEURISTIC_ACCEPTANCE`.
- **`WORKER_CANCELLATION_STRATEGY`:** `TERMINATE_ACTIVE_WORKER`.
- **`CANCEL_SEARCH_MESSAGE_REQUIRED`:** `NO`.
- **`REQUEST_ID_STALE_GUARD`:** `YES`.
- **`CANONICAL_STATE_KEY`:** `serializeLogicalState`.
- **`DENSE_RANK_OWNERSHIP`:** `SOLVER_INTERNAL`.
- **`DENSE_UNRANK_REQUIRED`:** `YES`.
- **`PHASE1E_PER_STATE_DISTANCE_TABLE_ALREADY_PERSISTED`:** `NO`.
- **`PHASE4_TEST_DISTANCE_ORACLE`:** Dedicated test-only BFS oracle in `packages/solvers/tests/exact-distance-oracle.ts`.
- **`CANONICAL_GRAPH_DIAMETER`:** `8`.
- **`SOLVE_REQUIRES_SESSION_IDLE`:** `YES`.
- **`PLAYBACK_CALLS_STEP_PLAY_ANIMATION_DIRECTLY`:** `NO`.
- **`TWO_STEP_PLAYBACK_CANONICAL_MOVE`:** Two automated same-direction triggers / one history commit.
- **`DIRECT_180_PLAYBACK_CANONICAL_MOVE`:** One trigger / one history commit.
- **`PLAYBACK_HISTORY_START_GUARD`:** `YES`.
- **`EXTERNAL_UNDO_REDO_INVALIDATES_PLAYBACK`:** `YES`.
- **`MODE_CHANGE_INVALIDATES_SOLUTION`:** `NO_IF_CANONICAL_STATE_UNCHANGED`.
- **`NODE_VITEST_TSX_UI_TESTS_PLANNED`:** `NO`.
- **`APPS_WEB_SOLVER_DEPENDENCY_PLANNED`:** `YES` (`"@gearcube/solvers": "0.0.0"` in Phase 4D).
- **`PHASE4_PLAN_STATUS`:** `PREFLIGHT_READY_FOR_INDEPENDENT_ACCEPTANCE`.
- **`PHASE4_STARTED`:** `NO`.
- **`PHASE4_ACCEPTED`:** `NO`.
