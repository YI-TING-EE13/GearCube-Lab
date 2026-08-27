import type {
  BenchmarkSuiteConfig,
  BenchmarkSummary,
  EnvironmentProvenance,
} from '@gearcube/benchmark';

export type BenchmarkErrorKind = 'CONFIG_ERROR' | 'RUNTIME_ERROR';

/**
 * Inbound message posted from the main UI thread to the benchmark Web Worker.
 */
export interface StartBenchmarkMessage {
  readonly type: 'START_BENCHMARK';
  readonly requestId: string;
  readonly config: BenchmarkSuiteConfig;
}

export type BenchmarkWorkerInboundMessage = StartBenchmarkMessage;

/**
 * Outbound message emitted when benchmark execution has started.
 */
export interface BenchmarkStartedMessage {
  readonly type: 'BENCHMARK_STARTED';
  readonly requestId: string;
}

/**
 * Outbound message emitted when benchmark execution completes successfully.
 */
export interface BenchmarkCompleteMessage {
  readonly type: 'BENCHMARK_COMPLETE';
  readonly requestId: string;
  readonly validatedConfig: BenchmarkSuiteConfig;
  readonly environment: EnvironmentProvenance;
  readonly summary: BenchmarkSummary;
  readonly jsonText: string;
  readonly csvText: string;
}

/**
 * Outbound message emitted when benchmark execution encounters an error.
 */
export interface BenchmarkErrorMessage {
  readonly type: 'BENCHMARK_ERROR';
  readonly requestId: string;
  readonly error: string;
  readonly errorKind: BenchmarkErrorKind;
}

export type BenchmarkWorkerOutboundMessage =
  | BenchmarkStartedMessage
  | BenchmarkCompleteMessage
  | BenchmarkErrorMessage;
