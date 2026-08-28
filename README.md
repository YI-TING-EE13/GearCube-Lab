# GearCube Lab

> Interactive 3D simulation, kinematic modeling, and classical solver benchmark research for the Gear Cube puzzle.

---

## Project Status

**Current Status:** `Phases 0–5 Completed & Accepted — Active Mainline: Phase 8 (Product Completion & Public-Test Readiness Planning Candidate)`

> [!IMPORTANT]
> **Phases 0–5 are fully implemented and accepted.** The discrete core, 3D kinematics, Play Mode UI (Phase 3), full Classical Solver infrastructure with Solve Mode (Phase 4), Phase 5A/5B Headless Benchmark Infrastructure, Phase 5C Classical Solver Comparative Benchmark Research & Report ([`docs/research/PHASE_5_CLASSICAL_SOLVER_BENCHMARK_REPORT.md`](docs/research/PHASE_5_CLASSICAL_SOLVER_BENCHMARK_REPORT.md)), and Phase 5D Browser Research Mode are complete and verified across unit, boundary, automated Playwright browser, and interactive Chrome DevTools acceptance suites. The active product mainline is **Phase 8: Product Completion & Public-Test Readiness** ([`docs/development/PHASE_8_IMPLEMENTATION_PLAN.md`](docs/development/PHASE_8_IMPLEMENTATION_PLAN.md)).

---

## Implemented Capabilities

- **Interactive 3D Simulation (Implemented & Accepted):** WebGL/Three.js-based rendering featuring visibly coupled gear kinematics, responsive camera controls, and fixed face material/sticker presentation.
- **Pure Combinatorial Domain Core (Implemented & Accepted):** Framework-independent discrete puzzle state engine enforcing strict move legality ($180^\circ$ face turns) and canonical state representation.
- **Play Mode UI (Implemented & Accepted):** Interactive face controls, move history timeline with undo/redo, deterministic seeded scramble generator, keyboard shortcuts, and responsive layout.
- **Classical Search Solvers (Implemented & Accepted — Phase 4):** Web Worker-isolated search algorithms (BFS, Bidirectional BFS, IDA* with H2 two-slice PDB heuristic) providing optimal solution paths without blocking the UI.
- **Solve Mode UI & Playback (Implemented & Accepted — Phase 4E):** Algorithm selection, search progress telemetry, solution playback with play/pause/step-forward/step-backward, stale-result protection, and responsive browser layout.
- **Benchmark Foundation, Sampler, Runner & CLI (Implemented & Accepted — Phases 5A & 5B):** Pure `@gearcube/benchmark` package, materialized v1 benchmark schemas, typed `BenchmarkConfigError` runtime validation, 41,472-state exact-distance corpus, deterministic FNV-1a hash and Mulberry32 PRNG, stratified sampling, headless solver comparison runner (BFS, BiBFS, IDA*), warm-up/measured separation, deterministic search metric reporting, lossless JSON exporter, 14-column RFC-4180 CSV exporter, and headless Node CLI (`npm run benchmark -- --config <config.json> [--json <path>] [--csv <path>]`).
- **Classical Solver Comparative Benchmark Research & Report (Implemented & Accepted — Phase 5C):** Empirical comparative evaluation across exact distance strata 1..8 (222 unique structural cases, 64 timing cases across 3 replicates; 3,546 measured rows, 4,698 solver invocations), verifying 100% optimal solutions ($d^*(\sigma) = \text{exactDepth}$), deterministic pruning statistics (BiBFS: 21.84× reduction at depth 8; IDA* with $H_2$: 939.90× reduction at depth 8 vs. BFS), observational runtime scaling, and reproducible deterministic projections ([report](docs/research/PHASE_5_CLASSICAL_SOLVER_BENCHMARK_REPORT.md)).
- **Browser Research Mode & Web Worker (Implemented & Accepted — Phase 5D):** Interactive browser Research Mode UI with workspace mode toggle (`PLAY` / `RESEARCH`), validated configuration form, dedicated background Web Worker (`benchmark.worker.ts`), BFS/BiBFS/IDA* search execution, tabular summary metrics, client-side JSON/CSV export downloads, host-side cancellation, and responsive layout across desktop, tablet, and mobile viewports.

## Active Mainline & Future Tracks

- **Product Completion & Public-Test Readiness (Phase 8 — Active Product Mainline Plan Candidate):** Onboarding guide in README, canonical preview workflows, CI automation, accessibility/console hygiene, cross-browser qualification, and clean-clone verification ([`docs/development/PHASE_8_IMPLEMENTATION_PLAN.md`](docs/development/PHASE_8_IMPLEMENTATION_PLAN.md)).
- **Modular Visual Skins (Deferred / Future Presentation):** Support for interchangeable material schemes, wireframe views, or custom visual themes without altering puzzle mechanics.
- **AI-Guided Search (Phase 6 — Deferred / Optional Future Research Track):** Offline PyTorch-trained neural heuristics and value networks integrated into guided tree search.
- **Computer Vision State Ingestion (Phase 7 — Deferred / Optional Future Expansion Track):** Local-first camera capture to recognize physical cube faces, reconstruct a candidate discrete state, validate consistency/reachability, allow user corrections, and generate step-by-step 3D visual solving guidance.

---

## High-Level Architecture Overview

GearCube Lab strictly enforces a unidirectional dependency hierarchy:

$$\text{UI / Renderer / Solvers / Research} \longrightarrow \text{Core Contracts}$$

```
                +---------------------------------------+
                |      User Interface & Controls        |
                |      (React / Local Orchestration)    |
                +-------------------+-------------------+
                                    |
          +-------------------------+-------------------------+
          |                                                   |
          v                                                   v
+-------------------+                               +-------------------+
|    3D Renderer    |                               |  Discrete Core    |
| (R3F / Three.js)  | <--- [Kinematic Plan] ------- | (Pure TypeScript) |
| [Presentation]    |                               |  * State Truth    |
+-------------------+                               |  * Legal Moves    |
                                                    +---------+---------+
                                                              ^
          +---------------------------------------------------+
          |
+---------+---------+
| Classical Solver  | <--- [Search State]
| (Worker Engine)   |
+-------------------+
```

- **Domain Core is the Sole Source of Truth:** 3D rendering meshes and visual scene graphs reflect puzzle state; they never own or mutate state.
- **Thread Boundary Isolation:** Compute-intensive graph search and benchmark runs execute outside the main thread inside background Web Workers so that solving and benchmarking do not directly block rendering or interaction.
- **Kinematic & Presentation Decoupling:** Gear meshes and physical animations are computed via kinematic mappings derived from discrete state transitions, allowing future visual presentation themes without altering puzzle semantics.

---

## Documentation Index

Detailed architectural contracts, mechanical characterization protocols, development guides, and roadmaps are organized under [`docs/`](docs/README.md):

| Category | Canonical Document | Description |
| :--- | :--- | :--- |
| **Documentation Index** | [`docs/README.md`](docs/README.md) | Central entry point and navigation guide for all documentation |
| **Project Blueprint** | [`docs/project/PROJECT_BLUEPRINT.md`](docs/project/PROJECT_BLUEPRINT.md) | Comprehensive 30-section project blueprint, specifications, and scope |
| **System Architecture** | [`docs/architecture/SYSTEM_ARCHITECTURE.md`](docs/architecture/SYSTEM_ARCHITECTURE.md) | Architectural layers, component contracts, and dependency constraints |
| **Puzzle Contracts** | [`docs/architecture/PUZZLE_CONTRACTS.md`](docs/architecture/PUZZLE_CONTRACTS.md) | Type contracts for state, moves, kinematics, solver APIs, and vision import |
| **Development Guide** | [`docs/development/DEVELOPMENT_GUIDE.md`](docs/development/DEVELOPMENT_GUIDE.md) | Coding standards, package management, workflow discipline, and tooling |
| **Development Roadmap** | [`docs/development/ROADMAP.md`](docs/development/ROADMAP.md) | Dependency-ordered phases (Phase 0A to Phase 8) with PASS/FAIL gates |
| **Test Strategy** | [`docs/development/TEST_STRATEGY.md`](docs/development/TEST_STRATEGY.md) | 12-level testing pyramid, property invariants, and verification protocols |
| **Deployment Strategy** | [`docs/operations/DEPLOYMENT.md`](docs/operations/DEPLOYMENT.md) | Static HTTPS hosting architecture, worker support, and security constraints |
| **Architecture Decisions** | [`docs/decisions/ADR-0001-FOUNDATION.md`](docs/decisions/ADR-0001-FOUNDATION.md) | Foundational architecture decision record (ADR-0001) |

> [!NOTE]
> All detailed functional requirements, mathematical definitions, testing invariants, and architectural contracts are maintained within [`docs/`](docs/README.md).

---

## Governance & Agent Rules

All autonomous coding agents and human contributors must follow the project rules specified in [`AGENTS.md`](AGENTS.md) before proposing or executing changes.
