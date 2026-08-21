# ADR_0004_CENTER_ORIENTATION_PLAN.md — Architecture Decision Plan: Center Orientation Semantics

> **Document Status:** `PENDING_REVIEW`
> **Target Document:** `docs/decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md`
> **Baseline Commit:** `3c8c48bd63b8c8b5bb4ebe9b67d8645e95cf6019` (`Implement Phase 1C canonical move transitions`)
> **Branch:** `phase/adr0004-center-orientation-plan`
> **Applicability:** Pure TypeScript Domain Core (`packages/core`) & Materialization View

---

## 1. Executive Summary & Purpose

This implementation plan establishes the architectural framework, mathematical evidence base, and drafting specifications for **ADR-0004: Center Orientation Semantics**.

ADR-0004 formally resolves an architectural contract contradiction discovered during Phase 1D materialization planning between historical Phase 0 assumptions and empirical physical mechanics characterization.

```text
               +-------------------------------------------------------------+
               |                    PROBLEM STATEMENT                        |
               |                                                             |
               |  Historical Phase 0 Assumption (PUZZLE_CONTRACTS.md):       |
               |  PiecePlacementView.CenterPlacement includes                |
               |  { slot, pieceId, orientationAngleDegrees } with all three   |
               |  assumed uniquely derivable from discrete GearCubeState.   |
               +------------------------------+------------------------------+
                                              |
                                              v
               +-------------------------------------------------------------+
               |               ACCEPTED CHARACTERIZATION PROOF               |
               |                                                             |
               |  1. Center Piece Placement (Slot <-> PieceId) is 100%       |
               |     path-independent and uniquely derivable from raw        |
               |     coordinates (C, kX, kY, kZ) (0 conflicts).              |
               |                                                             |
               |  2. Center Angular Orientation is path-dependent           |
               |     super-state information (e.g. (U F)^3 flips centers    |
               |     180° in place while returning canonical state to 0).    |
               |                                                             |
               |  3. Standard Gear Cube center caps are solid, unmarked      |
               |     single colors; center axial orientation is physically   |
               |     and visually unobservable at discrete endpoints.        |
               +------------------------------+------------------------------+
                                              |
                                              v
               +-------------------------------------------------------------+
               |        PROPOSED DECISION: CENTER_ORIENTATION_QUOTIENT       |
               |                                                             |
               |  Recommend adopting the Center Orientation Quotient:        |
               |  - PiecePlacementView.CenterPlacement = { slot, pieceId }    |
               |  - Remove orientationAngleDegrees from canonical endpoint  |
               |  - Kinematic runtime animates rotation during moves         |
               |  - Preserve canonical state space cardinality at 41,472     |
               +-------------------------------------------------------------+
```

---

## 2. Accepted Characterization Evidence Base

The decision in ADR-0004 is grounded on exhaustive empirical and mathematical proofs across two distinct domains:

### 2.1. Canonical Domain A (41,472 States, 497,664 Transitions)
- **State Space:** Exactly $41,472$ canonical states reached via BFS from solved state using accepted Phase 1C move transitions.
- **Transition Coverage:** Exactly $497,664$ directed canonical transitions ($41,472 \times 12$).
- **Piece Permutation Conflict Transitions:** Exactly **$0$** ($41,472 / 41,472$ states have exactly 1 uniquely assigned center piece permutation).
- **Orientation Conflict Transitions:** Exactly **$201,485$** ($40,583 / 41,472$ states have $>1$ reachable physical orientation configuration; $889$ states have 1 observed configuration).

### 2.2. Application Domain B (165,888 State-Frame Pairs, 1,990,656 Transitions)
- **State-Frame Space:** Exactly $165,888$ state-frame pairs ($41,472 \times 4$).
- **Transition Coverage:** Exactly $1,990,656$ directed state-frame transitions ($165,888 \times 12$).
- **Piece Permutation Conflicts:** Exactly **$0$**.
- **Orientation Conflicts:** Exactly **$456,324$**.

### 2.3. Concrete Same-State Orientation Witness
- **Sequence A (0 moves):** `[]`
- **Sequence B (6 moves):** `[U CW, F CW, U CW, F CW, U CW, F CW]`
- **Exact Canonical `GearCubeState` (Identical):**
  $$\text{State}(A) = \text{State}(B) = \text{"C:0|X:0.0|Y:0.0|Z:0.0" (Solved)}$$
- **Exact Spatial Frame (Identical):**
  $$\text{SpatialFrame}(A) = \text{SpatialFrame}(B) = \mathbf{3} \quad (\text{Canonical Reference Frame})$$
- **Exact Center Piece Permutations (Identical):**
  $$\text{Perm}(A) = \text{Perm}(B) = \text{U:center-U, D:center-D, F:center-F, B:center-B, R:center-R, L:center-L}$$
- **Exact Center Orientations (Strictly Differing in Canonical Frame 3):**
  - **Sequence A:** `U@0°, D@0°, F@0°, B@0°, R@0°, L@0°`
  - **Sequence B:** `U@180°, D@180°, F@180°, B@180°, R@180°, L@180°`

---

## 3. Raw Coordinate Subset Audit & Minimal Dependency

To establish the exact, inclusion-minimal subset of raw canonical coordinates $\{C, k_X, k_Y, k_Z\}$ that uniquely determines center piece placement, all $16$ coordinate subsets were evaluated across all $41,472$ states:

| Size | Coordinate Subset | Distinct Keys | Ambiguity Groups | Status |
| :---: | :--- | :---: | :---: | :---: |
| 0 | `()` | $1$ | $1$ | **`FAIL`** |
| 1 | `C` | $24$ | $24$ | **`FAIL`** |
| 1 | `kX` | $4$ | $4$ | **`FAIL`** |
| 1 | `kY` | $4$ | $4$ | **`FAIL`** |
| 1 | `kZ` | $4$ | $4$ | **`FAIL`** |
| 2 | `(C, kX)` | $96$ | $96$ | **`FAIL`** |
| 2 | `(C, kY)` | $96$ | $96$ | **`FAIL`** |
| 2 | `(C, kZ)` | $96$ | $96$ | **`FAIL`** |
| 2 | `(kX, kY)` | $16$ | $16$ | **`FAIL`** |
| 2 | `(kX, kZ)` | $16$ | $16$ | **`FAIL`** |
| 2 | `(kY, kZ)` | $16$ | $16$ | **`FAIL`** |
| 3 | `(C, kX, kY)` | $384$ | $384$ | **`FAIL`** |
| 3 | `(C, kX, kZ)` | $384$ | $384$ | **`FAIL`** |
| 3 | `(C, kY, kZ)` | $384$ | $384$ | **`FAIL`** |
| 3 | `(kX, kY, kZ)` | $64$ | $64$ | **`FAIL`** |
| 4 | `(C, kX, kY, kZ)` | $1,536$ | $0$ | **`PASS`** |

### 3.1. Minimal Raw Coordinate Subset Conclusion
```text
MINIMAL_RAW_COORDINATE_SUBSETS = ["(C, kX, kY, kZ)"]
```
- Exactly **ONE** inclusion-minimal raw-coordinate subset exists: `(C, kX, kY, kZ)`.
- All proper subsets fail ($100\%$ ambiguous groups).
- Edge gear twist phases $(p_X, p_Y, p_Z)$ are completely independent of center piece placement.

---

## 4. Compact Group Factorization & Normative Derivation Model

### 4.1. Exhaustive Factorization Audit Across 1,536 Keys
Candidate algebraic compositions between corner action $C \in S_4$ and slice V4 actions $K(k_X, k_Y, k_Z) = K_X(k_X) \circ K_Y(k_Y) \circ K_Z(k_Z)$ evaluated against all $1,536$ coordinate keys:

| Formula Candidate | Composition Convention | Keys Tested | Mismatches | Result |
| :--- | :--- | :---: | :---: | :---: |
| **`C ∘ K`** | $(C \circ K)(x) = C(K(x))$ | $1,536$ | **$0$** | **`PASS`** |
| **`K ∘ C`** | $(K \circ C)(x) = K(C(x))$ | $1,536$ | $768$ | **`FAIL`** |
| **`C^-1 ∘ K`** | $(C^{-1} \circ K)(x) = C^{-1}(K(x))$ | $1,536$ | $896$ | **`FAIL`** |
| **`K ∘ C^-1`** | $(K \circ C^{-1})(x) = K(C^{-1}(x))$ | $1,536$ | $896$ | **`FAIL`** |
| **`C ∘ K^-1`** | $(C \circ K^{-1})(x) = C(K^{-1}(x))$ | $1,536$ | **$0$** | **`PASS`** *(since $K \in V_4 \implies K = K^{-1}$)* |
| **`K^-1 ∘ C`** | $(K^{-1} \circ C)(x) = K^{-1}(C(x))$ | $1,536$ | $768$ | **`FAIL`** |
| **`C^-1 ∘ K^-1`** | $(C^{-1} \circ K^{-1})(x) = C^{-1}(K^{-1}(x))$ | $1,536$ | $896$ | **`FAIL`** |
| **`K^-1 ∘ C^-1`** | $(K^{-1} \circ C^{-1})(x) = K^{-1}(C^{-1}(x))$ | $1,536$ | $896$ | **`FAIL`** |

### 4.2. Chosen Normative Model: Model A (Algebraic S4/V4 Factorization)
ADR-0004 adopts **Model A** as the primary normative derivation, with the factorized mapping defined by:
$$\text{centerPermutation}(C, k_X, k_Y, k_Z) = \text{CENTER\_PERM\_OF\_C}[C] \circ K_X[k_X] \circ K_Y[k_Y] \circ K_Z[k_Z]$$

- **Slot Interpretation:** Evaluates slot-to-piece mapping over canonical slot ordering `['U', 'D', 'F', 'B', 'R', 'L']`.
- **Corner Base Dictionary `CENTER_PERM_OF_C` (24 rows):**
  Full static 24-element dictionary defined normatively in the ADR.
- **Slice Action Dictionaries $K_X, K_Y, K_Z$ (4 rows each):**
  - $K_X[0..3]$: Identity, $(F\ B)(R\ L)$, $(U\ D)(F\ B)$, $(U\ D)(R\ L)$
  - $K_Y[0..3]$: Identity, $(U\ D)(R\ L)$, $(F\ B)(R\ L)$, $(U\ D)(F\ B)$
  - $K_Z[0..3]$: Identity, $(F\ B)(R\ L)$, $(U\ D)(R\ L)$, $(U\ D)(F\ B)$
- **Ownership & Static Storage Contract:**
  - `CENTER_PERM_OF_C`, `K_X`, `K_Y`, `K_Z` are internal center-materialization data owned strictly by `packages/core/src/materializer.ts`.
  - Phase 1C `packages/core/src/transition-data.ts` remains frozen ownership of the canonical move-transition engine and is **not modified**.
  - $O(1)$ constant-time center-identity evaluation.
  - No per-call heap allocation required by the derivation.
  - Small bounded static internal data; no public mutable lookup structures.

---

## 5. Center Piece Identity Goldens (SpatialFrame 3)

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

## 6. Kinematic Component Classes & Move Trajectories

For every directed legal face flip, center kinematics divides into three distinct component classes:

1. **Selected Outer-Face Center:**
   - Remains on the selected face slot and participates in the outer face's $180^\circ$ rigid rotation about its outward normal.
   - At discrete endpoints, axial orientation is quotiented out.
2. **Four Adjacent Middle-Layer Centers:**
   - Follow the geared middle layer's $90^\circ$ quarter-turn trajectory with directed sign $(\text{CW} \to -90^\circ, \text{CCW} \to +90^\circ)$.
   - Their physical piece identities move between spatial face slots.
3. **Opposite Outer-Face Center:**
   - Remains completely fixed ($0^\circ$ rotation) for that move.

---

## 7. Proposed Decision & Architectural Options

### 7.1. Proposed Decision Candidate (Recommended — `CENTER_ORIENTATION_QUOTIENT`)
- Standard `GearCubeState` remains exactly $41,472$ states.
- Refine `PiecePlacementView.CenterPlacement` to `{ readonly slot: CenterSlot; readonly pieceId: CenterPieceId; }`.
- Remove `orientationAngleDegrees` from canonical discrete endpoint state.
- Continuous physical rotation is managed by kinematics during active move animation.

### 7.2. Rejected Alternatives
- **Option B (Synthetic Canonical Projection):** Synthesizing an artificial static angle (e.g. $0^\circ$/$180^\circ$) creates a false contract that contradicts physical move history for $>97\%$ of reachable states.
- **Option C (State Space Expansion):** Expanding `GearCubeState` to track center rotation angles violates standard puzzle scope and invalidates God's Algorithm benchmarks ($41,472$).

---

## 8. Forward Supersession & Worktree Governance Model

### 8.1. Historical ADR Preservation
`docs/decisions/ADR-0003-CORE-STATE-REPRESENTATION.md` is **accepted historical evidence and MUST NOT be edited**.
Instead, ADR-0004 will explicitly state in its Context & Compatibility sections:
> *"This Architecture Decision Record forward-supersedes and clarifies the derived center orientation assumption originally recorded in ADR-0003 and PUZZLE_CONTRACTS.md (Phase 0)."*

### 8.2. Lifecycle & Scope Separation
```text
+-------------------------------------------------------------------------------+
| SCOPE A: ADR-0004 Authoring (Current Worktree: phase/adr0004-center-orientation-plan) |
| - Author docs/decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md               |
| - Update current contract docs (PUZZLE_CONTRACTS, GEAR_CUBE_STATE_MODEL, etc.) |
| - Exclude docs/development/PHASE_1D_IMPLEMENTATION_PLAN.md                     |
+---------------------------------------+---------------------------------------+
                                        | (Independent Review & Commit)
                                        v
+-------------------------------------------------------------------------------+
| SCOPE B: Post-ADR Phase 1D Plan Repair (Original Worktree: phase/1d-frame-plan)|
| - Rebase/incorporate accepted ADR-0004 commit                                 |
| - Repair uncommitted docs/development/PHASE_1D_IMPLEMENTATION_PLAN.md         |
| - Execute Phase 1D implementation and verification gates                      |
+-------------------------------------------------------------------------------+
```

---

## 9. Exact Future ADR-0004 Authoring Scope (Scope A)

### 9.1. Files to CREATE (1 file)
- `docs/decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md`

### 9.2. Files to MODIFY (5 files)
1. `docs/architecture/PUZZLE_CONTRACTS.md`: Update `CenterPlacement` to remove `orientationAngleDegrees`.
2. `docs/architecture/GEAR_CUBE_STATE_MODEL.md`: Document `(C, kX, kY, kZ) -> CenterPiecePlacement` derivation and quotient semantics.
3. `docs/architecture/KINEMATIC_CONTRACT.md`: Explicitly record transition rotation requirements ($180^\circ / \pm 90^\circ / 0^\circ$) vs discrete endpoint quotient.
4. `docs/development/ROADMAP.md`: Update Phase 1D deliverable description to reflect quotiented center placement.
5. `docs/README.md`: Expose ADR-0004 in the decision index.

### 9.3. Documentation Audit: Excluded Files
- `docs/decisions/ADR-0003-CORE-STATE-REPRESENTATION.md`: Excluded (preserved as historical record).
- `docs/development/TEST_STRATEGY.md`: Excluded (audited; contains zero normative assumptions regarding center orientation angles).
- `docs/development/PHASE_1D_IMPLEMENTATION_PLAN.md`: Excluded from Scope A (owned by Scope B).

---

## 10. ADR Authoring & Verification Gates

### 10.1. ADR Authoring Completeness Gates
- `GATE_ADR_CENTER_DERIVATION_COMPLETE`: ADR-0004 contains the full, normative Model A composition mapping and dictionaries without placeholders or ellipses.
- `GATE_ADR_CENTER_DATA_REPRODUCIBLE`: Model A composition rules produce deterministic, reproducible assignments for all $1,536$ coordinate keys.
- `GATE_ADR_CENTER_DICTIONARY_COMPLETE`: Exactly 24 valid $S_6$ center permutations fully listed.
- `GATE_ADR_CENTER_DERIVATION_1536`: $1,536 / 1,536$ matches against accepted physical characterization ($0$ mismatches).

### 10.2. Future Phase 1D Implementation Gates
- `GATE_1D_CENTER_IDENTITY_DOMAIN`: $41,472 / 41,472$ states produce deterministic center piece permutations.
- `GATE_1D_CENTER_IDENTITY_ORACLE`: Independent physical oracle matches production derivation for all $41,472$ states.
- `GATE_1D_MATERIALIZATION_165888`: $165,888 / 165,888$ state-frame pairs produce valid `{ corners, edges, centers }` placements.
- `GATE_1D_APPLICATION_LIFECYCLE_1990656`: $1,990,656 / 1,990,656$ lifecycle transitions match physical oracle.
- `GATE_KINEMATIC_CENTER_ROTATION`: For every directed move, kinematics prescribes the exact component trajectories ($180^\circ$ for outer moving center, directed $\pm 90^\circ$ for adjacent middle centers, $0^\circ$ for opposite center).

---

## 11. Risk Assessment & Mitigations

| Risk ID | Risk Description | Severity | Mitigation Strategy | Blocking |
| :--- | :--- | :---: | :--- | :---: |
| **`RISK-ADR4-01`** | Claiming raw-coordinate minimality without testing all subsets. | Critical | Tested all 16 subsets; proved `(C, kX, kY, kZ)` is the unique minimal subset. | Yes |
| **`RISK-ADR4-02`** | Choosing an underspecified center identity representation. | Critical | Normative Model A composition ($C \circ K$) specified with complete dictionaries. | Yes |
| **`RISK-ADR4-03`** | Modifying historical ADR-0003 commits. | High | Strict forward-supersession model; ADR-0003 remains completely untouched. | Yes |
| **`RISK-ADR4-04`** | Copying uncommitted Phase 1D plan across worktrees. | High | Scope A (ADR) and Scope B (Phase 1D repair) separated across distinct lifecycles. | Yes |
| **`RISK-ADR4-05`** | Treating Proposed ADR decision as already Accepted. | High | Status tagged strictly as `PENDING_REVIEW` / `Proposed`. | Yes |
| **`RISK-ADR4-06`** | Removing endpoint orientation but omitting kinematic rotation. | High | Added explicit gate `GATE_KINEMATIC_CENTER_ROTATION` ($180^\circ / \pm 90^\circ / 0^\circ$). | Yes |
| **`RISK-ADR4-07`** | Quotient leaking into future marked-center variants. | High | Scoped strictly to standard unmarked-center Gear Cube; super-group deferred. | Yes |
| **`RISK-ADR4-08`** | Accidental GearCubeState cardinality expansion. | Critical | Canonical state space remains strictly frozen at 41,472 states. | Yes |
