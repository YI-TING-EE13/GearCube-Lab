import type { GearCubeState } from '@gearcube/core';
import type {
  SolverAlgorithm,
  SearchTelemetry,
  SolveSuccess,
  SolveLimitReached,
} from './types.js';

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
