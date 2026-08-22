# PHASE_2_IMPLEMENTATION_PLAN.md — Phase 2 3D Graphics & Kinematic Animation Plan

> **Document Status:** `PLANNING` (ADR-0006 Architecture Contract Accepted; Pending Phase 2A Final Scope Freeze)
> **Phase Target:** Phase 2 — 3D Model, Visual Assets, and Kinematic Animation Engine
> **Applicability:** Kinematics Package (`packages/kinematics`), Web Application (`apps/web`), & 3D Rendering Layer

---

## 1. Executive Summary & Characterization Findings

This document incorporates the mathematical and architectural findings from the Phase 2 SpatialFrame and Gear-Phase Characterization.

### Key Architecture Determinations:
1. **SpatialFrame Equivariance Finding (`CASE B`):**
   A frame-independent 3-argument planner `(fromState, move, toState)` is mathematically insufficient. In 24 of 48 frame-move pairs, a rigid frame rotation applied to canonical trajectories inverts the physical moving face (e.g. in Frame 2, physical `F` would animate physical `B`). Therefore, the kinematic planner must operate on physical materialized placements:
   $$\text{Recommended Planner Signature (Option B2): } \text{planKinematics}(fromView, move, toView) \to \text{KinematicPlan}$$
2. **SliceGearPhase Embedding & $C_2$ Axial Quotient:**
   Continuous $\pm 60^\circ$ gear spins on wrap transitions ($0 \to 2$ via $-60^\circ$, $2 \to 0$ via $+60^\circ$) produce continuous angles ($-60^\circ, +180^\circ$) that differ from canonical representatives ($+120^\circ, 0^\circ$) by exactly $\pm 180^\circ$. The renderer adopts an intentional **$C_2$ ($180^\circ$) axial quotient** (`PROJECT_DESIGN_CHOICE`) so that snap-to-core canonicalization at $p = 1.0$ is visually seamless without claiming physical hardware symmetry (`PHYSICAL_GEAR_MESH_C2_SYMMETRY_PROVEN: NO`).
3. **Strict Domain Core Independence:** `packages/core` remains the **sole logical state authority**. The kinematics package (`packages/kinematics`) and 3D renderer (`apps/web`) act strictly as downstream consumers.

---

## 2. Phase 1 Accepted Baseline & Inventory

### 2.1. Baseline Commit
- **Authoritative Baseline Commit:** `ac91e8cde3deae0ecbe18ed3b3accf384e3e3694` (`Complete Phase 1E exhaustive core acceptance`).
- **Core Acceptance Status:** 100% complete across all Phase 1 subphases (1A, 1B, 1C, 1D, 1E).
- **Core Verification Status:** 10 test files, 123 tests passing with 0 failures, 0 runtime dependencies, 0 DOM dependencies.

### 2.2. Workspace Configuration Inventory
- **Workspace Discovery:** Root `package.json` declares `"workspaces": ["apps/*", "packages/*"]`. Any new directory under `packages/` is automatically discovered by npm.
- **Frontend Framework:** React 19.2.8, ReactDOM 19.2.8, Vite 8.2.2, TypeScript 5.8.3.
- **Current Dependencies:** `@gearcube/core` (workspace: 0.0.0), `react`, `react-dom`.
- **Renderer Dependencies:** None installed (`three: NO`, `@react-three/fiber: NO`, `@types/three: NO`).

---

## 3. SpatialFrame Equivariance Characterization (`CASE B`)

### 3.1. Analysis of 3-Argument Planner vs. 4-State SpatialFrame Lifecycle
In `SpatialFrame = 2` ($R_y(\pi)$), the physical Front face ($+Z$) is occupied by canonical Back pieces (`FRAME_CENTER_SLOT_PERMS[2]['F'] = 'B'`).
When the user executes physical move `F`:
- In canonical space, the canonical Back face (`B`) must turn.
- If a 3-argument planner `planKinematics(fromState, move, toState)` receives `move.face = 'F'`, it computes a trajectory rotating canonical $+Z$ pieces around $+Z$.
- Applying the global frame rotation $R_y(\pi)$ to this canonical trajectory transforms the rotation axis $+Z \to -Z$, rotating the physical Back face (`B`) instead of physical Front (`F`).
- **Moving Set Equivariance Result:** Only 24 / 48 pairs match directly; 24 / 48 produce moving-set face inversions.

### 3.2. Recommended Architecture: Option B2 (View-Based Kinematic Planner)
```typescript
/** Stable physical component identifier matching Core PieceId */
export type ComponentId = CornerPieceId | EdgePieceId | CenterPieceId;

/** Continuous 3D spatial transformation for a component (Quaternion sole orientation authority) */
export interface ComponentTransform {
  readonly componentId: ComponentId;
  readonly position: readonly [number, number, number];
  readonly rotationQuaternion: readonly [number, number, number, number]; // [x, y, z, w]
}

export interface KinematicPlan {
  readonly move: Move;
  /** Computes component transforms at normalized mechanical progress p in [0, 1] */
  evaluate(progress: number): readonly ComponentTransform[];
}

export type KinematicPlanner = (
  fromView: PiecePlacementView,
  move: Move,
  toView: PiecePlacementView
) => KinematicPlan;
```

**Why Option B2 is Superior:**
1. **Direct Physical Authority:** `fromView = materializeState(fromState, fromFrame)` and `toView = materializeState(toState, toFrame)` carry exact fixed-spatial piece locations verified by Gate 6 in `materializer.test.ts`.
2. **Zero Face Inversions:** The planner directly rotates pieces occupying physical face coordinates ($z = 1$ for `F`, etc.) around the physical outward normal axis.
3. **Decoupled Architecture:** `packages/kinematics` consumes `PiecePlacementView` without needing internal knowledge of `SpatialFrame` transpositions.

---

## 4. SliceGearPhase Embedding & $C_2$ Axial Quotient

### 4.1. The Phase Wrap Problem in $SO(3)$
`SliceGearPhase` $\in \mathbb{Z}_3 = \{0, 1, 2\}$ has canonical angular representatives:
- $\text{Phase } 0 \to 0^\circ$
- $\text{Phase } 1 \to +60^\circ$
- $\text{Phase } 2 \to +120^\circ$

During physical turns, the 4 middle-layer edge gears rotate by $\Delta \theta = \pm 60^\circ \cdot p$.
Tracing the wrap cases:
- **Case 1 (Phase $0 \xrightarrow{-60^\circ} 2$):** Continuous rotation ends at $-60^\circ$. Canonical representative for Phase 2 is $+120^\circ$. Difference: $+120^\circ - (-60^\circ) = +180^\circ$.
- **Case 2 (Phase $2 \xrightarrow{+60^\circ} 0$):** Continuous rotation ends at $+180^\circ$. Canonical representative for Phase 0 is $0^\circ$. Difference: $0^\circ - 180^\circ = -180^\circ$.

Under standard $SO(3)$ geometry, $-60^\circ \not\equiv +120^\circ \pmod{360^\circ}$. Therefore, ordinary quaternion equality cannot match the canonical representative on wrap transitions without an axial equivalence relation.

### 4.2. Intentional $C_2$ ($180^\circ$) Axial Quotient Decision
- **`EDGE_GEAR_RENDERER_AXIAL_QUOTIENT: ANGLE_MOD_180`**
- **`MVP_GEAR_GEOMETRY_POLICY: INTENTIONALLY_C2_AXIAL_SYMMETRIC_PLACEHOLDER`**
- **`PHYSICAL_GEAR_MESH_C2_SYMMETRY_PROVEN: NO`** (Not asserted as an empirical hardware fact).
- **`RENDERER_C2_SYMMETRY: PROJECT_DESIGN_CHOICE`** (Adopted specifically to make continuous visual interpolation mathematically seamless with discrete Core $\mathbb{Z}_3$ phase states).
- **`EDGE_ENDPOINT_AXIAL_EQUALITY: MOD_180_DEGREES`**
- Because $-60^\circ \equiv +120^\circ \pmod{180^\circ}$ and $+180^\circ \equiv 0^\circ \pmod{180^\circ}$, snapping to the canonical representative at $p = 1.0$ produces zero visual discontinuity.

---

## 5. Physical Moving-Piece Classification per Face Operation

For every physical face turn $F \in \{U, D, F, B, R, L\}$, all 26 pieces in `PiecePlacementView` are partitioned into exactly three mutually exclusive motion classes:

| Face Turn | Active Outer Layer (9 pieces, $\pm 180^\circ$) | Coupled Middle Slice (8 pieces, $\pm 90^\circ$ + $\pm 60^\circ$ gear spin) | Opposite Outer Layer (9 pieces, Fixed $0^\circ$) |
| :---: | :--- | :--- | :--- |
| **`U`** ($+Y$) | **Corners:** UFL, UBR, UFR, UBL<br/>**Edges:** UB, UF, UR, UL<br/>**Center:** U | **Edges:** FL, FR, BR, BL (Slice Y)<br/>**Centers:** F, R, B, L | **Corners:** DFR, DBL, DFL, DBR<br/>**Edges:** DF, DB, DL, DR<br/>**Center:** D |
| **`D`** ($-Y$) | **Corners:** DFR, DBL, DFL, DBR<br/>**Edges:** DF, DB, DL, DR<br/>**Center:** D | **Edges:** FL, FR, BR, BL (Slice Y)<br/>**Centers:** F, R, B, L | **Corners:** UFL, UBR, UFR, UBL<br/>**Edges:** UB, UF, UR, UL<br/>**Center:** U |
| **`F`** ($+Z$) | **Corners:** UFL, DFR, UFR, DFL<br/>**Edges:** UF, DF, FL, FR<br/>**Center:** F | **Edges:** UR, UL, DL, DR (Slice Z)<br/>**Centers:** U, R, D, L | **Corners:** UBR, DBL, UBL, DBR<br/>**Edges:** UB, DB, BR, BL<br/>**Center:** B |
| **`B`** ($-Z$) | **Corners:** UBR, DBL, UBL, DBR<br/>**Edges:** UB, DB, BR, BL<br/>**Center:** B | **Edges:** UR, UL, DL, DR (Slice Z)<br/>**Centers:** U, R, D, L | **Corners:** UFL, DFR, UFR, DFL<br/>**Edges:** UF, DF, FL, FR<br/>**Center:** F |
| **`R`** ($+X$) | **Corners:** UBR, DFR, UFR, DBR<br/>**Edges:** FR, BR, UR, DR<br/>**Center:** R | **Edges:** UB, UF, DF, DB (Slice X)<br/>**Centers:** U, F, D, B | **Corners:** UFL, DBL, UBL, DFL<br/>**Edges:** FL, BL, UL, DL<br/>**Center:** L |
| **`L`** ($-X$) | **Corners:** UFL, DBL, UBL, DFL<br/>**Edges:** FL, BL, UL, DL<br/>**Center:** L | **Edges:** UB, UF, DF, DB (Slice X)<br/>**Centers:** U, F, D, B | **Corners:** UBR, DFR, UFR, DBR<br/>**Edges:** FR, BR, UR, DR<br/>**Center:** R |

---

## 6. Per-Move Kinematic Sign Table

| Move | Normal Axis $\hat{n}$ | Outer Orbital Sign ($\theta_{\text{outer}}$) | Middle Orbital Sign ($\theta_{\text{middle}}$) | Coupled Slice | Gear Axial Spin ($\Delta \theta_{\text{gear}}$) | Resulting Slice $\Delta p$ |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`U CW`** | $+Y$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | Slice Y | $+60^\circ \cdot p$ | $+1 \pmod 3$ |
| **`U CCW`** | $+Y$ | $+180^\circ \cdot p$ | $+90^\circ \cdot p$ | Slice Y | $-60^\circ \cdot p$ | $+2 \pmod 3$ |
| **`D CW`** | $-Y$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | Slice Y | $-60^\circ \cdot p$ | $+2 \pmod 3$ |
| **`D CCW`** | $-Y$ | $+180^\circ \cdot p$ | $+90^\circ \cdot p$ | Slice Y | $+60^\circ \cdot p$ | $+1 \pmod 3$ |
| **`F CW`** | $+Z$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | Slice Z | $+60^\circ \cdot p$ | $+1 \pmod 3$ |
| **`F CCW`** | $+Z$ | $+180^\circ \cdot p$ | $+90^\circ \cdot p$ | Slice Z | $-60^\circ \cdot p$ | $+2 \pmod 3$ |
| **`B CW`** | $-Z$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | Slice Z | $-60^\circ \cdot p$ | $+2 \pmod 3$ |
| **`B CCW`** | $-Z$ | $+180^\circ \cdot p$ | $+90^\circ \cdot p$ | Slice Z | $+60^\circ \cdot p$ | $+1 \pmod 3$ |
| **`R CW`** | $+X$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | Slice X | $+60^\circ \cdot p$ | $+1 \pmod 3$ |
| **`R CCW`** | $+X$ | $+180^\circ \cdot p$ | $+90^\circ \cdot p$ | Slice X | $-60^\circ \cdot p$ | $+2 \pmod 3$ |
| **`L CW`** | $-X$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | Slice X | $-60^\circ \cdot p$ | $+2 \pmod 3$ |
| **`L CCW`** | $-X$ | $+180^\circ \cdot p$ | $+90^\circ \cdot p$ | Slice X | $+60^\circ \cdot p$ | $+1 \pmod 3$ |

---

## 7. Proposed Subphases & Next Action

- **`PHASE2A_SCOPE_FROZEN: NO`** (Proposed 8 create files and 3 modify files pending independent acceptance of ADR-0006 contract repair).
- **`NORMATIVE_CONTRACT_REPAIR_STATUS: SYNCHRONIZED`** (Pursuant to [`ADR-0006`](../decisions/ADR-0006-VIEW-BASED-KINEMATICS-AND-RENDERER-QUOTIENTS.md)).
- **Synchronized Architecture Documents:**
  1. `docs/decisions/ADR-0006-VIEW-BASED-KINEMATICS-AND-RENDERER-QUOTIENTS.md` (Formal decision record)
  2. `docs/architecture/PUZZLE_CONTRACTS.md` (Updated `KinematicPlanner` to `(fromView, move, toView) => KinematicPlan`)
  3. `docs/architecture/KINEMATIC_CONTRACT.md` (Updated `planKinematics`, physical lifecycle, moving classes, quotients)
  4. `docs/architecture/SYSTEM_ARCHITECTURE.md` (Updated Kinematics data flow diagram)
- **Proposed Phase 2A Candidate Implementation Scope (Pending ADR-0006 Acceptance):**
  - CREATE: `packages/kinematics/package.json`, `packages/kinematics/tsconfig.json`, `packages/kinematics/src/index.ts`, `packages/kinematics/src/types.ts`, `packages/kinematics/src/projection.ts`, `packages/kinematics/src/planner.ts`, `packages/kinematics/tests/projection.test.ts`, `packages/kinematics/tests/planner.test.ts`.
  - MODIFY: `docs/development/ROADMAP.md`, `docs/development/TEST_STRATEGY.md`, `package-lock.json`.