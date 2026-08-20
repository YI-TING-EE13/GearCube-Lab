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

### Level 1: Pure Core Unit Tests
- **Scope:** `packages/core`
- **Focus:** Basic state initialization, solved state recognition (`isSolved(initialState) === true`), move dispatching.
- **Invariants Tested:**
  - Applying zero moves leaves state unchanged.
  - State objects are deeply immutable (modifications throw or create new instances).
  - State serialization produces identical canonical strings for identical states.

### Level 2: Group Theory Invariants & Move Inverses
- **Scope:** `packages/core`
- **Focus:** Move algebra and group closure properties.
- **Invariants Tested (Upon Phase 0B empirical verification):**
  - Inverse move cancellation: $\text{applyMove}(\text{applyMove}(S, M), M^{-1}) = S$.
  - Periodicity: For any face $F$, applying $(F)^{N_{\text{period}}} = I$, where $N_{\text{period}}$ is empirically determined in Phase 0B.
  - Commutativity checks on opposing faces: $U \cdot D = D \cdot U$.

### Level 3: Invalid State & Boundary Consistency Validation
- **Scope:** `packages/core/src/validation.ts`
- **Focus:** Rejection of impossible physical configurations.
- **Invariants Tested:**
  - Permuting a single corner without corresponding edge gear adjustments is flagged as invalid.
  - Edge gear phase indices exceeding physical limits $[0, N_{\text{max}}]$ throw validation errors.

### Level 4: Kinematic Trajectory Math Tests
- **Scope:** `packages/kinematics`
- **Focus:** Continuous interpolation functions and gear coupling equations.
- **Invariants Tested:**
  - At $t = 0.0$, trajectory transforms match starting state.
  - At $t = 1.0$, trajectory transforms precisely match target state.
  - Gear angular velocity ratios maintain continuous gearing contact without sudden angular jumps ($C^1$ continuity).

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
