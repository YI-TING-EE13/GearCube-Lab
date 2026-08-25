# GearCube Lab

> Interactive 3D simulation, kinematic modeling, and classical/neural solver research for the Gear Cube puzzle.

---

## Project Status

**Current Status:** `Phase 4 Complete — Classical Solver Infrastructure Implemented & Accepted`

> [!IMPORTANT]
> **Phases 0–4 are implemented and accepted.** The discrete core, 3D kinematics, Play Mode UI (Phase 3), and full Classical Solver infrastructure with Solve Mode (Phase 4) are all complete. Phase 5 (Research & Benchmarking Harness) has not yet started. All implementation adheres to the canonical architecture contracts defined in [`docs/`](docs/README.md).

---

## Implemented Capabilities

- **Interactive 3D Simulation (Implemented & Accepted):** WebGL/Three.js-based rendering featuring visibly coupled gear kinematics, responsive camera controls, and modular visual skins.
- **Pure Combinatorial Domain Core (Implemented & Accepted):** Framework-independent discrete puzzle state engine enforcing strict move legality ($180^\circ$ face turns) and canonical state representation.
- **Play Mode UI (Implemented & Accepted):** Interactive face controls, move history timeline with undo/redo, deterministic seeded scramble generator, keyboard shortcuts, and responsive layout.
- **Classical Search Solvers (Implemented & Accepted — Phase 4):** Web Worker-isolated search algorithms (BFS, Bidirectional BFS, IDA* with H2 two-slice PDB heuristic) providing optimal solution paths without blocking the UI.
- **Solve Mode UI & Playback (Implemented & Accepted — Phase 4E):** Algorithm selection, search progress telemetry, solution playback with play/pause/step-forward/step-backward, stale-result protection, and responsive browser layout.

## Planned Capabilities (Future Phases)

- **Empirical Research & Benchmark Harness (Phase 5 — Not Started):** Deterministic, headless comparative evaluation framework to measure search node expansions, branch pruning efficiency, and execution time.
- **AI-Guided Search (Phase 6 — Not Started):** Offline PyTorch-trained neural heuristics and value networks integrated into guided tree search.
- **Computer Vision State Ingestion (Phase 7 — Not Started):** Local-first camera capture to recognize physical cube faces, reconstruct a candidate discrete state, validate consistency/reachability, allow user corrections, and generate step-by-step 3D visual solving guidance.

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
|   [Visual Skin]   |                               |  * State Truth    |
+-------------------+                               |  * Legal Moves    |
                                                    +---------+---------+
                                                              ^
          +---------------------------------------------------+
          |
+---------+---------+
|   Solver Worker   | <--- [Search State]
|  (Classical / AI) |
+-------------------+
```

- **Domain Core is the Sole Source of Truth:** 3D rendering meshes and visual scene graphs reflect puzzle state; they never own or mutate state.
- **Thread Boundary Isolation:** Compute-intensive graph search runs outside the main thread inside background Web Workers so that solving does not directly block rendering or interaction.
- **Kinematic & Skin Decoupling:** Gear meshes and physical animations are computed via kinematic mappings derived from discrete state transitions, allowing custom visual skins without altering puzzle semantics.

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
