# ADR-0001: Foundational Architecture, Domain Separation, and Technology Stack

> **Status:** `DECIDED`
> **Date:** Phase 0A Baseline
> **Deciders:** Project Architect / Core Contributor

---

## 1. Context & Problem Statement

GearCube Lab requires an architecture capable of supporting three distinct problem domains:
1. **Interactive 3D Simulation:** Smooth, visually faithful, physically coupled gear rendering.
2. **Pure Combinatorial Mathematics:** Rigorous permutation group state representation, move legality, and deterministic state hashing.
3. **High-Performance Search & Research:** Classical graph search algorithms, Web Worker asynchronous execution, and future neural/AI heuristics.

Coupling 3D rendering meshes directly with puzzle state logic leads to severe testing friction, frame-rate drops during search, and brittle domain code. A rigorous architectural foundation is required to decouple these concerns from Day 1.

---

## 2. Decision Drivers

- **Mathematical Integrity:** Puzzle state must be exact, discrete, and immutable.
- **Rendering Performance:** 3D rendering should remain responsive without being blocked by graph search (proposed target: 60 FPS on reference devices).
- **Modularity:** Visual skins, shaders, and 3D assets must be swappable without altering puzzle semantics.
- **Research Extensibility:** Ability to benchmark classical solvers and future AI models against identical test sets.
- **Empirical Rigor:** Avoiding premature hardcoding of unverified mechanical parameters.

---

## 3. Considered Architectural Options

- **Option A: Monolithic 3D Scene (Coupled):** Store cube state directly in Three.js Object3D rotation matrices and mesh userData.
  - *Pros:* Quick to prototype initial visual rotations.
  - *Cons:* Disastrous for solvers, impossible to run headless unit tests, non-deterministic state keys, massive memory overhead during search tree expansions.
- **Option B: Pure Domain Core with Layered Adapters (Chosen):** Decouple Discrete Core, Kinematic Trajectories, Visual Skins, and Web Worker Solvers into independent packages with strict unidirectional dependencies.
  - *Pros:* Core is 100% testable in pure TypeScript; solvers run headless in Web Workers; 3D renderer simply visualizes kinematic plans.
  - *Cons:* Requires defining clean interface contracts upfront (Phase 0A).

---

## 4. Key Architectural Decisions

### 4.1. Domain Core as Sole Source of Truth
The discrete puzzle state (`GearCubeState`) is the sole authoritative representation. 3D meshes in Three.js are purely visual representations that synchronize with Core state via kinematic trajectories.

### 4.2. Decoupling: Puzzle Definition vs. Kinematics vs. Visual Skin
- **Puzzle Definition:** Discrete group rules and legal moves ($180^\circ$ turns).
- **Kinematics:** Continuous interpolation functions and gear coupling ratios.
- **Visual Skin:** PBR materials, textures, and mesh geometry.

### 4.3. Technology Stack Selection
- **Frontend / 3D:** TypeScript, React, Vite, Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei`, and Zustand.
- **Testing:** Vitest for rapid unit/integration tests; Playwright for browser E2E tests.
- **Package Management:** `npm` as initial low-complexity default.
- **Machine Learning:** Python (version to be selected based on ML dependency compatibility), PyTorch, managed exclusively via `uv`.

### 4.4. Two-Stage Solver Strategy: Classical Before AI
Primary classical search baselines (BFS, Bidirectional BFS, IDA*) alongside optional candidates (IDDFS, A*, Pattern Databases) will be established and benchmarked first in Phase 4. Neural heuristic models (Phase 6) will be evaluated against this established classical baseline.

### 4.5. Web Worker Isolation for Search
All graph search algorithms and heavy heuristic evaluations must run inside dedicated Web Workers, communicating via asynchronous serializable messages.

### 4.6. Empirical Reverse-Engineering Gate (Phase 0B)
Before freezing move semantics or writing automated group theory test oracles, the reference physical model (Daiso SKU `4550480834955`) must be empirically characterized.

---

## 5. Consequences & Trade-offs

### Positive:
- High unit test speed ($< 10 \text{ ms}$ for core test suites).
- Responsive UI interaction with zero main thread stuttering during heavy search.
- Clean separation allows changing 3D visual assets without risking subtle solver regressions.
- Seamless headless execution of automated research benchmarks.

### Negative / Overhead:
- Requires maintaining explicit serialization and message-passing contracts between UI and Web Workers.
- Kinematic keyframes must be mathematically calculated rather than relying on standard Three.js rotation grouping hacks.

---

## 6. Unresolved Questions & Parameters (`OPEN`)

The following decisions remain intentionally open pending Phase 0B empirical characterization:
1. `[OPEN]` Exact gear teeth count and transmission ratio between face rotations and intermediate gears.
2. `[OPEN]` Angular rotation formula of the center slice during $180^\circ$ face turns.
3. `[OPEN]` Total discrete phase states per edge gear ($N_{\text{phases}}$).
4. `[OPEN]` State-space symmetry groups and exact reachable state count.
5. `[OPEN]` Neural model runtime format in browser (ONNX Web vs. custom lightweight JSON tensor evaluator).
