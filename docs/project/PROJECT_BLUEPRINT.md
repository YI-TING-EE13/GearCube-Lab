# PROJECT_BLUEPRINT.md — Canonical Project Blueprint

> **Product Name:** GearCube Lab
> **Repository Baseline:** Phase 0A Design Blueprint
> **Document Status:** `DECIDED`
> **Classification:** Authoritative Technical Blueprint

---

## 1. Project Vision

**GearCube Lab** is an interactive, browser-based 3D research environment and combinatorial laboratory dedicated to the physical **Gear Cube** puzzle. It bridges physical mechanical puzzle kinematics, pure combinatorial group theory, classical heuristic search algorithms, and modern neural/AI-guided solving paradigms into a unified, high-fidelity engineering workbench.

---

## 2. Goals

1. **Physical & Kinematic Fidelity:** Deliver a WebGL/Three.js 3D simulation reflecting the real physical gear interactions of the Gear Cube, accurately capturing coupled face rotations and continuous gear mesh dynamics.
2. **Pure Mathematical Source of Truth:** Formalize a discrete puzzle state engine completely decoupled from rendering logic, capable of validating state transitions, calculating move invariants, and computing deterministic state hashes.
3. **Classical Search Benchmarking:** Implement classical heuristic search algorithms (primary baselines: BFS, Bidirectional BFS, IDA*; optional candidates: IDDFS, A*, Pattern Databases) running in background Web Workers with high-throughput search node evaluation.
4. **Comparative AI Research:** Provide a controlled testbed to compare classical graph search with offline-trained neural heuristics (PyTorch) for value prediction and policy guidance.
5. **Physical Cube Digital Twin (Vision Ingestion):** Establish a local-first computer vision pipeline enabling users to capture webcam images of their physical Gear Cube, reconstruct and validate the discrete state, and receive interactive 3D step-by-step solving guidance.
6. **Reproducible Empirical Lab:** Maintain a deterministic benchmarking harness recording nodes expanded, branch factors, time-to-solution, and memory usage across identical scrambled seeds.

---

## 3. Non-Goals

1. **Not a Generic Twisty Puzzle Simulator:** The platform will not attempt to be a general-purpose simulator for $N \times N \times N$ Rubik's cubes, Megaminx, or Pyraminx. It is purpose-built for the unique kinematics and group structure of the Gear Cube.
2. **Not a Competitive Speed-Solving Platform:** The objective is algorithmic research, mechanical comprehension, and educational clarity—not sub-second competitive timer tracking or speedcubing leaderboards.
3. **No Heavy Cloud Infrastructure for Basic Features:** Interactive simulation, classical solving, and state manipulation must execute entirely in the browser without requiring external backend servers or database accounts.
4. **No Premature Monolithic AI Frameworks:** We will not run unconstrained large language models (LLMs) or oversized neural networks inside the client thread for basic puzzle mechanics.

---

## 4. Target User & Use Cases

- **Combinatorial & AI Researchers:** Benchmarking graph search heuristics, pattern databases, and neural value networks on non-standard permutation groups.
- **Mechanical Puzzle Enthusiasts:** Understanding the underlying gear coupling mechanics, state permutations, and solution algorithms through 3D visualization.
- **Physical Gear Cube Owners:** Scanning their physical puzzle via webcam, validating and correcting recognized state, and following interactive 3D step-by-step instructions to restore the solved state.

---

## 5. Current Physical Reference

| Parameter | Specification | Status |
| :--- | :--- | :--- |
| **Physical Model Reference** | Daiso Rotating 3D Gear Puzzle | `VERIFIED` |
| **Product SKU / ID** | `4550480834955` | `VERIFIED` |
| **Legal Face Turn Operation** | Two successive $90^\circ$ turns $= 180^\circ$ rotation required to complete one legal face operation | `VERIFIED` |
| **Intermediate $90^\circ$ Pose** | Intermediate physical state during turn animation; **not a legal discrete solver state** | `DECIDED` |
| **Coupled Mechanism Behavior** | Exact affected pieces, intermediate gear displacement, and coupling directions | `OPEN` / `TO VERIFY` |

---

## 6. Confirmed Requirements

- [x] **Discrete State as Source of Truth:** Visual 3D scene graphs must never own or dictate puzzle state.
- [x] **Coupled Kinematics Separation:** Continuous rotational angles and gear mesh interpolation are distinct from discrete state transitions.
- [x] **Multi-Mode UI:** Three distinct operational modes: `Play`, `Solve`, and `Research`.
- [x] **Worker-Thread Isolation:** All graph search and heuristic evaluations must run off the main UI rendering thread.
- [x] **Local-First Privacy:** Web camera state capture and image processing must execute locally in the client browser without mandatory cloud storage.

---

## 7. Functional Requirements

### Mode 1: Play Mode
- Full 3D camera orbital controls (rotate, pan, zoom).
- Face rotation controls (initial button-based directional turns, followed in later phases by direct raycast drag interaction).
- Scramble generator supporting configurable scramble depth ($N$ random legal moves) with deterministic pseudo-random seeds.
- Comprehensive move history timeline with interactive undo, redo, and jump-to-step capabilities.
- Reset to canonical solved state.

### Mode 2: Solve Mode
- Algorithm selection dropdown (primary baselines: BFS, Bidirectional BFS, IDA*; optional candidates: IDDFS, A*, Pattern Database, Neural-Guided Search).
- Real-time search progress indicators (nodes evaluated, current search depth, elapsed time).
- Solution playback controls (Play, Pause, Step Forward, Step Backward, Auto-Step Speed slider).
- 3D visual move annotations (directional rotation arrows, highlighted face slices).

### Mode 3: Research & Benchmarking Mode
- Batch benchmark runner executing test suites across standardized seed suites.
- Comparative metrics logging: solution length, execution time (ms), total nodes generated, peak memory usage, and heuristic branching factor.
- Export benchmark results in deterministic JSON and CSV formats.

---

## 8. Non-Functional Requirements

- **Performance:** Target a responsive 3D rendering loop (proposed target: 60 FPS on standard desktop browsers, pending implementation and benchmark validation). Expensive solver workloads run in Web Workers so that solving does not directly block UI interaction.
- **Responsiveness:** Discrete move operations and state validation must execute in $< 1 \text{ ms}$.
- **Modularity:** Core domain logic must have zero dependencies on DOM, React, Three.js, or Web APIs.
- **Portability:** Static web application deployable to modern CDN static hosting providers (GitHub Pages, Cloudflare Pages).
- **Accessibility:** Full keyboard shortcut navigation support and respect for OS-level `prefers-reduced-motion` settings.

---

## 9. UX & Design Principles

- **Minimalist Engineering-Tool Aesthetic:** Inspired by high-end engineering software and Apple design restraint: clean typography, deliberate whitespace, subtle neutral palettes, and strict hierarchical layout.
- **Avoid Visual Clutter:** Strictly avoid gratuitous glassmorphism, heavy neon glows, cyberpunk gradients, or generic AI dashboard styling.
- **3D Viewport Primacy:** The 3D Gear Cube is the primary focal point; controls and telemetry panels are docked unobtrusively at viewport edges.
- **Kinematic Clarity:** Animation curves should physically convey mechanical gear meshing and inertia rather than instant artificial snaps.

---

## 10. System Scope

```
+-----------------------------------------------------------------------------------+
| GearCube Lab Web Application                                                      |
|                                                                                   |
|  [ User Interface (React / Zustand) ]                                             |
|        |                                                                          |
|        +---> [ 3D Viewport (React Three Fiber / Three.js) ]                      |
|        |           ^                                                              |
|        |           | (Kinematic Animation Keyframes)                              |
|        v           |                                                              |
|  [ Puzzle Domain Core (Pure TypeScript Engine) ]                                  |
|        ^           |                                                              |
|        |           v (Discrete State & Legal Moves)                               |
|  [ Solver Engine (Web Worker: Classical Search / AI Inference) ]                  |
|                                                                                   |
|  [ Research & Benchmark Harness (Headless Runner & Telemetry Exporter) ]          |
|                                                                                   |
|  [ Vision State Ingestion (Webcam Stream & Face Recognition) - Future ]           |
+-----------------------------------------------------------------------------------+
```

---

## 11. Architecture Overview

The system strictly adheres to unidirectional dependency boundaries:

$$\text{Presentation Layer (UI/3D)} \longrightarrow \text{Domain Core Contracts} \longleftarrow \text{Solver / Research Layers}$$

- **Core Layer:** Pure mathematical models and permutation contracts.
- **Kinematic Layer:** Translates discrete moves into continuous rotational transforms.
- **Presentation Layer:** R3F/Three.js rendering and React UI state management.
- **Computation Layer:** Web Worker hosting search algorithms and heuristic evaluators.
- **Research Pipeline:** Python/PyTorch offline training environment generating lightweight heuristic weights.

---

## 12. Module Responsibilities

| Module | Core Responsibility | Dependency Restrictions |
| :--- | :--- | :--- |
| `packages/core` | Discrete state models, move definitions, legality checks, canonical hashing | Zero external dependencies (no React, no Three.js, no DOM) |
| `packages/kinematics` | Gear ratio mathematical equations, continuous trajectory generation, collision/mesh math | Depends only on `core` |
| `packages/solvers` | Classical graph search (primary: BFS, Bidirectional BFS, IDA*; optional: IDDFS, A*, Pattern Databases), heuristic estimators | Depends only on `core` |
| `packages/renderer` | Three.js scene graph, custom shaders, visual skins, camera controls, lighting | Depends on `core` and `kinematics` |
| `packages/ui` | React components, Zustand state stores, user interaction handlers, benchmark UI | Depends on `core`, `renderer`, and `solvers` |
| `packages/benchmark` | Deterministic benchmark harness, seed generation, statistical metric export | Depends on `core` and `solvers` |
| `ml/` (Python) | PyTorch model architectures, offline self-play/dataset generation, heuristic export | Python (version selected based on ML dependency compatibility) managed exclusively via `uv` |

---

## 13. Data Flow

1. **User Action:** User clicks "Rotate Front Face Clockwise ($180^\circ$)".
2. **UI Dispatch:** UI dispatches `applyMove(currentState, { face: 'F', turns: 1 })` to the Domain Core.
3. **Core Validation:** Domain Core validates move legality, generates the immutable next `PuzzleState`, and computes the state hash.
4. **Kinematic Translation:** Kinematic Engine computes the continuous rotational trajectory (including driving gear and intermediate gear rotations).
5. **Renderer Execution:** 3D Renderer animates the gear meshes along the kinematic trajectory.
6. **State Synchronization:** Upon animation completion, UI state store updates the active puzzle state.
7. **Solver Notification:** If Solve Mode is active, the Solver Worker receives the new `PuzzleState` to evaluate optimal solution branches.

---

## 14. Technology Strategy

- **Language:** TypeScript 5.x with strict type checking enabled (`strict: true`, `noImplicitAny: true`).
- **Build System & Dev Server:** Vite for rapid development and optimized tree-shaking builds.
- **Frontend Framework:** React 18 / 19.
- **3D Graphics:** Three.js, React Three Fiber (`@react-three/fiber`), and `@react-three/drei`.
- **UI State Management:** Zustand for lightweight, decoupled application state.
- **Unit & Integration Testing:** Vitest for rapid, in-memory core tests.
- **E2E & Visual Testing:** Playwright for automated browser interactions and visual regression testing.
- **Package Management:** `npm` as initial low-complexity default.
- **Python ML Pipeline:** Python (version selected based on ML/PyTorch dependency compatibility), PyTorch, managed exclusively via `uv`.

---

## 15. Internal Interface Strategy

All inter-module communication is governed by immutable TypeScript interfaces defined in [`docs/architecture/PUZZLE_CONTRACTS.md`](../architecture/PUZZLE_CONTRACTS.md). Key principles:
- **Immutability:** State objects are never mutated in place; move functions return new state instances.
- **Serializability:** All core data structures (states, moves, benchmark metrics) must be JSON-serializable to support seamless Web Worker message passing.
- **Deterministic Keys:** Every state produces a compact string representation (`stateKey`) for hash-map lookups and transposition tables.

---

## 16. Puzzle-State Strategy

- The state representation models the discrete positions and orientations of all physical sub-assemblies (corners, edge gears, center shafts).
- Face operations are strictly quantized to $180^\circ$ increments ($2 \times 90^\circ$ turns).
- State validity checks verify formally defined physical invariants and consistency rules once characterized in Phase 0B to reject impossible physical states.

---

## 17. Kinematics Strategy

- Decouples discrete state steps from continuous rendering frames.
- Defines angular velocity profiles and gear coupling functions:
  $$\theta_{\text{intermediate\_gear}} = f(\theta_{\text{face\_turn}}, \text{gear\_ratio})$$
- Generates keyframe trajectories for smooth physical visualization during move playback.

---

## 18. Rendering Strategy

- **Modular Visual Skins:** Support multiple visual presentations (e.g., Daiso OEM plastic, technical wireframe, exploded engineering view) without altering kinematic or domain behavior.
- **Instanced & Optimized Meshes:** Shared geometries and materials for gear teeth and corner pieces to optimize rendering performance.

---

## 19. Solver Strategy

- **Phase 4 (Classical Search):**
  - **Primary Baselines:**
    - Breadth-First Search (BFS) — uninformed exact-search baseline.
    - Bidirectional BFS — meet-in-the-middle baseline where applicable.
    - Iterative Deepening A* (IDA*) — memory-bounded heuristic search baseline.
  - **Optional / Later Candidates:**
    - Iterative Deepening Depth-First Search (IDDFS).
    - A* search.
    - Pattern Database (PDB) heuristics and other handcrafted estimators.
- **Web Worker Architecture:** Expensive solver workloads execute outside the browser main thread in dedicated background Web Workers so that graph search does not directly block UI rendering or user interaction. Workers report periodic progress telemetry (expanded nodes, current depth) via `postMessage`.

---

## 20. AI Research Strategy

- **Offline Training Pipeline:** Python-based self-play and supervised distance-to-goal estimation trained on generated permutation graphs.
- **Inference Integration:** Export lightweight neural heuristic weights (ONNX or compact JSON tensor representation) for evaluation in Web Workers.
- **Comparative Research:** Evaluate trade-offs between neural heuristic evaluation latency and search tree reduction compared to classical Pattern Databases.

---

## 21. Camera & Vision Strategy (Future Phase 7)

- **Local WebRTC Capture:** Access user webcam with explicit browser permission.
- **Perspective Rectification:** Detect cube face boundaries and correct planar perspective distortion.
- **Color & Feature Segmentation:** Identify sticker colors and gear orientations.
- **State Consistency & Validation:** Camera / vision processing produces a candidate `PuzzleState`. Before it becomes authoritative Core state, the candidate must pass the formally defined state consistency and/or reachability validation available for the finalized puzzle model. Invalid or uncertain recognition must remain user-correctable.

---

## 22. Security & Privacy Requirements

- **Zero Secret Ingestion:** No private API keys, tokens, or credentials committed to repository or embedded in client bundles.
- **Local-First Processing:** Camera image streams are processed strictly in-memory within the client browser; zero automatic cloud uploads.
- **Input Sanitization:** State strings imported via file or query parameter must be strictly validated before parsing.
- **Dependency Audit:** Regular dependency vulnerability scans and mandatory lockfile enforcement.

---

## 23. Performance Requirements

| Metric | Target Requirement | Verification Method |
| :--- | :--- | :--- |
| **3D Rendering Frame Rate** | Proposed Target: $60 \text{ FPS}$ ($\ge 55 \text{ FPS}$) on standard desktop hardware (pending implemented renderer, defined reference device, and benchmark evidence) | Chrome DevTools Performance Profiler |
| **Move Application Latency** | $< 1 \text{ ms}$ per discrete transition | Vitest benchmark test suite |
| **State Hashing Throughput** | $\ge 500,000 \text{ states/sec}$ | Node.js micro-benchmarks |
| **Worker UI Interactivity** | Main thread remains responsive during $10^7$ node search | Manual UI drag test during solve |
| **Initial Bundle Load Size** | $< 500 \text{ KB}$ gzipped (excluding 3D models) | Vite build analyzer |

---

## 24. Testing Strategy Overview

Refer to [`docs/development/TEST_STRATEGY.md`](../development/TEST_STRATEGY.md) for the complete 12-level testing pyramid:
- Pure Core unit tests and formally derived property invariants (upon Phase 0B verification).
- Deterministic move sequence reversibility ($M \cdot M^{-1} = I$).
- Kinematic continuous interpolation assertions.
- Web Worker solver search determinism tests.
- Seeded benchmark regression tests.
- Browser-level Playwright UI interaction tests.

---

## 25. Deployment Strategy

- Packaged as a fully static, standalone web application.
- Hosted on static HTTPS infrastructure (e.g., GitHub Pages, Cloudflare Pages, Vercel Static).
- Web Workers bundled as standard ES modules.
- Refer to [`docs/operations/DEPLOYMENT.md`](../operations/DEPLOYMENT.md) for production hosting constraints.

---

## 26. Documentation & Governance Rules

- All contributor and agent activities are bound by [`AGENTS.md`](../../AGENTS.md).
- Any contract or architectural change requires simultaneous documentation synchronization.
- All physical claims must be verified or explicitly marked `OPEN`.

---

## 27. Development Phases

The project roadmap is structured into 9 sequential phases (detailed in [`docs/development/ROADMAP.md`](../development/ROADMAP.md)):
- **Phase 0A:** Project Governance & Canonical Design Baseline *(Current)*
- **Phase 0B:** Physical Mechanism Characterization & Puzzle Contract Finalization
- **Phase 1:** Discrete Gear Cube Core & State Engine
- **Phase 2:** 3D Model, Visual Assets, and Kinematic Animation Engine
- **Phase 3:** Interactive UI, History, Undo/Redo, and Scramble
- **Phase 4:** Classical Solver Infrastructure (Web Worker, BFS / Bidirectional BFS / IDA*)
- **Phase 5:** Research Benchmark Framework & Empirical Evaluation
- **Phase 6:** Neural Heuristic & AI-Guided Search
- **Phase 7:** Camera-Based Physical State Reconstruction & Guided Solver
- **Phase 8:** Integration, Polish, Reproducibility, and v1.0 Release

---

## 28. Major Risks & Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Premature Mechanical Assumptions** | Inaccurate state model breaks solver or visual alignment | Phase 0B empirical verification gate before Phase 1 implementation |
| **Main Thread Freezing during Search** | Janky UI and frozen 3D rendering | Mandatory Web Worker isolation for all solver algorithms |
| **State Space Cardinality Explosion** | Solvers fail to find solutions within memory limits | Progressive benchmarking starting with small scramble depths; Pattern Databases |
| **Inaccurate Web Camera Recognition** | Impossible puzzle state fed into solver | Strict validation engine highlighting ambiguous faces for manual correction |

---

## 29. Open Questions & Unverified Physical Facts

The following mechanical parameters are explicitly tagged as **`OPEN` / `TO VERIFY`** and must be empirically determined in Phase 0B:

1. `[OPEN]` **Exact Commercial Generation:** Whether the reference Daiso model matches 1st, 2nd, or 3rd generation Gear Cube designs.
2. `[OPEN]` **Gear Tooth Counts & Ratios:** Exact tooth count on center-edge gears vs. corner gears.
3. `[OPEN]` **Middle-Layer Angular Ratio & Direction:** Exact degree rotation and rotational direction of the intermediate slice gears during a $180^\circ$ face turn.
4. `[OPEN]` **Affected Piece Set:** Exact piece coupling mapping for each legal face move.
5. `[OPEN]` **Gear-Phase Periodicity:** Total number of $180^\circ$ face turns along a single axis required to restore edge gears to their initial rotational orientation.
6. `[OPEN]` **Directional Asymmetry:** Whether $+180^\circ$ and $-180^\circ$ face turns produce distinct or equivalent physical states.
7. `[OPEN]` **Complete Piece Taxonomy:** Formalized index mapping for all corners, edges, and internal core shafts.
8. `[OPEN]` **State-Space Size:** Total theoretical reachable permutations given the specific gear coupling constraints.

---

## 30. Definition of Done for Major Milestones

A milestone is considered **DONE** if and only if:
1. All phase deliverables defined in [`docs/development/ROADMAP.md`](../development/ROADMAP.md) are completed.
2. Automated test suites for the phase pass with zero errors.
3. No architectural boundaries or prohibitions from [`AGENTS.md`](../../AGENTS.md) are violated.
4. All associated documentation in [`docs/`](../README.md) is updated and verified.
5. A comprehensive completion report with reproducible verification output is submitted.
