/**
 * @file transitions-exhaustive.test.ts
 * @description Exhaustive 497,664 transition verification: Closure, Direct-vs-Oracle, Invertibility, and 12-Repeat Identity.
 */

import { describe, expect, it } from 'vitest';
import {
  ALL_MOVES,
  CORNER_CONFIGURATIONS,
  equalsGearCubeState,
  isGearCubeState,
  SLICE_GEAR_PHASES,
  SLICE_PERMUTATION_CLASSES,
  type CornerConfiguration,
  type Direction,
  type Face,
  type GearCubeState,
  type Move,
  type SliceGearPhase,
  type SlicePermutationClass,
} from '../src/index.js';
import { applyMove } from '../src/transitions.js';

// ============================================================================
// SECTION 1: INDEPENDENT TEST-ONLY REFERENCE ORACLE
// ============================================================================
// The oracle derivation below is completely isolated from production tables
// (transition-data.ts) and does NOT call applyMove. It derives transitions from
// physical piece arrays and rigid reference frame normalization.
// ============================================================================

/** Reference Klein-4 V4 permutations */
const ORACLE_V4: readonly (readonly [number, number, number, number])[] = Object.freeze([
  Object.freeze([0, 1, 2, 3] as const),
  Object.freeze([1, 0, 3, 2] as const),
  Object.freeze([2, 3, 0, 1] as const),
  Object.freeze([3, 2, 1, 0] as const),
]);

/** Reference S_4 corner permutations for T_free */
const S4_PERMUTATIONS: readonly (readonly [number, number, number, number])[] = ((): readonly (readonly [number, number, number, number])[] => {
  const perms: [number, number, number, number][] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (j === i) continue;
      for (let k = 0; k < 4; k++) {
        if (k === i || k === j) continue;
        for (let l = 0; l < 4; l++) {
          if (l === i || l === j || l === k) continue;
          perms.push([i, j, k, l]);
        }
      }
    }
  }
  return Object.freeze(perms.map((p) => Object.freeze(p)));
})();

/** S_4 rank lookup */
const S4_TO_RANK = new Map<string, CornerConfiguration>(
  S4_PERMUTATIONS.map((p, idx) => [p.join(','), idx])
);

/** Canonical base edge permutation tables B_X, B_Y, B_Z */
const ORACLE_BASES = {
  X: [
    [0, 1, 2, 3], [0, 1, 3, 2], [0, 3, 2, 1], [0, 3, 1, 2],
    [0, 2, 3, 1], [0, 2, 1, 3], [0, 1, 3, 2], [0, 1, 2, 3],
    [0, 2, 3, 1], [0, 2, 1, 3], [0, 3, 2, 1], [0, 3, 1, 2],
    [0, 3, 1, 2], [0, 3, 2, 1], [0, 2, 1, 3], [0, 2, 3, 1],
    [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 2, 3, 1],
    [0, 3, 1, 2], [0, 3, 2, 1], [0, 1, 3, 2], [0, 1, 2, 3],
  ],
  Y: [
    [0, 1, 2, 3], [0, 3, 2, 1], [0, 2, 1, 3], [0, 3, 1, 2],
    [0, 2, 3, 1], [0, 1, 3, 2], [0, 3, 2, 1], [0, 1, 2, 3],
    [0, 2, 3, 1], [0, 1, 3, 2], [0, 2, 1, 3], [0, 3, 1, 2],
    [0, 3, 1, 2], [0, 2, 1, 3], [0, 1, 3, 2], [0, 2, 3, 1],
    [0, 1, 2, 3], [0, 3, 2, 1], [0, 1, 3, 2], [0, 2, 3, 1],
    [0, 3, 1, 2], [0, 2, 1, 3], [0, 3, 2, 1], [0, 1, 2, 3],
  ],
  Z: [
    [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 2, 3, 1],
    [0, 3, 1, 2], [0, 3, 2, 1], [0, 1, 3, 2], [0, 1, 2, 3],
    [0, 3, 1, 2], [0, 3, 2, 1], [0, 2, 1, 3], [0, 2, 3, 1],
    [0, 2, 3, 1], [0, 2, 1, 3], [0, 3, 2, 1], [0, 3, 1, 2],
    [0, 1, 2, 3], [0, 1, 3, 2], [0, 3, 2, 1], [0, 3, 1, 2],
    [0, 2, 3, 1], [0, 2, 1, 3], [0, 1, 3, 2], [0, 1, 2, 3],
  ],
} as const;

/** Free-corner slot swaps on T_free [0: UFR, 1: UBL, 2: DFL, 3: DBR] */
const CORNER_SWAPS_FREE: Record<Face, readonly [number, number]> = {
  U: [0, 1],
  D: [2, 3],
  F: [0, 2],
  B: [1, 3],
  R: [0, 3],
  L: [1, 2],
};

/** Slot source maps for edge transformations under physical move */
const EDGE_SRC_MAPS: Record<Face, Record<Direction, Record<'X' | 'Y' | 'Z', readonly [number, number, number, number]>>> = {
  U: {
    CW: { X: [1, 0, 2, 3], Y: [1, 2, 3, 0], Z: [1, 0, 2, 3] },
    CCW: { X: [1, 0, 2, 3], Y: [3, 0, 1, 2], Z: [1, 0, 2, 3] },
  },
  D: {
    CW: { X: [0, 1, 3, 2], Y: [3, 0, 1, 2], Z: [0, 1, 3, 2] },
    CCW: { X: [0, 1, 3, 2], Y: [1, 2, 3, 0], Z: [0, 1, 3, 2] },
  },
  F: {
    CW: { X: [0, 2, 1, 3], Y: [1, 0, 2, 3], Z: [1, 2, 3, 0] },
    CCW: { X: [0, 2, 1, 3], Y: [1, 0, 2, 3], Z: [3, 0, 1, 2] },
  },
  B: {
    CW: { X: [3, 1, 2, 0], Y: [0, 1, 3, 2], Z: [3, 0, 1, 2] },
    CCW: { X: [3, 1, 2, 0], Y: [0, 1, 3, 2], Z: [1, 2, 3, 0] },
  },
  R: {
    CW: { X: [1, 2, 3, 0], Y: [0, 2, 1, 3], Z: [3, 1, 2, 0] },
    CCW: { X: [3, 0, 1, 2], Y: [0, 2, 1, 3], Z: [3, 1, 2, 0] },
  },
  L: {
    CW: { X: [3, 0, 1, 2], Y: [3, 1, 2, 0], Z: [0, 2, 1, 3] },
    CCW: { X: [1, 2, 3, 0], Y: [3, 1, 2, 0], Z: [0, 2, 1, 3] },
  },
};

/** Gear twist phase deltas in Z_3 */
const EDGE_DELTA_PHASES: Record<Face, Record<Direction, Record<'X' | 'Y' | 'Z', SliceGearPhase>>> = {
  U: { CW: { X: 0, Y: 1, Z: 0 }, CCW: { X: 0, Y: 2, Z: 0 } },
  D: { CW: { X: 0, Y: 2, Z: 0 }, CCW: { X: 0, Y: 1, Z: 0 } },
  F: { CW: { X: 0, Y: 0, Z: 1 }, CCW: { X: 0, Y: 0, Z: 2 } },
  B: { CW: { X: 0, Y: 0, Z: 2 }, CCW: { X: 0, Y: 0, Z: 1 } },
  R: { CW: { X: 1, Y: 0, Z: 0 }, CCW: { X: 2, Y: 0, Z: 0 } },
  L: { CW: { X: 2, Y: 0, Z: 0 }, CCW: { X: 1, Y: 0, Z: 0 } },
};

/**
 * Independent reference transition oracle.
 * Materializes logical placement from raw geometry and normalizes back to canonical coordinates.
 */
function referenceOracle(state: GearCubeState, move: Move): GearCubeState {
  const { face, direction } = move;
  const c = state.cornerConfiguration;

  // 1. Next corner configuration S_4 rank
  const pFree = [...S4_PERMUTATIONS[c]];
  const [s1, s2] = CORNER_SWAPS_FREE[face];
  const tmp = pFree[s1];
  pFree[s1] = pFree[s2];
  pFree[s2] = tmp;
  const nextC = S4_TO_RANK.get(pFree.join(','))!;

  // 2. Next edge permutation classes
  const srcMap = EDGE_SRC_MAPS[face][direction];
  const dpMap = EDGE_DELTA_PHASES[face][direction];

  function computeNextSlice(sl: 'X' | 'Y' | 'Z', currentK: SlicePermutationClass, currentP: SliceGearPhase) {
    const baseC = ORACLE_BASES[sl][c];
    const v4 = ORACLE_V4[currentK];
    const e = [baseC[v4[0]], baseC[v4[1]], baseC[v4[2]], baseC[v4[3]]];
    const src = srcMap[sl];
    const newE = [e[src[0]], e[src[1]], e[src[2]], e[src[3]]];

    const baseNextC = ORACLE_BASES[sl][nextC];
    let nextK: SlicePermutationClass = 0;
    for (let candidateK = 0; candidateK < 4; candidateK++) {
      const candidateV4 = ORACLE_V4[candidateK];
      if (
        baseNextC[candidateV4[0]] === newE[0] &&
        baseNextC[candidateV4[1]] === newE[1] &&
        baseNextC[candidateV4[2]] === newE[2] &&
        baseNextC[candidateV4[3]] === newE[3]
      ) {
        nextK = candidateK as SlicePermutationClass;
        break;
      }
    }

    return {
      permutationClass: nextK,
      phase: ((currentP + dpMap[sl]) % 3) as SliceGearPhase,
    };
  }

  return {
    cornerConfiguration: nextC,
    sliceX: computeNextSlice('X', state.sliceX.permutationClass, state.sliceX.phase),
    sliceY: computeNextSlice('Y', state.sliceY.permutationClass, state.sliceY.phase),
    sliceZ: computeNextSlice('Z', state.sliceZ.permutationClass, state.sliceZ.phase),
  };
}

/** Test-local helper for move inversion */
function inverseMove(move: Move): Move {
  return {
    face: move.face,
    direction: move.direction === 'CW' ? 'CCW' : 'CW',
  };
}

// ============================================================================
// SECTION 2: EXHAUSTIVE TRANSITION VERIFICATION HARNESS
// ============================================================================

describe('Phase 1C — Exhaustive 497,664 Transition Verification', () => {
  it('verifies 100% transition closure across all 497,664 state-move pairs', { timeout: 30000 }, () => {
    let checkedTransitions = 0;
    let closureFailures = 0;

    for (const c of CORNER_CONFIGURATIONS) {
      for (const kx of SLICE_PERMUTATION_CLASSES) {
        for (const px of SLICE_GEAR_PHASES) {
          for (const ky of SLICE_PERMUTATION_CLASSES) {
            for (const py of SLICE_GEAR_PHASES) {
              for (const kz of SLICE_PERMUTATION_CLASSES) {
                for (const pz of SLICE_GEAR_PHASES) {
                  const state: GearCubeState = {
                    cornerConfiguration: c,
                    sliceX: { permutationClass: kx, phase: px },
                    sliceY: { permutationClass: ky, phase: py },
                    sliceZ: { permutationClass: kz, phase: pz },
                  };

                  for (const move of ALL_MOVES) {
                    checkedTransitions++;
                    const next = applyMove(state, move);
                    if (!isGearCubeState(next)) {
                      closureFailures++;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(checkedTransitions).toBe(497664);
    expect(closureFailures).toBe(0);
  });

  it('verifies 100% direct applyMove vs independent reference oracle equivalence (497,664 / 497,664)', { timeout: 30000 }, () => {
    let checkedTransitions = 0;
    let oracleMismatches = 0;

    for (const c of CORNER_CONFIGURATIONS) {
      for (const kx of SLICE_PERMUTATION_CLASSES) {
        for (const px of SLICE_GEAR_PHASES) {
          for (const ky of SLICE_PERMUTATION_CLASSES) {
            for (const py of SLICE_GEAR_PHASES) {
              for (const kz of SLICE_PERMUTATION_CLASSES) {
                for (const pz of SLICE_GEAR_PHASES) {
                  const state: GearCubeState = {
                    cornerConfiguration: c,
                    sliceX: { permutationClass: kx, phase: px },
                    sliceY: { permutationClass: ky, phase: py },
                    sliceZ: { permutationClass: kz, phase: pz },
                  };

                  for (const move of ALL_MOVES) {
                    checkedTransitions++;
                    const directResult = applyMove(state, move);
                    const oracleResult = referenceOracle(state, move);

                    if (!equalsGearCubeState(directResult, oracleResult)) {
                      oracleMismatches++;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(checkedTransitions).toBe(497664);
    expect(oracleMismatches).toBe(0);
  });

  it('verifies 100% inverse round-trip recovery across all 497,664 state-move pairs', { timeout: 30000 }, () => {
    let checkedTransitions = 0;
    let inverseFailures = 0;

    for (const c of CORNER_CONFIGURATIONS) {
      for (const kx of SLICE_PERMUTATION_CLASSES) {
        for (const px of SLICE_GEAR_PHASES) {
          for (const ky of SLICE_PERMUTATION_CLASSES) {
            for (const py of SLICE_GEAR_PHASES) {
              for (const kz of SLICE_PERMUTATION_CLASSES) {
                for (const pz of SLICE_GEAR_PHASES) {
                  const state: GearCubeState = {
                    cornerConfiguration: c,
                    sliceX: { permutationClass: kx, phase: px },
                    sliceY: { permutationClass: ky, phase: py },
                    sliceZ: { permutationClass: kz, phase: pz },
                  };

                  for (const move of ALL_MOVES) {
                    checkedTransitions++;
                    const forward = applyMove(state, move);
                    const restored = applyMove(forward, inverseMove(move));

                    if (!equalsGearCubeState(restored, state)) {
                      inverseFailures++;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(checkedTransitions).toBe(497664);
    expect(inverseFailures).toBe(0);
  });

  it('verifies 12-repeat identity for all 12 directed moves across the state space', { timeout: 30000 }, () => {
    let checkedStates = 0;
    let identityFailures = 0;

    for (const c of CORNER_CONFIGURATIONS) {
      for (const kx of SLICE_PERMUTATION_CLASSES) {
        for (const px of SLICE_GEAR_PHASES) {
          for (const ky of SLICE_PERMUTATION_CLASSES) {
            for (const py of SLICE_GEAR_PHASES) {
              for (const kz of SLICE_PERMUTATION_CLASSES) {
                for (const pz of SLICE_GEAR_PHASES) {
                  checkedStates++;
                  const state: GearCubeState = {
                    cornerConfiguration: c,
                    sliceX: { permutationClass: kx, phase: px },
                    sliceY: { permutationClass: ky, phase: py },
                    sliceZ: { permutationClass: kz, phase: pz },
                  };

                  for (const move of ALL_MOVES) {
                    let cur = state;
                    for (let step = 0; step < 12; step++) {
                      cur = applyMove(cur, move);
                    }

                    if (!equalsGearCubeState(cur, state)) {
                      identityFailures++;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(checkedStates).toBe(41472);
    expect(identityFailures).toBe(0);
  });
});
