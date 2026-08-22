# PHASE_2_IMPLEMENTATION_PLAN.md — Phase 2 3D Graphics & Kinematic Animation Plan

> **Document Status:** `PHASE_2A_SCOPE_FROZEN` (Ready for Phase 2A Implementation Gate)
> **Phase Target:** Phase 2 — 3D Model, Visual Assets, and Kinematic Animation Engine
> **Applicability:** Kinematics Package (`packages/kinematics`), Web Application (`apps/web`), & 3D Rendering Layer

---

## 1. Executive Summary & Accepted Architecture Baseline

This document defines the frozen architectural contracts, mathematical specifications, coordinate conventions, package boundaries, and exact file scope for **Phase 2A (Pure Kinematic Engine & Static Projection)**.

### Accepted Architecture Foundations ([`ADR-0006`](../decisions/ADR-0006-VIEW-BASED-KINEMATICS-AND-RENDERER-QUOTIENTS.md)):
1. **View-Based Kinematic Planner (`CASE B` Resolution):**
   The continuous kinematic trajectory generator operates directly on physical piece placement views derived from Core:
   $$\text{planKinematics}(fromView: PiecePlacementView, move: Move, toView: PiecePlacementView) \to KinematicPlan$$
   This eliminates all 24/48 moving-set face inversions present in frame-agnostic state planners.
2. **Intentional $C_2$ ($180^\circ$) Axial Quotient for Edge Gears:**
   Continuous middle-edge gear spin ($\Delta \theta = \pm 60^\circ \cdot p$) wraps seamlessly into canonical representatives ($0^\circ, 60^\circ, 120^\circ$) under the renderer's $C_2$ axial symmetry design choice (`EDGE_GEAR_RENDERER_AXIAL_QUOTIENT: ANGLE_MOD_180`, `MVP_GEAR_GEOMETRY_POLICY: INTENTIONALLY_C2_AXIAL_SYMMETRIC_PLACEHOLDER`, `PHYSICAL_GEAR_MESH_C2_SYMMETRY_PROVEN: NO`).
3. **Purified Kinematic Trajectory Evaluation:**
   `KinematicPlan` is a pure mathematical function of normalized mechanical progress $p \in [0, 1]$. All clock timing, duration, easing, and requestAnimationFrame loops belong entirely to `apps/web` (`KINEMATICS_INPUT_TIME: NONE`).
4. **Sole Orientation Authority:**
   `ComponentTransform` uses `rotationQuaternion` as its sole orientation authority (`ORIENTATION_AUTHORITY: QUATERNION_ONLY`).
5. **Stable Core Piece Identity:**
   `ComponentId` is derived strictly from Core piece identity vocabularies (`CornerPieceId | EdgePieceId | CenterPieceId`), never from temporary slot names (`SLOT_USED_AS_COMPONENT_IDENTITY: NO`).
6. **Strict Domain Core Independence:**
   `packages/core` remains the sole logical state authority. `packages/kinematics` is a pure downstream package with zero dependencies on Three.js, React, R3F, or DOM.

---

## 2. Lockfile & Workspace Registration Analysis

### 2.1. npm Lockfile Model (Lockfile Version 3)
- **`PACKAGE_LOCK_VERSION`:** 3
- **`WORKSPACE_PACKAGES_RECORDED_IN_LOCKFILE`:** YES (Root `package-lock.json` explicitly records workspace packages under `"packages/core"`, `"apps/web"`, and symlink entries under `"node_modules/@gearcube/*"`).
- **`KINEMATICS_WORKSPACE_REQUIRES_LOCK_ENTRY`:** YES (`packages/kinematics` requires an entry in `package-lock.json` to enable reproducible `npm ci` builds).
- **`PACKAGE_LOCK_CHANGE_REQUIRED`:** YES (During Phase 2A implementation, workspace registration will update `package-lock.json`).

### 2.2. packages/kinematics Package Manifest (`packages/kinematics/package.json`)
```json
{
  "name": "@gearcube/kinematics",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@gearcube/core": "0.0.0"
  }
}
```

### 2.3. packages/kinematics TypeScript Configuration (`packages/kinematics/tsconfig.json`)
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": []
  },
  "include": ["src/**/*"]
}
```

---

## 3. Public API Contract & Stable Output Ordering

### 3.1. Phase 2A Complete Public TypeScript API Contract
```typescript
import type {
  Move,
  CornerPieceId,
  EdgePieceId,
  CenterPieceId,
  PiecePlacementView,
} from '@gearcube/core';

/** Stable physical component identifier derived from Core piece identity */
export type ComponentId =
  | CornerPieceId
  | EdgePieceId
  | CenterPieceId;

/** Continuous 3D spatial transformation for a component (Quaternion sole orientation authority) */
export interface ComponentTransform {
  readonly componentId: ComponentId;
  readonly position: readonly [number, number, number];
  readonly rotationQuaternion: readonly [number, number, number, number]; // [x, y, z, w]
}

/** Complete kinematic animation trajectory (duration-free pure evaluation) */
export interface KinematicPlan {
  readonly move: Move;
  /** Computes component transforms at normalized mechanical progress p in [0, 1] */
  evaluate(progress: number): readonly ComponentTransform[];
}

/** Downstream view-based kinematic trajectory generator */
export type KinematicPlanner = (
  fromView: PiecePlacementView,
  move: Move,
  toView: PiecePlacementView
) => KinematicPlan;

/** Static placement projection function */
export function placementToTransforms(
  view: PiecePlacementView
): readonly ComponentTransform[];

/** Canonical trajectory generator implementation */
export function planKinematics(
  fromView: PiecePlacementView,
  move: Move,
  toView: PiecePlacementView
): KinematicPlan;
```

### 3.2. Core Placement Field Inventory
From production `packages/core/src/materializer.ts`:
- **`CORNER_PLACEMENT_FIELDS`:** `slot: CornerSlot`, `pieceId: CornerPieceId`, `orbit: 'free' | 'ref'`
- **`EDGE_PLACEMENT_FIELDS`:** `slot: EdgeSlot`, `pieceId: EdgePieceId`, `slice: 'X' | 'Y' | 'Z'`, `phase: SliceGearPhase` (0, 1, 2)
- **`CENTER_PLACEMENT_FIELDS`:** `slot: CenterSlot`, `pieceId: CenterPieceId`
- **`CORE_VIEW_ARRAY_ORDER`:** `FIXED_SPATIAL_SLOT_ORDER` (Placement arrays in `PiecePlacementView` are fixed-spatial slot ordered).

### 3.3. Stable Kinematics ComponentTransform Output Ordering
Downstream consumers (e.g. 3D scene graphs) require a persistent array index per physical piece across all puzzle transitions and frames.
- **`KINEMATICS_TRANSFORM_ARRAY_ORDER`:** `STABLE_COMPONENT_ID_ORDER`
- **`ARRAY_INDEX_IS_STABLE_PHYSICAL_PIECE`:** YES
- **`SLOT_ORDER_USED_AS_KINEMATICS_OUTPUT_ORDER`:** NO
- **Exact 26-Element Array Layout:**
  1. `CORNER_PIECE_IDS` (8 transforms, indices 0..7): `'corner-UFL'`, `'corner-UBR'`, `'corner-DFR'`, `'corner-DBL'`, `'corner-UFR'`, `'corner-UBL'`, `'corner-DFL'`, `'corner-DBR'`
  2. `EDGE_PIECE_IDS` (12 transforms, indices 8..19): `'edge-UB'`, `'edge-UF'`, `'edge-DF'`, `'edge-DB'`, `'edge-FL'`, `'edge-FR'`, `'edge-BR'`, `'edge-BL'`, `'edge-UR'`, `'edge-UL'`, `'edge-DL'`, `'edge-DR'`
  3. `CENTER_PIECE_IDS` (6 transforms, indices 20..25): `'center-U'`, `'center-D'`, `'center-F'`, `'center-B'`, `'center-R'`, `'center-L'`
- **`KINEMATIC_PLAN_OUTPUT_ORDER`:** `STABLE_COMPONENT_ID_ORDER` (For every $p \in [0, 1]$, `plan.evaluate(p)` emits the exact same 26 `ComponentId`s in the exact same stable order; `OUTPUT_ORDER_CHANGES_DURING_MOVE: NO`).

---

## 4. Component Orientation Derivation & Finite Mapping Architecture

### 4.1. Coordinate System & Local Frame Conventions
All spatial transforms use normalized right-handed coordinates $[-1, +1]^3$:
- $+X = \text{Right}$, $-X = \text{Left}$
- $+Y = \text{Up}$, $-Y = \text{Down}$
- $+Z = \text{Front}$, $-Z = \text{Back}$
- **Home slot position $\vec{r}_{\text{home}}$:** Mathematical center of the slot matching `pieceId`. Home orientation: $q_0 = [0, 0, 0, 1]$.

### 4.2. Implementation Architecture & Evidence Classification
- **`ORIENTATION_CHARACTERIZATION_EVIDENCE`:** `SUPPORTING_NON_REPOSITORY_EVIDENCE` (Exploratory characterizations proved finite mappings exist; formal acceptance comes from checked-in TypeScript/Vitest test suites).
- **`PYTHON_CHARACTERIZATION_REEXECUTION_REQUIRED`:** NO (Implementation tests validate all finite orientation mappings using project-native Vitest tooling).
- **`RUNTIME_ORIENTATION_BFS`:** NO (Production kinematics does not run graph search at runtime).

### 4.3. Corner Orientation Mapping (`CORNER_ORIENTATION_IMPLEMENTATION`)
- **`CORNER_ORIENTATION_IMPLEMENTATION`:** `FINITE_CANONICAL_MAPPING` (Finite lookup mapping / closed-form equivalent for the 32 reachable `(CornerPieceId, CornerSlot)` pairs).
- **Properties:**
  - `CORNER_PLACEMENT_KEY_COUNT`: 32 (8 pieces $\times$ 4 reachable slots per orbit).
  - `CORNER_ORIENTATION_CONSISTENT`: YES (Unique canonical quaternion per pair).
  - `CORNER_HISTORY_CONFLICTS`: 0.

### 4.4. Edge Base Orientation & Radial Spin Axis (`EDGE_BASE_ORIENTATION_IMPLEMENTATION`)
- **`EDGE_LOCAL_SPIN_AXIS_MODEL`:** Physical radial unit vector pointing from cube origin $(0,0,0)$ through the edge slot center: $\hat{r} = \frac{\vec{r}_{\text{slot}}}{\|\vec{r}_{\text{slot}}\|} = \frac{(x, y, z)}{\sqrt{2}}$.
- **`EDGE_BASE_ORIENTATION_IMPLEMENTATION`:** `FINITE_CANONICAL_MAPPING` (Finite lookup mapping / closed-form equivalent for the 48 reachable `(EdgePieceId, EdgeSlot)` phase-zero pairs).
- **Composite Edge Orientation:**
  $$q_{\text{edge}} = q_{\text{spin}}(\hat{r}, \text{phase} \times 60^\circ) \otimes q_{\text{base}}(pieceId, slot)$$
- **Properties:**
  - `EDGE_PLACEMENT_KEY_COUNT`: 144 (12 pieces $\times$ 4 reachable slots $\times$ 3 phases).
  - `EDGE_ORIENTATION_CONSISTENT_MOD_C2`: YES.
  - `EDGE_HISTORY_CONFLICTS`: 0.

### 4.5. Center Projection Table & Vector Verification (`CENTER_CANONICAL_QUATERNION_TABLE`)
Pursuant to ADR-0004, center axial rotation history is quotiented out. Canonical renderer quaternions map local $+Y = (0, 1, 0)$ to outward face normal $\hat{n}$:
- **`U` ($+Y$):** $[0, 0, 0, 1]$ (Identity)
- **`D` ($-Y$):** $[1, 0, 0, 0]$ ($180^\circ$ around $X$)
- **`F` ($+Z$):** $[\sqrt{2}/2, 0, 0, \sqrt{2}/2] \approx [0.7071068, 0, 0, 0.7071068]$ ($+90^\circ$ around $X$)
- **`B` ($-Z$):** $[-\sqrt{2}/2, 0, 0, \sqrt{2}/2] \approx [-0.7071068, 0, 0, 0.7071068]$ ($-90^\circ$ around $X$)
- **`R` ($+X$):** $[0, 0, -\sqrt{2}/2, \sqrt{2}/2] \approx [0, 0, -0.7071068, 0.7071068]$ ($-90^\circ$ around $Z$)
- **`L` ($-X$):** $[0, 0, \sqrt{2}/2, \sqrt{2}/2] \approx [0, 0, 0.7071068, 0.7071068]$ ($+90^\circ$ around $Z$)
- **`CENTER_CANONICAL_TABLE_VECTOR_CHECK`:** 6 / 6 verified.

### 4.6. Quaternion Normalization & Sign Canonicalization
- **`QUATERNION_UNIT_NORMALIZATION`:** YES ($\|q\| = 1.0$).
- **`QUATERNION_SIGN_CANONICALIZATION`:** Canonical representative for double-cover $q \equiv -q$ is chosen such that the first non-zero component in order $(w, z, y, x)$ is strictly positive (`QUATERNION_SIGN_RULE_DETERMINISTIC: YES`).

---

## 5. Physical Moving-Set Classifier & Transform Composition

### 5.1. Moving-Set Partition (`SLOT_COORDINATE_PLANE_PARTITION`)
For a physical face move with outward unit normal $\hat{n} \in \{+X, -X, +Y, -Y, +Z, -Z\}$:
- **Active Outer Layer (9 pieces):** Slot position $\vec{p} \cdot \hat{n} = +1$ (4 corners, 4 edge gears, 1 center).
- **Coupled Middle Layer (8 pieces):** Slot position $\vec{p} \cdot \hat{n} = 0$ (4 edge gears, 4 adjacent centers).
- **Opposite Fixed Layer (9 pieces):** Slot position $\vec{p} \cdot \hat{n} = -1$ (4 corners, 4 edge gears, 1 center).

### 5.2. Transform Composition Mathematics (`TRANSFORM_COMPOSITION_CONVENTION`)
- **Active Outer Pieces (9 pieces):**
  $$\vec{r}(p) = R(\hat{n}, \theta_{\text{outer}}(p)) \cdot \vec{r}_0, \quad q(p) = q_{\text{outer}}(p) \otimes q_0$$
- **Middle Layer Centers (4 centers):**
  $$\vec{r}(p) = R(\hat{n}, \theta_{\text{middle}}(p)) \cdot \vec{r}_0, \quad q(p) = q_{\text{middle}}(p) \otimes q_0$$
- **Middle Layer Edge Gears (4 edge gears):**
  $$\vec{r}(p) = R(\hat{n}, \theta_{\text{middle}}(p)) \cdot \vec{r}_0$$
  $$\hat{r}(p) = R(\hat{n}, \theta_{\text{middle}}(p)) \cdot \hat{r}_0 \quad (\text{Radial spin axis orbit})$$
  $$q(p) = q_{\text{spin}}(\hat{r}(p), \Delta \theta_{\text{gear}}(p)) \otimes q_{\text{middle}}(\hat{n}, \theta_{\text{middle}}(p)) \otimes q_0$$
- **Opposite Fixed Pieces (9 pieces):**
  $$\vec{r}(p) = \vec{r}_0, \quad q(p) = q_0$$

### 5.3. Progress Validation Policy (`PROGRESS_OUT_OF_RANGE_POLICY`)
- `evaluate(progress)` strictly enforces $p \in [0.0, 1.0]$.
- Throws `RangeError` on $p < 0.0$, $p > 1.0$, `isNaN(p)`, or `!isFinite(p)`.

---

## 6. Deterministic 10-State Scramble Fixture Suite

The 480-case scrambled verification gate uses the following 10 reproducible move sequences:
1. `SCRAMBLE_01`: `['U']` (Sequence length 1, Single CW turn)
2. `SCRAMBLE_02`: `["U'"]` (Sequence length 1, Single CCW turn)
3. `SCRAMBLE_03`: `['R', 'U']` (Sequence length 2, Multi-axis CW)
4. `SCRAMBLE_04`: `['F', "R'"]` (Sequence length 2, Mixed CW/CCW)
5. `SCRAMBLE_05`: `['U', 'R', 'F']` (Sequence length 3, 3-axis scramble)
6. `SCRAMBLE_06`: `['D', 'L', 'B', 'U']` (Sequence length 4, 4-axis scramble)
7. `SCRAMBLE_07`: `['R', 'F', 'U', 'L', 'D']` (Sequence length 5, 5-axis scramble)
8. `SCRAMBLE_08`: `['F', "B'", 'R', "L'", 'U', "D'"]` (Sequence length 6, Alternating opposite-face scramble)
9. `SCRAMBLE_09`: `['U', 'U', 'R', 'R']` (Sequence length 4, 360° compound face turns)
10. `SCRAMBLE_10`: `['R', 'U', 'R', "U'", 'R', 'U']` (Sequence length 6, Alternating move sequence)

- **`SCRAMBLE_FIXTURE_COUNT`:** 10
- **`SCRAMBLE_UNIQUENESS_IDENTITY_API`:** `serializeLogicalState`
- **`CORE_API_CHANGE_REQUIRED`:** NO
- **`SCRAMBLE_CORE_UNIQUENESS_GATE`:** 10 / 10 REQUIRED DURING PHASE2A IMPLEMENTATION (Must be verified starting from `SOLVED_GEAR_CUBE_STATE`, executing moves via `applyMove`, serializing via `serializeLogicalState`, and asserting `new Set(serializedStrings).size === 10`).
- **`PHASE2A_PLANNED_PHYSICAL_TRANSITION_GATE`:** **528 / 528 REQUIRED DURING IMPLEMENTATION** (1 Solved State $\times$ 4 SpatialFrames $\times$ 12 moves = 48 transitions + 10 Scramble States $\times$ 4 SpatialFrames $\times$ 12 moves = 480 transitions).

### 6.2. Phase 2A Acceptance Gates & Verification Invariants
- **`KINEMATICS_PURITY_GATE`:** `PASS_REQUIRED_DURING_IMPLEMENTATION` (Static package manifest and source import inspection guaranteeing `@gearcube/core` is the sole runtime dependency with zero framework (`three`, `react`, `react-dom`, `@react-three/fiber`, `@react-three/drei`), DOM globals, or ambient Node runtime dependence).
- **`ROOT_VERIFY_INCLUDES_KINEMATICS`:** YES (`npm run typecheck` automatically executes across workspaces; `npm test` via Vitest automatically discovers `packages/kinematics/tests/*.test.ts`; `npm run build` succeeds).
- **`ROOT_VERIFY_GAP`:** NONE.
- **`CORNER_MAPPING_GATE`:** **32 / 32 REQUIRED_DURING_IMPLEMENTATION** (All 32 reachable `(CornerPieceId, CornerSlot)` pairs map to valid canonical quaternions with 0 orientation conflicts).
- **`EDGE_MAPPING_GATE`:** **144 / 144 REQUIRED_DURING_IMPLEMENTATION** (All 144 reachable `(EdgePieceId, EdgeSlot, SliceGearPhase)` keys map to valid canonical orientations with 0 conflicts modulo $C_2$ ($180^\circ$ axial quotient)).
- **`EDGE_PHASE_DECOMPOSITION_GATE`:** **144 / 144 REQUIRED_DURING_IMPLEMENTATION** (All 144 keys correctly decompose into base orientation $q_{\text{base}}(pieceId, slot)$ and axial spin $q_{\text{spin}}(\hat{r}, \text{phase} \times 60^\circ)$; if this gate fails: `ARCHITECTURE_REVIEW_REQUIRED`).
- **`CENTER_MAPPING_GATE`:** **6 / 6 REQUIRED_DURING_IMPLEMENTATION** (All 6 canonical center quaternions map local $+Y = (0, 1, 0)$ to outward face normal $\hat{n}$).

---

## 7. Frozen Phase 2A Implementation Scope

### 7.1. Authorized Files to CREATE (8 files):
1. `packages/kinematics/package.json`
2. `packages/kinematics/tsconfig.json`
3. `packages/kinematics/src/index.ts`
4. `packages/kinematics/src/types.ts`
5. `packages/kinematics/src/projection.ts`
6. `packages/kinematics/src/planner.ts`
7. `packages/kinematics/tests/projection.test.ts`
8. `packages/kinematics/tests/planner.test.ts`

### 7.2. Authorized Files to MODIFY (3 files):
1. `docs/development/ROADMAP.md`
2. `docs/development/TEST_STRATEGY.md`
3. `package-lock.json` (Workspace registration for `@gearcube/kinematics`)

### 7.3. Files Explicitly UNCHANGED:
- `package.json`
- `tsconfig.base.json`
- `scripts/check-core-deps.mjs`
- `packages/core/**` (100% frozen)
- `apps/web/**`
- `docs/decisions/ADR-0006-VIEW-BASED-KINEMATICS-AND-RENDERER-QUOTIENTS.md`
- `docs/architecture/**`

### 7.4. Scope Freeze Declaration
- **`PHASE2A_SCOPE_FROZEN: YES`**