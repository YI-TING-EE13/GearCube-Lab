# ADR-0004 — Center Orientation Semantics & Materialization Boundary

> **Status:** `Accepted`
> **Date:** 2026-08-21
> **Decision Owners:** Architecture & Core Domain Group
> **Applicability:** Pure TypeScript Domain Core (`packages/core`), 3D Kinematics (`packages/kinematics`), & Materialized Views

---

## 1. Context

During Phase 0 baseline architecture design, [`PUZZLE_CONTRACTS.md`](../architecture/PUZZLE_CONTRACTS.md) and [`ADR-0003-CORE-STATE-REPRESENTATION.md`](ADR-0003-CORE-STATE-REPRESENTATION.md) established that canonical discrete puzzle state is represented by 8 corner configurations, 3 edge slice permutation classes, and 3 edge twist phases:

$$\text{GearCubeState} = (C, k_X, p_X, k_Y, p_Y, k_Z, p_Z) \in [0..23] \times [0..3]^3 \times [0..2]^3$$

yielding a state-space domain of exactly **$41,472$** states.

In Phase 0 contracts, the materialized fixed-spatial representation `PiecePlacementView.CenterPlacement` was defined as:
```typescript
export interface CenterPlacement {
  readonly slot: CenterSlot;
  readonly pieceId: CenterPieceId;
  readonly orientationAngleDegrees: number; // 0, 90, 180, 270
}
```
with the underlying assumption that both center piece identity and center axial orientation angle are uniquely derivable on demand from $(\text{GearCubeState}, \text{SpatialFrame})$.

During Phase 1D materialization planning, formal empirical characterization of the complete state space revealed a fundamental physical contradiction: while center piece identity across spatial slots is strictly deterministic and path-independent, physical center axial orientation is history-dependent in the physical rotation super-group.

---

## 2. Problem Statement

1. **Path-Dependent Center Axial Orientation:**
   In physical standard Gear Cube mechanics, turning an outer face by $180^\circ$ causes the adjacent middle layer to rotate by $90^\circ$. Repeating an alternating sequence such as $(U\ F)^3 = [U_{\text{CW}}, F_{\text{CW}}, U_{\text{CW}}, F_{\text{CW}}, U_{\text{CW}}, F_{\text{CW}}]$ returns the canonical `GearCubeState` (corners and edge phases) exactly to Solved (`C:0|X:0.0|Y:0.0|Z:0.0`), but rotates all six face centers by $180^\circ$ in place.
2. **Physical Unobservability in the Reference Model:**
   In the canonical standard Gear Cube (Meffert's / Oskar van Deventer reference model), face center caps are solid, single-color squares without directional arrows or asymmetric markings. Rotating a solid-color center cap by $90^\circ$ or $180^\circ$ produces zero observable visual or mechanical change at a static endpoint.
3. **Contract Contradiction:**
   Because discrete `GearCubeState` does not and should not store path history, attempting to derive an authoritative `orientationAngleDegrees` for standard center placements produces either path conflicts ($201,485$ transitions) or synthetic static angles that contradict physical move histories.

---

## 3. Characterization Evidence

The mathematical and physical facts underlying this decision were exhaustively verified across the complete state space:

### 3.1. Canonical Domain A (41,472 States, 497,664 Transitions)
- **Coverage:** $41,472$ canonical states traversed from Solved; $497,664$ directed transitions evaluated ($41,472 \times 12$).
- **Center Piece Permutation Conflicts:** Exactly **$0$** ($41,472 / 41,472$ states have a unique, 100% path-independent center piece placement).
- **Center Axial Orientation Conflicts:** Exactly **$201,485$** transitions lead to an already visited canonical state with a different physical center orientation.
- **State-Level Multiplicity:**
  - States with exactly 1 center piece permutation: **$41,472$** ($100.0\%$).
  - States with $>1$ reachable physical center orientation: **$40,583$** ($97.86\%$).

### 3.2. Concrete Same-State Orientation Witness
- **Sequence A (0 moves):** `[]`
- **Sequence B (6 moves):** `[U CW, F CW, U CW, F CW, U CW, F CW]`
- **Comparison:**
  - $\text{State}(A) = \text{State}(B) = \text{"C:0|X:0.0|Y:0.0|Z:0.0" (Solved)}$
  - $\text{SpatialFrame}(A) = \text{SpatialFrame}(B) = \mathbf{3}$
  - $\text{Permutation}(A) = \text{Permutation}(B) = \text{U:center-U, D:center-D, F:center-F, B:center-B, R:center-R, L:center-L}$
  - $\text{Orientation}(A) = \text{all } 0^\circ \quad \text{vs} \quad \text{Orientation}(B) = \text{all } 180^\circ$.

### 3.3. Application Domain B (165,888 State-Frame Pairs, 1,990,656 Transitions)
- Evaluated all $165,888$ state-frame pairs over $1,990,656$ directed transitions: exactly **$0$** center piece permutation conflicts.

---

## 4. Decision: Center Orientation Quotient

1. **Adopt `CENTER_ORIENTATION_QUOTIENT`:**
   For the standard unmarked Gear Cube, two physical move histories that differ only in center axial rotation belong to the same canonical logical endpoint state. Center axial orientation is quotiented out of the discrete state space and materialized view.
2. **Refine Standard `CenterPlacement`:**
   Remove `orientationAngleDegrees` from the standard logical `CenterPlacement` interface:
   ```typescript
   export interface CenterPlacement {
     readonly slot: CenterSlot;
     readonly pieceId: CenterPieceId;
   }
   ```
3. **Preserve Canonical State Domain:**
   `GearCubeState` remains strictly frozen at $41,472$ states with zero added center coordinates or history fields.

---

## 5. Raw Coordinate Minimality

An exhaustive audit of all $16$ subsets of the existing raw canonical permutation coordinates $\{C, k_X, k_Y, k_Z\}$ proved:
- **Minimal Subset:** `(C, kX, kY, kZ)` ($1,536$ distinct coordinate keys) is the **unique inclusion-minimal raw subset** that uniquely determines center piece placement.
- **Proper Subsets Fail:** All $15$ proper subsets fail with $100\%$ ambiguity groups.
- **Phase Invariance:** Edge gear twist phases $(p_X, p_Y, p_Z)$ have zero influence on center piece placement.

---

## 6. Normative Center Identity Derivation (Model A)

Center piece placement is deterministically evaluated using **Model A: Algebraic $S_4 / V_4$ Factorization**:

$$\text{centerPlacement}(C, k_X, k_Y, k_Z) = \text{CENTER\_PERM\_OF\_C}[C] \circ K_X[k_X] \circ K_Y[k_Y] \circ K_Z[k_Z]$$

### 6.1. Permutation Composition Convention
The composition operator $\circ$ evaluates slot-to-piece mappings from right to left over the canonical slot ordering `['U', 'D', 'F', 'B', 'R', 'L']`:
$$(A \circ B)(\text{slot}) = A(B(\text{slot}))$$
where $B(\text{slot})$ determines an intermediate slot, and $A$ maps that intermediate slot to the final `CenterPieceId`.

### 6.2. Base Corner Action Dictionary `CENTER_PERM_OF_C` (24 Rows)
The 24 canonical center placement permutations for $C \in [0..23]$ at $(k_X=0, k_Y=0, k_Z=0)$:

| $C$ | Slot `U` | Slot `D` | Slot `F` | Slot `B` | Slot `R` | Slot `L` |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`0`** | `center-U` | `center-D` | `center-F` | `center-B` | `center-R` | `center-L` |
| **`1`** | `center-D` | `center-U` | `center-R` | `center-L` | `center-F` | `center-B` |
| **`2`** | `center-B` | `center-F` | `center-D` | `center-U` | `center-L` | `center-R` |
| **`3`** | `center-F` | `center-B` | `center-L` | `center-R` | `center-D` | `center-U` |
| **`4`** | `center-L` | `center-R` | `center-U` | `center-D` | `center-B` | `center-F` |
| **`5`** | `center-R` | `center-L` | `center-B` | `center-F` | `center-U` | `center-D` |
| **`6`** | `center-D` | `center-U` | `center-L` | `center-R` | `center-B` | `center-F` |
| **`7`** | `center-U` | `center-D` | `center-B` | `center-F` | `center-L` | `center-R` |
| **`8`** | `center-R` | `center-L` | `center-U` | `center-D` | `center-F` | `center-B` |
| **`9`** | `center-L` | `center-R` | `center-F` | `center-B` | `center-U` | `center-D` |
| **`10`** | `center-F` | `center-B` | `center-D` | `center-U` | `center-R` | `center-L` |
| **`11`** | `center-B` | `center-F` | `center-R` | `center-L` | `center-D` | `center-U` |
| **`12`** | `center-F` | `center-B` | `center-R` | `center-L` | `center-U` | `center-D` |
| **`13`** | `center-B` | `center-F` | `center-U` | `center-D` | `center-R` | `center-L` |
| **`14`** | `center-L` | `center-R` | `center-B` | `center-F` | `center-D` | `center-U` |
| **`15`** | `center-R` | `center-L` | `center-D` | `center-U` | `center-B` | `center-F` |
| **`16`** | `center-D` | `center-U` | `center-F` | `center-B` | `center-L` | `center-R` |
| **`17`** | `center-U` | `center-D` | `center-L` | `center-R` | `center-F` | `center-B` |
| **`18`** | `center-R` | `center-L` | `center-F` | `center-B` | `center-D` | `center-U` |
| **`19`** | `center-L` | `center-R` | `center-D` | `center-U` | `center-F` | `center-B` |
| **`20`** | `center-B` | `center-F` | `center-L` | `center-R` | `center-U` | `center-D` |
| **`21`** | `center-F` | `center-B` | `center-U` | `center-D` | `center-L` | `center-R` |
| **`22`** | `center-U` | `center-D` | `center-R` | `center-L` | `center-B` | `center-F` |
| **`23`** | `center-D` | `center-U` | `center-B` | `center-F` | `center-R` | `center-L` |

### 6.3. Slice Action Dictionaries $K_X, K_Y, K_Z$ (4 Rows Each)
- **Slice X Actions ($K_X$):**
  - $K_X[0] = \text{Identity} = (\text{U}, \text{D}, \text{F}, \text{B}, \text{R}, \text{L})$
  - $K_X[1] = (\text{F}\ \text{B})(\text{R}\ \text{L}) = (\text{U}, \text{D}, \text{B}, \text{F}, \text{L}, \text{R})$
  - $K_X[2] = (\text{U}\ \text{D})(\text{F}\ \text{B}) = (\text{D}, \text{U}, \text{B}, \text{F}, \text{R}, \text{L})$
  - $K_X[3] = (\text{U}\ \text{D})(\text{R}\ \text{L}) = (\text{D}, \text{U}, \text{F}, \text{B}, \text{L}, \text{R})$
- **Slice Y Actions ($K_Y$):**
  - $K_Y[0] = \text{Identity} = (\text{U}, \text{D}, \text{F}, \text{B}, \text{R}, \text{L})$
  - $K_Y[1] = (\text{U}\ \text{D})(\text{R}\ \text{L}) = (\text{D}, \text{U}, \text{F}, \text{B}, \text{L}, \text{R})$
  - $K_Y[2] = (\text{F}\ \text{B})(\text{R}\ \text{L}) = (\text{U}, \text{D}, \text{B}, \text{F}, \text{L}, \text{R})$
  - $K_Y[3] = (\text{U}\ \text{D})(\text{F}\ \text{B}) = (\text{D}, \text{U}, \text{B}, \text{F}, \text{R}, \text{L})$
- **Slice Z Actions ($K_Z$):**
  - $K_Z[0] = \text{Identity} = (\text{U}, \text{D}, \text{F}, \text{B}, \text{R}, \text{L})$
  - $K_Z[1] = (\text{F}\ \text{B})(\text{R}\ \text{L}) = (\text{U}, \text{D}, \text{B}, \text{F}, \text{L}, \text{R})$
  - $K_Z[2] = (\text{U}\ \text{D})(\text{R}\ \text{L}) = (\text{D}, \text{U}, \text{F}, \text{B}, \text{L}, \text{R})$
  - $K_Z[3] = (\text{U}\ \text{D})(\text{F}\ \text{B}) = (\text{D}, \text{U}, \text{B}, \text{F}, \text{R}, \text{L})$

### 6.4. Verification of Model A Derivation
- Tested against all $1,536$ coordinate keys: **$1,536 / 1,536$ exact matches** ($0$ mismatches).
- Produces exactly $24$ distinct center placement permutations with exactly $64$ coordinate preimages each.

---

## 7. Single Move Center Placement Goldens (SpatialFrame 3)

| Move from Solved | Slot `U` | Slot `D` | Slot `F` | Slot `B` | Slot `R` | Slot `L` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`SOLVED`** | `center-U` | `center-D` | `center-F` | `center-B` | `center-R` | `center-L` |
| **`U CW`** | `center-U` | `center-D` | `center-R` | `center-L` | `center-B` | `center-F` |
| **`U CCW`** | `center-U` | `center-D` | `center-L` | `center-R` | `center-F` | `center-B` |
| **`D CW`** | `center-U` | `center-D` | `center-R` | `center-L` | `center-B` | `center-F` |
| **`D CCW`** | `center-U` | `center-D` | `center-L` | `center-R` | `center-F` | `center-B` |
| **`F CW`** | `center-L` | `center-R` | `center-F` | `center-B` | `center-U` | `center-D` |
| **`F CCW`** | `center-R` | `center-L` | `center-F` | `center-B` | `center-D` | `center-U` |
| **`B CW`** | `center-L` | `center-R` | `center-F` | `center-B` | `center-U` | `center-D` |
| **`B CCW`** | `center-R` | `center-L` | `center-F` | `center-B` | `center-D` | `center-U` |
| **`R CW`** | `center-F` | `center-B` | `center-D` | `center-U` | `center-R` | `center-L` |
| **`R CCW`** | `center-B` | `center-F` | `center-U` | `center-D` | `center-R` | `center-L` |
| **`L CW`** | `center-F` | `center-B` | `center-D` | `center-U` | `center-R` | `center-L` |
| **`L CCW`** | `center-B` | `center-F` | `center-U` | `center-D` | `center-R` | `center-L` |

---

## 8. SpatialFrame & Kinematic Boundaries

### 8.1. SpatialFrame Boundary
Canonical center placement is derived first via Model A. SpatialFrame transforms canonical center slots into fixed-spatial slots via the four accepted SpatialFrame representatives ($3 = \text{Identity}, 2 = R_y(\pi), 1 = R_z(\pi), 0 = R_x(\pi)$), across all 24 SpatialFrame $\times$ physical-face transition cases. SpatialFrame does not alter center piece identities or reintroduce axial angles.

### 8.2. Kinematic Component Classes
During a directed legal face flip, center kinematics prescribes three distinct motion classes:
1. **Selected Outer-Face Center:** Rotates $180^\circ$ rigidly with the outer face about its outward normal.
2. **Four Adjacent Middle-Layer Centers:** Follow the geared middle layer's directed $\pm 90^\circ$ quarter-turn trajectory, moving physical piece identities between face slots.
3. **Opposite Outer-Face Center:** Remains completely fixed ($0^\circ$ rotation).
At the static discrete endpoint, physical axial orientation is quotiented out and not persisted.

---

## 9. Marked-Center Variant Boundary

This decision applies strictly to the standard/original unmarked-center Gear Cube. Future puzzle variants featuring directionally marked or patterned center caps represent an expanded super-group state space that must be specified in a separate, dedicated variant contract.

---

## 10. Compatibility & Forward Supersession

- **`ADR-0003-CORE-STATE-REPRESENTATION.md` remains UNCHANGED** as historical evidence.
- This ADR forward-supersedes and clarifies the derived center orientation assumption originally recorded in ADR-0003 and Phase 0 `PUZZLE_CONTRACTS.md`.
- `PiecePlacementView.CenterPlacement` is updated forward to `{ slot, pieceId }`.

---

## 11. Consequences

### Positive
- Preserves the canonical $41,472$ state domain without artificial coordinate expansion.
- Provides 100% deterministic, path-independent center piece placement for 3D visual rendering.
- Eliminates false or contradictory center orientation contracts at discrete endpoints.
- Preserves full physical kinematic fidelity during active move animation ($180^\circ / \pm 90^\circ / 0^\circ$).

### Trade-offs
- Standard discrete state cannot reconstruct historical center axial orientation angles after multiple move sequences.
- Direction-marked center variants require future super-group contracts.

---

## 12. Rejected Alternatives

- **Retaining `orientationAngleDegrees` in standard `CenterPlacement`:** Rejected because physical center axial orientation is path-dependent and cannot be derived from `GearCubeState`.
- **Synthesizing Arbitrary Static Canonical Angles (e.g. always $0^\circ$):** Rejected because it falsifies physical move history for $>97\%$ of reachable states.
- **Expanding `GearCubeState` with Center Coordinates:** Rejected because center caps in the standard Gear Cube are solid single colors; tracking unobservable orientations invalidates standard domain benchmarks ($41,472$).

---

## 13. Future Verification Requirements

- `GATE_1D_CENTER_IDENTITY_DOMAIN`: $41,472 / 41,472$ states produce deterministic center piece permutations.
- `GATE_1D_CENTER_IDENTITY_ORACLE`: Independent physical oracle matches Model A derivation for all $41,472$ states ($0$ mismatches).
- `GATE_1D_MATERIALIZATION_165888`: $165,888 / 165,888$ state-frame pairs produce valid `{ corners, edges, centers }` placements.
- `GATE_1D_APPLICATION_LIFECYCLE_1990656`: $1,990,656 / 1,990,656$ lifecycle transitions match physical oracle.
- `GATE_KINEMATIC_CENTER_ROTATION`: Kinematics prescribes exact trajectories ($180^\circ$ outer moving, directed $\pm 90^\circ$ middle, $0^\circ$ opposite).

---

## 14. References

- `[REF-JAAP-01]` Jaap Scherphuis, *Gear Cube / Caution Cube Analysis*, Jaap's Puzzle Page.
- `[REF-STORER-01]` J. A. Storer, *Gear Cube Mechanical Transformations*, Harvard/Storer Puzzle Collection.
- [`docs/decisions/ADR-0003-CORE-STATE-REPRESENTATION.md`](ADR-0003-CORE-STATE-REPRESENTATION.md).
- [`docs/development/ADR_0004_CENTER_ORIENTATION_PLAN.md`](../development/ADR_0004_CENTER_ORIENTATION_PLAN.md).
