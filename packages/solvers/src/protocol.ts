/**
 * @file protocol.ts
 * @description Serializable host/Worker messages for one-shot solver jobs.
 * @remarks
 * The host echoes one `requestId` through every response so controllers can
 * reject stale messages. `SEARCH_COMPLETE`, `SEARCH_LIMIT_REACHED`, and
 * `SEARCH_ERROR` are terminal outcomes for the request. There is intentionally
 * no in-band cancel message: the host owns cancellation by terminating the
 * Worker instance, then starts a new instance for the next search.
 */

import type { GearCubeState } from '@gearcube/core';
import type {
  SolverAlgorithm,
  SearchTelemetry,
  SolveSuccess,
  SolveLimitReached,
} from './types.js';

/** Host-to-Worker request starting one solver search. */
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

/** Worker-to-host lifecycle, progress, and terminal responses for a request. */
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
