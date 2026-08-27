import type { BenchmarkCase, BenchmarkSuiteConfig } from './types.js';
import type { ExactDistanceCorpus } from './corpus.js';
import { createBenchmarkCaseId } from './corpus.js';
import { validateConfigCorpusCapacity } from './config.js';
import { hashSeed } from './hash.js';
import { createMulberry32 } from './prng.js';

/**
 * Deterministically samples benchmark cases from exact-distance corpus buckets.
 * Uses ordinal string sorting and partial Fisher-Yates shuffle with a continuous Mulberry32 PRNG stream.
 */
export function sampleBenchmarkCases(
  config: BenchmarkSuiteConfig,
  corpus: ExactDistanceCorpus,
): readonly BenchmarkCase[] {
  validateConfigCorpusCapacity(config, (depth) => corpus.getStatesAtDepth(depth).length);

  const seed32 = hashSeed(config.seed);
  const prng = createMulberry32(seed32);
  const result: BenchmarkCase[] = [];

  for (const depth of config.exactDepths) {
    const rawBucket = corpus.getStatesAtDepth(depth);
    const candidates = [...rawBucket];

    // Strictly ordinal sort
    candidates.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    const k = config.casesPerDepth;
    const n = candidates.length;

    for (let i = 0; i < k; i++) {
      const remaining = n - i;
      const j = i + Math.floor(prng() * remaining);

      const temp = candidates[i]!;
      candidates[i] = candidates[j]!;
      candidates[j] = temp;

      const stateKey = candidates[i]!;
      result.push(
        Object.freeze({
          caseId: createBenchmarkCaseId(depth, stateKey),
          stateKey,
          exactDepth: depth,
        }),
      );
    }
  }

  return Object.freeze(result);
}