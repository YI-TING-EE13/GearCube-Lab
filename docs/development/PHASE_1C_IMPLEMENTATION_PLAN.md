# PHASE_1C_IMPLEMENTATION_PLAN.md — Direct Canonical Move-Transition Engine

> **Document Status:** `DECIDED` / `PLANNING_FINAL`
> **Target Package:** `packages/core`
> **Applicability:** Pure TypeScript Domain Core (`packages/core`)
> **Baseline Commit:** `621ac18642aebed972c165a9f374e96328c7bd76` (`Implement Phase 1B canonical state validation`)

---

## 1. Executive Summary & Purpose

Phase 1C implements the direct canonical move-transition engine for the Standard Gear Cube.
The central mathematical operation is:

$$\text{applyMove} : \text{GearCubeState} \times \text{Move} \to \text{GearCubeState}$$

Every legal move transforms a valid canonical state within the $41,472$-state domain directly into another valid canonical state within the exact same domain, strictly preserving all group invariants ($S_4$ corner ranking, Klein four-group $V_4 \triangleleft S_4$ edge coset structures, and $\mathbb{Z}_3$ gear twist classes) with zero runtime dependencies on `SpatialFrame`, 3D rendering meshes, animations, or solver indices.

---

## 2. Frozen Prerequisites & Non-Goals

### 2.1. Frozen Baseline Invariants (from Phase 1B)
- Canonical `FACES`: `['U', 'D', 'F', 'B', 'R', 'L']` as const.
- Canonical `DIRECTIONS`: `['CW', 'CCW']` as const (observational direction viewed from outside the respective face looking toward the cube center).
- Canonical `CORNER_CONFIGURATIONS`: Integers $0 \dots 23$ representing the lexicographic permutation rank of $T_{\text{free}} \in S_4$.
- Canonical `SlicePermutationClass`: $0, 1, 2, 3$ representing relative permutations within Klein four-group $V_4 \triangleleft S_4$.
- Canonical `SliceGearPhase`: $0, 1, 2$ representing abstract twist classes in $\mathbb{Z}_3$.
- Canonical `GearCubeState`: Structural value object `{ cornerConfiguration, sliceX, sliceY, sliceZ }`.
- Exact 41,472 Cartesian domain: $24 \times 12 \times 12 \times 12 = 41,472$.

### 2.2. Explicit Non-Goals & Deferrals
- ❌ **No `SpatialFrame` or Display Orientation:** `SpatialFrame` ($0 \dots 3$) and world-space frame tracking belong exclusively to Phase 1D.
- ❌ **No Kinematics or Animation:** Continuous rotation angles, interpolation progress $p \in [0, 1]$, and duration timing belong to `packages/kinematics` (Phase 2).
- ❌ **No Derived Piece Placement View:** `materializeState()` and `PiecePlacementView` belong to Phase 1D.
- ❌ **No Dense Integer Codecs or Pattern Databases:** Bijective integer packing ($0 \dots 41,471$) and solver pattern databases belong to Phase 1D and Phase 4.
- ❌ **No Move History / Scramble Stack:** History scrubbers and undo/redo stacks belong to UI stores (Phase 3).
- ❌ **No Production `inverseMove` Helper:** Production code exports only `applyMove`. Move inversion is strictly a test-local helper.
- ❌ **No BFS Reachability Traversal:** Exhaustive BFS traversal across the entire transition graph is explicitly deferred to **Phase 1E** (Exhaustive Reachable State Closure). Phase 1C strictly verifies single-step transition correctness, closure, independent-oracle equivalence, and algebraic invariants.

---

## 3. Direction & Observational Semantics

Direction is strictly observational:
- `'CW'` (Clockwise): $180^\circ$ face flip rotated clockwise as viewed from outside the face looking at the cube center.
- `'CCW'` (Counter-Clockwise): $180^\circ$ face flip rotated counter-clockwise as viewed from outside the face looking at the cube center.
- **Corner Transposition Equivalence:** Both `'CW'` and `'CCW'` turn the outer face by $180^\circ$, so their effect on corner slots is identical: a 2-cycle transposition of the two corner pieces in that face.
- **Coupled Middle-Slice Gear Twist Direction:**
  - Positive-axis faces ($U, F, R$): `'CW'` adds $+1 \pmod 3$ to the coupled slice phase and advances the middle slice by $+90^\circ$ (cyclic forward); `'CCW'` adds $+2 \pmod 3$ ($-1 \equiv +2 \pmod 3$) and advances by $-90^\circ$ (cyclic backward).
  - Negative-axis faces ($D, B, L$): Viewed from outside the negative-axis face, clockwise rotation corresponds to counter-clockwise rotation viewed from the positive axis. Thus for $D, B, L$, `'CW'` adds $+2 \pmod 3$ and advances by $-90^\circ$; `'CCW'` adds $+1 \pmod 3$ and advances by $+90^\circ$.

---

## 4. Mathematical Transition Derivation

### 4.1. Corner Transition Model
The 4 free corner slots in $T_{\text{free}}$ are indexed as:
- Slot `0`: `UFR` $(+1, +1, +1)$
- Slot `1`: `UBL` $(-1, +1, -1)$
- Slot `2`: `DFL` $(-1, -1, +1)$
- Slot `3`: `DBR` $(+1, -1, -1)$

Each face generator $F$ swaps exactly two slots in $T_{\text{free}}$:
- **`U`:** Swaps $(0, 1)$ (`UFR` $\leftrightarrow$ `UBL`)
- **`D`:** Swaps $(2, 3)$ (`DFL` $\leftrightarrow$ `DBR`)
- **`F`:** Swaps $(0, 2)$ (`UFR` $\leftrightarrow$ `DFL`)
- **`B`:** Swaps $(1, 3)$ (`UBL` $\leftrightarrow$ `DBR`)
- **`R`:** Swaps $(0, 3)$ (`UFR` $\leftrightarrow$ `DBR`)
- **`L`:** Swaps $(1, 2)$ (`UBL` $\leftrightarrow$ `DFL`)

Given current corner configuration $C \in \{0 \dots 23\}$ representing permutation $P_C = S_4[C]$, the new corner configuration $C' = \text{transition}_C(F, C)$ is the lexicographic rank in $S_4$ of $P_C$ after swapping the corresponding two slots.

### 4.2. Edge-Slice Transition Model ($V_4 \times \mathbb{Z}_3$)
Each of the 3 middle slices has 4 edge slots:
- **Slice X ($M$-slice):** `[0: UB, 1: UF, 2: DF, 3: DB]`
- **Slice Y ($E$-slice):** `[0: FL, 1: FR, 2: BR, 3: BL]`
- **Slice Z ($S$-slice):** `[0: UR, 1: UL, 2: DL, 3: DR]`

When a face $F$ is turned:
1. **Coupled Slice (Parallel to Face):**
   - Faces $U, D$ couple to **Slice Y** ($E$-slice).
   - Faces $F, B$ couple to **Slice Z** ($S$-slice).
   - Faces $R, L$ couple to **Slice X** ($M$-slice).
   - The 4 edge slots undergo a $90^\circ$ cyclic shift, and the gear phase changes by $\Delta p \in \{1, 2\} \pmod 3$.
2. **Orthogonal Slices (Perpendicular to Face):**
   - The 2 edge slots located on the turning face are transposed (swapped by a 2-cycle), while the 2 edge slots on the opposite face remain in place.
   - Gear phase is unchanged ($\Delta p = 0$).

#### Exact Physical Slot Permutations $\rho_{S}(F, \text{dir})$:
| Face & Direction | Slice X Action ($\rho_X, \Delta p_X$) | Slice Y Action ($\rho_Y, \Delta p_Y$) | Slice Z Action ($\rho_Z, \Delta p_Z$) |
| :--- | :--- | :--- | :--- |
| **`U CW`** | Swaps $(0, 1)$, $\Delta p = 0$ | Cyclical $(0 \to 1 \to 2 \to 3)$, $\Delta p = +1$ | Swaps $(0, 1)$, $\Delta p = 0$ |
| **`U CCW`** | Swaps $(0, 1)$, $\Delta p = 0$ | Cyclical $(0 \to 3 \to 2 \to 1)$, $\Delta p = +2$ | Swaps $(0, 1)$, $\Delta p = 0$ |
| **`D CW`** | Swaps $(2, 3)$, $\Delta p = 0$ | Cyclical $(0 \to 3 \to 2 \to 1)$, $\Delta p = +2$ | Swaps $(2, 3)$, $\Delta p = 0$ |
| **`D CCW`** | Swaps $(2, 3)$, $\Delta p = 0$ | Cyclical $(0 \to 1 \to 2 \to 3)$, $\Delta p = +1$ | Swaps $(2, 3)$, $\Delta p = 0$ |
| **`F CW`** | Swaps $(1, 2)$, $\Delta p = 0$ | Swaps $(0, 1)$, $\Delta p = 0$ | Cyclical $(0 \to 1 \to 2 \to 3)$, $\Delta p = +1$ |
| **`F CCW`** | Swaps $(1, 2)$, $\Delta p = 0$ | Swaps $(0, 1)$, $\Delta p = 0$ | Cyclical $(0 \to 3 \to 2 \to 1)$, $\Delta p = +2$ |
| **`B CW`** | Swaps $(0, 3)$, $\Delta p = 0$ | Swaps $(2, 3)$, $\Delta p = 0$ | Cyclical $(0 \to 3 \to 2 \to 1)$, $\Delta p = +2$ |
| **`B CCW`** | Swaps $(0, 3)$, $\Delta p = 0$ | Swaps $(2, 3)$, $\Delta p = 0$ | Cyclical $(0 \to 1 \to 2 \to 3)$, $\Delta p = +1$ |
| **`R CW`** | Cyclical $(0 \to 1 \to 2 \to 3)$, $\Delta p = +1$ | Swaps $(1, 2)$, $\Delta p = 0$ | Swaps $(0, 3)$, $\Delta p = 0$ |
| **`R CCW`** | Cyclical $(0 \to 3 \to 2 \to 1)$, $\Delta p = +2$ | Swaps $(1, 2)$, $\Delta p = 0$ | Swaps $(0, 3)$, $\Delta p = 0$ |
| **`L CW`** | Cyclical $(0 \to 3 \to 2 \to 1)$, $\Delta p = +2$ | Swaps $(0, 3)$, $\Delta p = 0$ | Swaps $(1, 2)$, $\Delta p = 0$ |
| **`L CCW`** | Cyclical $(0 \to 1 \to 2 \to 3)$, $\Delta p = +1$ | Swaps $(0, 3)$, $\Delta p = 0$ | Swaps $(1, 2)$, $\Delta p = 0$ |

### 4.3. Base-Permutation Coupling and $V_4$ Relative Closure
In canonical coordinates, the absolute edge permutation of slice $S$ at state $(C, k_S)$ is $E_S = V_4[k_S] \circ B_S(C)$.
Under a move $(F, \text{dir})$:
1. Physical slots undergo permutation $\rho_S(F, \text{dir})$.
2. New absolute edge permutation is $E_S' = E_S \circ \rho_S(F, \text{dir})$.
3. New corner configuration is $C' = \text{transition}_C(F, C)$ with base permutation $B_S(C')$.
4. The resulting relative $V_4$ class $k_S' \in \{0, 1, 2, 3\}$ is uniquely determined by:
   $$V_4[k_S'] = E_S' \circ B_S(C')^{-1} = (V_4[k_S] \circ B_S(C) \circ \rho_S(F, \text{dir})) \circ B_S(C')^{-1}$$

Because $V_4 \triangleleft S_4$ is a normal subgroup and $\rho_S$ accurately tracks physical slot actions, $V_4[k_S']$ is guaranteed to be an element of $V_4$ for all $C \in 0..23$ and all $k_S \in 0..3$.

---

## 5. Implementation Strategy & Internal Transition Data Model

### 5.1. Table Provenance
All transition lookup tables in `packages/core/src/transition-data.ts` are **checked-in deterministic frozen constants** derived directly from the accepted Phase 0 transition contracts. Production runtime does NOT execute a dynamic physical-model generator at startup.

### 5.2. Strongly Typed Internal Data Structures
Internal types are strictly defined using Phase 1B literal union types:

```typescript
type InternalSliceName = 'X' | 'Y' | 'Z';

export const CORNER_TRANSITIONS: Readonly<
  Record<Face, readonly CornerConfiguration[]>
>;

export const SLICE_K_TRANSITIONS: Readonly<
  Record<Face, Readonly<
    Record<Direction, Readonly<
      Record<InternalSliceName, readonly (readonly SlicePermutationClass[])[]>
    >>
  >>
>;

export const SLICE_DELTA_PHASES: Readonly<
  Record<Face, Readonly<
    Record<Direction, Readonly<
      Record<InternalSliceName, SliceGearPhase>
    >>
  >>
>;
```

### 5.3. Transition Execution
The production `applyMove` function in `packages/core/src/transitions.ts` executes in $O(1)$ constant time:
```typescript
export function applyMove(state: GearCubeState, move: Move): GearCubeState {
  if (!isGearCubeState(state)) {
    throw new TypeError('Invalid GearCubeState supplied to applyMove');
  }
  if (!isMove(move)) {
    throw new TypeError('Invalid Move supplied to applyMove');
  }

  const { face, direction } = move;
  const c = state.cornerConfiguration;
  const nextC = CORNER_TRANSITIONS[face][c];

  const kTables = SLICE_K_TRANSITIONS[face][direction];
  const dpTable = SLICE_DELTA_PHASES[face][direction];

  return {
    cornerConfiguration: nextC,
    sliceX: {
      permutationClass: kTables.X[c][state.sliceX.permutationClass],
      phase: ((state.sliceX.phase + dpTable.X) % 3) as SliceGearPhase,
    },
    sliceY: {
      permutationClass: kTables.Y[c][state.sliceY.permutationClass],
      phase: ((state.sliceY.phase + dpTable.Y) % 3) as SliceGearPhase,
    },
    sliceZ: {
      permutationClass: kTables.Z[c][state.sliceZ.permutationClass],
      phase: ((state.sliceZ.phase + dpTable.Z) % 3) as SliceGearPhase,
    },
  };
}
```

---

## 6. Public API Design & Delta Policy

### 6.1. Public API Delta
All Phase 1B exports remain intact and unchanged. Phase 1C adds **exactly ONE new public export**:
$$\text{post\_API} = \text{pre\_API} \cup \{ \text{applyMove} \}$$

```typescript
/**
 * Applies a canonical move to a valid GearCubeState and returns the resulting state.
 *
 * @param state - Valid canonical GearCubeState
 * @param move - Valid Move { face, direction }
 * @returns Structurally independent, valid GearCubeState resulting from the transition
 * @throws TypeError if state or move violates structural runtime contracts
 */
export function applyMove(
  state: GearCubeState,
  move: Move
): GearCubeState;
```

### 6.2. Test-Local Helper (Zero Production Visibility)
Move inversion is defined as a **test-local helper** within test files (`packages/core/tests/transitions.test.ts` and `packages/core/tests/transitions-exhaustive.test.ts`):
```typescript
/** Test-local helper mapping CW <-> CCW for property assertions */
function inverseMove(move: Move): Move {
  return {
    face: move.face,
    direction: move.direction === 'CW' ? 'CCW' : 'CW',
  };
}
```
`inverseMove` is NOT exported by `packages/core/src/transitions.ts` or `packages/core/src/index.ts`, and is not part of the production library contract.

---

## 7. Input Validation & Error Policy

- **Deterministic Validation Order:**
  1. `state` (validated via `isGearCubeState(state)`).
  2. `move` (validated via `isMove(move)`).
- **Error Behavior:** If either argument is invalid, `applyMove` throws a built-in `TypeError`. When both arguments are invalid, the state failure is thrown first.
- **No Custom Hierarchy:** Standard built-in `TypeError` is used exclusively; no custom error classes are introduced.

---

## 8. Output Immutability & Anti-Aliasing Policy

The output aliasing policy is strictly frozen as follows:
- **Input State:** Never mutated.
- **Fresh Outer Object:** `applyMove` always returns a newly allocated `GearCubeState` object (`out !== input`).
- **Fresh Nested Slice Objects:** `applyMove` always constructs fresh `{ permutationClass, phase }` coordinate objects for `sliceX`, `sliceY`, and `sliceZ`:
  - `out.sliceX !== input.sliceX`
  - `out.sliceY !== input.sliceY`
  - `out.sliceZ !== input.sliceZ`
- **Zero Shared Mutable State:** Subsequent modification of caller-owned mutable input objects cannot alter the output state.
- **No Runtime Deep-Freeze:** Normal returned runtime states are structural readonly TypeScript objects and are not recursively frozen with `Object.freeze()` to avoid execution overhead.

---

## 9. 12 Solved-State Golden Transition Vectors

Applying the 12 directed moves starting from `SOLVED_GEAR_CUBE_STATE` ($C=0, X=(0,0), Y=(0,0), Z=(0,0)$) yields the exact coordinates:

| Move | Resulting $C$ | Slice X $(k, p)$ | Slice Y $(k, p)$ | Slice Z $(k, p)$ |
| :--- | :---: | :---: | :---: | :---: |
| **`U CW`** | **`6`** | `(1, 0)` | `(3, 1)` | `(1, 0)` |
| **`U CCW`** | **`6`** | `(1, 0)` | `(1, 2)` | `(1, 0)` |
| **`D CW`** | **`1`** | `(0, 0)` | `(1, 2)` | `(0, 0)` |
| **`D CCW`** | **`1`** | `(0, 0)` | `(3, 1)` | `(0, 0)` |
| **`F CW`** | **`14`** | `(0, 0)` | `(1, 0)` | `(3, 1)` |
| **`F CCW`** | **`14`** | `(0, 0)` | `(1, 0)` | `(1, 2)` |
| **`B CW`** | **`5`** | `(3, 0)` | `(0, 0)` | `(1, 2)` |
| **`B CCW`** | **`5`** | `(3, 0)` | `(0, 0)` | `(3, 1)` |
| **`R CW`** | **`21`** | `(3, 1)` | `(0, 0)` | `(3, 0)` |
| **`R CCW`** | **`21`** | `(1, 2)` | `(0, 0)` | `(3, 0)` |
| **`L CW`** | **`2`** | `(1, 2)` | `(3, 0)` | `(0, 0)` |
| **`L CCW`** | **`2`** | `(3, 1)` | `(3, 0)` | `(0, 0)` |

---

## 10. True Test-Only Independent Oracle & Import Boundary

To verify transition correctness independently from the precomputed lookup tables, a **test-only reference oracle** is implemented inside `packages/core/tests/transitions-exhaustive.test.ts`.

### 10.1. Same-File Test Architecture & Scope Clarity
In `packages/core/tests/transitions-exhaustive.test.ts`:
- The **comparison test harness** imports `applyMove` from `../src/transitions.js` (or `../src/index.js`) to invoke production transitions during verification loops.
- The **independent reference oracle implementation** (`referenceOracle(...)` and its dedicated test helper functions) operates under strict structural isolation.

### 10.2. Strict Oracle Import Whitelist & Forbidden Dependencies
- **Permitted Oracle Import Whitelist:**
  - `../src/values.js` (Phase 1B public types `Face`, `Direction`, `GearCubeState`, `CornerConfiguration`, `SlicePermutationClass`, `SliceGearPhase`, `Move`, and value collections `FACES`, `DIRECTIONS`, `CORNER_CONFIGURATIONS`).
  - `../src/constants.js` (Phase 1B frozen constants `SOLVED_GEAR_CUBE_STATE`, `ALL_MOVES`, `V4_PERMUTATIONS`, and slot constants).
  - `../src/validation.js` (optional Phase 1B type guards for output assertion).
- **Strictly Forbidden for the Oracle Implementation:**
  - Must **NOT** import `packages/core/src/transition-data.ts`.
  - Must **NOT** import `packages/core/src/transitions.ts`.
  - Must **NOT** import `packages/core/src/index.ts` within the oracle implementation functions.
  - Must **NOT** call `applyMove()` inside `referenceOracle` or any helper invoked by it.
  - Must **NOT** reuse production transition tables (`CORNER_TRANSITIONS`, `SLICE_K_TRANSITIONS`, `SLICE_DELTA_PHASES`).
  - Production source code must **NOT** import test oracle code.

### 10.3. Oracle Derivation Pipeline
1. Materializes physical piece placement from canonical state using independent $T_{\text{ref}}$, $B_S(C)$, and $V_4$ tables.
2. Applies physical face 2-cycle corner swaps and 4-cycle / 2-cycle edge permutations directly.
3. Updates $\mathbb{Z}_3$ gear twist phase.
4. Normalizes physical placement back into canonical coordinates using frozen rigid frame rules ($R_X(\pi), R_Y(\pi), R_Z(\pi), I$).
5. Returns the expected canonical `GearCubeState`.

### 10.4. Exhaustive 497,664 Oracle Verification
The exhaustive test verifies that across all $41,472$ canonical states and all 12 moves:
$$\text{applyMove}(s, m) \equiv \text{oracle}(s, m) \quad (\forall s \in \text{Domain}_{41,472}, \forall m \in \text{ALL\_MOVES})$$
**Passing Criterion:** Exactly **$497,664 / 497,664$** match count (0 mismatches).

---

## 11. Invariants & Verification Strategy

1. **Direct vs Independent Oracle Equivalence (497,664 Transitions):**
   $$\text{applyMove}(s, m) = \text{oracle}(s, m) \quad (\forall s \in \text{Domain}_{41,472}, \forall m \in \text{ALL\_MOVES})$$
2. **Move Invertibility (497,664 Round-Trips):**
   $$\text{applyMove}(\text{applyMove}(s, m), \text{inverseMove}(m)) = s \quad (\forall s \in \text{Domain}_{41,472}, \forall m \in \text{ALL\_MOVES})$$
3. **12-Repeat Identity:**
   $$\forall s \in \text{Domain}_{41,472}, \forall m \in \text{ALL\_MOVES}: \quad m^{12}(s) = s$$
   *(Note: 12 applications of any move returns to initial state. Individual state orbits may divide 12).*
4. **Transition Closure:**
   $$\forall s \in \text{Domain}_{41,472}, \forall m \in \text{ALL\_MOVES}: \quad \text{isGearCubeState}(\text{applyMove}(s, m)) = \text{true}$$
5. **Opposing Face Commutativity:**
   $$U \cdot D = D \cdot U, \quad F \cdot B = B \cdot F, \quad R \cdot L = L \cdot R$$

---

## 12. Proposed Module DAG & Test Layout

### 12.1. Exact Module Dependency Graph (DAG)
```text
values.ts (0 internal Core imports)
  ├──> constants.ts (imports from values.ts only)
  ├──> validation.ts (imports from values.ts only)
  ├──> state.ts (imports from values.ts and constants.ts)
  ├──> transition-data.ts (imports types from values.ts only)
  └──> transitions.ts (imports types from values.ts, validators from validation.ts, tables from transition-data.ts)

transition-data.ts
  └──> transitions.ts

values.ts, constants.ts, validation.ts, state.ts, transitions.ts
  └──> index.ts (re-exports public surface directly without proxying)
```

- `transition-data.ts` has **zero** dependency on `transitions.ts`.
- `transitions.ts` depends only on approved Phase 1B modules + `transition-data.ts`.
- Zero cycles.

### 12.2. File Tree
```text
packages/core/src/
  values.ts               [UNCHANGED]
  constants.ts            [UNCHANGED]
  validation.ts           [UNCHANGED]
  state.ts                [UNCHANGED]
  transition-data.ts      [CREATE] Precomputed frozen transition tables
  transitions.ts          [CREATE] applyMove implementation
  index.ts                [MODIFY] Re-export applyMove

packages/core/tests/
  types.test.ts           [UNCHANGED]
  validation.test.ts      [UNCHANGED]
  state.test.ts           [UNCHANGED]
  domain.test.ts          [UNCHANGED]
  transitions.test.ts     [CREATE] Unit tests (golden vectors, validation errors, anti-aliasing, commutativity)
  transitions-exhaustive.test.ts [CREATE] Exhaustive 497,664 closure, direct-vs-oracle, inverse, 12-repeat
```

### 12.3. Exact Implementation Scope: Exactly 7 Files
- **CREATE (4 files):**
  1. `packages/core/src/transition-data.ts`
  2. `packages/core/src/transitions.ts`
  3. `packages/core/tests/transitions.test.ts`
  4. `packages/core/tests/transitions-exhaustive.test.ts`
- **MODIFY (3 files):**
  5. `packages/core/src/index.ts`
  6. `docs/development/ROADMAP.md`
  7. `docs/development/TEST_STRATEGY.md`
- **UNCHANGED:** All other manifests, configs, and Phase 1B source files.

---

## 13. Comprehensive 32 Acceptance Gates

| Gate ID | Description & Acceptance Requirement |
| :--- | :--- |
| **`GATE_1C_BASELINE`** | Exact baseline commit SHA `621ac18642aebed972c165a9f374e96328c7bd76` on branch `phase/1c-transition-engine-implementation`. |
| **`GATE_1C_EXACT_SCOPE`** | Exactly 7 files changed (4 created, 3 modified). Zero extra files. |
| **`GATE_1C_NO_DEPENDENCY_DRIFT`** | `package.json` and lockfile unchanged; zero new dependencies. |
| **`GATE_1C_CORE_PURITY`** | `scripts/check-core-deps.mjs` exits 0 with zero runtime/dev dependencies and no prohibited imports. |
| **`GATE_1C_PUBLIC_API_DELTA_ONLY_APPLY_MOVE`** | All Phase 1B exports preserved; exactly one new symbol `applyMove` added. |
| **`GATE_1C_TRANSITION_DATA_INTERNAL`** | `transition-data.ts` symbols remain strictly internal to `@gearcube/core`. |
| **`GATE_1C_MODULE_DAG`** | `transition-data.ts` does not import `transitions.ts`; `transitions.ts` depends only on Phase 1B modules + `transition-data.ts`; zero cycles. |
| **`GATE_1C_ORACLE_INDEPENDENCE`** | `referenceOracle(...)` and its exclusive helpers do not import `transition-data.ts`, `transitions.ts`, or `index.ts`; do not call `applyMove`; do not reuse production tables; and production code does not import test oracle code. |
| **`GATE_1C_CORNER_TRANSITIONS`** | Corner configuration $C \in 0..23$ transitions match $S_4$ transpositions. |
| **`GATE_1C_V4_TRANSITIONS`** | $V_4$ relative permutation class transitions strictly preserve Klein four-group cosets. |
| **`GATE_1C_Z3_TRANSITIONS`** | $\mathbb{Z}_3$ gear twist phase shifts enforce positive/negative axis sign rules. |
| **`GATE_1C_12_GOLDEN_VECTORS`** | All 12 solved-state golden vectors match Section 9 with 100% precision. |
| **`GATE_1C_INPUT_VALIDATION`** | Invalid state/move throws `TypeError`; deterministic order reports state error first. |
| **`GATE_1C_INPUT_IMMUTABILITY`** | Caller input state object is never mutated by `applyMove`. |
| **`GATE_1C_OUTPUT_NO_ALIASING`** | `out !== input`, `out.sliceX !== input.sliceX`, `out.sliceY !== input.sliceY`, `out.sliceZ !== input.sliceZ`. Mutating input after call does not affect output. |
| **`GATE_1C_CLOSURE_497664`** | $497,664 / 497,664$ transitions produce valid `GearCubeState` instances within the 41,472 domain. |
| **`GATE_1C_DIRECT_VS_ORACLE_497664`** | $497,664 / 497,664$ transitions match the independent test oracle exactly. |
| **`GATE_1C_INVERSE_497664`** | $497,664 / 497,664$ inverse round-trips return initial state ($0$ failures). |
| **`GATE_1C_REPEAT_12_IDENTITY`** | Applying any directed move 12 consecutive times returns the initial state ($m^{12}(s) = s$). |
| **`GATE_1C_NO_SPATIALFRAME`** | Zero `SpatialFrame` or display-frame logic in `applyMove` or `GearCubeState`. |
| **`GATE_1C_NO_SERIALIZATION`** | Zero string serialization or dense integer codecs in Phase 1C source. |
| **`GATE_1C_NO_KINEMATICS`** | Zero continuous angles, durations, or animation easing in Phase 1C source. |
| **`GATE_1C_NO_SOLVER_OR_BFS`** | Zero BFS search, pattern databases, or heuristic solvers in Phase 1C. |
| **`GATE_1C_TEST_DISCOVERY`** | Vitest discovers and executes all Phase 1B and Phase 1C test suites. |
| **`GATE_1C_TYPECHECK`** | `npm run typecheck` passes across `@gearcube/web` and `@gearcube/core` with 0 errors. |
| **`GATE_1C_TESTS`** | `npm test` executes and passes all test suites with 0 failures. |
| **`GATE_1C_WEB_BUILD`** | `npm run build` compiles `@gearcube/web` successfully. |
| **`GATE_1C_VERIFY`** | `npm run verify` passes all aggregate pipeline stages. |
| **`GATE_1C_ROADMAP_SYNC`** | `docs/development/ROADMAP.md` updated to mark Phase 1C completed and Phase 1D next. |
| **`GATE_1C_TEST_STRATEGY_SYNC`** | `docs/development/TEST_STRATEGY.md` updated to record Level 2 transition invariants. |
| **`GATE_1C_DIFF_CHECK`** | `git diff --check` exits 0 with zero whitespace errors. |
| **`GATE_1C_MARKDOWN_LINKS`** | Read-only markdown link check reports 0 broken links. |

---

## 14. Comprehensive 19-Risk Matrix

| Risk | Severity | Mitigation Strategy | Acceptance Gate | Blocking? |
| :--- | :---: | :--- | :--- | :---: |
| **Wrong CW/CCW Slice Turn Direction** | High | Golden vectors verified against independent oracle and period invariants. | `GATE_1C_12_GOLDEN_VECTORS`, `GATE_1C_DIRECT_VS_ORACLE_497664` | Yes |
| **Numeric/Kinematic Sign Leaking into Direction** | Medium | Strict Phase 1B `Direction` type (`'CW' \| 'CCW'`) enforced; zero signed degrees. | `GATE_1C_CORE_PURITY`, `GATE_1C_TYPECHECK` | Yes |
| **Incorrect CornerConfiguration Transition** | High | Direct 2-cycle transpositions on $T_{\text{free}}$ verified against $S_4$ rank. | `GATE_1C_CORNER_TRANSITIONS` | Yes |
| **Wrong $V_4$ Composition Order** | High | Precomputed tables verified against independent physical materialization oracle. | `GATE_1C_DIRECT_VS_ORACLE_497664` | Yes |
| **Wrong $\mathbb{Z}_3$ Delta Sign** | High | Positive/negative axis conventions verified against 12-repeat identity and inverse round-trips. | `GATE_1C_Z3_TRANSITIONS`, `GATE_1C_INVERSE_497664` | Yes |
| **Wrong Coupled Slice for a Face** | High | Exact orthogonal axis mappings ($U/D \to Y, F/B \to Z, R/L \to X$) enforced in data tables. | `GATE_1C_12_GOLDEN_VECTORS` | Yes |
| **Wrong Orthogonal Edge Transposition** | High | Physical face turning coordinates explicitly mapped for orthogonal slices. | `GATE_1C_DIRECT_VS_ORACLE_497664` | Yes |
| **Incorrect $B_S(C)$ Normalization** | High | Coset normality verified across all 24 corner configurations and 3 slices. | `GATE_1C_CLOSURE_497664` | Yes |
| **Incorrect Negative-Axis-Face Convention** | High | $D, B, L$ observational clockwise rotation verified to correspond to positive-axis CCW. | `GATE_1C_12_GOLDEN_VECTORS` | Yes |
| **Accidental `SpatialFrame` Coupling** | High | Pure canonical transition operates strictly on `GearCubeState` without frame arguments. | `GATE_1C_NO_SPATIALFRAME` | Yes |
| **Input State Mutation** | Critical | `applyMove` strictly treats input as readonly; verified with frozen/mutated test fixtures. | `GATE_1C_INPUT_IMMUTABILITY` | Yes |
| **Nested Output Aliasing** | High | Fresh sub-objects created for all 3 slices; verified with object identity assertions. | `GATE_1C_OUTPUT_NO_ALIASING` | Yes |
| **Hard-Coded Table Drift from Frozen Contract** | Critical | Exhaustive $497,664$ check compares static tables against independently derived test oracle. | `GATE_1C_DIRECT_VS_ORACLE_497664` | Yes |
| **Production Table and Test Oracle Sharing Logic** | High | Test oracle implemented independently without importing production transition tables or `index.ts`. | `GATE_1C_ORACLE_INDEPENDENCE` | Yes |
| **Internal Transition Tables Leaking Public** | Medium | `transition-data.ts` symbols omitted from `packages/core/src/index.ts`; API delta = `applyMove` only. | `GATE_1C_PUBLIC_API_DELTA_ONLY_APPLY_MOVE` | Yes |
| **Production Inverse Helper Accidental Deep Import** | Medium | `inverseMove` kept test-local; not exported in production source. | `GATE_1C_PUBLIC_API_DELTA_ONLY_APPLY_MOVE`, `GATE_1C_MODULE_DAG` | Yes |
| **Premature Serialization / Dense Codec** | Low | Serialization codecs constrained to Phase 1D; pure structural state used in 1C. | `GATE_1C_NO_SERIALIZATION` | Yes |
| **BFS / Solver Leakage into Phase 1C** | Medium | BFS reachability traversal explicitly deferred to Phase 1E. | `GATE_1C_NO_SOLVER_OR_BFS` | Yes |
| **Hardware Timing Becoming Correctness Criterion** | Low | All tests assert mathematical state equality without duration thresholds. | `GATE_1C_TESTS` | No |

---

## 15. Implementation File Scope

Exactly **7 files** will be changed in Phase 1C implementation:
- **CREATE (4 files):**
  1. `packages/core/src/transition-data.ts`
  2. `packages/core/src/transitions.ts`
  3. `packages/core/tests/transitions.test.ts`
  4. `packages/core/tests/transitions-exhaustive.test.ts`
- **MODIFY (3 files):**
  5. `packages/core/src/index.ts`
  6. `docs/development/ROADMAP.md`
  7. `docs/development/TEST_STRATEGY.md`
- **UNCHANGED:** All other package manifests, configuration files, and Phase 1B source files.

---

## 16. Verification Strategy

- **`git diff --check`:** Must return exit code 0 with zero whitespace errors.
- **Markdown Links:** Read-only link validator must report 0 broken links.
- **`npm run verify`:** Must pass all 4 stages across all workspaces on baseline tree.

---

## 17. Final Status

```text
PHASE_1C_PLAN_READY_FOR_ACCEPTANCE
```
