import type { SolverAlgorithm } from '@gearcube/solvers';
import type { BenchmarkSuiteConfig } from './types.js';

const ALLOWED_ALGORITHMS: ReadonlySet<SolverAlgorithm> = new Set([
  'BFS',
  'BIDIRECTIONAL_BFS',
  'IDA_STAR',
]);

const ALLOWED_CONFIG_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'suiteId',
  'seed',
  'exactDepths',
  'casesPerDepth',
  'algorithms',
  'warmupRuns',
  'measuredRuns',
  'limits',
]);

const ALLOWED_LIMITS_KEYS: ReadonlySet<string> = new Set([
  'maxNodes',
  'maxDepth',
]);

/**
 * Validates untrusted/runtime input as a valid BenchmarkSuiteConfig.
 * Throws a descriptive Error if the configuration is invalid.
 */
export function validateBenchmarkSuiteConfig(raw: unknown): BenchmarkSuiteConfig {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('BenchmarkSuiteConfig must be a non-null object');
  }

  const obj = raw as Record<string, unknown>;

  // Check for unknown keys at top level
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_CONFIG_KEYS.has(key)) {
      throw new Error(`Unknown configuration property: "${key}"`);
    }
  }

  // 1. schemaVersion
  if (obj['schemaVersion'] !== '1') {
    throw new Error(`Invalid schemaVersion: expected "1", got ${JSON.stringify(obj['schemaVersion'])}`);
  }

  // 2. suiteId
  if (typeof obj['suiteId'] !== 'string' || obj['suiteId'].length === 0) {
    throw new Error('suiteId must be a non-empty string');
  }

  // 3. seed
  if (typeof obj['seed'] !== 'string') {
    throw new Error('seed must be a string');
  }

  // 4. exactDepths
  const exactDepths = obj['exactDepths'];
  if (!Array.isArray(exactDepths) || exactDepths.length === 0) {
    throw new Error('exactDepths must be a non-empty array of numbers');
  }
  for (let i = 0; i < exactDepths.length; i++) {
    const d = exactDepths[i];
    if (typeof d !== 'number' || !Number.isInteger(d) || d < 1 || d > 8) {
      throw new Error(`exactDepths contains invalid depth ${JSON.stringify(d)}; must be an integer between 1 and 8`);
    }
    if (i > 0) {
      const prev = exactDepths[i - 1] as number;
      if (d <= prev) {
        throw new Error('exactDepths must be strictly increasing and unique with no duplicates');
      }
    }
  }

  // 5. casesPerDepth
  const casesPerDepth = obj['casesPerDepth'];
  if (typeof casesPerDepth !== 'number' || !Number.isInteger(casesPerDepth) || casesPerDepth < 1) {
    throw new Error('casesPerDepth must be an integer >= 1');
  }

  // 6. algorithms
  const algorithms = obj['algorithms'];
  if (!Array.isArray(algorithms) || algorithms.length === 0) {
    throw new Error('algorithms must be a non-empty array');
  }
  const seenAlgorithms = new Set<string>();
  const validatedAlgorithms: SolverAlgorithm[] = [];
  for (const alg of algorithms) {
    if (typeof alg !== 'string' || !ALLOWED_ALGORITHMS.has(alg as SolverAlgorithm)) {
      throw new Error(`Unsupported solver algorithm: ${JSON.stringify(alg)}`);
    }
    if (seenAlgorithms.has(alg)) {
      throw new Error(`Duplicate solver algorithm: "${alg}"`);
    }
    seenAlgorithms.add(alg);
    validatedAlgorithms.push(alg as SolverAlgorithm);
  }

  // 7. warmupRuns
  const warmupRuns = obj['warmupRuns'];
  if (typeof warmupRuns !== 'number' || !Number.isInteger(warmupRuns) || warmupRuns < 0) {
    throw new Error('warmupRuns must be an integer >= 0');
  }

  // 8. measuredRuns
  const measuredRuns = obj['measuredRuns'];
  if (typeof measuredRuns !== 'number' || !Number.isInteger(measuredRuns) || measuredRuns < 1) {
    throw new Error('measuredRuns must be an integer >= 1');
  }

  // 9. limits
  let validatedLimits: { maxNodes?: number; maxDepth?: number } | undefined;
  if ('limits' in obj && obj['limits'] !== undefined) {
    const limits = obj['limits'];
    if (typeof limits !== 'object' || limits === null || Array.isArray(limits)) {
      throw new Error('limits must be a non-null object');
    }
    const limitsObj = limits as Record<string, unknown>;

    for (const key of Object.keys(limitsObj)) {
      if (!ALLOWED_LIMITS_KEYS.has(key)) {
        throw new Error(`Unknown limits property: "${key}"`);
      }
    }

    if ('maxNodes' in limitsObj && limitsObj['maxNodes'] !== undefined) {
      const maxNodes = limitsObj['maxNodes'];
      if (typeof maxNodes !== 'number' || !Number.isInteger(maxNodes) || maxNodes < 1) {
        throw new Error('limits.maxNodes must be an integer >= 1');
      }
    }

    if ('maxDepth' in limitsObj && limitsObj['maxDepth'] !== undefined) {
      const maxDepth = limitsObj['maxDepth'];
      if (typeof maxDepth !== 'number' || !Number.isInteger(maxDepth) || maxDepth < 0) {
        throw new Error('limits.maxDepth must be an integer >= 0');
      }
    }

    validatedLimits = {
      ...(limitsObj['maxNodes'] !== undefined ? { maxNodes: limitsObj['maxNodes'] as number } : {}),
      ...(limitsObj['maxDepth'] !== undefined ? { maxDepth: limitsObj['maxDepth'] as number } : {}),
    };
  }

  return {
    schemaVersion: '1',
    suiteId: obj['suiteId'],
    seed: obj['seed'],
    exactDepths: Object.freeze([...exactDepths]) as readonly number[],
    casesPerDepth,
    algorithms: Object.freeze(validatedAlgorithms),
    warmupRuns,
    measuredRuns,
    ...(validatedLimits !== undefined ? { limits: Object.freeze(validatedLimits) } : {}),
  };
}

/**
 * Validates that requested casesPerDepth does not exceed available states in any configured depth bucket.
 */
export function validateConfigCorpusCapacity(
  config: BenchmarkSuiteConfig,
  getBucketSize: (depth: number) => number,
): void {
  for (const depth of config.exactDepths) {
    const bucketSize = getBucketSize(depth);
    if (config.casesPerDepth > bucketSize) {
      throw new Error(
        `Requested casesPerDepth (${config.casesPerDepth}) exceeds available states (${bucketSize}) for depth ${depth}`,
      );
    }
  }
}
