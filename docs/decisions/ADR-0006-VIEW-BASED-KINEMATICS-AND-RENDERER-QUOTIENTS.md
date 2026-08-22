# ADR-0006: View-Based Kinematics Contract & Renderer Axial Quotients

> **Status:** `Accepted`
> **Date:** 2026-08-22
> **Context:** Phase 2 (3D Graphics & Kinematic Animation Engine)
> **Decision Owners:** Architecture & Governance Team
> **Supersedes:** Conceptual state-based `KinematicPlanner` signature and timing fields in `PUZZLE_CONTRACTS.md` and `KINEMATIC_CONTRACT.md`

---

## 1. Context & Background

In Phase 1, the Pure TypeScript Domain Core (`@gearcube/core`) was completed and verified. In Phase 1D, [`ADR-0004`](ADR-0004-CENTER-ORIENTATION-SEMANTICS.md) established the 4-state `SpatialFrame` orientation lifecycle ($f \in \{0, 1, 2, 3\}$), quotiented center placement semantics (`CenterPlacement` with `{ slot, pieceId }`), and derived `PiecePlacementView` materialization (`materializeState(state, frame)`). Gate 6 in `materializer.test.ts` proved across $1,990,656$ transitions that:
$$\text{materializeState}(\text{applyMove}(S, M), \text{nextSpatialFrame}(f, M.\text{face})) \equiv \text{simPhysical}(\text{materializeState}(S, f), M)$$

During Phase 2 architecture characterization, two critical questions were evaluated before implementing `packages/kinematics`:
1. Whether the historical 3-argument state-based planner `KinematicPlanner = (fromState, move, toState) => KinematicPlan` can produce fixed-spatial physical trajectories across all 4 `SpatialFrame` states via a downstream adapter.
2. How the abstract $\mathbb{Z}_3$ `SliceGearPhase` must be embedded into continuous 3D renderer orientation so that continuous $\pm 60^\circ$ gear spins and snap-to-core endpoint canonicalization are mathematically compatible.

---

## 2. SpatialFrame Characterization & Information Insufficiency Analysis

### 2.1. Equivariance Failure of State-Based Planner (`CASE B`)
A state-based planner `planKinematics(fromState, move, toState)` receives only canonical discrete states and a move $M$. It plans trajectories in the canonical coordinate basis (`SpatialFrame = 3`).

When evaluated across all $4 \text{ SpatialFrames} \times 12 \text{ directed moves} = 48 \text{ cases}$:
- In Frame 3 (Identity), physical and canonical faces coincide ($12/12$ match).
- In Frame 2 ($R_y(\pi)$), physical Front ($+Z$) is canonical Back ($-Z$) (`FRAME_CENTER_SLOT_PERMS[2]['F'] = 'B'`). Applying a global frame rotation $R_y(\pi)$ to a canonical `F` trajectory rotates the canonical $+Z$ pieces around $+Z$, which maps to physical $-Z$, visually rotating the physical Back face (`B`) when the user executed physical Front (`F`).
- Similar face inversions occur in Frame 1 ($R_z(\pi)$) and Frame 0 ($R_x(\pi)$).
- **Result:** Simple canonical trajectory + rigid frame projection yields **$24 / 48$ moving-set mismatches (50% failure rate)**.

### 2.2. Information Insufficiency Proof
The canonical state transition $(S, M, S')$ is frame-independent, but continuous physical motion in 3D world space is not. The triple $(S, M, S')$ does not contain enough information to determine which physical components occupy the turning outer face and coupled middle layer in 3D world coordinates.

---

## 3. Evaluated Alternatives

1. **Alternative A: State-Based Planner + Downstream Rigid Frame Adapter**
   - *Status:* **`REJECTED`**
   - *Reason:* Fails on 24 of 48 frame-move pairs due to $\pi$-rotation face swapping in non-trivial frames.
2. **Alternative B1: State + Frame-Aware Planner `(fromState, fromFrame, move, toState, toFrame) => KinematicPlan`**
   - *Status:* **`REJECTED / NOT PREFERRED`**
   - *Reason:* Unnecessarily couples `packages/kinematics` to the internal `SpatialFrame` transposition tables and state decoding logic of Core.
3. **Alternative B2: View-Based Kinematic Planner `(fromView, move, toView) => KinematicPlan`**
   - *Status:* **`ACCEPTED`**
   - *Reason:* Consumes already-authoritative fixed-spatial physical piece placements (`PiecePlacementView`). Clean, direct, frame-agnostic, and perfectly aligned with Phase 3 raycasting interaction.

---

## 4. Decision: Adopt View-Based KinematicPlanner & Purified KinematicPlan

We formally adopt the view-based signature for `KinematicPlanner` and purify `KinematicPlan` by removing presentation timing fields:

```typescript
import type {
  Move,
  CornerPieceId,
  EdgePieceId,
  CenterPieceId,
  PiecePlacementView,
} from '@gearcube/core';

/** Stable 3D piece identifier matching Core PieceId vocabularies */
export type ComponentId = CornerPieceId | EdgePieceId | CenterPieceId;

/** Renderer-neutral rigid-body 3D transform */
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

### 4.1. Timing & Clock Ownership
- **`KINEMATICS_INPUT_TIME: NONE`**
- **`KINEMATICS_PROGRESS_INPUT: NORMALIZED_MECHANICAL_PROGRESS_0_TO_1`**
- **`ANIMATION_DURATION_OWNER: apps/web`**
- **`EASING_OWNER: apps/web`**
- **`CLOCK_OWNER: apps/web`**
- `packages/kinematics` has **zero knowledge of milliseconds, duration, or clock time**.

### 4.2. Application Lifecycle:
```text
currentState: GearCubeState
currentFrame: SpatialFrame
move: Move

1. fromView = materializeState(currentState, currentFrame)
2. nextState = applyMove(currentState, move)
3. nextFrame = nextSpatialFrame(currentFrame, move.face)
4. toView = materializeState(nextState, nextFrame)
5. plan = planKinematics(fromView, move, toView)
6. Animation loop (apps/web): progress = ease(elapsedMs / durationMs)
   Renderer draws: plan.evaluate(progress)
7. At progress = 1.0:
   commit: currentState = nextState, currentFrame = nextFrame
   Renderer endpoint: snap to fresh downstream projection of toView
```

- **`CORE_LOGICAL_STATE_AUTHORITY: YES`** (The planner does not derive or mutate logical state; it animates authoritative physical views).
- **`INTERMEDIATE_GEARCUBE_STATE_CREATED: NO`**.

---

## 5. Decision: Edge Gear Renderer Axial Quotient & $C_2$ Placeholder Policy

### 5.1. The Phase Wrap Problem in $SO(3)$
Canonical angular representatives for `SliceGearPhase` $\in \mathbb{Z}_3$:
- $\text{Phase } 0 \to 0^\circ$
- $\text{Phase } 1 \to +60^\circ$
- $\text{Phase } 2 \to +120^\circ$

On wrap transitions ($0 \xrightarrow{-60^\circ} 2$, $2 \xrightarrow{+60^\circ} 0$):
- Continuous rotation ends at $-60^\circ$ (or $+180^\circ$).
- Canonical representative is $+120^\circ$ (or $0^\circ$).
- Angular difference: $+120^\circ - (-60^\circ) = +180^\circ$ (or $0^\circ - 180^\circ = -180^\circ$).

In ordinary $SO(3)$ geometry, $+180^\circ \not\equiv 0^\circ \pmod{360^\circ}$.

### 5.2. Formal Decisions:
1. **`EDGE_GEAR_RENDERER_AXIAL_QUOTIENT: ANGLE_MOD_180`**
2. **`EDGE_ENDPOINT_AXIAL_EQUALITY: MOD_180_DEGREES`**
3. **`MVP_GEAR_GEOMETRY_POLICY: INTENTIONALLY_C2_AXIAL_SYMMETRIC_PLACEHOLDER`**
4. **`RENDERER_C2_SYMMETRY: PROJECT_DESIGN_CHOICE`**
5. **`PHYSICAL_GEAR_MESH_C2_SYMMETRY_PROVEN: NO`**

**Critical Governance Note:**
This is **NOT** a claim that the physical Standard Gear Cube hardware has proven $C_2$ axial mesh symmetry. It is a formal **renderer presentation design decision** adopted so that the MVP visual geometry is compatible with the discrete Core $\mathbb{Z}_3$ phase abstraction. A $180^\circ$ spindle rotation is visually equivalent; a $60^\circ$ or $120^\circ$ rotation remains visually distinguishable. The mesh must **never** be described as "60-degree periodic".

---

## 6. Center Orientation Quotient Compatibility

This ADR preserves [`ADR-0004`](ADR-0004-CENTER-ORIENTATION-SEMANTICS.md) in full:
- **`CENTER_AXIAL_ENDPOINT_AUTHORITY: NOT_IN_CORE`**
- **`CENTER_AXIAL_HISTORY_PERSISTED: NO`**
- **`CENTER_VISUAL_GEOMETRY: ROTATIONALLY_SYMMETRIC_UNMARKED`**
- Center position and piece identity are authoritatively derived from Core; axial orientation angles are canonicalized by the renderer.

---

## 7. Component Endpoint Equality & Transform Semantics

| Component Category | Identity Model | Position Equality | Orientation Authority & Equality |
| :--- | :--- | :--- | :--- |
| **Corners (8)** | `CornerPieceId` | Canonical target projection | `QUATERNION_ONLY` modulo $q \equiv -q$ |
| **Edge Gears (12)** | `EdgePieceId` | Canonical target projection | `QUATERNION_ONLY`<br/>Non-axial: exact target projection<br/>Axial spin: $\text{angle} \pmod{180^\circ}$ |
| **Centers (6)** | `CenterPieceId` | Canonical target projection | `QUATERNION_ONLY`<br/>Normal axis matches face slot; axial angle canonicalized |

- **`COMPONENT_TRANSFORM_IDENTITY_SOURCE: CORE_PIECE_IDENTITY`** (`CornerPieceId | EdgePieceId | CenterPieceId` are globally disjoint).
- **`SLOT_USED_AS_COMPONENT_IDENTITY: NO`**.
- **`ORIENTATION_AUTHORITY: QUATERNION_ONLY`** (Euler angles removed from normative contract).

---

## 8. Package Dependency Hierarchy

```text
apps/web (React 19 + Three.js / R3F Viewport)
    ↓
packages/kinematics (Pure TypeScript Trajectory Math)
    ↓
@gearcube/core (Pure TypeScript Domain Core)
```

- `packages/kinematics` depends **only** on `@gearcube/core`.
- `packages/kinematics` has **zero dependencies** on `three`, `react`, `@react-three/fiber`, or `DOM`.
- `@gearcube/core` maintains **zero dependencies** on kinematics, renderer, React, or Three.

---

## 9. Forward Supersession & Compatibility Impact

### 9.1. Forward-Superseded Conceptual Contracts:
1. **`KinematicPlanner` input signature:**
   $$\text{Superseded: } (fromState: GearCubeState, move: Move, toState: GearCubeState) \to KinematicPlan$$
   $$\text{Adopted: } (fromView: PiecePlacementView, move: Move, toView: PiecePlacementView) \to KinematicPlan$$
2. **`KinematicPlan` timing fields:**
   $$\text{Superseded: } \text{durationMs}: number \text{ in KinematicPlan}$$
   $$\text{Adopted: } \text{Pure evaluation function } evaluate(p: number): readonly ComponentTransform[]$$
3. **`ComponentTransform` orientation authority:**
   $$\text{Superseded: } rotationEuler?: [number, number, number]$$
   $$\text{Adopted: } rotationQuaternion: readonly [number, number, number, number] \text{ as sole orientation authority}$$

### 9.2. Compatibility Analysis:
- **`RUNTIME_COMPATIBILITY_IMPACT: NONE`** (The superseded conceptual contracts exist only in documentation and have not been implemented in production code).
- **`DOCUMENTATION_CONTRACT_IMPACT: YES`** (Synchronized across all normative architecture documents).
- **`PHASE2A_IMPLEMENTATION_IMPACT: YES`** (`packages/kinematics` will implement the view-based, duration-free, quaternion-only contract).
- **`CORE_API_IMPACT: NONE`** (`@gearcube/core` is 100% unaffected; `PiecePlacementView` was already exported).