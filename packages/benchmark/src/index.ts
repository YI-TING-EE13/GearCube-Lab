export type {
  BenchmarkSuiteConfig,
  BenchmarkCase,
  BenchmarkTrialBase,
  BenchmarkSolvedTrial,
  BenchmarkLimitTrial,
  BenchmarkTrialResult,
  AlgorithmSummaryByDepth,
  AlgorithmSummary,
  BenchmarkSummary,
  EnvironmentProvenance,
  BenchmarkReport,
} from './types.js';

export {
  BenchmarkConfigError,
  validateBenchmarkSuiteConfig,
  validateConfigCorpusCapacity,
} from './config.js';

export {
  buildExactDistanceCorpus,
  createBenchmarkCaseId,
  type ExactDistanceCorpus,
} from './corpus.js';

export { hashSeed } from './hash.js';

export { createMulberry32 } from './prng.js';

export { sampleBenchmarkCases } from './sampler.js';

export { runBenchmarkSuite } from './runner.js';

export {
  serializeBenchmarkReportJson,
  serializeBenchmarkReportCsv,
} from './export.js';