/**
 * @file benchmark browser Worker entrypoint
 * @description One-shot browser Worker adapter for empirical benchmark runs.
 * @remarks
 * The main thread supplies one configuration request and owns cancellation
 * by terminating the Worker. This adapter gathers browser environment
 * provenance, runs the benchmark suite, and serializes the lossless report;
 * it does not persist benchmark state between requests. `requestId` is echoed
 * on every response for stale-message rejection, while configuration failures
 * and runtime failures remain distinct protocol outcomes.
 */

import {
  BenchmarkConfigError,
  runBenchmarkSuite,
  serializeBenchmarkReportJson,
  serializeBenchmarkReportCsv,
  type EnvironmentProvenance,
} from '@gearcube/benchmark';
import type {
  BenchmarkWorkerInboundMessage,
  BenchmarkWorkerOutboundMessage,
} from '../components/research/benchmark-worker-protocol.js';

let hasExecuted = false;

function postOutboundMessage(msg: BenchmarkWorkerOutboundMessage): void {
  self.postMessage(msg);
}

self.onmessage = (event: MessageEvent<BenchmarkWorkerInboundMessage>): void => {
  const msg = event.data;

  if (msg.type !== 'START_BENCHMARK') {
    return;
  }

  const { requestId, config } = msg;

  if (hasExecuted) {
    postOutboundMessage({
      type: 'BENCHMARK_ERROR',
      requestId,
      error: 'Worker instance has already executed a benchmark job. Each benchmark requires a new Worker instance.',
      errorKind: 'RUNTIME_ERROR',
    });
    return;
  }

  hasExecuted = true;

  try {
    postOutboundMessage({
      type: 'BENCHMARK_STARTED',
      requestId,
    });

    const environment: EnvironmentProvenance = {
      platform: 'browser',
      executionTimestamp: new Date().toISOString(),
      ...(typeof navigator !== 'undefined' &&
      typeof navigator.userAgent === 'string' &&
      navigator.userAgent.length > 0
        ? { userAgent: navigator.userAgent }
        : {}),
      ...(typeof navigator !== 'undefined' &&
      Number.isFinite(navigator.hardwareConcurrency) &&
      Number.isInteger(navigator.hardwareConcurrency) &&
      navigator.hardwareConcurrency > 0
        ? { logicalCores: navigator.hardwareConcurrency }
        : {}),
    };

    const report = runBenchmarkSuite(config, environment);
    const jsonText = serializeBenchmarkReportJson(report);
    const csvText = serializeBenchmarkReportCsv(report);

    postOutboundMessage({
      type: 'BENCHMARK_COMPLETE',
      requestId,
      validatedConfig: report.config,
      environment: report.environment,
      summary: report.summary,
      jsonText,
      csvText,
    });
  } catch (error) {
    const isConfigError = error instanceof BenchmarkConfigError;
    postOutboundMessage({
      type: 'BENCHMARK_ERROR',
      requestId,
      error: error instanceof Error ? error.message : String(error),
      errorKind: isConfigError ? 'CONFIG_ERROR' : 'RUNTIME_ERROR',
    });
  }
};
