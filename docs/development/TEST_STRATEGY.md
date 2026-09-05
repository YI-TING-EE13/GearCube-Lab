# TEST_STRATEGY.md — Comprehensive Verification & Test Strategy

> **Document Status:** `DECIDED`
> **Applicability:** All testing suites, invariant assertions, and verification gates across the repository lifecycle.

---

## 1. Testing Philosophy & Guiding Principles

1. **Empirical Oracles Only:**
   > [!CAUTION]
   > **Prohibition on Unverified Oracles:** Under no circumstances may an unverified mechanical hypothesis (e.g., assumed gear ratio, assumed state cardinality, or guessed cycle period) be written into an automated test assertion as a passing oracle. All mathematical oracles must originate from empirical Phase 0B characterization or formal group-theoretic proofs.

2. **Layered Isolation (Testing Pyramid):**
   Pure combinatorial domain rules must be fully testable in milliseconds without launching WebGL contexts, browser windows, or rendering pipelines.
3. **Deterministic Reproducibility:**
   Every randomized test (scramble generation, heuristic fuzzing, benchmark suites) must accept an explicit seed to enable exact reproduction of test failures.

---

## 2. 12-Level Testing Pyramid

```text
               ▲
              / \
             / L12 \       Computer Vision State Validation & Correction
            /------- \
           /   L11    \      ML Heuristic Invariants & Weight Stability
          /------------\
         /     L10      \     Performance & Frame Rate Responsiveness
        /----------------\
       /      L9          \    Browser E2E & Visual Usability (Playwright)
      /--------------------\
     /        L8            \   Seeded Benchmark Determinism & Metrics
    /------------------------\
   /          L7              \  Deterministic Solver Correctness (BFS/IDA*)
  /----------------------------\
 /            L6                \ Web Worker Asynchronous Protocol Tests
/--------------------------------\
|             L5                 | 3D Renderer & Viewport Isolation Tests
|--------------------------------|
|             L4                 | Kinematic Trajectory Math & Collision Checks
|--------------------------------|
|             L3                 | Invalid State & Boundary Consistency Validation
|--------------------------------|
|             L2                 | Group Theory Invariants & Move Inverses
|--------------------------------|
|             L1                 | Pure Core Unit Tests & State Transitions
+--------------------------------+
```

---

## 3. Detailed Test Levels & Invariants

### Level 1: Pure Core Value Domains, Validation & State Operations
- **Scope:** `packages/core` (`packages/core/tests/types.test.ts`, `packages/core/tests/validation.test.ts`, `packages/core/tests/state.test.ts`, `packages/core/tests/domain.test.ts`)
- **Focus:** Canonical value collections, derived literal-union types, order-independent exact-key runtime validation, solved state recognition, structural state equality, and 41,472 Cartesian domain cardinality.
- **Invariants Tested:**
  - Canonical `FACES` ordered deterministically as `['U', 'D', 'F', 'B', 'R', 'L']` ($6$ unique faces).
  - Canonical `DIRECTIONS` contains exactly `['CW', 'CCW']` with zero numeric angle semantics.
  - Canonical `ALL_MOVES` contains exactly 12 directed moves in canonical $(FACES \times DIRECTIONS)$ order.
  - Canonical `CORNER_CONFIGURATIONS` contains exactly 24 integers $0 \dots 23$.
  - Internal `V4_PERMUTATIONS` and slot sequences (`SLICE_X_SLOTS`, `SLICE_Y_SLOTS`, `SLICE_Z_SLOTS`) faithfully encode frozen coordinate geometry.
  - Static constants and arrays are deeply frozen at module evaluation time via `Object.freeze()`.
  - Type guards (`isFace`, `isDirection`, `isMove`, `isCornerConfiguration`, `isSlicePermutationClass`, `isSliceGearPhase`, `isEdgeSliceCoordinate`, `isGearCubeState`) enforce order-independent exact own-key set equality via `Reflect.ownKeys()`.
  - Extraneous properties (such as `spatialFrame`, `history`, `solverCost`, symbol keys, or non-enumerable properties) are strictly rejected.
  - `equalsGearCubeState(a, b)` strictly compares canonical discrete coordinates.
  - Authoritative `SOLVED_GEAR_CUBE_STATE` is recognized by `isSolved()`, and exactly 1 state out of all 41,472 Cartesian coordinate tuples satisfies `isSolved()`.

### Level 2: Group Theory Invariants & Move Inverses
- **Scope:** `packages/core/src/transitions.ts`, `packages/core/src/transition-data.ts` (`packages/core/tests/transitions.test.ts`, `packages/core/tests/transitions-exhaustive.test.ts`)
- **Focus:** Canonical move transitions, golden vector precision, dual-suite independent oracle equivalence, and move algebra invariants.
- **Invariants Tested (Harmonized & Verified pursuant to [`ADR-0005`](../decisions/ADR-0005-CANONICAL-MOVE-TRANSITION-ALGEBRA.md)):**
  - **12 Solved-State Golden Vectors:** Bit-for-bit match against reference-normalized canonical derivations for all 12 directed moves from `SOLVED_GEAR_CUBE_STATE` (`transitions.test.ts`).
  - **U/F/R Semantic Non-Regression Gate:** $248,832 / 248,832$ positive-face transitions match the immutable Phase 1C baseline with 0 regressions (`transitions.test.ts`).
  - **D/B/L Reference-Normalized Correction Gate:** $248,832 / 248,832$ negative-face transitions match the independent reference-normalized oracle with 0 mismatches (`transitions.test.ts`).
  - **Full Canonical Acceptance Gate:** $497,664 / 497,664$ transitions ($41,472 \text{ states} \times 12 \text{ moves}$) match the independent oracle with 0 mismatches (`transitions.test.ts`).
  - **Single-Step Transition Closure:** $497,664 / 497,664$ transitions produce valid canonical `GearCubeState` instances with 0 failures (`transitions-exhaustive.test.ts`).
  - **Direct vs Independent Reference Oracle Equivalence:** $497,664 / 497,664$ production transitions match an independently derived physical/canonical test oracle with 0 mismatches (`transitions-exhaustive.test.ts`). The test-local oracle derives next state strictly from 3D geometry and canonical normalization without reading production transition tables.
  - **Inverse Move Cancellation:** $\text{applyMove}(\text{applyMove}(S, M), \text{inverseMove}(M)) = S$ for all $497,664$ state-move pairs with 0 failures (`transitions-exhaustive.test.ts`).
  - **12-Repeat Identity:** For every canonical state and directed move, applying the move 12 consecutive times returns the initial state ($M^{12}(S) = S$) across all $41,472 \text{ states} \times 12 \text{ moves}$ (`transitions-exhaustive.test.ts`).
  - **Opposing Face Commutativity:** $U \cdot D = D \cdot U$, $F \cdot B = B \cdot F$, $R \cdot L = L \cdot R$ (`transitions.test.ts`).
  - **Defensive Input Validation & Anti-Aliasing:** Deterministic state-first `TypeError` rejection on malformed inputs; immutable inputs with fresh outer and slice object allocation on all valid calls (`transitions.test.ts`).
  - **Phase 1E Whole-Domain BFS Reachability & Graph-Topology Gates (`core-reachability.test.ts`):**
    - **Dense-Rank Bijection Gate:** Test-local $\text{rank}(S) = C \cdot 1728 + (k_X \cdot 3 + p_X) \cdot 144 + (k_Y \cdot 3 + p_Y) \cdot 12 + (k_Z \cdot 3 + p_Z)$ maps the 41,472 Cartesian coordinate tuples bijectively onto $[0..41471]$ with 0 collisions and 0 gaps.
    - **Exhaustive BFS Solved-Reachability Gate:** Starting from `SOLVED_GEAR_CUBE_STATE`, expanding all 12 directed moves via an $O(|V| + |E|)$ FIFO queue reaches exactly $41,472 / 41,472$ unique canonical states with normal queue exhaustion (`head === queue.length`).
    - **Reachable-Set Consistency Assertions:** All 41,472 discovered states satisfy `isGearCubeState(state) === true` and exactly 1 state satisfies `isSolved(state) === true`.
    - **Reachable-Set 12-Move Graph Closure Gate:** For every reachable state $S$ ($41,472$) and move $m \in \text{ALL\_MOVES}$ ($12$), $497,664 / 497,664$ transitions land strictly within the BFS-reachable set.
    - **Per-Directed-Move Domain Bijection Gate:** For each of the 12 moves in `ALL_MOVES`, applying the move across all 41,472 reachable states produces an image set of cardinality exactly 41,472 ($12 / 12$ moves act as permutations in $S_{41472}$).
    - **Directed Graph Strong Connectedness (Derived Result):** Combined from Phase 1E BFS reachability from solved ($41,472 / 41,472$) and existing Level 2 inverse-move regression ($497,664 / 497,664$ inverse recoveries), establishing that the state space forms 1 strongly connected component.
    - **Canonical Directed Move Metric Characterization (Informational):** Informational BFS depth distribution recorded (maximum depth / diameter 8 under 12 directed unit-cost moves; total accumulated states 41,472). Explicitly distinguished from external literature single-turn metrics.

### Level 3: Coordinate Domain & Materializer Consistency
- **Scope:** `packages/core/src/spatial-frame.ts`, `packages/core/src/materializer.ts`, `packages/core/src/serialization.ts` (`packages/core/tests/materializer.test.ts`, `packages/core/tests/serialization.test.ts`)
- **Focus:** 4-state `SpatialFrame` orientation lifecycle, Model A center identity derivation, $165,888$ state-frame piece placement view materialization, inverse normalization bijection, $1,990,656$ application lifecycle transitions against independent physical simulation oracle, and strict deterministic canonical logical serialization.
- **Invariants Tested (Implemented & Verified in Phase 1D):**
  - Canonical `SPATIAL_FRAMES = [0, 1, 2, 3]` with canonical reference frame `DEFAULT_SPATIAL_FRAME = 3`.
  - All 24 `SpatialFrame` $\times$ physical-face transitions in `nextSpatialFrame()` verified.
  - Self-inverse involution invariant: every slot permutation in `FRAME_SLOT_PERMS` satisfies $\sigma^2 = I$.
  - Exact Model A $S_4 / V_4$ algebraic factorization: $1,536 / 1,536$ coordinate keys verified with 0 mismatches against reference mechanics.
  - Quotiented center placements (`CenterPlacement` with `{ slot, pieceId }`) verified for Solved and all 12 single-move golden vectors without axial orientation endpoint fields.
  - Full-state materializer determinism: $\text{normalizePiecePlacement}(\text{materializeState}(S, f)) \equiv (S, f)$ verified for all $165,888$ expanded fixed-spatial states ($41,472 \times 4$).
  - Exhaustive Application Lifecycle: $1,990,656 / 1,990,656$ transitions ($41,472 \times 4 \times 12$) verified against an independent physical 3D coordinate simulation oracle with 0 mismatches across corners, edges, and centers.
  - Canonical logical serialization (`serializeLogicalState` / `deserializeLogicalState`): exact grammar `C:<C>|X:<kx>.<px>|Y:<ky>.<py>|Z:<kz>.<pz>`, $41,472 / 41,472$ bijective round-trips, $41,472$ unique serialization strings, and strict `TypeError` validation on all malformed/out-of-range inputs.
- **Phase 1D Post-Integration Re-Acceptance Gates (Integrated / Ready for Independent Acceptance):**
  - Model A Raw Center Dict: $1,536 / 1,536$ evaluations.
  - Center Placement Identity: $41,472 / 41,472$ states.
  - Center Placement Goldens: Solved + 12 directed moves (13/13).
  - State Materialization: $165,888 / 165,888$ state-frame pairs.
  - Full-State Normalization: $165,888 / 165,888$ round-trips.
  - Full Application Move Lifecycle: $1,990,656 / 1,990,656$ phase-aware transitions ($\text{materialize}(\text{applyMove}(s, m), \text{nextSpatialFrame}(f, m.\text{face})) \equiv \text{simPhysical}(\text{materialize}(s, f), m)$).
  - Serialization Round-Trip: $41,472 / 41,472$ states.
  - Serialization Uniqueness: Exactly $41,472$ distinct integer keys.

### Level 4: Kinematic Trajectory Math & Static Projection Tests
- **Scope:** `packages/kinematics` (`packages/kinematics/tests/projection.test.ts`, `packages/kinematics/tests/planner.test.ts`)
- **Focus:** Static piece placement projection, view-based continuous angular trajectory generation, and gear coupling equations.
- **Invariants & Gates Tested:**
  - `KINEMATICS_PURITY_GATE`: `PASS` (`@gearcube/core` sole dependency, zero framework/DOM/Node dependencies).
  - Stable Output Order: `placementToTransforms` and `plan.evaluate(p)` emit exactly 26 transforms in persistent `STABLE_COMPONENT_ID_ORDER` (8 corners, 12 edges, 6 centers).
  - `CORNER_MAPPING_GATE`: $32 / 32 \text{ PASS}$ (all reachable `(CornerPieceId, CornerSlot)` pairs map to canonical unit quaternions with 0 orientation conflicts).
  - `EDGE_MAPPING_GATE`: $144 / 144 \text{ PASS}$ (all reachable `(EdgePieceId, EdgeSlot, SliceGearPhase)` keys map to valid canonical orientations modulo $C_2$ ($180^\circ$ axial quotient)).
  - `EDGE_PHASE_DECOMPOSITION_GATE`: $144 / 144 \text{ PASS}$ (composite edge orientation factorizes into base orientation $q_{\text{base}}$ and axial gear spin $q_{\text{spin}}$ around radial axis $\hat{r} = \frac{\vec{r}_{\text{slot}}}{\|\vec{r}_{\text{slot}}\|}$).
  - `CENTER_MAPPING_GATE`: $6 / 6 \text{ PASS}$ (canonical center quaternions map local $+Y = (0, 1, 0)$ to outward face normal $\hat{n}$).
  - `SCRAMBLE_CORE_UNIQUENESS_GATE`: $10 / 10 \text{ PASS}$ (10 frozen scramble sequences verified distinct via `serializeLogicalState`).
  - `PHASE2A_PHYSICAL_TRANSITION_GATE`: $528 / 528 \text{ PASS}$ (48 solved transitions + 480 scrambled transitions across 4 SpatialFrames and 12 moves).
  - Progress Validation: `evaluate(p)` strictly enforces $p \in [0.0, 1.0]$, throwing `RangeError` on invalid inputs.
  - Immutability & Purity: Trajectory calculation is pure, deterministic, and leaves input `PiecePlacementView` objects untouched.

### Level 5: 3D Renderer & Viewport Isolation Tests
- **Scope:** `apps/web` (`apps/web/src/components/cube/GearCubeModel.test.ts`, `apps/web/src/components/cube/animation.test.ts`)
- **Focus:** Scene transform mapping, component ID routing, piece placement materialization binding, and React Three Fiber component isolation tests (pure Node/Vitest transform tests without requiring WebGL context).
- **Invariants Tested:**
  - `SCENE_TRANSFORM_ADAPTER_GATE`: 1-to-1 mapping from ComponentTransforms to scene descriptors ($26/26$).
  - `COMPONENT_IDENTITY_GATE`: Exact stable ComponentId sequence preserved ($26/26$).
  - `PIECE_ROUTING_GATE`: 8 corners, 12 edges, 6 centers accurately routed.
  - Easing mathematics, 12-move staging, half-turn lock, continuation, cancellation, and direct 180° execution tested in pure headless environment.

### Level 5B: Application History, Deterministic Scramble & Session State Tests (Accepted in Phase 3A/3B)
- **Scope:** `apps/web/src/components/history/` (`history.test.ts`, `scramble.test.ts`, `play-session.test.ts`, `history-ui.test.tsx`)
- **Status:** `AVAILABLE / ACCEPTED (Phase 3A & 3B)`
- **Focus:** Pure history state transitions, timeline navigation, FNV-1a UTF-16 seed hashing, Mulberry32 scramble generation, session orchestration, and presentational UI components.
- **Invariants Tested & Gates:**
  - `HISTORY_INITIAL_GATE` & `HISTORY_COMMIT_GATE`: History starts empty at `cursorIndex === -1`; completed moves append entries.
  - `NO_HISTORY_AT_HALF_GATE` & `NO_HISTORY_ON_CANCEL_GATE`: Midpoint lock and cancel operations create zero history entries.
  - `DIRECT_HISTORY_COMMIT_GATE`: Direct 180° moves create exactly one canonical entry.
  - `UNDO_GATE`, `REDO_GATE`, `REDO_TRUNCATION_GATE`: Instant snapshot restore and redo branch truncation.
  - `FRAME_AWARE_HISTORY_GATE`: Exact `(GearCubeState, SpatialFrame)` restored simultaneously.
  - `SESSION_HISTORY_ALIGNMENT_GATE`: Session state/frame strictly matches history cursor snapshot at all IDLE endpoints.
  - `SEEDED_SCRAMBLE_DETERMINISM_GATE`: Exact seed string + length produces bit-for-bit identical move sequences.
  - `EMPTY_SEED_DETERMINISM_GATE`: Empty string seed deterministically produces reproducible move sequence.
  - `SCRAMBLE_VALID_MOVE_GATE`: All scramble moves belong to `ALL_MOVES` without consecutive same-face moves.
  - `SCRAMBLE_BASELINE_GATE`: Applying scramble atomically establishes new baseline, clears prior history, and snaps projection.
  - `MODE_COMPATIBILITY_GATE`: Mode switches do not alter history entries or cursor.
  - `BUSY_INPUT_BLOCK_GATE`: History navigation and scramble rejected while puzzle is busy.
  - `IMMUTABILITY_GATE`: Domain structures remain strictly unmutated.

### Level 6: Web Worker Asynchronous Protocol & Controller Tests
- **Scope:** `packages/solvers`, `apps/web/src/components/solver/solver-worker-controller.ts`, `apps/web/src/workers/solver.worker.ts` (Phase 4)
- **Focus:** Pure worker controller state transitions, serializable message schema validation, and browser Worker lifecycle.
- **Invariants Tested & Gates:**
  - Protocol message schema validation (`START_SEARCH`, `SEARCH_STARTED`, `SEARCH_PROGRESS`, `SEARCH_COMPLETE`, `SEARCH_LIMIT_REACHED`, `SEARCH_ERROR`).
  - `requestId` state management and monotonic tracking in pure Node Vitest tests.
  - Stale message rejection: responses with mismatched or superseded `requestId` are discarded.
  - Local cancellation transition: host-driven `worker.terminate()` immediately cleans up worker instances without requiring in-band cancellation messages.
  - Terminal result state transitions and Worker reference disposal.
  - Real browser Worker construction and off-main-thread execution verified by Playwright in Phase 4E (no wall-clock timing gates in deterministic unit tests).

### Level 7: Deterministic Solver Search Correctness & Exact Distance Oracles
- **Scope:** `packages/solvers`, `apps/web` (Phase 4)
- **Status:** `AVAILABLE (Phase 4A, Phase 4B, Phase 4C, Phase 4D & Phase 4E Accepted)`
- **Focus:** Algorithm verification on independently verified exact canonical distance fixtures ($d \in [1 \dots 8]$) and Web Worker lifecycle.
- **Available / Implemented & Accepted in Phase 4A:**
  - `DENSE_RANK_BIJECTION`: Exhaustive 41,472/41,472 Cartesian bijection and round-trip consistency in `state-index.test.ts`.
  - `INVERSE_MOVE_ALGEBRA`: Exhaustive 497,664 state-move transition recovery in `search-utils.test.ts`.
  - `EXACT_DISTANCE_ORACLE`: Independent Core-only BFS distance oracle discovering 41,472 states and canonical diameter 8 in `exact-distance-oracle.test.ts`.
  - `EXACT_DISTANCE_FIXTURES`: Deterministic serialized fixtures for depths $1 \dots 8$ in `fixtures.ts`.
  - `SOLVER_BOUNDARY_TEST`: Solver package boundary, TSConfig lib ES2022 / types [], and pure type export verification in `tests/boundary.test.ts`.
- **Available / Implemented & Accepted in Phase 4B:**
  - `BFS_OPTIMALITY`: Shortest-path solutions of exact length $d \in [1 \dots 8]$ in `bfs.test.ts` and `optimality.test.ts`.
  - `BIBFS_OPTIMALITY`: Optimal solutions matching BFS length $d \in [1 \dots 8]$ under complete-layer expansion and provable lower-bound stopping rule in `bidirectional-bfs.test.ts` and `optimality.test.ts`.
  - `SEARCH_LIMIT_GATES`: Exact `MAX_NODES` and `MAX_DEPTH` limit enforcement across both BFS and BiBFS.
  - `SEARCH_TELEMETRY_GATES`: Interval-based telemetry emission matching algorithm contracts.
  - `SOLVER_DETERMINISM_GATE`: Bit-for-bit identical solution paths across repeat runs for identical input.
- **Available / Implemented & Accepted in Phase 4C:**
  - `H2_TABLE_INDEX_RANGE`: All three tables ($CXY, CXZ, CYZ$) index over exact contiguous range $0 \dots 3455$.
  - `H2_TABLE_REACHABILITY`: Exactly $3 \times 3,456 / 3,456$ reachable entries ($100\%$) across all three tables.
  - `H2_UNINITIALIZED_ENTRIES`: Exactly $0$ uninitialized/sentinel entries remaining after PDB BFS construction.
  - `H2_TABLE_DIAMETERS`: Table diameters strictly match abstract diameters ($CXY = 7, CXZ = 7, CYZ = 7$).
  - `H2_REPRESENTATIVE_SUCCESSOR_EQUIVALENCE`: $\text{project}(\text{applyMove}(\text{representative}(A), M))$ matches the quotient transition contract.
  - `HEURISTICS_EXHAUSTIVE_ADMISSIBILITY`: All 41,472 canonical states verify $0 \le h_2(s) \le d^*(s)$ with 0 over-estimates in `heuristics.test.ts`.
  - `HEURISTICS_EXHAUSTIVE_CONSISTENCY`: All 497,664 canonical directed transitions verify $h_2(u) \le 1 + h_2(v)$ in `heuristics.test.ts`.
  - `HEURISTICS_PDB_STRUCTURE`: 3 two-slice abstract tables ($CXY, CXZ, CYZ$) of 3,456 entries each ($10,368\text{ B}$ raw `Int8Array` footprint), 0 closure mismatches, diameters $\le 7$.
  - `IDA_STAR_OPTIMALITY_1_TO_8`: Exact optimal solution depth matching BFS/BiBFS for all deterministic depth 1..8 fixtures in `ida-star.test.ts`.
  - `IDA_STAR_SEARCH_LIMITS`: Cumulative `maxNodes` expansion limit across threshold iterations, total solution length `maxDepth` limit, and $h(\text{start}) > \text{maxDepth}$ zero-expansion abort in `ida-star.test.ts`.
  - `IDA_STAR_SEARCH_TELEMETRY`: Telemetry emissions reporting `algorithm: 'IDA_STAR'`, cumulative counters, `threshold`, and `currentDepth` on `progressIntervalNodes` intervals.
- **Available / Implemented & Accepted in Phase 4D:**
  - `WORKER_ADAPTER_DISPATCH`: Dedicated browser Worker entry adapter dispatching to `solveBfs`, `solveBidirectionalBfs`, and `solveIdaStar` in `solver.worker.ts`.
  - `PURE_WORKER_CONTROLLER`: State machine, `requestId` tracking, and stale-message rejection verified in `solver-worker-controller.test.ts`.
  - `WORKER_LIFECYCLE_ISOLATION`: Worker construction/termination owned exclusively by `useSolverWorker.ts`.
  - `WORKER_BOUNDARY_GATES`: Manifest dependency, Worker location, sole construction site, and main-thread solver call prohibition in `tests/boundary.test.ts`.
- **Available / Implemented & Accepted in Phase 4E:**
  - `SOLVE_MODE_UI`: Accessible SolvePanel with algorithm selector (IDA*, BiBFS, BFS), solve/cancel controls, progress telemetry, and solution summary.
  - `PURE_PLAYBACK_CONTROLLER`: Immutable metadata, expected state prefix chain, dispatch/settle guards, step forward/backward navigation in `playback-controller.test.ts`.
  - `DIRECT_180_PLAYBACK`: Continuous playback committing exactly 1 canonical history entry per move.
  - `TWO_STEP_PLAYBACK`: Automatic midpoint continuation committing exactly 1 canonical history entry per move.
  - `REAL_BROWSER_WORKER_GATE`: Real Chromium Worker creation and off-main-thread search in `solve-mode.spec.ts`.
  - `MAIN_THREAD_ACTIONABILITY_GATE`: Verified responsive UI interactions (mode toggle) during active search in `solve-mode.spec.ts`.
  - `STALE_RESULT_GATE`: Verified external action cancels active search and rejects stale solution in `solve-mode.spec.ts`.
  - `PAUSE_AT_CANONICAL_BOUNDARY_GATE`: Move finishes to IDLE before pause takes effect in `solve-mode.spec.ts`.
  - `STEP_BACK_FORWARD_GATE`: Step back/forward history navigation within baseline bounds in `solve-mode.spec.ts`.
  - `RESPONSIVE_SOLVER_UI_GATE`: Verified layout bounds across desktop, tablet, and mobile in `solve-mode.spec.ts`.

### Level 8: Seeded Benchmark Determinism & Empirical Metrics (Phase 5 — Implemented & Accepted)
- **Scope:** `packages/benchmark` (Phase 5)
- **Focus:** Empirical repeatability, deterministic metric verification, and algorithm search efficiency comparisons.
- **Contract Principles:**
  - **Deterministic Metrics (Bit-for-Bit Equality Gates):** `schemaVersion`, `suiteId`, `seed`, `exactDepths`, `casesPerDepth`, `caseId`, `stateKey`, `exactDepth`, `algorithm`, `repetitionIndex`, `status`, `solutionDepth`, `solutionMoves`, `nodesExpanded`, `nodesGenerated`, `limitReason`. Repeated runs with identical configuration and seed must match these fields bit-for-bit.
  - **Observational Metrics (Excluded from Deterministic Gates):** `elapsedMs`, timestamps, host/environment metadata (CPU, OS, Node/browser version).
- **Invariants Tested & Acceptance Gates:**
  - **Phase 5A Package Foundation & Exact-Distance Corpus Gates (Implemented & Accepted):**
    - `BENCHMARK_PACKAGE_BOUNDARY_GATE`: `@gearcube/benchmark` depends strictly on `@gearcube/core` and `@gearcube/solvers`; zero UI/DOM or 3rd-party dependencies.
    - `CORE_TRUTH_GATE`: Domain transitions and serialization owned solely by `@gearcube/core`.
    - `EXACT_DISTANCE_CORPUS_CLOSURE_GATE`: Independent Core-only traversal discovers exactly 41,472 canonical states without calling production solver implementations.
    - `EXACT_DISTANCE_DIAMETER_GATE`: Maximum exact distance verified as exactly 8.
    - `EXACT_DISTANCE_HISTOGRAM_GATE`: Independent corpus verifies exact canonical distance histogram: `{ 0:1, 1:12, 2:111, 3:822, 4:3863, 5:11706, 6:16410, 7:8196, 8:351 }`.
    - `CASE_ID_STABILITY_GATE`: Case IDs use state-derived `d${exactDepth}:${stateKey}`, invariant to sample position or seed.
    - `CONFIG_VALIDATION_GATE`: Validator rejects invalid config (schema version, depth range 1..8, non-empty algorithm list) before executing trials.
    - `BROWSER_SAFE_ENTRY_GATE`: Root engine entry exports zero Node built-in dependencies (`node:fs`, `node:path`).
  - **Phase 5B Sampling, Runner, CLI & Exporter Gates (Implemented & Accepted):**
    - `SEED_HASH_EXACTNESS_GATE`: `FNV1A_UTF16_CODE_UNITS_32` produces exact 32-bit unsigned hashes across test vectors without Unicode normalization.
    - `PRNG_EXACTNESS_GATE`: `MULBERRY32_EXACT` produces bit-for-bit reproducible pseudo-random sequence verified via exact floating-point equality.
    - `CONTINUOUS_PRNG_STREAM_GATE`: Continuous Mulberry32 PRNG stream across depth buckets without reset proven via distinguishing golden vectors.
    - `SAMPLING_ALGORITHM_GATE`: Ordinal string sorting and partial Fisher-Yates shuffle produce deterministic case sequences without mutating corpus buckets.
    - `REPEATED_RUN_DETERMINISM_GATE`: Identical suite runs yield bit-for-bit identical search paths, depths, node counters, and terminal statuses.
    - `OPTIMALITY_GATE`: For all solved exact-distance cases, `solutionDepth === exactDepth` for BFS, Bidirectional BFS, and IDA* across all 8 exact depths.
    - `SOLVER_RESULT_ALIGNMENT_GATE`: Results mapped strictly to `SOLVED` (with depth and canonical `Move[]`) or `LIMIT_REACHED` (with limit reason).
    - `MEASURED_TRIAL_ONLY_REPORT_GATE`: Warm-up trials are executed, discarded, and excluded from reports, CSV exports, and summaries.
    - `MOVE_EXPORT_ENCODING_GATE`: Canonical `Move[]` preserved in JSON; CSV serializes space-delimited `<FACE>_<DIRECTION>` tokens.
    - `JSON_EXPORT_ROUNDTRIP_GATE`: Lossless JSON export conforms to schema and recovers all case and trial records.
    - `CSV_SCHEMA_GATE`: Flat CSV export strictly adheres to the 14-column specification with valid space-delimited move strings.
    - `CSV_ESCAPING_GATE`: RFC-4180 compliant CSV field quoting and double-quote escaping.
    - `CLI_EXIT_SEMANTICS_GATE`: Exit 0 on completed suite (including limit reached); exit 2 on typed `BenchmarkConfigError` or CLI usage errors; exit 1 on operational filesystem export errors.
    - `CLI_REAL_SUBPROCESS_GATE`: Subprocess acceptance test verifies execution of root `npm run benchmark` script.
    - `STATIC_CONFIG_VALIDATION_GATE`: Static config validation executes before canonical 41,472-state corpus construction.
    - `ALGORITHM_FAIRNESS_GATE`: BFS, BiBFS, and IDA* evaluated on identical case instances in cyclic rotated execution order with identical configured resource limits.
  - **Phase 5C Classical Comparative Benchmark Gates (Implemented & Accepted):**
    - `EXECUTION_BASELINE_GATE`: Pre-run execution baseline commit frozen at `1fcc48dffcc10a59dbb9fe1eb1e5d7e2ce123ba6`.
    - `RESEARCH_DATASET_GATE`: Full comparative data collected across BFS, BiBFS, and IDA* for depths 1..8 (3,546 measured rows, 4,698 solver invocations).
    - `ALL_SOLVED_GATE`: 100% of measured trials solved with 0 limit reached.
    - `OPTIMALITY_GATE`: Zero optimality violations (`solutionDepth === exactDepth`).
    - `REPRODUCIBILITY_GATE`: Zero deterministic projection mismatches across 3 independent CLI replicates.
    - `RAW_ARTIFACT_INTEGRITY_GATE`: All 10 raw JSON/CSV artifact SHA-256 hashes immutable.
    - `STRUCTURAL_ANALYSIS_GATE`: Traceable paired reduction statistics deterministically recomputed and validated.
    - `TIMING_RESOLUTION_GATE`: Two-stage median with integer-ms quantization labeling (`TIMER_RESOLUTION_LIMITED`).
    - `METRIC_SEPARATION_GATE`: Deterministic search metrics strictly separated from observational execution times.
    - `REPORT_TRACEABILITY_GATE`: Complete bidirectional traceability to committed evidence in [`docs/research/PHASE_5_CLASSICAL_SOLVER_BENCHMARK_REPORT.md`](../research/PHASE_5_CLASSICAL_SOLVER_BENCHMARK_REPORT.md).
  - **Phase 5D Browser Research Mode Gates (Implemented & Accepted):**
    - `BENCHMARK_WORKER_ISOLATION_GATE`: Benchmark compute executes off the UI thread in dedicated Web Worker (`benchmark.worker.ts`) with zero DOM leakage (`typeof document === 'undefined'`).
    - `PURE_BENCHMARK_CONTROLLER_GATE`: Deterministic state transitions, monotonic `requestId` tracking, and stale-message rejection verified across 32 focused unit tests in `tests/unit/benchmark-worker-controller.test.ts`.
    - `BOUNDARY_ISOLATION_GATE`: Verification of browser-safe imports, Worker path isolation, and main-thread execution prohibition across 52 boundary tests in `tests/boundary.test.ts`.
    - `MAIN_THREAD_ACTIONABILITY_GATE`: Verified responsive UI interactions while benchmark search is active in `tests/e2e/research-mode.spec.ts`.
    - `BENCHMARK_CANCELLATION_GATE`: Host-side `worker.terminate()` closes Worker, produces terminal `CANCELLED` state, and spawns zero replacement workers (`totalBenchmarkWorkersCreated === 1`).
    - `STATIC_CONFIG_VALIDATION_GATE`: Main-thread static validation triggers UI errors and spawns zero workers on invalid inputs.
    - `WORKER_CONFIG_ERROR_GATE`: Worker-side corpus capacity validation handles resource overflow via structured `CONFIG_ERROR` message.
    - `RESULT_SUMMARY_GATE`: Renders exact metadata cards (`Suite ID`, `Sampled Cases`, `Measured Trials`, `Platform: browser`), per-algorithm summary metrics, and by-depth table.
    - `JSON_CSV_DOWNLOAD_GATES`: Client-side Blob generation triggers valid JSON and 14-column RFC-4180 CSV downloads with sanitized filenames.
    - `PLAY_RESEARCH_ISOLATION_GATE`: Play session history, move state, and 3D cube visual state preserved without mutation across Research Mode entry and benchmark execution.
    - `RAW_WEBGL_CANVAS_ORACLE_GATE`: Exact decoded RGBA bitmap equality via direct `HTMLCanvasElement` capture (`canvas.toDataURL('image/png')` drawn to a temporary 2D canvas and compared via `getImageData()`) proves identical WebGL canvas rendering pre- and post-Research Mode lifecycle (`differingPixels: 0`, `maxChannelDelta: 0`, `diffBoundingBox: null`).
    - `MODE_SWITCH_CANCELLATION_GATE`: Switching to Play mode during an active benchmark terminates the background Worker and restores clean presentation.
    - `RESPONSIVE_RESEARCH_LAYOUT_GATE`: Verified layout bounds and non-overflow across Desktop (1280x800), Tablet (768x1024), and Mobile (375x667) viewports in `tests/e2e/research-mode.spec.ts`; the M1 mode-stability gate adds short-landscape Research coverage.
    - *Verification Snapshot (Technical Head `8bc1d51`):* 52 boundary tests, 32 controller unit tests, 12 Research Mode E2E tests, 40 total Playwright E2E tests, and 444 workspace tests passing.

### Level 9: Browser End-to-End Tests (Playwright — Available / Implemented)
- **Scope:** Whole Web Application (`playwright.config.ts`, `tests/e2e/play-mode.spec.ts`, `tests/e2e/solve-mode.spec.ts`, `tests/e2e/research-mode.spec.ts`, `tests/e2e/responsive-navigation.spec.ts`)
- **Focus:** User interaction flows and state validation in real browser environments.
- **Infrastructure Architecture:**
  - Pinned `@playwright/test@1.62.1` devDependency at repository root.
  - Permanent project matrix: `chromium`, `firefox`, and `webkit` (desktop, tablet portrait, mobile portrait, and compact landscape coverage; Chromium also runs the touch-emulation gate).
  - Test inventory: 50 logical tests (26 Play, 9 Solve, 13 Research, 2 M1) × 3 browser projects = 150 project-test cases: 148 applicable executions and 2 intentional Chromium-only touch skips (Firefox/WebKit). This inventory is not a pass count.
  - On GitHub-hosted Linux CI, Firefox E2E runs headed under Xvfb with a CI-only WebGL2 enablement preference. WebKit is verified via Playwright automation; Safari has not been separately verified.
  - Dedicated isolated webServer: `npm run dev --workspace=@gearcube/web -- --port 4173 --strictPort --host 127.0.0.1` on `http://127.0.0.1:4173` with `reuseExistingServer: false`.
  - Execution command: `npm run test:e2e` (`playwright test`).
- **Invariants Tested (Behavioral / DOM-Level Assertions):**
  - Viewport, controls, and canvas render cleanly on initial app load.
  - Face move button clicks commit single entries in the timeline upon completion.
  - TWO_STEP midpoint lock and cancel create zero history entries.
  - TWO_STEP and DIRECT_180 completions create exactly one canonical history entry.
  - Undo and Redo buttons navigate history and update UI indicators.
  - Executing new move after Undo truncates future redo branch.
  - Clicking any chip in timeline scrubber navigates to that exact step.
  - "Back to baseline" navigates to cursor -1 while preserving redo chips.
  - Seeded scramble input produces reproducible sequence, preserves Direct 180 mode, and resets baseline without creating individual move entries.
  - Keyboard shortcuts (`u/d/f/b/r/l`, Shift, Control+Z, Meta+Z, Control+Shift+Z, Meta+Shift+Z, Control+Y) trigger moves and undo/redo while rejecting unsupported modifiers (`Meta+Y`, `Ctrl+u`, `Alt+u`).
  - Input focus exclusion: typing in seed text input and pressing `Ctrl+Z`/`Meta+Z` while focused does not trigger puzzle moves or history navigation.
  - Busy-state blocking:
    - **Active Animation:** all move controls, history navigation, mode toggle, and scramble buttons are disabled.
    - **HALF_TURN_LOCKED:** only staged-face Finish and Reverse buttons/shortcuts are actionable; unrelated face moves, history, mode toggle, and scramble buttons are disabled; seed text input remains enabled and editable.
  - Responsive layout: six isolated `E2E_RESPONSIVE_LAYOUT_FLOW` cases cover 1440x900, 768x1024, 1024x768, 375x667, 390x844, and 667x375 with fresh pages and independent test budgets. Each preserves panel geometry, overflow, collision, and control actionability checks; repeated canvas interactions and half-turn animations no longer share one six-viewport timeout.
  - Compact interaction: `E2E_RESPONSIVE_CANVAS_INPUT` at 667x375 proves close/reopen, unavailable closed controls, canvas hit-testing, actual pointer/wheel receipt, and Space-key disclosure. `E2E_RESPONSIVE_HALF_TURN` at 375x667 proves locked-layout bounds/non-overlap, editable seed, enabled Finish/Reverse controls, and reverse-to-IDLE without a history entry.
  - M1 mode stability: Play/Solve/Research presentation remains usable through 390x844 ↔ 844x390 and 768x1024 ↔ 1024x768 transitions; closed controls remain hidden and non-focusable, Research remains internally scrollable, and Solve playback remains reachable.
  - Touch emulation: Chromium with `hasTouch: true` exercises touch disclosure, canvas pointer input, and short-height drawer scrolling without treating emulation as real-device evidence.
  - Zero unhandled console/runtime errors (`pageerror` and error-level console messages).

#### Responsive contract ownership

| Contract | Maintained gate |
| :--- | :--- |
| A/B/C: viewport geometry, no-overflow, panel collision | Six Play `E2E_RESPONSIVE_LAYOUT_FLOW` cases; desktop retains overlay collision checks, compact cases bound the drawer and all four control columns. |
| D/E/F: drawer disclosure, canvas hit target, pointer/wheel actionability | Play `E2E_RESPONSIVE_CANVAS_INPUT` retains actual input at 667x375; M1 mode/resize additionally checks hit targets and hidden-control focus after transitions. |
| G: narrow HALF_TURN controls and cancellation | Play `E2E_RESPONSIVE_HALF_TURN` at 375x667 replaces the repeated equivalent phone animations. |
| H/J: resize/orientation and Play/Solve/Research transitions | `RESPONSIVE_M1_MODE_RESIZE_GATE` remains unchanged, including Enter-key disclosure, hidden focus, Research scrolling, and Solve playback reachability. |
| I: touch input and drawer scrolling | Chromium-only `TOUCH_EMULATION_GATE` remains unchanged. |

Repeated compact disclosure/hit checks in the old six-viewport loop are consolidated into the representative input gate and the stronger M1 transition gate. No viewport, console gate, timeout, or retry policy is removed or relaxed.

- **Assertion Principle:** `PLAYWRIGHT_PIXEL_PERFECT_ASSERTIONS: NO` and `RENDERER_PIXELS_USED_AS_STATE_ORACLE: NO` (general Play and Solve Mode interaction tests verify DOM interactions, disabled states, and text/attribute state indicators rather than full-compositor pixel screenshots; Phase 5D includes a single supplemental raw WebGL `HTMLCanvasElement` bitmap comparison oracle strictly for verifying Play/Research visual state preservation without modifying general UI assertion principles).
- **Complementary Acceptance Roles:**
  - **Playwright E2E (`npm run test:e2e`):** Repeatable, repository-owned deterministic regression suite covering automated DOM interaction flows and error-free execution.
  - **Chrome DevTools MCP:** Interactive live browser acceptance covering 3D WebGL rendering, orbit controls, zoom gestures, pointer overlay isolation, and visual layout checks.

### Android Emulator Runtime Qualification (M4 — Manual / On-Demand)

This is a separate runtime qualification layer from the hosted Playwright CI matrix. It is manual/on-demand evidence, not an additional required GitHub status check and not a replacement for the automated desktop browser baseline.

- **Accepted connection path:** Explicit Android emulator ADB serial → Android Chrome → `chrome_devtools_remote` → serial-specific ADB forward → Playwright `1.62.1` `chromium.connectOverCDP()`. The experimental Playwright `AndroidDevice` path was not the accepted path.
- **Shared-host boundary:** Both environments ran on one Windows host in Android Emulator instances using host-backed graphics through the same NVIDIA RTX 3060 path. They are not independent hosts or physical devices.

| Environment | Android runtime / profile | Chrome | Observed portrait metrics |
| :--- | :--- | :--- | :--- |
| Env A — `Pixel_7` | Android 15 / API 35, x86_64, phone-class | `124.0.6367.219` | About `412×783` CSS px, DPR `2.625` |
| Env B — `Small_Phone` | Android 16 / API 36, x86_64, phone-class | `151.0.7922.139` | About `360×536` CSS px, DPR `2` |

- **M4B live-runtime scope:** The live Pages site loaded through actual Android Chrome in both environments. Qualification covered portrait and landscape orientation, touch/coarse input, no blocking horizontal overflow in the qualified flows, WebGL2, rendered scene output, the canonical `U+` move, and undo back to solved. No application JavaScript, page, console, or network fatal errors were observed. These are Android emulator observations, not physical-device, tablet, or native Safari evidence.
- **M4C deterministic scope:** Two fresh runs per environment exercised Play, Solver, and Research. Play used seed `abc`, preserved the Direct180 mode, began with the same 20-move preview (`B+ U+ L+ R+ F- L+...`), kept history at `0 / 0`, and remained unsolved. Solver used the real solver Worker; all four runs solved at depth 6, with playback `0 / 6`, full playback solved, and correct step-back/step-forward behavior. The observed move sequence `U F' U D R B` is observational only, not a frozen tie-break oracle; the contract is correctness, depth, and playback behavior.
- **Research determinism:** The real Benchmark Worker ran `suiteId/seed = e2e-browser-fast`, depths `[1]`, 2 cases, warmup `0`, measured `1`, and BFS/BiBFS/IDA*. Across the four runs it completed 2 cases and 6 trials, with two trials per algorithm/depth, 2 solved, 0 limits, and the required schema/metadata. Timing values are observational and excluded from the deterministic contract.

### Level 10: Performance & Responsiveness Regression (Deferred / Future Performance Characterization)
- **Scope:** Production Web Bundle
- **Focus:** Quantitative frame budget and compute latency benchmarking against proposed non-binding performance targets.
- **Invariants / Targets (Non-Binding):**
  - 3D rendering responsiveness targets $\ge 55 \text{ FPS}$ during continuous rotation animations on reference testing profiles.
  - UI main thread responsiveness stays $< 16 \text{ ms}$ during active solver worker execution.
- **Characterization Note:** Phase 5 benchmark and browser research acceptance established thread isolation, asynchronous non-blocking worker execution, and responsive UI interaction during active search. Phase 5 acceptance does NOT establish a universal FPS guarantee, $< 16 \text{ ms}$ guarantee, or sub-millisecond execution guarantee across uncalibrated hardware environments.

### Level 11: ML Model Evaluation & Reproducibility (Python / PyTorch — Future Phase 6)
- **Scope:** `ml/`
- **Focus:** Heuristic value accuracy and training stability.
- **Invariants Tested:**
  - Value network predicts $V(S_{\text{solved}}) = 0.0$.
  - Monotonicity: For any state $S$, predicted cost satisfies $V(S) \le V(\text{applyMove}(S, M)) + 1$.
  - Seeded training runs yield validation loss within $\pm 1\%$ tolerance.

### Level 12: Vision State Validation & Error Correction Tests (Future Phase 7)
- **Scope:** `packages/vision`
- **Focus:** Webcam frame segmentation, color classification, state consistency validation, and user correction.
- **Invariants Tested:**
  - Synthetic noisy test images correctly classify sticker colors under brightness shifts.
  - Detected configurations with validation errors prompt the user for manual correction rather than corrupting domain state.

---

## 4. Test Tooling & Commands Roadmap

| Test Category | Target Framework | Execution Command | Status |
| :--- | :--- | :--- | :--- |
| **Pure Unit & Core Invariants** | Vitest | `npm run test` (or `npx vitest run packages/core`) | Available |
| **Kinematics Math Tests** | Vitest | `npx vitest run packages/kinematics` | Available |
| **Renderer & Animation Tests** | Vitest | `npx vitest run apps/web` | Available |
| **History & Scramble Tests** | Vitest | `npx vitest run apps/web/src/components/history` | Available (Accepted in Phase 3A/3B) |
| **Browser E2E Tests** | Playwright | `npm run test:e2e` | Available (Implemented in Phase 3C) |
| **Solver Foundation, Oracle & BFS Solvers** | Vitest | `npx vitest run packages/solvers` | Available (Phase 4A & Phase 4B Accepted) |
| **Worker Controller / Browser Worker Tests** | Vitest + Playwright | `npx vitest run apps/web/src/components/solver` / `npm run test:e2e` | Available (Accepted in Phase 4D/4E) |
| **Performance Profiling** | Vitest / Custom | `npm run test:perf` | Planned (Phase 5) |
| **ML Training & Heuristics** | pytest (uv) | `uv run pytest ml/tests/` | Planned (Phase 6) |
| **Full Continuous Integration Suite** | All | `npm run verify` | Available |
