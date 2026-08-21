# PHASE_1B_IMPLEMENTATION_PLAN.md — Canonical State / Value Types & Validation Implementation Plan

> **Document Status:** `PROPOSED` (Phase 1B Planning Baseline — Final Repaired)
> **Applicability:** Pure TypeScript Domain Core (`packages/core`)
> **Accepted Implementation Baseline:** Commit `9fbe3905ec52fa4a18b831cf0182461b26fb9d3e` (`phase/1a-bootstrap-implementation`)
> **Reference Specifications:** [`GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md), [`PUZZLE_CONTRACTS.md`](../architecture/PUZZLE_CONTRACTS.md), [`STANDARD_GEAR_CUBE_SPEC.md`](../reference/STANDARD_GEAR_CUBE_SPEC.md), [`ADR-0003`](../decisions/ADR-0003-CORE-STATE-REPRESENTATION.md)

---

## 1. Executive Summary & Objective

The objective of **Phase 1B** is to implement the canonical, framework-independent domain value layer, exact literal-union type domains, internal coordinate metadata, solved state baseline, and strict structural runtime validation guards for the Standard Gear Cube within `packages/core`.

Phase 1B establishes the concrete data structures for the **41,472-state canonical domain** before any move transition algebra or state manipulation routines (Phase 1C) are introduced.

### Key Architectural Invariants:
1. **True Cartesian Domain ($\mathbf{41,472}$ States):** State decomposes strictly as $24 \times 12 \times 12 \times 12 = 41,472$ independent logical coordinates ($S_4 \times (V_4 \times \mathbb{Z}_3)^3$). Every valid coordinate combination is a legal reachable puzzle state.
2. **Fixed-Reference Coordinate Invariant:** Reference corner `DBL` (piece 3 in tetrad $T_{\text{ref}}$) is physically fixed in canonical reference slot `DBL` (slot 3). Consequently, $T_{\text{ref}}$ is completely derived and excluded from canonical state coordinates. State is parameterized solely by the permutation of the free tetrad $T_{\text{free}} \in S_4$ represented as lexicographic rank $C \in \{0, \dots, 23\}$.
3. **Pure Observational Move Semantics:** `Direction` is strictly the semantic outer turn direction `'CW' | 'CCW'`. No numeric signed angles (e.g. $\pm 180^\circ$) or kinematic parameters pollute the domain value layer.
4. **SpatialFrame & Presentation Decoupling:** `SpatialFrame` ($0 \dots 3$), 3D visual scene nodes, mesh geometries, camera viewpoints, center orientations, and animation timing are strictly excluded from `GearCubeState`.
5. **Exact Own-Key Set Semantics & Zero External Dependencies:** Runtime guards enforce exact, order-independent own-key set equality via `Reflect.ownKeys()`, rejecting hidden metadata (such as `spatialFrame`, `history`, `solverCost`, symbol keys, or non-enumerable properties). `packages/core` remains 100% dependency-free (`dependencies: {}`, `devDependencies: {}`, `lib: ["ES2022"]`, `types: []`).

---

## 2. Accepted Baseline & Prerequisites

- **Accepted Starting Commit:** `9fbe3905ec52fa4a18b831cf0182461b26fb9d3e` (`Bootstrap GearCube Lab workspace`)
- **Accepted Starting Branch:** `phase/1a-bootstrap-implementation`
- **Planning Branch:** `phase/1b-state-validation-plan`
- **Target Implementation Branch:** `phase/1b-state-validation-implementation`

---

## 3. Scope & Non-Goals

### In-Scope Deliverables (Phase 1B):
- Dedicated `packages/core/src/values.ts` owning canonical value arrays and deriving exact literal-union types for `Face`, `Direction`, `CornerConfiguration`, `SlicePermutationClass`, and `SliceGearPhase`, alongside structural interfaces `Move`, `EdgeSliceCoordinate`, and `GearCubeState`.
- Dedicated `packages/core/src/constants.ts` owning public constants (`ALL_MOVES`, `SOLVED_GEAR_CUBE_STATE`, cardinality counts) and internal frozen coordinate metadata (`V4_PERMUTATIONS`, `SLICE_X_SLOTS`, `SLICE_Y_SLOTS`, `SLICE_Z_SLOTS`).
- Dedicated `packages/core/src/validation.ts` owning pure boolean type guards with order-independent exact own-key validation via `Reflect.ownKeys()`, depending strictly on `values.ts`.
- Dedicated `packages/core/src/state.ts` owning pure state operations `equalsGearCubeState(a, b)` and `isSolved(state)`.
- Public re-export surface in `packages/core/src/index.ts` re-exporting directly from module owners without proxying.
- Comprehensive unit test suite in `packages/core/tests/` verifying type boundaries, internal V4/slot mappings, exact-key validation (order-independence, symbol/non-enumerable rejection), invalid value rejection, and exhaustive Cartesian domain generation ($41,472$ states).
- Documentation synchronization in `docs/development/ROADMAP.md` and `docs/development/TEST_STRATEGY.md`.

### Non-Goals (Explicitly Deferred):
- ❌ **Move Transition Engine (`applyMove`):** Deferred to Phase 1C.
- ❌ **Transition Lookup Tables & Action Algebra:** Deferred to Phase 1C.
- ❌ **SpatialFrame Permutations & Lifecycle (`FRAME_SLOT_PERM`):** Deferred to Phase 1D.
- ❌ **State Materialization (`materializeState` -> `PiecePlacementView`):** Deferred to Phase 1D.
- ❌ **State Codec & Serialization (JSON strings, dense integer ranking):** Deferred to Phase 1D / Phase 4.
- ❌ **Exhaustive Move Transition Closure ($497,664$ transitions, BFS):** Deferred to Phase 1E.
- ❌ **Kinematics, 3D Meshes, Rendering, UI, Solvers:** Deferred to Phases 2–4.

---

## 4. Canonical Domain Facts & Frozen Mathematical Rules

| Concept | Mathematical / Domain Definition | Value Domain / Cardinality | Frozen Reference Source |
| :--- | :--- | :---: | :--- |
| **Faces** | Outer puzzle face identifiers in canonical order | `'U'`, `'D'`, `'F'`, `'B'`, `'R'`, `'L'` ($6$) | [`PUZZLE_CONTRACTS.md`](../architecture/PUZZLE_CONTRACTS.md#L27) |
| **Directions** | Semantic face turn direction viewed from outside face normal | `'CW'`, `'CCW'` ($2$) | [`PUZZLE_CONTRACTS.md`](../architecture/PUZZLE_CONTRACTS.md#L37) |
| **Legal Directed Moves** | Directed outer face turns ($180^\circ$ mechanical flips) | $6 \times 2 = \mathbf{12}$ moves | [`GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md#L241) |
| **Corner Configurations** | Orientation-normalized lexicographic rank of free tetrad $T_{\text{free}} \in S_4$ | $0 \dots 23$ ($24$) | [`GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md#L100-L128) |
| **Reference Tetrad** | $T_{\text{ref}}$ with fixed corner piece `DBL` in slot `DBL` | Completely derived from $T_{\text{free}}$ | [`GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md#L42) |
| **Edge Slice Orbits** | Orthogonal middle slice orbits: $X$ ($M$-slice), $Y$ ($E$-slice), $Z$ ($S$-slice) | $3$ orthogonal orbits | [`GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md#L50-L65) |
| **Slice Permutation Class** | Klein four-group relative permutation $V_4 \triangleleft S_4$ | $0, 1, 2, 3$ ($4$) | [`GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md#L133-L141) |
| **Slice Gear Phase** | Abstract common middle-slice gear twist class in $\mathbb{Z}_3$ | $0, 1, 2$ ($3$) | [`GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md#L187) |
| **Edge Slice State** | Discrete coordinate per slice orbit ($V_4 \times \mathbb{Z}_3$) | $4 \times 3 = \mathbf{12}$ states per slice | [`GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md#L15) |
| **Canonical State Space** | True Cartesian product: $S_4 \times (V_4 \times \mathbb{Z}_3)^3$ | $24 \times 12^3 = \mathbf{41,472}$ states | [`GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md#L16) |
| **Solved State** | Coordinate tuple corresponding to pristine mechanical puzzle | $C=0, X=(0,0), Y=(0,0), Z=(0,0)$ | [`GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md#L201-L206) |

---

## 5. Frozen Coordinate & Internal $V_4$ Numeric Semantics

### 5.1. Corner Coordinate ($C \in \{0, \dots, 23\}$)
`CornerConfiguration` $C$ represents the lexicographic rank of the permutation of $T_{\text{free}} \in S_4$ across the four free slots:
- Slot 0: `UFR` $(+1, +1, +1)$
- Slot 1: `UBL` $(-1, +1, -1)$
- Slot 2: `DFL` $(-1, -1, +1)$
- Slot 3: `DBR` $(+1, -1, -1)$

The reference tetrad $T_{\text{ref}}$ (anchored by piece `DBL` in slot `DBL`) is uniquely derived from $T_{\text{free}}$ without ambiguity ([`GEAR_CUBE_STATE_MODEL.md:Table 4`](../architecture/GEAR_CUBE_STATE_MODEL.md#L100-L128)). $C$ is a pure domain coordinate and is **not** a dense global state index.

### 5.2. Canonical Edge Slice Slot Indexing (Internal Metadata)
Internal constants in `packages/core/src/constants.ts` freeze the canonical slot sequences:
```typescript
export const SLICE_X_SLOTS = Object.freeze(['UB', 'UF', 'DF', 'DB'] as const);
export const SLICE_Y_SLOTS = Object.freeze(['FL', 'FR', 'BR', 'BL'] as const);
export const SLICE_Z_SLOTS = Object.freeze(['UR', 'UL', 'DL', 'DR'] as const);
```

### 5.3. Exact $V_4$ Numeric Mapping (Internal Metadata)
Internal constant in `packages/core/src/constants.ts` freezes the Klein four-group $V_4 \triangleleft S_4$ permutation mapping:
```typescript
export const V4_PERMUTATIONS: readonly (readonly [number, number, number, number])[] = Object.freeze([
  Object.freeze([0, 1, 2, 3] as const), // Class 0: Identity (I)
  Object.freeze([1, 0, 3, 2] as const), // Class 1: (0 1)(2 3) - Top/Bottom or Front/Back paired double transposition
  Object.freeze([2, 3, 0, 1] as const), // Class 2: (0 2)(1 3) - Cross-layer opposite paired double transposition
  Object.freeze([3, 2, 1, 0] as const), // Class 3: (0 3)(1 2) - Diagonal cross paired double transposition
]);
```
Combined with the canonical base permutations $B_S(C)$, the physical edge permutation in slot orbit $S$ is given by $\text{AbsoluteEdges}(S, C, k) = V_4[k] \circ B_S(C)$ ([`GEAR_CUBE_STATE_MODEL.md:Section 5`](../architecture/GEAR_CUBE_STATE_MODEL.md#L131-L175)).

### 5.4. Abstract $\mathbb{Z}_3$ Phase Semantics
`SliceGearPhase` ($0, 1, 2$) represents the abstract common gear cog twist class in $\mathbb{Z}_3$. It carries zero visual gear angle interpretation (e.g. $0^\circ, 60^\circ, 120^\circ$) in Phase 1B.

---

## 6. Type Domain Model & Construction Policy

### 6.1. Single-Source-of-Truth Domain Ownership (`values.ts`)
To prevent circular dependencies, `packages/core/src/values.ts` canonically owns the value arrays and derives all TypeScript literal-union types directly from them:

```typescript
export const FACES = Object.freeze(['U', 'D', 'F', 'B', 'R', 'L'] as const);
export type Face = (typeof FACES)[number];

export const DIRECTIONS = Object.freeze(['CW', 'CCW'] as const);
export type Direction = (typeof DIRECTIONS)[number];

export const CORNER_CONFIGURATIONS = Object.freeze([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23
] as const);
export type CornerConfiguration = (typeof CORNER_CONFIGURATIONS)[number];

export const SLICE_PERMUTATION_CLASSES = Object.freeze([0, 1, 2, 3] as const);
export type SlicePermutationClass = (typeof SLICE_PERMUTATION_CLASSES)[number];

export const SLICE_GEAR_PHASES = Object.freeze([0, 1, 2] as const);
export type SliceGearPhase = (typeof SLICE_GEAR_PHASES)[number];
```

### 6.2. Public Value Interfaces (`values.ts`)
```typescript
export interface Move {
  readonly face: Face;
  readonly direction: Direction;
}

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
```

### 6.3. Deterministic `ALL_MOVES` Array ($12$ Moves in `constants.ts`)
`packages/core/src/constants.ts` imports `FACES`, `DIRECTIONS`, and `Move` from `values.ts` to construct `ALL_MOVES` with runtime element and array freezing:
```typescript
export const ALL_MOVES: readonly Move[] = Object.freeze(
  FACES.flatMap((face) =>
    DIRECTIONS.map((direction) => Object.freeze({ face, direction }))
  )
);
```
**Canonical Move Order:**
`[('U','CW'), ('U','CCW'), ('D','CW'), ('D','CCW'), ('F','CW'), ('F','CCW'), ('B','CW'), ('B','CCW'), ('R','CW'), ('R','CCW'), ('L','CW'), ('L','CCW')]`.
*(Note: This order is a project API convention only and does NOT define solver metric semantics.)*

### 6.4. Construction & Immutability Policy
1. **Structural Readonly Construction:** Phase 1B values are structural immutable data. Plain typed TypeScript object literals (e.g. `{ face: 'U', direction: 'CW' }`, `{ permutationClass: 0, phase: 0 }`, `{ cornerConfiguration: 0, sliceX: ..., ... }`) are the primary, legitimate, and supported construction method.
2. **No Redundant Factory Wrappers:** Public factory functions (`createMove`, `createEdgeSliceCoordinate`, `createGearCubeState`, `getSolvedState`) are excluded from the public API.
3. **Immutability:** Compile-time immutability is enforced via `readonly` modifiers. Static exported constants (`SOLVED_GEAR_CUBE_STATE`, `FACES`, `DIRECTIONS`, `ALL_MOVES`, `CORNER_CONFIGURATIONS`, `SLICE_PERMUTATION_CLASSES`, `SLICE_GEAR_PHASES`, `V4_PERMUTATIONS`, slot lists) are deeply frozen via `Object.freeze()`. General runtime states are plain lightweight objects to avoid dynamic recursive freezing overhead during future solver search.

---

## 7. Validation Model & Exact Own-Key Set Semantics

### 7.1. Public Validation Surface
Phase 1B exposes strictly the 8 pure boolean type guards in `packages/core/src/validation.ts`:
- `isFace(value: unknown): value is Face`
- `isDirection(value: unknown): value is Direction`
- `isMove(value: unknown): value is Move`
- `isCornerConfiguration(value: unknown): value is CornerConfiguration`
- `isSlicePermutationClass(value: unknown): value is SlicePermutationClass`
- `isSliceGearPhase(value: unknown): value is SliceGearPhase`
- `isEdgeSliceCoordinate(value: unknown): value is EdgeSliceCoordinate`
- `isGearCubeState(value: unknown): value is GearCubeState`

### 7.2. Order-Independent Exact Own-Key Set Semantics (`Reflect.ownKeys()`)
To prevent hidden metadata, renderer objects, or invalid fields from corrupting domain state, type guards enforce exact own-key set equality (including string, non-enumerable, and symbol own keys) using `Reflect.ownKeys()`:
- **Set Equality Invariant:**
  1. `Reflect.ownKeys(value).length` must equal exactly the required key count.
  2. Every required string key must be present as an own property.
  3. Zero additional string keys, zero symbol own keys, and zero non-enumerable extra keys are permitted.
- **Order-Independence:** Property insertion order is **not** a domain invariant. `{ face: 'U', direction: 'CW' }` and `{ direction: 'CW', face: 'U' }` validate identically (`PASS`).

#### Required Own-Key Sets:
- **`Move`:** Exact own-key set `['face', 'direction']` ($2$ keys).
- **`EdgeSliceCoordinate`:** Exact own-key set `['permutationClass', 'phase']` ($2$ keys).
- **`GearCubeState`:** Exact own-key set `['cornerConfiguration', 'sliceX', 'sliceY', 'sliceZ']` ($4$ keys).

#### Prohibited Extra Properties:
Any object containing extra properties—such as `spatialFrame`, `history`, `solverCost`, `mesh`, `centerOrientation`, `animationProgress`, or symbol properties—is rejected by `isGearCubeState(value)` returning `false`.

---

## 8. Value Operations & Solved State

### 8.1. State Equality Helper (`packages/core/src/state.ts`)
```typescript
export function equalsGearCubeState(a: GearCubeState, b: GearCubeState): boolean {
  return (
    a.cornerConfiguration === b.cornerConfiguration &&
    a.sliceX.permutationClass === b.sliceX.permutationClass &&
    a.sliceX.phase === b.sliceX.phase &&
    a.sliceY.permutationClass === b.sliceY.permutationClass &&
    a.sliceY.phase === b.sliceY.phase &&
    a.sliceZ.permutationClass === b.sliceZ.permutationClass &&
    a.sliceZ.phase === b.sliceZ.phase
  );
}
```

### 8.2. IsSolved Helper (`packages/core/src/state.ts`)
```typescript
export function isSolved(state: GearCubeState): boolean {
  return equalsGearCubeState(state, SOLVED_GEAR_CUBE_STATE);
}
```

### 8.3. Canonical Solved State Constant (`packages/core/src/constants.ts`)
```typescript
export const SOLVED_GEAR_CUBE_STATE: GearCubeState = Object.freeze({
  cornerConfiguration: 0,
  sliceX: Object.freeze({ permutationClass: 0, phase: 0 }),
  sliceY: Object.freeze({ permutationClass: 0, phase: 0 }),
  sliceZ: Object.freeze({ permutationClass: 0, phase: 0 }),
});
```

---

## 9. Test Discovery & Toolchain Isolation

### 9.1. Test Discovery
The root [`vitest.config.ts`](../../vitest.config.ts) already contains:
```typescript
include: ['tests/**/*.test.ts', 'packages/*/tests/**/*.test.ts', 'apps/*/src/**/*.test.ts']
```
Therefore, tests placed in `packages/core/tests/**/*.test.ts` are automatically discovered by `npm test` and `npm run verify` without requiring any changes to `vitest.config.ts` (`vitest.config.ts` remains **`UNCHANGED`**).

### 9.2. Toolchain Isolation
- Domain tests reside under `packages/core/tests/` (outside `src/`).
- Domain tests explicitly import Vitest APIs: `import { describe, it, expect } from 'vitest';`.
- Production [`packages/core/tsconfig.json`](../../packages/core/tsconfig.json) remains strictly isolated: `"include": ["src/**/*"]`, `"lib": ["ES2022"]`, `"types": []` (no ambient Node or Vitest types).

---

## 10. Cardinality Test Specification

The non-transition Cartesian domain generation test in `packages/core/tests/domain.test.ts` verifies the exact mathematical product:
$$\forall C \in [0..23], \forall X \in [0..3] \times [0..2], \forall Y \in [0..3] \times [0..2], \forall Z \in [0..3] \times [0..2]$$
- Generates all $24 \times 12 \times 12 \times 12 = \mathbf{41,472}$ state objects.
- Asserts total generated states = exactly **41,472**.
- Asserts `isGearCubeState(state) === true` for all 41,472 states with 0 failures.
- Asserts `isSolved(state) === true` for exactly 1 state ($C=0, X=(0,0), Y=(0,0), Z=(0,0)$).
- *(Note: This test is a mathematical correctness gate; it does NOT execute move transitions, BFS, or hardware-dependent benchmarks).*

---

## 11. Module & File Tree Layout

Proposed structure within `packages/core/`:
```text
packages/core/
├── package.json               # (Unchanged)
├── tsconfig.json              # (Unchanged: lib: ["ES2022"], types: [], include: ["src/**/*"])
├── src/
│   ├── values.ts              # Canonical value collections & literal-union types & interfaces
│   ├── constants.ts           # ALL_MOVES, SOLVED_GEAR_CUBE_STATE, internal V4/slot metadata
│   ├── validation.ts          # Pure boolean type guards with Reflect.ownKeys() exact-key validation
│   ├── state.ts               # equalsGearCubeState, isSolved
│   └── index.ts               # Public re-export surface for @gearcube/core
└── tests/
    ├── types.test.ts          # Value domains, constants, move combinations, internal V4/slot tests
    ├── validation.test.ts     # Type guards, exact-key checks, order-independence, symbol/extra property rejection
    ├── state.test.ts          # equalsGearCubeState, isSolved, SOLVED_GEAR_CUBE_STATE
    └── domain.test.ts         # Exhaustive 41,472 Cartesian domain generator test
```

### Module Dependency Graph (Strict Acyclic DAG):
```text
values.ts (owns primitive collections, literal types, interfaces)
  ├──> constants.ts (owns ALL_MOVES, counts, SOLVED_GEAR_CUBE_STATE, internal V4/slots)
  ├──> validation.ts (owns 8 boolean guards, depends ONLY on values.ts)
  └──> state.ts (owns equalsGearCubeState, isSolved, depends on values.ts + constants.ts)

constants.ts
  └──> state.ts

values.ts, constants.ts, validation.ts, state.ts
  └──> index.ts (re-exports public surface)
```

---

## 12. Package Export Surface

The public API boundary of `@gearcube/core` re-exports directly from module owners in `packages/core/src/index.ts`:

```typescript
// Canonical Collections & Types (from values.ts)
export {
  FACES,
  DIRECTIONS,
  CORNER_CONFIGURATIONS,
  SLICE_PERMUTATION_CLASSES,
  SLICE_GEAR_PHASES,
} from './values.js';

export type {
  Face,
  Direction,
  Move,
  CornerConfiguration,
  SlicePermutationClass,
  SliceGearPhase,
  EdgeSliceCoordinate,
  GearCubeState,
} from './values.js';

// Public Constants & Counts (from constants.ts)
export {
  ALL_MOVES,
  CORNER_CONFIGURATION_COUNT,
  EDGE_SLICE_STATE_COUNT,
  CANONICAL_DOMAIN_SIZE,
  SOLVED_GEAR_CUBE_STATE,
} from './constants.js';

// Validation Type Guards (from validation.ts)
export {
  isFace,
  isDirection,
  isMove,
  isCornerConfiguration,
  isSlicePermutationClass,
  isSliceGearPhase,
  isEdgeSliceCoordinate,
  isGearCubeState,
} from './validation.js';

// State Operations (from state.ts)
export {
  equalsGearCubeState,
  isSolved,
} from './state.js';
```

---

## 13. Documentation Synchronization Plan

Upon completion of Phase 1B implementation, the following documentation files will be inspected and updated:
- **`docs/development/ROADMAP.md`:** Update Phase 1B milestone status to `COMPLETED`.
- **`docs/development/TEST_STRATEGY.md`:** Update Level 1 (Value Boundaries & Type Invariants) test inventory with implemented test suites.
- **`docs/architecture/PUZZLE_CONTRACTS.md`:** `INSPECTED / UNCHANGED` (conceptual contract remains identical).
- **`docs/architecture/GEAR_CUBE_STATE_MODEL.md`:** `INSPECTED / UNCHANGED` (mathematical specification remains identical).
- **`README.md`:** `INSPECTED / UNCHANGED`.
- **`docs/README.md`:** Synchronized with `PHASE_1B_IMPLEMENTATION_PLAN.md`.

---

## 14. Implementation Scope & File Inventory

The future Phase 1B implementation task will modify/create exactly **11 files**:

| File Path | Action | Description |
| :--- | :---: | :--- |
| `packages/core/src/values.ts` | **CREATE** | Canonical value collections and derived literal-union types/interfaces. |
| `packages/core/src/constants.ts` | **CREATE** | Public constants and internal frozen V4/slot coordinate metadata. |
| `packages/core/src/validation.ts` | **CREATE** | Pure boolean type guards enforcing exact own-key validation via `Reflect.ownKeys()`. |
| `packages/core/src/state.ts` | **CREATE** | Pure state operations `equalsGearCubeState` and `isSolved`. |
| `packages/core/src/index.ts` | **MODIFY** | Re-export public API surface directly from the 4 submodules. |
| `packages/core/tests/types.test.ts` | **CREATE** | Tests for constants, literal types, ALL_MOVES order, and internal V4/slot metadata. |
| `packages/core/tests/validation.test.ts` | **CREATE** | Tests for type guards, exact-key validation, order-independence, extra property rejection, and invalid inputs. |
| `packages/core/tests/state.test.ts` | **CREATE** | Tests for `equalsGearCubeState`, `isSolved`, and `SOLVED_GEAR_CUBE_STATE`. |
| `packages/core/tests/domain.test.ts` | **CREATE** | Non-transition Cartesian domain generation test ($41,472$ states). |
| `docs/development/ROADMAP.md` | **MODIFY** | Synchronize Phase 1B milestone status to completed. |
| `docs/development/TEST_STRATEGY.md` | **MODIFY** | Synchronize Level 1 test suite definitions with concrete implementations. |

---

## 15. Implementation Acceptance Gates

During Phase 1B implementation acceptance, the following gates must be strictly satisfied:

| Gate Identifier | Gate Requirement | Verification Command |
| :--- | :--- | :--- |
| **`GATE_1B_BASELINE`** | Working branch created from exact accepted Phase 1A SHA (`9fbe3905ec52fa4a18b831cf0182461b26fb9d3e`) | `git rev-parse HEAD^` |
| **`GATE_1B_EXACT_SCOPE`** | Exactly 11 files changed in implementation commit (4 new src, 1 modified index, 4 new tests, 2 modified docs). | `git diff --stat` |
| **`GATE_1B_PURITY`** | `packages/core` has zero runtime/dev dependencies and zero prohibited imports | `npm run check:core-deps` |
| **`GATE_1B_TYPESCRIPT`** | Pure ES2022 compilation with `lib: ["ES2022"]` and `types: []` (no DOM/Node types) | `npm run typecheck` |
| **`GATE_1B_PUBLIC_API`** | Exact minimal public API exported from `@gearcube/core` matching Section 12 without proxying `values.ts` collections through `constants.ts` | `npm test` |
| **`GATE_1B_MODULE_DAG`** | Strict acyclic DAG: `values.ts` has no internal core imports; `validation.ts` imports only from `values.ts`; `constants.ts` imports from `values.ts`; `state.ts` imports from `values.ts` and `constants.ts`; zero circular dependencies | `npm run typecheck` |
| **`GATE_1B_FACES_ORDER`** | `FACES` ordered deterministically as `['U', 'D', 'F', 'B', 'R', 'L']` (6 unique faces) | `npm test -- types.test.ts` |
| **`GATE_1B_DIRECTIONS`** | `DIRECTIONS` contains exactly `['CW', 'CCW']` with zero numeric degrees | `npm test -- types.test.ts` |
| **`GATE_1B_ALL_MOVES`** | `ALL_MOVES` contains exactly 12 directed moves in canonical $(FACES \times DIRECTIONS)$ order | `npm test -- types.test.ts` |
| **`GATE_1B_C_DOMAIN`** | `CORNER_CONFIGURATIONS` contains exactly 24 integers $0 \dots 23$ | `npm test -- types.test.ts` |
| **`GATE_1B_V4_DOMAIN`** | `V4_PERMUTATIONS` correctly maps indices $0, 1, 2, 3$ to exact permutations $[0,1,2,3], [1,0,3,2], [2,3,0,1], [3,2,1,0]$ | `npm test -- types.test.ts` |
| **`GATE_1B_SLOT_ORDERS`** | `SLICE_X_SLOTS`, `SLICE_Y_SLOTS`, `SLICE_Z_SLOTS` correctly encode canonical slot sequences | `npm test -- types.test.ts` |
| **`GATE_1B_Z3_DOMAIN`** | `SLICE_GEAR_PHASES` contains exactly $0, 1, 2$ (abstract $\mathbb{Z}_3$ twist class) | `npm test -- types.test.ts` |
| **`GATE_1B_CARDINALITY`** | Cartesian enumeration confirms exactly $24 \times 12 \times 12 \times 12 = 41,472$ valid states | `npm test -- domain.test.ts` |
| **`GATE_1B_SOLVED_STATE`** | `SOLVED_GEAR_CUBE_STATE` validated and matches $(0, (0,0), (0,0), (0,0))$ | `npm test -- state.test.ts` |
| **`GATE_1B_EXACT_KEYS`** | Exact own-key SET equality verified: order-reordered valid objects PASS; extra enumerable key, extra non-enumerable key, and symbol key FAIL via `Reflect.ownKeys()` | `npm test -- validation.test.ts` |
| **`GATE_1B_CONST_IMMUTABILITY`** | Static constants (`ALL_MOVES`, `SOLVED_GEAR_CUBE_STATE`, `V4_PERMUTATIONS`, arrays) are deeply frozen at runtime | `npm test -- types.test.ts` |
| **`GATE_1B_VALIDATION`** | Invalid corner configurations, out-of-range phases, and malformed state objects rejected | `npm test -- validation.test.ts` |
| **`GATE_1B_NO_TRANSITIONS`** | Zero move transition logic (`applyMove`), transition tables, or serialization in 1B source | Manual code inspection |
| **`GATE_1B_TEST_DISCOVERY`** | All `packages/core/tests/*.test.ts` discovered and executed by `npm test` | `npm test` |
| **`GATE_1B_WEB_BUILD`** | Web application builds cleanly with new Core exports | `npm run build` |
| **`GATE_1B_VERIFY`** | Full aggregate verification suite passes with exit code 0 | `npm run verify` |
| **`GATE_1B_ROADMAP_SYNC`** | `docs/development/ROADMAP.md` updated to reflect completed Phase 1B status | `git diff docs/development/ROADMAP.md` |
| **`GATE_1B_TEST_STRATEGY_SYNC`** | `docs/development/TEST_STRATEGY.md` updated with Level 1 test inventory | `git diff docs/development/TEST_STRATEGY.md` |
| **`GATE_1B_DIFF_HYGIENE`** | Git diff has zero whitespace/formatting errors | `git diff --check` |
| **`GATE_1B_MARKDOWN_LINKS`** | All internal markdown links are valid (0 broken links) | Read-only markdown link validator |

---

## 16. Risk Analysis & Mitigations

| Risk | Severity | Mitigation Strategy | Acceptance Gate | Blocking? |
| :--- | :---: | :--- | :--- | :---: |
| **Redundant $T_{\text{ref}}$ storage in state** | High | $T_{\text{ref}}$ proven derived; `GearCubeState` stores only $C \in [0..23]$. | `GATE_1B_PUBLIC_API`, `domain.test.ts` | Non-blocking |
| **`SpatialFrame` leakage into `GearCubeState`** | High | Exact 4-key structural validation with `Reflect.ownKeys()` rejects objects containing `spatialFrame`. | `GATE_1B_EXACT_KEYS`, `validation.test.ts` | Non-blocking |
| **`Direction` numeric-angle leakage** | Medium | `Direction` strictly typed as string union `'CW' \| 'CCW'`. | `GATE_1B_DIRECTIONS`, `types.test.ts` | Non-blocking |
| **$\mathbb{Z}_3$ gear phase / visual angle conflation** | Medium | `SliceGearPhase` typed as integer `0 \| 1 \| 2`. Visual kinematics deferred to Phase 2. | `GATE_1B_Z3_DOMAIN`, `validation.test.ts` | Non-blocking |
| **Whole-state dense integer leakage** | High | `GearCubeState` remains human-readable logical coordinates. Dense codec deferred to Phase 4. | `GATE_1B_PUBLIC_API` | Non-blocking |
| **Incorrect $V_4$ numeric mapping** | High | Encoded frozen internal `V4_PERMUTATIONS` constant with explicit unit tests in `types.test.ts`. | `GATE_1B_V4_DOMAIN`, `types.test.ts` | Non-blocking |
| **Malformed / extra properties accepted** | High | Type guards verify `Reflect.ownKeys(value)` matches exact required property set order-independently. | `GATE_1B_EXACT_KEYS`, `validation.test.ts` | Non-blocking |
| **Canonical const/type circular module ownership** | Medium | Dedicated `values.ts` owns collections and derives types; `constants.ts` and `validation.ts` import from `values.ts` in strict acyclic DAG. | `GATE_1B_MODULE_DAG`, `npm run typecheck` | Non-blocking |
| **Static canonical constant mutation** | Medium | Deep runtime freezing of `ALL_MOVES`, `SOLVED_GEAR_CUBE_STATE`, and arrays via `Object.freeze()`. | `GATE_1B_CONST_IMMUTABILITY`, `types.test.ts` | Non-blocking |
| **Mutable runtime state aliasing** | Medium | `readonly` modifiers on all interface properties; state objects treated as immutable values. | `GATE_1B_TYPESCRIPT` | Non-blocking |
| **Vitest/Node types leaking into Core tsconfig** | Critical | Tests isolated under `packages/core/tests/` (outside `src/`). Production tsconfig has `types: []`. | `GATE_1B_PURITY`, `npm run typecheck` | Non-blocking |
| **Public API over-expansion / churn** | Medium | Reduced public API to minimal essential types, constants, 8 guards, `equalsGearCubeState`, and `isSolved`. | `GATE_1B_PUBLIC_API` | Non-blocking |
| **Transition behavior creeping into validators** | High | Scope strictly bounded to value representation and structural validation. | `GATE_1B_NO_TRANSITIONS` | Non-blocking |
| **Test discovery not including `packages/core/tests`** | High | Verified root `vitest.config.ts` includes `'packages/*/tests/**/*.test.ts'`. | `GATE_1B_TEST_DISCOVERY` | Non-blocking |

---

## 17. Rollback & Recovery Protocol

If Phase 1B implementation encounters an unresolvable contradiction or fails acceptance gates:
1. Discard uncommitted implementation changes via `git restore .` and `git clean -fd`.
2. Return to the clean baseline at commit `9fbe3905ec52fa4a18b831cf0182461b26fb9d3e`.
3. Report the specific mathematical or interface blocker in the task report without rewriting accepted Phase 0 / Phase 1A commit history.
