# SYSTEM_ARCHITECTURE.md — System Architecture & Component Contracts

> **Document Status:** `DECIDED`
> **Target System:** GearCube Lab Web Application & Research Framework

---

## 1. Architectural Principles & Boundaries

GearCube Lab is architected around strict unidirectional layer isolation. The domain core represents the pure mathematical truth of the puzzle, completely decoupled from rendering frameworks, UI component libraries, and browser APIs.

### Core Architecture Axioms:
1. **Unidirectional Dependency Direction:**
   $$\text{UI} \longrightarrow \text{Renderer} \longrightarrow \text{Kinematics} \longrightarrow \text{Core}$$
   $$\text{Solvers} \longrightarrow \text{Core}$$
   $$\text{Benchmark} \longrightarrow \text{Solvers} \longrightarrow \text{Core}$$
2. **Zero Core Framework Coupling:**
   The Puzzle Domain Core has zero dependencies on React, Three.js, R3F, Zustand, Web APIs, DOM, or ML frameworks.
3. **Renderer Independence:**
   The 3D Scene Graph and mesh instances reflect state; they never own, mutate, or calculate puzzle state transitions.
4. **Thread Boundary Isolation:**
   Expensive combinatorial search algorithms execute outside the browser UI/main thread in background Web Workers so that solving does not directly block rendering or interaction.

---

## 2. High-Level System Architecture Diagram

```mermaid
graph TD
    subgraph UserSpace [User Interaction & Presentation Layer]
        UI[Application & UI State<br/>React / Zustand]
        Renderer[3D Viewport & Visual Skins<br/>Three.js / React Three Fiber]
    end

    subgraph CoreSpace [Domain Core & Kinematics]
        Core[Puzzle Domain Core<br/>Pure TypeScript Engine]
        Kinematics[Kinematic Engine<br/>Gear Ratios & Trajectories]
        Encoding[State Encoding & Serialization<br/>Deterministic Hashes / Canonical Keys]
    end

    subgraph ComputeSpace [Solver & Research Subsystems]
        SolverWorker[Solver Engine<br/>Web Worker Thread]
        Benchmark[Research & Benchmark Harness<br/>Deterministic Seed Suites]
    end

    subgraph FutureSubsystems [Offline Research & Vision Ingestion]
        MLTraining[Offline ML Training Pipeline<br/>Python / PyTorch / uv]
        VisionPipeline[Camera & Vision Ingestion<br/>Webcam Capture & Validation]
    end

    %% Interactions
    UI -->|Render Calls & Skin Config| Renderer
    UI -->|Dispatches Moves| Core
    Core -->|materializeState -> fromView/toView| Kinematics
    Core -->|Generates Hashes| Encoding
    Kinematics -->|Evaluated Transforms| Renderer

    UI -->|Initiates Solve / Config| SolverWorker
    SolverWorker -->|Evaluates States & Legal Moves| Core
    SolverWorker -->|Streams Solution & Progress Telemetry| UI

    Benchmark -->|Evaluates Search Algorithms| SolverWorker
    Benchmark -->|Collects Performance Metrics| UI

    MLTraining -.->|Exports Weights / ONNX / JSON| SolverWorker
    VisionPipeline -.->|Validates & Ingests Reconstructed State| Core
```

---

## 3. Layer Breakdown & Component Responsibilities

### 3.1. Puzzle Domain Core (`packages/core`)
- **Responsibilities:**
  - Defines the discrete representation of the Standard Gear Cube structured around natural orbit coordinates (corners in $S_4$, 3 edge slices in $V_4 \times \mathbb{Z}_3$; detailed in [`GEAR_CUBE_STATE_MODEL.md`](GEAR_CUBE_STATE_MODEL.md)).
  - Validates move legality (strictly directed $180^\circ$ face flips).
  - Applies discrete state transitions: $\text{State}_{t+1} = \text{applyMove}(\text{State}_t, \text{Move})$.
  - Computes deterministic string serialization and exports derived materialized piece views via `materializeState()`.
  - Checks solved-state criteria and group invariants.
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

### 3.3. 3D Renderer & Visual Skins (`packages/renderer`)
- **Responsibilities:**
  - Manages the Three.js scene graph, lights, orbital camera, and mesh instancing.
  - Implements interchangeable visual skins (e.g., standard Daiso plastic, wireframe, exploded view).
  - Consumes Kinematic Plans to transform 3D meshes along calculated trajectories.
  - Listens to raycast interactions (future drag interactions).
- **Prohibited Dependencies:** Must not contain any puzzle move transition logic or state truth.

### 3.4. Application & UI State (`packages/ui`)
- **Responsibilities:**
  - Orchestrates UI state via Zustand stores (mode: `Play`, `Solve`, `Research`).
  - Manages move history timeline, undo/redo stacks, and scramble generation.
  - Dispatches move requests to the Domain Core and initiates solver worker tasks.
  - Renders minimalist controls, solution playback bars, and telemetry metrics.
- **Prohibited Dependencies:** Pure UI components must not bypass domain contracts.

### 3.5. Solver Engine (`packages/solvers`)
- **Responsibilities:**
  - Hosts classical graph search algorithms (primary baselines: BFS, Bidirectional BFS, IDA*; optional candidates: IDDFS, A*, Pattern Databases).
  - Encapsulated within a Web Worker to run asynchronously off the main thread.
  - Reports periodic search telemetry (nodes expanded, search depth, elapsed time) via message passing.
- **Prohibited Dependencies:** Must not access DOM, window, or Three.js objects.

### 3.6. Research & Benchmark Harness (`packages/benchmark`)
- **Responsibilities:**
  - Executes batch automated search runs across predefined scramble seed suites.
  - Gathers statistical telemetry: time-to-solution, memory footprint, branch pruning factor, solution optimality.
  - Exports deterministic benchmark data in JSON and CSV formats for research documentation.

### 3.7. Offline ML Research Pipeline (`ml/`)
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
[ UI Thread ]  --- { type: 'START_SEARCH', state: GearCubeState, algorithm: 'IDA_STAR' } ---> [ Worker ]
[ UI Thread ]  <-- { type: 'SEARCH_PROGRESS', nodes: 14500, depth: 4, elapsedMs: 120 } <--- [ Worker ]
[ UI Thread ]  <-- { type: 'SEARCH_COMPLETE', solution: Move[], metrics: BenchmarkMetrics } - [ Worker ]
```

### 4.2. Error Handling & Invariant Violations
- Core operations throw strongly typed domain errors (e.g., `IllegalMoveError`, `InvalidStateError`).
- UI layer catches and translates domain errors into user-facing alerts without crashing the 3D viewport.
- Solver Worker catches out-of-memory or timeout conditions and gracefully reports failure states to the main thread.
