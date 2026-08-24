# Phase 4 Implementation Plan — Classical Solver Infrastructure

> **Phase Status:** `IMPLEMENTATION_STARTED / PHASE4A_ACCEPTED / PHASE4B_ACCEPTED / PHASE4C_ACCEPTED / PHASE4D_ACCEPTED / PHASE4E_IMPLEMENTATION_UNBLOCKED`
> **Preflight Status:** `ACCEPTED`
> **Preflight Accepted Head:** `996825befc021d322bf353f06347a7e09375af40`
> **Phase 4 Started:** `YES`
> **Phase 4 Accepted:** `NO`
> **Phase 4 Overall Complete:** `NO`
> **Phase 4A Status:** `COMPLETED / ACCEPTED`
> **Phase 4A Accepted:** `YES`
> **Phase 4A Accepted Head:** `392bd80c48ff79b5777076371dfd54f693d57941`
> **Phase 4B Status:** `COMPLETED / ACCEPTED`
> **Phase 4B Accepted:** `YES`
> **Phase 4B Accepted Head:** `c96fc47b185655a4b2b2372015b8903f72960d62`
> **Phase 4C Heuristic Preflight:** `COMPLETED / ACCEPTED`
> **Phase 4C Heuristic Preflight Accepted:** `YES`
> **Phase 4C Heuristic Preflight Accepted Head:** `cfaa86961c53cdfb6541479858cd572165df87d4`
> **Phase 4C Status:** `COMPLETED / ACCEPTED`
> **Phase 4C Accepted:** `YES`
> **Phase 4C Accepted Head:** `f39542be6054557c9542efd072f5aa7f253a9cc8`
> **Phase 4D Status:** `COMPLETED / ACCEPTED`
> **Phase 4D Accepted:** `YES`
> **Phase 4D Accepted Head:** `d12066a8980753da7b6150e89ab3b67b3021ce46`
> **Phase 4E Status:** `PLANNED / IMPLEMENTATION_UNBLOCKED / NOT STARTED`
> **Authoritative Main Baseline:** `2a9913770cfb858f1e8b470766a771f37e33f736` (Commit `Record Phase 4C acceptance` on `main`)
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

## 7. Phase 4C Dedicated Heuristic Preflight & IDA* Search Contract

### 7.1. Empirical Candidate Evaluation, Index Layout & Decoding
For heuristic evaluation, define the canonical slice coordinate index mapping:
$$\text{sliceIndex}(\text{slice}) = \text{slice.permutationClass} \cdot 3 + \text{slice.phase} \quad \in [0 \dots 11]$$
Let canonical state coordinates be $C \in [0 \dots 23]$ (corner configuration), and $X, Y, Z \in [0 \dots 11]$ (slice coordinates for $X, Y, Z$ edge rings).

#### Abstract Slice Coordinate Decoding
Given an abstract slice coordinate index $q \in [0 \dots 11]$, the exact canonical slice properties are uniquely reconstructed by:
$$\text{permutationClass} = \lfloor q / 3 \rfloor \in [0 \dots 3], \quad \text{phase} = (q \bmod 3) \in [0 \dots 2]$$

#### Frozen Dense PDB Table Index Mappings
The exact dense integer table indices for the two-slice abstract projection tables are frozen as:
$$\text{indexCXY}(C, X, Y) = (C \cdot 12 + X) \cdot 12 + Y \quad \in [0 \dots 3455]$$
$$\text{indexCXZ}(C, X, Z) = (C \cdot 12 + X) \cdot 12 + Z \quad \in [0 \dots 3455]$$
$$\text{indexCYZ}(C, Y, Z) = (C \cdot 12 + Y) \cdot 12 + Z \quad \in [0 \dots 3455]$$
Each table index maps bijectively to the contiguous range $[0 \dots 3455]$ ($3 \times 3,456 = 10,368$ total raw entries). Full-state rank ($[0 \dots 41471]$) is strictly prohibited as a PDB table index.

#### Evaluated Heuristic Candidates
Four candidate configurations were empirically evaluated across the entire 41,472-state canonical domain:
1. **$H_0$ (Blind Baseline):** $h_0(S) = 0$.
2. **$H_1$ (Single-Slice Projection Max PDB):** Computes exact abstract shortest distances over 3 single-slice abstract spaces:
   - $CX = (C, X)$ ($24 \times 12 = 288$ abstract states)
   - $CY = (C, Y)$ ($24 \times 12 = 288$ abstract states)
   - $CZ = (C, Z)$ ($24 \times 12 = 288$ abstract states)
   $$H_1(S) = \max\left(d_{CX}(C, X), \; d_{CY}(C, Y), \; d_{CZ}(C, Z)\right)$$
3. **$H_2$ (Two-Slice Projection Max PDB) [SELECTED]:** Computes exact abstract shortest distances over 3 two-slice abstract spaces:
   - $CXY = (C, X, Y)$ ($24 \times 12 \times 12 = 3,456$ abstract states)
   - $CXZ = (C, X, Z)$ ($24 \times 12 \times 12 = 3,456$ abstract states)
   - $CYZ = (C, Y, Z)$ ($24 \times 12 \times 12 = 3,456$ abstract states)
   $$H_2(S) = \max\left(d_{CXY}(C, X, Y), \; d_{CXZ}(C, X, Z), \; d_{CYZ}(C, Y, Z)\right)$$
4. **$H_{\text{EXACT}}$ (Test-Only Exact Oracle):** $d^*(S)$ from `packages/solvers/tests/exact-distance-oracle.ts` (analysis truth only; strictly forbidden in production).

### 7.2. Abstract Transition Closure & Concrete Representative Construction
For each projection $P \in \{CX, CY, CZ, CXY, CXZ, CYZ\}$, every canonical transition $(S, M)$ across all 41,472 states and all 12 directed moves in `ALL_MOVES` (497,664 directed edges) was evaluated to verify whether $P(\text{applyMove}(S, M))$ is uniquely determined solely by $(P(S), M)$.

| Abstract Projection | State Space | Directed Transitions Checked | Closure Mismatches | Quotient Transition-Closed? |
| :--- | :--- | :--- | :--- | :--- |
| **$CX$** | 288 | 497,664 | **0** | **YES** |
| **$CY$** | 288 | 497,664 | **0** | **YES** |
| **$CZ$** | 288 | 497,664 | **0** | **YES** |
| **$CXY$** | 3,456 | 497,664 | **0** | **YES** |
| **$CXZ$** | 3,456 | 497,664 | **0** | **YES** |
| **$CYZ$** | 3,456 | 497,664 | **0** | **YES** |

#### Frozen Concrete Representative State Construction
Because exhaustive projection closure is proven across all 497,664 transitions, omitted coordinates do not affect the projected successor. Representative states are frozen deterministically:
- **For $CXY(C, X, Y)$:**
  - `cornerConfiguration = C`
  - `sliceX = decode(X)`
  - `sliceY = decode(Y)`
  - `sliceZ = { permutationClass: 0, phase: 0 }` (solved slice)
- **For $CXZ(C, X, Z)$:**
  - `cornerConfiguration = C`
  - `sliceX = decode(X)`
  - `sliceY = { permutationClass: 0, phase: 0 }` (solved slice)
  - `sliceZ = decode(Z)`
- **For $CYZ(C, Y, Z)$:**
  - `cornerConfiguration = C`
  - `sliceX = { permutationClass: 0, phase: 0 }` (solved slice)
  - `sliceY = decode(Y)`
  - `sliceZ = decode(Z)`

For any abstract state $A$ and directed move $M \in \text{ALL\_MOVES}$:
$$\text{abstractSuccessor}(A, M) = \text{project}(\text{applyMove}(\text{representative}(A), M))$$
*Validity Proof:* This construction is mathematically valid because exhaustive projection closure proved that the projected successor is strictly independent of the omitted coordinates. Representative choices are not left implementation-defined.

### 7.3. Quotient Reversibility & Forward BFS Distance-to-Goal Proof
In classical pattern databases, the goal is to compute the heuristic shortest-path distance from an arbitrary abstract state $A$ to the projected solved state $\text{projectedSolved}$.

1. **Move Invertibility:** Every canonical directed move $M = (F, D)$ in `ALL_MOVES` has an exact inverse move $\text{inverseMove}(M) = (F, \text{opposite}(D))$ that also belongs to `ALL_MOVES`.
2. **Edge Symmetry:** For every concrete state transition $s \xrightarrow{M} t$, the reverse transition $t \xrightarrow{\text{inverseMove}(M)} s$ is a valid directed edge with identical unit cost ($1$).
3. **Quotient Graph Reversibility:** Because projection closure preserves concrete transition algebra, for every abstract edge $u \xrightarrow{M} v$ in the quotient graph, there exists the reverse abstract edge $v \xrightarrow{\text{inverseMove}(M)} u$. Thus, the $CXY, CXZ, CYZ$ quotient transition graphs are reversible.
4. **Distance Equivalence:**
   $$\text{distance}(\text{projectedSolved}, A) = \text{distance}(A, \text{projectedSolved})$$
5. **Conclusion:** A deterministic forward BFS rooted at $\text{projectedSolved}$ (with distance initialized to $0$) computes the exact shortest distance to the goal for all reachable abstract states without double-inversion ambiguity or unstated symmetry assumptions.

### 7.4. PDB Storage, Sentinel & Complete Reachability
- **Storage Type:** Three typed arrays `new Int8Array(3456)` corresponding to tables $CXY, CXZ, CYZ$.
- **Initialization:** `table.fill(-1)`.
- **Sentinel Value:** `-1` strictly represents an unvisited / undiscovered abstract state. (Int8 default `0` must NOT be used as an unvisited sentinel, as distance `0` is reserved for $\text{projectedSolved}$).
- **BFS Seed:** `table[index(projectedSolved)] = 0`.
- **Value Range:** All reachable entries contain distances in $[0 \dots 7]$.
- **Post-Construction Verification Invariants:**
  - `CXY_REACHABLE`: Exactly $3,456 / 3,456$ ($100\%$).
  - `CXZ_REACHABLE`: Exactly $3,456 / 3,456$ ($100\%$).
  - `CYZ_REACHABLE`: Exactly $3,456 / 3,456$ ($100\%$).
  - `UNINITIALIZED_ENTRIES`: Exactly $0$.
  - `TABLE_MIN`: $0$.
  - `TABLE_MAX`: $7$.
- **Full Reachability Rationale:** The accepted canonical domain is the complete reachable Cartesian domain ($24 \times 12 \times 12 \times 12 = 41,472$), and every abstract tuple is the projection of at least one reachable canonical state. Therefore, all $3,456$ abstract states in each table are reachable.

### 7.5. Empirical Results & Dominance Analysis
The empirical evaluation over all 41,472 canonical states and 497,664 directed transitions yielded the following verified deterministic metrics:

| Metric | $H_0$ (Blind) | $H_1$ (1-Slice Max) | $H_2$ (2-Slice Max) [SELECTED] | $H_{\text{EXACT}}$ [REFERENCE ONLY] |
| :--- | :--- | :--- | :--- | :--- |
| **Abstract Spaces & Dimensions** | None | $CX(288), CY(288), CZ(288)$ | $CXY(3456), CXZ(3456), CYZ(3456)$ | Full Canonical ($41,472$) |
| **Raw Entry Count** | 0 | 864 | **10,368** | 41,472 |
| **Raw Memory Footprint** | 0 B | 864 B | **10,368 B ($\approx 10.1\text{ KB}$)** | 41,472 B ($\approx 41.5\text{ KB}$) |
| **Projection Closure Mismatches** | 0 | 0 / 497,664 | **0 / 497,664** | N/A |
| **Abstract Table Reachable Count** | N/A | $CX: 288/288, CY: 288/288, CZ: 288/288$ | **$CXY: 3456/3456, CXZ: 3456/3456, CYZ: 3456/3456$** | 41,472 / 41,472 |
| **Abstract Table Diameters** | 0 | $CX: 6, CY: 6, CZ: 6$ | **$CXY: 7, CXZ: 7, CYZ: 7$** | 8 |
| **Admissibility Gate ($0 \le h \le d^*$)** | 41,472 / 41,472 | 41,472 / 41,472 (0 over) | **41,472 / 41,472 (0 over)** | 41,472 / 41,472 |
| **Consistency Gate ($h(u) \le 1 + h(v)$)** | 497,664 / 497,664 | 497,664 / 497,664 | **497,664 / 497,664** | 497,664 / 497,664 |
| **Min $h$** | 0 | 0 | **0** | 0 |
| **Max $h$** | 0 | 6 | **7** | 8 |
| **Mean $h$** | 0.0000 | 4.5413 | **5.2717** | 5.6742 |
| **Exact Match Count & Rate** | 1 (0.002%) | 18,840 (45.43%) | **33,124 (79.87%)** | 41,472 (100.0%) |
| **Mean Residual ($d^* - h$)** | 5.6742 | 1.1329 | **0.4026** | 0.0000 |
| **Max Residual** | 8 | 4 | **2** | 0 |
| **Zero on Non-Goal Count** | 41,471 | 0 | **0** | 0 |
| **Dominance ($H_2 \ge H_1$)** | N/A | Reference | **41,472 / 41,472 (100.0%)** | Dominates all |
| **Strict Improvement ($H_2 > H_1$)**| N/A | Reference | **15,144 / 41,472 (36.52%)** | N/A |
| **Reversals ($H_1 > H_2$)** | N/A | Reference | **0 / 41,472 (0.0%)** | N/A |

#### Depth Histogram Breakdown
| Exact Depth ($d^*$) | State Count | Mean $H_1$ | Mean $H_2$ | Exact Matches $H_1$ | Exact Matches $H_2$ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **$0$** | 1 | 0.0000 | **0.0000** | 1 | **1** |
| **$1$** | 12 | 1.0000 | **1.0000** | 12 | **12** |
| **$2$** | 111 | 2.0000 | **2.0000** | 111 | **111** |
| **$3$** | 822 | 3.0000 | **3.0000** | 822 | **822** |
| **$4$** | 3,863 | 3.9612 | **4.0000** | 3,788 | **3,863** |
| **$5$** | 11,706 | 4.8196 | **5.0000** | 10,650 | **11,706** |
| **$6$** | 16,410 | 4.4060 | **5.9848** | 3,456 | **16,285** |
| **$7$** | 8,196 | 4.9063 | **5.0791** | 0 | **324** |
| **$8$** | 351 | 4.0000 | **6.0000** | 0 | **0** |

#### Informational Scratch IDA* Expansions (Fixtures 1..8)
| Fixture Distance ($d^*$) | $H_1$ Nodes Expanded | $H_2$ Nodes Expanded [SELECTED] | Expansion Reduction Factor |
| :--- | :--- | :--- | :--- |
| **$d = 1$** | 1 | **1** | $1.0\times$ |
| **$d = 2$** | 2 | **2** | $1.0\times$ |
| **$d = 3$** | 3 | **3** | $1.0\times$ |
| **$d = 4$** | 4 | **4** | $1.0\times$ |
| **$d = 5$** | 6 | **5** | $1.2\times$ |
| **$d = 6$** | 14 | **6** | $2.3\times$ |
| **$d = 7$** | 72 | **8** | $9.0\times$ |
| **$d = 8$** | 209 | **21** | **$10.0\times$** |

### 7.6. Selected Production Heuristic Architecture & PDB Initialization
- **Selected Candidate:** **$H_2$ (Two-Slice Projection Max PDB)**.
- **Production Source File:** `packages/solvers/src/heuristics.ts`.
- **Function Signature:** `estimateIdaStarHeuristic(state: GearCubeState): number`.
- **Visibility:** PACKAGE-INTERNAL only. It is **NOT** exported from `packages/solvers/src/index.ts`.
- **PDB Construction Strategy:** Module-load initialization builds three `Int8Array` tables of length 3,456 each via deterministic BFS over the closed quotient transitions using `@gearcube/core` transitions and `SOLVED_GEAR_CUBE_STATE`.
- **PDB Isolation & Counter Ownership:** PDB construction occurs outside IDA* search execution. PDB preparation transitions must **NOT** increment `nodesExpanded` or `nodesGenerated`.
- **PDB Caching & Lookup:** PDB tables are constructed and cached at module load. Heuristic lookup `estimateIdaStarHeuristic(state)` performs purely 3 array index lookups and a 3-way `Math.max` operation with zero oracle, network, or external runtime dependencies.

### 7.7. IDA* Algorithm & Search Execution Contract
- **Function Signature:** `solveIdaStar(state: GearCubeState, options?: SolverOptions): SolveResult`.
- **Public Export:** Exported from `packages/solvers/src/index.ts` alongside `solveBfs` and `solveBidirectionalBfs`.
- **Canonical Move Cost:** 1 per directed move in `ALL_MOVES`.
- **Deterministic Successor Order:** `ALL_MOVES` canonical index order.
- **Start Threshold:** `estimateIdaStarHeuristic(start)`.
- **Threshold Sequence:** Next threshold is the minimum $f$-cost ($f = g + h$) among all explored nodes that exceeded the current threshold bound.
- **Path Cycle Policy:** Memory-bounded DFS path set (`currentPathRanks: Set<number>` or boolean array over $0 \dots 41471$). Cycles on the current path are pruned without generating children. No global closed set.
- **Search Counters:**
  - `nodesExpanded`: Increments once per non-goal node whose 12 legal successors are enumerated via `applyMove`. Expansions in successive threshold iterations count cumulatively.
  - `nodesGenerated`: Increments once per candidate state produced by `applyMove` (exactly 12 per expansion).
  - Counters are cumulative across all threshold iterations for a single `solveIdaStar` invocation.
- **Search Limit Semantics:**
  - `maxNodes`: Aggregate expansion budget. If `nodesExpanded === maxNodes` before expanding another non-goal node, search terminates immediately with `LIMIT_REACHED ('MAX_NODES')`.
  - `maxDepth`: Total solution depth bound. If $h(\text{start}) > \text{maxDepth}$ or next threshold exceeds `maxDepth`, search returns `LIMIT_REACHED ('MAX_DEPTH')` without beginning the iteration. At DFS depth $g == \text{maxDepth}$, nodes are goal-tested but not expanded.
- **Progress Telemetry:** Emits `SearchTelemetry` variant `algorithm: 'IDA_STAR'` on exact multiples of `progressIntervalNodes` expanded nodes with fields: `nodesExpanded`, `nodesGenerated`, `elapsedMs`, `threshold`, and `currentDepth`.
- **Optimality Invariant:** For all start states, returned solution depth matches the proven optimal shortest-path distance ($d \in [1 \dots 8]$).

### 7.8. Explicit Prohibitions for Phase 4C
1. **No Exact Distance Oracle Import:** `heuristics.ts` and `ida-star.ts` must NOT import `buildExactDistanceOracle()` or test fixtures.
2. **No Full 41,472-State PDB:** Production code must NOT embed or construct a full 41,472-entry exact distance table.
3. **No BFS/BiBFS Fallback:** IDA* must NOT invoke BFS or BiBFS to compute heuristic values or fall back on search failure.
4. **No Public Heuristic Export:** `estimateIdaStarHeuristic` must remain strictly internal to `@gearcube/solvers`.

---

## 8. Web Worker Architecture & Protocol

### 8.1. Worker Lifecycle: Single Worker per Active Search
- **One Active Worker Instance:** Each active search job runs in its own Worker instance.
- **Request IDs:** Generated via a session-local monotonic counter converted to string (`"1"`, `"2"`, `"3"`, ...; no UUID dependency).
- **Cancellation & Supersession:** When the user cancels a search or alters the puzzle state, the main thread invokes `worker.terminate()`, invalidates the active `requestId`, and clears the active Worker reference.
- **Terminal Disposal:** When a terminal result (`SEARCH_COMPLETE`, `SEARCH_LIMIT_REACHED`, `SEARCH_ERROR`) is processed, the Worker instance is immediately terminated/disposed and its reference cleared. No idle completed Worker remains retained.
- **Stale Message Protection:** Queued or in-flight messages from a terminated Worker are discarded unless their `requestId` matches the current active search.

### 8.2. Message Protocol (Zero Status Duplication)
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

## 9. Solve Mode UI, Playback & Lifecycle Separation

### 9.1. Separation of Active Search vs Accepted Playback Lifecycles
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

### 9.2. Playback Expected-Prefix State Guard
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

### 9.3. Playback Authority & Step-Backward State Machine
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

## 10. Implementation Subphases & Dependency Gates

### 10.1. Phase 4A: Solver Package Bootstrap & Common Contracts
- **Objective:** Workspace bootstrap `@gearcube/solvers`, algorithm-neutral contracts, internal rank/unrank, inverseMove helper, test-only exact-distance oracle, exact distance fixtures 1..8, and executable package-boundary test.
- **Status:** **COMPLETED / ACCEPTED**.
- **Accepted Head:** `392bd80c48ff79b5777076371dfd54f693d57941`.

### 10.2. Phase 4B: BFS & Bidirectional BFS Exact Solvers
- **Objective:** Implement exact BFS and BiBFS solvers with deterministic reconstruction, search limits (`maxNodes`, `maxDepth`), progress telemetry, and depth 1..8 optimality verification.
- **Status:** **COMPLETED / ACCEPTED**.
- **Accepted Head:** `c96fc47b185655a4b2b2372015b8903f72960d62`.

### 10.3. Phase 4C: IDA* Search & Admissible Heuristic
- **Objective:** Following the independently accepted Phase 4C heuristic preflight, implement memory-bounded IDA* search and admissible heuristic estimator.
- **Preflight Status:** **COMPLETED / ACCEPTED**.
- **Preflight Accepted Head:** `cfaa86961c53cdfb6541479858cd572165df87d4`.
- **Status:** **COMPLETED / ACCEPTED**.
- **Accepted Head:** `f39542be6054557c9542efd072f5aa7f253a9cc8`.
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

### 10.4. Phase 4D: Web Worker Infrastructure & Protocol
- **Objective:** Add `@gearcube/solvers` dependency to `@gearcube/web`, implement browser Worker entry adapter (`apps/web/src/workers/solver.worker.ts`), create pure framework-independent Worker controller (`solver-worker-controller.ts`) with unit tests, build `useSolverWorker` lifecycle hook, and extend boundary test.
- **Status:** **COMPLETED / ACCEPTED**.
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

### 10.5. Phase 4E: Solve Mode UI, Playback & Playwright Browser Acceptance
- **Objective:** Implement SolvePanel UI, pure playback controller (`playback-controller.ts`) with unit tests, solution playback orchestration in `GearCubeViewport`, and automated Playwright E2E tests validating real Worker isolation, main-thread actionability, and solution playback.
- **Status:** **PLANNED / IMPLEMENTATION_UNBLOCKED / NOT STARTED**.
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

## 11. Test Strategy & Ground-Truth Oracle

### 11.1. Test-Only Exact Distance Oracle & Fixtures
- **Test-Only Oracle (`packages/solvers/tests/exact-distance-oracle.ts`):**
  - Imports `@gearcube/core` only (zero production solver imports).
  - Performs simple exhaustive BFS from solved state to build an exact shortest-path depth lookup table across all 41,472 states.
  - Used exclusively by tests to construct deterministic fixtures (`packages/solvers/tests/fixtures.ts`) for each distance $d \in [1 \dots 8]$.
- **Test Invariant:** For each depth $d \in [1 \dots 8]$, fixtures verify:
  1. $\text{length}(\text{BFS}(\text{state})) = d$
  2. $\text{length}(\text{BiBFS}(\text{state})) = d$
  3. $\text{length}(\text{IDA*}(\text{state})) = d$ (when Phase 4C heuristic is accepted)
  4. Applying returned move sequence to `state` produces `isSolved(result) === true`.

### 11.2. Vitest vs Playwright Test Boundaries
- **Node Vitest (`*.test.ts`):** Pure unit tests, state-index bijection tests, search algorithm optimality tests, worker controller state reducers (`solver-worker-controller.test.ts`), and playback controller tests (`playback-controller.test.ts`). (No React `.test.tsx`, no DOM, no JSDOM).
- **Playwright Chromium E2E (`tests/e2e/solve-mode.spec.ts`):** Real browser tests covering:
  1. **`WORKER_EXECUTION_GATE`:** Proves production solve executes inside a real background Web Worker.
  2. **`MAIN_THREAD_ACTIONABILITY_GATE`:** Proves main thread processes DOM clicks and camera interactions immediately after starting a solve without freezing.
  3. **`PLAYBACK_GATE`:** Proves solution playback completes moves and advances history accurately in both `TWO_STEP` and `DIRECT_180` modes.
  4. **`STALE_RESULT_GATE`:** Proves that modifying the cube during search terminates the worker and prevents stale solution application.

---

## 12. Implementation Stop Conditions

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

## 13. Decisions & Status Summary

- **`PHASE4_PREFLIGHT_STATUS`:** `ACCEPTED`.
- **`PHASE4_PREFLIGHT_ACCEPTED`:** `YES`.
- **`PHASE4_PREFLIGHT_ACCEPTED_HEAD`:** `996825befc021d322bf353f06347a7e09375af40`.
- **`PHASE4_STATUS`:** `IMPLEMENTATION_STARTED / PHASE4A_ACCEPTED / PHASE4B_ACCEPTED / PHASE4C_ACCEPTED / PHASE4D_ACCEPTED / PHASE4E_IMPLEMENTATION_UNBLOCKED`.
- **`PHASE4_STARTED`:** `YES`.
- **`PHASE4_ACCEPTED`:** `NO`.
- **`PHASE4_OVERALL_COMPLETE`:** `NO`.
- **`PHASE4A_STATUS`:** `COMPLETED / ACCEPTED`.
- **`PHASE4A_ACCEPTED`:** `YES`.
- **`PHASE4A_ACCEPTED_HEAD`:** `392bd80c48ff79b5777076371dfd54f693d57941`.
- **`PHASE4B_STATUS`:** `COMPLETED / ACCEPTED`.
- **`PHASE4B_ACCEPTED`:** `YES`.
- **`PHASE4B_ACCEPTED_HEAD`:** `c96fc47b185655a4b2b2372015b8903f72960d62`.
- **`PHASE4C_HEURISTIC_PREFLIGHT`:** `COMPLETED / ACCEPTED`.
- **`PHASE4C_HEURISTIC_PREFLIGHT_ACCEPTED`:** `YES`.
- **`PHASE4C_HEURISTIC_PREFLIGHT_ACCEPTED_HEAD`:** `cfaa86961c53cdfb6541479858cd572165df87d4`.
- **`PHASE4C_STATUS`:** `COMPLETED / ACCEPTED`.
- **`PHASE4C_ACCEPTED`:** `YES`.
- **`PHASE4C_ACCEPTED_HEAD`:** `f39542be6054557c9542efd072f5aa7f253a9cc8`.
- **`PHASE4D_STATUS`:** `COMPLETED / ACCEPTED`.
- **`PHASE4D_ACCEPTED`:** `YES`.
- **`PHASE4D_ACCEPTED_HEAD`:** `d12066a8980753da7b6150e89ab3b67b3021ce46`.
- **`PHASE4E_STATUS`:** `PLANNED / IMPLEMENTATION_UNBLOCKED / NOT STARTED`.
- **`PHASE4C_SELECTED_HEURISTIC`:** `H2_TWO_SLICE_PDB_MAX` ($\max(d_{CXY}, d_{CXZ}, d_{CYZ})$).
- **`PHASE4C_PDB_RAW_ENTRIES`:** `10368` ($3 \times 3456$).
- **`PHASE4C_PDB_MEMORY_BYTES`:** `10368` ($\approx 10.1\text{ KB}$).
- **`PHASE4C_PDB_SENTINEL`:** `-1` (undiscovered marker; `0` reserved for projected solved).
- **`PHASE4C_PDB_UNINITIALIZED_ENTRIES`:** `0`.
- **`PHASE4C_PDB_CXY_INDEX_RANGE`:** `0..3455`.
- **`PHASE4C_PDB_CXZ_INDEX_RANGE`:** `0..3455`.
- **`PHASE4C_PDB_CYZ_INDEX_RANGE`:** `0..3455`.
- **`PHASE4C_PDB_CXY_REACHABLE`:** `3456 / 3456`.
- **`PHASE4C_PDB_CXZ_REACHABLE`:** `3456 / 3456`.
- **`PHASE4C_PDB_CYZ_REACHABLE`:** `3456 / 3456`.
- **`PHASE4C_QUOTIENT_REVERSIBILITY`:** `FROZEN` (Move invertibility and edge symmetry prove forward BFS computes distance-to-goal).
- **`PHASE4C_REPRESENTATIVE_CONSTRUCTION`:** `FROZEN` (Deterministic solved-slice padding for omitted coordinates).
- **`PHASE4C_PROJECTION_CLOSURE_MISMATCHES`:** `0 / 497664` across all 6 projections.
- **`PHASE4C_EXHAUSTIVE_ADMISSIBILITY`:** `41472 / 41472` ($0 \le h(s) \le d^*(s)$, 0 over-estimates).
- **`PHASE4C_EXHAUSTIVE_CONSISTENCY`:** `497664 / 497664` ($h(u) \le 1 + h(v)$).
- **`PHASE4C_DOMINANCE_OVER_H1`:** `41472 / 41472` ($H_2 \ge H_1$, 15,144 strictly greater, 0 reversals).
- **`PHASE4C_HEURISTIC_PUBLIC_EXPORT`:** `NO` (`estimateIdaStarHeuristic` is package-internal).
- **`PHASE4C_IDA_STAR_PUBLIC_EXPORT`:** `solveIdaStar`.
- **`PHASE4C_IDA_STAR_CYCLE_POLICY`:** `CURRENT_PATH_ONLY`.
- **`PHASE4C_IDA_STAR_MAXNODES`:** `AGGREGATE_ACROSS_ITERATIONS`.
- **`PHASE4C_IDA_STAR_MAXDEPTH`:** `TOTAL_SOLUTION_LENGTH`.
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
