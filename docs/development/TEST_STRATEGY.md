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
- **Scope:** `packages/core/src/transitions.ts`, `packages/core/src/transition-data.ts`
- **Focus:** Canonical move transitions, golden vector precision, independent oracle equivalence, and move algebra invariants.
- **Invariants Tested (Implemented & Verified in Phase 1C):**
  - **12 Solved-State Golden Vectors:** Bit-for-bit match against authoritative physical/canonical derivations for all 12 directed moves from `SOLVED_GEAR_CUBE_STATE`.
  - **Single-Step Transition Closure:** $497,664 / 497,664$ transitions ($41,472 \text{ states} \times 12 \text{ moves}$) produce valid canonical `GearCubeState` instances with 0 failures.
  - **Direct vs Independent Reference Oracle Equivalence:** $497,664 / 497,664$ production transitions match an independently derived physical/canonical test oracle with 0 mismatches.
  - **Inverse Move Cancellation:** $\text{applyMove}(\text{applyMove}(S, M), \text{inverseMove}(M)) = S$ for all $497,664$ state-move pairs with 0 failures.
  - **12-Repeat Identity:** For every canonical state and directed move, applying the move 12 consecutive times returns the initial state ($M^{12}(S) = S$).
  - **Opposing Face Commutativity:** $U \cdot D = D \cdot U$, $F \cdot B = B \cdot F$, $R \cdot L = L \cdot R$.
  - **Defensive Input Validation & Anti-Aliasing:** Deterministic state-first `TypeError` rejection on malformed inputs; immutable inputs with fresh outer and slice object allocation on all valid calls.
  - *(Note: Whole-domain BFS reachability traversal visiting exactly 41,472 states is deferred to Phase 1E).*


### Level 3: Coordinate Domain & Materializer Consistency
- **Scope:** `packages/core/src/validation.ts`, `packages/core/src/materializer.ts`
- **Focus:** Domain coordinate validity and derived physical placement mapping.
- **Invariants Tested:**
  - Corner permutations strictly within $S_4$ ($|S_4| = 24$) with $96 \leftrightarrow 24 \times 4$ `SpatialFrame` bijection.
  - Edge slice permutations strictly within Klein four-group $V_4$ ($|V_4| = 4$).
  - Edge gear phase indices strictly within $\mathbb{Z}_3 = \{0, 1, 2\}$.
  - Full-state materializer determinism: $\text{normalizePhysicalState}(\text{materializeState}(S, f)) = (S, f)$ produces idempotent, pure round-trips for all $165,888$ expanded fixed-spatial states ($41,472 \times 4$) without mutating canonical domain state.

### Level 4: Kinematic Trajectory Math Tests
- **Scope:** `packages/kinematics`
- **Focus:** Continuous angular interpolation and gear coupling equations.
- **Invariants Tested:**
  - At $p = 0.0$, trajectory transforms match `fromState` piece placement.
  - At $p = 1.0$, trajectory transforms precisely match `toState` piece placement.
  - Angular coupling ratios strictly enforced: Outer face rotates $180^\circ \cdot p$, middle slice rotates $90^\circ \cdot p$, edge gear cogs rotate $60^\circ \cdot p$.
  - Kinematics engine never mutates or stores discrete state truth.

### Level 5: 3D Renderer & Viewport Isolation Tests
- **Scope:** `packages/renderer`
- **Focus:** Headless Three.js canvas setup, visual skin binding, lighting configuration.
- **Invariants Tested:**
  - Switching visual skins does not alter mesh group hierarchies or domain state.
  - Scene graph garbage collection: disposing meshes frees GPU buffers without memory leaks.

### Level 6: Web Worker Asynchronous Protocol Tests
- **Scope:** `packages/solvers`
- **Focus:** Message passing between main thread and worker threads.
- **Invariants Tested:**
  - Worker responds with `PROGRESS` telemetry within $100 \text{ ms}$ of search initiation.
  - `CANCEL_SOLVE` message cleanly aborts ongoing search and terminates worker loop.

### Level 7: Deterministic Solver Search Correctness
- **Scope:** `packages/solvers`
- **Focus:** Algorithm verification on standardized test scrambles.
- **Invariants Tested:**
  - BFS returns strictly shortest-path solutions on test depths.
  - Bidirectional BFS returns solutions matching BFS length on symmetric test problems.
  - IDA* returns solutions identical in length to BFS when using admissible heuristics.
  - Solved states yield 0-move solutions immediately.

### Level 8: Seeded Benchmark Determinism & Metrics
- **Scope:** `packages/benchmark`
- **Focus:** Empirical repeatability of research runs.
- **Invariants Tested:**
  - Running a benchmark suite twice with seed `1337` produces bit-for-bit identical node expansion counts and solution paths.

### Level 9: Browser End-to-End Tests (Playwright)
- **Scope:** Whole Web Application
- **Focus:** User interaction flows in real headless browser environments.
- **Invariants Tested:**
  - Clicking face turn buttons rotates the 3D model and updates move history.
  - Clicking "Undo" steps the 3D cube and UI state backward reliably.
  - Solution playback controls correctly step through solution paths.

### Level 10: Performance & Responsiveness Regression
- **Scope:** Production Web Bundle
- **Focus:** Frame budget and compute latency against proposed targets.
- **Invariants Tested:**
  - 3D rendering responsiveness targets $\ge 55 \text{ FPS}$ during continuous rotation animations on reference testing profiles.
  - UI main thread responsiveness stays $< 16 \text{ ms}$ during active solver worker execution.

### Level 11: ML Model Evaluation & Reproducibility (Python / PyTorch)
- **Scope:** `ml/`
- **Focus:** Heuristic value accuracy and training stability.
- **Invariants Tested:**
  - Value network predicts $V(S_{\text{solved}}) = 0.0$.
  - Monotonicity: For any state $S$, predicted cost satisfies $V(S) \le V(\text{applyMove}(S, M)) + 1$.
  - Seeded training runs yield validation loss within $\pm 1\%$ tolerance.

### Level 12: Vision State Validation & Error Correction Tests
- **Scope:** `packages/vision`
- **Focus:** Webcam frame segmentation, color classification, state consistency validation, and user correction.
- **Invariants Tested:**
  - Synthetic noisy test images correctly classify sticker colors under brightness shifts.
  - Detected configurations with validation errors prompt the user for manual correction rather than corrupting domain state.

---

## 4. Test Tooling & Commands Roadmap

*(The following commands represent future intended test execution workflows once Phase 1+ dependencies are bootstrapped.)*

| Test Category | Target Framework | Future Execution Command |
| :--- | :--- | :--- |
| **Pure Unit & Core Invariants** | Vitest | `npm run test:core` |
| **Solver & Worker Tests** | Vitest | `npm run test:solvers` |
| **Kinematics Math Tests** | Vitest | `npm run test:kinematics` |
| **Browser E2E Tests** | Playwright | `npm run test:e2e` |
| **Performance Profiling** | Vitest / Custom | `npm run test:perf` |
| **ML Training & Heuristics** | pytest (uv) | `uv run pytest ml/tests/` |
| **Full Continuous Integration Suite** | All | `npm run test:all` |
