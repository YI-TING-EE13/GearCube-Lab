import {
  ALL_MOVES,
  applyMove,
  serializeLogicalState,
  SOLVED_GEAR_CUBE_STATE,
  type GearCubeState,
} from '@gearcube/core';

export interface ExactDistanceOracle {
  readonly distances: Map<string, number>;
  readonly diameter: number;
  readonly histogram: Record<number, number>;
}

/**
 * Builds the complete exact canonical distance map from SOLVED_GEAR_CUBE_STATE
 * using an independent, simple string-key BFS over @gearcube/core only.
 * This oracle has zero imports from production solvers.
 */
export function buildExactDistanceOracle(): ExactDistanceOracle {
  const distances = new Map<string, number>();
  const queue: GearCubeState[] = [SOLVED_GEAR_CUBE_STATE];
  const solvedKey = serializeLogicalState(SOLVED_GEAR_CUBE_STATE);
  distances.set(solvedKey, 0);

  let head = 0;
  let diameter = 0;
  const histogram: Record<number, number> = {};

  while (head < queue.length) {
    const current = queue[head++];
    const currentKey = serializeLogicalState(current);
    const currentDist = distances.get(currentKey)!;

    histogram[currentDist] = (histogram[currentDist] || 0) + 1;
    if (currentDist > diameter) {
      diameter = currentDist;
    }

    for (const move of ALL_MOVES) {
      const next = applyMove(current, move);
      const nextKey = serializeLogicalState(next);

      if (!distances.has(nextKey)) {
        distances.set(nextKey, currentDist + 1);
        queue.push(next);
      }
    }
  }

  return { distances, diameter, histogram };
}
