import {
  ALL_MOVES,
  applyMove,
  CANONICAL_DOMAIN_SIZE,
  isSolved,
  type GearCubeState,
  type Move,
} from '@gearcube/core';
import { estimateIdaStarHeuristic } from './heuristics.js';
import { rankState } from './state-index.js';
import type { SolverOptions, SolveResult } from './types.js';

interface SuccessorRecord {
  readonly state: GearCubeState;
  readonly move: Move;
  readonly rank: number;
}

function validateOptions(options?: SolverOptions): {
  maxNodes: number;
  maxDepth: number;
  progressIntervalNodes: number;
  onProgress?: SolverOptions['onProgress'];
} {
  let maxNodes = Infinity;
  let maxDepth = Infinity;
  let progressIntervalNodes = 500;
  let onProgress: SolverOptions['onProgress'];

  if (options !== undefined) {
    if (typeof options !== 'object' || options === null) {
      throw new TypeError('Solver options must be an object');
    }

    if (options.maxNodes !== undefined) {
      if (
        typeof options.maxNodes !== 'number' ||
        !Number.isInteger(options.maxNodes) ||
        options.maxNodes < 1
      ) {
        throw new TypeError('Option maxNodes must be a positive integer >= 1');
      }
      maxNodes = options.maxNodes;
    }

    if (options.maxDepth !== undefined) {
      if (
        typeof options.maxDepth !== 'number' ||
        !Number.isInteger(options.maxDepth) ||
        options.maxDepth < 0
      ) {
        throw new TypeError('Option maxDepth must be a non-negative integer >= 0');
      }
      maxDepth = options.maxDepth;
    }

    if (options.progressIntervalNodes !== undefined) {
      if (
        typeof options.progressIntervalNodes !== 'number' ||
        !Number.isInteger(options.progressIntervalNodes) ||
        options.progressIntervalNodes < 1
      ) {
        throw new TypeError('Option progressIntervalNodes must be a positive integer >= 1');
      }
      progressIntervalNodes = options.progressIntervalNodes;
    }

    if (options.onProgress !== undefined) {
      if (typeof options.onProgress !== 'function') {
        throw new TypeError('Option onProgress must be a function');
      }
      onProgress = options.onProgress;
    }
  }

  return {
    maxNodes,
    maxDepth,
    progressIntervalNodes,
    onProgress,
  };
}

/**
 * Solves the given Gear Cube state using memory-bounded Iterative Deepening A* (IDA*)
 * with the accepted admissible H2 Two-Slice Pattern Database Max heuristic.
 */
export function solveIdaStar(
  state: GearCubeState,
  options?: SolverOptions
): SolveResult {
  const { maxNodes, maxDepth, progressIntervalNodes, onProgress } = validateOptions(options);

  const startTime = Date.now();

  if (isSolved(state)) {
    return {
      status: 'SOLVED',
      algorithm: 'IDA_STAR',
      moves: [],
      depth: 0,
      counters: {
        nodesExpanded: 0,
        nodesGenerated: 0,
      },
      elapsedMs: Date.now() - startTime,
    };
  }

  if (maxDepth === 0) {
    return {
      status: 'LIMIT_REACHED',
      algorithm: 'IDA_STAR',
      limit: 'MAX_DEPTH',
      counters: {
        nodesExpanded: 0,
        nodesGenerated: 0,
      },
      elapsedMs: Date.now() - startTime,
    };
  }

  const initialHeuristic = estimateIdaStarHeuristic(state);
  if (initialHeuristic > maxDepth) {
    return {
      status: 'LIMIT_REACHED',
      algorithm: 'IDA_STAR',
      limit: 'MAX_DEPTH',
      counters: {
        nodesExpanded: 0,
        nodesGenerated: 0,
      },
      elapsedMs: Date.now() - startTime,
    };
  }

  let nodesExpanded = 0;
  let nodesGenerated = 0;
  const currentPathRanks = new Uint8Array(CANONICAL_DOMAIN_SIZE);
  const currentPathMoves: Move[] = [];

  function search(
    currState: GearCubeState,
    g: number,
    threshold: number
  ): number | 'FOUND' | 'MAX_NODES' {
    const h = estimateIdaStarHeuristic(currState);
    const f = g + h;

    if (f > threshold) {
      return f;
    }

    if (isSolved(currState)) {
      return 'FOUND';
    }

    if (g === maxDepth) {
      return Infinity;
    }

    if (nodesExpanded === maxNodes) {
      return 'MAX_NODES';
    }

    const successors: SuccessorRecord[] = [];
    for (let i = 0; i < ALL_MOVES.length; i++) {
      const move = ALL_MOVES[i]!;
      const nextState = applyMove(currState, move);
      nodesGenerated += 1;
      const nextRank = rankState(nextState);
      successors.push({ state: nextState, move, rank: nextRank });
    }

    nodesExpanded += 1;

    if (onProgress && nodesExpanded % progressIntervalNodes === 0) {
      onProgress({
        algorithm: 'IDA_STAR',
        nodesExpanded,
        nodesGenerated,
        elapsedMs: Date.now() - startTime,
        threshold,
        currentDepth: g,
      });
    }

    let minExceeded = Infinity;
    for (let i = 0; i < successors.length; i++) {
      const succ = successors[i]!;
      if (currentPathRanks[succ.rank] === 1) {
        continue;
      }

      currentPathRanks[succ.rank] = 1;
      currentPathMoves.push(succ.move);

      const res = search(succ.state, g + 1, threshold);

      if (res === 'FOUND') {
        return 'FOUND';
      }
      if (res === 'MAX_NODES') {
        return 'MAX_NODES';
      }

      if (typeof res === 'number' && res < minExceeded) {
        minExceeded = res;
      }

      currentPathMoves.pop();
      currentPathRanks[succ.rank] = 0;
    }

    return minExceeded;
  }

  let threshold = initialHeuristic;
  const startRank = rankState(state);

  while (threshold <= maxDepth) {
    currentPathRanks.fill(0);
    currentPathMoves.length = 0;
    currentPathRanks[startRank] = 1;

    const result = search(state, 0, threshold);

    if (result === 'FOUND') {
      return {
        status: 'SOLVED',
        algorithm: 'IDA_STAR',
        moves: [...currentPathMoves],
        depth: currentPathMoves.length,
        counters: {
          nodesExpanded,
          nodesGenerated,
        },
        elapsedMs: Date.now() - startTime,
      };
    }

    if (result === 'MAX_NODES') {
      return {
        status: 'LIMIT_REACHED',
        algorithm: 'IDA_STAR',
        limit: 'MAX_NODES',
        counters: {
          nodesExpanded,
          nodesGenerated,
        },
        elapsedMs: Date.now() - startTime,
      };
    }

    if (result === Infinity || typeof result !== 'number' || result > maxDepth) {
      return {
        status: 'LIMIT_REACHED',
        algorithm: 'IDA_STAR',
        limit: 'MAX_DEPTH',
        counters: {
          nodesExpanded,
          nodesGenerated,
        },
        elapsedMs: Date.now() - startTime,
      };
    }

    threshold = result;
  }

  return {
    status: 'LIMIT_REACHED',
    algorithm: 'IDA_STAR',
    limit: 'MAX_DEPTH',
    counters: {
      nodesExpanded,
      nodesGenerated,
    },
    elapsedMs: Date.now() - startTime,
  };
}
