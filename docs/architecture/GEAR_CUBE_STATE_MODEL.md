# GEAR_CUBE_STATE_MODEL.md — Canonical Discrete State & Transition Specification

> **Document Status:** `DECIDED` (Phase 0B.3 Baseline)
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
5. **Direct Canonical Transitions:** Move transitions are computed directly on canonical coordinates via deterministic algebra and frozen lookup tables.

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

## 7. Move Application and Frame Lifecycle

```text
1. User invokes UI move (F_physical, D_physical) on (canonicalState, spatialFrame)
2. Canonical transition: nextCanonicalState = directApplyMove(canonicalState, F_physical, D_physical)
3. Frame update: nextSpatialFrame = nextFrame(spatialFrame, F_physical)
4. Render: materializeState(nextCanonicalState, nextSpatialFrame)
```

---

## 8. Synchronous Exhaustive Verification Evidence

Captured output from foreground Python verification suite (`uv run python`):

```text
fixed-spatial pairs = 96
reference-normalized pairs = 24
unique T_free permutations = 24
unique T_ref arrangements among normalized states = 6
T_free -> T_ref ambiguity = 0
96 <-> 24 x 4 frame bijection = True
corner materialization round-trip failures = 0

expanded full physical-state count = 165888
unique canonical-state/frame decompositions = 165888
full-state normalization round-trip failures = 0
representatives per canonical state = 4

canonical domain size = 41472
direct transition closure: 497664, failure count = 0
direct move/inverse round trips: 497664, failure count = 0
direct-vs-oracle transition comparisons: 497664, mismatch count = 0
canonical BFS reachability = 41472

application-level transition comparisons = 1990656
application-level mismatch count = 0

physical-face 12-repeat lifecycle failures on all 995328 runs = 0
kinematic physical-frame endpoint mismatches on all 48 cases = 0
```

| Verification Check | Target / Oracle | Exhaustive Execution Result | Evidence Class |
| :--- | :--- | :--- | :---: |
| **Expanded Full Physical States** | $41,472 \times 4 = 165,888$ | **165,888 unique physical states** | `EXHAUSTIVELY_VERIFIED` |
| **Full-State Normalization Round-Trip** | $\text{normalize}(\text{materialize}(s, f)) = (s, f)$ | **0 failures across all 165,888 states** | `EXHAUSTIVELY_VERIFIED` |
| **Representatives Per State** | Exact 4:1 fiber | **Exactly 4 for all 41,472 states** | `EXHAUSTIVELY_VERIFIED` |
| **Application Move Contract** | Full physical UI lifecycle vs physical oracle | **$0$ mismatches across all $1,990,656$ transitions** | `EXHAUSTIVELY_VERIFIED` |
| **Physical Face 12-Repeat** | 12 repeated physical turns on all states/faces | **$0$ failures across all $995,328$ evaluations** | `EXHAUSTIVELY_VERIFIED` |
| **Frame-Aware Kinematic Endpoint** | 3D rotation endpoint matches discrete slot cycle | **$0$ mismatches across all 48 cases** | `EXHAUSTIVELY_VERIFIED` |
| **Canonical Cartesian Domain Size** | $24 \times 12^3 = 41,472$ | **$41,472$ unique coordinate tuples** | `EXHAUSTIVELY_VERIFIED` |
| **Direct Transition Closure** | All $41,472 \times 12$ transitions valid | **$0$ closure failures** ($497,664$ transitions) | `EXHAUSTIVELY_VERIFIED` |
| **Direct Move Invertibility** | $\text{apply}(\text{apply}(s, m), m^{-1}) = s$ | **$0$ inverse failures** ($497,664$ round-trips) | `EXHAUSTIVELY_VERIFIED` |
| **Direct vs Oracle Equivalence** | $\text{direct}(s, m) == \text{oracle}(s, m)$ | **$0$ mismatches** ($497,664$ transitions) | `EXHAUSTIVELY_VERIFIED` |
| **Reachable State Count (BFS)** | $41,472$ | **$41,472$ reachable states from solved** | `EXHAUSTIVELY_VERIFIED` |
