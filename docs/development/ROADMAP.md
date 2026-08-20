# ROADMAP.md — Project Lifecycle & Dependency-Ordered Milestones

> **Current Project Phase:** `Phase 0B.1 — Physical Characterization Protocol`
> **Status:** Active Execution

---

## 1. Roadmap Lifecycle Overview

```text
[ Phase 0A: Governance & Design Baseline ] (Accepted)
      │
      ▼
[ Phase 0B: Physical Mechanism Characterization ] (Active)
      ├─ 0B.1: Physical Characterization Protocol (Current)
      ├─ 0B.2: Operator Physical Observation
      ├─ 0B.3: Mechanical Contract Synthesis
      └─ 0B.4: Contract Review and Acceptance
      │
      ▼
[ Phase 1: Discrete Domain Core Engine ]
      │
      ▼
[ Phase 2: 3D Graphics & Kinematic Animation ]
      │
      ▼
[ Phase 3: Interactive UI, History & Scramble ]
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

### Phase 0B: Physical Mechanism Characterization & Contract Synthesis

Phase 0B is partitioned into four dependency-ordered subphases:

#### Phase 0B.1: Physical Characterization Protocol (Active Subphase)
- **Objective:** Design reproducible, observation-first, non-destructive experimental protocols, observation templates, and execution batching for the physical Daiso puzzle (SKU: `4550480834955`).
- **Prerequisites:** Completion and acceptance of Phase 0A.
- **In-Scope:** `docs/characterization/PHYSICAL_CHARACTERIZATION_PROTOCOL.md`, `docs/characterization/OBSERVATION_TEMPLATE.md`, roadmap subphase updates.
- **Out-of-Scope:** Physical observation execution, software implementation, modifying Core contracts.
- **Deliverables:**
  - `docs/characterization/PHYSICAL_CHARACTERIZATION_PROTOCOL.md`
  - `docs/characterization/OBSERVATION_TEMPLATE.md`
- **Verification:** Internal consistency check, link validation, protocol review.
- **Acceptance Gate Criteria (`PHASE_0B1_PASS`):**
  - [x] Observation-first experiment matrix defined with clear Tier A/B/C separation.
  - [x] Execution batches established with Batch A focused on initial semantic reconnaissance.
  - [x] Observation template provided without premature taxonomy dependencies.

#### Phase 0B.2: Operator Physical Observation
- **Objective:** Human operator physically executes experiment batches on the Daiso Gear Cube and records raw visual/tactile observations.
- **Prerequisites:** Completion and acceptance of Phase 0B.1.
- **In-Scope:** Operator observation logs (starting with Batch A initial reconnaissance), photographic/video evidence collection.
- **Out-of-Scope:** Software implementation, guessing unobserved mechanics.
- **Deliverables:**
  - Raw observation logs stored in `docs/characterization/evidence/` or submitted via issue/PR.
- **Verification:** Cross-check evidence completeness against protocol requirements.
- **Acceptance Gate Criteria (`PHASE_0B2_PASS`):**
  - [ ] Batch A observations recorded with unambiguous photographic evidence.
  - [ ] Reference solved state and move endpoint behaviors documented without assumed symmetry.

#### Phase 0B.3: Mechanical Contract Synthesis
- **Objective:** Synthesize operator observations into formal discrete state schemas, move algebra rules (via full empirical coverage or evidence-backed symmetry derivation), and continuous kinematic equations.
- **Prerequisites:** Completion of Phase 0B.2.
- **In-Scope:** `docs/research/MECHANICAL_CHARACTERIZATION_REPORT.md`, candidate updates to `docs/architecture/PUZZLE_CONTRACTS.md`.
- **Out-of-Scope:** Production software coding.
- **Deliverables:**
  - `docs/research/MECHANICAL_CHARACTERIZATION_REPORT.md`
  - Formal candidate contract updates replacing verified `OPEN` tags.
- **Verification:** Mathematical group closure checks, state equality validation rules.
- **Acceptance Gate Criteria (`PHASE_0B3_PASS`):**
  - [ ] Discrete move semantics (+180° / -180° distinctness, component transformations) formalized.
  - [ ] Remaining unresolved mechanics explicitly tagged as `OPEN` if non-blocking for Phase 1.

#### Phase 0B.4: Contract Review and Acceptance
- **Objective:** Independent architectural review of the synthesized puzzle contracts before commencing Phase 1 software implementation.
- **Prerequisites:** Completion of Phase 0B.3.
- **In-Scope:** Verification of domain contracts against architecture axioms, formal Phase 0B acceptance sign-off.
- **Out-of-Scope:** Phase 1 coding.
- **Deliverables:** Phase 0B acceptance report.
- **Acceptance Gate Criteria (`PHASE_0B4_PASS`):**
  - [ ] Formal sign-off on discrete `PuzzleState` and `Move` contracts.
  - [ ] Zero unverified mechanical assumptions promoted to test oracles without evidence.

---

### Phase 1: Discrete Domain Core Engine
- **Objective:** Implement the pure TypeScript combinatorial state engine and move validator.
- **Prerequisites:** Completion of Phase 0B.
- **In-Scope:** `packages/core`, state representations, move application, state consistency validation, deterministic state hashing.
- **Out-of-Scope:** Three.js rendering, UI components, Web Workers, solvers.
- **Deliverables:**
  - `packages/core/src/state.ts`
  - `packages/core/src/moves.ts`
  - `packages/core/src/validation.ts`
  - Comprehensive unit test suite in Vitest.
- **Verification Commands:** `npm test -- core` (100% pass, $\ge 95\%$ branch coverage).
- **Acceptance Gate Criteria (`PHASE_1_PASS`):**
  - [ ] Pure Core compiles with zero external dependencies.
  - [ ] Move invariants and state equality pass property-based fuzz tests ($> 100,000$ iterations).

---

### Phase 2: 3D Model, Visual Assets, and Kinematic Animation Engine
- **Objective:** Scaffolding Vite + React + Three.js / R3F, implementing modular 3D gear geometry, and coupling visual motion via kinematic trajectory planning.
- **Prerequisites:** Completion of Phase 1.
- **In-Scope:** `packages/kinematics`, `packages/renderer`, R3F canvas, procedural/instanced gear meshes, visual skins.
- **Out-of-Scope:** Solvers, complex UI panels, camera vision.
- **Deliverables:**
  - Kinematic animation generator.
  - 3D viewport component rendering coupled gear motion during face turns.
- **Verification:** Performance profiling on Chrome DevTools against proposed 60 FPS target; visual inspection of tooth meshing.
- **Acceptance Gate Criteria (`PHASE_2_PASS`):**
  - [ ] 3D animations smoothly interpolate without visual clipping or mesh desynchronization.
  - [ ] Renderer state is 100% derived from Core state; zero state mutations in Three.js.

---

### Phase 3: Interactive UI, History, Undo/Redo, and Scramble
- **Objective:** Implement the user-facing `Play Mode` UI, button-based face controls, history scrubber, undo/redo, and scramble generator.
- **Prerequisites:** Completion of Phase 2.
- **In-Scope:** `packages/ui`, Zustand application stores, control overlay, move history timeline.
- **Out-of-Scope:** Solver execution, benchmark suite.
- **Deliverables:**
  - Responsive control panels matching Apple-inspired minimalist aesthetic.
  - Deterministic scramble generator with seed input.
- **Verification:** Playwright E2E interaction test suite; manual usability audit.
- **Acceptance Gate Criteria (`PHASE_3_PASS`):**
  - [ ] Undo/Redo traverses arbitrary move histories without state desynchronization.
  - [ ] Keyboard shortcuts and button clicks reliably trigger animations.

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
