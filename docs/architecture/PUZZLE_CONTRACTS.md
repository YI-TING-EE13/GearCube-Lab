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

*(The following TypeScript interfaces are conceptual definitions for documentation purposes. No source code files are created in this phase.)*

```typescript
/** Canonical face identifiers */
export type Face = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';

/**
 * Represents a discrete legal move.
 * For the reference Gear Cube, one legal face turn consists of two 90° turns = 180°.
 * Direction represents +180° (clockwise) or -180° (counter-clockwise).
 */
export interface Move {
  readonly face: Face;
  /**
   * Multiplier of 180° rotation:
   * +1 = 180° Clockwise
   * -1 = 180° Counter-Clockwise
   * (Note: Whether +1 and -1 are physically distinct states is [OPEN / TO VERIFY])
   */
  readonly turns: 1 | -1;
}

/**
 * Discrete corner piece representation.
 * Models position index and physical orientation.
 */
export interface CornerState {
  readonly id: number; // 0..7
  readonly position: number; // 0..7
  readonly orientation: number; // [OPEN / TO VERIFY: exact orientation group]
}

/**
 * Discrete gear edge piece representation.
 * Models edge slot position and rotational gear phase.
 */
export interface EdgeGearState {
  readonly id: number; // 0..11
  readonly position: number; // 0..11
  readonly gearPhase: number; // [OPEN / TO VERIFY: integer steps 0..(N-1)]
}

/**
 * Immutable snapshot of the discrete puzzle state.
 * This is the authoritative domain source of truth.
 */
export interface PuzzleState {
  readonly corners: readonly CornerState[];
  readonly edges: readonly EdgeGearState[];
  /** Optional metadata for tracking historical depth */
  readonly depth?: number;
}

/**
 * Formal specification of the physical puzzle model rules.
 */
export interface PuzzleDefinition {
  readonly id: string; // e.g. "daiso-gear-cube-4550480834955"
  readonly name: string;
  readonly legalFaces: readonly Face[];
  readonly baseTurnAngleDegrees: 180; // [VERIFIED]
  readonly gearRatio: number; // [OPEN / TO VERIFY]
  readonly edgeGearPhasesCount: number; // [OPEN / TO VERIFY]
}

/**
 * Core functional operations contract.
 */
export interface PuzzleCoreAPI {
  /** Applies a legal move to a state and returns the resulting immutable state */
  applyMove(state: PuzzleState, move: Move): PuzzleState;

  /** Returns all currently legal moves for the given state */
  getLegalMoves(state: PuzzleState): readonly Move[];

  /** Validates whether the state matches the canonical solved target state */
  isSolved(state: PuzzleState): boolean;

  /** Validates whether two state instances are combinatorially identical */
  areStatesEqual(a: PuzzleState, b: PuzzleState): boolean;

  /** Generates a deterministic string key for hash tables / transposition sets */
  serializeState(state: PuzzleState): string;

  /** Validates state consistency and reachability invariants against the puzzle definition */
  validateState(state: PuzzleState): { isValid: boolean; error?: string };
}
```

---

## 3. Kinematic Animation Contracts

```typescript
/** Keyframe transform for a single physical sub-assembly */
export interface ComponentTransformKeyframe {
  readonly componentId: string;
  readonly rotationEuler: [number, number, number];
  readonly rotationQuaternion: [number, number, number, number];
}

/** Complete time-based animation trajectory for a move */
export interface KinematicPlan {
  readonly move: Move;
  readonly durationMs: number;
  readonly keyframes: readonly {
    readonly timeNormalized: number; // 0.0 to 1.0
    readonly transforms: readonly ComponentTransformKeyframe[];
  }[];
}

/** Kinematics Generator API */
export interface KinematicsAPI {
  /** Generates a continuous kinematic animation trajectory from a discrete move */
  generateKinematicPlan(
    fromState: PuzzleState,
    move: Move,
    definition: PuzzleDefinition,
    durationMs: number
  ): KinematicPlan;
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
