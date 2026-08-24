import {
  ALL_MOVES,
  applyMove,
  isSolved,
  type GearCubeState,
  type Move,
} from '@gearcube/core';
import { rankState, unrankState } from './state-index.js';
import type { SolveResult, SolverOptions } from './types.js';

const TOTAL_STATES = 41472;

function validateSolverOptions(options?: SolverOptions): {
  readonly maxNodes?: number;
  readonly maxDepth?: number;
  readonly progressIntervalNodes: number;
  readonly onProgress?: (telemetry: import('./types.js').SearchTelemetry) => void;
} {
  if (options === undefined) {
    return { progressIntervalNodes: 500 };
  }
  if (typeof options !== 'object' || options === null) {
    throw new TypeError('Solver options must be an object if provided');
  }

  const { maxNodes, maxDepth, progressIntervalNodes = 500, onProgress } = options;

  if (maxNodes !== undefined) {
    if (typeof maxNodes !== 'number' || !Number.isInteger(maxNodes) || maxNodes < 1) {
      throw new TypeError('maxNodes must be an integer >= 1');
    }
  }

  if (maxDepth !== undefined) {
    if (typeof maxDepth !== 'number' || !Number.isInteger(maxDepth) || maxDepth < 0) {
      throw new TypeError('maxDepth must be an integer >= 0');
    }
  }

  if (progressIntervalNodes !== undefined) {
    if (
      typeof progressIntervalNodes !== 'number' ||
      !Number.isInteger(progressIntervalNodes) ||
      progressIntervalNodes < 1
    ) {
      throw new TypeError('progressIntervalNodes must be an integer >= 1');
    }
  }

  if (onProgress !== undefined && typeof onProgress !== 'function') {
    throw new TypeError('onProgress must be a function if provided');
  }

  const result: {
    maxNodes?: number;
    maxDepth?: number;
    progressIntervalNodes: number;
    onProgress?: (telemetry: import('./types.js').SearchTelemetry) => void;
  } = {
    progressIntervalNodes,
  };

  if (maxNodes !== undefined) {
    result.maxNodes = maxNodes;
  }
  if (maxDepth !== undefined) {
    result.maxDepth = maxDepth;
  }
  if (onProgress !== undefined) {
    result.onProgress = onProgress;
  }

  return result;
}

/**
 * Solves a Gear Cube state using exact deterministic Breadth-First Search (BFS).
 *
 * Guarantees a shortest-path (optimal) solution under the canonical 12-move metric.
 */
export function solveBfs(
  state: GearCubeState,
  options?: SolverOptions
): SolveResult {
  const startTime = Date.now();
  const { maxNodes, maxDepth, progressIntervalNodes, onProgress } =
    validateSolverOptions(options);

  if (isSolved(state)) {
    return {
      status: 'SOLVED',
      algorithm: 'BFS',
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
      algorithm: 'BFS',
      limit: 'MAX_DEPTH',
      counters: {
        nodesExpanded: 0,
        nodesGenerated: 0,
      },
      elapsedMs: Date.now() - startTime,
    };
  }

  const distance = new Int8Array(TOTAL_STATES);
  distance.fill(-1);
  const parentRank = new Int32Array(TOTAL_STATES);
  parentRank.fill(-1);
  const parentMoveIndex = new Int8Array(TOTAL_STATES);
  parentMoveIndex.fill(-1);
  const queue = new Int32Array(TOTAL_STATES);

  let head = 0;
  let tail = 0;

  const startRank = rankState(state);
  distance[startRank] = 0;
  queue[tail++] = startRank;

  let nodesExpanded = 0;
  let nodesGenerated = 0;

  while (head < tail) {
    const currentRank = queue[head++]!;
    const currentDist = distance[currentRank]!;
    const currentState = unrankState(currentRank);

    // Goal test dequeued candidate
    if (isSolved(currentState)) {
      const moves: Move[] = [];
      let r = currentRank;
      while (r !== startRank) {
        const p = parentRank[r]!;
        const mIdx = parentMoveIndex[r]!;
        moves.push(ALL_MOVES[mIdx]!);
        r = p;
      }
      moves.reverse();
      return {
        status: 'SOLVED',
        algorithm: 'BFS',
        moves,
        depth: moves.length,
        counters: {
          nodesExpanded,
          nodesGenerated,
        },
        elapsedMs: Date.now() - startTime,
      };
    }

    // Check non-goal expansion budget
    if (maxNodes !== undefined && nodesExpanded === maxNodes) {
      return {
        status: 'LIMIT_REACHED',
        algorithm: 'BFS',
        limit: 'MAX_NODES',
        counters: {
          nodesExpanded,
          nodesGenerated,
        },
        elapsedMs: Date.now() - startTime,
      };
    }

    // Check max depth threshold
    if (maxDepth !== undefined && currentDist === maxDepth) {
      continue;
    }

    // Enumerate successors
    nodesExpanded++;
    for (let mIdx = 0; mIdx < ALL_MOVES.length; mIdx++) {
      const move = ALL_MOVES[mIdx]!;
      const nextState = applyMove(currentState, move);
      nodesGenerated++;
      const nextRank = rankState(nextState);

      if (distance[nextRank] === -1) {
        distance[nextRank] = currentDist + 1;
        parentRank[nextRank] = currentRank;
        parentMoveIndex[nextRank] = mIdx;
        queue[tail++] = nextRank;
      }
    }

    // Progress telemetry
    if (onProgress && nodesExpanded % progressIntervalNodes === 0) {
      onProgress({
        algorithm: 'BFS',
        nodesExpanded,
        nodesGenerated,
        elapsedMs: Date.now() - startTime,
        frontierDepth: currentDist,
      });
    }
  }

  if (maxDepth !== undefined) {
    return {
      status: 'LIMIT_REACHED',
      algorithm: 'BFS',
      limit: 'MAX_DEPTH',
      counters: {
        nodesExpanded,
        nodesGenerated,
      },
      elapsedMs: Date.now() - startTime,
    };
  }

  throw new Error('Invariant failure: graph exhausted without reaching solved state');
}
