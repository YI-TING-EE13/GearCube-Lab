# PHASE_1D_IMPLEMENTATION_PLAN.md — SpatialFrame, Materialization & Serialization

> **Document Status:** `ACCEPTED`
> **Target Phase:** Phase 1D (SpatialFrame, Materialization & Serialization)
> **Baseline Commit:** `cc38c194e95656e2af03ce951c8df14d3c35cbdb` (`Adopt center orientation semantics`)
> **Branch:** `phase/1d-frame-materialization-plan-repair`
> **Applicability:** Pure TypeScript Domain Core (`packages/core`)
> **Lifecycle:** `HISTORICAL MILESTONE PLAN / ACCEPTED`
> **Current Authority:** The accepted Phase 1D result and current milestone state are maintained in [`ROADMAP.md`](ROADMAP.md) and [`GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md).

---

## 1. Executive Summary & Baseline Context

This document establishes the repaired, falsifiable implementation plan for **Phase 1D: SpatialFrame, Materialization & Serialization** of `GearCube Lab`.

Phase 1D connects canonical discrete puzzle state ($41,472$ states) to derived 3D fixed-spatial piece placements ($165,888$ expanded representations) and deterministic canonical logical state serialization.

```text
               +-------------------------------------------------------+
               |             CANONICAL PUZZLE DOMAIN                   |
               |                                                       |
               |   GearCubeState (41,472 Cartesian Product States)     |
               |   applyMove(state, move) -> nextState (Phase 1C)      |
               +---------------------------+---------------------------+
                                           |
                                           v
       +-----------------------------------+-----------------------------------+
       |                                                                       |
       v                                                                       v
+-----------------------------+                                 +-----------------------------+
|    SPATIAL FRAME & VIEW     |                                 |    LOGICAL SERIALIZATION    |
|                             |                                 |                             |
| SpatialFrame (0 | 1 | 2 | 3) |                                 | serializeLogicalState(...)  |
| nextSpatialFrame(frame, F)  |                                 | deserializeLogicalState(...) |
|                             |                                 |                             |
| materializeState(...)       |                                 | Accepted Phase 1D Canonical |
| -> PiecePlacementView       |                                 | String Grammar & Strict     |
|    (Corners, Edges, Centers)|                                 | Type Validation             |
+-----------------------------+                                 +-----------------------------+
```

---

## 2. Provenance & Supersession of Blocked Draft

1. **Historical Blocker Background:**
   The initial Phase 1D draft (based on Phase 1C baseline `3c8c48bd63b8c8b5bb4ebe9b67d8645e95cf6019`) was blocked due to an underspecified center mechanics contract (`FROZEN_CENTER_MATERIALIZATION_MAPPING_UNDERSPECIFIED`). While centers contribute factor 1 to state cardinality, the exact executable placement and orientation mapping had not been uniquely formalized.
2. **Resolution via Accepted ADR-0004:**
   [`ADR-0004-CENTER-ORIENTATION-SEMANTICS.md`](../decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md) was formally accepted at commit `cc38c194e95656e2af03ce951c8df14d3c35cbdb`. It established:
   - **`CENTER_ORIENTATION_QUOTIENT`:** Center axial orientation is quotiented out at standard discrete endpoints.
   - **`CenterPlacement` Contract:** Refined strictly to `{ readonly slot: CenterSlot; readonly pieceId: CenterPieceId; }`.
   - **Model A Derivation:** Exact algebraic $S_4 / V_4$ factorization determining canonical center piece identity from raw coordinates $(C, k_X, k_Y, k_Z)$ with $0$ mismatches across all $1,536$ coordinate keys.
3. **Operational Supersession:**
   This repaired plan operationally supersedes the uncommitted blocked draft. Historical Git commits are untouched because the blocked draft was never committed.

---

## 3. Core Architectural Principles & Invariants

1. **Canonical State Independence & Authority:**
   `GearCubeState` is the sole source of discrete truth. `applyMove(state, move)` operates strictly on `GearCubeState` and does NOT accept or return `SpatialFrame`.
2. **Materialization is Strictly Derived & Non-Authoritative:**
   `materializeState(state, spatialFrame)` is a deterministic pure function mapping canonical coordinates to physical spatial slots. It has zero side-effects and zero runtime dependencies on DOM, Canvas, Three.js, React, or ML.
3. **$\mathbb{Z}_3$ Phase Invariance Under Frame Transformations:**
   Proper rigid body rotations in $SO(3)$ preserve middle-slice gear twist angles identically across all 4 frames. Logical gear phases $p \in \{0, 1, 2\}$ remain invariant ($\text{CanonicalPhase}(S, f, p) = p$).
4. **Terminology Separation ($165,888$ Derived vs Variant):**
   The $165,888 = 41,472 \times 4$ fixed-spatial representations represent the full-state frame expansion of the standard Gear Cube in fixed 3D space. This is strictly distinct from the separately documented 165,888 edge-base-marked Gear Cube variant.
5. **Center Policy (Pursuant to Accepted ADR-0004):**
   Centers are derived piece placements in `PiecePlacementView`. The standard discrete endpoint view stores `{ slot, pieceId }` with zero center orientation state.
6. **Serialization Scope & Purpose:**
   Phase 1D serialization implements `serializeLogicalState` and `deserializeLogicalState` for deterministic persistence, interchange, debug inspection, and URL/storage encoding. Dense solver integer codecs, BFS hash keys, and pattern databases are strictly separate concerns deferred to Phase 4.
7. **Phase 1B/1C Source Freezing:**
   Existing Phase 1B and Phase 1C production source files (`values.ts`, `constants.ts`, `validation.ts`, `state.ts`, `transition-data.ts`, `transitions.ts`) remain 100% frozen and unmodified.

---

## 4. Official SpatialFrame Semantics & Domain

### 4.1. SpatialFrame Definition
`SpatialFrame` represents the physical spatial slot location where the reference corner piece `DBL` (piece 3 in $T_{\text{ref}}$) resides:

| Frame Index | Physical Slot of Piece 3 (`DBL`) | Global Rigid Rotation from Reference Frame | Meaning |
| :---: | :---: | :---: | :--- |
| **`3`** | `DBL` $(-1, -1, -1)$ | Identity ($I$) | **Canonical Reference Frame (Default / Solved)** |
| **`2`** | `DFR` $(+1, -1, +1)$ | $R_y(\pi)$ ($180^\circ$ rotation about $Y$-axis) | $Y$-axis inverted reference frame |
| **`1`** | `UBR` $(+1, +1, -1)$ | $R_z(\pi)$ ($180^\circ$ rotation about $Z$-axis) | $Z$-axis inverted reference frame |
| **`0`** | `UFL` $(-1, +1, +1)$ | $R_x(\pi)$ ($180^\circ$ rotation about $X$-axis) | $X$-axis inverted reference frame |

- **SpatialFrame Values:** Exactly **4 discrete states** (`0 | 1 | 2 | 3`).
- **Frame-Face Transition Cases:** Exactly **24 cases** ($4 \text{ SpatialFrames} \times 6 \text{ physical faces}$).

### 4.2. SpatialFrame Definitions Owned by `packages/core/src/spatial-frame.ts`
```typescript
/**
 * Canonical collection of valid SpatialFrame identifiers.
 */
export const SPATIAL_FRAMES = Object.freeze([0, 1, 2, 3] as const);

/**
 * Discrete 4-state spatial frame representing the physical slot
 * location of the reference corner piece DBL (0: UFL, 1: UBR, 2: DFR, 3: DBL).
 * Solved / default canonical reference value: 3.
 */
export type SpatialFrame = (typeof SPATIAL_FRAMES)[number];

export const DEFAULT_SPATIAL_FRAME: SpatialFrame = 3;

/**
 * Runtime type guard validating whether an unknown value is a valid SpatialFrame.
 */
export function isSpatialFrame(value: unknown): value is SpatialFrame {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 3;
}
```

---

## 5. Frame Slot Permutations & Involution Invariant

For each `SpatialFrame` $f \in \{0, 1, 2, 3\}$, the slot permutation mapping canonical component slots to physical spatial slots is:

```typescript
export const FRAME_SLOT_PERMS: Readonly<
  Record<
    SpatialFrame,
    Readonly<{
      readonly A: readonly [number, number, number, number]; // T_free
      readonly B: readonly [number, number, number, number]; // T_ref
      readonly X: readonly [number, number, number, number]; // Slice X
      readonly Y: readonly [number, number, number, number]; // Slice Y
      readonly Z: readonly [number, number, number, number]; // Slice Z
    }>
  >
> = Object.freeze({
  3: Object.freeze({
    A: Object.freeze([0, 1, 2, 3] as const),
    B: Object.freeze([0, 1, 2, 3] as const),
    X: Object.freeze([0, 1, 2, 3] as const),
    Y: Object.freeze([0, 1, 2, 3] as const),
    Z: Object.freeze([0, 1, 2, 3] as const),
  }),
  2: Object.freeze({
    A: Object.freeze([1, 0, 3, 2] as const),
    B: Object.freeze([1, 0, 3, 2] as const),
    X: Object.freeze([1, 0, 3, 2] as const),
    Y: Object.freeze([2, 3, 0, 1] as const),
    Z: Object.freeze([1, 0, 3, 2] as const),
  }),
  1: Object.freeze({
    A: Object.freeze([2, 3, 0, 1] as const),
    B: Object.freeze([2, 3, 0, 1] as const),
    X: Object.freeze([3, 2, 1, 0] as const),
    Y: Object.freeze([1, 0, 3, 2] as const),
    Z: Object.freeze([2, 3, 0, 1] as const),
  }),
  0: Object.freeze({
    A: Object.freeze([3, 2, 1, 0] as const),
    B: Object.freeze([3, 2, 1, 0] as const),
    X: Object.freeze([2, 3, 0, 1] as const),
    Y: Object.freeze([3, 2, 1, 0] as const),
    Z: Object.freeze([3, 2, 1, 0] as const),
  }),
});
```

### Self-Inverse Involution Invariant:
Because all four spatial frame transformations are order-2 $180^\circ$ rotations ($I, R_x(\pi), R_y(\pi), R_z(\pi)$), every slot permutation in `FRAME_SLOT_PERMS` is an order-2 involution:
$$\sigma \circ \sigma = I \implies \sigma^{-1} = \sigma$$

---

## 6. Materialized Value Vocabulary & PiecePlacementView

### 6.1. Exact Finite Slot and Piece Vocabulary (Owned by `packages/core/src/materializer.ts`)

```typescript
export const CORNER_SLOTS = Object.freeze([
  'UFL', 'UBR', 'DFR', 'DBL', // T_ref (0..3)
  'UFR', 'UBL', 'DFL', 'DBR', // T_free (4..7)
] as const);
export type CornerSlot = (typeof CORNER_SLOTS)[number];

export const CORNER_PIECE_IDS = Object.freeze([
  'corner-UFL', 'corner-UBR', 'corner-DFR', 'corner-DBL',
  'corner-UFR', 'corner-UBL', 'corner-DFL', 'corner-DBR',
] as const);
export type CornerPieceId = (typeof CORNER_PIECE_IDS)[number];

export const EDGE_SLOTS = Object.freeze([
  'UB', 'UF', 'DF', 'DB', // Slice X (0..3)
  'FL', 'FR', 'BR', 'BL', // Slice Y (4..7)
  'UR', 'UL', 'DL', 'DR', // Slice Z (8..11)
] as const);
export type EdgeSlot = (typeof EDGE_SLOTS)[number];

export const EDGE_PIECE_IDS = Object.freeze([
  'edge-UB', 'edge-UF', 'edge-DF', 'edge-DB',
  'edge-FL', 'edge-FR', 'edge-BR', 'edge-BL',
  'edge-UR', 'edge-UL', 'edge-DL', 'edge-DR',
] as const);
export type EdgePieceId = (typeof EDGE_PIECE_IDS)[number];

export const CENTER_SLOTS = Object.freeze(['U', 'D', 'F', 'B', 'R', 'L'] as const);
export type CenterSlot = (typeof CENTER_SLOTS)[number];

export const CENTER_PIECE_IDS = Object.freeze([
  'center-U', 'center-D', 'center-F', 'center-B', 'center-R', 'center-L',
] as const);
export type CenterPieceId = (typeof CENTER_PIECE_IDS)[number];
```

### 6.2. Exact Placement View Types (Owned by `packages/core/src/materializer.ts`)
```typescript
export interface CornerPlacement {
  readonly slot: CornerSlot;
  readonly pieceId: CornerPieceId;
  readonly orbit: 'free' | 'ref';
}

export interface EdgePlacement {
  readonly slot: EdgeSlot;
  readonly pieceId: EdgePieceId;
  readonly slice: 'X' | 'Y' | 'Z';
  readonly phase: SliceGearPhase;
}

export interface CenterPlacement {
  readonly slot: CenterSlot;
  readonly pieceId: CenterPieceId;
}

export interface PiecePlacementView {
  readonly corners: readonly CornerPlacement[]; // Exactly 8 corners in deterministic fixed-spatial slot order
  readonly edges: readonly EdgePlacement[];     // Exactly 12 edges in deterministic fixed-spatial slot order
  readonly centers: readonly CenterPlacement[]; // Exactly 6 centers in deterministic fixed-spatial slot order
}
```

### 6.3. Deterministic Fixed-Spatial Slot Output Ordering
Every invocation of `materializeState(state, spatialFrame)` produces items in identical, invariant order:
1. **Corners (8):** `['UFL', 'UBR', 'DFR', 'DBL', 'UFR', 'UBL', 'DFL', 'DBR']`
2. **Edges (12):** `['UB', 'UF', 'DF', 'DB', 'FL', 'FR', 'BR', 'BL', 'UR', 'UL', 'DL', 'DR']`
3. **Centers (6):** `['U', 'D', 'F', 'B', 'R', 'L']`

---

## 7. Normative Center Placement Derivation (Model A)

Pursuant to Accepted [`ADR-0004`](../decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md), center placement in canonical slots `['U', 'D', 'F', 'B', 'R', 'L']` is evaluated via:

$$\text{centerPlacement}(C, k_X, k_Y, k_Z) = \text{CENTER\_PERM\_OF\_C}[C] \circ K_X[k_X] \circ K_Y[k_Y] \circ K_Z[k_Z]$$

### 7.1. Composition Semantics
- Right-to-left evaluation: $(A \circ B)(\text{slot}) = A(B(\text{slot}))$.
- `CENTER_PERM_OF_C` (24 rows), `K_X` (4 rows), `K_Y` (4 rows), `K_Z` (4 rows) are internal data definitions in `packages/core/src/materializer.ts`.
- Zero rediscovery: Data is consumed directly from Accepted ADR-0004 Section 6.

### 7.2. Materialization Lifecycle Ordering
```text
1. Read canonical coordinates (C, kX, kY, kZ) from GearCubeState
2. Evaluate canonical center permutation via Model A
3. Apply SpatialFrame slot transformation to canonical center slots
4. Output fixed-spatial CenterPlacement[] array
```

---

## 8. Materialization Bijection & Full Normalization ($165,888$)

Every physical piece placement view can be unambiguously normalized back to its unique canonical state and spatial frame:

$$\text{normalizePiecePlacement}(view) \to (\text{canonicalState}, \text{spatialFrame})$$

- **Domain Size:** $41,472 \times 4 = \mathbf{165,888}$.
- **Required Implementation Acceptance Target:** $165,888 / 165,888$ exact identity recoveries ($0$ failures).
- **Ownership:** `normalizePiecePlacement` is an internal helper in `packages/core/src/materializer.ts`, used by test suites and verification harnesses.

---

## 9. Application Lifecycle & SpatialFrame Evolution ($1,990,656$)

Under a physical face turn on face $F \in \{U, D, F, B, R, L\}$, the reference corner piece `DBL` moves according to the 2-cycle corner transposition of that face:

```typescript
const FRAME_SWAPS: Record<Face, readonly [SpatialFrame, SpatialFrame]> = {
  U: [0, 1],
  D: [2, 3],
  F: [0, 2],
  B: [1, 3],
  R: [1, 2],
  L: [0, 3],
};

export function nextSpatialFrame(frame: SpatialFrame, face: Face): SpatialFrame {
  if (!isSpatialFrame(frame)) {
    throw new TypeError('Invalid SpatialFrame supplied to nextSpatialFrame');
  }
  if (!isFace(face)) {
    throw new TypeError('Invalid Face supplied to nextSpatialFrame');
  }

  const [s1, s2] = FRAME_SWAPS[face];
  if (frame === s1) return s2;
  if (frame === s2) return s1;
  return frame;
}
```

### Complete 24 Frame Transitions Table:

| Current Frame | Move Face $U$ | Move Face $D$ | Move Face $F$ | Move Face $B$ | Move Face $R$ | Move Face $L$ |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`3`** | `3` | `2` | `3` | `1` | `3` | `0` |
| **`2`** | `2` | `3` | `0` | `2` | `1` | `2` |
| **`1`** | `0` | `1` | `1` | `3` | `2` | `1` |
| **`0`** | `1` | `0` | `2` | `0` | `0` | `3` |

- **Required Implementation Acceptance Target:** $1,990,656 / 1,990,656$ lifecycle transitions match physical transition oracle with $0$ mismatches across corners, edges, and centers.

---

## 10. Canonical Logical State Serialization

### 10.1. Provenance & Classification
- **Accepted Historical Requirement (`PUZZLE_CONTRACTS.md` line 94):**
  The operation `serializeLogicalState(state: GearCubeState): string` is listed as a required canonical string serialization method on `PuzzleCoreAPI`.
- **Classification Status:** `ACCEPTED_PHASE_1D_SERIALIZATION_CONTRACT` (Formally Transitioned upon Phase 1D Plan Acceptance).
  The exact string grammar format (`C:<C>|X:<kx>.<px>|Y:<ky>.<py>|Z:<kz>.<pz>`) and the companion parser `deserializeLogicalState(serialized: string): GearCubeState` are permanently accepted and frozen as the normative Phase 1D serialization contract.
- **Contract Enforcement & Immutability:**
  Production implementation must conform strictly to this accepted contract without redesigning tokens, separators, error categories, or field ordering. Any future deviation requires formal architectural contract review.

### 10.2. Exact Grammar & Golden Strings
- **Grammar:** `C:<C>|X:<kx>.<px>|Y:<ky>.<py>|Z:<kz>.<pz>`
- **Solved-State Golden:** `"C:0|X:0.0|Y:0.0|Z:0.0"`
- **After `U CW` from Solved:** `"C:6|X:1.0|Y:3.1|Z:1.0"`
- **After `R CW` from Solved:** `"C:21|X:3.1|Y:0.0|Z:3.0"`

### 10.3. Implementation Specification (Owned by `packages/core/src/serialization.ts`)
```typescript
export function serializeLogicalState(state: GearCubeState): string {
  if (!isGearCubeState(state)) {
    throw new TypeError('Invalid GearCubeState supplied to serializeLogicalState');
  }
  return `C:${state.cornerConfiguration}|X:${state.sliceX.permutationClass}.${state.sliceX.phase}|Y:${state.sliceY.permutationClass}.${state.sliceY.phase}|Z:${state.sliceZ.permutationClass}.${state.sliceZ.phase}`;
}

export function deserializeLogicalState(serialized: string): GearCubeState {
  if (typeof serialized !== 'string') {
    throw new TypeError('Serialized state must be a string');
  }

  const parts = serialized.split('|');
  if (parts.length !== 4) {
    throw new TypeError(`Malformed serialized state component count: "${serialized}"`);
  }

  const parseCorner = (str: string): number => {
    if (!str.startsWith('C:')) throw new TypeError(`Malformed corner prefix: "${str}"`);
    const val = str.slice(2);
    if (!/^\d+$/.test(val)) throw new TypeError(`Invalid corner integer: "${val}"`);
    const c = Number(val);
    if (!isCornerConfiguration(c)) throw new TypeError(`CornerConfiguration out of range: ${c}`);
    return c;
  };

  const parseSlice = (str: string, prefix: 'X' | 'Y' | 'Z'): { permutationClass: SlicePermutationClass; phase: SliceGearPhase } => {
    if (!str.startsWith(`${prefix}:`)) throw new TypeError(`Malformed slice prefix: "${str}"`);
    const val = str.slice(2);
    const sub = val.split('.');
    if (sub.length !== 2 || !/^\d+$/.test(sub[0]!) || !/^\d+$/.test(sub[1]!)) {
      throw new TypeError(`Malformed slice coordinate format: "${val}"`);
    }
    const k = Number(sub[0]);
    const p = Number(sub[1]);
    if (!isSlicePermutationClass(k) || !isSliceGearPhase(p)) {
      throw new TypeError(`Invalid slice coordinate values: k=${k}, p=${p}`);
    }
    return { permutationClass: k, phase: p };
  };

  const state: GearCubeState = {
    cornerConfiguration: parseCorner(parts[0]!),
    sliceX: parseSlice(parts[1]!, 'X'),
    sliceY: parseSlice(parts[2]!, 'Y'),
    sliceZ: parseSlice(parts[3]!, 'Z'),
  };

  if (!isGearCubeState(state)) {
    throw new TypeError('Deserialized state failed full structural validation');
  }

  return state;
}
```

---

## 11. Public API Boundary & Layered Export Delta

### 11.1. Accepted Baseline Public API (Pre-Phase 1D: 29 Exports)

#### A. Accepted Phase 1B Public API (28 Exports from baseline `index.ts`)
- **Values / Canonical Collections (5 from `values.ts`):** `FACES`, `DIRECTIONS`, `CORNER_CONFIGURATIONS`, `SLICE_PERMUTATION_CLASSES`, `SLICE_GEAR_PHASES`.
- **Types / Interfaces (8 from `values.ts`):** `Face`, `Direction`, `Move`, `CornerConfiguration`, `SlicePermutationClass`, `SliceGearPhase`, `EdgeSliceCoordinate`, `GearCubeState`.
- **Constants & Domain Counts (5 from `constants.ts`):** `ALL_MOVES`, `CORNER_CONFIGURATION_COUNT`, `EDGE_SLICE_STATE_COUNT`, `CANONICAL_DOMAIN_SIZE`, `SOLVED_GEAR_CUBE_STATE`.
- **Validation Type Guards (8 from `validation.ts`):** `isFace`, `isDirection`, `isMove`, `isCornerConfiguration`, `isSlicePermutationClass`, `isSliceGearPhase`, `isEdgeSliceCoordinate`, `isGearCubeState`.
- **State Predicates (2 from `state.ts`):** `equalsGearCubeState`, `isSolved`.

#### B. Accepted Phase 1C Public API Delta (+1 Export from baseline `index.ts`)
- **Move Transitions (1 from `transitions.ts`):** `applyMove`.

**Total Pre-Phase 1D Public API Exports:** Exactly **29 exports** ($28 + 1 = 29$).

---

### 11.2. Proposed Phase 1D Public API Delta (+24 Exports)

- **Public Types/Interfaces (11):**
  `SpatialFrame`, `PiecePlacementView`, `CornerPlacement`, `EdgePlacement`, `CenterPlacement`, `CornerSlot`, `EdgeSlot`, `CenterSlot`, `CornerPieceId`, `EdgePieceId`, `CenterPieceId`.
- **Public Runtime Values/Constants (8):**
  `SPATIAL_FRAMES`, `DEFAULT_SPATIAL_FRAME`, `CORNER_SLOTS`, `EDGE_SLOTS`, `CENTER_SLOTS`, `CORNER_PIECE_IDS`, `EDGE_PIECE_IDS`, `CENTER_PIECE_IDS`.
- **Public Functions (5):**
  `isSpatialFrame`, `nextSpatialFrame`, `materializeState`, `serializeLogicalState`, `deserializeLogicalState`.

**Total Post-Phase 1D Public API Exports:** Exactly **53 exports** ($29 + 24 = \mathbf{53}$).

---

### 11.3. Complete Symbol Ownership Table

| Symbol | Kind | Owner Module | Visibility |
| :--- | :--- | :--- | :--- |
| `SpatialFrame` | Type | `packages/core/src/spatial-frame.ts` | **Public** (re-exported via `index.ts`) |
| `SPATIAL_FRAMES` | Value (const) | `packages/core/src/spatial-frame.ts` | **Public** (re-exported via `index.ts`) |
| `DEFAULT_SPATIAL_FRAME` | Value (const) | `packages/core/src/spatial-frame.ts` | **Public** (re-exported via `index.ts`) |
| `isSpatialFrame` | Function | `packages/core/src/spatial-frame.ts` | **Public** (re-exported via `index.ts`) |
| `nextSpatialFrame` | Function | `packages/core/src/spatial-frame.ts` | **Public** (re-exported via `index.ts`) |
| `FRAME_SLOT_PERMS` | Value (const) | `packages/core/src/spatial-frame.ts` | **Internal** (unexported from `index.ts`) |
| `FRAME_SWAPS` | Value (const) | `packages/core/src/spatial-frame.ts` | **Internal** (unexported from `index.ts`) |
| `PiecePlacementView` | Interface | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `CornerPlacement` | Interface | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `EdgePlacement` | Interface | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `CenterPlacement` | Interface | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `CornerSlot` | Type | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `EdgeSlot` | Type | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `CenterSlot` | Type | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `CornerPieceId` | Type | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `EdgePieceId` | Type | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `CenterPieceId` | Type | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `CORNER_SLOTS` | Value (const) | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `EDGE_SLOTS` | Value (const) | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `CENTER_SLOTS` | Value (const) | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `CORNER_PIECE_IDS` | Value (const) | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `EDGE_PIECE_IDS` | Value (const) | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `CENTER_PIECE_IDS` | Value (const) | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `materializeState` | Function | `packages/core/src/materializer.ts` | **Public** (re-exported via `index.ts`) |
| `CENTER_PERM_OF_C` | Value (const) | `packages/core/src/materializer.ts` | **Internal** (unexported from `index.ts`) |
| `K_X`, `K_Y`, `K_Z` | Value (const) | `packages/core/src/materializer.ts` | **Internal** (unexported from `index.ts`) |
| `T_REF_TABLE` | Value (const) | `packages/core/src/materializer.ts` | **Internal** (unexported from `index.ts`) |
| `normalizePiecePlacement` | Function | `packages/core/src/materializer.ts` | **Internal** (unexported from `index.ts`) |
| `serializeLogicalState` | Function | `packages/core/src/serialization.ts` | **Public** (re-exported via `index.ts`) |
| `deserializeLogicalState` | Function | `packages/core/src/serialization.ts` | **Public** (re-exported via `index.ts`) |

### 11.4. Re-Export Boundary Policy in `packages/core/src/index.ts`
`packages/core/src/index.ts` serves strictly as a public re-export facade. It must not contain implementation functions, internal table definitions, or duplicate type declarations.

---

## 12. Module Dependency DAG

```text
packages/core/src/
├── values.ts (Phase 1B - FROZEN)
├── constants.ts (Phase 1B - FROZEN)
├── validation.ts (Phase 1B - FROZEN)
├── state.ts (Phase 1B - FROZEN)
├── transition-data.ts (Phase 1C - FROZEN)
├── transitions.ts (Phase 1C - FROZEN)
├── spatial-frame.ts [NEW] (owns SPATIAL_FRAMES, isSpatialFrame, nextSpatialFrame, FRAME_SLOT_PERMS)
├── materializer.ts [NEW] (owns materializeState, normalizePiecePlacement, Model A internal data)
├── serialization.ts [NEW] (owns serializeLogicalState, deserializeLogicalState)
└── index.ts [MODIFY] (re-exports public Phase 1D symbols)
```

- Zero circular dependencies.
- Zero dependencies on DOM, Canvas, Three.js, React, or ML.

---

## 13. Implementation File Scope

### Files to CREATE (5):
1. `packages/core/src/spatial-frame.ts`: Owns `SPATIAL_FRAMES`, `DEFAULT_SPATIAL_FRAME`, `SpatialFrame`, `isSpatialFrame`, `nextSpatialFrame`, `FRAME_SLOT_PERMS`, `FRAME_SWAPS`.
2. `packages/core/src/materializer.ts`: Owns `materializeState`, `normalizePiecePlacement`, Model A internal dictionaries (`CENTER_PERM_OF_C`, $K_X, K_Y, K_Z$), `T_REF_TABLE`, slot/piece constants and types.
3. `packages/core/src/serialization.ts`: Owns `serializeLogicalState`, `deserializeLogicalState`.
4. `packages/core/tests/materializer.test.ts`: Owns unit tests, 24 frame transitions, Model A 1,536 keys, 12 move goldens, 165,888 bijection, 1,990,656 lifecycle, and independent physical oracle.
5. `packages/core/tests/serialization.test.ts`: Owns parser units, invalid input handling, serialization goldens, 41,472 round-trips, and 41,472 string uniqueness tests.

### Files to MODIFY (3):
6. `packages/core/src/index.ts`: Re-export the 24 new Phase 1D public symbols.
7. `docs/development/ROADMAP.md`: Synchronize Phase 1D status notes.
8. `docs/development/TEST_STRATEGY.md`: Document Level 3 materialization & serialization test invariants.

### Files UNCHANGED:
- `packages/core/src/values.ts`
- `packages/core/src/constants.ts`
- `packages/core/src/validation.ts`
- `packages/core/src/state.ts`
- `packages/core/src/transition-data.ts`
- `packages/core/src/transitions.ts`
- All package manifests, configs, and existing tests.

---

## 14. Test Oracle Design & Test File Ownership

### 14.1. Non-Tautological Independent Oracle
To avoid tautological test verification:
- Test suites reconstruct expected piece positions from an independent physical 3D coordinate rotation simulation rather than importing `CENTER_PERM_OF_C` from production source.

### 14.2. Clear Test Placement Separation
- **`materializer.test.ts`** owns:
  - 24 `SpatialFrame` $\times$ physical-face transition tests;
  - Model A $1,536$ coordinate key exhaustive verification ($0$ mismatches);
  - Center identity Solved + 12 directed move golden vectors;
  - $165,888 / 165,888$ state-frame materialization and round-trip bijection tests;
  - $1,990,656 / 1,990,656$ application lifecycle transition tests against independent physical oracle.
- **`serialization.test.ts`** owns:
  - Parser unit tests and malformed/out-of-range input validation error precedence;
  - Serialization golden strings (Solved + move goldens);
  - $41,472 / 41,472$ canonical state round-trip bijective recovery tests;
  - $41,472$ canonical state serialization string uniqueness test.

---

## 15. Roadmap Lifecycle & Status Transitions

To preserve strict repository governance, Phase 1D status updates are partitioned into two distinct lifecycle events:

1. **Implementation-Time Document Sync (During Implementation Task):**
   `docs/development/ROADMAP.md` is updated to record that Phase 1D implementation is complete and ready for independent review (e.g. `Status: VERIFIED / Ready for Independent Acceptance`). It must **NOT** mark Phase 1D as `Completed` or advance Phase 1E to `Next`.
2. **Acceptance-Time Status Transition (During Formal Acceptance Task):**
   Only after every Phase 1D acceptance gate passes independently in a dedicated acceptance review, `docs/development/ROADMAP.md` formally transitions:
   - **Phase 1D:** `Completed`
   - **Phase 1E:** `Next`

---

## 16. Falsifiable Acceptance Gates

| Gate ID | Verification Protocol & Observable Condition |
| :--- | :--- |
| **`GATE_1D_BASELINE_EXACT`** | Worktree based on accepted ADR-0004 commit `cc38c194e95656e2af03ce951c8df14d3c35cbdb`. |
| **`GATE_1D_EXACT_SCOPE`** | Exactly 8 files changed (5 created, 3 modified) with zero extraneous untracked files. |
| **`GATE_1D_NO_DEPENDENCY_DRIFT`** | Zero new dependencies added to package manifests. |
| **`GATE_1D_PHASE1B_1C_SOURCE_PRESERVATION`** | `values.ts`, `constants.ts`, `validation.ts`, `state.ts`, `transition-data.ts`, `transitions.ts` are 100% byte-for-byte identical to baseline. |
| **`GATE_1D_CORE_PURITY`** | `scripts/check-core-deps.mjs` exits 0 with zero runtime/dev dependencies. |
| **`GATE_1D_SPATIALFRAME_DOMAIN`** | `SpatialFrame` derived from `SPATIAL_FRAMES = [0, 1, 2, 3] as const`. |
| **`GATE_1D_DEFAULT_FRAME_3`** | `DEFAULT_SPATIAL_FRAME === 3` representing canonical reference frame. |
| **`GATE_1D_FRAME_NUMBERING`** | Frames: 3=Identity/DBL, 2=Ry(pi)/DFR, 1=Rz(pi)/UBR, 0=Rx(pi)/UFL verified. |
| **`GATE_1D_FRAME_SLOT_PERMS`** | `FRAME_SLOT_PERMS` matches frozen Phase 0 tables bit-for-bit. |
| **`GATE_1D_FRAME_PERM_INVOLUTION`** | All slot permutations in `FRAME_SLOT_PERMS` verified as order-2 involutions ($\sigma^2 = I$). |
| **`GATE_1D_FRAME_TRANSITIONS_24`** | `nextSpatialFrame(frame, face)` verified across all 24 frame-face combinations. |
| **`GATE_1D_PHASE_INVARIANCE`** | Logical gear phase $p \in \{0, 1, 2\}$ verified invariant across all 4 spatial frames. |
| **`GATE_1D_PUBLIC_API_DELTA`** | Exactly the approved 24 symbols added to `@gearcube/core`; all 29 pre-Phase-1D exports preserved (Total = 53). |
| **`GATE_1D_INTERNAL_FRAME_TABLES_PRIVATE`** | `FRAME_SLOT_PERMS`, `FRAME_SWAPS`, `CENTER_PERM_OF_C`, `normalizePiecePlacement` unexported. |
| **`GATE_1D_MODULE_DAG`** | Strictly acyclic dependency graph with zero circular imports. |
| **`GATE_1D_PIECE_VIEW_EXACT_SHAPE`** | `materializeState` returns `{ corners: 8, edges: 12, centers: 6 }`. |
| **`GATE_1D_CORNER_ID_SLOT_VOCAB`** | Corners strictly use typed `CornerSlot` and `CornerPieceId` literals. |
| **`GATE_1D_EDGE_ID_SLOT_VOCAB`** | Edges strictly use typed `EdgeSlot` and `EdgePieceId` literals. |
| **`GATE_1D_CENTER_SLOT_DOMAIN`** | `CenterSlot` strictly equals `'U' \| 'D' \| 'F' \| 'B' \| 'R' \| 'L'`. |
| **`GATE_1D_CENTER_PIECE_DOMAIN`** | `CenterPieceId` strictly equals `'center-U' \| 'center-D' \| 'center-F' \| 'center-B' \| 'center-R' \| 'center-L'`. |
| **`GATE_1D_NO_ORIENTATION_IN_ENDPOINT_VIEW`** | `CenterPlacement` contains `{ slot, pieceId }` with zero `orientationAngleDegrees` field. |
| **`GATE_1D_MODEL_A_RAW_KEYS`** | $1,536 / 1,536$ coordinate keys produce exact center placement matches ($0$ mismatches). |
| **`GATE_1D_CENTER_GOLDENS`** | Solved state + all 12 directed single-move goldens verified. |
| **`GATE_1D_DETERMINISTIC_PLACEMENT_ORDER`** | Placement view arrays maintain invariant fixed-spatial slot item order for all states. |
| **`GATE_1D_MATERIALIZATION_165888`** | All $165,888$ state-frame pairs produce valid piece placement views ($0$ failures). |
| **`GATE_1D_NORMALIZATION_165888`** | $165,888 / 165,888$ state-frame pairs satisfy $\text{normalize}(\text{materialize}(s, f)) \equiv (s, f)$. |
| **`GATE_1D_FOUR_REPRESENTATIVES_PER_STATE`** | Exactly 4 distinct physical representations per canonical state. |
| **`GATE_1D_APPLICATION_LIFECYCLE_1990656`** | $1,990,656 / 1,990,656$ application lifecycle transitions match physical transition oracle ($0$ mismatches). |
| **`GATE_1D_LIFECYCLE_ORACLE_INDEPENDENCE`** | Test lifecycle oracle is structurally isolated from production materializer. |
| **`GATE_1D_SERIALIZATION_EXACT_GRAMMAR`** | Serializer produces exact grammar `C:<C>\|X:<kx>.<px>\|Y:<ky>.<py>\|Z:<kz>.<pz>`. |
| **`GATE_1D_SERIALIZATION_GOLDENS`** | Solved state serializes to `"C:0\|X:0.0\|Y:0.0\|Z:0.0"`; sample move goldens verified. |
| **`GATE_1D_SERIALIZATION_STRICT_VALIDATION`** | Malformed strings, header errors, non-integers, out-of-range coordinates throw `TypeError`. |
| **`GATE_1D_SERIALIZATION_ROUNDTRIP_41472`** | $41,472 / 41,472$ canonical states satisfy $\text{deserializeLogicalState}(\text{serializeLogicalState}(s)) \equiv s$. |
| **`GATE_1D_SERIALIZATION_UNIQUENESS_41472`** | Exactly $41,472$ unique serialization strings generated across canonical state space. |
| **`GATE_1D_NO_DENSE_SOLVER_CODEC`** | Solver dense integer codec is omitted from Phase 1D and deferred to Phase 4. |
| **`GATE_1D_NO_SPATIALFRAME_IN_GEARCUBESTATE`** | `GearCubeState` contains zero frame fields. |
| **`GATE_1D_NO_RENDERER_COUPLING`** | Zero Three.js, Canvas, DOM, or CSS imports in Domain Core. |
| **`GATE_1D_NO_KINEMATICS`** | Zero continuous animation, progress, or duration logic in Domain Core. |
| **`GATE_1D_TEST_DISCOVERY`** | Vitest discovers and runs `materializer.test.ts` and `serialization.test.ts`. |
| **`GATE_1D_TYPECHECK`** | `npm run typecheck` passes with zero errors across `@gearcube/web` and `@gearcube/core`. |
| **`GATE_1D_TESTS`** | All unit and exhaustive test suites pass with zero failures. |
| **`GATE_1D_BUILD`** | `npm run build` compiles `@gearcube/web` successfully. |
| **`GATE_1D_VERIFY`** | `npm run verify` passes all 4 stages. |

---

## 17. Implementation Execution Order

1. **`spatial-frame.ts`**: Implement `SPATIAL_FRAMES`, `SpatialFrame`, `DEFAULT_SPATIAL_FRAME`, `isSpatialFrame`, `nextSpatialFrame`, `FRAME_SLOT_PERMS`, `FRAME_SWAPS`.
2. **`materializer.ts` (Model A Internal Data)**: Embed complete 24-entry `CENTER_PERM_OF_C` and 4-entry $K_X, K_Y, K_Z$ slice actions.
3. **`materializer.ts` (Canonical Materializer)**: Implement canonical corner, edge, and center placement generators.
4. **`materializer.ts` (SpatialFrame Transformation)**: Implement `materializeState(state, spatialFrame)` slot mapping.
5. **`materializer.ts` (Inverse Normalization)**: Implement internal `normalizePiecePlacement(view)`.
6. **`serialization.ts`**: Implement `serializeLogicalState` and `deserializeLogicalState` with strict validation.
7. **`index.ts`**: Re-export approved Phase 1D public types and functions.
8. **`serialization.test.ts`**: Implement unit tests, golden vectors, error handling, and 41,472 round-trip suite.
9. **`materializer.test.ts` (Unit & Model A)**: Implement unit tests, 12 move goldens, and Model A 1,536 key verification.
10. **`materializer.test.ts` (165,888 Bijection)**: Implement exhaustive 165,888 state-frame materialization and normalization test suite.
11. **`materializer.test.ts` (1,990,656 Lifecycle)**: Implement exhaustive 1,990,656 application transition oracle comparison suite.
12. **Documentation Synchronization**: Update `ROADMAP.md` and `TEST_STRATEGY.md`.
13. **Verification & Acceptance**: Run `npm run verify`, `git diff --check`, and markdown link validation.

---

## 18. Failure & Stop Conditions

Implementation must **immediately STOP** and request architectural review if:
1. Any Model A composition mismatch ($>0$ mismatches) is detected against reference mechanics.
2. Center piece identity is found to require physical move history.
3. Center axial orientation appears necessary for standard discrete puzzle state.
4. `SpatialFrame` cardinality differs from 4 ($0, 1, 2, 3$).
5. `GearCubeState` cardinality differs from $41,472$.
6. Implementation appears to require modifying frozen `packages/core/src/transition-data.ts`.
7. Independent test oracle disagrees on any of the $165,888$ states or $1,990,656$ transitions.
8. Serialization requires new center fields or breaks bijective round-trips.
9. File scope exceeds the approved 8-file implementation boundary.
