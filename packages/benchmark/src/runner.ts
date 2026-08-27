import { deserializeLogicalState, type GearCubeState } from '@gearcube/core';
import {
  solveBfs,
  solveBidirectionalBfs,
  solveIdaStar,
  type SolverAlgorithm,
  type SolverOptions,
  type SolveResult,
} from '@gearcube/solvers';
import type {
  AlgorithmSummary,
  AlgorithmSummaryByDepth,
  BenchmarkReport,
  BenchmarkSummary,
  BenchmarkTrialResult,
  EnvironmentProvenance,
} from './types.js';
import { validateBenchmarkSuiteConfig, validateConfigCorpusCapacity } from './config.js';
import { buildExactDistanceCorpus, type ExactDistanceCorpus } from './corpus.js';
import { sampleBenchmarkCases } from './sampler.js';

export interface RunBenchmarkSuiteOptions {
  readonly corpus?: ExactDistanceCorpus;
}

function calculateMedian(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function calculateMean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

function dispatchSolver(
  algorithm: SolverAlgorithm,
  state: GearCubeState,
  options: SolverOptions,
): SolveResult {
  switch (algorithm) {
    case 'BFS':
      return solveBfs(state, options);
    case 'BIDIRECTIONAL_BFS':
      return solveBidirectionalBfs(state, options);
    case 'IDA_STAR':
      return solveIdaStar(state, options);
  }
}

/**
 * Executes a deterministic benchmark suite across configured algorithms and exact-distance cases.
 * Returns a complete, lossless BenchmarkReport.
 */
export function runBenchmarkSuite(
  configInput: unknown,
  environment: EnvironmentProvenance,
  options?: RunBenchmarkSuiteOptions,
): BenchmarkReport {
  const config = validateBenchmarkSuiteConfig(configInput);
  const corpus = options?.corpus ?? buildExactDistanceCorpus();
  validateConfigCorpusCapacity(config, (depth) => corpus.getStatesAtDepth(depth).length);

  const cases = sampleBenchmarkCases(config, corpus);

  const solverOptions: SolverOptions = {
    ...(config.limits?.maxNodes !== undefined ? { maxNodes: config.limits.maxNodes } : {}),
    ...(config.limits?.maxDepth !== undefined ? { maxDepth: config.limits.maxDepth } : {}),
  };

  // 1. Execute warm-up runs (discarded and unmeasured)
  if (config.warmupRuns > 0) {
    for (const c of cases) {
      const state = deserializeLogicalState(c.stateKey);
      for (const alg of config.algorithms) {
        for (let w = 0; w < config.warmupRuns; w++) {
          dispatchSolver(alg, state, solverOptions);
        }
      }
    }
  }

  // 2. Execute measured runs with cyclic algorithm rotation order
  const trials: BenchmarkTrialResult[] = [];

  for (let caseOrdinal = 0; caseOrdinal < cases.length; caseOrdinal++) {
    const c = cases[caseOrdinal]!;
    const state = deserializeLogicalState(c.stateKey);

    for (let repetitionIndex = 0; repetitionIndex < config.measuredRuns; repetitionIndex++) {
      const rotationOffset = (caseOrdinal + repetitionIndex) % config.algorithms.length;

      for (let k = 0; k < config.algorithms.length; k++) {
        const algIndex = (rotationOffset + k) % config.algorithms.length;
        const alg = config.algorithms[algIndex]!;

        const result = dispatchSolver(alg, state, solverOptions);

        if (result.status === 'SOLVED') {
          if (result.depth !== c.exactDepth) {
            throw new Error(
              `Optimality violation for case "${c.caseId}" with algorithm ${alg}: solutionDepth ${result.depth} !== exactDepth ${c.exactDepth}`,
            );
          }

          trials.push(
            Object.freeze({
              caseId: c.caseId,
              exactDepth: c.exactDepth,
              algorithm: alg,
              repetitionIndex,
              status: 'SOLVED',
              solutionDepth: result.depth,
              solutionMoves: Object.freeze([...result.moves]),
              nodesExpanded: result.counters.nodesExpanded,
              nodesGenerated: result.counters.nodesGenerated,
              elapsedMs: result.elapsedMs,
            }),
          );
        } else {
          trials.push(
            Object.freeze({
              caseId: c.caseId,
              exactDepth: c.exactDepth,
              algorithm: alg,
              repetitionIndex,
              status: 'LIMIT_REACHED',
              limitReason: result.limit,
              nodesExpanded: result.counters.nodesExpanded,
              nodesGenerated: result.counters.nodesGenerated,
              elapsedMs: result.elapsedMs,
            }),
          );
        }
      }
    }
  }

  // 3. Compute summaries
  const algorithmSummaries: AlgorithmSummary[] = [];

  for (const alg of config.algorithms) {
    const algTrials = trials.filter((t) => t.algorithm === alg);
    const byDepth: AlgorithmSummaryByDepth[] = [];

    for (const depth of config.exactDepths) {
      const depthTrials = algTrials.filter((t) => t.exactDepth === depth);
      const solved = depthTrials.filter((t) => t.status === 'SOLVED');
      const limits = depthTrials.filter((t) => t.status === 'LIMIT_REACHED');

      const expandedList = depthTrials.map((t) => t.nodesExpanded);
      const generatedList = depthTrials.map((t) => t.nodesGenerated);
      const elapsedList = depthTrials.map((t) => t.elapsedMs);

      byDepth.push(
        Object.freeze({
          exactDepth: depth,
          totalTrials: depthTrials.length,
          solvedCount: solved.length,
          limitCount: limits.length,
          meanNodesExpanded: calculateMean(expandedList),
          medianNodesExpanded: calculateMedian(expandedList),
          meanNodesGenerated: calculateMean(generatedList),
          medianNodesGenerated: calculateMedian(generatedList),
          meanElapsedMs: calculateMean(elapsedList),
          medianElapsedMs: calculateMedian(elapsedList),
        }),
      );
    }

    const totalSolved = algTrials.filter((t) => t.status === 'SOLVED').length;
    const totalLimits = algTrials.filter((t) => t.status === 'LIMIT_REACHED').length;
    const allExpanded = algTrials.map((t) => t.nodesExpanded);
    const allElapsed = algTrials.map((t) => t.elapsedMs);

    algorithmSummaries.push(
      Object.freeze({
        algorithm: alg,
        byDepth: Object.freeze(byDepth),
        totalSolved,
        totalLimits,
        overallMeanNodesExpanded: calculateMean(allExpanded),
        overallMedianElapsedMs: calculateMedian(allElapsed),
      }),
    );
  }

  const summary: BenchmarkSummary = Object.freeze({
    totalCases: cases.length,
    totalTrials: trials.length,
    algorithms: Object.freeze(algorithmSummaries),
  });

  return Object.freeze({
    schemaVersion: '1',
    config,
    environment,
    cases,
    trials: Object.freeze(trials),
    summary,
  });
}