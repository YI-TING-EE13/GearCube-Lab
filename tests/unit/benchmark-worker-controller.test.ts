import { describe, it, expect } from 'vitest';
import type {
  BenchmarkSuiteConfig,
  BenchmarkSummary,
  EnvironmentProvenance,
} from '@gearcube/benchmark';
import {
  INITIAL_BENCHMARK_WORKER_STATE,
  beginBenchmark,
  reduceBenchmarkWorkerMessage,
  cancelActiveBenchmark,
  failActiveBenchmark,
  type BenchmarkWorkerState,
  type BenchmarkWorkerCompletedState,
  type BenchmarkWorkerErrorState,
  type BenchmarkWorkerCancelledState,
} from '../../apps/web/src/components/research/benchmark-worker-controller.js';
import type {
  BenchmarkCompleteMessage,
  BenchmarkErrorMessage,
  BenchmarkStartedMessage,
} from '../../apps/web/src/components/research/benchmark-worker-protocol.js';
import {
  sanitizeBenchmarkSuiteIdForFilename,
  buildBenchmarkDownloadFilename,
} from '../../apps/web/src/components/research/download-helper.js';

const MOCK_CONFIG: BenchmarkSuiteConfig = {
  schemaVersion: '1',
  suiteId: 'test-suite-v1',
  seed: 'test-seed',
  exactDepths: [1, 2],
  casesPerDepth: 2,
  algorithms: ['BFS', 'IDA_STAR'],
  warmupRuns: 0,
  measuredRuns: 1,
};

const MOCK_ENVIRONMENT: EnvironmentProvenance = {
  platform: 'browser',
  executionTimestamp: '2026-08-27T19:00:00.000Z',
  userAgent: 'Mozilla/5.0 TestBrowser',
  logicalCores: 8,
};

const MOCK_SUMMARY: BenchmarkSummary = {
  totalCases: 4,
  totalTrials: 8,
  algorithms: [
    {
      algorithm: 'BFS',
      byDepth: [
        {
          exactDepth: 1,
          totalTrials: 2,
          solvedCount: 2,
          limitCount: 0,
          meanNodesExpanded: 3.5,
          medianNodesExpanded: 3.5,
          meanNodesGenerated: 18.0,
          medianNodesGenerated: 18.0,
          meanElapsedMs: 0.5,
          medianElapsedMs: 0.5,
        },
      ],
      totalSolved: 2,
      totalLimits: 0,
      overallMeanNodesExpanded: 3.5,
      overallMedianElapsedMs: 0.5,
    },
  ],
};

describe('Phase 5D Benchmark Worker Controller Pure Lifecycle State Machine', () => {
  it('INITIAL_STATE: starts in IDLE status', () => {
    expect(INITIAL_BENCHMARK_WORKER_STATE).toEqual({ status: 'IDLE' });
  });

  it('BEGIN_FROM_IDLE: transitions IDLE to ACTIVE storing requestId and config', () => {
    const active = beginBenchmark(INITIAL_BENCHMARK_WORKER_STATE, '1', MOCK_CONFIG);
    expect(active).toEqual({
      status: 'ACTIVE',
      requestId: '1',
      config: MOCK_CONFIG,
    });
  });

  it('BEGIN_SUPERSEDES_COMPLETED: transitions COMPLETED to ACTIVE clearing prior result and exports', () => {
    const completed: BenchmarkWorkerCompletedState = {
      status: 'COMPLETED',
      requestId: '1',
      config: MOCK_CONFIG,
      environment: MOCK_ENVIRONMENT,
      summary: MOCK_SUMMARY,
      jsonText: '{"mock":"json"}',
      csvText: 'mock,csv,header',
    };

    const newConfig: BenchmarkSuiteConfig = {
      ...MOCK_CONFIG,
      suiteId: 'new-suite',
    };

    const active = beginBenchmark(completed, '2', newConfig);
    expect(active).toEqual({
      status: 'ACTIVE',
      requestId: '2',
      config: newConfig,
    });
    expect('summary' in active).toBe(false);
    expect('jsonText' in active).toBe(false);
    expect('csvText' in active).toBe(false);
  });

  it('BEGIN_SUPERSEDES_ERROR: transitions ERROR to ACTIVE with fresh requestId and config', () => {
    const errorState: BenchmarkWorkerErrorState = {
      status: 'ERROR',
      requestId: '1',
      error: 'Previous failure',
      errorKind: 'RUNTIME_ERROR',
    };

    const active = beginBenchmark(errorState, '2', MOCK_CONFIG);
    expect(active).toEqual({
      status: 'ACTIVE',
      requestId: '2',
      config: MOCK_CONFIG,
    });
    expect('error' in active).toBe(false);
  });

  it('BEGIN_SUPERSEDES_CANCELLED: transitions CANCELLED to ACTIVE with fresh requestId', () => {
    const cancelledState: BenchmarkWorkerCancelledState = {
      status: 'CANCELLED',
      requestId: '1',
    };

    const active = beginBenchmark(cancelledState, '2', MOCK_CONFIG);
    expect(active).toEqual({
      status: 'ACTIVE',
      requestId: '2',
      config: MOCK_CONFIG,
    });
  });

  it('STARTED_MATCHING_REQUEST_RETAINS_ACTIVE: BENCHMARK_STARTED message preserves ACTIVE state', () => {
    const active = beginBenchmark(INITIAL_BENCHMARK_WORKER_STATE, '1', MOCK_CONFIG);
    const msg: BenchmarkStartedMessage = {
      type: 'BENCHMARK_STARTED',
      requestId: '1',
    };

    const reduced = reduceBenchmarkWorkerMessage(active, msg);
    expect(reduced).toEqual(active);
  });

  it('COMPLETE_MATCHING_REQUEST_TO_COMPLETED: transitions ACTIVE to COMPLETED with payload', () => {
    const active = beginBenchmark(INITIAL_BENCHMARK_WORKER_STATE, '1', MOCK_CONFIG);
    const msg: BenchmarkCompleteMessage = {
      type: 'BENCHMARK_COMPLETE',
      requestId: '1',
      validatedConfig: MOCK_CONFIG,
      environment: MOCK_ENVIRONMENT,
      summary: MOCK_SUMMARY,
      jsonText: '{"schemaVersion":"1"}',
      csvText: 'exact_depth,algorithm,nodes_expanded',
    };

    const completed = reduceBenchmarkWorkerMessage(active, msg);
    expect(completed).toEqual({
      status: 'COMPLETED',
      requestId: '1',
      config: MOCK_CONFIG,
      environment: MOCK_ENVIRONMENT,
      summary: MOCK_SUMMARY,
      jsonText: '{"schemaVersion":"1"}',
      csvText: 'exact_depth,algorithm,nodes_expanded',
    });
  });

  it('COMPLETE_USES_MESSAGE_VALIDATED_CONFIG: uses validatedConfig from message directly', () => {
    const active = beginBenchmark(INITIAL_BENCHMARK_WORKER_STATE, '1', MOCK_CONFIG);
    const modifiedValidatedConfig: BenchmarkSuiteConfig = {
      ...MOCK_CONFIG,
      suiteId: 'validated-suite-id',
    };

    const msg: BenchmarkCompleteMessage = {
      type: 'BENCHMARK_COMPLETE',
      requestId: '1',
      validatedConfig: modifiedValidatedConfig,
      environment: MOCK_ENVIRONMENT,
      summary: MOCK_SUMMARY,
      jsonText: '{}',
      csvText: '',
    };

    const completed = reduceBenchmarkWorkerMessage(active, msg) as BenchmarkWorkerCompletedState;
    expect(completed.config).toEqual(modifiedValidatedConfig);
  });

  it('ERROR_MATCHING_REQUEST_TO_ERROR: transitions ACTIVE to ERROR with error details', () => {
    const active = beginBenchmark(INITIAL_BENCHMARK_WORKER_STATE, '1', MOCK_CONFIG);
    const msg: BenchmarkErrorMessage = {
      type: 'BENCHMARK_ERROR',
      requestId: '1',
      error: 'Corpus capacity exceeded for depth 1',
      errorKind: 'CONFIG_ERROR',
    };

    const errorState = reduceBenchmarkWorkerMessage(active, msg);
    expect(errorState).toEqual({
      status: 'ERROR',
      requestId: '1',
      error: 'Corpus capacity exceeded for depth 1',
      errorKind: 'CONFIG_ERROR',
    });
  });

  it('CANCEL_ACTIVE_TO_CANCELLED: cancels active benchmark and stores requestId', () => {
    const active = beginBenchmark(INITIAL_BENCHMARK_WORKER_STATE, '1', MOCK_CONFIG);
    const cancelled = cancelActiveBenchmark(active);
    expect(cancelled).toEqual({
      status: 'CANCELLED',
      requestId: '1',
    });
  });

  it('CANCEL_NON_ACTIVE_NOOP: cancel is no-op for non-active states', () => {
    expect(cancelActiveBenchmark(INITIAL_BENCHMARK_WORKER_STATE)).toEqual(INITIAL_BENCHMARK_WORKER_STATE);

    const errorState: BenchmarkWorkerErrorState = {
      status: 'ERROR',
      requestId: '1',
      error: 'Failed',
      errorKind: 'RUNTIME_ERROR',
    };
    expect(cancelActiveBenchmark(errorState)).toEqual(errorState);

    const cancelledState: BenchmarkWorkerCancelledState = {
      status: 'CANCELLED',
      requestId: '1',
    };
    expect(cancelActiveBenchmark(cancelledState)).toEqual(cancelledState);
  });

  it('STALE_REQUEST_ID_STARTED_IGNORED: ignores BENCHMARK_STARTED with mismatched requestId', () => {
    const active = beginBenchmark(INITIAL_BENCHMARK_WORKER_STATE, '2', MOCK_CONFIG);
    const staleMsg: BenchmarkStartedMessage = {
      type: 'BENCHMARK_STARTED',
      requestId: '1',
    };

    const result = reduceBenchmarkWorkerMessage(active, staleMsg);
    expect(result).toBe(active);
  });

  it('STALE_REQUEST_ID_COMPLETE_IGNORED: ignores BENCHMARK_COMPLETE with mismatched requestId', () => {
    const active = beginBenchmark(INITIAL_BENCHMARK_WORKER_STATE, '2', MOCK_CONFIG);
    const staleMsg: BenchmarkCompleteMessage = {
      type: 'BENCHMARK_COMPLETE',
      requestId: '1',
      validatedConfig: MOCK_CONFIG,
      environment: MOCK_ENVIRONMENT,
      summary: MOCK_SUMMARY,
      jsonText: '{}',
      csvText: '',
    };

    const result = reduceBenchmarkWorkerMessage(active, staleMsg);
    expect(result).toBe(active);
  });

  it('STALE_REQUEST_ID_ERROR_IGNORED: ignores BENCHMARK_ERROR with mismatched requestId', () => {
    const active = beginBenchmark(INITIAL_BENCHMARK_WORKER_STATE, '2', MOCK_CONFIG);
    const staleMsg: BenchmarkErrorMessage = {
      type: 'BENCHMARK_ERROR',
      requestId: '1',
      error: 'Stale error',
      errorKind: 'RUNTIME_ERROR',
    };

    const result = reduceBenchmarkWorkerMessage(active, staleMsg);
    expect(result).toBe(active);
  });

  it('MESSAGE_AFTER_CANCEL_IGNORED: messages received in CANCELLED state are ignored', () => {
    const cancelledState: BenchmarkWorkerCancelledState = {
      status: 'CANCELLED',
      requestId: '1',
    };

    const msg: BenchmarkCompleteMessage = {
      type: 'BENCHMARK_COMPLETE',
      requestId: '1',
      validatedConfig: MOCK_CONFIG,
      environment: MOCK_ENVIRONMENT,
      summary: MOCK_SUMMARY,
      jsonText: '{}',
      csvText: '',
    };

    const result = reduceBenchmarkWorkerMessage(cancelledState, msg);
    expect(result).toBe(cancelledState);
  });

  it('MESSAGE_AFTER_COMPLETE_IGNORED: messages received in COMPLETED state are ignored', () => {
    const completed: BenchmarkWorkerCompletedState = {
      status: 'COMPLETED',
      requestId: '1',
      config: MOCK_CONFIG,
      environment: MOCK_ENVIRONMENT,
      summary: MOCK_SUMMARY,
      jsonText: '{}',
      csvText: '',
    };

    const msg: BenchmarkErrorMessage = {
      type: 'BENCHMARK_ERROR',
      requestId: '1',
      error: 'Late error',
      errorKind: 'RUNTIME_ERROR',
    };

    const result = reduceBenchmarkWorkerMessage(completed, msg);
    expect(result).toBe(completed);
  });

  it('MESSAGE_AFTER_ERROR_IGNORED: messages received in ERROR state are ignored', () => {
    const errorState: BenchmarkWorkerErrorState = {
      status: 'ERROR',
      requestId: '1',
      error: 'Initial error',
      errorKind: 'RUNTIME_ERROR',
    };

    const msg: BenchmarkCompleteMessage = {
      type: 'BENCHMARK_COMPLETE',
      requestId: '1',
      validatedConfig: MOCK_CONFIG,
      environment: MOCK_ENVIRONMENT,
      summary: MOCK_SUMMARY,
      jsonText: '{}',
      csvText: '',
    };

    const result = reduceBenchmarkWorkerMessage(errorState, msg);
    expect(result).toBe(errorState);
  });

  it('FAIL_ACTIVE_MATCHING_REQUEST: records unhandled worker failure when matching requestId', () => {
    const active = beginBenchmark(INITIAL_BENCHMARK_WORKER_STATE, '1', MOCK_CONFIG);
    const failed = failActiveBenchmark(active, '1', 'Worker crashed unexpectedly', 'RUNTIME_ERROR');

    expect(failed).toEqual({
      status: 'ERROR',
      requestId: '1',
      error: 'Worker crashed unexpectedly',
      errorKind: 'RUNTIME_ERROR',
    });
  });

  it('FAIL_ACTIVE_STALE_REQUEST_IGNORED: ignores failActiveBenchmark with mismatched requestId', () => {
    const active = beginBenchmark(INITIAL_BENCHMARK_WORKER_STATE, '2', MOCK_CONFIG);
    const result = failActiveBenchmark(active, '1', 'Stale crash', 'RUNTIME_ERROR');

    expect(result).toBe(active);
  });

  it('FAIL_NON_ACTIVE_IGNORED: ignores failActiveBenchmark when controller is not ACTIVE', () => {
    const result = failActiveBenchmark(INITIAL_BENCHMARK_WORKER_STATE, '1', 'Crash', 'RUNTIME_ERROR');
    expect(result).toBe(INITIAL_BENCHMARK_WORKER_STATE);
  });
});

describe('Phase 5D Download Filename Sanitization & Generation Contract', () => {
  it('preserves valid characters in normal suite ID', () => {
    expect(sanitizeBenchmarkSuiteIdForFilename('normal-suite_1.0')).toBe('normal-suite_1.0');
  });

  it('replaces spaces with underscores', () => {
    expect(sanitizeBenchmarkSuiteIdForFilename('hello world')).toBe('hello_world');
  });

  it('replaces path separators / and \ with underscores without leading/trailing slashes', () => {
    const sanitized = sanitizeBenchmarkSuiteIdForFilename('path/with\\separators');
    expect(sanitized).toBe('path_with_separators');
    expect(sanitized.includes('/')).toBe(false);
    expect(sanitized.includes('\\')).toBe(false);
  });

  it('collapses multiple consecutive invalid characters into a single underscore', () => {
    expect(sanitizeBenchmarkSuiteIdForFilename('test@@@suite###1')).toBe('test_suite_1');
  });

  it('collapses multiple consecutive underscores', () => {
    expect(sanitizeBenchmarkSuiteIdForFilename('test___suite')).toBe('test_suite');
  });

  it('trims leading and trailing underscores', () => {
    expect(sanitizeBenchmarkSuiteIdForFilename('___suite_name___')).toBe('suite_name');
  });

  it('returns fallback suite for unicode-only string that becomes empty after filtering', () => {
    expect(sanitizeBenchmarkSuiteIdForFilename('測試')).toBe('suite');
  });

  it('returns fallback suite for empty string', () => {
    expect(sanitizeBenchmarkSuiteIdForFilename('')).toBe('suite');
  });

  it('builds JSON download filename accurately', () => {
    expect(buildBenchmarkDownloadFilename('suite-1', 'json')).toBe('gearcube-benchmark-suite-1.json');
  });

  it('builds CSV download filename accurately', () => {
    expect(buildBenchmarkDownloadFilename('suite-1', 'csv')).toBe('gearcube-benchmark-suite-1.csv');
  });

  it('builds fallback download filename for empty suiteId', () => {
    expect(buildBenchmarkDownloadFilename('', 'json')).toBe('gearcube-benchmark-suite.json');
    expect(buildBenchmarkDownloadFilename('', 'csv')).toBe('gearcube-benchmark-suite.csv');
  });

  it('preserves scientific suiteId unmodified while generating filename', () => {
    const originalSuiteId = '  My Complex Suite / 2026 !  ';
    const filename = buildBenchmarkDownloadFilename(originalSuiteId, 'json');

    expect(filename).toBe('gearcube-benchmark-My_Complex_Suite_2026.json');
    // Ensure original string was not altered
    expect(originalSuiteId).toBe('  My Complex Suite / 2026 !  ');
  });
});
