# Phase 4 Implementation Plan — Classical Solver Infrastructure

> **Phase Status:** `IMPLEMENTATION_STARTED / PHASE4A_ACCEPTED / PHASE4B_CANDIDATE_READY_FOR_INDEPENDENT_ACCEPTANCE`
> **Preflight Status:** `ACCEPTED`
> **Preflight Accepted Head:** `996825befc021d322bf353f06347a7e09375af40`
> **Phase 4 Started:** `YES`
> **Phase 4 Accepted:** `NO`
> **Phase 4 Overall Complete:** `NO`
> **Phase 4A Status:** `COMPLETED / ACCEPTED`
> **Phase 4A Accepted:** `YES`
> **Phase 4A Accepted Head:** `392bd80c48ff79b5777076371dfd54f693d57941`
> **Phase 4B Status:** `IMPLEMENTED / READY_FOR_INDEPENDENT_ACCEPTANCE`
> **Phase 4B Accepted:** `NO`
> **Phase 4C Status:** `PLANNED / BLOCKED_BY_PHASE4B_ACCEPTANCE_AND_DEDICATED_HEURISTIC_PREFLIGHT`
> **Phase 4C Heuristic Preflight:** `REQUIRED BEFORE PHASE4C IMPLEMENTATION`
> **Authoritative Main Baseline:** `89ab794f5b6bd5d010a295ae97c9fbb7e803243f` (Commit `Record Phase 4A acceptance` on `main`)
> **Applicability:** Solvers Package (`packages/solvers`), Web Application (`apps/web`), Web Worker Infrastructure (`apps/web/src/workers`), Solve Mode UI, Solution Playback, Playwright Browser E2E Automation

---

## 1. Executive Summary & Objective

Phase 4 introduces the classical graph search and automated solving infrastructure for the Standard Gear Cube. Operating purely over the discrete domain model established in Phase 1 and the interactive web application built in Phases 2 and 3, Phase 4 delivers:

1. **Dedicated Solver Package Boundary (`packages/solvers`):** A pure TypeScript workspace package containing domain-agnostic solver interfaces, state-space exploration utilities, and algorithm implementations. It depends strictly on `@gearcube/core` and contains zero external runtime dependencies.
2. **Optimal Baseline Solvers:**
   - **Breadth-First Search (BFS):** Uninformed exact-search baseline verifying global optimality under canonical move metric.
   - **Bidirectional BFS (BiBFS):** Two-frontier complete-layer meeting search leveraging the exact algebraic move inverse relation and provable lower-bound stopping rule.
   - **Iterative Deepening A* (IDA*):** Memory-bounded depth-first heuristic search (implementation conditional on independently accepted admissible heuristic preflight in Phase 4C).
3. **Web Worker-Isolated Execution:** Off-main-thread search execution hosted in `apps/web/src/workers/solver.worker.ts` with one Worker per active search, monotonic request ID tagging, termination-based disposal, and throttled algorithm-specific telemetry.
4. **Interactive Solve Mode UI & Solution Playback:** UI controls in `apps/web` for algorithm selection, progress monitoring, and step-by-step or automated solution playback with expected-prefix state guarding delegating strictly through the single canonical application authority without calling frame-step functions directly.
5. **End-to-End Test & Acceptance Strategy:** Independent depth 1..8 optimality validation against a Phase 4A test-only exact-distance oracle, pure controller/reducer unit tests in Node Vitest, and Playwright browser responsiveness tests.

> **Preflight Acceptance Note:** The Phase 4 classical solver preflight specifications, package boundaries, 5-subphase decomposition (4A..4E), exact-distance oracle gates, lower-bound BiBFS stopping rule, and Web Worker lifecycle were independently reviewed and accepted at commit `996825befc021d322bf353f06347a7e09375af40`. Phase 4A implementation is unblocked; Phase 4 implementation has NOT started.

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

## 4. Move Ordering, Inverses, BiBFS Stopping Rule & Determinism

### 4.1. Deterministic Expansion Ordering
- Successor generation always iterates `ALL_MOVES` in standard index order:
  1. `U CW`, 2. `U CCW`, 3. `D CW`, 4. `D CCW`,
  5. `F CW`, 6. `F CCW`, 7. `B CW`, 8. `B CCW`,
  9. `R CW`, 10. `R CCW`, 11. `L CW`, 12. `L CCW`.
- **BFS Determinism:** Traverses queue in FIFO order with `ALL_MOVES` successor order, deterministically returning the first-found optimal path.

### 4.2. Exact Move Inverse Relation & Solver Helper
- Every canonical move $M = (F, D)$ has an exact inverse $M^{-1} = (F, \text{opposite}(D))$:
  `inverseMove({ face, direction }) = { face, direction: direction === 'CW' ? 'CCW' : 'CW' }`.
- Mathematically verified across all 41,472 states in Phase 1E:
  $$\forall S \in \text{ReachableStates}, \forall M \in \text{ALL\_MOVES}: \quad \text{applyMove}(\text{applyMove}(S, M), \text{inverseMove}(M)) = S$$

### 4.3. Bidirectional BFS Layer Expansion & Optimal Stopping Rule
- **Complete Layer Expansion:** Both forward search (rooted at $S_{\text{start}}$) and backward search (rooted at $S_{\text{solved}}$) operate on COMPLETE BFS depth layers.
- **Frontier Selection:** Expands the smaller complete frontier by current layer node count. Ties are broken in favor of the forward frontier.
- **Meeting Candidate Collection:** During the processing of an entire layer, all meeting candidates $m$ where the frontier intersects the opposing visited set are collected:
  $$\text{candidateDepth}(m) = \text{forwardDistance}[m] + \text{backwardDistance}[m]$$
- **Layer Best Update:** After the entire layer is processed, `bestDepth = min(bestDepth, min(candidateDepths))`.
- **Deterministic Meeting Tie Rule:** If multiple meeting candidates achieve the identical minimum `candidateDepth`, the candidate with the lowest dense integer rank $\min(\text{rankState}(m))$ is selected. Parent ties remain first-discovered under `ALL_MOVES` ordering.
- **Provable Lower-Bound Termination Rule:** Let $\text{nextForwardDepth}$ and $\text{nextBackwardDepth}$ be the depths of the next unexpanded complete layers (using $\infty$ for an exhausted frontier). BiBFS **must not stop at first intersection**; it terminates with the optimal solution if and only if:
  $$\text{bestDepth} < \infty \quad \text{AND} \quad \text{nextForwardDepth} + \text{nextBackwardDepth} \ge \text{bestDepth}$$
  *(Rationale: Since all layers below those depths have been exhaustively expanded, no unexamined path can have length strictly less than $\text{nextForwardDepth} + \text{nextBackwardDepth}$).*

### 4.4. Bidirectional BFS Path Reconstruction
- **Backward Frontier Storage:** When backward search discovers node $u$ from backward node $v$ via predecessor step $u = \text{applyMove}(v, \text{inverseMove}(M))$, it stores at $u$:
  - `nextTowardGoalRank = rankState(v)`
  - `forwardMove = M`
- **Reconstruction:** Forward path ($S_{\text{start}} \dots m$) is reconstructed from forward parent records. Backward path ($m \dots S_{\text{solved}}$) is reconstructed directly following stored `forwardMove` references. The paths are concatenated without double-inversion ambiguity.
- **Cross-Algorithm Contract:** For a given start state, BFS and BiBFS may return different move sequences if multiple optimal paths exist, but **both must return identical optimal solution lengths**.

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
  - Total raw typed buffers: $\approx 415\text{ KB}$ per unidirectional search, $\approx 830\text{ KB}$ for symmetric BiBFS.
- *(Note: Raw typed-buffer estimates illustrate memory layout; memory footprint is not a Phase 4 correctness acceptance gate).*

---

## 6. Algorithm Contracts, Metrics & Search Limits

### 6.1. Search Counters & Telemetry Definitions
- **`nodesExpanded`:** Count of search nodes whose outgoing legal successors have been enumerated via `applyMove`. (For BiBFS, aggregate count from both frontiers).
- **`nodesGenerated`:** Count of successor candidate states produced by `applyMove`, including states subsequently pruned or already visited.
- **`elapsedMs`:** Observational wall-clock execution time in milliseconds using standard ES2022 `Date.now()` (observational telemetry only, never a correctness oracle; no DOM clock dependencies).
- **`solutionDepth`:** Exact move count (`moves.length`) of the returned solution (defined only when `status === 'SOLVED'`).

### 6.2. Result Types & Options
```typescript
export type SolverAlgorithm = 'BFS' | 'BIDIRECTIONAL_BFS' | 'IDA_STAR';

export interface SearchCounters {
  readonly nodesExpanded: number;
  readonly nodesGenerated: number;
}

export type SearchTelemetry =
  | {
      readonly algorithm: 'BFS';
      readonly nodesExpanded: number;
      readonly nodesGenerated: number;
      readonly elapsedMs: number;
      readonly frontierDepth: number;
    }
  | {
      readonly algorithm: 'BIDIRECTIONAL_BFS';
      readonly nodesExpanded: number;
      readonly nodesGenerated: number;
      readonly elapsedMs: number;
      readonly forwardDepth: number;
      readonly backwardDepth: number;
      readonly bestSolutionDepth: number | null;
    }
  | {
      readonly algorithm: 'IDA_STAR';
      readonly nodesExpanded: number;
      readonly nodesGenerated: number;
      readonly elapsedMs: number;
      readonly threshold: number;
      readonly currentDepth: number;
    };

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

### 6.3. Search Limits & Goal-Check Ordering
- **Deterministic Solver Order:**
  1. Validate option bounds.
  2. If input state is solved, return `SOLVED` (depth 0, `moves = []`) immediately before resource checks.
  3. When a candidate state is popped from the queue, goal-test it before checking expansion limits.
  4. Only non-goal states are subject to the `maxNodes` expansion check (`nodesExpanded === maxNodes`).
  5. `nodesExpanded` increments only when outgoing successors are enumerated. Therefore, encountering a goal state when `nodesExpanded === maxNodes` still returns `SOLVED`.
- `maxNodes`: Optional positive integer ($\ge 1$). Before expanding another non-goal node, if `nodesExpanded === maxNodes`, search terminates with `LIMIT_REACHED ('MAX_NODES')`.
- `maxDepth`: Optional non-negative integer ($\ge 0$).
  - If `maxDepth === 0`: solved input returns `SOLVED` (depth 0); non-solved input returns `LIMIT_REACHED ('MAX_DEPTH')` without generating successors.
  - In BFS: nodes with depth $< \text{maxDepth}$ generate successors; nodes with depth $== \text{maxDepth}$ are goal-tested only and do not generate successors. If the queue exhausts, search returns `LIMIT_REACHED ('MAX_DEPTH')`.
  - In BiBFS: `maxDepth` applies to total candidate solution length. If the lower-bound stopping rule proves no path $\le \text{maxDepth}$ exists, search returns `LIMIT_REACHED ('MAX_DEPTH')`.
  - If `maxNodes` is exhausted before depth limit, `MAX_NODES` takes precedence.
- `progressIntervalNodes`: Optional positive integer ($\ge 1$, default: 500). Progress is emitted after each completed multiple of `progressIntervalNodes` expanded nodes.
- `TIMEOUT_MS_INITIAL_PHASE4: DEFERRED` (wall-clock timeouts introduce nondeterminism; worker termination handles user cancellation).
- Invalid options (e.g. negative `maxNodes`, float values) throw `TypeError` synchronously before search initialization.

---

## 7. Web Worker Architecture & Protocol

### 7.1. Worker Lifecycle: Single Worker per Active Search
- **One Active Worker Instance:** Each active search job runs in its own Worker instance.
- **Request IDs:** Generated via a session-local monotonic counter converted to string (`"1"`, `"2"`, `"3"`, ...; no UUID dependency).
- **Cancellation & Supersession:** When the user cancels a search or alters the puzzle state, the main thread invokes `worker.terminate()`, invalidates the active `requestId`, and clears the active Worker reference.
- **Terminal Disposal:** When a terminal result (`SEARCH_COMPLETE`, `SEARCH_LIMIT_REACHED`, `SEARCH_ERROR`) is processed, the Worker instance is immediately terminated/disposed and its reference cleared. No idle completed Worker remains retained.
- **Stale Message Protection:** Queued or in-flight messages from a terminated Worker are discarded unless their `requestId` matches the current active search.

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

## 8. Solve Mode UI, Playback & Lifecycle Separation

### 8.1. Separation of Active Search vs Accepted Playback Lifecycles
The lifecycle of an active search is strictly distinct from the lifecycle of an accepted solution:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                ACTIVE SEARCH LIFECYCLE                                 │
│                                                                                        │
│  Initiated when session is IDLE -> Records searchStartStateKey & activeRequestId       │
│                                                                                        │
│  [Intent-Level Cancellation]                                                           │
│  Any external canonical action (buttons, keyboard, undo, redo, scrub, scramble)       │
│  IMMEDIATELY cancels search via worker.terminate() BEFORE dispatching the action.       │
│                                                                                        │
│  [Defensive Gate on Result]                                                            │
│  Result accepted ONLY if:                                                              │
│  requestId === activeRequestId AND session is IDLE AND                                 │
│  serializeLogicalState(session.currentState) === searchStartStateKey                   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ On Valid SEARCH_COMPLETE
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              ACCEPTED PLAYBACK LIFECYCLE                               │
│                                                                                        │
│  Worker disposed -> Solution stored with expectedStateKeys[0..moves.length]            │
│                                                                                        │
│  [Expected-Prefix State Guard]                                                         │
│  Before move k: currentState key must equal expectedStateKeys[k]                       │
│  After move k:  currentState key must equal expectedStateKeys[k+1]                     │
│                 -> playbackIndex++ and completedMoveCount++                            │
│                                                                                        │
│  [Action-Origin Distinction]                                                           │
│  - Internal Playback Moves: advance solution through startPlayMove WITHOUT cancelling   │
│  - External User Actions: (manual move, Undo, Redo, scrub, scramble) CANCEL playback  │
│  - Mode Toggle (while IDLE): preserves solution; moves adapt to new mode               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 8.2. Playback Expected-Prefix State Guard
- **Metadata Structure:**
  - `solutionStartStateKey`: `serializeLogicalState(session.currentState)` at search completion.
  - `moves`: readonly `Move[]`.
  - `expectedStateKeys`: derived serialized state keys where `expectedStateKeys[0] = solutionStartStateKey` and `expectedStateKeys[k+1] = serializeLogicalState(applyMove(state_k, moves[k]))`.
  - `playbackIndex`: current move pointer $[0 \dots \text{moves.length}]$.
  - `playbackStartHistoryCursor`: history cursor at playback start.
  - `completedMoveCount`: count of moves completed during this playback session.
- **Dispatch Guard:** Before dispatching solver move $k$, `isSessionIdle(session)` must be `true` and `serializeLogicalState(session.currentState)` must equal `expectedStateKeys[k]`.
- **Settle Guard:** After canonical move $k$ settles to `IDLE`, `serializeLogicalState(session.currentState)` must equal `expectedStateKeys[k+1]`. Then `playbackIndex++` and `completedMoveCount++`.
- **Mismatch Policy:** Any unexpected mismatch immediately cancels remaining playback without mutating puzzle state.

### 8.3. Playback Authority & Step-Backward State Machine
1. **`PLAYBACK_MUST_NOT_CALL_stepPlayAnimation_DIRECTLY`:** The R3F frame loop in `GearCubeViewport` / `AnimatedGearCubeScene` remains the sole animation stepping driver.
2. **Move Dispatch Orchestration:**
   - **In `DIRECT_180` mode:** Dispatches move once via `startPlayMove` -> frame loop animates -> settles to IDLE -> commits 1 history entry.
   - **In `TWO_STEP` mode:** Dispatches move once -> waits for `HALF_TURN_LOCKED` -> dispatches same move again -> frame loop animates second half -> settles to IDLE -> commits 1 history entry.
   - **Invariant:** Exactly one committed canonical 180° move is appended to the timeline per solver move regardless of UI mode.
3. **Atomic Unit & Pause:** The canonical 180° move is the atomic unit of playback. A pause request during an active animation takes effect after the move completes and settles to IDLE (never pauses at `HALF_TURN_LOCKED`).
4. **Step Backward State Machine:**
   - Preconditions: `completedMoveCount > 0`, `playbackIndex > 0`, `history.cursorIndex > playbackStartHistoryCursor`, session is `IDLE`.
   - Action: Invokes `undoPlay(app)` once.
   - Verification: After undo settles, verifies `serializeLogicalState(session.currentState) === expectedStateKeys[playbackIndex - 1]`.
   - Update: Updates BOTH `completedMoveCount--` and `playbackIndex--`.
   - Invariant: Step Backward is strictly bounded by `playbackStartHistoryCursor`.
   - Guard failure: If the state does not match `expectedStateKeys[playbackIndex - 1]`, cancels playback metadata without repairing state.
5. **Step Forward after Step Backward:** Dispatches `moves[playbackIndex]` (replaying the undone solver move) through canonical move orchestration.
6. **External Interaction Invalidation:** External manual moves, toolbar Undo/Redo, timeline scrub, reset baseline, or starting a new Solve job immediately cancel remaining playback.

---

## 9. Phase 4 Decomposition & Subphase Boundaries

Phase 4 is structured into 5 strictly sequential subphases:

### 9.1. Phase 4A: Solver Package Bootstrap & Common Contracts
- **Objective:** Create `@gearcube/solvers` workspace package, define types, protocol, and search-utils (with `inverseMove`), implement dense rank/unrank index with exhaustive bijection tests, create test-only exact-distance oracle with test file, and add root architectural boundary test.
- **Allowed Files:**
  - `packages/solvers/package.json`
  - `packages/solvers/tsconfig.json`
  - `packages/solvers/src/index.ts`
  - `packages/solvers/src/types.ts`
  - `packages/solvers/src/protocol.ts`
  - `packages/solvers/src/state-index.ts`
  - `packages/solvers/src/search-utils.ts`
  - `packages/solvers/tests/state-index.test.ts`
  - `packages/solvers/tests/search-utils.test.ts`
  - `packages/solvers/tests/exact-distance-oracle.ts`
  - `packages/solvers/tests/exact-distance-oracle.test.ts`
  - `packages/solvers/tests/fixtures.ts`
  - `tests/boundary.test.ts`
  - `package-lock.json`
  - `docs/development/PHASE_4_IMPLEMENTATION_PLAN.md` (optional doc sync)
  - `docs/development/ROADMAP.md` (optional doc sync)
  - `docs/development/TEST_STRATEGY.md` (optional doc sync)
- **Component File Ownership:**
  - `exact-distance-oracle.ts`: Test-only Core-only BFS distance oracle helper.
  - `exact-distance-oracle.test.ts`: Vitest test suite asserting oracle properties across 41,472 states.
  - `fixtures.ts`: Deterministic serialized state fixtures for exact depths $1 \dots 8$.
- **Acceptance Gates:**
  - `DENSE_RANK_STATE_COUNT`: 41,472 states.
  - `DENSE_RANK_RANGE`: Exactly $0 \dots 41471$.
  - `DENSE_RANK_BIJECTION`: 41,472 / 41,472 ($\forall s: \text{unrank}(\text{rank}(s)) = s$, $\forall i: \text{rank}(\text{unrank}(i)) = i$).
  - `EXACT_DISTANCE_ORACLE_STATE_COUNT`: 41,472 states discovered.
  - `EXACT_DISTANCE_ORACLE_SOLVED_DEPTH`: 0 for solved state.
  - `EXACT_DISTANCE_ORACLE_DIAMETER`: 8.
  - `EXACT_DISTANCE_FIXTURES`: At least one deterministic serialized fixture for every exact depth $d \in [1 \dots 8]$.
  - `SOLVER_BOUNDARY_EXECUTABLE_GATE`: `tests/boundary.test.ts` verifies `packages/solvers` imports only `@gearcube/core` and relative modules, and manifest/tsconfig match frozen purity specs.

#### 9.1.1. Executable Solver Boundary Specification (`SOLVER_BOUNDARY_EXECUTABLE_GATE`)
- **Implementation Owner:** `tests/boundary.test.ts`.
- **Parser Reuse:** Imports and reuses existing `extractModuleSpecifiers` helper from `scripts/check-core-deps.mjs` without modifying `scripts/check-core-deps.mjs`.
- **Recursive Source Scan:** Recursively inspects all `packages/solvers/src/**/*.ts` source files.
- **Allowed Module Specifiers:**
  - `@gearcube/core`
  - Internal relative paths starting with `./` or `../` that resolve within `packages/solvers`.
- **Forbidden Module Specifiers:**
  - `@gearcube/kinematics`, `apps/web`, `react`, `react-dom`, `three`, `@react-three/*`, `zustand`, browser/DOM global APIs, or any unapproved external package.
- **Manifest Boundary Contract (`packages/solvers/package.json`):**
  - `name`: `"@gearcube/solvers"`
  - `version`: `"0.0.0"`
  - `private`: `true`
  - `type`: `"module"`
  - `dependencies`: Exactly `{ "@gearcube/core": "0.0.0" }`
  - `optionalDependencies`: absent
  - `peerDependencies`: absent
  - Zero external runtime dependencies.
- **TypeScript Boundary Contract (`packages/solvers/tsconfig.json`):**
  - `extends`: `"../../tsconfig.base.json"`
  - `lib`: `["ES2022"]`
  - `types`: `[]` (No DOM).
- **Public Export Boundary:** Dense rank/unrank functions remain internal to `packages/solvers` and are not exported from `packages/solvers/src/index.ts`.

### 9.2. Phase 4B: BFS & Bidirectional BFS Exact Solvers
- **Objective:** Implement pure BFS and Bidirectional BFS solvers with complete-layer expansion, provable lower-bound stopping rule, deterministic tie-breaking, and exact depth 1..8 optimality tests.
- **Allowed Files:**
  - `packages/solvers/src/bfs.ts`
  - `packages/solvers/src/bidirectional-bfs.ts`
  - `packages/solvers/src/index.ts`
  - `packages/solvers/tests/bfs.test.ts`
  - `packages/solvers/tests/bidirectional-bfs.test.ts`
  - `packages/solvers/tests/optimality.test.ts`
  - `docs/development/PHASE_4_IMPLEMENTATION_PLAN.md` (optional doc sync)
  - `docs/development/ROADMAP.md` (optional doc sync)
  - `docs/development/TEST_STRATEGY.md` (optional doc sync)
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
  - `docs/development/PHASE_4_IMPLEMENTATION_PLAN.md` (optional doc sync)
  - `docs/development/ROADMAP.md` (optional doc sync)
  - `docs/development/TEST_STRATEGY.md` (optional doc sync)
- **Acceptance Gate:** Admissibility proof verified across state domain ($0 \le h(s) \le d^*(s)$); IDA* finds optimal solutions for depth 1..8 fixtures.

### 9.4. Phase 4D: Web Worker Infrastructure & Protocol
- **Objective:** Add `@gearcube/solvers` dependency to `@gearcube/web`, implement browser Worker entry adapter (`apps/web/src/workers/solver.worker.ts`), create pure framework-independent Worker controller (`solver-worker-controller.ts`) with unit tests, build `useSolverWorker` lifecycle hook, and extend boundary test.
- **Allowed Files:**
  - `apps/web/package.json`
  - `apps/web/src/workers/solver.worker.ts`
  - `apps/web/src/components/solver/solver-worker-controller.ts`
  - `apps/web/src/components/solver/solver-worker-controller.test.ts`
  - `apps/web/src/hooks/useSolverWorker.ts`
  - `tests/boundary.test.ts`
  - `package-lock.json`
  - `docs/development/PHASE_4_IMPLEMENTATION_PLAN.md` (optional doc sync)
  - `docs/development/ROADMAP.md` (optional doc sync)
  - `docs/development/TEST_STRATEGY.md` (optional doc sync)
- **Acceptance Gate (Non-Browser Evidence):**
  - `@gearcube/web` typecheck and production build pass with Worker entry compiled.
  - Pure `solver-worker-controller` unit tests pass in Node Vitest.
  - Protocol, `requestId` tracking, stale message rejection, and terminal state transition tests pass.
  - Source review confirms Worker construction and termination ownership is cleanly isolated behind `useSolverWorker`.
  - Root package boundary test passes.
  - No direct synchronous `@gearcube/solvers` search invocation exists in UI main-thread application code.
- **Browser Worker Execution Ownership:** `REAL_BROWSER_WORKER_EXECUTION_ACCEPTANCE: DEFERRED_TO_PHASE_4E_PLAYWRIGHT`.

### 9.5. Phase 4E: Solve Mode UI, Playback & Playwright Browser Acceptance
- **Objective:** Implement SolvePanel UI, pure playback controller (`playback-controller.ts`) with unit tests, solution playback orchestration in `GearCubeViewport`, and automated Playwright E2E tests validating real Worker isolation, main-thread actionability, and solution playback.
- **Allowed Files:**
  - `apps/web/src/components/solver/SolvePanel.tsx`
  - `apps/web/src/components/solver/PlaybackControls.tsx`
  - `apps/web/src/components/solver/playback-controller.ts`
  - `apps/web/src/components/solver/playback-controller.test.ts`
  - `apps/web/src/components/canvas/GearCubeViewport.tsx`
  - `apps/web/src/App.css`
  - `tests/e2e/solve-mode.spec.ts`
  - `docs/development/PHASE_4_IMPLEMENTATION_PLAN.md` (optional doc sync)
  - `docs/development/ROADMAP.md` (optional doc sync)
  - `docs/development/TEST_STRATEGY.md` (optional doc sync)
- **Acceptance Gate:** 100% passing Playwright E2E suite; `WORKER_EXECUTION_GATE`, `MAIN_THREAD_ACTIONABILITY_GATE`, and `PLAYBACK_GATE` pass in Chromium; zero console errors.

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
- **Node Vitest (`*.test.ts`):** Pure unit tests, state-index bijection tests, search algorithm optimality tests, worker controller state reducers (`solver-worker-controller.test.ts`), and playback controller tests (`playback-controller.test.ts`). (No React `.test.tsx`, no DOM, no JSDOM).
- **Playwright Chromium E2E (`tests/e2e/solve-mode.spec.ts`):** Real browser tests covering:
  1. **`WORKER_EXECUTION_GATE`:** Proves production solve executes inside a real background Web Worker.
  2. **`MAIN_THREAD_ACTIONABILITY_GATE`:** Proves main thread processes DOM clicks and camera interactions immediately after starting a solve without freezing.
  3. **`PLAYBACK_GATE`:** Proves solution playback completes moves and advances history accurately in both `TWO_STEP` and `DIRECT_180` modes.
  4. **`STALE_RESULT_GATE`:** Proves that modifying the cube during search terminates the worker and prevents stale solution application.

---

## 11. Implementation Stop Conditions

Implementation must STOP and request independent contract review if any of the following conditions arise:
1. **Preflight Unapproved:** Phase 4 preflight is not independently accepted and promoted to `main`.
2. **Core Mutation Blocker:** Any requirement arises to modify or extend `@gearcube/core` APIs or domain representations.
3. **Purity Violation:** Any solver module requires an import from `@gearcube/kinematics`, `apps/web`, `React`, `Three.js`, or browser globals.
4. **External Dependency Requirement:** Any requirement arises to install an external runtime package for queues, heuristics, or workers.
5. **Worker Integration Blocker:** Browser Worker integration requires `SharedArrayBuffer`, `Atomics`, cross-origin isolation headers, or global Vite architecture overhauls.
6. **BiBFS Proof Inconsistency:** Implementation analysis discovers an edge case where the lower-bound stopping rule violates the unit-cost shortest-path invariant.
7. **Phase 4C Unapproved Execution:** Commencing Phase 4C implementation before its dedicated heuristic preflight is independently accepted.
8. **Duplicate Puzzle Authority:** Solution playback requires maintaining an independent 3D or kinematic authority outside `PlayApplicationState`.
9. **Worker Isolation Test Failure:** Playwright cannot verify off-main-thread Worker execution in Chromium.

---

## 12. Decisions & Status Summary

- **`PHASE4_PREFLIGHT_STATUS`:** `ACCEPTED`.
- **`PHASE4_PREFLIGHT_ACCEPTED`:** `YES`.
- **`PHASE4_PREFLIGHT_ACCEPTED_HEAD`:** `996825befc021d322bf353f06347a7e09375af40`.
- **`PHASE4_STATUS`:** `IMPLEMENTATION_STARTED / PHASE4A_ACCEPTED / PHASE4B_CANDIDATE_READY_FOR_INDEPENDENT_ACCEPTANCE`.
- **`PHASE4_STARTED`:** `YES`.
- **`PHASE4_ACCEPTED`:** `NO`.
- **`PHASE4_OVERALL_COMPLETE`:** `NO`.
- **`PHASE4A_STATUS`:** `COMPLETED / ACCEPTED`.
- **`PHASE4A_ACCEPTED`:** `YES`.
- **`PHASE4A_ACCEPTED_HEAD`:** `392bd80c48ff79b5777076371dfd54f693d57941`.
- **`PHASE4B_STATUS`:** `IMPLEMENTED / READY_FOR_INDEPENDENT_ACCEPTANCE`.
- **`PHASE4B_ACCEPTED`:** `NO`.
- **`PHASE4C_STATUS`:** `PLANNED / BLOCKED_BY_PHASE4B_ACCEPTANCE_AND_DEDICATED_HEURISTIC_PREFLIGHT`.
- **`PHASE4D_STATUS`:** `PLANNED / BLOCKED_BY_PRIOR_SUBPHASES`.
- **`PHASE4E_STATUS`:** `PLANNED / BLOCKED_BY_PRIOR_SUBPHASES`.
- **`ACTIVE_SEARCH_INTENT_CANCELLATION`:** `FROZEN` (Immediate termination on any canonical action before dispatch).
- **`SEARCH_RESULT_REQUIRES_CURRENT_REQUEST`:** `YES`.
- **`SEARCH_RESULT_REQUIRES_SESSION_IDLE`:** `YES`.
- **`SEARCH_RESULT_REQUIRES_START_STATE_KEY`:** `YES`.
- **`PLAYBACK_SELF_INVALIDATES_SOLUTION`:** `NO`.
- **`PLAYBACK_EXPECTED_PREFIX_GUARD`:** `FROZEN` (`expectedStateKeys[0..moves.length]`).
- **`INTERNAL_PLAYBACK_ACTION_ORIGIN`:** `DISTINGUISHED_FROM_EXTERNAL_USER_ACTION`.
- **`EXTERNAL_UNDO_REDO_BACK_BASELINE_INVALIDATES_PLAYBACK`:** `YES`.
- **`MODE_CHANGE_INVALIDATES_SOLUTION`:** `NO_IF_STATE_UNCHANGED`.
- **`WORKER_TERMINAL_DISPOSAL`:** `FROZEN` (Terminate/dispose upon terminal message or cancellation).
- **`REQUEST_ID_POLICY`:** `MONOTONIC` (Session-local monotonic integer counter).
- **`BIBFS_FIRST_INTERSECTION_RETURN`:** `FORBIDDEN`.
- **`BIBFS_COMPLETE_LAYER_EXPANSION`:** `YES`.
- **`BIBFS_OPTIMAL_STOP_RULE`:** `nextForwardDepth + nextBackwardDepth >= bestDepth`.
- **`BIBFS_MEETING_TIE_RULE`:** Lowest dense meeting rank `min(rankState(m))`.
- **`MAX_NODES_SEMANTICS`:** `FROZEN` (Stop before expanding non-goal node if `nodesExpanded === maxNodes`).
- **`MAX_DEPTH_ZERO_ALLOWED`:** `YES` (Solved returns 0, non-solved returns `LIMIT_REACHED`).
- **`BFS_MAX_DEPTH_SEMANTICS`:** `FROZEN` (Depth $== \text{maxDepth}$ goal-tested only, no child generation).
- **`BIBFS_MAX_DEPTH_SEMANTICS`:** `FROZEN` (Total solution length bound).
- **`PROGRESS_INTERVAL_BASIS`:** `nodesExpanded`.
- **`ALGORITHM_SPECIFIC_DEPTH_TELEMETRY`:** `FROZEN` (BFS `frontierDepth`, BiBFS `forwardDepth`/`backwardDepth`/`bestSolutionDepth`, IDA* `threshold`/`currentDepth`).
- **`SOLVER_CLOCK_DOM_DEPENDENCY`:** `NONE` (Standard ES2022 `Date.now()`, observational only).
- **`UNSUPPORTED_TOTAL_HEAP_CLAIM`:** `REMOVED`.
- **`SYSTEM_ARCHITECTURE_WORKER_OWNER`:** `apps/web adapter -> packages/solvers`.
- **`SYSTEM_ARCHITECTURE_SOLVER_PACKAGE_IS_WORKER`:** `NO`.
- **`PROJECT_BLUEPRINT_TELEMETRY_SYNC`:** `PASS`.
- **`PHASE4_10M_NODE_REQUIREMENT_IS_CORRECTNESS_GATE`:** `NO` (Future Phase 5 benchmark target).
- **`SOLVER_BOUNDARY_EXECUTABLE_GATE`:** `FROZEN` (`tests/boundary.test.ts` in Phase 4A).
- **`ROOT_BOUNDARY_TEST_PHASE4A_SCOPE`:** `YES`.
- **`NODE_VITEST_REACT_HOOK_MOUNT_PLANNED`:** `NO`.
- **`PURE_WORKER_CONTROLLER_TEST`:** `PLANNED` (`solver-worker-controller.test.ts`).
- **`PURE_PLAYBACK_CONTROLLER_TEST`:** `PLANNED` (`playback-controller.test.ts`).
- **`COMMON_SUBPHASE_DOC_SYNC_FILES`:** `FROZEN` (`PHASE_4_IMPLEMENTATION_PLAN.md`, `ROADMAP.md`, `TEST_STRATEGY.md`).
- **`ROADMAP_SOLVER_FILENAMES_SYNC`:** `PASS`.
- **`PHASE4_NEW_RUNTIME_DEPENDENCY_REQUIRED`:** `NO_EXTERNAL_RUNTIME_DEPENDENCY`.
- **`PHASE4_NEW_ADR_REQUIRED`:** `NO` (Natural architectural elaboration of existing accepted boundaries).
- **`IMPLEMENTATION_STOP_CONDITIONS`:** `FROZEN`.
