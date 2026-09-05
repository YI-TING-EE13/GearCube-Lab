import type { Move } from '@gearcube/core';
import type { SolverAlgorithm } from '@gearcube/solvers';

/**
 * Immutable configuration schema for one empirical benchmark run.
 *
 * The seed, exact-depth corpus selection, algorithm order, warmups, measured
 * repetitions, and optional solver limits together define the reproducible
 * workload. Warmups are execution-only and never appear in the report trials.
 */
export interface BenchmarkSuiteConfig {
  readonly schemaVersion: '1';
  readonly suiteId: string;
  readonly seed: string;
  readonly exactDepths: readonly number[];
  readonly casesPerDepth: number;
  readonly algorithms: readonly SolverAlgorithm[];
  readonly warmupRuns: number;
  readonly measuredRuns: number;
  readonly limits?: {
    readonly maxNodes?: number;
    readonly maxDepth?: number;
  };
}

/**
 * Deterministically sampled benchmark case with a state-derived stable identifier.
 *
 * `exactDepth` is the independent corpus distance used for stratification and
 * optimality checks; it is not the solver's measured elapsed time or returned
 * solution depth.
 */
export interface BenchmarkCase {
  readonly caseId: string;
  readonly stateKey: string;
  readonly exactDepth: number;
}

/**
 * Common fields for one measured solver trial.
 *
 * `repetitionIndex` identifies the measured repetition (warmups are excluded),
 * counters describe search work, and `elapsedMs` records the runtime observed
 * for this trial on its execution host.
 */
export interface BenchmarkTrialBase {
  readonly caseId: string;
  readonly exactDepth: number;
  readonly algorithm: SolverAlgorithm;
  readonly repetitionIndex: number;
  readonly nodesExpanded: number;
  readonly nodesGenerated: number;
  readonly elapsedMs: number;
}

/**
 * Solved measured trial, including the returned canonical move sequence.
 */
export interface BenchmarkSolvedTrial extends BenchmarkTrialBase {
  readonly status: 'SOLVED';
  readonly solutionDepth: number;
  readonly solutionMoves: readonly Move[];
}

/**
 * Measured trial stopped by one of the configured solver limits.
 */
export interface BenchmarkLimitTrial extends BenchmarkTrialBase {
  readonly status: 'LIMIT_REACHED';
  readonly limitReason: 'MAX_NODES' | 'MAX_DEPTH';
}

/**
 * Individual measured algorithm trial result (discriminated by `status`).
 */
export type BenchmarkTrialResult = BenchmarkSolvedTrial | BenchmarkLimitTrial;

/**
 * Summary metrics aggregated by exact corpus depth for one algorithm.
 *
 * Means and medians are calculated over all measured trials at that depth;
 * solved and limit counts retain the outcome mix instead of hiding limits.
 */
export interface AlgorithmSummaryByDepth {
  readonly exactDepth: number;
  readonly totalTrials: number;
  readonly solvedCount: number;
  readonly limitCount: number;
  readonly meanNodesExpanded: number;
  readonly medianNodesExpanded: number;
  readonly meanNodesGenerated: number;
  readonly medianNodesGenerated: number;
  readonly meanElapsedMs: number;
  readonly medianElapsedMs: number;
}

/**
 * Summary metrics aggregated across an entire suite for one algorithm.
 */
export interface AlgorithmSummary {
  readonly algorithm: SolverAlgorithm;
  readonly byDepth: readonly AlgorithmSummaryByDepth[];
  readonly totalSolved: number;
  readonly totalLimits: number;
  readonly overallMeanNodesExpanded: number;
  readonly overallMedianElapsedMs: number;
}

/**
 * Suite-level counts and per-algorithm aggregate summaries.
 */
export interface BenchmarkSummary {
  readonly totalCases: number;
  readonly totalTrials: number;
  readonly algorithms: readonly AlgorithmSummary[];
}

/**
 * Non-normative host and runtime provenance metadata.
 *
 * `executionTimestamp` is an ISO-8601 timestamp captured at run time. The
 * optional fields describe the host that performed the measurements; they are
 * provenance context, not normalization inputs or performance guarantees.
 */
export interface EnvironmentProvenance {
  readonly platform: 'node' | 'browser';
  readonly executionTimestamp: string;
  readonly os?: string;
  readonly architecture?: string;
  readonly nodeVersion?: string;
  readonly browserName?: string;
  readonly browserVersion?: string;
  readonly userAgent?: string;
  readonly cpuModel?: string;
  readonly logicalCores?: number;
  readonly repositoryCommit?: string;
}

/**
 * Complete, lossless exported benchmark report containing measured trials only.
 *
 * Warmups and intermediate telemetry are intentionally absent; `trials` is the
 * source record from which the summary is derived.
 */
export interface BenchmarkReport {
  readonly schemaVersion: '1';
  readonly config: BenchmarkSuiteConfig;
  readonly environment: EnvironmentProvenance;
  readonly cases: readonly BenchmarkCase[];
  readonly trials: readonly BenchmarkTrialResult[];
  readonly summary: BenchmarkSummary;
}
