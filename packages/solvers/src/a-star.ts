import {
  ALL_MOVES,
  applyMove,
  CANONICAL_DOMAIN_SIZE,
  isSolved,
  SOLVED_GEAR_CUBE_STATE,
  type GearCubeState,
  type Move,
} from '@gearcube/core';
import { estimateH2Heuristic } from './heuristics.js';
import { rankState, unrankState } from './state-index.js';
import type { SolveResult, SolverOptions } from './types.js';

const INFINITE_COST = 0x7fffffff;

interface HeapEntry {
  readonly rank: number;
  readonly g: number;
  readonly h: number;
  readonly f: number;
  readonly sequence: number;
}

/**
 * Deterministic binary min-heap for A* open-set entries.
 *
 * Entries are ordered by f, h, g, canonical state rank, then insertion order.
 * The rank and sequence tie-breakers keep equal-cost searches reproducible
 * without imposing a heuristic-consistency assumption.
 */
class MinHeap {
  private readonly entries: HeapEntry[] = [];

  get size(): number {
    return this.entries.length;
  }

  push(entry: HeapEntry): void {
    this.entries.push(entry);
    this.bubbleUp(this.entries.length - 1);
  }

  pop(): HeapEntry | undefined {
    if (this.entries.length === 0) {
      return undefined;
    }

    const root = this.entries[0]!;
    const last = this.entries.pop()!;
    if (this.entries.length > 0) {
      this.entries[0] = last;
      this.bubbleDown(0);
    }
    return root;
  }

  private static precedes(a: HeapEntry, b: HeapEntry): boolean {
    if (a.f !== b.f) return a.f < b.f;
    if (a.h !== b.h) return a.h < b.h;
    if (a.g !== b.g) return a.g < b.g;
    if (a.rank !== b.rank) return a.rank < b.rank;
    return a.sequence < b.sequence;
  }

  private bubbleUp(index: number): void {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (!MinHeap.precedes(this.entries[current]!, this.entries[parent]!)) {
        break;
      }
      [this.entries[parent], this.entries[current]] = [
        this.entries[current]!,
        this.entries[parent]!,
      ];
      current = parent;
    }
  }

  private bubbleDown(index: number): void {
    let current = index;
    while (true) {
      const left = current * 2 + 1;
      const right = left + 1;
      let best = current;

      if (
        left < this.entries.length &&
        MinHeap.precedes(this.entries[left]!, this.entries[best]!)
      ) {
        best = left;
      }
      if (
        right < this.entries.length &&
        MinHeap.precedes(this.entries[right]!, this.entries[best]!)
      ) {
        best = right;
      }
      if (best === current) {
        break;
      }

      [this.entries[current], this.entries[best]] = [
        this.entries[best]!,
        this.entries[current]!,
      ];
      current = best;
    }
  }
}

function validateSolverOptions(options?: SolverOptions): {
  readonly maxNodes?: number;
  readonly maxDepth?: number;
  readonly progressIntervalNodes: number;
  readonly onProgress?: SolverOptions['onProgress'];
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

  return {
    ...(maxNodes !== undefined ? { maxNodes } : {}),
    ...(maxDepth !== undefined ? { maxDepth } : {}),
    progressIntervalNodes,
    ...(onProgress !== undefined ? { onProgress } : {}),
  };
}

function reconstructMoves(
  startRank: number,
  goalRank: number,
  parentRank: Int32Array,
  parentMoveIndex: Int8Array,
): Move[] {
  const reversedMoves: Move[] = [];
  let currentRank = goalRank;

  while (currentRank !== startRank) {
    const moveIndex = parentMoveIndex[currentRank]!;
    const previousRank = parentRank[currentRank]!;
    if (moveIndex < 0 || previousRank < 0) {
      throw new Error(`A* parent reconstruction invariant failed at rank ${currentRank}`);
    }

    reversedMoves.push(ALL_MOVES[moveIndex]!);
    currentRank = previousRank;
  }

  reversedMoves.reverse();
  return reversedMoves;
}

function limitResult(
  limit: 'MAX_NODES' | 'MAX_DEPTH',
  nodesExpanded: number,
  nodesGenerated: number,
  startTime: number,
): SolveResult {
  return {
    status: 'LIMIT_REACHED',
    algorithm: 'A_STAR',
    limit,
    counters: { nodesExpanded, nodesGenerated },
    elapsedMs: Date.now() - startTime,
  };
}

/**
 * Solves a Gear Cube state with optimal graph-search A* under the canonical
 * unit-cost 12-move metric and the accepted H2 Two-Slice PDB Max heuristic.
 *
 * The open set is a binary min-heap. Dense typed-array bookkeeping is indexed
 * by the canonical rank domain; lower-g discoveries update parents and reopen
 * closed states, and stale heap entries are discarded before expansion.
 */
export function solveAStar(state: GearCubeState, options?: SolverOptions): SolveResult {
  const startTime = Date.now();
  const { maxNodes = Infinity, maxDepth = Infinity, progressIntervalNodes, onProgress } =
    validateSolverOptions(options);

  if (isSolved(state)) {
    return {
      status: 'SOLVED',
      algorithm: 'A_STAR',
      moves: [],
      depth: 0,
      counters: { nodesExpanded: 0, nodesGenerated: 0 },
      elapsedMs: Date.now() - startTime,
    };
  }

  if (maxDepth === 0) {
    return limitResult('MAX_DEPTH', 0, 0, startTime);
  }

  const startRank = rankState(state);
  const goalRank = rankState(SOLVED_GEAR_CUBE_STATE);
  const initialH = estimateH2Heuristic(state);
  if (initialH > maxDepth) {
    return limitResult('MAX_DEPTH', 0, 0, startTime);
  }

  const bestG = new Int32Array(CANONICAL_DOMAIN_SIZE).fill(INFINITE_COST);
  const parentRank = new Int32Array(CANONICAL_DOMAIN_SIZE).fill(-1);
  const parentMoveIndex = new Int8Array(CANONICAL_DOMAIN_SIZE).fill(-1);
  const closed = new Uint8Array(CANONICAL_DOMAIN_SIZE);
  const open = new MinHeap();

  let sequence = 0;
  let nodesExpanded = 0;
  let nodesGenerated = 0;

  bestG[startRank] = 0;
  open.push({
    rank: startRank,
    g: 0,
    h: initialH,
    f: initialH,
    sequence: sequence++,
  });

  while (open.size > 0) {
    const current = open.pop()!;

    // A lower-g discovery may have superseded this heap entry.
    if (current.g !== bestG[current.rank]) {
      continue;
    }
    // Equal-cost duplicate entries are harmless, but never expand a rank twice.
    if (closed[current.rank] === 1) {
      continue;
    }

    // Optimal A* terminates only when the valid best-g goal entry is popped.
    if (current.rank === goalRank) {
      const moves = reconstructMoves(startRank, goalRank, parentRank, parentMoveIndex);
      return {
        status: 'SOLVED',
        algorithm: 'A_STAR',
        moves,
        depth: moves.length,
        counters: { nodesExpanded, nodesGenerated },
        elapsedMs: Date.now() - startTime,
      };
    }

    // Match the existing solvers: depth-limited nodes are not expanded and do
    // not consume the expansion budget.
    if (current.g >= maxDepth) {
      continue;
    }
    if (nodesExpanded >= maxNodes) {
      return limitResult('MAX_NODES', nodesExpanded, nodesGenerated, startTime);
    }

    closed[current.rank] = 1;
    nodesExpanded += 1;

    const currentState = unrankState(current.rank);
    for (let moveIndex = 0; moveIndex < ALL_MOVES.length; moveIndex++) {
      const move = ALL_MOVES[moveIndex]!;
      const nextState = applyMove(currentState, move);
      nodesGenerated += 1;

      const nextG = current.g + 1;
      if (nextG > maxDepth) {
        continue;
      }

      const nextRank = rankState(nextState);
      if (nextG >= bestG[nextRank]!) {
        continue;
      }

      const nextH = estimateH2Heuristic(nextState);
      bestG[nextRank] = nextG;
      parentRank[nextRank] = current.rank;
      parentMoveIndex[nextRank] = moveIndex;
      // Reopen on an improvement so correctness does not depend on heuristic
      // consistency, even though H2 has an independent exhaustive gate.
      closed[nextRank] = 0;
      open.push({
        rank: nextRank,
        g: nextG,
        h: nextH,
        f: nextG + nextH,
        sequence: sequence++,
      });
    }

    if (onProgress && nodesExpanded % progressIntervalNodes === 0) {
      onProgress({
        algorithm: 'A_STAR',
        nodesExpanded,
        nodesGenerated,
        elapsedMs: Date.now() - startTime,
        bestF: current.f,
        currentDepth: current.g,
        openSize: open.size,
      });
    }
  }

  return limitResult('MAX_DEPTH', nodesExpanded, nodesGenerated, startTime);
}
