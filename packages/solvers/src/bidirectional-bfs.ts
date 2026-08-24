import {
  ALL_MOVES,
  applyMove,
  isSolved,
  SOLVED_GEAR_CUBE_STATE,
  type GearCubeState,
  type Move,
} from '@gearcube/core';
import { inverseMove } from './search-utils.js';
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
 * Solves a Gear Cube state using exact Bidirectional Breadth-First Search (BiBFS).
 *
 * Expands complete layers from both forward (start state) and backward (solved state)
 * frontiers and applies the provable stopping rule (nextForwardDepth + nextBackwardDepth >= bestDepth).
 */
export function solveBidirectionalBfs(
  state: GearCubeState,
  options?: SolverOptions
): SolveResult {
  const startTime = Date.now();
  const { maxNodes, maxDepth, progressIntervalNodes, onProgress } =
    validateSolverOptions(options);

  if (isSolved(state)) {
    return {
      status: 'SOLVED',
      algorithm: 'BIDIRECTIONAL_BFS',
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
      algorithm: 'BIDIRECTIONAL_BFS',
      limit: 'MAX_DEPTH',
      counters: {
        nodesExpanded: 0,
        nodesGenerated: 0,
      },
      elapsedMs: Date.now() - startTime,
    };
  }

  const forwardDist = new Int8Array(TOTAL_STATES);
  forwardDist.fill(-1);
  const forwardParentRank = new Int32Array(TOTAL_STATES);
  forwardParentRank.fill(-1);
  const forwardParentMove = new Int8Array(TOTAL_STATES);
  forwardParentMove.fill(-1);

  const backwardDist = new Int8Array(TOTAL_STATES);
  backwardDist.fill(-1);
  const nextTowardGoalRank = new Int32Array(TOTAL_STATES);
  nextTowardGoalRank.fill(-1);
  const forwardMoveOnBackward = new Int8Array(TOTAL_STATES);
  forwardMoveOnBackward.fill(-1);

  const startRank = rankState(state);
  const goalRank = rankState(SOLVED_GEAR_CUBE_STATE);

  forwardDist[startRank] = 0;
  backwardDist[goalRank] = 0;

  let forwardFrontier: number[] = [startRank];
  let backwardFrontier: number[] = [goalRank];

  let nextForwardDepth = 0;
  let nextBackwardDepth = 0;

  let bestDepth = Infinity;
  let bestMeetingRank = -1;

  let nodesExpanded = 0;
  let nodesGenerated = 0;

  while (true) {
    // Check stopping condition: layer boundary meeting rule
    if (
      bestDepth < Infinity &&
      nextForwardDepth + nextBackwardDepth >= bestDepth
    ) {
      break;
    }

    // Check max depth exhaustion
    if (
      maxDepth !== undefined &&
      bestDepth === Infinity &&
      nextForwardDepth + nextBackwardDepth > maxDepth
    ) {
      return {
        status: 'LIMIT_REACHED',
        algorithm: 'BIDIRECTIONAL_BFS',
        limit: 'MAX_DEPTH',
        counters: {
          nodesExpanded,
          nodesGenerated,
        },
        elapsedMs: Date.now() - startTime,
      };
    }

    if (forwardFrontier.length === 0 && backwardFrontier.length === 0) {
      if (bestDepth < Infinity) break;
      throw new Error('Invariant failure: both frontiers exhausted without solution');
    }

    // Frontier selection: expand smaller complete layer; tie goes to FORWARD
    let chooseForward = true;
    if (forwardFrontier.length === 0) {
      chooseForward = false;
    } else if (backwardFrontier.length === 0) {
      chooseForward = true;
    } else if (forwardFrontier.length <= backwardFrontier.length) {
      chooseForward = true;
    } else {
      chooseForward = false;
    }

    if (chooseForward) {
      const currentLayer = forwardFrontier;
      const layerDepth = nextForwardDepth;
      const nextLayer: number[] = [];
      nextForwardDepth++;

      for (let i = 0; i < currentLayer.length; i++) {
        if (maxNodes !== undefined && nodesExpanded === maxNodes) {
          return {
            status: 'LIMIT_REACHED',
            algorithm: 'BIDIRECTIONAL_BFS',
            limit: 'MAX_NODES',
            counters: {
              nodesExpanded,
              nodesGenerated,
            },
            elapsedMs: Date.now() - startTime,
          };
        }

        const uRank = currentLayer[i]!;
        const uState = unrankState(uRank);
        nodesExpanded++;

        for (let mIdx = 0; mIdx < ALL_MOVES.length; mIdx++) {
          const move = ALL_MOVES[mIdx]!;
          const vState = applyMove(uState, move);
          nodesGenerated++;
          const vRank = rankState(vState);

          if (forwardDist[vRank] === -1) {
            forwardDist[vRank] = layerDepth + 1;
            forwardParentRank[vRank] = uRank;
            forwardParentMove[vRank] = mIdx;
            nextLayer.push(vRank);
          }

          if (backwardDist[vRank] !== -1) {
            const candidateDepth = forwardDist[vRank]! + backwardDist[vRank]!;
            if (maxDepth === undefined || candidateDepth <= maxDepth) {
              if (candidateDepth < bestDepth) {
                bestDepth = candidateDepth;
                bestMeetingRank = vRank;
              } else if (
                candidateDepth === bestDepth &&
                (bestMeetingRank === -1 || vRank < bestMeetingRank)
              ) {
                bestMeetingRank = vRank;
              }
            }
          }
        }

        if (onProgress && nodesExpanded % progressIntervalNodes === 0) {
          onProgress({
            algorithm: 'BIDIRECTIONAL_BFS',
            nodesExpanded,
            nodesGenerated,
            elapsedMs: Date.now() - startTime,
            forwardDepth: nextForwardDepth,
            backwardDepth: nextBackwardDepth,
            bestSolutionDepth: bestDepth === Infinity ? null : bestDepth,
          });
        }
      }

      forwardFrontier = nextLayer;
    } else {
      const currentLayer = backwardFrontier;
      const layerDepth = nextBackwardDepth;
      const nextLayer: number[] = [];
      nextBackwardDepth++;

      for (let i = 0; i < currentLayer.length; i++) {
        if (maxNodes !== undefined && nodesExpanded === maxNodes) {
          return {
            status: 'LIMIT_REACHED',
            algorithm: 'BIDIRECTIONAL_BFS',
            limit: 'MAX_NODES',
            counters: {
              nodesExpanded,
              nodesGenerated,
            },
            elapsedMs: Date.now() - startTime,
          };
        }

        const vRank = currentLayer[i]!;
        const vState = unrankState(vRank);
        nodesExpanded++;

        for (let mIdx = 0; mIdx < ALL_MOVES.length; mIdx++) {
          const forwardMove = ALL_MOVES[mIdx]!;
          const invMove = inverseMove(forwardMove);
          const uState = applyMove(vState, invMove);
          nodesGenerated++;
          const uRank = rankState(uState);

          if (backwardDist[uRank] === -1) {
            backwardDist[uRank] = layerDepth + 1;
            nextTowardGoalRank[uRank] = vRank;
            forwardMoveOnBackward[uRank] = mIdx;
            nextLayer.push(uRank);
          }

          if (forwardDist[uRank] !== -1) {
            const candidateDepth = forwardDist[uRank]! + backwardDist[uRank]!;
            if (maxDepth === undefined || candidateDepth <= maxDepth) {
              if (candidateDepth < bestDepth) {
                bestDepth = candidateDepth;
                bestMeetingRank = uRank;
              } else if (
                candidateDepth === bestDepth &&
                (bestMeetingRank === -1 || uRank < bestMeetingRank)
              ) {
                bestMeetingRank = uRank;
              }
            }
          }
        }

        if (onProgress && nodesExpanded % progressIntervalNodes === 0) {
          onProgress({
            algorithm: 'BIDIRECTIONAL_BFS',
            nodesExpanded,
            nodesGenerated,
            elapsedMs: Date.now() - startTime,
            forwardDepth: nextForwardDepth,
            backwardDepth: nextBackwardDepth,
            bestSolutionDepth: bestDepth === Infinity ? null : bestDepth,
          });
        }
      }

      backwardFrontier = nextLayer;
    }
  }

  // Reconstruct path
  const forwardMoves: Move[] = [];
  let curr = bestMeetingRank;
  while (curr !== startRank) {
    const p = forwardParentRank[curr]!;
    const mIdx = forwardParentMove[curr]!;
    forwardMoves.push(ALL_MOVES[mIdx]!);
    curr = p;
  }
  forwardMoves.reverse();

  const backwardMoves: Move[] = [];
  curr = bestMeetingRank;
  while (curr !== goalRank) {
    const next = nextTowardGoalRank[curr]!;
    const mIdx = forwardMoveOnBackward[curr]!;
    backwardMoves.push(ALL_MOVES[mIdx]!);
    curr = next;
  }

  const moves = [...forwardMoves, ...backwardMoves];

  return {
    status: 'SOLVED',
    algorithm: 'BIDIRECTIONAL_BFS',
    moves,
    depth: moves.length,
    counters: {
      nodesExpanded,
      nodesGenerated,
    },
    elapsedMs: Date.now() - startTime,
  };
}
