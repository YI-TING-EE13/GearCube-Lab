import type {
  BenchmarkSuiteConfig,
  BenchmarkSummary,
  EnvironmentProvenance,
} from '@gearcube/benchmark';
import type {
  BenchmarkErrorKind,
  BenchmarkWorkerOutboundMessage,
} from './benchmark-worker-protocol.js';

export type BenchmarkWorkerStatus =
  | 'IDLE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ERROR';

export interface BenchmarkWorkerIdleState {
  readonly status: 'IDLE';
}

export interface BenchmarkWorkerActiveState {
  readonly status: 'ACTIVE';
  readonly requestId: string;
  readonly config: BenchmarkSuiteConfig;
}

export interface BenchmarkWorkerCompletedState {
  readonly status: 'COMPLETED';
  readonly requestId: string;
  readonly config: BenchmarkSuiteConfig;
  readonly environment: EnvironmentProvenance;
  readonly summary: BenchmarkSummary;
  readonly jsonText: string;
  readonly csvText: string;
}

export interface BenchmarkWorkerCancelledState {
  readonly status: 'CANCELLED';
  readonly requestId: string;
}

export interface BenchmarkWorkerErrorState {
  readonly status: 'ERROR';
  readonly requestId: string;
  readonly error: string;
  readonly errorKind: BenchmarkErrorKind;
}

export type BenchmarkWorkerState =
  | BenchmarkWorkerIdleState
  | BenchmarkWorkerActiveState
  | BenchmarkWorkerCompletedState
  | BenchmarkWorkerCancelledState
  | BenchmarkWorkerErrorState;

export const INITIAL_BENCHMARK_WORKER_STATE: BenchmarkWorkerIdleState = Object.freeze({
  status: 'IDLE',
});

/**
 * Pure transition initiating a new benchmark lifecycle and superseding any prior state.
 */
export function beginBenchmark(
  _previousState: BenchmarkWorkerState,
  requestId: string,
  config: BenchmarkSuiteConfig
): BenchmarkWorkerActiveState {
  return {
    status: 'ACTIVE',
    requestId,
    config,
  };
}

/**
 * Pure message reduction enforcing strict request ID validation and stale-message rejection.
 */
export function reduceBenchmarkWorkerMessage(
  state: BenchmarkWorkerState,
  message: BenchmarkWorkerOutboundMessage
): BenchmarkWorkerState {
  if (state.status !== 'ACTIVE') {
    return state;
  }

  if (message.requestId !== state.requestId) {
    return state;
  }

  switch (message.type) {
    case 'BENCHMARK_STARTED':
      return state;

    case 'BENCHMARK_COMPLETE':
      return {
        status: 'COMPLETED',
        requestId: state.requestId,
        config: message.validatedConfig,
        environment: message.environment,
        summary: message.summary,
        jsonText: message.jsonText,
        csvText: message.csvText,
      };

    case 'BENCHMARK_ERROR':
      return {
        status: 'ERROR',
        requestId: state.requestId,
        error: message.error,
        errorKind: message.errorKind,
      };

    default: {
      const _exhaustiveCheck: never = message;
      return state;
    }
  }
}

/**
 * Pure transition canceling an active benchmark and transitioning to CANCELLED.
 */
export function cancelActiveBenchmark(
  state: BenchmarkWorkerState
): BenchmarkWorkerState {
  if (state.status === 'ACTIVE') {
    return {
      status: 'CANCELLED',
      requestId: state.requestId,
    };
  }
  return state;
}

/**
 * Pure transition recording a local main-thread Worker execution error.
 * Only modifies state if the controller is ACTIVE and the request ID matches.
 */
export function failActiveBenchmark(
  state: BenchmarkWorkerState,
  requestId: string,
  error: string,
  errorKind: BenchmarkErrorKind = 'RUNTIME_ERROR'
): BenchmarkWorkerState {
  if (state.status === 'ACTIVE' && state.requestId === requestId) {
    return {
      status: 'ERROR',
      requestId: state.requestId,
      error,
      errorKind,
    };
  }
  return state;
}
