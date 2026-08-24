import { describe, expect, it } from 'vitest';
import type {
  SearchTelemetry,
  SolveLimitReached,
  SolveSuccess,
  WorkerOutboundMessage,
} from '@gearcube/solvers';
import {
  beginSearch,
  cancelActiveSearch,
  failActiveSearch,
  INITIAL_SOLVER_WORKER_STATE,
  reduceWorkerMessage,
  type SolverWorkerState,
} from './solver-worker-controller.js';

describe('Phase 4D — Solver Worker Controller Pure State Machine', () => {
  const dummyStateKey = 'C:0|X:0.0|Y:0.0|Z:0.0';

  const mockTelemetry1: SearchTelemetry = {
    algorithm: 'IDA_STAR',
    nodesExpanded: 100,
    nodesGenerated: 1200,
    elapsedMs: 50,
    threshold: 4,
    currentDepth: 3,
  };

  const mockTelemetry2: SearchTelemetry = {
    algorithm: 'IDA_STAR',
    nodesExpanded: 200,
    nodesGenerated: 2400,
    elapsedMs: 100,
    threshold: 6,
    currentDepth: 5,
  };

  const mockSuccess: SolveSuccess = {
    status: 'SOLVED',
    algorithm: 'IDA_STAR',
    moves: [{ face: 'U', direction: 'CW' }],
    depth: 1,
    counters: { nodesExpanded: 10, nodesGenerated: 120 },
    elapsedMs: 5,
  };

  const mockLimitReached: SolveLimitReached = {
    status: 'LIMIT_REACHED',
    algorithm: 'BFS',
    limit: 'MAX_NODES',
    counters: { nodesExpanded: 1000, nodesGenerated: 12000 },
    elapsedMs: 400,
  };

  it('starts in INITIAL_SOLVER_WORKER_STATE with status IDLE', () => {
    expect(INITIAL_SOLVER_WORKER_STATE.status).toBe('IDLE');
  });

  it('transitions from IDLE to ACTIVE via beginSearch with empty telemetry and preserved metadata', () => {
    const active = beginSearch(INITIAL_SOLVER_WORKER_STATE, '1', 'IDA_STAR', dummyStateKey);
    expect(active.status).toBe('ACTIVE');
    expect(active.requestId).toBe('1');
    expect(active.algorithm).toBe('IDA_STAR');
    expect(active.searchStartStateKey).toBe(dummyStateKey);
    expect(active.latestTelemetry).toBeNull();
  });

  it('handles matching SEARCH_STARTED by remaining ACTIVE without resetting state', () => {
    const active = beginSearch(INITIAL_SOLVER_WORKER_STATE, '1', 'IDA_STAR', dummyStateKey);
    const msg: WorkerOutboundMessage = {
      type: 'SEARCH_STARTED',
      requestId: '1',
    };
    const next = reduceWorkerMessage(active, msg);
    expect(next.status).toBe('ACTIVE');
    expect(next).toEqual(active);
  });

  it('handles matching SEARCH_PROGRESS by updating latestTelemetry', () => {
    const active = beginSearch(INITIAL_SOLVER_WORKER_STATE, '1', 'IDA_STAR', dummyStateKey);
    const msg1: WorkerOutboundMessage = {
      type: 'SEARCH_PROGRESS',
      requestId: '1',
      telemetry: mockTelemetry1,
    };
    const stateWithProg1 = reduceWorkerMessage(active, msg1);
    expect(stateWithProg1.status).toBe('ACTIVE');
    if (stateWithProg1.status === 'ACTIVE') {
      expect(stateWithProg1.latestTelemetry).toEqual(mockTelemetry1);
    }

    const msg2: WorkerOutboundMessage = {
      type: 'SEARCH_PROGRESS',
      requestId: '1',
      telemetry: mockTelemetry2,
    };
    const stateWithProg2 = reduceWorkerMessage(stateWithProg1, msg2);
    if (stateWithProg2.status === 'ACTIVE') {
      expect(stateWithProg2.latestTelemetry).toEqual(mockTelemetry2);
    }
  });

  it('ignores stale SEARCH_STARTED, SEARCH_PROGRESS, SEARCH_COMPLETE, SEARCH_LIMIT_REACHED, and SEARCH_ERROR', () => {
    const active = beginSearch(INITIAL_SOLVER_WORKER_STATE, '2', 'BFS', dummyStateKey);

    const staleMessages: WorkerOutboundMessage[] = [
      { type: 'SEARCH_STARTED', requestId: '1' },
      { type: 'SEARCH_PROGRESS', requestId: '1', telemetry: mockTelemetry1 },
      { type: 'SEARCH_COMPLETE', requestId: '1', result: mockSuccess },
      { type: 'SEARCH_LIMIT_REACHED', requestId: '1', result: mockLimitReached },
      { type: 'SEARCH_ERROR', requestId: '1', error: 'Old failure' },
    ];

    for (const staleMsg of staleMessages) {
      const result = reduceWorkerMessage(active, staleMsg);
      expect(result).toBe(active);
      expect(result.status).toBe('ACTIVE');
      if (result.status === 'ACTIVE') {
        expect(result.requestId).toBe('2');
        expect(result.latestTelemetry).toBeNull();
      }
    }
  });

  it('transitions to SOLVED on matching SEARCH_COMPLETE with preserved metadata', () => {
    const active = beginSearch(INITIAL_SOLVER_WORKER_STATE, '3', 'IDA_STAR', dummyStateKey);
    const completeMsg: WorkerOutboundMessage = {
      type: 'SEARCH_COMPLETE',
      requestId: '3',
      result: mockSuccess,
    };
    const solved = reduceWorkerMessage(active, completeMsg);
    expect(solved.status).toBe('SOLVED');
    if (solved.status === 'SOLVED') {
      expect(solved.requestId).toBe('3');
      expect(solved.searchStartStateKey).toBe(dummyStateKey);
      expect(solved.result).toEqual(mockSuccess);
    }
  });

  it('transitions to LIMIT_REACHED on matching SEARCH_LIMIT_REACHED with preserved metadata', () => {
    const active = beginSearch(INITIAL_SOLVER_WORKER_STATE, '4', 'BFS', dummyStateKey);
    const limitMsg: WorkerOutboundMessage = {
      type: 'SEARCH_LIMIT_REACHED',
      requestId: '4',
      result: mockLimitReached,
    };
    const limitReached = reduceWorkerMessage(active, limitMsg);
    expect(limitReached.status).toBe('LIMIT_REACHED');
    if (limitReached.status === 'LIMIT_REACHED') {
      expect(limitReached.requestId).toBe('4');
      expect(limitReached.searchStartStateKey).toBe(dummyStateKey);
      expect(limitReached.result).toEqual(mockLimitReached);
    }
  });

  it('transitions to ERROR on matching SEARCH_ERROR with preserved metadata', () => {
    const active = beginSearch(INITIAL_SOLVER_WORKER_STATE, '5', 'BIDIRECTIONAL_BFS', dummyStateKey);
    const errorMsg: WorkerOutboundMessage = {
      type: 'SEARCH_ERROR',
      requestId: '5',
      error: 'Search failed in worker',
    };
    const errorState = reduceWorkerMessage(active, errorMsg);
    expect(errorState.status).toBe('ERROR');
    if (errorState.status === 'ERROR') {
      expect(errorState.requestId).toBe('5');
      expect(errorState.searchStartStateKey).toBe(dummyStateKey);
      expect(errorState.error).toBe('Search failed in worker');
    }
  });

  it('ignores any worker messages when controller is in a terminal state or IDLE', () => {
    const solvedState: SolverWorkerState = {
      status: 'SOLVED',
      requestId: '6',
      searchStartStateKey: dummyStateKey,
      result: mockSuccess,
    };

    const lateMsg: WorkerOutboundMessage = {
      type: 'SEARCH_PROGRESS',
      requestId: '6',
      telemetry: mockTelemetry1,
    };

    expect(reduceWorkerMessage(solvedState, lateMsg)).toBe(solvedState);
    expect(reduceWorkerMessage(INITIAL_SOLVER_WORKER_STATE, lateMsg)).toBe(INITIAL_SOLVER_WORKER_STATE);
  });

  it('cancels active search and resets controller to IDLE', () => {
    const active = beginSearch(INITIAL_SOLVER_WORKER_STATE, '7', 'IDA_STAR', dummyStateKey);
    const idle = cancelActiveSearch(active);
    expect(idle.status).toBe('IDLE');
  });

  it('handles failActiveSearch for matching request ID and ignores stale request IDs', () => {
    const active = beginSearch(INITIAL_SOLVER_WORKER_STATE, '8', 'IDA_STAR', dummyStateKey);

    // Stale failure ignored
    const staleIgnored = failActiveSearch(active, '7', 'Old worker error');
    expect(staleIgnored).toBe(active);

    // Matching failure accepted
    const failed = failActiveSearch(active, '8', 'Worker crashed');
    expect(failed.status).toBe('ERROR');
    if (failed.status === 'ERROR') {
      expect(failed.requestId).toBe('8');
      expect(failed.searchStartStateKey).toBe(dummyStateKey);
      expect(failed.error).toBe('Worker crashed');
    }
  });

  it('preserves immutability of previous state objects across operations', () => {
    const initial = Object.freeze({ status: 'IDLE' as const });
    const active = Object.freeze(beginSearch(initial, '9', 'IDA_STAR', dummyStateKey));

    const progressMsg: WorkerOutboundMessage = {
      type: 'SEARCH_PROGRESS',
      requestId: '9',
      telemetry: mockTelemetry1,
    };
    const withProgress = Object.freeze(reduceWorkerMessage(active, progressMsg));

    const completeMsg: WorkerOutboundMessage = {
      type: 'SEARCH_COMPLETE',
      requestId: '9',
      result: mockSuccess,
    };
    const completed = reduceWorkerMessage(withProgress, completeMsg);

    expect(initial.status).toBe('IDLE');
    expect(active.status).toBe('ACTIVE');
    expect(active.latestTelemetry).toBeNull();
    expect(withProgress.status).toBe('ACTIVE');
    expect(completed.status).toBe('SOLVED');
  });
});
