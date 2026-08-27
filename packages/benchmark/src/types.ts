import type { Move } from '@gearcube/core';
import type { SolverAlgorithm } from '@gearcube/solvers';

/**
 * Configuration schema for an empirical benchmark run.
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
 * Deterministically sampled benchmark case with state-derived stable identifier.
 */
export interface BenchmarkCase {
  readonly caseId: string;
  readonly stateKey: string;
  readonly exactDepth: number;
}

/**
 * Common base fields for measured solver trial execution results.
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
 * Solved trial execution result.
 */
export interface BenchmarkSolvedTrial extends BenchmarkTrialBase {
  readonly status: 'SOLVED';
  readonly solutionDepth: number;
  readonly solutionMoves: readonly Move[];
}

/**
 * Limit reached trial execution result.
 */
export interface BenchmarkLimitTrial extends BenchmarkTrialBase {
  readonly status: 'LIMIT_REACHED';
  readonly limitReason: 'MAX_NODES' | 'MAX_DEPTH';
}

/**
 * Individual measured algorithm trial result (discriminated union).
 */
export type BenchmarkTrialResult = BenchmarkSolvedTrial | BenchmarkLimitTrial;

/**
 * Summary metrics aggregated by depth for an individual algorithm.
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
 * Summary metrics aggregated across an entire suite for an algorithm.
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
 * Complete benchmark summary.
 */
export interface BenchmarkSummary {
  readonly totalCases: number;
  readonly totalTrials: number;
  readonly algorithms: readonly AlgorithmSummary[];
}

/**
 * Non-normative host and runtime provenance metadata.
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
 * Complete, lossless exported benchmark report (contains measured trials only).
 */
export interface BenchmarkReport {
  readonly schemaVersion: '1';
  readonly config: BenchmarkSuiteConfig;
  readonly environment: EnvironmentProvenance;
  readonly cases: readonly BenchmarkCase[];
  readonly trials: readonly BenchmarkTrialResult[];
  readonly summary: BenchmarkSummary;
}
