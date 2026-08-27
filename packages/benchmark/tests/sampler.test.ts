import { describe, it, expect, beforeAll } from 'vitest';
import { hashSeed } from '../src/hash.js';
import { createMulberry32 } from '../src/prng.js';
import { sampleBenchmarkCases } from '../src/sampler.js';
import { buildExactDistanceCorpus, type ExactDistanceCorpus } from '../src/corpus.js';
import type { BenchmarkSuiteConfig } from '../src/types.js';

describe('Phase 5B Hash, PRNG & Deterministic Sampler Gates', () => {
  describe('FNV-1a 32-bit Hash Fixed Vectors', () => {
    it('matches exact accepted hash test vectors', () => {
      expect(hashSeed('')).toBe(2166136261);
      expect(hashSeed('')).toBe(0x811c9dc5 >>> 0);

      expect(hashSeed('a')).toBe(3826002220);
      expect(hashSeed('a')).toBe(0xe40c292c >>> 0);

      expect(hashSeed('GearCube')).toBe(1442261067);
      expect(hashSeed('GearCube')).toBe(0x55f7284b >>> 0);

      expect(hashSeed('seed-alpha')).toBe(2698695381);
      expect(hashSeed('seed-alpha')).toBe(0xa0dad2d5 >>> 0);

      expect(hashSeed('🧩')).toBe(3828092888);
      expect(hashSeed('🧩')).toBe(0xe42c0fd8 >>> 0);
    });

    it('proves no Unicode normalization occurs', () => {
      const composed = 'é';
      const decomposed = 'e\u0301';
      expect(composed).not.toBe(decomposed);
      expect(hashSeed(composed)).not.toBe(hashSeed(decomposed));
    });
  });

  describe('Mulberry32 Exact PRNG Sequence Vectors', () => {
    it('produces exact first five sequence values for seed=0', () => {
      const prng = createMulberry32(0);
      expect(prng()).toBe(0.26642920868471265);
      expect(prng()).toBe(0.0003297457005828619);
      expect(prng()).toBe(0.22327202744781971);
      expect(prng()).toBe(0.1462021479383111);
      expect(prng()).toBe(0.46732782293111086);
    });

    it('produces exact first five sequence values for seed=2166136261 (hash of empty string)', () => {
      const prng = createMulberry32(2166136261);
      expect(prng()).toBe(0.6112444521859288);
      expect(prng()).toBe(0.4935242917854339);
      expect(prng()).toBe(0.7740248835179955);
      expect(prng()).toBe(0.4122861116193235);
      expect(prng()).toBe(0.8122657814528793);
    });
  });

  describe('Synthetic Sampler Golden Vector Gate', () => {
    const mockCorpus: ExactDistanceCorpus = {
      totalStates: 7,
      diameter: 2,
      histogram: { 1: 4, 2: 3 },
      getStatesAtDepth(depth: number): readonly string[] {
        if (depth === 1) return ['D', 'A', 'C', 'B'];
        if (depth === 2) return ['z', 'x', 'y'];
        return [];
      },
      getExactDistance(key: string): number | undefined {
        if (['D', 'A', 'C', 'B'].includes(key)) return 1;
        if (['z', 'x', 'y'].includes(key)) return 2;
        return undefined;
      },
      hasState(key: string): boolean {
        return ['D', 'A', 'C', 'B', 'z', 'x', 'y'].includes(key);
      },
    };

    const goldenConfigK2: BenchmarkSuiteConfig = {
      schemaVersion: '1',
      suiteId: 'synthetic-golden-k2',
      seed: 'seed-alpha',
      exactDepths: [1, 2],
      casesPerDepth: 2,
      algorithms: ['BFS'],
      warmupRuns: 0,
      measuredRuns: 1,
    };

    const goldenConfigK1: BenchmarkSuiteConfig = {
      schemaVersion: '1',
      suiteId: 'synthetic-golden-k1',
      seed: 'seed-alpha',
      exactDepths: [1, 2],
      casesPerDepth: 1,
      algorithms: ['BFS'],
      warmupRuns: 0,
      measuredRuns: 1,
    };

    it('SYNTHETIC_SAMPLING_GOLDEN: matches exact expected state keys across depths for K=2', () => {
      const cases = sampleBenchmarkCases(goldenConfigK2, mockCorpus);
      expect(cases.length).toBe(4);

      // Depth 1: D, C
      expect(cases[0]?.stateKey).toBe('D');
      expect(cases[0]?.exactDepth).toBe(1);
      expect(cases[0]?.caseId).toBe('d1:D');

      expect(cases[1]?.stateKey).toBe('C');
      expect(cases[1]?.exactDepth).toBe(1);
      expect(cases[1]?.caseId).toBe('d1:C');

      // Depth 2: z, x
      expect(cases[2]?.stateKey).toBe('z');
      expect(cases[2]?.exactDepth).toBe(2);
      expect(cases[2]?.caseId).toBe('d2:z');

      expect(cases[3]?.stateKey).toBe('x');
      expect(cases[3]?.exactDepth).toBe(2);
      expect(cases[3]?.caseId).toBe('d2:x');
    });

    it('CONTINUOUS_STREAM_GATE: proves continuous PRNG stream across depths with K=1 golden vector (depth1=D, depth2=y)', () => {
      const cases = sampleBenchmarkCases(goldenConfigK1, mockCorpus);
      expect(cases.length).toBe(2);

      // Depth 1 draw #1 selects D
      expect(cases[0]?.stateKey).toBe('D');
      expect(cases[0]?.exactDepth).toBe(1);
      expect(cases[0]?.caseId).toBe('d1:D');

      // Depth 2 draw #2 selects y (proving no PRNG reset to draw #1 which would select z)
      expect(cases[1]?.stateKey).toBe('y');
      expect(cases[1]?.exactDepth).toBe(2);
      expect(cases[1]?.caseId).toBe('d2:y');
    });

    it('proves repeat sampling with identical config produces bit-for-bit identical cases', () => {
      const run1 = sampleBenchmarkCases(goldenConfigK2, mockCorpus);
      const run2 = sampleBenchmarkCases(goldenConfigK2, mockCorpus);
      expect(run1).toEqual(run2);
    });

    it('proves different seed produces a different selection', () => {
      const diffSeedConfig: BenchmarkSuiteConfig = {
        ...goldenConfigK2,
        seed: 'seed-beta',
      };
      const runBeta = sampleBenchmarkCases(diffSeedConfig, mockCorpus);
      const keys1 = sampleBenchmarkCases(goldenConfigK2, mockCorpus).map((c) => c.stateKey);
      const keys2 = runBeta.map((c) => c.stateKey);
      expect(keys1).not.toEqual(keys2);
    });

    it('proves corpus bucket arrays remain unmutated', () => {
      const d1Before = mockCorpus.getStatesAtDepth(1);
      sampleBenchmarkCases(goldenConfigK2, mockCorpus);
      const d1After = mockCorpus.getStatesAtDepth(1);
      expect(d1After).toEqual(d1Before);
    });

    it('throws when requested casesPerDepth exceeds corpus bucket capacity', () => {
      const overflowConfig: BenchmarkSuiteConfig = {
        ...goldenConfigK2,
        casesPerDepth: 10,
      };
      expect(() => sampleBenchmarkCases(overflowConfig, mockCorpus)).toThrow(
        /exceeds available states/,
      );
    });
  });

  describe('Real Corpus Stratified Sampling', () => {
    let corpus: ExactDistanceCorpus;

    beforeAll(() => {
      corpus = buildExactDistanceCorpus();
    });

    it('samples 5 cases per depth across all 8 exact depths', () => {
      const config: BenchmarkSuiteConfig = {
        schemaVersion: '1',
        suiteId: 'real-sampling-test',
        seed: 'benchmark-seed-001',
        exactDepths: [1, 2, 3, 4, 5, 6, 7, 8],
        casesPerDepth: 5,
        algorithms: ['BFS', 'IDA_STAR'],
        warmupRuns: 0,
        measuredRuns: 1,
      };

      const cases = sampleBenchmarkCases(config, corpus);
      expect(cases.length).toBe(40);

      const seenCaseIds = new Set<string>();
      for (const c of cases) {
        expect(seenCaseIds.has(c.caseId)).toBe(false);
        seenCaseIds.add(c.caseId);
        expect(c.caseId).toBe(`d${c.exactDepth}:${c.stateKey}`);
        expect(corpus.getExactDistance(c.stateKey)).toBe(c.exactDepth);
      }
    });
  });
});