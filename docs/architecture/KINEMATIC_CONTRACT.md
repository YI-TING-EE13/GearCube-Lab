# KINEMATIC_CONTRACT.md — Continuous Physical Kinematics & Animation Specification

> **Document Status:** `DECIDED` (Updated pursuant to accepted [`ADR-0006`](../decisions/ADR-0006-VIEW-BASED-KINEMATICS-AND-RENDERER-QUOTIENTS.md))
> **Target Model:** Standard / Original Gear Cube (Oskar van Deventer / Meffert's Reference Model)
> **Applicability:** Kinematics Package (`packages/kinematics`) & 3D Renderer (`apps/web`)

---

## 1. Architectural Role & Boundary Axioms

The Kinematics Engine is a purely downstream continuous transformation layer:
1. **Unidirectional Dependency:** Kinematics consumes physical piece placement views `(fromView, move, toView)` derived from `@gearcube/core` via `materializeState(state, frame)`. The Puzzle Core has **zero dependencies** on kinematics, rendering meshes, or animation timing.
2. **Zero State Ownership:** Kinematic plans, keyframe interpolators, and 3D mesh transforms **never own, mutate, or store discrete puzzle state**.
3. **Mechanical Progress vs. Clock Time:** Physical gear displacements are parameterized strictly by normalized mechanical progress $p \in [0, 1]$. Easing functions and clock timing belong entirely to the application/rendering controller in `apps/web`.
4. **Physical Moving-Piece Partition:** For every physical face move, all 26 pieces in `PiecePlacementView` are partitioned into 3 mutually exclusive motion classes:
   - **Active Outer Layer (9 pieces):** 4 corners + 4 outer edge gears + selected outer center ($\pm 180^\circ \cdot p$).
   - **Coupled Middle Layer (8 pieces):** 4 middle-slice edge gears ($\pm 90^\circ \cdot p$ orbital rotation + $\pm 60^\circ \cdot p$ local axial spin) + 4 adjacent centers ($\pm 90^\circ \cdot p$ orbital rotation).
   - **Opposite Outer Layer (9 pieces):** 4 corners + 4 edge gears + opposite center ($0^\circ$, Fixed).

---

## 2. Global Coordinate Frame & Rotational Conventions

### 2.1. Spatial Axes (Right-Handed)
- **$+X$**: Right (`R`), **$-X$**: Left (`L`)
- **$+Y$**: Up (`U`), **$-Y$**: Down (`D`)
- **$+Z$**: Front (`F`), **$-Z$**: Back (`B`)

### 2.2. Angular Displacements per Legal Face Operation
During a single legal directed face flip from $p = 0.0$ to $p = 1.0$:
- **Outer Face Layer & Selected Outer Center:** Rotates by **$\pm 180^\circ$** around the selected face outward normal axis.
- **Perpendicular Middle Layer & Four Adjacent Centers:** Rotates by **$\pm 90^\circ$** around the same normal axis, moving center piece identities across face slots.
- **Opposite Outer Face Center:** Remains completely fixed (**$0^\circ$** rotation).
- **Coupled Edge Gear Cogs:** Rotate by **$\pm 60^\circ$** around their local gear radial rotation axes.
- **Endpoint State Quotients:**
  - **Centers ([`ADR-0004`](../decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md)):** Center axial orientation angles are unobservable on standard unmarked caps and quotiented out of Core state.
  - **Edge Gears ([`ADR-0006`](../decisions/ADR-0006-VIEW-BASED-KINEMATICS-AND-RENDERER-QUOTIENTS.md)):** Edge gear axial orientation is evaluated modulo $180^\circ$ under the renderer's intentional $C_2$ symmetry design choice.

---

## 3. Explicit Kinematic Transformation Matrix

Let $p \in [0, 1]$ be the normalized mechanical progress of the active transition.

### 3.1. Per-Move Kinematic Sign & Phase Delta Table:

| Face | Outward Normal Axis $\hat{n}$ | Outer Orbital Sign ($\theta_{\text{outer}}$) | Middle Orbital Sign ($\theta_{\text{middle}}$) | Coupled Middle Slice | Local Gear Axial Spin ($\Delta \theta_{\text{gear}}$) | Resulting Slice $\Delta p$ |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`U CW`** | $+Y \, (0, +1, 0)$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | Slice Y ($E$-slice) | $+60^\circ \cdot p$ | $+1 \pmod 3$ |
| **`U CCW`** | $+Y \, (0, +1, 0)$ | $+180^\circ \cdot p$ | $+90^\circ \cdot p$ | Slice Y ($E$-slice) | $-60^\circ \cdot p$ | $+2 \pmod 3$ |
| **`D CW`** | $-Y \, (0, -1, 0)$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | Slice Y ($E$-slice) | $-60^\circ \cdot p$ | $+2 \pmod 3$ |
| **`D CCW`** | $-Y \, (0, -1, 0)$ | $+180^\circ \cdot p$ | $+90^\circ \cdot p$ | Slice Y ($E$-slice) | $+60^\circ \cdot p$ | $+1 \pmod 3$ |
| **`F CW`** | $+Z \, (0, 0, +1)$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | Slice Z ($S$-slice) | $+60^\circ \cdot p$ | $+1 \pmod 3$ |
| **`F CCW`** | $+Z \, (0, 0, +1)$ | $+180^\circ \cdot p$ | $+90^\circ \cdot p$ | Slice Z ($S$-slice) | $-60^\circ \cdot p$ | $+2 \pmod 3$ |
| **`B CW`** | $-Z \, (0, 0, -1)$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | Slice Z ($S$-slice) | $-60^\circ \cdot p$ | $+2 \pmod 3$ |
| **`B CCW`** | $-Z \, (0, 0, -1)$ | $+180^\circ \cdot p$ | $+90^\circ \cdot p$ | Slice Z ($S$-slice) | $+60^\circ \cdot p$ | $+1 \pmod 3$ |
| **`R CW`** | $+X \, (+1, 0, 0)$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | Slice X ($M$-slice) | $+60^\circ \cdot p$ | $+1 \pmod 3$ |
| **`R CCW`** | $+X \, (+1, 0, 0)$ | $+180^\circ \cdot p$ | $+90^\circ \cdot p$ | Slice X ($M$-slice) | $-60^\circ \cdot p$ | $+2 \pmod 3$ |
| **`L CW`** | $-X \, (-1, 0, 0)$ | $-180^\circ \cdot p$ | $-90^\circ \cdot p$ | Slice X ($M$-slice) | $-60^\circ \cdot p$ | $+2 \pmod 3$ |
| **`L CCW`** | $-X \, (-1, 0, 0)$ | $+180^\circ \cdot p$ | $+90^\circ \cdot p$ | Slice X ($M$-slice) | $+60^\circ \cdot p$ | $+1 \pmod 3$ |

---

## 4. Conceptual Kinematic Types (Pursuant to ADR-0006)

```typescript
/** Stable physical component identifier matching Core PieceId */
export type ComponentId = CornerPieceId | EdgePieceId | CenterPieceId;

/** Continuous 3D spatial transformation for a component (Quaternion sole orientation authority) */
export interface ComponentTransform {
  readonly componentId: ComponentId;
  readonly position: readonly [number, number, number];
  readonly rotationQuaternion: readonly [number, number, number, number]; // [x, y, z, w]
}

/** Complete kinematic trajectory for a single legal move (duration-free pure evaluation) */
export interface KinematicPlan {
  readonly move: Move;
  /** Computes component transforms at normalized mechanical progress p in [0, 1] */
  evaluate(p: number): readonly ComponentTransform[];
}

/** Downstream view-based kinematic trajectory generator */
export type KinematicPlanner = (
  fromView: PiecePlacementView,
  move: Move,
  toView: PiecePlacementView
) => KinematicPlan;

/** Active transition lifecycle managed by the application controller */
export interface ActiveTransition {
  readonly fromView: PiecePlacementView;
  readonly toView: PiecePlacementView;
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
 1. Core: fromView = materializeState(currentState, currentFrame)
          nextState = applyMove(currentState, move)
          nextFrame = nextSpatialFrame(currentFrame, move.face)
          toView = materializeState(nextState, nextFrame)
             |
             v
 2. Kinematics: plan = planKinematics(fromView, move, toView)
             |
             v
 3. Controller: activeTransition = { fromView, toView, move, plan, progress: 0.0 }
             |
             +---> [ Animation Loop (apps/web): progress = ease(elapsed / duration) ]
             |         |
             |         v
             |     Renderer draws plan.evaluate(progress)
             |
             v (progress reaches 1.0)
 4. Controller: commitState(nextState, nextFrame)
    Renderer: snaps piece transforms to fresh downstream projection of toView
```

### Critical Invariants:
1. **Discrete State Commit:** The new state `nextState` and `nextFrame` are committed as the source of truth **only when progress reaches 1.0**.
2. **No Reverse-Reading:** The application controller **never reads mesh rotations or matrix transforms** to determine discrete puzzle state.
3. **Zero Accumulated Drift:** At $p = 1.0$, interpolated floating-point transforms are discarded and all 26 pieces snap to the fresh projection derived from `toView`.
4. **Intermediate Poses:** Any intermediate pose ($p \in (0, 1)$) is purely visual. If animation is cancelled or interrupted, the system snaps cleanly to `fromView` or `toView`.

---

## 6. Visual Skin, Quotients & Mesh Decoupling

- **Visual Assets:** Materials, PBR textures, gear tooth bevels, and stickers are defined in `VisualSkin`.
- **Edge Axial Quotient ([`ADR-0006`](../decisions/ADR-0006-VIEW-BASED-KINEMATICS-AND-RENDERER-QUOTIENTS.md)):** Edge gear axial orientation is evaluated modulo $180^\circ$. MVP placeholder gear geometry adopts an intentional $C_2$ axial symmetry (`PROJECT_DESIGN_CHOICE`; not a proven physical hardware property) ensuring visual continuity across $\mathbb{Z}_3$ phase wraps.
- **Center Axial Quotient ([`ADR-0004`](../decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md)):** Centers are rotationally symmetric unmarked caps whose position and identity are derived from Core.