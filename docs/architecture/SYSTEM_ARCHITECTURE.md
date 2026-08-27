# SYSTEM_ARCHITECTURE.md — System Architecture & Component Contracts

> **Document Status:** `DECIDED (Accepted architecture through Phase 4; Phase 5 preflight architecture accepted); Phase 5 implementation: IN PROGRESS (Phase 5A Implemented & Accepted)`
> **Target System:** GearCube Lab Web Application & Research Framework

---

## 1. Architectural Principles & Boundaries

GearCube Lab is architected around strict unidirectional layer isolation. The domain core represents the pure mathematical truth of the puzzle, completely decoupled from rendering frameworks, UI component libraries, and browser APIs.

### Core Architecture Axioms:
1. **Unidirectional Dependency Direction:**
   $$\text{UI} \longrightarrow \text{Renderer} \longrightarrow \text{Kinematics} \longrightarrow \text{Core}$$
   $$\text{Solvers} \longrightarrow \text{Core}$$
   $$\text{Benchmark} \longrightarrow \text{Solvers} \ \text{and} \ \text{Core}$$
   *(Phase 5 Benchmark preflight accepted architecture: `packages/benchmark` depends directly on `@gearcube/core` and `@gearcube/solvers`; `apps/web` Research Mode consumes `@gearcube/benchmark` via a dedicated Web Worker; status: `PHASE5_PREFLIGHT_ACCEPTED`.)*
2. **Zero Core Framework Coupling:**
   The Puzzle Domain Core has zero dependencies on React, Three.js, R3F, Zustand, Web APIs, DOM, or ML frameworks.
3. **Renderer Independence:**
   The 3D Scene Graph and mesh instances reflect state; they never own, mutate, or calculate puzzle state transitions.
4. **Thread Boundary Isolation:**
   Expensive combinatorial search and batch benchmark algorithms execute outside the browser UI/main thread in background Web Workers so that solving and benchmarking do not block rendering or interaction.

---

## 2. High-Level System Architecture Diagram

```mermaid
graph TD
    subgraph UserSpace [User Interaction & Presentation Layer — apps/web]
        UI[Application & UI State<br/>React / Local State Orchestration]
        Renderer[3D Viewport & Visual Meshes<br/>Three.js / React Three Fiber]
    end

    subgraph CoreSpace [Domain Core & Kinematics]
        Core[Puzzle Domain Core<br/>Pure TypeScript Engine — packages/core]
        Kinematics[Kinematic Engine<br/>Gear Ratios & Trajectories — packages/kinematics]
        Encoding[State Encoding & Serialization<br/>Deterministic Hashes / Canonical Keys]
    end

    subgraph ComputeSpace [Solver Subsystem (Implemented) & Research Subsystems (Phase 5 In Progress)]
        WorkerAdapter[Browser Solver Worker Adapter<br/>apps/web/src/workers/solver.worker.ts]
        SolverEngine[Pure Solver Engine<br/>Pure TS Algorithms — packages/solvers]
        BenchmarkWorker[Browser Benchmark Worker Adapter<br/>apps/web/src/workers/benchmark.worker.ts — Future Phase 5D]
        BenchmarkEngine[Pure Benchmark Engine<br/>packages/benchmark — Phase 5A Implemented & Accepted]
        NodeCLI[Node CLI Runner<br/>packages/benchmark/src/cli.ts — Future Phase 5B]
    end

    subgraph FutureSubsystems [Offline Research & Vision Ingestion — Future]
        MLTraining[Offline ML Training Pipeline<br/>Python / PyTorch / uv]
        VisionPipeline[Camera & Vision Ingestion<br/>Webcam Capture & Validation — packages/vision]
    end

    %% Interactions
    UI -->|Render Calls & Presentation Config| Renderer
    UI -->|Dispatches Moves| Core
    Core -->|materializeState -> fromView/toView| Kinematics
    Core -->|Generates Hashes| Encoding
    Kinematics -->|Evaluated Transforms| Renderer

    UI -->|Initiates Solve / Terminate| WorkerAdapter
    WorkerAdapter -->|Imports & Runs Search| SolverEngine
    SolverEngine -->|Evaluates States & Legal Moves| Core
    WorkerAdapter -->|Streams Progress & Terminal Results| UI

    UI -->|Initiates Research Run / Cancel| BenchmarkWorker
    BenchmarkWorker -->|Executes Benchmark Suites| BenchmarkEngine
    NodeCLI -->|Executes Headless Suites| BenchmarkEngine
    BenchmarkEngine -->|Evaluates Search Algorithms| SolverEngine
    BenchmarkEngine -->|Traverses Independent Corpus| Core

    MLTraining -.->|Exports Weights / ONNX / JSON| SolverEngine
    VisionPipeline -.->|Validates & Ingests Reconstructed State| Core
```

---

## 3. Core Modules & Responsibilities

### 3.1. Discrete Domain Core (`packages/core`)
- **Responsibilities:**
  - Holds the single source of puzzle truth (`GearCubeState`, `CornerConfiguration`, `EdgeSliceCoordinate`, `SpatialFrame`).
  - Implements canonical discrete transitions `applyMove(state, move)` pursuant to [`GEAR_CUBE_STATE_MODEL.md`](GEAR_CUBE_STATE_MODEL.md) and [`PUZZLE_CONTRACTS.md`](PUZZLE_CONTRACTS.md).
  - Materializes canonical piece placements and generates discrete permutation views.
  - Produces deterministic serialized state keys (`serializeLogicalState`) and validates state structures.
- **Prohibited Dependencies:** Zero runtime dependencies. No Three.js, React, DOM, or node-specific built-ins.

### 3.2. Kinematic Engine (`packages/kinematics`)
- **Responsibilities:**
  - Converts physical piece placement views `(fromView, move, toView)` into continuous kinematic trajectories parameterized by normalized mechanical progress $p \in [0, 1]$ pursuant to [`ADR-0006`](../decisions/ADR-0006-VIEW-BASED-KINEMATICS-AND-RENDERER-QUOTIENTS.md) and [`KINEMATIC_CONTRACT.md`](KINEMATIC_CONTRACT.md).
  - Computes exact coupled angular displacements:
    - Outer face: $180^\circ \cdot p$
    - Middle slice: $90^\circ \cdot p$
    - Intermediate gear cogs: $60^\circ \cdot p$
  - Generates evaluated rigid-body component transforms for smooth 3D animation.
- **Prohibited Dependencies:** Does not depend on WebGL rendering contexts, Three.js meshes, React, or DOM elements.

### 3.3. 3D Renderer & View (`apps/web/src/components/**` — Conceptual View Layer)
- **Responsibilities:**
  - Manages the Three.js scene graph, lights, OrbitControls orbital camera, and mesh instancing inside `apps/web` (e.g. `GearCubeViewport.tsx`, `GearCubeModel.tsx`, procedural piece geometries, and fixed material/sticker mappings defined in `materials.ts`; interchangeable visual skin switching is deferred to future presentation enhancements).
  - Consumes Kinematic Plans and ComponentTransforms to position 3D meshes along calculated trajectories.
  - Maintains zero puzzle state authority: rendering is strictly downstream of domain state and kinematic projections.
- **Topology Note:** Implemented directly within `apps/web/src/components/` rather than as an isolated `packages/renderer` package; maintains strict layer separation by consuming domain projections internally from `@gearcube/core` and `@gearcube/kinematics` alongside presentation framework dependencies (React, React Three Fiber, Three.js).

### 3.4. Application & UI State (`apps/web` — Conceptual Presentation Layer)
- **Responsibilities (Implemented & Accepted Features):**
  - Orchestrates interactive application UI, controls, and presentation lifecycle.
  - Manages single authoritative session state (`GearCubeSessionState` in `apps/web/src/components/cube/animation.ts`) via React local state / pure transition functions.
  - Hosts implemented and accepted Phase 3 features (canonical move history timeline, undo/redo stacks, deterministic seeded scramble generator, keyboard controls, and responsive layout under `apps/web/src/components/**`) which wrap and reference canonical session snapshots without becoming a second puzzle authority.
  - Dispatches canonical move requests to the Domain Core.
  - Hosts implemented and accepted Phase 4 features: initiates background solver Worker tasks (`apps/web/src/workers/solver.worker.ts`), renders Solve Mode controls (SolvePanel, PlaybackControls), algorithm selection, search progress telemetry, and solution playback controller with expected-prefix state guarding.
- **Topology Note:** Implemented directly within `apps/web` rather than as a separate `packages/ui` package; uses standard React presentation tools without external state-management libraries (no Zustand requirement). Project-internal workspace dependencies: `@gearcube/core`, `@gearcube/kinematics`, and `@gearcube/solvers`.

### 3.5. Pure Solver Engine (`packages/solvers` — Implemented & Accepted — Phase 4)
- **Responsibilities:**
  - Hosts pure classical graph search algorithms (primary baselines: BFS, Bidirectional BFS, IDA* with H2 two-slice PDB admissible heuristic; optional candidates: IDDFS, A*, Pattern Databases — deferred).
  - Defines pure result contracts, search options, and serializable protocol schemas.
  - Encapsulated within a Web Worker adapter hosted in `apps/web/src/workers/solver.worker.ts` to run asynchronously off the main thread.
  - Reports periodic search telemetry (nodes expanded, nodes generated, algorithm-specific depth/bounds, elapsed time) via message passing.
  - User cancellation is handled by host-driven `worker.terminate()` (no in-band CANCEL_SOLVE protocol message required).
- **Prohibited Dependencies:** Must not access DOM, window, Three.js, React, or browser Worker global objects directly. Depends only on `@gearcube/core`.

### 3.6. Research & Benchmark Harness (`packages/benchmark` — Phase 5 In Progress)
- **Status & Scope:** `PHASE5_PREFLIGHT_ACCEPTED` (Phase 5A foundation implemented & accepted; Phases 5B–5D pending; [`docs/development/PHASE_5_IMPLEMENTATION_PLAN.md`](../development/PHASE_5_IMPLEMENTATION_PLAN.md)).
- **Core Responsibilities:**
  - **Implemented (Phase 5A):** Pure `@gearcube/benchmark` package, materialized v1 benchmark schemas, `BenchmarkSuiteConfig` runtime validation, stable state-derived case identity (`d${exactDepth}:${stateKey}`), and independent Core-only exact-distance corpus builder (discovering 41,472 canonical states and diameter 8 without calling production solvers).
  - **Pending (Phase 5B):** Deterministic stratified sampling (FNV1A_UTF16_CODE_UNITS_32 + Mulberry32 PRNG), batch runner evaluating solvers (`solveBfs`, `solveBidirectionalBfs`, `solveIdaStar`), and lossless JSON / flat 14-column RFC-4180 CSV exports.
  - **Pending (Phase 5C):** Empirical evaluation datasets and classical solver comparative report.
  - **Pending (Phase 5D):** Dedicated browser Web Worker (`apps/web/src/workers/benchmark.worker.ts`) and Research Mode UI.
- **Execution & Import Boundaries:**
  - **Shared Engine (`packages/benchmark`):** Pure TypeScript, browser-safe root entry with zero UI/DOM, zero 3rd-party runtime dependencies, and zero `node:fs` / `node:path` / CLI imports.
  - **Node CLI Adapter (`packages/benchmark/src/cli.ts` — Future Phase 5B):** Isolated Node-only terminal runner with filesystem output (`node:fs`); unreachable from the browser-safe root engine entry.
  - **Browser Research Mode (`apps/web` — Future Phase 5D):** Dedicated Web Worker (`apps/web/src/workers/benchmark.worker.ts`) importing the browser-safe engine and preventing heavy benchmark workloads from blocking the UI thread.
- **Prohibited Dependencies:** Zero dependencies on React, Three.js, R3F, DOM, or Worker global objects in shared engine entry.

### 3.7. Offline ML Research Pipeline (`ml/` — Future Phase 6)
- **Responsibilities:**
  - Offline Python research environment managed exclusively with `uv` (exact Python version to be selected based on ML dependency compatibility).
  - Implements PyTorch neural networks for value estimation and policy guidance.
  - Exports trained weights in compact portable formats (e.g., JSON weights or ONNX) for browser worker inference.

### 3.8. Computer Vision Ingestion (`packages/vision` — Future Phase 7)
- **Responsibilities:**
  - Streams webcam video feed via WebRTC `getUserMedia`.
  - Segments face boundaries, classifies sticker colors, and detects gear orientations.
  - Reconstructs candidate `GearCubeState` and performs state consistency and reachability validation before ingestion into Core, allowing user corrections for ambiguous detections.

---

## 4. Cross-Cutting Concerns

### 4.1. Thread Boundary & Worker Communication
Communication between the UI main thread and the Solver Web Worker occurs exclusively via serializable JSON-compatible messages:

```
[ UI Thread ]  --- { type: 'START_SEARCH', requestId: '1', state: GearCubeState, algorithm: 'BFS' } ---> [ Worker Adapter ]
[ UI Thread ]  <-- { type: 'SEARCH_STARTED', requestId: '1' } <---------------------------------------- [ Worker Adapter ]
[ UI Thread ]  <-- { type: 'SEARCH_PROGRESS', requestId: '1', telemetry: SearchTelemetry } <---------- [ Worker Adapter ]
[ UI Thread ]  <-- { type: 'SEARCH_COMPLETE', requestId: '1', result: SolveSuccess } <----------------- [ Worker Adapter ]
```

### 4.2. Error Handling & Invariant Violations
- Core operations throw strongly typed domain errors (e.g., `IllegalMoveError`, `InvalidStateError`).
- UI layer catches and translates domain errors into user-facing alerts without crashing the 3D viewport.
- Solver Worker catches catchable runtime exceptions and reports deterministic limit states (`SEARCH_LIMIT_REACHED`) or execution errors (`SEARCH_ERROR`) to the main thread, while user cancellation is handled via host-driven `worker.terminate()`.
