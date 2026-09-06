import type { Move } from '@gearcube/core';

/** Canonical solver identity used by results, progress telemetry, and benchmarks. */
export type SolverAlgorithm = 'BFS' | 'BIDIRECTIONAL_BFS' | 'IDA_STAR';

/**
 * Cumulative search counters reported by a solver run.
 *
 * `nodesExpanded` counts search nodes whose successors were examined;
 * `nodesGenerated` counts successor states produced while searching. The
 * counters are algorithm-specific observations, not a wall-clock metric.
 */
export interface SearchCounters {
  readonly nodesExpanded: number;
  readonly nodesGenerated: number;
}

/**
 * Algorithm-specific progress snapshot delivered to `SolverOptions.onProgress`.
 *
 * The `algorithm` discriminant selects the depth fields. `elapsedMs` is the
 * non-negative wall-clock duration observed by the implementation, while the
 * node counters are cumulative for the current run. Implementations emit a
 * snapshot when `nodesExpanded` reaches a multiple of `progressIntervalNodes`.
 */
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

/** Successful terminal result containing a shortest solution under the canonical 12-move metric. */
export interface SolveSuccess {
  readonly status: 'SOLVED';
  readonly algorithm: SolverAlgorithm;
  readonly moves: readonly Move[];
  readonly depth: number;
  readonly counters: SearchCounters;
  readonly elapsedMs: number;
}

/**
 * Terminal result returned when a configured search limit prevents completion.
 *
 * No solution sequence is included because the search did not produce an
 * accepted terminal solution; `limit` identifies whether node expansion or
 * solution depth stopped the run.
 */
export interface SolveLimitReached {
  readonly status: 'LIMIT_REACHED';
  readonly algorithm: SolverAlgorithm;
  readonly limit: 'MAX_NODES' | 'MAX_DEPTH';
  readonly counters: SearchCounters;
  readonly elapsedMs: number;
}

/** Union of the two terminal solver outcomes. */
export type SolveResult = SolveSuccess | SolveLimitReached;

/**
 * Optional limits and progress callback shared by all solver implementations.
 *
 * `maxNodes` and `progressIntervalNodes` must be positive integers; `maxDepth`
 * must be a non-negative integer. If omitted, limits are unbounded and progress
 * cadence defaults to 500 expanded nodes. `onProgress` is observational and
 * does not alter the search result.
 */
export interface SolverOptions {
  readonly maxNodes?: number;
  readonly maxDepth?: number;
  readonly progressIntervalNodes?: number;
  readonly onProgress?: (telemetry: SearchTelemetry) => void;
}
