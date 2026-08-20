# GearCube Lab

> Interactive 3D simulation, kinematic modeling, and classical/neural solver research for the Gear Cube puzzle.

---

## Project Status

**Current Status:** `Phase 0A — Project Governance & Canonical Design Baseline`

> [!IMPORTANT]
> **This repository is currently in its architectural design and governance specification phase.**
> Application source code, 3D assets, dependencies, and solver algorithms are **not yet implemented**. All implementation must strictly adhere to the canonical architecture contracts defined in [`docs/`](docs/README.md).

---

## Project Vision & Capabilities (Planned)

GearCube Lab is a personal software and AI research platform dedicated to the deep study of mechanical gear puzzles, specifically focusing on the physical 3D Gear Cube (initial physical reference: Daiso Rotating 3D Gear Puzzle, SKU `4550480834955`).

Planned capabilities include:
- **Interactive 3D Simulation:** WebGL/Three.js-based rendering featuring visibly coupled gear kinematics, responsive camera controls, and modular visual skins.
- **Pure Combinatorial Domain Core:** Framework-independent discrete puzzle state engine enforcing strict move legality ($180^\circ$ face turns) and canonical state representation.
- **Classical Search Solvers:** Web Worker-isolated search algorithms (primary baselines: BFS, Bidirectional BFS, IDA*; optional candidates: IDDFS, A*, Pattern Databases) providing optimal and near-optimal solution paths without blocking the UI.
- **Empirical Research & Benchmark Harness:** Deterministic, headless comparative evaluation framework to measure search node expansions, branch pruning efficiency, and execution time.
- **AI-Guided Search (Future Phase):** Offline PyTorch-trained neural heuristics and value networks integrated into guided tree search.
- **Computer Vision State Ingestion (Future Phase):** Local-first camera capture to recognize physical cube faces, reconstruct a candidate discrete state, validate consistency/reachability, allow user corrections, and generate step-by-step 3D visual solving guidance.

---

## High-Level Architecture Overview

GearCube Lab strictly enforces a unidirectional dependency hierarchy:

$$\text{UI / Renderer / Solvers / Research} \longrightarrow \text{Core Contracts}$$

```
                +---------------------------------------+
                |      User Interface & Controls        |
                |          (React / Zustand)            |
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
