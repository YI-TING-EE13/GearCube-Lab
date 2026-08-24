import { useCallback, useEffect, useRef, useState } from 'react';
import { serializeLogicalState, type GearCubeState } from '@gearcube/core';
import type {
  SolverAlgorithm,
  SolverOptions,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from '@gearcube/solvers';
import {
  beginSearch,
  cancelActiveSearch,
  failActiveSearch,
  INITIAL_SOLVER_WORKER_STATE,
  reduceWorkerMessage,
  type SolverWorkerState,
} from '../components/solver/solver-worker-controller.js';

export type WorkerSafeSolverOptions = Omit<SolverOptions, 'onProgress'>;

export interface UseSolverWorkerResult {
  readonly state: SolverWorkerState;
  readonly startSearch: (
    algorithm: SolverAlgorithm,
    state: GearCubeState,
    options?: WorkerSafeSolverOptions
  ) => void;
  readonly cancelSearch: () => void;
}

/**
 * React hook owning the browser Web Worker lifecycle for Gear Cube solver execution.
 *
 * Enforces:
 * - One Worker instance per search
 * - Immediate termination and supersession of previous searches
 * - Monotonic decimal string request IDs
 * - Stale message and error isolation
 * - Clean unmount disposal
 */
export function useSolverWorker(): UseSolverWorkerResult {
  const [state, setState] = useState<SolverWorkerState>(INITIAL_SOLVER_WORKER_STATE);
  const workerRef = useRef<Worker | null>(null);
  const requestCounterRef = useRef<number>(0);
  const activeRequestIdRef = useRef<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      activeRequestIdRef.current = null;
    };
  }, []);

  const cancelSearch = useCallback((): void => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    activeRequestIdRef.current = null;
    setState((prev) => cancelActiveSearch(prev));
  }, []);

  const startSearch = useCallback(
    (
      algorithm: SolverAlgorithm,
      searchState: GearCubeState,
      options?: WorkerSafeSolverOptions
    ): void => {
      // 1. Terminate existing worker if present and invalidate prior lifecycle
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      // 2. Advance monotonic request counter and create request ID
      requestCounterRef.current += 1;
      const requestId = String(requestCounterRef.current);
      activeRequestIdRef.current = requestId;

      // 3. Compute deterministic search start state key
      const searchStartStateKey = serializeLogicalState(searchState);

      // 4. Transition controller state to ACTIVE
      setState((prev) =>
        beginSearch(prev, requestId, algorithm, searchStartStateKey)
      );

      // 5. Construct fresh Web Worker instance
      const worker = new Worker(
        new URL('../workers/solver.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      // 6. Register outbound message listener
      worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>): void => {
        if (!isMountedRef.current) return;
        const msg = event.data;

        // Verify message belongs to current active request
        if (msg.requestId !== activeRequestIdRef.current) {
          return;
        }

        // Reduce controller state
        setState((prev) => reduceWorkerMessage(prev, msg));

        // Terminal cleanup: terminate worker and clear reference
        if (
          msg.type === 'SEARCH_COMPLETE' ||
          msg.type === 'SEARCH_LIMIT_REACHED' ||
          msg.type === 'SEARCH_ERROR'
        ) {
          if (workerRef.current === worker) {
            worker.terminate();
            workerRef.current = null;
            activeRequestIdRef.current = null;
          }
        }
      };

      // 7. Register error listener
      worker.onerror = (errorEvent: ErrorEvent): void => {
        if (!isMountedRef.current) return;
        if (activeRequestIdRef.current !== requestId) return;

        const errorMsg =
          errorEvent.message ||
          'Web Worker execution encountered an unhandled error';
        setState((prev) => failActiveSearch(prev, requestId, errorMsg));

        if (workerRef.current === worker) {
          worker.terminate();
          workerRef.current = null;
          activeRequestIdRef.current = null;
        }
      };

      // 8. Post START_SEARCH inbound message
      const inboundMessage: WorkerInboundMessage = {
        type: 'START_SEARCH',
        requestId,
        algorithm,
        state: searchState,
        ...(options !== undefined ? { options } : {}),
      };

      worker.postMessage(inboundMessage);
    },
    []
  );

  return {
    state,
    startSearch,
    cancelSearch,
  };
}
