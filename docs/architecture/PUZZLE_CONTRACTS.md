# PUZZLE_CONTRACTS.md — Canonical Type Contracts & Interface Specifications

> **Document Status:** `DECIDED` (Kinematics contracts updated pursuant to accepted [`ADR-0006`](../decisions/ADR-0006-VIEW-BASED-KINEMATICS-AND-RENDERER-QUOTIENTS.md))
> **Applicability:** Pure TypeScript Type Definitions & Interface Specifications (Reference Only)

---

## 1. Core Architectural Distinctions

Before specifying the interface definitions, we define four strictly separated domains:

| Domain | Description & Responsibility | Update Frequency |
| :--- | :--- | :--- |
| **1. Discrete Legal Puzzle State** | The pure combinatorial permutation and orientation of physical components. Sole source of truth for graph search and solvers. | Discrete steps (on move completion) |
| **2. Continuous 3D Animation State** | Time-varying Euler angles, quaternions, and continuous mesh transformations during move execution. | Continuous (rendering loop; proposed 60 FPS target) |
| **3. Visual Skin** | Material properties, PBR textures, wireframe modes, and lighting schemes. Zero impact on mechanics. | On user selection |
| **4. Kinematic Parameters** | Physical linkage formulas, gear tooth ratios, and intermediate slice angular coupling functions. | Defined per puzzle model specification |

---

## 2. Discrete Domain Core Contracts

*(The following TypeScript interfaces are conceptual definitions for documentation purposes, specified in detail in [`GEAR_CUBE_STATE_MODEL.md`](GEAR_CUBE_STATE_MODEL.md). No source code files are created in this phase.)*

```typescript
/** Canonical outer face identifiers */
export type Face = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';

/**
 * Canonical outer face turn direction.
 * Defined observationally as viewed directly from outside the selected face toward the cube center.
 * In the right-handed coordinate convention (where each face's positive axis is its outward normal):
 * - CW: negative right-hand rotation about the outward normal axis (outer: -180°, middle: -90°)
 * - CCW: positive right-hand rotation about the outward normal axis (outer: +180°, middle: +90°)
 * CW and CCW produce distinct discrete state transitions on the coupled middle slice and gear cogs (CW != CCW).
 */
export type Direction = 'CW' | 'CCW';

/**
 * Represents a discrete legal face flip.
 * For the canonical Standard Gear Cube, one legal face turn is 180°.
 */
export interface Move {
  readonly face: Face;
  readonly direction: Direction;
}

/** Canonical corner configuration index in S_4 (0..23) */
export type CornerConfiguration = number;

/** Relative edge permutation class within the Klein four-group V_4 (0..3) */
export type SlicePermutationClass = 0 | 1 | 2 | 3;

/** Abstract common twist class of middle-layer edge cogs in Z_3 (0, 1, 2) */
export type SliceGearPhase = 0 | 1 | 2;

/** Discrete coordinate state of a single edge slice orbit (12 distinct states) */
export interface EdgeSliceCoordinate {
  readonly permutationClass: SlicePermutationClass;
  readonly phase: SliceGearPhase;
}

/**
 * Immutable canonical discrete state of the Standard Gear Cube.
 * True Cartesian domain: 24 * 12 * 12 * 12 = 41,472 reachable states.
 */
export interface GearCubeState {
  readonly cornerConfiguration: CornerConfiguration;
  readonly sliceX: EdgeSliceCoordinate;
  readonly sliceY: EdgeSliceCoordinate;
  readonly sliceZ: EdgeSliceCoordinate;
}

/** Formal specification of the physical puzzle model rules */
export interface PuzzleDefinition {
  readonly id: string; // e.g. "standard-gear-cube-mefferts"
  readonly name: string;
  readonly legalFaces: readonly Face[];
  readonly baseTurnAngleDegrees: 180; // [SOURCE_SUPPORTED]
}

/** Core functional operations contract (pursuant to @gearcube/core exports) */
export interface PuzzleCoreAPI {
  /** Applies a legal move to a state and returns the resulting immutable state */
  applyMove(state: GearCubeState, move: Move): GearCubeState;

  /** Validates whether the state matches the canonical solved target state */
  isSolved(state: GearCubeState): boolean;

  /** Validates whether two state instances are combinatorially identical */
  equalsGearCubeState(a: GearCubeState, b: GearCubeState): boolean;

  /** Generates a deterministic string key for serialization and transposition tables */
  serializeLogicalState(state: GearCubeState): string;

  /** Deserializes a canonical string key back into a validated GearCubeState */
  deserializeLogicalState(serialized: string): GearCubeState;

  /** Type guard validating state consistency and coordinate domain invariants */
  isGearCubeState(state: unknown): state is GearCubeState;
}
```

---

## 3. Derived Materialized View & Kinematic Contracts

*(Specified in detail in [`KINEMATIC_CONTRACT.md`](KINEMATIC_CONTRACT.md). These interfaces are downstream contracts owned by `packages/kinematics` and consumed by the presentation layer in `apps/web`. The pure Domain Core has ZERO dependencies on kinematics, rendering, or animation timing, and does not import `KinematicPlanner` or `KinematicPlan`.)*

```typescript
export type CornerSlot = 'UFL' | 'UBR' | 'DFR' | 'DBL' | 'UFR' | 'UBL' | 'DFL' | 'DBR';
export type CornerPieceId =
  | 'corner-UFL' | 'corner-UBR' | 'corner-DFR' | 'corner-DBL'
  | 'corner-UFR' | 'corner-UBL' | 'corner-DFL' | 'corner-DBR';

export interface CornerPlacement {
  readonly slot: CornerSlot;
  readonly pieceId: CornerPieceId;
  readonly orbit: 'free' | 'ref';
}

export type EdgeSlot =
  | 'UB' | 'UF' | 'DF' | 'DB'
  | 'FL' | 'FR' | 'BR' | 'BL'
  | 'UR' | 'UL' | 'DL' | 'DR';
export type EdgePieceId =
  | 'edge-UB' | 'edge-UF' | 'edge-DF' | 'edge-DB'
  | 'edge-FL' | 'edge-FR' | 'edge-BR' | 'edge-BL'
  | 'edge-UR' | 'edge-UL' | 'edge-DL' | 'edge-DR';

export interface EdgePlacement {
  readonly slot: EdgeSlot;
  readonly pieceId: EdgePieceId;
  readonly slice: 'X' | 'Y' | 'Z';
  readonly phase: SliceGearPhase;
}

export type CenterSlot = 'U' | 'D' | 'F' | 'B' | 'R' | 'L';
export type CenterPieceId = 'center-U' | 'center-D' | 'center-F' | 'center-B' | 'center-R' | 'center-L';

/**
 * Derived physical center piece placement in fixed-spatial slots.
 * (Pursuant to ADR-0004, center axial orientation is quotiented for the standard unmarked model).
 */
export interface CenterPlacement {
  readonly slot: CenterSlot;
  readonly pieceId: CenterPieceId;
}

/** Derived, human-readable physical piece placement view (non-authoritative) */
export interface PiecePlacementView {
  readonly corners: readonly CornerPlacement[];
  readonly edges: readonly EdgePlacement[];
  readonly centers: readonly CenterPlacement[];
}

/**
 * Discrete 4-state spatial frame representing the physical slot
 * location of the reference corner piece DBL (0: UFL, 1: UBR, 2: DFR, 3: DBL).
 * Solved / canonical value: 3.
 */
export type SpatialFrame = 0 | 1 | 2 | 3;

/** Materialization function contract */
export type StateMaterializer = (
  state: GearCubeState,
  spatialFrame?: SpatialFrame
) => PiecePlacementView;

/** Stable physical component identifier matching Core piece identity */
export type ComponentId = CornerPieceId | EdgePieceId | CenterPieceId;

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

/**
 * Downstream kinematic trajectory generator contract (owned by packages/kinematics pursuant to ADR-0006).
 * Consumes authoritative physical piece placement views derived from Core.
 * Note: Pure Domain Core does NOT import or depend on this interface, and kinematics does NOT own puzzle state.
 */
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

## 4. Visual Presentation & Material Concepts (NON-NORMATIVE CONCEPTUAL EXAMPLE)

*(Visual skins and dynamic theme switching are **DEFERRED / FUTURE PRESENTATION CAPABILITIES**. The current presentation layer in `apps/web/src/components/cube/` uses fixed procedural geometries, standard color palettes (`FACE_COLORS`, `BODY_COLOR`), and normal helpers defined in `materials.ts`. The interfaces below illustrate conceptual extensions for future multi-skin support and are non-normative.)*

```typescript
// NON-NORMATIVE CONCEPTUAL EXAMPLE — DEFERRED PRESENTATION CAPABILITY
export interface MaterialConfig {
  readonly color: string;
  readonly metalness: number;
  readonly roughness: number;
  readonly wireframe?: boolean;
}

export interface VisualSkin {
  readonly id: string;
  readonly name: string;
  readonly cornerMaterial: MaterialConfig;
  readonly edgeGearMaterial: MaterialConfig;
  readonly centerMaterial: MaterialConfig;
  readonly stickerColors: Record<Face, string>;
}
```

---

## 5. Solver Engine & Worker Contracts (Implemented & Accepted — Phase 4)

*(Pursuant to accepted production contracts in `packages/solvers/src/types.ts` and `packages/solvers/src/protocol.ts`. The solver engine operates off the main thread inside `apps/web/src/workers/solver.worker.ts`. User cancellation is executed via host-driven `worker.terminate()`; no in-band cancel protocol message exists.)*

```typescript
/** Accepted production solver algorithms */
export type SolverAlgorithm = 'BFS' | 'BIDIRECTIONAL_BFS' | 'IDA_STAR';

export interface SearchCounters {
  readonly nodesExpanded: number;
  readonly nodesGenerated: number;
}

/** Algorithm-specific real-time progress telemetry */
export type SearchTelemetry =
  | {
      readonly algorithm: 'BFS';
      readonly nodesExpanded: number;
      readonly nodesGenerated: number;
      readonly elapsedMs: number;
      readonly frontierDepth: number;
    }
  | {
      readonly algorithm: 'BIDIRECTIONAL_BFS';
      readonly nodesExpanded: number;
      readonly nodesGenerated: number;
      readonly elapsedMs: number;
      readonly forwardDepth: number;
      readonly backwardDepth: number;
      readonly bestSolutionDepth: number | null;
    }
  | {
      readonly algorithm: 'IDA_STAR';
      readonly nodesExpanded: number;
      readonly nodesGenerated: number;
      readonly elapsedMs: number;
      readonly threshold: number;
      readonly currentDepth: number;
    };

export interface SolveSuccess {
  readonly status: 'SOLVED';
  readonly algorithm: SolverAlgorithm;
  readonly moves: readonly Move[];
  readonly depth: number;
  readonly counters: SearchCounters;
  readonly elapsedMs: number;
}

export interface SolveLimitReached {
  readonly status: 'LIMIT_REACHED';
  readonly algorithm: SolverAlgorithm;
  readonly limit: 'MAX_NODES' | 'MAX_DEPTH';
  readonly counters: SearchCounters;
  readonly elapsedMs: number;
}

export type SolveResult = SolveSuccess | SolveLimitReached;

export interface SolverOptions {
  readonly maxNodes?: number;
  readonly maxDepth?: number;
  readonly progressIntervalNodes?: number;
  readonly onProgress?: (telemetry: SearchTelemetry) => void;
}

/** Inbound message sent from UI host to Solver Web Worker */
export type WorkerInboundMessage = {
  readonly type: 'START_SEARCH';
  readonly requestId: string;
  readonly algorithm: SolverAlgorithm;
  readonly state: GearCubeState;
  readonly options?: {
    readonly maxNodes?: number;
    readonly maxDepth?: number;
    readonly progressIntervalNodes?: number;
  };
};

/** Outbound messages sent from Solver Web Worker to UI host */
export type WorkerOutboundMessage =
  | {
      readonly type: 'SEARCH_STARTED';
      readonly requestId: string;
    }
  | {
      readonly type: 'SEARCH_PROGRESS';
      readonly requestId: string;
      readonly telemetry: SearchTelemetry;
    }
  | {
      readonly type: 'SEARCH_COMPLETE';
      readonly requestId: string;
      readonly result: SolveSuccess;
    }
  | {
      readonly type: 'SEARCH_LIMIT_REACHED';
      readonly requestId: string;
      readonly result: SolveLimitReached;
    }
  | {
      readonly type: 'SEARCH_ERROR';
      readonly requestId: string;
      readonly error: string;
    };
```

---

## 6. Research & Benchmark Harness Contracts (NON-NORMATIVE HISTORICAL / CONCEPTUAL PLACEHOLDER)

> [!WARNING]
> **Phase 5 has NOT started.** The interfaces below are historical/conceptual placeholders and must NOT be interpreted as frozen implementation contracts.
> All benchmark schemas, seed semantics, metric definitions, and package boundaries require explicit resolution during Phase 5 preflight (`PHASE5_PREFLIGHT_DECISION_REQUIRED`).

```typescript
// NON-NORMATIVE CONCEPTUAL EXAMPLE — PHASE5_PREFLIGHT_DECISION_REQUIRED
export interface BenchmarkSuiteConfig {
  readonly suiteId: string;
  readonly scrambleDepths: readonly number[];
  readonly trialsPerDepth: number;
  readonly randomSeed: number;
  readonly algorithms: readonly SolverAlgorithm[];
}

export interface BenchmarkTrialMetric {
  readonly trialIndex: number;
  readonly scrambleDepth: number;
  readonly scrambleSequence: readonly Move[];
  readonly algorithm: SolverAlgorithm;
  readonly executionTimeMs: number;
  readonly nodesExpanded: number;
  readonly solutionLength: number;
  readonly isOptimal: boolean;
}

export interface BenchmarkReport {
  readonly timestamp: string;
  readonly config: BenchmarkSuiteConfig;
  readonly trials: readonly BenchmarkTrialMetric[];
  readonly summary: {
    readonly meanTimeMsByDepth: Record<number, number>;
    readonly meanNodesByDepth: Record<number, number>;
    readonly optimalityRate: number;
  };
}
```

---

## 7. Vision State Ingestion Contracts (Future Phase 7)

```typescript
export interface DetectedFaceFeature {
  readonly face: Face;
  readonly detectedColors: readonly string[];
  readonly estimatedGearAngle: number;
  readonly confidence: number; // 0.0 to 1.0
}

export interface VisionRecognitionResult {
  readonly timestamp: number;
  readonly rawFeatures: readonly DetectedFaceFeature[];
  readonly candidateState?: GearCubeState;
  readonly isValidState: boolean;
  readonly validationErrors: readonly string[];
  readonly confidenceScore: number;
}
```
