import { describe, it, expect, beforeAll } from 'vitest';
import { runBenchmarkSuite } from '../src/runner.js';
import { buildExactDistanceCorpus, type ExactDistanceCorpus } from '../src/corpus.js';
import type { BenchmarkReport, BenchmarkSuiteConfig, EnvironmentProvenance } from '../src/types.js';

describe('Phase 5B Classical Solver Benchmark Runner Gates', () => {
  let corpus: ExactDistanceCorpus;
  const mockEnv: EnvironmentProvenance = {
    platform: 'node',
    executionTimestamp: '2026-08-27T00:00:00.000Z',
    os: 'linux',
    architecture: 'x64',
    nodeVersion: 'v22.12.0',
  };

  beforeAll(() => {
    corpus = buildExactDistanceCorpus();
  });

  describe('OPTIMALITY_GATE: Depths 1 to 8 Solver Optimality Verification', () => {
    it('proves solutionDepth === exactDepth for BFS, BiBFS, and IDA* across all 8 exact depths', () => {
      const config: BenchmarkSuiteConfig = {
        schemaVersion: '1',
        suiteId: 'optimality-suite-1-to-8',
        seed: 'optimality-seed-01',
        exactDepths: [1, 2, 3, 4, 5, 6, 7, 8],
        casesPerDepth: 1,
        algorithms: ['BFS', 'BIDIRECTIONAL_BFS', 'IDA_STAR'],
        warmupRuns: 0,
        measuredRuns: 1,
      };

      const report = runBenchmarkSuite(config, mockEnv, { corpus });
      expect(report.cases.length).toBe(8);
      expect(report.trials.length).toBe(24);

      for (const trial of report.trials) {
        expect(trial.status).toBe('SOLVED');
        if (trial.status === 'SOLVED') {
          expect(trial.solutionDepth).toBe(trial.exactDepth);
          expect(trial.solutionMoves.length).toBe(trial.exactDepth);
        }
      }
    });
  });

  describe('REPEATED_RUN_DETERMINISM_GATE: Deterministic Metrics Projection', () => {
    function projectDeterministicMetrics(report: BenchmarkReport) {
      return {
        config: report.config,
        cases: report.cases,
        trials: report.trials.map((t) => ({
          caseId: t.caseId,
          exactDepth: t.exactDepth,
          algorithm: t.algorithm,
          repetitionIndex: t.repetitionIndex,
          status: t.status,
          ...(t.status === 'SOLVED'
            ? { solutionDepth: t.solutionDepth, solutionMoves: t.solutionMoves }
            : { limitReason: t.limitReason }),
          nodesExpanded: t.nodesExpanded,
          nodesGenerated: t.nodesGenerated,
        })),
        summary: {
          totalCases: report.summary.totalCases,
          totalTrials: report.summary.totalTrials,
          algorithms: report.summary.algorithms.map((a) => ({
            algorithm: a.algorithm,
            totalSolved: a.totalSolved,
            totalLimits: a.totalLimits,
            overallMeanNodesExpanded: a.overallMeanNodesExpanded,
            byDepth: a.byDepth.map((d) => ({
              exactDepth: d.exactDepth,
              totalTrials: d.totalTrials,
              solvedCount: d.solvedCount,
              limitCount: d.limitCount,
              meanNodesExpanded: d.meanNodesExpanded,
              medianNodesExpanded: d.medianNodesExpanded,
              meanNodesGenerated: d.meanNodesGenerated,
              medianNodesGenerated: d.medianNodesGenerated,
            })),
          })),
        },
      };
    }

    it('proves identical suite configurations produce bit-for-bit identical search metrics', () => {
      const config: BenchmarkSuiteConfig = {
        schemaVersion: '1',
        suiteId: 'determinism-check',
        seed: 'deterministic-seed-alpha',
        exactDepths: [1, 2, 3],
        casesPerDepth: 2,
        algorithms: ['BFS', 'BIDIRECTIONAL_BFS', 'IDA_STAR'],
        warmupRuns: 1,
        measuredRuns: 2,
      };

      const run1 = runBenchmarkSuite(config, mockEnv, { corpus });
      const run2 = runBenchmarkSuite(config, mockEnv, { corpus });

      const p1 = projectDeterministicMetrics(run1);
      const p2 = projectDeterministicMetrics(run2);

      expect(p1).toEqual(p2);
    });
  });

  describe('LIMIT_REACHED_MAPPING: Resource Constraint Gate', () => {
    it('maps maxDepth=0 limitation to LIMIT_REACHED for cases at depth >= 1', () => {
      const config: BenchmarkSuiteConfig = {
        schemaVersion: '1',
        suiteId: 'limit-reached-suite',
        seed: 'limit-seed',
        exactDepths: [2],
        casesPerDepth: 1,
        algorithms: ['BFS', 'BIDIRECTIONAL_BFS', 'IDA_STAR'],
        warmupRuns: 0,
        measuredRuns: 1,
        limits: { maxDepth: 0 },
      };

      const report = runBenchmarkSuite(config, mockEnv, { corpus });
      expect(report.trials.length).toBe(3);

      for (const trial of report.trials) {
        expect(trial.status).toBe('LIMIT_REACHED');
        if (trial.status === 'LIMIT_REACHED') {
          expect(trial.limitReason).toBe('MAX_DEPTH');
        }
      }
    });
  });

  describe('MEASURED_EXECUTION_ORDER: Cyclic Algorithm Rotation', () => {
    it('executes measured trials in cyclic rotated order by (caseIndex + repetitionIndex) % algCount', () => {
      const config: BenchmarkSuiteConfig = {
        schemaVersion: '1',
        suiteId: 'rotation-test',
        seed: 'rotation-seed',
        exactDepths: [1, 2],
        casesPerDepth: 1,
        algorithms: ['BFS', 'BIDIRECTIONAL_BFS', 'IDA_STAR'],
        warmupRuns: 0,
        measuredRuns: 2,
      };

      const report = runBenchmarkSuite(config, mockEnv, { corpus });
      // Case 0, Rep 0: offset 0 -> BFS, BIDIRECTIONAL_BFS, IDA_STAR
      // Case 0, Rep 1: offset 1 -> BIDIRECTIONAL_BFS, IDA_STAR, BFS
      // Case 1, Rep 0: offset 1 -> BIDIRECTIONAL_BFS, IDA_STAR, BFS
      // Case 1, Rep 1: offset 2 -> IDA_STAR, BFS, BIDIRECTIONAL_BFS

      const trialAlgs = report.trials.map((t) => t.algorithm);
      expect(trialAlgs).toEqual([
        'BFS',
        'BIDIRECTIONAL_BFS',
        'IDA_STAR',
        'BIDIRECTIONAL_BFS',
        'IDA_STAR',
        'BFS',
        'BIDIRECTIONAL_BFS',
        'IDA_STAR',
        'BFS',
        'IDA_STAR',
        'BFS',
        'BIDIRECTIONAL_BFS',
      ]);
    });
  });
});