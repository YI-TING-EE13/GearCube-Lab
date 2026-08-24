# ROADMAP.md — Project Lifecycle & Dependency-Ordered Milestones

> **Current Milestone:** `Phase 3 — Interactive UI, History, Undo/Redo, and Scramble (Planning / Ready for Independent Acceptance)`
> **Previous Milestone:** `Phase 2 — 3D Graphics & Kinematic Animation (Completed & Accepted)`

---

## 1. Roadmap Lifecycle Overview

```text
[ Phase 0A: Governance & Design Baseline ] (Accepted)
      │
      ▼
[ Phase 0B: Reference Model Adoption & Contract Synthesis ] (Accepted)
      ├─ 0B.1: Physical Characterization Protocol (Accepted; Optional Tooling)
      ├─ 0B.2: Standard Gear Cube Reference Specification (Accepted)
      ├─ 0B.3: Discrete & Kinematic Contract Synthesis (Accepted)
      └─ 0B.4: Final Cross-Contract Audit (Accepted)
      │
      ▼
[ Phase 1: Discrete Domain Core Engine ] (Completed & Accepted)
      ├─ 1A: Project Bootstrap & Core Package Boundary (Accepted)
      ├─ 1B: Canonical State / Value Types & Validation (Accepted)
      ├─ 1C: Move Transition Engine & Action Algebra (Accepted Baseline)
      │     └─ ADR-0005 Canonical Transition Repair (Accepted & Committed)
      ├─ 1D: Coordinate Views & Structural Codecs (Completed & Accepted)
      └─ 1E: Group Invariants & Reachable State Closure (Completed & Accepted)
      │
      ▼
[ Phase 2: 3D Graphics & Kinematic Animation ] (Completed & Accepted)
      ├─ 2A: Pure Kinematic Engine & Static Projection (Completed & Accepted)
      ├─ 2B: Modular 3D Geometry & R3F Viewport (Completed & Accepted)
      ├─ 2C: Move Animation & Face Controls (Completed & Accepted)
      ├─ 2D: Physical Two-Step Turn Staging (Completed & Accepted)
      └─ 2E: Turn Interaction Mode Toggle (Completed & Accepted)
      │
      ▼
[ Phase 3: Interactive UI, History & Scramble ] (Active Planning)
      ├─ 3 Preflight: Architecture & Test Documentation Sync (Completed & Accepted)
      ├─ 3A: Application History & Deterministic Scramble Engine (Completed & Accepted)
      ├─ 3B: Interactive Play Store, Undo/Redo & Timeline Scrubber UI (Completed & Accepted)
      └─ 3C: Keyboard Controls, Responsive Layout & Playwright Browser E2E (Planned / Unblocked)
      │
      ▼
[ Phase 4: Classical Solver Infrastructure ]
      │
      ▼
[ Phase 5: Research & Benchmarking Harness ]
      │
      ▼
[ Phase 6: Neural Heuristic & AI-Guided Search ]
      │
      ▼
[ Phase 7: Computer Vision State Ingestion ]
      │
      ▼
[ Phase 8: System Polish, Verification & v1.0 Release ]
```

---

## 2. Detailed Phase Specifications

---

### Phase 0A: Project Governance & Canonical Design Baseline
- **Objective:** Establish the canonical design documentation, type contracts, testing strategies, and agent operational rules.
- **Prerequisites:** Initial repository creation.
- **In-Scope:** `README.md`, `AGENTS.md`, `.gitignore`, and full documentation tree under `docs/`.
- **Out-of-Scope:** Any source code (`src/`), React/Vite scaffolding, dependency installations, or solver algorithms.
- **Deliverables:**
  - Standard `.gitignore`
  - Canonical `README.md` and `AGENTS.md`
  - 8 authoritative technical documents in `docs/`
- **Verification Commands:** `git diff --check`, link validation, document consistency audit.
- **Acceptance Gate Criteria (`PHASE_0A_PASS`):**
  - [x] All 8 required documents in `docs/` exist and contain no empty placeholders.
  - [x] Unverified mechanical properties explicitly tagged as `OPEN` / `TO VERIFY`.
  - [x] Zero application source code or dependencies committed.
- **Documentation Sync Checklist:** Update `docs/README.md` and `docs/development/ROADMAP.md`.

---

### Phase 0B: Reference Model Adoption & Contract Synthesis

Phase 0B is partitioned into four dependency-ordered subphases:

#### Phase 0B.1: Physical Characterization Protocol (Accepted — Optional Validation Tooling)
- **Objective:** Design reproducible, observation-first, non-destructive experimental protocols, observation templates, and execution batching for physical puzzle evaluation.
- **Status:** `ACCEPTED` (Commit `a1e538c`). Retained for optional future Daiso fidelity and comparative hardware validation.
- **Deliverables:**
  - `docs/characterization/PHYSICAL_CHARACTERIZATION_PROTOCOL.md`
  - `docs/characterization/OBSERVATION_TEMPLATE.md`

#### Phase 0B.2: Standard Gear Cube Reference Specification (Accepted)
- **Objective:** Adopt the published mechanical, combinatorial, and mathematical rules of the standard/original Gear Cube (Oskar van Deventer / Meffert's design) as the canonical MVP puzzle model.
- **Status:** `ACCEPTED` (Commit `b1139c1`).
- **Deliverables:**
  - `docs/reference/STANDARD_GEAR_CUBE_SPEC.md`
  - `docs/decisions/ADR-0002-STANDARD-GEAR-CUBE-REFERENCE.md`

#### Phase 0B.3: Discrete & Kinematic Contract Synthesis (Accepted)
- **Objective:** Translate the adopted standard reference specification into implementation-ready conceptual contracts, state schemas, move algebra rules, derived piece placement views, and continuous kinematic trajectories.
- **Status:** `ACCEPTED` (Commit `553c556`).
- **Prerequisites:** Completion and acceptance of Phase 0B.2.
- **In-Scope:** `docs/architecture/GEAR_CUBE_STATE_MODEL.md`, `docs/architecture/KINEMATIC_CONTRACT.md`, `docs/decisions/ADR-0003-CORE-STATE-REPRESENTATION.md`, candidate updates to `docs/architecture/PUZZLE_CONTRACTS.md`, `SYSTEM_ARCHITECTURE.md`, `TEST_STRATEGY.md`.
- **Out-of-Scope:** Production software coding.
- **Deliverables:**
  - `docs/architecture/GEAR_CUBE_STATE_MODEL.md`
  - `docs/architecture/KINEMATIC_CONTRACT.md`
  - `docs/decisions/ADR-0003-CORE-STATE-REPRESENTATION.md`
- **Verification:** Mathematical group closure checks, exhaustive reachable-state traversal ($41,472$), inverse round-trips, link validation.
- **Acceptance Gate Criteria (`PHASE_0B3_PASS`):**
  - [x] Canonical readable state schema defined and mapped to $4!(4\cdot 3)^3 = 41,472$ decomposition.
  - [x] Exact 12-move transition table formalized and verified with 0 closure or inverse failures.
  - [x] Exhaustive reachable state count verified at exactly 41,472.
  - [x] Derived non-authoritative `PiecePlacementView` and `StateCodec` boundaries specified.
  - [x] Continuous kinematic trajectories parameterized by mechanical progress $p \in [0, 1]$ specified for all 12 moves.

#### Phase 0B.4: Final Cross-Contract Audit (Accepted)
- **Objective:** Independent architectural review and cross-contract consistency audit of the synthesized puzzle contracts before commencing Phase 1 software implementation.
- **Status:** `ACCEPTED`.
- **Prerequisites:** Completion of Phase 0B.3.
- **Deliverables:** Phase 0B.4 cross-contract audit report.
- **Acceptance Gate Criteria (`PHASE_0B4_PASS`):**
  - [x] Formal sign-off on discrete `GearCubeState`, `Move`, `PiecePlacementView`, and `KinematicPlan` contracts.
  - [x] Zero unverified mechanical assumptions promoted to test oracles without evidence.

---

### Phase 1: Discrete Domain Core Engine (Completed & Accepted)
- **Objective:** Implement the pure TypeScript combinatorial state engine, move validator, and coordinate model.
- **Prerequisites:** Completion of Phase 0B.

#### Phase 1A: Project Bootstrap & Core Package Boundary (Completed & Accepted)
- Package boundary isolation, zero-dependency pure Core setup, workspace verification scripts.

#### Phase 1B: Canonical State / Value Types & Validation (Completed & Accepted)
- Canonical value collections (`FACES`, `DIRECTIONS`, `CORNER_CONFIGURATIONS`, `SLICE_PERMUTATION_CLASSES`, `SLICE_GEAR_PHASES`), derived literal types, exact own-key validation guards (`isFace`, `isDirection`, `isMove`, `isCornerConfiguration`, `isSlicePermutationClass`, `isSliceGearPhase`, `isEdgeSliceCoordinate`, `isGearCubeState`), static constants, `SOLVED_GEAR_CUBE_STATE`, `equalsGearCubeState`, `isSolved`, and 41,472 Cartesian domain cardinality verification.

#### Phase 1C: Move Transition Engine & Action Algebra (Historical Baseline & Supersession)
- Direct canonical move application (`applyMove`), $O(1)$ precomputed transition tables (`transition-data.ts`), exact 12 solved-state golden vectors, input validation, output anti-aliasing, 497,664 transition closure, 497,664 inverse round-trips, and 12-repeat identity.
- **Supersession & Repair Notice:** The original Phase 1C baseline evaluated $D, B, L$ moves under a body-fixed assumption without reference-frame normalization. Corrective decision [`ADR-0005`](../decisions/ADR-0005-CANONICAL-MOVE-TRANSITION-ALGEBRA.md) adopted reference-normalized canonical move transition algebra. The transition tables and test oracles were repaired and committed in commit `59f0313c2ce1c513f80d967d3f78cd86f7870003` (`Repair canonical move transitions`), achieving $497,664 / 497,664$ canonical oracle equivalence ($248,832 / 248,832$ $U/F/R$ non-regression and $248,832 / 248,832$ $D/B/L$ correction).

#### Phase 1D: Coordinate Views & Structural Codecs (Completed & Accepted)
- Derived `PiecePlacementView` materialization (`materializeState`), quotiented center placement (`CenterPlacement` with `{ slot, pieceId }` pursuant to accepted [`ADR-0004`](../decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md)), Model A center identity derivation, `SpatialFrame` orientation lifecycle (`nextSpatialFrame`), and strict canonical logical serialization (`serializeLogicalState`, `deserializeLogicalState`).
- **Status:** `ACCEPTED & COMMITTED` (Commit `e31cd87b0db153140d9c4780ac2b7f4953d294d0`). Successfully integrated and verified with 165,888/165,888 materialization recoveries, 1,990,656/1,990,656 lifecycle transitions verified against independent physical oracle, and 41,472/41,472 serialization round-trips with zero dependency drift.

#### Phase 1E: Group Invariants & Exhaustive Reachable State Closure (Completed & Accepted)
- Exhaustive BFS traversal ($41,472 / 41,472$ states reachable from solved), reachable-set 12-move graph closure ($497,664 / 497,664$), per-directed-move domain bijections ($12 / 12$), derived strong connectedness, and canonical directed move metric distance characterization (diameter 8).
- **Status:** `ACCEPTED & COMMITTED` (Commit `ac91e8cde3deae0ecbe18ed3b3accf384e3e3694`). Formalized in [`packages/core/tests/core-reachability.test.ts`](../../packages/core/tests/core-reachability.test.ts) (6 tests passing in 2.96s; full repository verify passing 10 test files and 123 tests).

---

### Phase 2: 3D Model, Visual Assets, and Kinematic Animation Engine (Completed & Accepted)
- **Objective:** Scaffolding Vite + React + Three.js / R3F, implementing modular 3D gear geometry, and coupling visual motion via kinematic trajectory planning.
- **Status:** `COMPLETED & ACCEPTED` — All subphases (2A, 2B, 2C, 2D, 2E) completed, verified, and accepted on `main` at `a4bbc09866a9ed46c881b5fb0db66b97494d0607`.
- **Prerequisites:** Completion of Phase 1 (`ACCEPTED & COMMITTED`).

#### Phase 2A: Pure Kinematic Engine & Static Projection (Completed & Accepted)
- **Objective:** Implement pure TypeScript kinematic trajectory generator and static piece placement projection without framework dependencies.
- **Status:** `ACCEPTED & COMMITTED` (Commit `de0aa15ee3ab050ccb943b9b0efd9e98fdf03a85`)
- **Deliverables:**
  - Package `@gearcube/kinematics` (`packages/kinematics`) with zero runtime dependencies other than `@gearcube/core`.
  - Static projection `placementToTransforms(view)` emitting exactly 26 `ComponentTransform`s in `STABLE_COMPONENT_ID_ORDER` (8 corners, 12 edges, 6 centers).
  - View-based continuous trajectory planner `planKinematics(fromView, move, toView)` evaluated purely as a function of progress $p \in [0, 1]$.
  - Physical radial spin axis model $\hat{r} = \frac{\vec{r}_{\text{slot}}}{\|\vec{r}_{\text{slot}}\|}$ and $C_2$ ($180^\circ$) edge gear axial quotient.
- **Verification Evidence:**
  - `KINEMATICS_PURITY_GATE`: `PASS` (`@gearcube/core` sole dependency, no DOM/Node globals, no framework dependencies).
  - `CORNER_MAPPING_GATE`: `32 / 32 PASS` (all reachable pairs map to canonical quaternions with 0 conflicts).
  - `EDGE_MAPPING_GATE`: `144 / 144 PASS` (all reachable keys map to canonical orientations modulo $C_2$).
  - `EDGE_PHASE_DECOMPOSITION_GATE`: `144 / 144 PASS` (decomposes into $q_{\text{base}}$ and $q_{\text{spin}}$ around radial axis).
  - `CENTER_MAPPING_GATE`: `6 / 6 PASS` (all canonical center quaternions map local $+Y$ to outward face normal).
  - `SCRAMBLE_CORE_UNIQUENESS_GATE`: `10 / 10 PASS` (verified with `serializeLogicalState` and `SOLVED_GEAR_CUBE_STATE`).
  - `PHASE2A_PHYSICAL_TRANSITION_GATE`: `528 / 528 PASS` (48 solved + 480 scrambled transitions across all 4 SpatialFrames and 12 moves).
  - Root verification (`npm run verify`): 12 test files, 136 tests passed, clean workspace typecheck and web build.

#### Phase 2B: Modular 3D Geometry, Visual Meshes & R3F Viewport (Completed & Accepted)
- **Objective:** Scaffolding React Three Fiber viewport in `apps/web`, procedural gear piece geometries, and static projection binding.
- **Status:** `ACCEPTED & COMMITTED` (Commit `773c4adb03bb75bec95f3d57186b3fb12ccb6657`)
- **Prerequisites:** Completion of Phase 2A (`ACCEPTED & COMMITTED`).
- **Deliverables:**
  - `GearCubeViewport.tsx`: React Three Fiber Canvas with camera, lighting, and OrbitControls.
  - `GearCubeModel.tsx`: ComponentTransform-driven scene renderer for 26 persistent piece groups.
  - `CornerPiece.tsx`, `EdgePiece.tsx`, `CenterPiece.tsx`: Procedural 3D geometries with physical face sticker mappings.
  - `materials.ts`: Semantic face color palette and sticker orientation helpers.
  - `GearCubeModel.test.ts`: Pure Node/Vitest transform adapter and piece routing unit test suite.
- **Verification Evidence:**
  - `SCENE_TRANSFORM_ADAPTER_GATE`: `26 / 26 PASS` (1-to-1 mapping from ComponentTransforms to scene descriptors).
  - `COMPONENT_IDENTITY_GATE`: `26 / 26 PASS` (exact stable ComponentId sequence preserved).
  - `PIECE_ROUTING_GATE`: `8 corners / 12 edges / 6 centers PASS` (routed by physical ComponentId).
  - Web TypeScript & Vite build: `PASS`.
  - Manual browser smoke test: `PASS` (responsive canvas, 26 pieces rendered, orbit controls functional, 0 runtime errors).

#### Phase 2C: Move Animation & Face Controls (Completed & Accepted)
- **Objective:** React Three Fiber continuous animation binding, 12 face move controls (`U/D/F/B/R/L CW/CCW`), $C^1$ cubic time easing (`MOVE_DURATION_MS = 400`), SpatialFrame lifecycle integration, and endpoint snap-to-fresh-projection.
- **Status:** `ACCEPTED & COMMITTED` (Commit `d1ccab37bdf9cbe71dfc96ec2efdeb5081d19985`)
- **Prerequisites:** Completion of Phase 2B (`ACCEPTED & COMMITTED`).
- **Deliverables:**
  - `MoveControls.tsx`: 12-move directional button overlay matrix.
  - `animation.ts`: Pure animation session state, `easeInOutCubic` easing, transition lifecycle.
  - `animation.test.ts`: Pure Node/Vitest test suite verifying 12-move planning, evaluation, completion commit, and sequential move chaining.
  - Viewport & CSS integration: Non-blocking UI overlay, disabled controls during animation, OrbitControls preserved.
- **Verification Evidence:**
  - Automated Acceptance: `PASS` (14 test files, 149 tests passed; typecheck and web build clean).
  - Human Browser Acceptance: `PASS` (Interactive 12-move controls, continuous animation, OrbitControls preserved).

#### Phase 2D: Physical Two-Step Turn Staging (Completed & Accepted)
- **Objective:** Physical two-step turn interaction state machine (90° physical step / 200 ms per step), half-turn lock, continuation to 180° canonical endpoint, and cancellation back to origin.
- **Status:** `ACCEPTED & COMMITTED` (Commit `47882728cf9ad5e4fd7b0435b446e2db23c24fe6`)
- **Prerequisites:** Completion of Phase 2C (`ACCEPTED & COMMITTED`).
- **Deliverables:**
  - `animation.ts`: Staging state machine (`IDLE`, `FIRST_HALF_ANIMATING`, `HALF_TURN_LOCKED`, `SECOND_HALF_ANIMATING`, `CANCEL_HALF_ANIMATING`) and progress lerping.
  - `animation.test.ts`: Automated test suite for half-turn holding, continuation, cancellation, and symmetry.
  - `MoveControls.tsx` & `App.css`: Visual half-turn lock status and selective button enablement.
- **Verification Evidence:**
  - Automated Acceptance: `PASS` (14 test files, 153 tests passed; typecheck and web build clean).
  - Human Browser Acceptance: `PASS` (Two-step 90° staging, midpoint hold, continuation, and cancellation).

#### Phase 2E: Turn Interaction Mode Toggle (Completed & Accepted)
- **Objective:** User-selectable turn interaction mode switch (`TWO_STEP` vs `DIRECT_180`), state machine extension (`DIRECT_FULL_ANIMATING`), mode switching isolation, and MoveControls toggle UI.
- **Status:** `ACCEPTED & COMMITTED` (Primary implementation: `cc22d0b2e97f12336603e59fea9f88302b552475`; final accepted head on `main`: `a4bbc09866a9ed46c881b5fb0db66b97494d0607`)
- **Prerequisites:** Completion of Phase 2D (`ACCEPTED & COMMITTED`).
- **Deliverables:**
  - `animation.ts`: `TurnInteractionMode` ('TWO_STEP' | 'DIRECT_180'), `DIRECT_FULL_ANIMATING` phase, mode switching function, and direct 180° execution.
  - `animation.test.ts`: Automated test suite for mode switching, direct 180° execution, isolation, and regression.
  - `MoveControls.tsx` & `App.css`: Direct 180° toggle switch and mode status display.
- **Verification Evidence:**
  - Automated Acceptance: `PASS` (14 test files, 168 tests passed; 28 animation tests, 4 renderer tests, workspace typecheck and web build clean).
  - Human Browser Acceptance: `PASS` (Direct 180° toggle visible, default TWO_STEP, one-click 180° mode, continuous midpoint traversal, mode-switch locking, mixed-mode sequences, OrbitControls and zoom functional across all states, zero console errors).

---

### Phase 3: Interactive UI, History, Undo/Redo, and Scramble (Planning)
- **Objective:** Implement the user-facing `Play Mode` UI, button-based face controls, history timeline scrubber, undo/redo, deterministic scramble generator, keyboard shortcuts, and automated Playwright browser E2E tests.
- **Status:** `PLANNING / ACCEPTED` (Phase 3 Preflight, 3A, and 3B completed and accepted; Phase 3C planned and unblocked; formalized in [`docs/development/PHASE_3_IMPLEMENTATION_PLAN.md`](./PHASE_3_IMPLEMENTATION_PLAN.md)).
- **Prerequisites:** Completion of Phase 2 (`ACCEPTED & COMMITTED`) and Phase 3 Preflight/3A promotion to `main`.
- **In-Scope:** Architecture doc sync preflight, application history state, timeline scrubber, undo/redo, Mulberry32 deterministic scramble generator, keyboard shortcuts, responsive control overlay, root Playwright browser E2E test suite.
- **Out-of-Scope:** Solver algorithms, benchmark harness, computer vision.
- **Subphases:**
  - **Phase 3 Preflight:** Architecture & Test Documentation Sync (`docs/architecture/SYSTEM_ARCHITECTURE.md`, `docs/development/TEST_STRATEGY.md`, `docs/project/PROJECT_BLUEPRINT.md`, `docs/development/DEVELOPMENT_GUIDE.md`) — **Status:** `COMPLETED & ACCEPTED`.
  - **Phase 3A:** Application History & Deterministic Scramble Engine (`apps/web/src/components/history/history.ts`, `scramble.ts`, Vitest unit test suites) — **Status:** `COMPLETED & ACCEPTED`.
  - **Phase 3B:** Interactive Play Store, Undo/Redo & Timeline Scrubber UI (`play-session.ts`, `HistoryControls.tsx`, `TimelineScrubber.tsx`, `ScramblePanel.tsx`, `GearCubeViewport.tsx`) — **Status:** `COMPLETED & ACCEPTED`.
  - **Phase 3C:** Keyboard Controls, Responsive Layout & Playwright Browser E2E (`useKeyboardControls.ts`, responsive CSS, `playwright.config.ts`, `tests/e2e/**`, human browser acceptance) — **Status:** `PLANNED / UNBLOCKED`.
- **Acceptance Gate Criteria (`PHASE_3_PASS`):**
  - [ ] Architecture documentation synchronized with accepted single-app topology prior to code implementation.
  - [ ] Undo/Redo traverses arbitrary move histories without state desynchronization.
  - [ ] Scramble generator deterministically reproduces sequences from seeds without consecutive same-face moves.
  - [ ] Keyboard shortcuts and button clicks reliably trigger moves while guarding focus and animation states.
  - [ ] Root Playwright browser E2E test suite validates all primary user interaction workflows.
  - [ ] Full Phase 2 regression suite (14 test files, 168 tests) remains 100% passing.

---

### Phase 4: Classical Solver Infrastructure
- **Objective:** Implement Web Worker-isolated graph search algorithms (primary baselines: BFS, Bidirectional BFS, IDA*; optional candidates: IDDFS, A*, Pattern Databases).
- **Prerequisites:** Completion of Phase 3.
- **In-Scope:** `packages/solvers`, Web Worker message passing, heuristic evaluation functions, solution playback controls in UI.
- **Out-of-Scope:** Python ML training, camera vision.
- **Deliverables:**
  - `packages/solvers/src/bfs.ts`, `bidirectionalBfs.ts`, `idaStar.ts` (primary baselines)
  - Optional candidate modules (`iddfs.ts`, `aStar.ts`, `patternDatabase.ts`)
  - Worker wrapper and UI solution playback controller.
- **Verification:** Headless unit tests verifying optimal solutions for scramble depths $1 \dots 8$; search executes in background Web Worker without directly blocking the UI.
- **Acceptance Gate Criteria (`PHASE_4_PASS`):**
  - [ ] Solvers find proven optimal solutions for test scramble suites.
  - [ ] Search executes in Web Worker without blocking main thread user interactions.

---

### Phase 5: Research & Benchmarking Harness
- **Objective:** Build an empirical research harness to conduct deterministic comparative evaluations of solving algorithms.
- **Prerequisites:** Completion of Phase 4.
- **In-Scope:** `packages/benchmark`, automated batch test runner, telemetry metrics exporter (CSV/JSON), `Research Mode` UI dashboard.
- **Out-of-Scope:** Neural network training.
- **Deliverables:**
  - Benchmark execution CLI and in-browser research panel.
  - Initial comparative research report comparing BFS, Bidirectional BFS, and IDA*.
- **Verification:** Seeded benchmark test runs producing identical results across runs.
- **Acceptance Gate Criteria (`PHASE_5_PASS`):**
  - [ ] Deterministic metrics export validated across repeated runs with identical random seeds.

---

### Phase 6: Neural Heuristic & AI-Guided Search
- **Objective:** Develop an offline PyTorch training pipeline (`ml/`) to train neural value heuristics and integrate them into browser-based search.
- **Prerequisites:** Completion of Phase 5.
- **In-Scope:** Python training scripts managed with `uv` (Python version selected based on ML dependency compatibility), dataset generation, ONNX/JSON weight export, neural search worker.
- **Out-of-Scope:** Real-time webcam state capture.
- **Deliverables:**
  - `ml/train.py`, `ml/model.py`
  - Exported neural weights integrated into `packages/solvers`
  - Research evaluation comparing classical Pattern Databases vs. Neural Heuristics.
- **Verification:** Python test suite (`pytest`), benchmark comparison metrics.
- **Acceptance Gate Criteria (`PHASE_6_PASS`):**
  - [ ] Neural heuristic achieves $> 90\%$ branch reduction compared to uninformed search.
  - [ ] Model weights load and evaluate within browser memory budgets ($< 20 \text{ MB}$).

---

### Phase 7: Computer Vision State Ingestion
- **Objective:** Enable webcam capture of physical Gear Cubes, automatic face segmentation, sticker color recognition, candidate state consistency validation, user correction, and 3D guided solving.
- **Prerequisites:** Completion of Phase 6.
- **In-Scope:** `packages/vision`, WebRTC camera interface, color calibration tool, candidate state validator, user-correction interface, guided step-by-step UI.
- **Deliverables:**
  - Browser camera scanner modal.
  - Interactive state verification and manual correction screen.
- **Verification:** Test image suite with varying lighting conditions; validation rejection of invalid candidate states.
- **Acceptance Gate Criteria (`PHASE_7_PASS`):**
  - [ ] Successfully recognizes and solves physically scrambled Gear Cube from camera input.
  - [ ] Zero camera stream images persisted or uploaded to external servers.

---

### Phase 8: System Polish, Verification & v1.0 Release
- **Objective:** Final end-to-end integration, performance optimization, accessibility audit, complete documentation synchronization, and v1.0 release packaging.
- **Prerequisites:** Completion of Phase 7.
- **In-Scope:** Full test pyramid execution, production build bundling, Lighthouse audit, final documentation sign-off.
- **Deliverables:**
  - Production static bundle.
  - Comprehensive research summary paper / report in `docs/research/`.
- **Verification:** 100% automated test pass rate across Vitest and Playwright; Lighthouse performance score $\ge 95$.
- **Acceptance Gate Criteria (`PHASE_8_PASS`):**
  - [ ] All milestone criteria from Phases 0A–7 verified.
  - [ ] Formal v1.0 release tag ready.
