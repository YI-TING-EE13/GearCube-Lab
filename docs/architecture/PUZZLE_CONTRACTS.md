# PUZZLE_CONTRACTS.md — Canonical Type Contracts & Interface Specifications

> **Document Status:** `DECIDED`
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

/** Legal face turn direction (CW = +180°, CCW = -180°) */
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

/** Core functional operations contract */
export interface PuzzleCoreAPI {
  /** Applies a legal move to a state and returns the resulting immutable state */
  applyMove(state: GearCubeState, move: Move): GearCubeState;

  /** Validates whether the state matches the canonical solved target state */
  isSolved(state: GearCubeState): boolean;

  /** Validates whether two state instances are combinatorially identical */
  equalsState(a: GearCubeState, b: GearCubeState): boolean;

  /** Generates a deterministic string key for debugging and serialization */
  serializeLogicalState(state: GearCubeState): string;

  /** Validates state consistency and coordinate domain invariants */
  validateState(state: unknown): { readonly isValid: boolean; readonly error?: string };
}
```

---

## 3. Derived Materialized View & Kinematic Contracts

*(Specified in detail in [`KINEMATIC_CONTRACT.md`](KINEMATIC_CONTRACT.md).)*

```typescript
export interface CornerPlacement {
  readonly slotIndex: number; // 0..7
  readonly pieceId: number;   // 0..7
}

export interface EdgePlacement {
  readonly slotIndex: number; // 0..11
  readonly pieceId: number;   // 0..11
  readonly gearPhase: SliceGearPhase; // 0..2
}

export interface CenterPlacement {
  readonly face: Face;
  readonly orientationAngleDegrees: number; // 0, 90, 180, 270
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

/** Continuous 3D spatial transformation for a component */
export interface ComponentTransform {
  readonly componentId: string;
  readonly position: [number, number, number];
  readonly rotationEuler: [number, number, number];
  readonly rotationQuaternion: [number, number, number, number];
}

/** Complete kinematic animation trajectory */
export interface KinematicPlan {
  readonly move: Move;
  readonly durationMs: number;
  evaluate(progress: number): readonly ComponentTransform[];
}

/** Active transition lifecycle */
export interface ActiveTransition {
  readonly fromState: GearCubeState;
  readonly toState: GearCubeState;
  readonly move: Move;
  readonly plan: KinematicPlan;
  readonly progress: number; // 0.0 to 1.0
}
```

---

## 4. Visual Skin & Renderer Adapter Contracts

```typescript
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

export interface RendererAdapter {
  /** Binds a visual skin to the 3D scene */
  applySkin(skin: VisualSkin): void;

  /** Executes an animation plan smoothly across the render loop */
  executeAnimation(plan: KinematicPlan): Promise<void>;

  /** Instantly snaps the 3D meshes to reflect a discrete state */
  snapToState(state: PuzzleState): void;
}
```

---

## 5. Solver Engine & Worker Contracts

```typescript
export type SolverAlgorithmType =
  | 'BFS'
  | 'BIDIRECTIONAL_BFS'
  | 'IDA_STAR'
  | 'IDDFS'
  | 'A_STAR'
  | 'PATTERN_DATABASE'
  | 'NEURAL_GUIDED';

export interface SolverConfig {
  readonly algorithm: SolverAlgorithmType;
  readonly maxDepth?: number;
  readonly timeoutMs?: number;
  readonly heuristicWeight?: number;
}

export interface SolverProgress {
  readonly nodesExpanded: number;
  readonly currentDepth: number;
  readonly elapsedMs: number;
  readonly memoryUsageEstimateBytes?: number;
}

export interface SolverResult {
  readonly isSuccess: boolean;
  readonly solutionPath: readonly Move[];
  readonly totalNodesExpanded: number;
  readonly totalTimeMs: number;
  readonly solutionLength: number;
  readonly error?: string;
}

/** Messages exchanged between UI thread and Solver Web Worker */
export type SolverWorkerRequest =
  | { type: 'START_SOLVE'; state: PuzzleState; config: SolverConfig }
  | { type: 'CANCEL_SOLVE' };

export type SolverWorkerResponse =
  | { type: 'PROGRESS'; progress: SolverProgress }
  | { type: 'COMPLETE'; result: SolverResult }
  | { type: 'ERROR'; message: string };
```

---

## 6. Research & Benchmark Harness Contracts

```typescript
export interface BenchmarkSuiteConfig {
  readonly suiteId: string;
  readonly scrambleDepths: readonly number[]; // e.g. [2, 4, 6, 8, 10, 12]
  readonly trialsPerDepth: number; // e.g. 50
  readonly randomSeed: number;
  readonly algorithms: readonly SolverConfig[];
}

export interface BenchmarkTrialMetric {
  readonly trialIndex: number;
  readonly scrambleDepth: number;
  readonly scrambleSequence: readonly Move[];
  readonly algorithm: SolverAlgorithmType;
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
  readonly candidateState?: PuzzleState;
  readonly isValidState: boolean;
  readonly validationErrors: readonly string[];
  readonly confidenceScore: number;
}
```
