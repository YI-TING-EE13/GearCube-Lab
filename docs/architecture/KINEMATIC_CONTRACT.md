# KINEMATIC_CONTRACT.md — Continuous Physical Kinematics & Animation Specification

> **Document Status:** `DECIDED` (Phase 0B.3 Baseline)
> **Target Model:** Standard / Original Gear Cube (Oskar van Deventer / Meffert's Reference Model)
> **Applicability:** Kinematics Layer (`packages/kinematics`) & 3D Renderer (`packages/renderer`)

---

## 1. Architectural Role & Boundary Axioms

The Kinematics Engine is a purely downstream continuous transformation layer:
1. **Unidirectional Dependency:** Kinematics consumes discrete domain transitions `(fromState, move, toState)` from `packages/core`. The Puzzle Core has **zero dependencies** on kinematics, rendering meshes, or animation timing.
2. **Zero State Ownership:** Kinematic plans, keyframe interpolators, and 3D mesh transforms **never own or store discrete puzzle state**.
3. **Mechanical Progress vs. Clock Time:** Physical gear displacements are parameterized strictly by normalized mechanical progress $p \in [0, 1]$. Easing functions and clock timing belong to the UI/rendering controller.

---

## 2. Global Coordinate Frame & Rotational Conventions

### 2.1. Spatial Axes (Right-Handed)
- **$+X$**: Right (`R`), **$-X$**: Left (`L`)
- **$+Y$**: Up (`U`), **$-Y$**: Down (`D`)
- **$+Z$**: Front (`F`), **$-Z$**: Back (`B`)

### 2.2. Angular Displacements per Legal Face Operation
During a single legal directed face flip from $p = 0.0$ to $p = 1.0$:
- **Outer Face Layer:** Rotates by **$\pm 180^\circ$** around the face normal axis.
- **Perpendicular Middle Layer:** Rotates by **$\pm 90^\circ$** around the same normal axis.
- **Coupled Edge Gear Cogs:** Rotate by **$\pm 60^\circ$** around their local gear rotation axes.

---

## 3. Explicit Kinematic Transformation Matrix

Let $p \in [0, 1]$ be the normalized mechanical progress of the active transition.

### 3.1. Clockwise (`CW`) Motion Signs (Viewed Outside Toward Center)

| Face | Outward Axis | CW Outer Sign ($\theta_{\text{outer}}$) | CW Middle Sign ($\theta_{\text{middle}}$) | CW Gear Sign ($\theta_{\text{gear}}$) | Coupled Middle Slice |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **`U`** | $+Y \, (0, +1, 0)$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | $+60^\circ \cdot p$ | Slice Y ($E$-slice) |
| **`D`** | $-Y \, (0, -1, 0)$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | $+60^\circ \cdot p$ | Slice Y ($E$-slice) |
| **`F`** | $+Z \, (0, 0, +1)$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | $+60^\circ \cdot p$ | Slice Z ($S$-slice) |
| **`B`** | $-Z \, (0, 0, -1)$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | $+60^\circ \cdot p$ | Slice Z ($S$-slice) |
| **`R`** | $+X \, (+1, 0, 0)$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | $+60^\circ \cdot p$ | Slice X ($M$-slice) |
| **`L`** | $-X \, (-1, 0, 0)$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | $+60^\circ \cdot p$ | Slice X ($M$-slice) |

### 3.2. Counter-Clockwise (`CCW`) Inverse Relation
For every counter-clockwise operation (`CCW`), all rotational signs are strictly negated:
- $\theta_{\text{outer}}^{\text{CCW}}(p) = -\theta_{\text{outer}}^{\text{CW}}(p) = +180^\circ \cdot p$
- $\theta_{\text{middle}}^{\text{CCW}}(p) = -\theta_{\text{middle}}^{\text{CW}}(p) = +90^\circ \cdot p$
- $\theta_{\text{gear}}^{\text{CCW}}(p) = -\theta_{\text{gear}}^{\text{CW}}(p) = -60^\circ \cdot p$

*(Note on Provenance: Angular magnitudes ($180^\circ, 90^\circ, 60^\circ$) are `SOURCE_SUPPORTED` [`REF-STORER-01`]. Outer face and middle-slice directional signs ($-180^\circ, -90^\circ$) are `DERIVED / PROJECT_COORDINATE_CONVENTION` based on the right-handed Cartesian frame, where positive rotation follows the right-hand thumb rule along the outward face normal, and are verified against 3D slot rotation. Exact local gear spin signed direction ($\pm 60^\circ$) is classified as `OPEN / PHASE_2_KINEMATICS_DERIVATION` and will be mechanically aligned with 3D gear mesh geometry during Phase 2).*

---

## 4. Conceptual Kinematic Types

```typescript
/** Stable physical component identifier */
export type ComponentId = string; // e.g., 'corner-UFL', 'edge-UF', 'center-U'

/** Continuous 3D spatial transformation for a component */
export interface ComponentTransform {
  readonly componentId: ComponentId;
  readonly position: [number, number, number];
  readonly rotationEuler: [number, number, number];
  readonly rotationQuaternion: [number, number, number, number];
}

/** Complete kinematic trajectory for a single legal move */
export interface KinematicPlan {
  readonly move: Move;
  readonly durationMs: number; // Suggested visual duration, e.g. 400ms
  /** Computes component transforms at normalized mechanical progress p in [0, 1] */
  evaluate(p: number): readonly ComponentTransform[];
}

/** Active transition lifecycle managed by the application controller */
export interface ActiveTransition {
  readonly fromState: GearCubeState;
  readonly toState: GearCubeState;
  readonly move: Move;
  readonly plan: KinematicPlan;
  readonly progress: number; // 0.0 to 1.0
}
```

---

## 5. Active Transition Lifecycle & Commit Semantics

```text
[ User Action / Solver Step ]
             |
             v
 1. Core: toState = applyMove(fromState, move)
             |
             v
 2. Kinematics: plan = planKinematics(fromState, move, toState)
             |
             v
 3. Controller: activeTransition = { fromState, toState, move, plan, progress: 0.0 }
             |
             +---> [ Animation Loop: progress = ease(elapsed / duration) ]
             |         |
             |         v
             |     Renderer draws plan.evaluate(progress)
             |
             v (progress reaches 1.0)
 4. Controller: commitState(toState), clearActiveTransition()
```

### Critical Invariants:
1. **Discrete State Commit:** The new state `toState` is committed as the source of truth **only when progress reaches 1.0**.
2. **No Reverse-Reading:** The application controller **never reads mesh rotations or matrix transforms** to determine discrete puzzle state.
3. **Intermediate Poses:** Any intermediate pose ($p \in (0, 1)$) is purely visual. If animation is cancelled or interrupted, the system snaps cleanly to `fromState` or `toState`.

---

## 6. Visual Skin & Mesh Decoupling

- **Visual Assets:** Materials, PBR textures, gear tooth bevels, and stickers are defined in `VisualSkin`.
- **Decoupled Kinematics:** The kinematic trajectory calculates rigid-body transforms for abstract component anchor nodes.
- **Custom Hardware Profiles:** Alternative physical models (e.g. Daiso OEM skin or custom 3D printed meshes) attach to the exact same kinematic transform hierarchy without altering domain logic.
