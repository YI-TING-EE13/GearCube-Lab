import type { Move } from '@gearcube/core';

export type SolverAlgorithm = 'BFS' | 'BIDIRECTIONAL_BFS' | 'IDA_STAR';

export interface SearchCounters {
  readonly nodesExpanded: number;
  readonly nodesGenerated: number;
}

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
