import {
  ALL_MOVES,
  applyMove,
  serializeLogicalState,
  SOLVED_GEAR_CUBE_STATE,
  type GearCubeState,
} from '@gearcube/core';

/**
 * Creates the canonical, state-derived stable identifier for a benchmark case.
 * Invariant to sampling index, random seed, or suite identity.
 */
export function createBenchmarkCaseId(exactDepth: number, stateKey: string): string {
  return `d${exactDepth}:${stateKey}`;
}

/**
 * Read-only interface for the independent Core-only exact-distance corpus.
 */
export interface ExactDistanceCorpus {
  readonly totalStates: number;
  readonly diameter: number;
  readonly histogram: Readonly<Record<number, number>>;
  getStatesAtDepth(depth: number): readonly string[];
  getExactDistance(stateKey: string): number | undefined;
  hasState(stateKey: string): boolean;
}

/**
 * Implementation of ExactDistanceCorpus holding indexed states partitioned by exact distance.
 */
class ExactDistanceCorpusImpl implements ExactDistanceCorpus {
  readonly totalStates: number;
  readonly diameter: number;
  readonly histogram: Readonly<Record<number, number>>;
  private readonly depthBuckets: readonly (readonly string[])[];
  private readonly distanceMap: ReadonlyMap<string, number>;

  constructor(
    depthBuckets: (readonly string[])[],
    distanceMap: Map<string, number>,
  ) {
    this.depthBuckets = Object.freeze(depthBuckets.map((b) => Object.freeze([...b])));
    this.distanceMap = distanceMap;
    this.totalStates = distanceMap.size;

    let maxDepth = 0;
    const hist: Record<number, number> = {};
    for (let d = 0; d < this.depthBuckets.length; d++) {
      const bucket = this.depthBuckets[d];
      const count = bucket ? bucket.length : 0;
      hist[d] = count;
      if (count > 0 && d > maxDepth) {
        maxDepth = d;
      }
    }
    this.diameter = maxDepth;
    this.histogram = Object.freeze(hist);
  }

  getStatesAtDepth(depth: number): readonly string[] {
    if (depth < 0 || depth >= this.depthBuckets.length) {
      return Object.freeze([]);
    }
    const bucket = this.depthBuckets[depth];
    return bucket ? bucket : Object.freeze([]);
  }

  getExactDistance(stateKey: string): number | undefined {
    return this.distanceMap.get(stateKey);
  }

  hasState(stateKey: string): boolean {
    return this.distanceMap.has(stateKey);
  }
}

/**
 * Builds an independent Core-only exact-distance index from SOLVED_GEAR_CUBE_STATE.
 * Traverses all 41,472 reachable states using purely @gearcube/core transitions.
 */
export function buildExactDistanceCorpus(): ExactDistanceCorpus {
  const distanceMap = new Map<string, number>();
  const depthBuckets: string[][] = Array.from({ length: 9 }, () => []);

  const startState = SOLVED_GEAR_CUBE_STATE;
  const startKey = serializeLogicalState(startState);

  distanceMap.set(startKey, 0);
  const d0Bucket = depthBuckets[0];
  if (d0Bucket) {
    d0Bucket.push(startKey);
  }

  // Queue holds { state, depth }
  const queue: Array<{ state: GearCubeState; depth: number }> = [
    { state: startState, depth: 0 },
  ];

  let head = 0;
  while (head < queue.length) {
    const item = queue[head++];
    if (!item) break;
    const { state, depth } = item;
    const nextDepth = depth + 1;

    for (const move of ALL_MOVES) {
      const nextState = applyMove(state, move);
      const nextKey = serializeLogicalState(nextState);

      if (!distanceMap.has(nextKey)) {
        distanceMap.set(nextKey, nextDepth);
        while (depthBuckets.length <= nextDepth) {
          depthBuckets.push([]);
        }
        const bucket = depthBuckets[nextDepth];
        if (bucket) {
          bucket.push(nextKey);
        }
        queue.push({ state: nextState, depth: nextDepth });
      }
    }
  }

  return new ExactDistanceCorpusImpl(depthBuckets, distanceMap);
}
