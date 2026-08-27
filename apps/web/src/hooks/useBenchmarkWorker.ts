import { useCallback, useEffect, useRef, useState } from 'react';
import type { BenchmarkSuiteConfig } from '@gearcube/benchmark';
import {
  beginBenchmark,
  cancelActiveBenchmark,
  failActiveBenchmark,
  INITIAL_BENCHMARK_WORKER_STATE,
  reduceBenchmarkWorkerMessage,
  type BenchmarkWorkerState,
} from '../components/research/benchmark-worker-controller.js';
import type {
  BenchmarkWorkerInboundMessage,
  BenchmarkWorkerOutboundMessage,
} from '../components/research/benchmark-worker-protocol.js';

export interface UseBenchmarkWorkerResult {
  readonly state: BenchmarkWorkerState;
  readonly startBenchmark: (config: BenchmarkSuiteConfig) => void;
  readonly cancelBenchmark: () => void;
}

/**
 * React hook owning the browser Web Worker lifecycle for Gear Cube benchmark suite execution.
 *
 * Enforces:
 * - One Worker instance per benchmark suite run
 * - Immediate termination and supersession of previous benchmark runs
 * - Monotonic decimal string request IDs
 * - Stale message and error isolation
 * - Clean unmount disposal
 */
export function useBenchmarkWorker(): UseBenchmarkWorkerResult {
  const [state, setState] = useState<BenchmarkWorkerState>(
    INITIAL_BENCHMARK_WORKER_STATE
  );
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

  const cancelBenchmark = useCallback((): void => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    activeRequestIdRef.current = null;
    setState((prev) => cancelActiveBenchmark(prev));
  }, []);

  const startBenchmark = useCallback(
    (config: BenchmarkSuiteConfig): void => {
      // 1. Terminate existing worker if present and invalidate prior lifecycle
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      // 2. Advance monotonic request counter and create request ID
      requestCounterRef.current += 1;
      const requestId = String(requestCounterRef.current);
      activeRequestIdRef.current = requestId;

      // 3. Transition controller state to ACTIVE
      setState((prev) => beginBenchmark(prev, requestId, config));

      try {
        // 4. Construct fresh module Web Worker instance
        const WorkerConstructor = Worker;
        const worker = new WorkerConstructor(
          new URL('../workers/benchmark.worker.ts', import.meta.url),
          { type: 'module' }
        );
        workerRef.current = worker;

        // 5. Register outbound message listener
        worker.onmessage = (
          event: MessageEvent<BenchmarkWorkerOutboundMessage>
        ): void => {
          if (!isMountedRef.current) return;
          const msg = event.data;

          // Verify message belongs to current active request
          if (msg.requestId !== activeRequestIdRef.current) {
            return;
          }

          // Reduce controller state
          setState((prev) => reduceBenchmarkWorkerMessage(prev, msg));

          // Terminal cleanup: terminate worker and clear reference
          if (
            msg.type === 'BENCHMARK_COMPLETE' ||
            msg.type === 'BENCHMARK_ERROR'
          ) {
            if (workerRef.current === worker) {
              worker.terminate();
              workerRef.current = null;
              activeRequestIdRef.current = null;
            }
          }
        };

        // 6. Register error listener
        worker.onerror = (errorEvent: ErrorEvent): void => {
          if (!isMountedRef.current) return;
          if (activeRequestIdRef.current !== requestId) return;

          const errorMsg =
            errorEvent.message ||
            'Web Worker execution encountered an unhandled error';
          setState((prev) =>
            failActiveBenchmark(prev, requestId, errorMsg, 'RUNTIME_ERROR')
          );

          if (workerRef.current === worker) {
            worker.terminate();
            workerRef.current = null;
            activeRequestIdRef.current = null;
          }
        };

        // 7. Post START_BENCHMARK inbound message
        const inboundMessage: BenchmarkWorkerInboundMessage = {
          type: 'START_BENCHMARK',
          requestId,
          config,
        };

        worker.postMessage(inboundMessage);
      } catch (error) {
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        activeRequestIdRef.current = null;

        const errorMsg = error instanceof Error ? error.message : String(error);
        setState((prev) =>
          failActiveBenchmark(prev, requestId, errorMsg, 'RUNTIME_ERROR')
        );
      }
    },
    []
  );

  return {
    state,
    startBenchmark,
    cancelBenchmark,
  };
}
