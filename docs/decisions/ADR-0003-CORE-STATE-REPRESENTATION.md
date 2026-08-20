# ADR-0003: Canonical Core State Representation, Derived Materialized Views, and Solver Codec Boundary

> **Status:** `DECIDED`
> **Date:** Phase 0B.3 Baseline
> **Deciders:** Project Architect / Core Contributor

---

## 1. Context & Problem Statement

`GearCube Lab` requires a formal discrete state model for the Standard Gear Cube ($41,472$ reachable states). The representation must satisfy four competing engineering requirements:
1. **Mathematical Precision & Invariant Alignment:** Directly reflect the puzzle's physical permutation group structure ($S_4$ corner tetrads, $V_4 \times \mathbb{Z}_3$ orthogonal edge slices).
2. **Human Readability & Developer Experience:** Facilitate straightforward debugging, unit testing, state inspection, and deterministic JSON/string logging.
3. **Decoupled 3D Rendering:** Supply sufficient spatial data for the downstream 3D renderer without coupling Core to scene graph nodes, matrix math, or visual styling.
4. **High-Performance Solver Extensibility:** Enable future graph search algorithms (BFS, Bidirectional BFS, IDA* in Phase 4) to utilize compact integer encodings or pattern databases without forcing the canonical domain model into an opaque format.

---

## 2. Considered Architectural Options

- **Option A: Monolithic Opaque Integer ($0 \dots 41,471$):**
  - Represent canonical state as a single scalar index via a bijective ranking algorithm.
  - *Pros:* Minimal memory per state in search algorithms.
  - *Cons:* Opaque to human inspection; difficult to debug; tightly couples domain state logic to a specific permutation ranking algorithm; hampers incremental testing.
- **Option B: Coupled 3D Scene Graph / Transform Matrix:**
  - Store puzzle state directly in Three.js `Object3D` transforms and mesh user data.
  - *Pros:* Eliminates state mapping layer.
  - *Cons:* Strictly prohibited by repository invariants; non-deterministic; impossible to execute headless in Node/Deno/Web Workers; prone to floating-point drift.
- **Option C: Fully Materialized Physical Piece Object Graph (8 Corners + 12 Edges):**
  - Store complete individual piece objects with localized orientation integers and sub-stickers.
  - *Pros:* Directly mimics physical toy assembly.
  - *Cons:* Heavy allocation overhead during state transitions; introduces redundant center state; permits invalid combinations by construction unless complex validation filters are run.
- **Option D: Structured Readable Logical Coordinates with Layered Derived Views (Chosen):**
  - Canonical state is an immutable value object structured as a 24-state corner coordinate in $S_4$ and three independent $4 \times 3$ edge-slice coordinates in $V_4 \times \mathbb{Z}_3$:
    ```text
    GearCubeState = {
      cornerConfiguration: CornerConfiguration, // 0..23 (S4)
      sliceX: { permutationClass: 0|1|2|3 (V4), phase: 0|1|2 (Z3) },
      sliceY: { permutationClass: 0|1|2|3 (V4), phase: 0|1|2 (Z3) },
      sliceZ: { permutationClass: 0|1|2|3 (V4), phase: 0|1|2 (Z3) },
    }
    ```
  - Downstream consumers derive representations via pure functions:
    - **Renderer/Debug UI:** Derived `PiecePlacementView` via `materializeState()`.
    - **Search Solvers:** Derived compact hash/dense index via `StateCodec`.

---

## 3. Decision Outcome

We formally adopt **Option D**:

1. **Canonical Domain Boundary:** `GearCubeState` in `packages/core` is an immutable, readable value object structured around fixed-reference orientation-normalized orbit coordinates ($24 \times 12 \times 12 \times 12 = 41,472$ true Cartesian domain).
2. **Application / Display Frame:** Discrete `SpatialFrame` ($0 \dots 3$) tracks how the canonical fixed-reference frame maps to the currently displayed physical cube body in world space ($96 = 24 \times 4$).
3. **Renderer Layer Boundary:** Camera orientation, orbital controls, and view matrices are strictly external presentation concerns completely separate from both canonical state and `SpatialFrame`.
4. **Solver Layer Boundary:** Search algorithms in Phase 4 consume canonical `GearCubeState` (or compact bijective integer codecs derived directly from it) with zero dependency on display frames or render trees.
5. **Derived Materialized View:** Physical piece slots, individual gear phases, and center orientations are computed on-demand via pure function `materializeState(state, spatialFrame) -> PiecePlacementView`.

---

## 4. Consequences

### Positive:
- Domain state is 100% testable in pure TypeScript with zero external dependencies.
- State equality, hashing, and serialization are deterministic and human-inspectable.
- Eliminates redundant center state storage while providing complete physical layout on demand for 3D rendering.
- Preserves full flexibility for future solver optimization without polluting Core contracts.

### Negative / Trade-offs:
- Requires a lightweight materialization step when translating discrete state to 3D scene mesh transforms.

---

## 5. References
- Canonical State Model: [`docs/architecture/GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md)
- Kinematic Contract: [`docs/architecture/KINEMATIC_CONTRACT.md`](../architecture/KINEMATIC_CONTRACT.md)
- Reference Specification: [`docs/reference/STANDARD_GEAR_CUBE_SPEC.md`](../reference/STANDARD_GEAR_CUBE_SPEC.md)
