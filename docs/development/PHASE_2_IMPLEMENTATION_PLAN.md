# PHASE_2_IMPLEMENTATION_PLAN.md — Phase 2 3D Graphics & Kinematic Animation Plan

> **Document Status:** `PHASE_2B_CANONICAL_PLAN_READY_FOR_ACCEPTANCE`
> **Phase Target:** Phase 2 — 3D Model, Visual Assets, and Kinematic Animation Engine
> **Phase 2A Status:** `COMPLETED & ACCEPTED` (Commit `de0aa15ee3ab050ccb943b9b0efd9e98fdf03a85`)
> **Phase 2B Status:** `PLANNED / CANONICAL SPECIFICATION FROZEN`
> **Applicability:** Web Application (`apps/web`), Kinematics Package (`packages/kinematics`), & 3D Rendering Layer

---

## 1. Executive Summary & Architecture Hierarchy

Phase 2 establishes the visual and continuous kinematic simulation layer of GearCube Lab.
- **Phase 2A (`COMPLETED & ACCEPTED`):** Pure mathematical kinematic engine and static projection in `@gearcube/kinematics`, operating purely on `PiecePlacementView` without framework dependencies.
- **Phase 2B (`CURRENT FROZEN TARGET`):** Static 3D Graphics, procedural mesh geometries, and React Three Fiber scene scaffolding in `apps/web`.
- **Phase 2C (`FUTURE TARGET`):** Continuous animation binding, time easing, and interactive face turn triggers.

### Architectural Authority Flow:
```
┌─────────────────────────────────────────────────────────────┐
│ @gearcube/core (SOLE DOMAIN LOGICAL TRUTH)                 │
│ GearCubeState + SpatialFrame                                │
└──────────────────────────────┬──────────────────────────────┘
                               │ materializeState(state, frame)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PiecePlacementView (PHYSICAL PIECE PLACEMENT VIEW)         │
│ 8 CornerPlacements, 12 EdgePlacements, 6 CenterPlacements   │
└──────────────────────────────┬──────────────────────────────┘
                               │ placementToTransforms(view)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ @gearcube/kinematics (PURE 3D TRANSFORMATION PROJECTION)    │
│ 26 ComponentTransforms (Position + Unit Quaternion)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ props: { transforms }
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ apps/web (REACT THREE FIBER VIEWPORT & VISUAL SCENE GRAPH)  │
│ 26 Persistent Top-Level Piece Groups (<group key={id}>)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Phase 2B Objective & Static Render Pipeline

The primary objective of Phase 2B is to render a visually coherent, interactive static 3D Gear Cube in `apps/web` derived exclusively from the authoritative Core + Kinematics pipeline:

```typescript
import { SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME, materializeState } from '@gearcube/core';
import { placementToTransforms } from '@gearcube/kinematics';

const state = SOLVED_GEAR_CUBE_STATE;
const frame = DEFAULT_SPATIAL_FRAME;
const view = materializeState(state, frame);
const transforms = placementToTransforms(view); // exactly 26 ComponentTransforms in STABLE_COMPONENT_ID_ORDER
```

### Hard Architecture Boundaries:
- **`CORE_STATE_AUTHORITY`:** `packages/core`
- **`PHYSICAL_VIEW_AUTHORITY`:** `materializeState`
- **`SPATIAL_TRANSFORM_AUTHORITY`:** `@gearcube/kinematics`
- **`RENDERER_LOGICAL_STATE_AUTHORITY`:** `NONE` (The renderer never derives state from meshes, never mutates state, and never performs logical puzzle transitions).
- **`HARDCODED_RENDERER_PIECE_TRANSFORMS`:** `NO`

---

## 3. apps/web Dependency Architecture & Version Policy

### 3.1. Renderer Package Location Decision
- **`PHASE2B_RENDERER_LOCATION`:** `apps/web`
- **Rationale:** Phase 2B renders the 3D scene directly in the React web application. `packages/kinematics` already provides the pure framework-neutral mathematical projection layer. Scaffolding visual components under `apps/web/src/components/cube/` avoids premature package fragmentation while keeping Domain Core and Kinematics 100% dependency-free.

### 3.2. Frozen Current Stable Dependencies in `apps/web/package.json`
- **`PHASE2B_DEPENDENCY_VERSION_POLICY`:** `EXACT_CURRENT_STABLE_PINS`
- **Dependencies:**
  - `"@gearcube/core"`: `"0.0.0"` (Existing workspace dependency)
  - `"@gearcube/kinematics"`: `"0.0.0"` (New workspace dependency)
  - `"react"`: `"19.2.8"` (Existing)
  - `"react-dom"`: `"19.2.8"` (Existing)
  - `"three"`: `"0.185.1"` (Current npm stable)
  - `"@react-three/fiber"`: `"9.7.0"` (Current npm stable; peerDependencies: React/ReactDOM `>=19 <19.3`, Three `>=0.156`)
  - `"@react-three/drei"`: `"10.7.8"` (Current npm stable)
- **DevDependencies:**
  - `"@types/three"`: `"0.185.4"` (Current npm stable)
  - `"@types/react"`: `"19.2.18"` (Existing)
  - `"@types/react-dom"`: `"19.2.4"` (Existing)
  - `"@vitejs/plugin-react"`: `"6.1.0"` (Existing)
  - `"vite"`: `"8.2.2"` (Existing)
- **Compatibility:**
  - **`R3F_REACT_19_2_COMPATIBLE`:** `YES`
  - **`R3F_THREE_0_185_1_COMPATIBLE`:** `YES`

### 3.3. Drei Rationale
- **`DREI_REQUIRED_FOR_PHASE2B`:** `YES`
- **Rationale:** Drei is intentionally accepted to use the battle-tested, declarative `<OrbitControls />` integration which binds seamlessly to R3F's invalidation and camera loop without requiring custom event listener and lifecycle glue. Native R3F elements remain responsible for `<ambientLight />` and `<directionalLight />`.

---

## 4. Scene Graph, Identity, and Transform Contracts

### 4.1. Scene Node Hierarchy & Identity
- **`TOP_LEVEL_PIECE_NODE_COUNT`:** 26
- **`PERSISTENT_COMPONENT_ID_NODE_COUNT`:** 26
- **`SUBMESH_COUNT`:** `UNSPECIFIED_BOUNDED_BY_GEOMETRY` (Body, gear teeth, and sticker submeshes contained within each top-level group).
- **`SCENE_OBJECT_IDENTITY`:** `COMPONENT_ID` (`CornerPieceId | EdgePieceId | CenterPieceId`).
- **`REACT_KEY_SOURCE`:** `COMPONENT_ID` (`transform.componentId`).
- **`SLOT_USED_AS_SCENE_IDENTITY`:** `NO` (Meshes are keyed by piece identity, never by temporary slot name).
- **`TRANSFORM_APPLIED_AT`:** `TOP_LEVEL_PIECE_GROUP`

### 4.2. Declarative Quaternion Binding (Zero Object Allocation Per Render)
- **`RENDERER_ORIENTATION_AUTHORITY`:** `ComponentTransform.rotationQuaternion`
- **`EULER_AS_AUTHORITY`:** `NO`
- **`R3F_QUATERNION_BINDING`:** `DECLARATIVE_XYZW_TUPLE`
- **`R3F_QUATERNION_OBJECT_ALLOCATION_PER_RENDER`:** `NO` (R3F's `MathType<THREE.Quaternion>` accepts parameter tuples directly without creating `new THREE.Quaternion(...)` per render/frame):
  ```tsx
  <group
    key={transform.componentId}
    position={transform.position}
    quaternion={transform.rotationQuaternion}
  >
    {/* Piece-local body, gear teeth, and sticker submeshes */}
  </group>
  ```
- **`KINEMATICS_TYPE_CHANGE_REQUIRED`:** `NO`
- **`RENDERER_MAGIC_ROTATION`:** `NO` (The renderer directly applies `transform.rotationQuaternion` without adding slot-specific rotation hacks).
- **`COMPONENT_TRANSFORM_QUATERNION_APPLIED_DIRECTLY`:** `YES`

---

## 5. Category-Specific Local Mesh Frame Conventions

### 5.1. Corner Pieces (`CornerPieceId`)
- **`CORNER_LOCAL_GEOMETRY_ORIGIN`:** Piece center at `[0, 0, 0]`
- **`CORNER_HOME_ORIENTATION`:** Physical piece home orientation
- **`CORNER_HOME_TRANSFORM_QUATERNION`:** `IDENTITY` (`[0, 0, 0, 1]`)
- **Sticker Local Normals:** Derived from physical `CornerPieceId` letters:
  - `corner-UFR` has physical stickers U (`+Y`), F (`+Z`), R (`+X`).
  - `corner-UBL` has physical stickers U (`+Y`), B (`-Z`), L (`-X`).
  - Equivalent mappings apply for all 8 `CornerPieceIds`.

### 5.2. Edge Gear Pieces (`EdgePieceId`)
- **`EDGE_LOCAL_GEOMETRY_ORIGIN`:** Piece center at `[0, 0, 0]`
- **`EDGE_HOME_ORIENTATION`:** Phase-zero physical home orientation
- **`EDGE_HOME_TRANSFORM_QUATERNION`:** `IDENTITY` (`[0, 0, 0, 1]`)
- **`EDGE_HOME_SPINDLE_AXIS`:** `normalize(homeSlotPosition(pieceId))`
  - Example: `edge-UF` radial spindle axis is $\frac{(0, 1, 1)}{\sqrt{2}}$.
  - The $C_2$-symmetric gear geometry is aligned along that local radial spindle axis.
- **Sticker Local Normals:** Derived from physical `EdgePieceId` letters (`edge-UF` has U along `+Y` and F along `+Z`).
- **`MVP_GEAR_GEOMETRY_POLICY`:** `INTENTIONALLY_C2_AXIAL_SYMMETRIC_PLACEHOLDER`
- **`PHYSICAL_GEAR_C2_PROVEN`:** `NO`

### 5.3. Center Pieces (`CenterPieceId`)
- **`CENTER_LOCAL_GEOMETRY_ORIGIN`:** Piece center at `[0, 0, 0]`
- **`CENTER_LOCAL_OUTWARD_AXIS`:** `+Y` (`[0, 1, 0]`)
- **`CENTER_LOCAL_AXIAL_SYMMETRY_AXIS`:** `+Y`
- **`CENTER_HOME_TRANSFORM_QUATERNION`:** `NOT_GLOBALLY_IDENTITY`
  - Because all center meshes are modeled with their outward face plate facing `+Y`, the Kinematics canonical table provides the quaternion mapping `+Y` to the outward face normal ($\hat{n}$).
- **`CENTER_GEOMETRY_AXIAL_SYMMETRY`:** `YES`
- **`CENTER_VISUAL_ORIENTATION_HISTORY`:** `NONE`

---

## 6. Physical Sticker Identity & Semantic Color Map

- **`STICKER_FACE_IDENTITY_SOURCE`:** `COMPONENT_ID`
- **`STICKER_LOCAL_NORMAL_SOURCE`:** `PHYSICAL_HOME_FACE_IDENTITY`
- **`CURRENT_SLOT_USED_FOR_STICKER_ORIENTATION`:** `NO`
- **`SLOT_BASED_RECOLORING`:** `NO`
- **Standard Face Color Palette:**
  - **`U` (Up):** `#FFFFFF` (Pure White)
  - **`D` (Down):** `#FFD500` (Canary Yellow)
  - **`F` (Front):** `#009B48` (Emerald Green)
  - **`B` (Back):** `#0046AD` (Cobalt Blue)
  - **`R` (Right):** `#B71234` (Ruby Red)
  - **`L` (Left):** `#FF5800` (Bright Orange)
  - **Internal Base Body:** `#1A1A1A` (Matte Dark Charcoal)

---

## 7. Viewport, Camera, and Styling Specification

### 7.1. Camera & Lighting
- **`CAMERA_MODEL`:** `PerspectiveCamera` (FOV 45°, near 0.1, far 100).
- **`CAMERA_INITIAL_POSITION`:** `[3.5, 3.0, 4.5]` looking at `[0, 0, 0]`.
- **`CONTROLS`:** `OrbitControls` (enabled rotation, damping factor 0.05, minDistance 2.5, maxDistance 10.0).
- **`LIGHTING`:**
  - AmbientLight: intensity 0.7 (`#FFFFFF`).
  - Key DirectionalLight: position `[5, 8, 5]`, intensity 1.2.
  - Fill DirectionalLight: position `[-5, -4, -5]`, intensity 0.4.

### 7.2. Global CSS & Viewport Sizing
- **`WEB_GLOBAL_STYLE_FILES`:** `apps/web/src/App.css` (present), `apps/web/src/index.css` (`NOT_PRESENT`).
- **`PHASE2B_CSS_CHANGE_REQUIRED`:** `YES` (`apps/web/src/App.css` will be updated to establish full viewport height `100vw`, `100vh`, `margin: 0`, `overflow: hidden` without canvas clipping or scrollbars).

---

## 8. Component Topology in apps/web

```
apps/web/src/
├── main.tsx
├── App.tsx
├── App.css
└── components/
    ├── canvas/
    │   └── GearCubeViewport.tsx   (R3F Canvas, Camera, OrbitControls, Native Lights)
    └── cube/
        ├── GearCubeModel.tsx      (Renders 26 top-level piece groups in STABLE_COMPONENT_ID_ORDER)
        ├── CornerPiece.tsx        (Visual corner mesh with 3 face stickers)
        ├── EdgePiece.tsx          (Visual C2 gear mesh with 2 face stickers)
        ├── CenterPiece.tsx        (Visual rotationally symmetric center cap)
        ├── materials.ts           (Shared mesh standard materials and color palette)
        └── GearCubeModel.test.ts  (Automated transform adapter & component routing tests)
```

---

## 9. Static Data Pipeline & Future Phase 2C Compatibility

- **`STATIC_RENDER_SOURCE`:** `CORE_PLUS_KINEMATICS`
- **`PHASE2C_ANIMATION_COMPATIBLE`:** `YES`
- **Compatibility Rationale:** `<GearCubeModel>` accepts `transforms: readonly ComponentTransform[]`. In Phase 2C, continuous animation will simply invoke `plan.evaluate(progress)` inside an animation loop / `useFrame` hook and pass the resulting array directly to `<GearCubeModel>` without altering piece mesh components or allocating new Three objects per frame.

---

## 10. Testing & Verification Strategy for Phase 2B

### 10.1. Automated Test Environment & Scope
- **`PHASE2B_AUTOMATED_TEST_ENVIRONMENT`:** `PURE_VITEST_NODE` (Pure Node environment).
- **`WEBGL_REQUIRED_BY_AUTOMATED_TESTS`:** `NO` (Avoids fragile JSDOM/WebGL mocking).
- **`VISUAL_ACCEPTANCE_MODE`:** `MANUAL_BROWSER_SMOKE`
- **Automated Gates:**
  1. `SCENE_TRANSFORM_ADAPTER_GATE`: Unit tests in `GearCubeModel.test.ts` verifying 1-to-1 mapping from 26 `ComponentTransforms` to scene props.
  2. `COMPONENT_IDENTITY_GATE`: Verifies that all 26 top-level piece groups have persistent unique `ComponentId` keys.
  3. `PIECE_ROUTING_GATE`: Verifies that 8 corners route to `CornerPiece`, 12 edges to `EdgePiece`, and 6 centers to `CenterPiece`.
  4. `KINEMATICS_PURITY_GATE`: Purity check ensuring `packages/core` and `packages/kinematics` remain 100% free of Three.js/React dependencies.
  5. `WEB_BUILD_GATE`: `npm run build --workspace=@gearcube/web` succeeds without TypeScript or Vite bundling errors.

### 10.2. Visual Acceptance Criteria
- [ ] Exactly 26 persistent top-level piece groups rendered in the 3D canvas.
- [ ] Solved Gear Cube spatial geometry clearly recognizable.
- [ ] Six distinct face sticker colors correctly assigned to physical piece faces.
- [ ] Edge gear cogs visually distinct from standard Rubik's cube edges and $C_2$ symmetric.
- [ ] Center caps visually rotationally symmetric around outward face normal.
- [ ] Orbit controls allow free 3D rotation and zooming with mouse/touch gestures.
- [ ] Responsive canvas filling the container without scrollbars or clipping.
- [ ] Zero console warnings or runtime WebGL errors.

---

## 11. Frozen Phase 2B Implementation Scope

### 11.1. Files to CREATE (7 files):
1. `apps/web/src/components/canvas/GearCubeViewport.tsx`
2. `apps/web/src/components/cube/GearCubeModel.tsx`
3. `apps/web/src/components/cube/CornerPiece.tsx`
4. `apps/web/src/components/cube/EdgePiece.tsx`
5. `apps/web/src/components/cube/CenterPiece.tsx`
6. `apps/web/src/components/cube/materials.ts`
7. `apps/web/src/components/cube/GearCubeModel.test.ts`

### 11.2. Files to MODIFY (5 files):
1. `apps/web/package.json` (Add Three.js 0.185.1, R3F 9.7.0, Drei 10.7.8, and Kinematics)
2. `apps/web/src/App.tsx` (Mount `<GearCubeViewport />`)
3. `apps/web/src/App.css` (Full-viewport styling)
4. `package-lock.json` (Record Three.js, R3F, Drei dependency lock entries)
5. `docs/development/ROADMAP.md` (Update Phase 2B status)

### 11.3. Files Explicitly UNCHANGED:
- `package.json`
- `tsconfig.base.json`
- `scripts/check-core-deps.mjs`
- `packages/core/**` (100% frozen)
- `packages/kinematics/**` (100% frozen)
- `docs/architecture/**`
- `docs/decisions/**`

---

## 12. Architecture Review & Decision Status

- **`PHASE2B_NEW_ADR_REQUIRED`:** `NO` (Pursuant to ADR-0004, ADR-0005, and ADR-0006, all normative boundaries, quotients, and coordinate conventions are fully established).
- **`PHASE2B_SCOPE_FROZEN`:** `YES`

---
---

# PART II: Phase 2C — Move Animation & Face Controls Specification

> **Phase Status:** `PLANNED / CANONICAL SPECIFICATION FROZEN`
> **Authoritative Starting Commit:** `773c4adb03bb75bec95f3d57186b3fb12ccb6657` (`Implement Phase 2B static renderer`)
> **Applicability:** Web Application (`apps/web`), Interactive Viewport, & Move Controls

---

## 13. Phase 2C Goal & Product Boundary

### 13.1. Phase 2C Goal
Make the rendered 3D Gear Cube execute real legal U/D/F/B/R/L CW/CCW moves using continuous kinematic trajectory planning from `@gearcube/kinematics`, 12 face move controls, smooth time easing, SpatialFrame lifecycle progression, and drift-free endpoint projection.

### 13.2. In-Scope Deliverables
- **12 Explicit Move Controls:**
  - `U CW` (`U ↻`) / `U CCW` (`U ↺`)
  - `D CW` (`D ↻`) / `D CCW` (`D ↺`)
  - `F CW` (`F ↻`) / `F CCW` (`F ↺`)
  - `B CW` (`B ↻`) / `B CCW` (`B ↺`)
  - `R CW` (`R ↻`) / `R CCW` (`R ↺`)
  - `L CW` (`L ↻`) / `L CCW` (`L ↺`)
- **Continuous Kinematic Execution:** Consumes authoritative `@gearcube/kinematics` `planKinematics(fromView, move, toView)`.
- **Temporal Progress Easing:** Smooth $C^1$ cubic interpolation from $p = 0.0$ to $p = 1.0$ over fixed duration (`MOVE_DURATION_MS = 400`).
- **Correct Logical Endpoint State:** `currentState = applyMove(currentState, move)` committed upon animation completion.
- **Correct SpatialFrame Lifecycle:** `currentFrame = nextSpatialFrame(currentFrame, move.face)` committed upon animation completion.
- **Repeated Sequential Moves:** Multiple successive moves execute cleanly without visual drift, desynchronization, or memory leaks.
- **Independent Control Overlay:** Move controls overlay the viewport without interfering with OrbitControls; camera orbit/drag and zoom remain fully functional.

### 13.3. Phase 2C Non-Goals (Explicitly Out of Scope)
- Drag-to-turn gestures on 3D meshes (deferred to later interaction enhancements).
- Raycasting / 3D face picking.
- Touch gesture move inference.
- Solver algorithms and solution playback (Phase 4).
- Scramble generator (Phase 3).
- Undo / Redo history scrubber (Phase 3).
- Keyboard shortcuts (Phase 3).
- Photorealistic gear teeth geometry redesign (Phase 2B placeholder meshes remain authoritative).
- Modifications or additions to `@gearcube/core` or `@gearcube/kinematics`.

---

## 14. Authoritative Kinematic Lifecycle & Endpoint Semantics

### 14.1. Canonical Move Lifecycle Flowchart
```text
[ Trigger Move m ]
       │
       ▼ (Pre-Animation: Instantaneous Derivation)
fromView  = materializeState(currentState, currentFrame)
nextState = applyMove(currentState, move)
nextFrame = nextSpatialFrame(currentFrame, move.face)
toView    = materializeState(nextState, nextFrame)
plan      = planKinematics(fromView, move, toView)
startTime = nowMs
       │
       ▼ (Active Animation Loop: R3F useFrame)
while (elapsed < MOVE_DURATION_MS):
  rawProgress   = clamp(elapsed / MOVE_DURATION_MS, 0, 1)
  easedProgress = easeInOutCubic(rawProgress)
  transforms    = plan.evaluate(easedProgress)
  GearCubeModel(transforms)
       │
       ▼ (Completion Gate: rawProgress >= 1.0)
currentState = nextState
currentFrame = nextFrame
activePlan   = null
       │
       ▼ (Fresh Static Projection: Authority Reset)
finalView       = materializeState(currentState, currentFrame)
finalTransforms = placementToTransforms(finalView)
GearCubeModel(finalTransforms)
```

### 14.2. Hard Invariants & Anti-Drift Guarantees
- **`NO_INTERMEDIATE_LOGICAL_STATE`:** `YES` (`currentState` and `currentFrame` only update atomically at $p = 1.0$).
- **`NO_RENDERER_DERIVED_STATE`:** `YES` (The web layer never calculates puzzle state from Three.js scene matrices or mesh rotations).
- **`NO_ACCUMULATED_FLOAT_TRANSFORMS`:** `YES` (Mesh rotations are never computed by accumulating incremental delta angles ($\Delta \theta$); transforms at every instant are evaluated directly from `plan.evaluate(p)`).
- **`ENDPOINT_SNAP_TO_FRESH_PROJECTION`:** `YES` (At completion, permanent visual transforms are re-derived from `placementToTransforms(materializeState(currentState, currentFrame))`).
- **`PERMANENT_ENDPOINT_TRANSFORM_SOURCE`:** `PLACEMENT_TO_TRANSFORMS_FRESH_MATERIALIZATION`
- **`PLAN_EVALUATE_1_AS_PERMANENT_AUTHORITY`:** `NO`

---

## 15. State Ownership & R3F useFrame Execution Boundary

### 15.1. State Ownership Contract
- **`RUNTIME_STATE_OWNER`:** `apps/web`
- **`GEARCUBE_VIEWPORT_ROLE`:** `APP_STATE_OWNER_AND_CANVAS_HOST`
- **`USE_FRAME_EXECUTION_CONTEXT`:** `CANVAS_DESCENDANT`
  - `useFrame()` MUST execute inside an internal scene/animation driver component rendered beneath `<Canvas>`. It must NOT be called directly in the outer `GearCubeViewport` component that creates the `<Canvas>`.
  - The internal Canvas-descendant driver lives within `GearCubeViewport.tsx` without requiring an additional file.
- **`GEARCUBE_MODEL_LOGICAL_STATE`:** `NONE`
- **`GEARCUBE_MODEL_ANIMATION_STATE`:** `NONE`

### 15.2. Runtime State Fields:
- **`currentState`:** `GearCubeState` (initialized to `SOLVED_GEAR_CUBE_STATE`)
- **`currentFrame`:** `SpatialFrame` (initialized to `DEFAULT_SPATIAL_FRAME = 3`)
- **`activeAnimation`:** `AnimationSession | null`
  ```typescript
  export interface AnimationSession {
    readonly move: Move;
    readonly plan: KinematicPlan;
    readonly nextState: GearCubeState;
    readonly nextFrame: SpatialFrame;
    readonly startTimeMs: number;
    readonly durationMs: number;
  }
  ```
- **`displayTransforms`:** `readonly ComponentTransform[]`

---

## 16. Animation Time Semantics & Easing Math

### 16.1. Timing Architecture
- **`ANIMATION_SCHEDULER`:** `R3F_USE_FRAME`
- **`ANIMATION_TIME_UNIT`:** `MILLISECONDS`
- **`ANIMATION_NOW_SOURCE`:** `PERFORMANCE_NOW_MS` (`performance.now()`)
- **`PURE_ANIMATION_TIME_INJECTION`:** `YES`
  - Pure session functions in `animation.ts` accept `nowMs: number` explicitly (e.g. `startMove(session, move, nowMs)`, `stepAnimation(session, nowMs)`), allowing deterministic unit testing without browser clock globals.
- **`MOVE_DURATION_MS`:** `400`
- **`KINEMATIC_MATH_DUPLICATED_IN_WEB`:** `NO`

### 16.2. Easing Function
- **`EASING_FUNCTION`:** `easeInOutCubic`
  ```typescript
  export function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  ```
- **Properties:** Continuous $C^1$-smooth, zero velocity at endpoints ($t = 0, 1$), strictly monotonic in $[0, 1]$.

---

## 17. Input Policy During Active Animation

- **`INPUT_DURING_ANIMATION_POLICY`:** `IGNORED`
- **`MAX_ACTIVE_KINEMATIC_PLANS`:** `1`
- **Behavior:**
  - While `activeAnimation !== null`, UI move buttons are visually disabled (`disabled={isAnimating}`).
  - Underlying `startMove` function independently rejects/ignores any move trigger if an animation is already active (`if (session.activeAnimation !== null) return session;`).
  - No move queueing is implemented in Phase 2C to ensure deterministic single-move isolation.

---

## 18. Move Controls UI Specification

### 18.1. Control Overlay Architecture
- HTML overlay rendered on top of the 3D viewport canvas.
- Pointer event configuration: `pointer-events: none` on overlay backdrop, `pointer-events: auto` on button containers, ensuring free OrbitControls interaction elsewhere.
- Zero external UI framework dependencies (pure React + standard CSS in `App.css`).

### 18.2. 12 Directed Move Layout
- 6 logical face cards: `U`, `D`, `F`, `B`, `R`, `L`.
- Each card provides two directional buttons:
  - `↻` (CW): triggers `{ face, direction: 'CW' }`
  - `↺` (CCW): triggers `{ face, direction: 'CCW' }`
- Accessible `aria-label`s and clear face group headers.

---

## 19. OrbitControls & Camera Compatibility

- **`ORBIT_ROTATION`:** `PRESERVED`
- **`ZOOM`:** `PRESERVED`
- **Pointer Event Isolation:** Button clicks stop event propagation to avoid triggering camera orbit rotations while clicking controls.
- **`ORBIT_CONTROLS_DURING_ANIMATION`:** Orbit and zoom remain enabled during move animation.

---

## 20. Persistent Component Identity & Zero-Allocation Binding

- **`TOP_LEVEL_PIECE_NODE_COUNT`:** `26`
- **`PERSISTENT_COMPONENT_ID_NODE_COUNT`:** `26`
- **`COMPONENT_IDENTITY_DURING_ANIMATION`:** `PRESERVED`
- React key for piece meshes remains strictly `transform.componentId`.
- Zero mesh remounting or swapping during animation.

---

## 21. Testing & Verification Strategy for Phase 2C

### 21.1. Automated Test Environment & Scope
- **`PHASE2C_AUTOMATED_TEST_ENVIRONMENT`:** `PURE_VITEST_NODE` (Pure Node environment).
- **`WEBGL_REQUIRED_BY_AUTOMATED_TESTS`:** `NO`

### 21.2. Automated Test Gates (`apps/web/src/components/cube/animation.test.ts`):
1. **`INITIAL_SOLVED_RENDER_GATE`:** Solved session produces exactly 26 transforms matching `placementToTransforms(materializeState(SOLVED, DEFAULT_FRAME))`.
2. **`MOVE_START_GATE`:** Initiating a move creates valid `fromView`, `nextState`, `nextFrame`, `toView`, and `plan` with `plan.move` matching requested move.
3. **`MID_ANIMATION_EVALUATION_GATE`:** For $p \in (0, 1)$, evaluates `plan.evaluate(easeInOutCubic(p))` producing 26 valid transforms without NaN or non-finite values.
4. **`COMPLETION_GATE`:** When $p = 1.0$, session commits `nextState` and `nextFrame` exactly once, clears `activeAnimation` exactly once, and produces fresh projection matching `placementToTransforms(materializeState(nextState, nextFrame))`.
5. **`SEQUENTIAL_MOVE_GATE`:** Executes sequential move sequences (e.g. $U_{\text{CW}} \to R_{\text{CCW}} \to F_{\text{CW}}$), verifying each subsequent move starts from the exact committed endpoint of the prior move.
6. **`INPUT_IGNORED_GATE`:** Attempting to trigger a move while `isAnimating === true` is rejected and leaves the active plan and target state unaltered.
7. **`TWELVE_MOVE_COVERAGE_GATE`:** All 12 directed moves in `ALL_MOVES` can be planned, evaluated, and committed with 0 errors.
8. **`IMMUTABILITY_GATE`:** Core states, SpatialFrames, and views passed through the session pipeline remain 100% unmutated.
9. **`RENDERER_REGRESSION_GATE`:** Existing `GearCubeModel.test.ts` remains 100% passing (26 descriptors, 8/12/6 piece routing, spindle axes).
10. **`TARGETED_ANIMATION_TEST_GATE`:** `npx vitest run apps/web/src/components/cube/animation.test.ts` passes 100%.
11. **`WEB_TYPECHECK_GATE`:** `npm run typecheck --workspace=@gearcube/web` passes with 0 errors.
12. **`WEB_BUILD_GATE`:** `npm run build --workspace=@gearcube/web` succeeds without TypeScript or Vite bundling errors.
13. **`ROOT_VERIFY_GATE`:** `npm run verify` passes all workspace typechecks, dependency purity checks, tests, and builds.

### 21.3. Manual Browser Smoke Gates:
- **`HUMAN_CANVAS_RENDER_GATE`:** `PASS` (3D scene renders cleanly).
- **`HUMAN_MOVE_BUTTONS_12_GATE`:** `PASS` (All 12 buttons visible, properly labeled, and clickable).
- **`HUMAN_ANIMATION_VISUAL_MOTION_GATE`:** `PASS` (Outer layer turns 180°, middle slice turns 90°, gear cogs spin smoothly).
- **`HUMAN_SEQUENTIAL_MOVE_GATE`:** `PASS` (Multiple successive moves execute cleanly without visual stutter or snap discontinuities).
- **`HUMAN_ORBIT_SURVIVES_MOVE_GATE`:** `PASS` (Camera orbit and drag function before, during, and after moves).
- **`HUMAN_ZOOM_SURVIVES_MOVE_GATE`:** `PASS` (Camera zoom functions before, during, and after moves).
- **`HUMAN_ENDPOINT_DRIFT_GATE`:** `PASS` (Repeated moves accumulate zero visible drift).
- **`HUMAN_REPRESENTATIVE_MOVE_VISUAL_GATE`:** `PASS` (Visibly demonstrates outer 180°, middle 90°, gear spin across representative axes: U/D, F/B, R/L).
- **`CONSOLE_RUNTIME_ERROR_GATE`:** `NOT_VERIFIED_BY_AGENT` (Human independent verification).

---

## 22. Frozen Phase 2C Implementation Scope

### 22.1. Files to CREATE (exactly 3 files):
1. `apps/web/src/components/controls/MoveControls.tsx` (12 face move button overlay component)
2. `apps/web/src/components/cube/animation.ts` (Pure animation session state, easing function, and lifecycle transition functions with injected timestamps)
3. `apps/web/src/components/cube/animation.test.ts` (Automated pure Vitest test suite for animation session and lifecycle)

### 22.2. Files to MODIFY (exactly 3 files):
1. `apps/web/src/components/canvas/GearCubeViewport.tsx` (Host animation session, internal Canvas-descendant driver with `useFrame`, and mount `<MoveControls />`)
2. `apps/web/src/App.css` (Styles for move controls UI overlay and buttons)
3. `docs/development/ROADMAP.md` (Update Phase 2 status)

### 22.3. Future Implementation File Count:
- **`FUTURE_IMPLEMENTATION_FILE_COUNT`:** `6` (3 CREATE, 3 MODIFY)

### 22.4. Files Explicitly UNCHANGED:
- `package.json`
- `package-lock.json` (Zero new dependencies)
- `tsconfig.base.json`
- `scripts/check-core-deps.mjs`
- `packages/core/**` (100% frozen)
- `packages/kinematics/**` (100% frozen)
- `apps/web/src/App.tsx`
- `apps/web/src/components/cube/CornerPiece.tsx`
- `apps/web/src/components/cube/EdgePiece.tsx`
- `apps/web/src/components/cube/CenterPiece.tsx`
- `apps/web/src/components/cube/materials.ts`
- `apps/web/src/components/cube/GearCubeModel.tsx`
- `docs/architecture/**`
- `docs/decisions/**`

---

## 23. Stop Conditions

If any of the following conditions arise during implementation, stop immediately:
1. **`CORE_CHANGE_REQUIRED`:** Any requirement to modify `@gearcube/core`.
2. **`KINEMATICS_CHANGE_REQUIRED`:** Any requirement to modify `@gearcube/kinematics`.
3. **`NEW_DEPENDENCY_REQUIRED`:** Any requirement to install new runtime or dev dependencies.
4. **`SCOPE_EXPANSION_REQUIRED`:** Any requirement to edit files outside the frozen 6-file scope.
5. **`ARCHITECTURE_CONFLICT`:** Any conflict with ADR-0004, ADR-0005, or ADR-0006.
6. **`WEBGL_TEST_DEPENDENCY_REQUIRED`:** Any automated test requiring headless WebGL or browser mocking.
7. **`USE_FRAME_OUTSIDE_CANVAS_REQUIRED`:** Any architectural failure preventing `useFrame` from executing inside a Canvas descendant.

---

## 24. Architecture Review & Decision Status

- **`PHASE2C_NEW_ADR_REQUIRED`:** `NO` (All architectural contracts, coordinate quotients, view materializations, and kinematic trajectory formulations are already fully established under ADR-0004, ADR-0005, and ADR-0006).
- **`NEW_RUNTIME_DEPENDENCIES`:** `NONE` (React, R3F, Drei, Three.js, Core, and Kinematics are already present and sufficient).
- **`PHASE2C_SCOPE_FROZEN`:** `YES`