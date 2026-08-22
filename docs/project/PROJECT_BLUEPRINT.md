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

## 5. Canonical Reference Model & Physical References

| Parameter | Specification | Status |
| :--- | :--- | :--- |
| **Canonical MVP Model** | Standard / Original Gear Cube (Oskar van Deventer / Meffert's design) | `PROJECT_DECISION` |
| **Published State Space** | $41,472$ reachable states ($4!(4\cdot 3)^3$) for standard unmarked edge-base variant | `SOURCE_SUPPORTED` |
| **Legal Face Operation** | $180^\circ$ face rotation ("flip"); cycles middle slice $90^\circ$ and rotates gear edges $60^\circ$ | `SOURCE_SUPPORTED` |
| **Intermediate $90^\circ$ Pose** | Intermediate animation pose; locks orthogonal turns; **not a legal discrete solver state** | `DECIDED` / `SOURCE_SUPPORTED` |
| **Single-Axis Periodicity** | 12 repeated directed face flips return puzzle to exact starting state (represented as $F^{12} = I$) | `SOURCE_SUPPORTED` |
| **Published Distance Maxima** | Jaap table reports max distance 12 (`Single turns`) and 6 (`Multiple turns`); project metric mapping is `OPEN / TO DEFINE` | `SOURCE_SUPPORTED` |
| **Physical Inspiration / Target** | Daiso Rotating 3D Gear Puzzle (SKU `4550480834955`) | `PROJECT_DECISION` |
| **Daiso Equivalence** | Exact mechanical equivalence between Daiso SKU and Meffert's reference model | `OPEN` / `OPTIONAL_PHYSICAL_VALIDATION` |

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
| GearCube Lab Web Application (apps/web)                                           |
|                                                                                   |
|  [ User Interface & History State (React Local Orchestration) ]                   |
|        |                                                                          |
|        +---> [ 3D Viewport & Visual Meshes (React Three Fiber / Three.js) ]       |
|        |           ^                                                              |
|        |           | (Kinematic Animation Keyframes)                              |
|        v           |                                                              |
|  [ Puzzle Domain Core (Pure TypeScript Engine — packages/core) ]                  |
|        ^           |                                                              |
|        |           v (Discrete State & Legal Moves)                               |
|  [ Solver Engine (Web Worker: Classical Search / AI Inference) - Future ]         |
|                                                                                   |
|  [ Research & Benchmark Harness (Headless Runner & Telemetry Exporter) - Future ] |
|                                                                                   |
|  [ Vision State Ingestion (Webcam Stream & Face Recognition) - Future ]           |
+-----------------------------------------------------------------------------------+
```

---

## 11. Architecture Overview

The system strictly adheres to unidirectional dependency boundaries:

$$\text{Presentation Layer (UI/3D)} \longrightarrow \text{Domain Core Contracts} \longleftarrow \text{Solver / Research Layers}$$

- **Core Layer:** Pure mathematical models and permutation contracts (`packages/core`).
- **Kinematic Layer:** Translates discrete moves into continuous rotational transforms (`packages/kinematics`).
- **Presentation Layer:** R3F/Three.js rendering and React UI state management (`apps/web`).
- **Computation Layer:** Web Worker hosting search algorithms and heuristic evaluators (Future `packages/solvers`).
- **Research Pipeline:** Python/PyTorch offline training environment generating lightweight heuristic weights (`ml/`).

---

## 12. Module Responsibilities

| Module | Core Responsibility | Dependency Restrictions | Status |
| :--- | :--- | :--- | :--- |
| `packages/core` | Discrete state models, move definitions, legality checks, canonical serialization, and materialized piece views | Zero external dependencies (no React, no Three.js, no DOM) | Implemented & Accepted |
| `packages/kinematics` | Continuous trajectory generation, coupled gear angles, static piece placement projection | Depends only on `@gearcube/core` | Implemented & Accepted |
| `apps/web` | Web application container hosting React UI components, single authoritative session state, history timeline, R3F/Three.js 3D viewport, and procedural piece geometries | Depends only on `@gearcube/core` and `@gearcube/kinematics` (no Zustand requirement for Phase 3) | Implemented & Accepted |
| `packages/solvers` | Classical graph search (primary: BFS, Bidirectional BFS, IDA*; optional: IDDFS, A*, Pattern Databases), heuristic estimators | Depends only on `@gearcube/core` | Planned (Phase 4) |
| `packages/benchmark` | Deterministic benchmark harness, seed generation, statistical metric export | Depends on `@gearcube/core` and `@gearcube/solvers` | Planned (Phase 5) |
| `ml/` (Python) | PyTorch model architectures, offline self-play/dataset generation, heuristic export | Python (version selected based on ML dependency compatibility) managed exclusively via `uv` | Planned (Phase 6) |
| `packages/vision` | Webcam video capture, color segmentation, state consistency validation, and correction | Browser WebRTC / Canvas APIs; depends on `@gearcube/core` | Planned (Phase 7) |

---

## 13. Data Flow

1. **User Action:** User clicks "Rotate Front Face Clockwise ($180^\circ$)".
2. **UI Dispatch:** UI dispatches `applyMove(currentState, { face: 'F', direction: 'CW' })` to the Domain Core.
3. **Core Validation:** Domain Core validates move legality, generates the immutable next `GearCubeState`, and computes the state hash.
4. **Kinematic Translation:** Kinematic Engine computes the continuous rotational trajectory (including driving gear and intermediate gear rotations).
5. **Renderer Execution:** 3D Renderer animates the gear meshes along the kinematic trajectory.
6. **State Synchronization:** Upon animation completion, UI state store updates the active puzzle state.
7. **Solver Notification:** If Solve Mode is active, the Solver Worker receives the new `GearCubeState` to evaluate optimal solution branches.

---

## 14. Technology Strategy

- **Language:** TypeScript 5.x with strict type checking enabled (`strict: true`, `noImplicitAny: true`).
- **Build System & Dev Server:** Vite for rapid development and optimized tree-shaking builds.
- **Frontend Framework:** React 18 / 19.
- **UI State Management:** React local application state / pure transition functions (Zustand not currently required / used for Phase 3).
- **Unit & Integration Testing:** Vitest for rapid, in-memory core, kinematics, and renderer tests.
- **E2E & Browser Testing:** Playwright for automated browser interactions and state validation (Planned for Phase 3C).
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
- **State Consistency & Validation:** Camera / vision processing produces a candidate `GearCubeState`. Before it becomes authoritative Core state, the candidate must pass the formally defined state consistency and/or reachability validation available for the finalized puzzle model. Invalid or uncertain recognition must remain user-correctable.

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
- Pure Core unit tests and group-theoretic property invariants (formalized in [`GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md)).
- Deterministic move sequence reversibility ($M \cdot M^{-1} = I$) and single-axis 12-flip identity ($F^{12} = I$).
- Kinematic continuous interpolation assertions (formalized in [`KINEMATIC_CONTRACT.md`](../architecture/KINEMATIC_CONTRACT.md)).
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
- **Phase 0A:** Project Governance & Canonical Design Baseline *(Accepted)*
- **Phase 0B:** Physical Mechanism Characterization & Puzzle Contract Synthesis *(Active)*
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

## 29. Open Questions & Deferred Physical Characterization

The canonical Standard Gear Cube reference model is formally decided and synthesized (`41,472` reachable states, $180^\circ$ face flips, $F^{12}=I$, 2-tetrad corner structure, 3 middle slices in $V_4 \times \mathbb{Z}_3$). The following items remain deferred or open:

1. `[OPEN / OPTIONAL_PHYSICAL_VALIDATION]` **Daiso Commercial Equivalence:** Whether the physical Daiso SKU `4550480834955` matches 1st-generation Gear Cube mechanics or contains physical mold variations.
2. `[OPEN / PHASE_2_KINEMATICS_DERIVATION]` **Local Gear Tooth Mesh Profile & Signed Spin Axis:** Exact 3D tooth geometry and local signed rotation vector alignment for 3D visual rendering.
3. `[OPEN / TO DEFINE]` **Solver Cost Metric Mapping:** Formalization of GearCube Lab solver cost metrics relative to Jaap's published `Single turns` and `Multiple turns` distance tables.

## 30. Definition of Done for Major Milestones

A milestone is considered **DONE** if and only if:
1. All phase deliverables defined in [`docs/development/ROADMAP.md`](../development/ROADMAP.md) are completed.
2. Automated test suites for the phase pass with zero errors.
3. No architectural boundaries or prohibitions from [`AGENTS.md`](../../AGENTS.md) are violated.
4. All associated documentation in [`docs/`](../README.md) is updated and verified.
5. A comprehensive completion report with reproducible verification output is submitted.
