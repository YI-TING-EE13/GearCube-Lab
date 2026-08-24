import type {
  SearchTelemetry,
  SolveLimitReached,
  SolveSuccess,
  SolverAlgorithm,
  WorkerOutboundMessage,
} from '@gearcube/solvers';

export type SolverWorkerStatus =
  | 'IDLE'
  | 'ACTIVE'
  | 'SOLVED'
  | 'LIMIT_REACHED'
  | 'ERROR';

export interface SolverWorkerIdleState {
  readonly status: 'IDLE';
}

export interface SolverWorkerActiveState {
  readonly status: 'ACTIVE';
  readonly requestId: string;
  readonly algorithm: SolverAlgorithm;
  readonly searchStartStateKey: string;
  readonly latestTelemetry: SearchTelemetry | null;
}

export interface SolverWorkerSolvedState {
  readonly status: 'SOLVED';
  readonly requestId: string;
  readonly searchStartStateKey: string;
  readonly result: SolveSuccess;
}

export interface SolverWorkerLimitReachedState {
  readonly status: 'LIMIT_REACHED';
  readonly requestId: string;
  readonly searchStartStateKey: string;
  readonly result: SolveLimitReached;
}

export interface SolverWorkerErrorState {
  readonly status: 'ERROR';
  readonly requestId: string;
  readonly searchStartStateKey: string;
  readonly error: string;
}

export type SolverWorkerState =
  | SolverWorkerIdleState
  | SolverWorkerActiveState
  | SolverWorkerSolvedState
  | SolverWorkerLimitReachedState
  | SolverWorkerErrorState;

export const INITIAL_SOLVER_WORKER_STATE: SolverWorkerIdleState = Object.freeze({
  status: 'IDLE',
});

/**
 * Pure transition initiating a new search lifecycle and superseding prior state.
 */
export function beginSearch(
  _previousState: SolverWorkerState,
  requestId: string,
  algorithm: SolverAlgorithm,
  searchStartStateKey: string
): SolverWorkerActiveState {
  return {
    status: 'ACTIVE',
    requestId,
    algorithm,
    searchStartStateKey,
    latestTelemetry: null,
  };
}

/**
 * Pure message reduction enforcing strict request ID validation and stale-message rejection.
 */
export function reduceWorkerMessage(
  controllerState: SolverWorkerState,
  message: WorkerOutboundMessage
): SolverWorkerState {
  if (controllerState.status !== 'ACTIVE') {
    return controllerState;
  }

  if (message.requestId !== controllerState.requestId) {
    return controllerState;
  }

  switch (message.type) {
    case 'SEARCH_STARTED':
      return controllerState;

    case 'SEARCH_PROGRESS':
      return {
        ...controllerState,
        latestTelemetry: message.telemetry,
      };

    case 'SEARCH_COMPLETE':
      return {
        status: 'SOLVED',
        requestId: controllerState.requestId,
        searchStartStateKey: controllerState.searchStartStateKey,
        result: message.result,
      };

    case 'SEARCH_LIMIT_REACHED':
      return {
        status: 'LIMIT_REACHED',
        requestId: controllerState.requestId,
        searchStartStateKey: controllerState.searchStartStateKey,
        result: message.result,
      };

    case 'SEARCH_ERROR':
      return {
        status: 'ERROR',
        requestId: controllerState.requestId,
        searchStartStateKey: controllerState.searchStartStateKey,
        error: message.error,
      };

    default: {
      const _exhaustiveCheck: never = message;
      return controllerState;
    }
  }
}

/**
 * Pure transition canceling an active search and resetting the controller to IDLE.
 */
export function cancelActiveSearch(
  _state: SolverWorkerState
): SolverWorkerIdleState {
  return INITIAL_SOLVER_WORKER_STATE;
}

/**
 * Pure transition recording a local main-thread Worker execution error.
 * Only modifies state if the controller is ACTIVE and the request ID matches.
 */
export function failActiveSearch(
  state: SolverWorkerState,
  requestId: string,
  error: string
): SolverWorkerState {
  if (state.status === 'ACTIVE' && state.requestId === requestId) {
    return {
      status: 'ERROR',
      requestId: state.requestId,
      searchStartStateKey: state.searchStartStateKey,
      error,
    };
  }
  return state;
}
