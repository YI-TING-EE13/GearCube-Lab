# GEAR_CUBE_STATE_MODEL.md — Canonical Discrete State & Transition Specification

> **Document Status:** `DECIDED` (Harmonized with [`ADR-0005`](../decisions/ADR-0005-CANONICAL-MOVE-TRANSITION-ALGEBRA.md))
> **Target Model:** Standard / Original Gear Cube (Oskar van Deventer / Meffert's Reference Model)
> **Applicability:** Pure TypeScript Domain Core (`packages/core`)

---

## 1. Executive Summary & Core Architectural Principles

This document formalizes the canonical discrete state representation, full-state frame normalization, direct transition algebra, and derived physical materialization of the Standard Gear Cube for `GearCube Lab`.

### Core Architectural Principles:
1. **Readable Fixed-Reference Canonical Coordinates:** Domain state is an immutable value object decomposed strictly along natural group-theoretic invariants: an orientation-normalized 24-state corner configuration ($T_{\text{free}} \in S_4$) and three independent $4 \times 3$ edge-slice coordinates ($V_4 \times \mathbb{Z}_3$) [`ADR-0003`](../decisions/ADR-0003-CORE-STATE-REPRESENTATION.md).
2. **True Cartesian Domain ($41,472$ States):** The valid canonical state space is a true Cartesian product of its fields:
   $$24 \times (4 \times 3) \times (4 \times 3) \times (4 \times 3) = 24 \times 12 \times 12 \times 12 = \mathbf{41,472}$$
   Every coordinate tuple in this domain is intrinsically valid and reachable without hidden cross-field constraints.
3. **Full-State Frame Normalization (Jaap Source Model):**
   - In fixed 3D space, the 6 face generators produce **96 reachable corner pairs** $(\text{Tetrad A}, \text{Tetrad B})$ and **165,888 expanded fixed-spatial puzzle states**.
   - Normalizing the entire physical puzzle (corners, all 3 middle slices, and phases) to the canonical reference frame where piece `DBL` (piece 3 in $T_{\text{ref}}$) resides in slot `DBL` yields exactly **41,472 canonical states** and a 4-state `SpatialFrame` factor ($165,888 = 41,472 \times 4$).
   - *(Important Distinction: This derived 165,888 expanded physical representation must not be conflated with Jaap's separately documented 165,888 edge-base-marked comparison variant).*
4. **Spatial Frame & Materialization Decoupling:**
   $$\text{Camera Viewpoint} \neq \text{Cube Spatial Frame} \neq \text{Canonical Puzzle State}$$
   `SpatialFrame` represents the discrete 4-state rigid orientation of the physical cube body relative to the display world coordinate system ($96 = 24 \times 4$). `materializeState(canonicalState, spatialFrame) -> PiecePlacementView` maps canonical state to physical 3D space without visual piece teleportation.
5. **Reference-Normalized Canonical Transitions ([`ADR-0005`](../decisions/ADR-0005-CANONICAL-MOVE-TRANSITION-ALGEBRA.md)):**
   Move transitions are computed directly on canonical coordinates via `applyMove(state, move): GearCubeState`. Under moves that rotate the reference corner `DBL` ($D, B, L$), canonical normalization automatically absorbs the induced rigid body rotation, preserving group closure on the 41,472-state domain without requiring `SpatialFrame` as an input to canonical transitions. Solvers operate exclusively on `GearCubeState`.

---

## 2. Spatial Reference Frame & Component Indexing

### 2.1. Global Spatial Axes (Right-Handed)
- **$+X$**: Right (`R`), **$-X$**: Left (`L`)
- **$+Y$**: Up (`U`), **$-Y$**: Down (`D`)
- **$+Z$**: Front (`F`), **$-Z$**: Back (`B`)

### 2.2. Corner Orbits & Spatial Slots
The 8 physical corner positions are partitioned into two non-mixing tetrahedral orbits:
- **Reference Tetrad $T_{\text{ref}}$ ($x \cdot y \cdot z = -1$):**
  - Slot `0`: `UFL` $(-1, +1, +1)$
  - Slot `1`: `UBR` $(+1, +1, -1)$
  - Slot `2`: `DFR` $(+1, -1, +1)$
  - Slot `3`: `DBL` $(-1, -1, -1)$ (Canonical Reference Slot for Piece 3)
- **Free Tetrad $T_{\text{free}}$ ($x \cdot y \cdot z = +1$):**
  - Slot `0`: `UFR` $(+1, +1, +1)$
  - Slot `1`: `UBL` $(-1, +1, -1)$
  - Slot `2`: `DFL` $(-1, -1, +1)$
  - Slot `3`: `DBR` $(+1, -1, -1)$

### 2.3. Edge Slice Orbits & Slot Indexing
The 12 physical edge gears are partitioned into 3 orthogonal middle slice orbits of 4 edges each:
- **Slice X ($M$-slice, in $y$-$z$ plane, normal to $X$-axis):**
  - Slot `0`: `UB` $(0, +1, -1)$
  - Slot `1`: `UF` $(0, +1, +1)$
  - Slot `2`: `DF` $(0, -1, +1)$
  - Slot `3`: `DB` $(0, -1, -1)$
- **Slice Y ($E$-slice, in $x$-$z$ plane, normal to $Y$-axis):**
  - Slot `0`: `FL` $(-1, 0, +1)$
  - Slot `1`: `FR` $(+1, 0, +1)$
  - Slot `2`: `BR` $(+1, 0, -1)$
  - Slot `3`: `BL` $(-1, 0, -1)$
- **Slice Z ($S$-slice, in $x$-$y$ plane, normal to $Z$-axis):**
  - Slot `0`: `UR` $(+1, +1, 0)$
  - Slot `1`: `UL` $(-1, +1, 0)$
  - Slot `2`: `DL` $(-1, -1, 0)$
  - Slot `3`: `DR` $(+1, -1, 0)$

---

## 3. Frozen SpatialFrame Slot Transformations

*(Classification: `DERIVED / PROJECT_COORDINATE_CONVENTION`)*

For each `SpatialFrame` $f \in \{0, 1, 2, 3\}$, the slot permutations mapping canonical component slots to physical spatial slots are:

```typescript
export const FRAME_SLOT_PERM: Record<SpatialFrame, {
  readonly A: readonly [number, number, number, number];
  readonly B: readonly [number, number, number, number];
  readonly X: readonly [number, number, number, number];
  readonly Y: readonly [number, number, number, number];
  readonly Z: readonly [number, number, number, number];
}> = {
  3: { A: [0, 1, 2, 3], B: [0, 1, 2, 3], X: [0, 1, 2, 3], Y: [0, 1, 2, 3], Z: [0, 1, 2, 3] }, // Identity
  2: { A: [1, 0, 3, 2], B: [1, 0, 3, 2], X: [1, 0, 3, 2], Y: [2, 3, 0, 1], Z: [1, 0, 3, 2] }, // R_Y(pi)
  1: { A: [2, 3, 0, 1], B: [2, 3, 0, 1], X: [3, 2, 1, 0], Y: [1, 0, 3, 2], Z: [2, 3, 0, 1] }, // R_Z(pi)
  0: { A: [3, 2, 1, 0], B: [3, 2, 1, 0], X: [2, 3, 0, 1], Y: [3, 2, 1, 0], Z: [3, 2, 1, 0] }, // R_X(pi)
};
```

### $\mathbb{Z}_3$ Logical Phase Invariance:
Proper rigid rotations in $SO(3)$ preserve common middle-slice gear twist parity:
$$\text{CanonicalPhase}(S, f, p) = p \quad (\forall f \in \{0, 1, 2, 3\}, \forall S \in \{X, Y, Z\}, \forall p \in \{0, 1, 2\})$$

---

## 4. Canonical Corner Materialization Table

*(Classification: `DERIVED / JAAP_REFERENCE_NORMALIZATION`)*

`CornerConfiguration` $C \in \{0, \dots, 23\}$ directly represents the permutation of $T_{\text{free}} \in S_4$, uniquely determining $T_{\text{ref}}$ in the normalized reference frame:

| $C$ | $T_{\text{free}}$ Permutation `[UFR, UBL, DFL, DBR]` | $T_{\text{ref}}$ Permutation `[UFL, UBR, DFR, DBL]` |
| :---: | :---: | :---: |
| **0** (Solved) | `[0, 1, 2, 3]` | `[0, 1, 2, 3]` |
| **1** | `[0, 1, 3, 2]` | `[1, 0, 2, 3]` |
| **2** | `[0, 2, 1, 3]` | `[0, 2, 1, 3]` |
| **3** | `[0, 2, 3, 1]` | `[2, 0, 1, 3]` |
| **4** | `[0, 3, 1, 2]` | `[1, 2, 0, 3]` |
| **5** | `[0, 3, 2, 1]` | `[2, 1, 0, 3]` |
| **6** | `[1, 0, 2, 3]` | `[1, 0, 2, 3]` |
| **7** | `[1, 0, 3, 2]` | `[0, 1, 2, 3]` |
| **8** | `[1, 2, 0, 3]` | `[1, 2, 0, 3]` |
| **9** | `[1, 2, 3, 0]` | `[2, 1, 0, 3]` |
| **10** | `[1, 3, 0, 2]` | `[0, 2, 1, 3]` |
| **11** | `[1, 3, 2, 0]` | `[2, 0, 1, 3]` |
| **12** | `[2, 0, 1, 3]` | `[2, 0, 1, 3]` |
| **13** | `[2, 0, 3, 1]` | `[0, 2, 1, 3]` |
| **14** | `[2, 1, 0, 3]` | `[2, 1, 0, 3]` |
| **15** | `[2, 1, 3, 0]` | `[1, 2, 0, 3]` |
| **16** | `[2, 3, 0, 1]` | `[0, 1, 2, 3]` |
| **17** | `[2, 3, 1, 0]` | `[1, 0, 2, 3]` |
| **18** | `[3, 0, 1, 2]` | `[2, 1, 0, 3]` |
| **19** | `[3, 0, 2, 1]` | `[1, 2, 0, 3]` |
| **20** | `[3, 1, 0, 2]` | `[2, 0, 1, 3]` |
| **21** | `[3, 1, 2, 0]` | `[0, 2, 1, 3]` |
| **22** | `[3, 2, 0, 1]` | `[1, 0, 2, 3]` |
| **23** | `[3, 2, 1, 0]` | `[0, 1, 2, 3]` |

---

## 5. Four Slice Permutation Classes ($V_4$) & Canonical Base Tables

For each middle slice, the 4 edges are parameterized relative to the corner reference frame via the Klein four-group $V_4 \triangleleft S_4$:

| Class Index | $V_4$ Relative Permutation | Permutation Notation | Physical Meaning |
| :---: | :---: | :---: | :--- |
| **`0`** | `[0, 1, 2, 3]` | Identity ($I$) | Unshifted relative base configuration |
| **`1`** | `[1, 0, 3, 2]` | $(0\,1)(2\,3)$ | Top/Bottom (or Front/Back) paired double transposition |
| **`2`** | `[2, 3, 0, 1]` | $(0\,2)(1\,3)$ | Cross-layer opposite paired double transposition |
| **`3`** | `[3, 2, 1, 0]` | $(0\,3)(1\,2)$ | Diagonal cross paired double transposition |

### Canonical Base Edge Permutations $B_S(C)$ (`PROJECT_COORDINATE_CONVENTION / DERIVED`):
Derived from fully normalized physical states:

| $C$ | $B_X(C)$ (Slice X Base) | $B_Y(C)$ (Slice Y Base) | $B_Z(C)$ (Slice Z Base) |
| :---: | :---: | :---: | :---: |
| **0** | `[0, 1, 2, 3]` | `[0, 1, 2, 3]` | `[0, 1, 2, 3]` |
| **1** | `[0, 1, 3, 2]` | `[0, 3, 2, 1]` | `[0, 1, 3, 2]` |
| **2** | `[0, 3, 2, 1]` | `[0, 2, 1, 3]` | `[0, 2, 1, 3]` |
| **3** | `[0, 3, 1, 2]` | `[0, 3, 1, 2]` | `[0, 2, 3, 1]` |
| **4** | `[0, 2, 3, 1]` | `[0, 2, 3, 1]` | `[0, 3, 1, 2]` |
| **5** | `[0, 2, 1, 3]` | `[0, 1, 3, 2]` | `[0, 3, 2, 1]` |
| **6** | `[0, 1, 3, 2]` | `[0, 3, 2, 1]` | `[0, 1, 3, 2]` |
| **7** | `[0, 1, 2, 3]` | `[0, 1, 2, 3]` | `[0, 1, 2, 3]` |
| **8** | `[0, 2, 3, 1]` | `[0, 2, 3, 1]` | `[0, 3, 1, 2]` |
| **9** | `[0, 2, 1, 3]` | `[0, 1, 3, 2]` | `[0, 3, 2, 1]` |
| **10** | `[0, 3, 2, 1]` | `[0, 2, 1, 3]` | `[0, 2, 1, 3]` |
| **11** | `[0, 3, 1, 2]` | `[0, 3, 1, 2]` | `[0, 2, 3, 1]` |
| **12** | `[0, 3, 1, 2]` | `[0, 3, 1, 2]` | `[0, 2, 3, 1]` |
| **13** | `[0, 3, 2, 1]` | `[0, 2, 1, 3]` | `[0, 2, 1, 3]` |
| **14** | `[0, 2, 1, 3]` | `[0, 1, 3, 2]` | `[0, 3, 2, 1]` |
| **15** | `[0, 2, 3, 1]` | `[0, 2, 3, 1]` | `[0, 3, 1, 2]` |
| **16** | `[0, 1, 2, 3]` | `[0, 1, 2, 3]` | `[0, 1, 2, 3]` |
| **17** | `[0, 1, 3, 2]` | `[0, 3, 2, 1]` | `[0, 1, 3, 2]` |
| **18** | `[0, 2, 1, 3]` | `[0, 1, 3, 2]` | `[0, 3, 2, 1]` |
| **19** | `[0, 2, 3, 1]` | `[0, 2, 3, 1]` | `[0, 3, 1, 2]` |
| **20** | `[0, 3, 1, 2]` | `[0, 3, 1, 2]` | `[0, 2, 3, 1]` |
| **21** | `[0, 3, 2, 1]` | `[0, 2, 1, 3]` | `[0, 2, 1, 3]` |
| **22** | `[0, 1, 3, 2]` | `[0, 3, 2, 1]` | `[0, 1, 3, 2]` |
| **23** | `[0, 1, 2, 3]` | `[0, 1, 2, 3]` | `[0, 1, 2, 3]` |

### Materialized Edge Permutation:
$$\text{AbsoluteEdges}(S, C, k) = V_4[k] \circ B_S(C)$$

---

## 6. Canonical State Schema & Direct Transition Rules

```typescript
/** Canonical corner configuration index in S_4 (0..23) */
export type CornerConfiguration = number;

/** Relative edge permutation class within Klein four-group V_4 */
export type SlicePermutationClass = 0 | 1 | 2 | 3;

/** Abstract common twist class in Z_3 (0, 1, 2) */
export type SliceGearPhase = 0 | 1 | 2;

export interface EdgeSliceCoordinate {
  readonly permutationClass: SlicePermutationClass;
  readonly phase: SliceGearPhase;
}

export interface GearCubeState {
  readonly cornerConfiguration: CornerConfiguration;
  readonly sliceX: EdgeSliceCoordinate;
  readonly sliceY: EdgeSliceCoordinate;
  readonly sliceZ: EdgeSliceCoordinate;
}

export const SOLVED_GEAR_CUBE_STATE: GearCubeState = {
  cornerConfiguration: 0,
  sliceX: { permutationClass: 0, phase: 0 },
  sliceY: { permutationClass: 0, phase: 0 },
  sliceZ: { permutationClass: 0, phase: 0 },
};
```

---

## 7. Derived Center Piece Placement & Orientation Quotient

*(Pursuant to [`ADR-0004`](../decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md))*:

1. **Zero Independent Center Coordinates:**
   Face center pieces contribute zero independent degrees of freedom to `GearCubeState`. The canonical state space cardinality remains strictly frozen at **$41,472$** states.
2. **Deterministic Center Placement Derivation (Model A):**
   Center piece placement in canonical slots `['U', 'D', 'F', 'B', 'R', 'L']` is uniquely determined by the raw coordinate tuple $(C, k_X, k_Y, k_Z)$ via Model A algebraic composition:
   $$\text{centerPlacement}(C, k_X, k_Y, k_Z) = \text{CENTER\_PERM\_OF\_C}[C] \circ K_X[k_X] \circ K_Y[k_Y] \circ K_Z[k_Z]$$
   - Edge gear twist phases $(p_X, p_Y, p_Z)$ have zero influence on center piece placement.
   - For full 24-row dictionary and slice action definitions, see [`ADR-0004`](../decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md).
3. **Center Orientation Quotient:**
   For the standard unmarked Gear Cube, physical center axial orientation is unobservable at discrete endpoints, path-dependent in the physical rotation group, and quotiented out of the discrete state model and materialized view.

---

## 8. Move Application and Application Composition Lifecycle

*(Pursuant to [`ADR-0005`](../decisions/ADR-0005-CANONICAL-MOVE-TRANSITION-ALGEBRA.md))*:

Canonical discrete state transitions and spatial presentation are decoupled into a clean 3-step composition pipeline:

```typescript
// 1. Domain Core: Closed canonical transition on reference-normalized state
const nextState = applyMove(state, move);

// 2. Presentation Layer: Track discrete body orientation relative to world frame
const nextFrame = nextSpatialFrame(frame, move.face);

// 3. Materializer: Map canonical coordinates to physical 3D piece slots
const nextView = materializeState(nextState, nextFrame);
```

### Invariant Boundaries:
1. **Domain Core Independence:** `applyMove(state, move)` requires only `GearCubeState` and `Move`. Solvers operate exclusively on `GearCubeState` without `SpatialFrame`.
2. **Deterministic Frame Evolution:** `nextSpatialFrame(frame, face)` evolves strictly as a function of the current frame and the rotated face normal axis.
3. **Continuous 3D Animation:** Downstream renderer/kinematics layers derive continuous mesh transformations from `(fromView, move, toView)` without mutating discrete state.

---

## 9. Exhaustive Verification Evidence & Acceptance Gates

Canonical move transitions have been verified across the entire Cartesian coordinate domain ($41,472$ states $\times 12$ legal directed moves $= 497,664$ transitions) in the core automated test suite (`packages/core/tests/transitions.test.ts` and `packages/core/tests/transitions-exhaustive.test.ts`):

```text
canonical domain size = 41472
canonical transition closure: 497664, failure count = 0
canonical direct move/inverse round trips: 497664, failure count = 0
canonical direct-vs-oracle equivalence: 497664, mismatch count = 0
U/F/R non-regression: 248832, regression count = 0
D/B/L reference-normalized correction: 248832, mismatch count = 0
12-repeat move identity across full domain: 41472 x 12, failure count = 0

application-level transition characterization = 1990656 (41472 x 4 x 12)
phase-aware piece placement matches = 1990656 / 1990656
phase-aware gear phase matches = 1990656 / 1990656
phase-aware full endpoint matches = 1990656 / 1990656
```

| Verification Check | Target / Oracle | Execution Result | Evidence Status |
| :--- | :--- | :--- | :---: |
| **Canonical Cartesian Domain Size** | $24 \times 12^3 = 41,472$ | **$41,472$ unique coordinate tuples** | `EXHAUSTIVELY_VERIFIED` |
| **Direct Transition Closure** | All $41,472 \times 12$ transitions valid | **$0$ closure failures** ($497,664$ transitions) | `EXHAUSTIVELY_VERIFIED` |
| **Direct Move Invertibility** | $\text{apply}(\text{apply}(s, m), m^{-1}) = s$ | **$0$ inverse failures** ($497,664$ round-trips) | `EXHAUSTIVELY_VERIFIED` |
| **U/F/R Semantic Non-Regression** | Phase 1C Baseline | **$248,832 / 248,832$ matches ($0$ regressions)** | `EXHAUSTIVELY_VERIFIED` |
| **D/B/L Reference-Normalized Correction** | Independent Reference Oracle | **$248,832 / 248,832$ matches ($0$ mismatches)** | `EXHAUSTIVELY_VERIFIED` |
| **Direct vs Oracle Equivalence Gate** | Independent Reference Oracle | **$497,664 / 497,664$ matches ($0$ mismatches)** | `EXHAUSTIVELY_VERIFIED` |
| **12-Repeat Identity Gate** | $M^{12}(s) = s$ on all states/moves | **$0$ failures across $41,472 \times 12$ runs** | `EXHAUSTIVELY_VERIFIED` |
| **Application Lifecycle Characterization** | Phase-Aware Physical Oracle | **$1,990,656 / 1,990,656$ full endpoint matches** | `CHARACTERIZED_PENDING_PHASE1D_REACCEPTANCE` |
| **Reachable State Count (BFS)** | $41,472$ | **$41,472$ reachable states from solved** | `DEFERRED_TO_PHASE_1E` |
