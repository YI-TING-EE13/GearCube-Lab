import { describe, it, expect } from 'vitest';
import { validateBenchmarkSuiteConfig, validateConfigCorpusCapacity } from '../src/config.js';
import type { BenchmarkSuiteConfig } from '../src/types.js';

describe('Phase 5A BenchmarkSuiteConfig Validation Gate', () => {
  const validBaseConfig: BenchmarkSuiteConfig = {
    schemaVersion: '1',
    suiteId: 'suite-baseline',
    seed: 'seed-alpha',
    exactDepths: [1, 2, 3, 4, 5, 6, 7, 8],
    casesPerDepth: 5,
    algorithms: ['BFS', 'BIDIRECTIONAL_BFS', 'IDA_STAR'],
    warmupRuns: 1,
    measuredRuns: 3,
    limits: {
      maxNodes: 10000,
      maxDepth: 8,
    },
  };

  it('accepts a fully specified valid configuration', () => {
    const validated = validateBenchmarkSuiteConfig(validBaseConfig);
    expect(validated).toEqual(validBaseConfig);
    expect(Object.isFrozen(validated.exactDepths)).toBe(true);
    expect(Object.isFrozen(validated.algorithms)).toBe(true);
    expect(Object.isFrozen(validated.limits)).toBe(true);
  });

  it('accepts valid minimal configuration with empty seed and zero warmups', () => {
    const minimal = {
      schemaVersion: '1',
      suiteId: 'min',
      seed: '',
      exactDepths: [1],
      casesPerDepth: 1,
      algorithms: ['BFS'],
      warmupRuns: 0,
      measuredRuns: 1,
    };
    const validated = validateBenchmarkSuiteConfig(minimal);
    expect(validated.seed).toBe('');
    expect(validated.warmupRuns).toBe(0);
    expect(validated.measuredRuns).toBe(1);
    expect(validated.limits).toBeUndefined();
  });

  it('accepts limits with maxDepth 0', () => {
    const configWithZeroDepth = {
      ...validBaseConfig,
      limits: { maxDepth: 0 },
    };
    const validated = validateBenchmarkSuiteConfig(configWithZeroDepth);
    expect(validated.limits?.maxDepth).toBe(0);
    expect(validated.limits?.maxNodes).toBeUndefined();
  });

  it('rejects non-object and null inputs', () => {
    expect(() => validateBenchmarkSuiteConfig(null)).toThrow(/must be a non-null object/);
    expect(() => validateBenchmarkSuiteConfig(undefined)).toThrow(/must be a non-null object/);
    expect(() => validateBenchmarkSuiteConfig('config')).toThrow(/must be a non-null object/);
    expect(() => validateBenchmarkSuiteConfig([validBaseConfig])).toThrow(/must be a non-null object/);
  });

  it('rejects unknown top-level properties', () => {
    expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, extra: true })).toThrow(
      /Unknown configuration property: "extra"/,
    );
    expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, timeoutMs: 5000 })).toThrow(
      /Unknown configuration property: "timeoutMs"/,
    );
  });

  it('rejects invalid schemaVersion', () => {
    expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, schemaVersion: '2' })).toThrow(
      /Invalid schemaVersion/,
    );
    expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, schemaVersion: 1 })).toThrow(
      /Invalid schemaVersion/,
    );
  });

  it('rejects empty or non-string suiteId', () => {
    expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, suiteId: '' })).toThrow(
      /suiteId must be a non-empty string/,
    );
    expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, suiteId: 123 })).toThrow(
      /suiteId must be a non-empty string/,
    );
  });

  it('rejects non-string seed', () => {
    expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, seed: 12345 })).toThrow(
      /seed must be a string/,
    );
    expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, seed: null })).toThrow(
      /seed must be a string/,
    );
  });

  describe('exactDepths validation', () => {
    it('rejects empty exactDepths array', () => {
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, exactDepths: [] })).toThrow(
        /exactDepths must be a non-empty array/,
      );
    });

    it('rejects depth 0 in benchmark suites (depth 0 is control state only in schema v1)', () => {
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, exactDepths: [0, 1, 2] })).toThrow(
        /exactDepths contains invalid depth 0/,
      );
    });

    it('rejects depth > 8', () => {
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, exactDepths: [1, 9] })).toThrow(
        /exactDepths contains invalid depth 9/,
      );
    });

    it('rejects non-integer depths', () => {
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, exactDepths: [1.5] })).toThrow(
        /exactDepths contains invalid depth 1.5/,
      );
    });

    it('rejects unsorted or duplicate depths', () => {
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, exactDepths: [2, 1] })).toThrow(
        /exactDepths must be strictly increasing/,
      );
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, exactDepths: [1, 2, 2, 3] })).toThrow(
        /exactDepths must be strictly increasing/,
      );
    });
  });

  describe('casesPerDepth validation', () => {
    it('rejects casesPerDepth < 1 or non-integer', () => {
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, casesPerDepth: 0 })).toThrow(
        /casesPerDepth must be an integer >= 1/,
      );
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, casesPerDepth: -1 })).toThrow(
        /casesPerDepth must be an integer >= 1/,
      );
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, casesPerDepth: 2.5 })).toThrow(
        /casesPerDepth must be an integer >= 1/,
      );
    });
  });

  describe('algorithms validation', () => {
    it('rejects empty algorithms array', () => {
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, algorithms: [] })).toThrow(
        /algorithms must be a non-empty array/,
      );
    });

    it('rejects duplicate algorithms', () => {
      expect(() =>
        validateBenchmarkSuiteConfig({ ...validBaseConfig, algorithms: ['BFS', 'BFS'] }),
      ).toThrow(/Duplicate solver algorithm: "BFS"/);
    });

    it('rejects unsupported or unknown algorithms', () => {
      expect(() =>
        validateBenchmarkSuiteConfig({ ...validBaseConfig, algorithms: ['A_STAR' as any] }),
      ).toThrow(/Unsupported solver algorithm: "A_STAR"/);
      expect(() =>
        validateBenchmarkSuiteConfig({ ...validBaseConfig, algorithms: ['RANDOM_WALK' as any] }),
      ).toThrow(/Unsupported solver algorithm: "RANDOM_WALK"/);
    });
  });

  describe('runs validation', () => {
    it('rejects warmupRuns < 0 or non-integer', () => {
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, warmupRuns: -1 })).toThrow(
        /warmupRuns must be an integer >= 0/,
      );
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, warmupRuns: 1.2 })).toThrow(
        /warmupRuns must be an integer >= 0/,
      );
    });

    it('rejects measuredRuns < 1 or non-integer', () => {
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, measuredRuns: 0 })).toThrow(
        /measuredRuns must be an integer >= 1/,
      );
      expect(() => validateBenchmarkSuiteConfig({ ...validBaseConfig, measuredRuns: 1.5 })).toThrow(
        /measuredRuns must be an integer >= 1/,
      );
    });
  });

  describe('limits validation', () => {
    it('rejects unknown properties in limits', () => {
      expect(() =>
        validateBenchmarkSuiteConfig({
          ...validBaseConfig,
          limits: { maxNodes: 100, timeoutMs: 5000 } as any,
        }),
      ).toThrow(/Unknown limits property: "timeoutMs"/);
    });

    it('rejects maxNodes < 1 or non-integer', () => {
      expect(() =>
        validateBenchmarkSuiteConfig({
          ...validBaseConfig,
          limits: { maxNodes: 0 },
        }),
      ).toThrow(/limits.maxNodes must be an integer >= 1/);
      expect(() =>
        validateBenchmarkSuiteConfig({
          ...validBaseConfig,
          limits: { maxNodes: 10.5 },
        }),
      ).toThrow(/limits.maxNodes must be an integer >= 1/);
    });

    it('rejects maxDepth < 0 or non-integer', () => {
      expect(() =>
        validateBenchmarkSuiteConfig({
          ...validBaseConfig,
          limits: { maxDepth: -1 },
        }),
      ).toThrow(/limits.maxDepth must be an integer >= 0/);
      expect(() =>
        validateBenchmarkSuiteConfig({
          ...validBaseConfig,
          limits: { maxDepth: 3.14 },
        }),
      ).toThrow(/limits.maxDepth must be an integer >= 0/);
    });
  });

  describe('corpus capacity validation', () => {
    const mockGetBucketSize = (depth: number) => {
      const mockHistogram: Record<number, number> = {
        1: 12,
        2: 111,
        3: 822,
        4: 3863,
        5: 11706,
        6: 16410,
        7: 8196,
        8: 351,
      };
      return mockHistogram[depth] ?? 0;
    };

    it('passes when casesPerDepth is within bucket capacity', () => {
      const config: BenchmarkSuiteConfig = {
        ...validBaseConfig,
        exactDepths: [1, 8],
        casesPerDepth: 10,
      };
      expect(() => validateConfigCorpusCapacity(config, mockGetBucketSize)).not.toThrow();
    });

    it('throws when casesPerDepth exceeds bucket capacity for depth 1 (max 12)', () => {
      const config: BenchmarkSuiteConfig = {
        ...validBaseConfig,
        exactDepths: [1, 2],
        casesPerDepth: 15,
      };
      expect(() => validateConfigCorpusCapacity(config, mockGetBucketSize)).toThrow(
        /Requested casesPerDepth \(15\) exceeds available states \(12\) for depth 1/,
      );
    });

    it('throws when casesPerDepth exceeds bucket capacity for depth 8 (max 351)', () => {
      const config: BenchmarkSuiteConfig = {
        ...validBaseConfig,
        exactDepths: [8],
        casesPerDepth: 400,
      };
      expect(() => validateConfigCorpusCapacity(config, mockGetBucketSize)).toThrow(
        /Requested casesPerDepth \(400\) exceeds available states \(351\) for depth 8/,
      );
    });
  });
});
