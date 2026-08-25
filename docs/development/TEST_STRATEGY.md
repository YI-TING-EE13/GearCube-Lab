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

### Level 8: Seeded Benchmark Determinism & Metrics
- **Scope:** `packages/benchmark` (Future Phase 5)
- **Focus:** Empirical repeatability of research runs.
- **Invariants Tested:**
  - Running a benchmark suite twice with seed `1337` produces bit-for-bit identical node expansion counts and solution paths.

### Level 9: Browser End-to-End Tests (Playwright — Available / Implemented)
- **Scope:** Whole Web Application (`playwright.config.ts`, `tests/e2e/play-mode.spec.ts`)
- **Focus:** User interaction flows and state validation in real headless browser environments.
- **Infrastructure Architecture:**
  - Pinned `@playwright/test@1.62.1` devDependency at repository root.
  - Project configuration: `chromium` only (desktop, tablet portrait, mobile portrait viewports).
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
  - Responsive layout: primary controls remain accessible and non-overlapping across desktop, tablet portrait, and mobile portrait viewports with zero horizontal document overflow and verified vertical clearance between timeline scrubber and bottom move panel during both IDLE and HALF_TURN_LOCKED states.
  - Zero unhandled console/runtime errors (`pageerror` and error-level console messages).
- **Assertion Principle:** `PLAYWRIGHT_PIXEL_PERFECT_ASSERTIONS: NO` and `RENDERER_PIXELS_USED_AS_STATE_ORACLE: NO` (assertions verify DOM interactions, disabled states, and text/attribute state indicators; not WebGL canvas pixels).
- **Complementary Acceptance Roles:**
  - **Playwright E2E (`npm run test:e2e`):** Repeatable, repository-owned deterministic regression suite covering automated DOM interaction flows and error-free execution.
  - **Chrome DevTools MCP:** Interactive live browser acceptance covering 3D WebGL rendering, orbit controls, zoom gestures, pointer overlay isolation, and visual layout checks.

### Level 10: Performance & Responsiveness Regression (Future Phase 5)
- **Scope:** Production Web Bundle
- **Focus:** Quantitative frame budget and compute latency benchmarking against proposed performance targets.
- **Invariants Tested:**
  - 3D rendering responsiveness targets $\ge 55 \text{ FPS}$ during continuous rotation animations on reference testing profiles.
  - UI main thread responsiveness stays $< 16 \text{ ms}$ during active solver worker execution.
- **Phase 4 Preflight Note:** Quantitative FPS and $< 16 \text{ ms}$ latency measurements belong to Phase 5 performance and benchmark testing. Phase 4 correctness acceptance proves Web Worker thread isolation, main-thread actionability during active search, and stale-result protection.

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
