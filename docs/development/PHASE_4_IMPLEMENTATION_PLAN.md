# Phase 4 Implementation Plan — Classical Solver Infrastructure

> **Phase Status:** `PLANNED / PREFLIGHT_READY_FOR_INDEPENDENT_ACCEPTANCE`
> **Phase 4 Started:** `NO`
> **Authoritative Main Baseline:** `f87403cb9e95919c272c5d713888497c8bd92602` (Commit `Record Phase 3C and Phase 3 acceptance` on `main`)
> **Applicability:** Solvers Package (`packages/solvers`), Web Worker Infrastructure, Web Application (`apps/web`), Solve Mode UI, Solution Playback, Playwright Browser E2E Automation

---

## 1. Executive Summary & Objective

Phase 4 introduces the classical graph search and automated solving infrastructure for the Standard Gear Cube. Operating purely over the discrete domain model established in Phase 1 and the interactive web application built in Phases 2 and 3, Phase 4 delivers:

1. **Dedicated Solver Package Boundary (`packages/solvers`):** A zero-dependency, pure TypeScript workspace package containing domain-agnostic solver interfaces, state-space exploration utilities, and algorithm implementations.
2. **Optimal Baseline Solvers:**
   - **Breadth-First Search (BFS):** Exact shortest-path search verifying global optimality.
   - **Bidirectional BFS (BiBFS):** Two-frontier meeting search leveraging the exact algebraic move inverse relation.
   - **Iterative Deepening A* (IDA*):** Memory-efficient depth-bounded heuristic search with admissible estimation.
3. **Web Worker-Isolated Execution:** Off-main-thread search execution via a robust, serializable message protocol with request ID tagging, cooperative cancellation, and throttled progress telemetry.
4. **Interactive Solve Mode UI & Solution Playback:** UI controls for algorithm selection, progress monitoring, and step-by-step or automated solution playback delegating strictly through the single canonical application authority.
5. **End-to-End Test & Acceptance Strategy:** Independent depth 1..8 optimality validation against the Phase 1E ground-truth oracle, worker lifecycle integration tests, and Playwright browser responsiveness tests.

---

## 2. Architecture & Domain Truth Boundaries

### 2.1. Single Source of Truth Principle
- **`CORE_IS_ONLY_PUZZLE_AUTHORITY`:** `YES`. The discrete mathematical state `GearCubeState` from `@gearcube/core` is the sole source of puzzle truth.
- **`SOLVER_INDEPENDENCE`:** Solvers operate strictly on `GearCubeState` and `applyMove(state, move)` from `@gearcube/core`.
- **`NO_RENDERER_OR_KINEMATIC_DERIVATIONS`:** Solvers must never import `@gearcube/kinematics`, `@react-three/fiber`, Three.js, React, or DOM libraries.
- **`PLAYBACK_DELEGATION_PRINCIPLE`:** Solvers return a sequence of canonical `Move[]` only. Solution playback dispatches each move through the existing `PlayApplicationState` / `play-session` / `animation` pipeline. Solvers never construct 3D transforms or maintain a secondary puzzle authority.

### 2.2. Package Dependency Hierarchy
```text
┌─────────────────────────────────────────────────────────────────┐
│                           apps/web                              │
│   (React 19, R3F Viewport, Solve Mode UI, Playback Controller)  │
└──────────────┬───────────────────────────┬──────────────────────┘
               │                           │
               ▼                           ▼
┌──────────────────────────────┐ ┌────────────────────────────────┐
│     @gearcube/kinematics     │ │       @gearcube/solvers        │
│  (3D Transforms, Projection) │ │ (BFS, BiBFS, IDA*, Worker Host)│
└──────────────┬───────────────┘ └─────────┬──────────────────────┘
               │                           │
               └───────────────┬───────────┘
                               ▼
               ┌────────────────────────────────┐
               │        @gearcube/core          │
               │ (GearCubeState, Moves, Transitions)
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
- **Ground-Truth BFS Distance Distribution:**
  - Distance 0 (Solved): 1 state (0.002%)
  - Distance 1: 12 states (0.029%)
  - Distance 2: 111 states (0.268%)
  - Distance 3: 822 states (1.982%)
  - Distance 4: 3,863 states (9.315%)
  - Distance 5: 11,706 states (28.226%)
  - Distance 6: 16,410 states (39.569%)
  - Distance 7: 8,196 states (19.763%)
  - Distance 8: 351 states (0.846%)
  - Total: 41,472 states (100.000%)

---

## 4. Move Ordering, Inverses & Determinism

### 4.1. Deterministic Expansion Ordering
- Successor generation always iterates `ALL_MOVES` in standard index order:
  1. `U CW`, 2. `U CCW`, 3. `D CW`, 4. `D CCW`,
  5. `F CW`, 6. `F CCW`, 7. `B CW`, 8. `B CCW`,
  9. `R CW`, 10. `R CCW`, 11. `L CW`, 12. `L CCW`.
- **Tie-Breaking Determinism:** For any state with multiple optimal paths, solvers will deterministically choose the lexicographically first sequence dictated by `ALL_MOVES` traversal order.

### 4.2. Exact Move Inverse Relation
- Every canonical move $M = (F, D)$ has an exact inverse $M^{-1} = (F, \text{opposite}(D))$:
  `inverse(F, CW) = (F, CCW)`, `inverse(F, CCW) = (F, CW)`.
- Mathematically verified across all 41,472 states in Phase 1E:
  $$\forall S \in \text{ReachableStates}, \forall M \in \text{ALL\_MOVES}: \quad \text{applyMove}(\text{applyMove}(S, M), M^{-1}) = S$$
- **Bidirectional BFS Predecessor Generation:**
  In the backward search rooted at `SOLVED_GEAR_CUBE_STATE`, stepping backward along edge $u \xrightarrow{M} v$ is computed directly as $u = \text{applyMove}(v, M^{-1})$.
  When forward frontier ($S_{\text{start}} \dots m$) meets backward frontier ($m \dots S_{\text{solved}}$), the forward path is concatenated with the backward path to form the complete optimal solution.

---

## 5. State Indexing, Memory Budget & Data Structures

### 5.1. Dense State Ranking & State Keys
- **Dense Integer Rank:** Bijective dense integer rank function mapping $S \mapsto [0 \dots 41471]$:
  $$\text{rank}(S) = C \cdot 1728 + (k_X \cdot 3 + p_X) \cdot 144 + (k_Y \cdot 3 + p_Y) \cdot 12 + (k_Z \cdot 3 + p_Z)$$
- **Canonical String Key:** `serializeLogicalState(state)` (`"C:0|X:0.0|Y:0.0|Z:0.0"`) for serializable message boundaries and logging.

### 5.2. Memory Budget Analysis
Given the finite state space of 41,472 states:
- Visited Bitset / Byte Array: `new Uint8Array(41472)` $\approx 41.5\text{ KB}$.
- Parent Index Array: `new Int32Array(41472)` $\approx 165.9\text{ KB}$.
- Parent Move Array: `new Int8Array(41472)` $\approx 41.5\text{ KB}$.
- Queue Storage: Array of integers or states up to 41,472 items $\approx 330\text{ KB}$.
- **Total Search Memory:** Under 1.5 MB, perfectly suited for high-speed in-browser Web Worker execution without heap bloat.

---

## 6. Algorithm Contracts & Result Schemas

### 6.1. Result & Telemetry Contracts
```typescript
export type SolverAlgorithm = 'BFS' | 'BIDIRECTIONAL_BFS' | 'IDA_STAR';

export interface SolverMetrics {
  readonly nodesExpanded: number;
  readonly nodesGenerated: number;
  readonly solutionDepth: number;
  readonly elapsedMs: number;
}

export interface SolveSuccess {
  readonly status: 'SOLVED';
  readonly algorithm: SolverAlgorithm;
  readonly moves: readonly Move[];
  readonly depth: number;
  readonly metrics: SolverMetrics;
}

export interface SolveFailure {
  readonly status: 'CANCELLED' | 'LIMIT_REACHED' | 'ERROR';
  readonly algorithm: SolverAlgorithm;
  readonly reason?: string;
  readonly metrics: SolverMetrics;
}

export type SolveResult = SolveSuccess | SolveFailure;

export interface SolverOptions {
  readonly maxNodes?: number;
  readonly maxDepth?: number;
  readonly timeoutMs?: number;
  readonly progressIntervalNodes?: number;
  readonly onProgress?: (metrics: SolverMetrics) => void;
  readonly shouldCancel?: () => boolean;
}
```

### 6.2. Invariants & Optimality Claims
1. **`SOLUTION_VALIDITY`:** Applying `moves` sequentially to `inputState` results in `isSolved(result) === true`.
2. **`EMPTY_SOLVED_SOLUTION`:** If `isSolved(inputState) === true`, `moves === []` and `depth === 0`.
3. **`BFS_OPTIMALITY`:** BFS returns the globally shortest move sequence under unit-cost metric.
4. **`BIBFS_OPTIMALITY`:** Bidirectional BFS returns the globally shortest move sequence under unit-cost metric.
5. **`IDA_STAR_OPTIMALITY`:** IDA* returns an optimal solution if and only if the configured heuristic $h(s)$ is admissible ($\forall s, 0 \le h(s) \le d^*(s)$).
6. **`IMMUTABILITY`:** Input `GearCubeState` and option parameters are never mutated.

---

## 7. Web Worker Protocol & Lifecycle Management

### 7.1. Message Schema
```typescript
// Main -> Worker
export type WorkerInboundMessage =
  | {
      readonly type: 'START_SEARCH';
      readonly requestId: string;
      readonly algorithm: SolverAlgorithm;
      readonly state: GearCubeState;
      readonly options?: {
        readonly maxNodes?: number;
        readonly maxDepth?: number;
        readonly timeoutMs?: number;
        readonly progressIntervalNodes?: number;
      };
    }
  | {
      readonly type: 'CANCEL_SEARCH';
      readonly requestId: string;
    };

// Worker -> Main
export type WorkerOutboundMessage =
  | {
      readonly type: 'SEARCH_PROGRESS';
      readonly requestId: string;
      readonly metrics: SolverMetrics;
    }
  | {
      readonly type: 'SEARCH_COMPLETE';
      readonly requestId: string;
      readonly result: SolveResult;
    }
  | {
      readonly type: 'SEARCH_CANCELLED';
      readonly requestId: string;
      readonly metrics: SolverMetrics;
    }
  | {
      readonly type: 'SEARCH_ERROR';
      readonly requestId: string;
      readonly error: string;
    };
```

### 7.2. Stale Request Guarding & Cancellation
- **Request ID Guarding:** Every solve job generates a unique `requestId` (e.g. UUID or monotonic counter). Worker messages matching a stale `requestId` are discarded by the UI hook.
- **Auto-Cancellation on State Change:** If the user executes a manual move, applies a scramble, or alters the puzzle state while a search is running, the active job is immediately cancelled (`CANCEL_SEARCH`) and discarded.
- **Cooperative Worker Check:** Worker checks `shouldCancel()` every $N$ nodes (default: 100 nodes).
- **Throttled Telemetry:** `SEARCH_PROGRESS` emitted every $M$ nodes (default: 500 nodes) to prevent main-thread message saturation.

---

## 8. Solve Mode UI & Solution Playback

### 8.1. UI Components in `apps/web`
- **SolvePanel Overlay:**
  - Algorithm selector: `BFS`, `Bidirectional BFS`, `IDA*`.
  - Actions: `Solve`, `Cancel`.
  - Live Telemetry Display: Nodes expanded, nodes generated, search depth, elapsed time.
  - Solution Display: Move chips (`R+ U- ...`) and total step count.
- **Playback Controls:**
  - `Play` / `Pause` toggle button.
  - `Step Forward` (dispatches next move).
  - `Step Backward` (triggers Undo).
  - Speed selector ($1\times, 2\times, 4\times$).

### 8.2. Playback Authority & Interaction Rules
1. **Single Application Authority:** Playback calls `startPlayMove(move)` and `stepPlayAnimation(nowMs)`.
2. **Animation Settle Requirement:** The playback engine waits until `isSessionIdle(session) === true` before dispatching the next move.
3. **History Integration:** Each played move appends to the canonical timeline history as a committed move.
4. **State Invalidation Guard:** Solution is associated with `startStateKey`. If the puzzle state is manually modified, the remaining playback sequence is invalidated.
5. **Interruptibility:** Any manual move, scramble, or timeline scrub immediately pauses and cancels playback.

---

## 9. Phase 4 Decomposition & Subphase Boundaries

Phase 4 is decomposed into 5 dependency-ordered, independently verifiable subphases:

### 9.1. Phase 4A: Solver Package Bootstrap & Common Contracts
- **Objective:** Create `@gearcube/solvers` workspace package, define TypeScript interfaces, implement dense rank & search utilities, build test fixtures from Phase 1E oracle.
- **Allowed Files:**
  - `packages/solvers/package.json`
  - `packages/solvers/tsconfig.json`
  - `packages/solvers/src/index.ts`
  - `packages/solvers/src/types.ts`
  - `packages/solvers/src/search-utils.ts`
  - `packages/solvers/tests/search-utils.test.ts`
  - `packages/solvers/tests/fixtures.ts`
- **Acceptance Gate:** Unit tests pass, Core purity preserved, package exports clean.

### 9.2. Phase 4B: BFS & Bidirectional BFS Exact Solvers
- **Objective:** Implement pure BFS and Bidirectional BFS solvers with exact move inverse predecessor expansion and deterministic tie-breaking.
- **Allowed Files:**
  - `packages/solvers/src/bfs.ts`
  - `packages/solvers/src/bidirectional-bfs.ts`
  - `packages/solvers/src/index.ts`
  - `packages/solvers/tests/bfs.test.ts`
  - `packages/solvers/tests/bidirectional-bfs.test.ts`
  - `packages/solvers/tests/optimality.test.ts`
- **Acceptance Gate:** 100% optimal solutions across all depth 1..8 test fixtures; BFS and BiBFS return identical optimal solution lengths; solved state returns empty solution.

### 9.3. Phase 4C: IDA* Search & Admissible Heuristic
- **Objective:** Implement memory-bounded IDA* search and first admissible heuristic (e.g. corner/slice coordinate lower bounds).
- **Allowed Files:**
  - `packages/solvers/src/heuristics.ts`
  - `packages/solvers/src/ida-star.ts`
  - `packages/solvers/src/index.ts`
  - `packages/solvers/tests/heuristics.test.ts`
  - `packages/solvers/tests/ida-star.test.ts`
- **Acceptance Gate:** Heuristic admissibility verified across all reachable states ($0 \le h(s) \le d^*(s)$); IDA* returns optimal solution length for depth 1..8 fixtures.

### 9.4. Phase 4D: Web Worker Infrastructure & Protocol
- **Objective:** Implement Web Worker entry, serializable message handlers, cooperative cancellation, request ID guarding, and throttled progress reporting.
- **Allowed Files:**
  - `packages/solvers/src/worker.ts`
  - `packages/solvers/src/protocol.ts`
  - `packages/solvers/src/index.ts`
  - `packages/solvers/tests/protocol.test.ts`
  - `apps/web/src/hooks/useSolverWorker.ts`
  - `apps/web/src/hooks/useSolverWorker.test.ts`
- **Acceptance Gate:** Worker starts search, emits progress, returns solution, and cancels cleanly without main-thread blocking or stale response leaks.

### 9.5. Phase 4E: Solve Mode UI, Playback & Playwright Browser Acceptance
- **Objective:** Implement SolvePanel UI, playback controller, history wiring, and automated Playwright E2E tests validating non-blocking search and solution playback.
- **Allowed Files:**
  - `apps/web/src/components/solver/SolvePanel.tsx`
  - `apps/web/src/components/solver/SolvePanel.test.tsx`
  - `apps/web/src/components/solver/PlaybackControls.tsx`
  - `apps/web/src/components/canvas/GearCubeViewport.tsx`
  - `apps/web/src/App.css`
  - `tests/e2e/solve-mode.spec.ts`
  - `docs/development/PHASE_4_IMPLEMENTATION_PLAN.md`
  - `docs/development/ROADMAP.md`
- **Acceptance Gate:** 100% passing Playwright E2E suite; browser user can trigger solve, observe progress, and play back solution without frame drops; zero runtime console errors.

---

## 10. Test Strategy & Ground-Truth Oracle

### 10.1. Ground-Truth Depth 1..8 Fixture Strategy
- **Oracle Source:** The Phase 1E ground-truth BFS distance table (exhaustively characterizing all 41,472 states).
- **Selection Criterion:** Fixtures are selected where the **exact canonical shortest distance** is known to equal $d \in \{1, 2, 3, 4, 5, 6, 7, 8\}$. (Scramble length is never equated with optimal distance).
- **Test Invariant:** For each depth $d \in [1 \dots 8]$, test fixtures verify:
  1. $\text{length}(\text{BFS}(\text{state})) = d$
  2. $\text{length}(\text{BiBFS}(\text{state})) = d$
  3. $\text{length}(\text{IDA*}(\text{state})) = d$
  4. $\text{applyMoveSequence}(\text{state}, \text{solution}) = \text{SOLVED\_GEAR\_CUBE\_STATE}$

### 10.2. Browser Responsiveness Acceptance Gate
- In Playwright Chromium E2E:
  1. Scramble puzzle to depth 6–8.
  2. Trigger solver in Solve Mode.
  3. While search is actively executing in Web Worker, interact with camera orbit drag or timeline controls.
  4. Verify main thread remains responsive (no UI freeze or frame locking).
  5. Verify solution completes, UI updates with move list, and playback functions cleanly.

---

## 11. Architecture Review & Decision Status

- **`PHASE4_NEW_ADR_REQUIRED`:** `NO` (All architectural decisions strictly conform to existing ADR-0004, ADR-0005, and ADR-0006).
- **`PHASE4_NEW_RUNTIME_DEPENDENCY_REQUIRED`:** `NO` (Zero external dependencies; pure TypeScript graph search and standard Web Worker API).
- **`OPTIONAL_ALGORITHMS_PHASE4_INITIAL_SCOPE`:** `DEFERRED` (IDDFS, A*, and Pattern Databases deferred to optional future extensions).
- **`IDA_STAR_HEURISTIC_DECISION`:** `COORDINATE_BOUNDS_OR_DEFER_TO_PHASE_4C` (Admissible coordinate lower bounds proposed; formal selection frozen in Phase 4C preflight).
- **`PHASE4_PLAN_STATUS`:** `PREFLIGHT_READY_FOR_INDEPENDENT_ACCEPTANCE`
- **`PHASE4_STARTED`:** `NO`
- **`PHASE4_ACCEPTED`:** `NO`
- **`PROPOSED_FUTURE_IMPLEMENTATION_FILES`:**
  1. `packages/solvers/package.json`
  2. `packages/solvers/tsconfig.json`
  3. `packages/solvers/src/index.ts`
  4. `packages/solvers/src/types.ts`
  5. `packages/solvers/src/search-utils.ts`
  6. `packages/solvers/src/bfs.ts`
  7. `packages/solvers/src/bidirectional-bfs.ts`
  8. `packages/solvers/src/heuristics.ts`
  9. `packages/solvers/src/ida-star.ts`
  10. `packages/solvers/src/worker.ts`
  11. `packages/solvers/src/protocol.ts`
  12. `packages/solvers/tests/**`
  13. `apps/web/src/hooks/useSolverWorker.ts`
  14. `apps/web/src/components/solver/SolvePanel.tsx`
  15. `apps/web/src/components/solver/PlaybackControls.tsx`
  16. `apps/web/src/components/canvas/GearCubeViewport.tsx`
  17. `apps/web/src/App.css`
  18. `tests/e2e/solve-mode.spec.ts`
- **`EXPLICITLY_FORBIDDEN_MODIFICATIONS`:**
  - `packages/core/**` (Core domain contracts are immutable).
  - `packages/kinematics/**` (Kinematic calculations remain unchanged).