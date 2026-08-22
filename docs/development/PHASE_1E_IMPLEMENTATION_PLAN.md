# PHASE_1E_IMPLEMENTATION_PLAN.md — Phase 1E Exhaustive Core Acceptance Plan

> **Document Status:** `PROPOSED` (Pending Independent Review)
> **Phase Target:** Phase 1E — Group Invariants & Exhaustive Reachable State Closure
> **Applicability:** Pure TypeScript Domain Core (`packages/core`)

---

## 1. Executive Summary & Objective

Phase 1E serves as the final exhaustive validation gate of the Pure TypeScript Domain Core (`packages/core`) before commencing Phase 2 (3D Graphics & Kinematics) and Phase 4 (Classical Solver Infrastructure).

### Primary Objectives:
1. **Exhaustive BFS Reachability Traversal:** Execute an $O(|V| + |E|)$ breadth-first search (BFS) starting from `SOLVED_GEAR_CUBE_STATE` over the canonical directed move graph to empirically prove that **exactly $41,472$ unique canonical states** are reachable from the solved state.
2. **Reachable-Set Graph Closure & Strong Connectedness:** Prove that the BFS-reachable set is 100% closed under all 12 canonical moves ($497,664 / 497,664$ transitions land within the reachable set). In conjunction with existing inverse-edge regression evidence, prove that the canonical state graph forms a single **strongly connected** component spanning the entire $41,472$-state Cartesian domain.
3. **Bijective Permutation Verification:** Prove that all 12 canonical directed moves act as true bijections (permutations in $S_{41472}$) across the 41,472 reachable states.
4. **Group Action & Structural Invariant Consolidation:** Consolidate normative physical, structural, and group invariants of the standard Gear Cube (subgroup structure, slice orbit isolation, quotiented center orientation, and SpatialFrame decoupling).
5. **Phase 1 Acceptance Sign-Off:** Establish the final executable evidence that Phase 1 Core acceptance criteria are satisfied for the frozen Standard Gear Cube MVP contract, without adding public solver APIs or core runtime dependencies.

---

## 2. Current Core Baseline & Inventory

### 2.1. Baseline Commit
- **Authoritative Baseline Commit:** `e31cd87b0db153140d9c4780ac2b7f4953d294d0` (`Complete Phase 1D frame materialization`).

### 2.2. Current Core Inventory
- **`PUBLIC_EXPORT_COUNT`:** **53 symbols** (34 runtime values/guards/functions + 19 TypeScript types) exported from `packages/core/src/index.ts`.
- **`CURRENT_TEST_FILE_COUNT`:** **9 test files** across the repository:
  1. `packages/core/tests/domain.test.ts` (Phase 1B: Cartesian 41,472 state generation & 1 solved state)
  2. `packages/core/tests/materializer.test.ts` (Phase 1D: 1,536 Model A dict, 41,472 center identities, 13 goldens, 165,888 materializations, 165,888 normalization round-trips, 1,990,656 application lifecycle transitions)
  3. `packages/core/tests/serialization.test.ts` (Phase 1D: 41,472 canonical serialization round-trips & uniqueness, grammar parsing error handling)
  4. `packages/core/tests/state.test.ts` (Phase 1B: `equalsGearCubeState`, `isSolved`, input immutability)
  5. `packages/core/tests/transitions.test.ts` (Phase 1C / ADR-0005: 248,832 U/F/R non-regression, 248,832 D/B/L oracle validation, 497,664 canonical gate, single-move goldens, commutativity, public API audit)
  6. `packages/core/tests/transitions-exhaustive.test.ts` (Phase 1C / ADR-0005: 497,664 transition closure, 497,664 direct vs independent reference oracle equivalence, 497,664 inverse round-trips, 12-repeat generator order)
  7. `packages/core/tests/types.test.ts` (Phase 1B: canonical collections, constants, counts)
  8. `packages/core/tests/validation.test.ts` (Phase 1B: type guards, range validation, exact own-key validation)
  9. `tests/boundary.test.ts` (Phase 1A: package boundaries, zero runtime dependencies, tsconfig isolation)
- **`REUSABLE_PUBLIC_FUNCTIONS`:**
  - `ALL_MOVES`: Readonly array of 12 canonical directed move objects.
  - `SOLVED_GEAR_CUBE_STATE`: Canonical solved state constant.
  - `applyMove(state, move)`: Canonical state transition operator.
  - `isGearCubeState(state)`: Exact-key structural type guard.
  - `equalsGearCubeState(a, b)`: Deep canonical state equality comparator.
  - `isSolved(state)`: Canonical solved state predicate.
  - `serializeLogicalState(state)`: Canonical string serializer.

---

## 3. Scope Boundaries: In-Scope vs. Out-of-Scope

### 3.1. In-Scope:
- Test-local BFS reachability traversal starting from `SOLVED_GEAR_CUBE_STATE`.
- Proving reachable state count is exactly $41,472 / 41,472$.
- Proving BFS queue exhausts normally via monotonic head index (`head === queue.length`).
- Proving reachable-set graph closure across all $497,664$ directed transitions.
- Proving all 12 directed moves act as bijections ($41,472 \to 41,472$) on the reachable domain.
- Deriving strong connectedness from BFS coverage + existing inverse edge regression.
- Reachable-set consistency assertions (`isGearCubeState(state) === true` and reachable solved count = 1).
- Informational recording of BFS depth distribution under the canonical directed move metric.
- Full repository regression verification (`npm run verify`: typecheck, core-dependency purity, vitest across all 10 test files, build).

### 3.2. Out-of-Scope (Strictly Prohibited in Phase 1E):
- Classical solver algorithms or public APIs (`solve()`, `bfs()`, `findSolution()`, `Solver`, `SearchNode`, `IDA*`, `Bidirectional BFS`).
- Heuristic evaluation functions or pattern databases (deferred to Phase 4 / Phase 6).
- Solution-path recording or UI playback (deferred to Phase 3 / Phase 4).
- 3D rendering, WebGL, Three.js, React, R3F, Canvas, or UI components (deferred to Phase 2 / Phase 3).
- Continuous animation timing, keyframe interpolation, or easing curves (deferred to Phase 2).
- Marked-center variants or alternative puzzle geometries (outside Standard Gear Cube MVP).
- AI, PyTorch, neural value networks, or computer vision (deferred to Phase 6 / Phase 7).
- Adding runtime dependencies to `packages/core`.
- Modifying production transition tables, types, or public API exports.

---

## 4. Architectural Boundary & Solver Separation

```text
+-------------------------------------------------------------------------+
|                              Phase 1E Core                              |
|                       (Test-Local Verification)                         |
|                                                                         |
|  +-----------------------+              +----------------------------+  |
|  |  SOLVED_GEAR_CUBE_    |              |  Canonical State Graph     |  |
|  |  STATE                |  -(apply)->  |  41,472 Reachable States   |  |
|  +-----------------------+              +----------------------------+  |
|              |                                        |                 |
|              v                                        v                 |
|  +-----------------------+              +----------------------------+  |
|  |  Test-Local BFS Queue |              |  Full Closure & Bijective  |  |
|  |  & Visited Bitset     |              |  Permutation Checks        |  |
|  +-----------------------+              +----------------------------+  |
+-------------------------------------------------------------------------+
                                    |
                           (ZERO API EXPANSION)
                                    v
+-------------------------------------------------------------------------+
|                  Phase 4 Solver Infrastructure (Future)                 |
|                 (packages/solvers in Web Worker Context)                |
|                                                                         |
|  - Optimal Scramble Solvers (BFS, Bi-BFS, IDA*)                         |
|  - Solution Path Generation & Pruning Tables                            |
|  - Worker Protocol & Telemetry Metrics                                  |
+-------------------------------------------------------------------------+
```

### Architectural Axiom:
- **`PHASE1E_BFS_PUBLIC_API_REQUIRED: NO`**
- Phase 1E BFS is purely **acceptance verification infrastructure** located in `packages/core/tests/core-reachability.test.ts`.
- No solver routines, search nodes, or graph traversal classes may be exported from `@gearcube/core`.
- Public export count of `@gearcube/core` remains strictly frozen at **53 symbols** (34 runtime + 19 types).

---

## 5. Canonical State Graph, Metric & Algorithm Contract

### 5.1. Graph Definition
- **Graph Nodes:** Valid discrete `GearCubeState` instances within the 41,472 Cartesian domain.
- **Root Node:** `SOLVED_GEAR_CUBE_STATE` ($C=0, X=\{0,0\}, Y=\{0,0\}, Z=\{0,0\}$).
- **Directed Edges:** $S \xrightarrow{m} S' = \text{applyMove}(S, m)$ for each $m \in \text{ALL\_MOVES}$.
- **Branching Factor:** Exactly 12 directed outgoing edges per state ($6 \text{ faces} \times 2 \text{ directions}$).
- **Total Directed Edges in State Graph:** $41,472 \times 12 = 497,664$ edges.

### 5.2. Metric Definition
- **Metric Name:** **`CANONICAL_DIRECTED_MOVE_METRIC`**
- **Definition:** Each of the 12 canonical directed moves in `ALL_MOVES` is one BFS edge with unit cost 1.
- **Independence Clarification:** This Phase 1E metric is defined on the 12 explicit directed operations ($CW \neq CCW$). It is not asserted to be equivalent to Jaap Scherphuis' published 6-generator single-turn table (`[REF-JAAP-01]`) unless separately proven.
- **`BFS_DIAMETER_REFERENCE: INFORMATIONAL_CROSS_CHECK`**
- The breadth-first depth distribution under the canonical directed move metric will be computed and recorded as informational characterization.
- The normative acceptance gate is **reachability of all 41,472 states and 100% graph closure**, not a hardcoded external histogram table.

### 5.3. $O(|V| + |E|)$ BFS Queue & Visited State Contract
- **Queue Representation:** `GearCubeState[]` (pre-allocated array or growing sequential array).
- **Queue Consumption:** Monotonic integer head index (`let head = 0; const state = queue[head++];`).
- **`ARRAY_SHIFT_USED: NO`** (`Array.shift()` is strictly prohibited to guarantee $O(1)$ amortized dequeue).
- **Visited Bitset:** `Uint8Array(41472)` indexed by test-local dense integer rank:
  $$\text{rank}(S) = C \times 1728 + (k_X \cdot 3 + p_X) \times 144 + (k_Y \cdot 3 + p_Y) \times 12 + (k_Z \cdot 3 + p_Z)$$
- **Queue Exhaustion Condition:** `head === queue.length` with `queue.length === 41472`.
- **Complexity:** $O(|V| + |E|)$ with $|V| = 41,472$ and $|E| = 497,664$.

```typescript
// Conceptual Implementation Skeleton (in core-reachability.test.ts)
const visited = new Uint8Array(41472);
const queue: GearCubeState[] = [SOLVED_GEAR_CUBE_STATE];
visited[rank(SOLVED_GEAR_CUBE_STATE)] = 1;
let head = 0;

while (head < queue.length) {
  const current = queue[head++]!;
  for (const move of ALL_MOVES) {
    const next = applyMove(current, move);
    const nextRank = rank(next);
    if (visited[nextRank] === 0) {
      visited[nextRank] = 1;
      queue.push(next);
    }
  }
}
```

---

## 6. Evidence Separation: New Phase 1E Evidence vs. Existing Regression Evidence

### 6.1. NEW_PHASE1E_EVIDENCE (To be implemented in `core-reachability.test.ts`)
The new test suite provides distinct mathematical and graph-theoretic proof:
1. **Dense-Rank Bijection:** Proves $\text{rank}(S)$ is a bijection between the 41,472 Cartesian coordinate tuples and $[0..41471]$ ($41,472 / 41,472$).
2. **Exhaustive BFS Reachability from Solved:** Proves starting from `SOLVED_GEAR_CUBE_STATE` reaches exactly $41,472$ unique states ($41,472 / 41,472$).
3. **Queue Exhaustion & Completeness:** Proves the BFS queue exhausts normally via `head === queue.length` with `queue.length === 41472`.
4. **Reachable-Set Graph Closure:** Proves all $497,664$ outgoing move transitions from the reachable set land within the reachable set ($497,664 / 497,664$).
5. **Per-Directed-Move Domain Bijection:** Proves for each of the 12 moves $m \in \text{ALL\_MOVES}$, applying $m$ across all 41,472 reachable states yields exactly 41,472 distinct images ($12 / 12$ moves).

### 6.2. DERIVED_GRAPH_THEORETIC_RESULT
- **Directed Graph Strong Connectedness:**
  - **Step A (BFS Reachability):** Proves every state in the 41,472 domain is reachable from `SOLVED_GEAR_CUBE_STATE` ($41,472 / 41,472$).
  - **Step B (Inverse Move Symmetry from Existing Regression):** Existing test `transitions-exhaustive.test.ts` proves that for every state $S$ and move $m$, applying $m^{-1}$ recovers $S$ ($497,664 / 497,664$), guaranteeing that every directed path is reversible.
  - **Conclusion:** `DIRECTED_GRAPH_STRONGLY_CONNECTED: YES` (Exactly 1 strongly connected component spanning the entire canonical state space).

### 6.3. EXISTING_REGRESSION_EVIDENCE (Preserved from Phase 1A–1D; NOT duplicated)
The following exhaustive evidence is already proven by existing tests and must remain green:
- **Cartesian domain cardinality & single solved state:** $41,472$ states generated with exactly 1 solved state (`packages/core/tests/domain.test.ts`).
- **Canonical transition independent oracle:** $497,664 / 497,664$ matches (`packages/core/tests/transitions-exhaustive.test.ts`).
- **Inverse round-trip cancellation:** $497,664 / 497,664$ exact recoveries (`packages/core/tests/transitions-exhaustive.test.ts`).
- **12-repeat generator order:** $41,472 \times 12$ identity returns (`packages/core/tests/transitions-exhaustive.test.ts`).
- **U/F/R non-regression:** $248,832 / 248,832$ transitions (`packages/core/tests/transitions.test.ts`).
- **D/B/L canonical validation:** $248,832 / 248,832$ transitions (`packages/core/tests/transitions.test.ts`).
- **Model A center lookup table:** $1,536 / 1,536$ mechanical keys (`packages/core/tests/materializer.test.ts`).
- **Derived center placement identity:** $41,472 / 41,472$ states (`packages/core/tests/materializer.test.ts`).
- **Center goldens:** 13 / 13 golden vectors (`packages/core/tests/materializer.test.ts`).
- **State materialization:** $165,888 / 165,888$ views (`packages/core/tests/materializer.test.ts`).
- **Normalization round-trip:** $165,888 / 165,888$ views (`packages/core/tests/materializer.test.ts`).
- **Full application move lifecycle:** $1,990,656 / 1,990,656$ physical transitions (`packages/core/tests/materializer.test.ts`).
- **Canonical serialization round-trip & uniqueness:** $41,472 / 41,472$ states (`packages/core/tests/serialization.test.ts`).
- **Exact-key structural type guards:** 28 tests (`packages/core/tests/validation.test.ts`).
- **Public API surface audit:** 53 exported symbols (`packages/core/tests/transitions.test.ts` & `tests/boundary.test.ts`).
- **Core package dependency purity:** 0 dependencies, no DOM (`scripts/check-core-deps.mjs` & `tests/boundary.test.ts`).

---

## 7. Group & Structural Invariant Classification

| Invariant / Property | Normative Source | Observable via Current Public API | Already Exhaustively Proven | New Phase 1E Evidence Added |
| :--- | :--- | :---: | :---: | :---: |
| **Corner Tetrad Isolation ($T_{\text{ref}} / T_{\text{free}}$)** | `STANDARD_GEAR_CUBE_SPEC.md` §5.1 | Yes (via `materializeState`) | **YES** (Phase 1D: $165,888$ views) | **NO** (Retained as Phase 1D regression evidence) |
| **Edge Slice Orbit Isolation (X, Y, Z)** | `STANDARD_GEAR_CUBE_SPEC.md` §5.1 | Yes (via `materializeState`) | **YES** (Phase 1D: $165,888$ views) | **NO** (Retained as Phase 1D regression evidence) |
| **Klein Four-Group $V_4$ Slice Permutations** | `GEAR_CUBE_STATE_MODEL.md` §2.2 | Yes (via `isGearCubeState`) | **YES** (Phase 1B: validation; Phase 1C: $497,664$) | **NO** (Retained as existing regression evidence) |
| **Shared $\mathbb{Z}_3$ Edge Gear Phase Alignment** | `STANDARD_GEAR_CUBE_SPEC.md` §5.1 | Yes (via `isGearCubeState`) | **YES** (Phase 1B: validation; Phase 1C: $497,664$) | **NO** (Retained as existing regression evidence) |
| **Derived Center Quotient Semantics** | ADR-0004 §2.1 | Yes (via `materializeState`) | **YES** (Phase 1D: $41,472$ center identities) | **NO** (Retained as Phase 1D regression evidence) |
| **SpatialFrame Decoupling from Canonical State** | `GEAR_CUBE_STATE_MODEL.md` §3 | Yes (via `GearCubeState` schema) | **YES** (Phase 1B: validation; Phase 1D: lifecycle) | **NO** (Retained as Phase 1D regression evidence) |
| **Action of Move Generators as Bijections in $S_{41472}$** | Group Theory / Action Algebra | Yes (via `applyMove`) | **NO** | **YES** (Phase 1E: $12 \times 41,472$ image sizes) |
| **Global State Space Reachability from Identity** | `STANDARD_GEAR_CUBE_SPEC.md` §3.1 | Yes (via `applyMove`) | **NO** | **YES** (Phase 1E: $41,472 / 41,472$ reachable) |

---

## 8. Executable Acceptance Gates & Assertions

### 8.1. New Phase 1E Acceptance Gates (`packages/core/tests/core-reachability.test.ts`)
The new test suite implements exactly **4 core acceptance gates**:

- **Gate 1: Test-Local Dense Rank Bijection Gate**
  - Iterate all 41,472 Cartesian coordinate states $(C, k_X, p_X, k_Y, p_Y, k_Z, p_Z)$.
  - Verify `rank(state)` produces all integers $0..41471$ with zero collisions and zero gaps.
  - *Pass Criteria:* Exactly 41,472 unique ranks.

- **Gate 2: Primary BFS Reachability Traversal Gate**
  - Initialize queue with `[SOLVED_GEAR_CUBE_STATE]`.
  - Expand 12 moves using `applyMove(state, move)` via monotonic head index.
  - Mark visited via `Uint8Array(41472)` indexed by `rank(next)`.
  - *Pass Criteria:* `queue.length === 41472`, `head === queue.length` (queue exhausts normally).

- **Gate 3: Reachable-Set 12-Move Graph Closure Gate**
  - For every reachable state $S$ ($41,472$) and every move $m \in \text{ALL\_MOVES}$ ($12$):
    - Compute $S' = \text{applyMove}(S, m)$.
    - Verify `visited[rank(S')] === 1`.
  - *Pass Criteria:* $497,664 / 497,664$ transitions land within the reachable set.

- **Gate 4: Per-Move Bijective Permutation Gate**
  - For each of the 12 moves $m \in \text{ALL\_MOVES}$:
    - Apply $m$ to all 41,472 reachable states.
    - Assert `new Set(reachableStates.map(s => rank(applyMove(s, m)))).size === 41472`.
  - *Pass Criteria:* $12 / 12$ moves are bijections over the 41,472-state domain.

### 8.2. Reachable-Set Consistency Assertions (Integrated in Gate 2 / Gate 3)
- Every discovered state satisfies `isGearCubeState(state) === true` ($41,472 / 41,472$).
- Exactly 1 state in the 41,472 reachable array satisfies `isSolved(state) === true` (`REACHABLE_SET_CONSISTENCY_ASSERTION`).

### 8.3. Informational Characterization Gate
- **Gate 5 (Informational): Canonical Directed Move Metric Distance Characterization Gate**
  - Aggregate BFS depth counts into a layer-by-layer distribution.
  - Log total states discovered per depth and maximum depth (diameter) as informational output.
  - *Assertion:* Sum across all depths equals exactly $41,472$.

### 8.4. Repository-Level Regression & Purity Gate
- **Gate 6: Full Repository Verification Gate (`npm run verify`)**
  - Execute: `npm run typecheck && npm run check:core-deps && npm test && npm run build`
  - *Pass Criteria:*
    - `typecheck`: 0 TypeScript compiler errors.
    - `check:core-deps`: Core package purity verified (0 runtime dependencies, no DOM).
    - `npm test`: All **10 test files** pass (9 baseline + 1 Phase 1E reachability suite).
    - `build`: Production web client bundle built successfully.

---

## 9. Performance, Determinism & Complexity Specification

- **Algorithmic Complexity:** $O(|V| + |E|)$ with $|V| = 41,472$ and $|E| = 497,664$.
- **Determinism:**
  - BFS queue is strictly FIFO with deterministic move order (`ALL_MOVES`).
  - No random seed, no non-deterministic hash maps, no concurrency races.
- **`WALL_CLOCK_CORRECTNESS_GATE: NO`**
  - No pass/fail threshold may depend on wall-clock execution speed.
  - Execution time is reported for informational logging only.

---

## 10. Proposed Implementation Scope & File Boundaries

### 10.1. Implementation Scope:
- **`FINAL_IMPLEMENTATION_SCOPE_STATUS: FROZEN`**

| File Path | Action | Content & Purpose |
| :--- | :---: | :--- |
| `packages/core/tests/core-reachability.test.ts` | **CREATE** | Test-local BFS reachability traversal, closure, bijection, and invariant gates (Gates 1–5). |
| `docs/development/ROADMAP.md` | **MODIFY** | Synchronize Phase 1E status to Implemented / Ready for Review. |
| `docs/development/TEST_STRATEGY.md` | **MODIFY** | Formalize Level 2 whole-domain BFS reachability, bijection, and closure gates. |

### 10.2. Production Code Impact:
- **`PHASE1E_PRODUCTION_SOURCE_CHANGE_REQUIRED: NO`**
- Zero files in `packages/core/src/` will be created or modified.
- Zero public API symbols will be added or removed (`PUBLIC_API_DELTA: 0`).
- Total public exports remain **53**.

---

## 11. Risk Matrix & Stop Conditions

| # | Risk Description | Severity | Classification & Action |
| :-: | :--- | :---: | :--- |
| **1** | BFS reaches $< 41,472$ states | CRITICAL | **`ARCHITECTURE_REVIEW_REQUIRED`** (STOP). Indicates disconnected state space or missing transition orbit. |
| **2** | BFS reaches $> 41,472$ states | CRITICAL | **`ARCHITECTURE_REVIEW_REQUIRED`** (STOP). Indicates domain boundary leak. |
| **3** | Dense-rank collision or gap | HIGH | **`TEST_LOCAL_DEFECT`** (Repair test-local rank formula). |
| **4** | Move closure failure ($S' \notin \text{Reachable}$) | CRITICAL | **`ARCHITECTURE_REVIEW_REQUIRED`** (STOP). Transition leaves reachable set. |
| **5** | Per-move image size $< 41,472$ | CRITICAL | **`ARCHITECTURE_REVIEW_REQUIRED`** (STOP). Move does not act as a permutation. |
| **6** | Canonical directed diameter differs from Jaap's single-turn table | LOW | **`INFORMATIONAL_ONLY`** (Do NOT fail test; record discrepancy for Phase 4 metric analysis). |
| **7** | Normative invariant conflict | HIGH | **`ARCHITECTURE_REVIEW_REQUIRED`** (STOP). Physical spec mismatch. |
| **8** | Test accidentally imports internal tables instead of public `applyMove` | MEDIUM | **`TEST_LOCAL_DEFECT`** (Fix imports to test public surface only). |
| **9** | BFS / search routines exported into public Core API | HIGH | **`SCOPE_REVIEW_REQUIRED`** (STOP). Keep BFS test-local. |
| **10** | Public exports count changes from 53 | HIGH | **`SCOPE_REVIEW_REQUIRED`** (STOP). Do not expand public API. |
| **11** | Runtime dependency added to `@gearcube/core` | HIGH | **`PURITY_VIOLATION`** (STOP). Revert dependency. |
| **12** | Accidental quadratic complexity causes test timeout | MEDIUM | **`TEST_LOCAL_DEFECT`** (Optimize queue/visited lookups to $O(1)$ using head index). |
| **13** | Renderer / solver / AI scope creep | HIGH | **`SCOPE_REVIEW_REQUIRED`** (STOP). Constrain strictly to Phase 1E acceptance. |
| **14** | Discovery that accepted Phase 1C/1D production logic must change | CRITICAL | **`ARCHITECTURE_REVIEW_REQUIRED`** (STOP). Requires formal ADR and approval. |

---

## 12. Documentation Lifecycle

- During Phase 1E implementation:
  - `docs/development/ROADMAP.md`: Transition Phase 1E to `INTEGRATED / READY FOR INDEPENDENT ACCEPTANCE`.
  - `docs/development/TEST_STRATEGY.md`: Incorporate Level 2 BFS reachability and closure gates.
- Phase 1E must NOT be marked `COMPLETED & ACCEPTED` until independent acceptance review passes.
- Downstream phase eligibility: Completion of Phase 1E unlocks **Phase 2 (3D Graphics & Kinematic Animation Engine)**.

---

## 13. Phase 1E Completion & Exit Criteria

Phase 1E implementation will be considered complete and ready for independent acceptance when:
1. `packages/core/tests/core-reachability.test.ts` executes and passes all test-local gates.
2. `BFS_REACHABLE_STATE_COUNT` is proven to be exactly **$41,472 / 41,472$**.
3. All 12 directed moves are proven to be bijections over the 41,472 states ($12 / 12$).
4. $497,664 / 497,664$ transition closures pass with 0 out-of-domain states.
5. All existing Phase 1A–1D test suites remain 100% green without regressions.
6. `npm run verify` passes with exit code 0 across all 10 test files.
7. Public API export count remains strictly **53**.
8. Zero production source files in `packages/core/src/` are modified.
9. Documentation in `ROADMAP.md` and `TEST_STRATEGY.md` is 100% synchronized.