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

/** Reference tables for canonical state materialization */
const T_REF: readonly (readonly number[])[] = [
  [0, 1, 2, 3], [1, 0, 2, 3], [0, 2, 1, 3], [2, 0, 1, 3], [1, 2, 0, 3], [2, 1, 0, 3],
  [1, 0, 2, 3], [0, 1, 2, 3], [1, 2, 0, 3], [2, 1, 0, 3], [0, 2, 1, 3], [2, 0, 1, 3],
  [2, 0, 1, 3], [0, 2, 1, 3], [2, 1, 0, 3], [1, 2, 0, 3], [0, 1, 2, 3], [1, 0, 2, 3],
  [2, 1, 0, 3], [1, 2, 0, 3], [2, 0, 1, 3], [0, 2, 1, 3], [1, 0, 2, 3], [0, 1, 2, 3],
];

const T_FREE: readonly (readonly number[])[] = [
  [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 2, 3, 1], [0, 3, 1, 2], [0, 3, 2, 1],
  [1, 0, 2, 3], [1, 0, 3, 2], [1, 2, 0, 3], [1, 2, 3, 0], [1, 3, 0, 2], [1, 3, 2, 0],
  [2, 0, 1, 3], [2, 0, 3, 1], [2, 1, 0, 3], [2, 1, 3, 0], [2, 3, 0, 1], [2, 3, 1, 0],
  [3, 0, 1, 2], [3, 0, 2, 1], [3, 1, 0, 2], [3, 1, 2, 0], [3, 2, 0, 1], [3, 2, 1, 0],
];

const B_X: readonly (readonly number[])[] = [
  [0, 1, 2, 3], [0, 1, 3, 2], [0, 3, 2, 1], [0, 3, 1, 2], [0, 2, 3, 1], [0, 2, 1, 3],
  [0, 1, 3, 2], [0, 1, 2, 3], [0, 2, 3, 1], [0, 2, 1, 3], [0, 3, 2, 1], [0, 3, 1, 2],
  [0, 3, 1, 2], [0, 3, 2, 1], [0, 2, 1, 3], [0, 2, 3, 1], [0, 1, 2, 3], [0, 1, 3, 2],
  [0, 2, 1, 3], [0, 2, 3, 1], [0, 3, 1, 2], [0, 3, 2, 1], [0, 1, 3, 2], [0, 1, 2, 3],
];

const B_Y: readonly (readonly number[])[] = [
  [0, 1, 2, 3], [0, 3, 2, 1], [0, 2, 1, 3], [0, 3, 1, 2], [0, 2, 3, 1], [0, 1, 3, 2],
  [0, 3, 2, 1], [0, 1, 2, 3], [0, 2, 3, 1], [0, 1, 3, 2], [0, 2, 1, 3], [0, 3, 1, 2],
  [0, 3, 1, 2], [0, 2, 1, 3], [0, 1, 3, 2], [0, 2, 3, 1], [0, 1, 2, 3], [0, 3, 2, 1],
  [0, 1, 3, 2], [0, 2, 3, 1], [0, 3, 1, 2], [0, 2, 1, 3], [0, 3, 2, 1], [0, 1, 2, 3],
];

const B_Z: readonly (readonly number[])[] = [
  [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 2, 3, 1], [0, 3, 1, 2], [0, 3, 2, 1],
  [0, 1, 3, 2], [0, 1, 2, 3], [0, 3, 1, 2], [0, 3, 2, 1], [0, 2, 1, 3], [0, 2, 3, 1],
  [0, 2, 3, 1], [0, 2, 1, 3], [0, 3, 2, 1], [0, 3, 1, 2], [0, 1, 2, 3], [0, 1, 3, 2],
  [0, 3, 2, 1], [0, 3, 1, 2], [0, 2, 3, 1], [0, 2, 1, 3], [0, 1, 3, 2], [0, 1, 2, 3],
];

const V4: readonly (readonly number[])[] = [
  [0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 0, 1], [3, 2, 1, 0],
];

const FRAME_PERMS: Record<number, {
  readonly T_ref: readonly number[];
  readonly T_free: readonly number[];
  readonly X: readonly number[];
  readonly Y: readonly number[];
  readonly Z: readonly number[];
}> = {
  3: { T_ref: [0, 1, 2, 3], T_free: [0, 1, 2, 3], X: [0, 1, 2, 3], Y: [0, 1, 2, 3], Z: [0, 1, 2, 3] },
  2: { T_ref: [1, 0, 3, 2], T_free: [1, 0, 3, 2], X: [1, 0, 3, 2], Y: [2, 3, 0, 1], Z: [1, 0, 3, 2] },
  1: { T_ref: [2, 3, 0, 1], T_free: [2, 3, 0, 1], X: [3, 2, 1, 0], Y: [1, 0, 3, 2], Z: [2, 3, 0, 1] },
  0: { T_ref: [3, 2, 1, 0], T_free: [3, 2, 1, 0], X: [2, 3, 0, 1], Y: [3, 2, 1, 0], Z: [3, 2, 1, 0] },
};

const CORNER_LOOKUP = new Map<string, CornerConfiguration>();
for (let i = 0; i < 24; i++) {
  CORNER_LOOKUP.set(`${T_REF[i]!.join(',')}|${T_FREE[i]!.join(',')}`, i as CornerConfiguration);
}

const V4_LOOKUP = new Map<string, SlicePermutationClass>();
for (let k = 0; k < 4; k++) {
  V4_LOOKUP.set(V4[k]!.join(','), k as SlicePermutationClass);
}

const CORNER_SLOTS = ['UFL', 'UBR', 'DFR', 'DBL', 'UFR', 'UBL', 'DFL', 'DBR'];
const EDGE_SLOTS = ['UB', 'UF', 'DF', 'DB', 'FL', 'FR', 'BR', 'BL', 'UR', 'UL', 'DL', 'DR'];
const CORNER_SLOT_COORDS: Record<string, readonly [number, number, number]> = {
  UFL: [-1, 1, 1], UBR: [1, 1, -1], DFR: [1, -1, 1], DBL: [-1, -1, -1],
  UFR: [1, 1, 1], UBL: [-1, 1, -1], DFL: [-1, -1, 1], DBR: [1, -1, -1],
};
const EDGE_SLOT_COORDS: Record<string, readonly [number, number, number]> = {
  UB: [0, 1, -1], UF: [0, 1, 1], DF: [0, -1, 1], DB: [0, -1, -1],
  FL: [-1, 0, 1], FR: [1, 0, 1], BR: [1, 0, -1], BL: [-1, 0, -1],
  UR: [1, 1, 0], UL: [-1, 1, 0], DL: [-1, -1, 0], DR: [1, -1, 0],
};

function rotX180(v: readonly [number, number, number]): [number, number, number] { return [v[0], -v[1], -v[2]]; }
function rotY180(v: readonly [number, number, number]): [number, number, number] { return [-v[0], v[1], -v[2]]; }
function rotZ180(v: readonly [number, number, number]): [number, number, number] { return [-v[0], -v[1], v[2]]; }
function rotX90(v: readonly [number, number, number], d: number): [number, number, number] { return d === 1 ? [v[0], -v[2], v[1]] : [v[0], v[2], -v[1]]; }
function rotY90(v: readonly [number, number, number], d: number): [number, number, number] { return d === 1 ? [v[2], v[1], -v[0]] : [-v[2], v[1], v[0]]; }
function rotZ90(v: readonly [number, number, number], d: number): [number, number, number] { return d === 1 ? [-v[1], v[0], v[2]] : [v[1], -v[0], v[2]]; }

const PHYS_CORNER_MAP: Record<string, readonly number[]> = {};
const PHYS_EDGE_MAP: Record<string, readonly number[]> = {};
const PHYS_EDGE_DP: Record<string, readonly number[]> = {};

for (const move of ALL_MOVES) {
  const { face, direction } = move;
  const key = `${face}-${direction}`;
  const dirSign = direction === 'CW' ? 1 : -1;
  const cp: number[] = [];
  for (let s = 0; s < 8; s++) {
    const name = CORNER_SLOTS[s]!;
    const coord = CORNER_SLOT_COORDS[name]!;
    let nc = coord;
    if ((face === 'U' && coord[1] === 1) || (face === 'D' && coord[1] === -1)) nc = rotY180(coord);
    else if ((face === 'F' && coord[2] === 1) || (face === 'B' && coord[2] === -1)) nc = rotZ180(coord);
    else if ((face === 'R' && coord[0] === 1) || (face === 'L' && coord[0] === -1)) nc = rotX180(coord);
    const nSlot = Object.keys(CORNER_SLOT_COORDS).find(k => CORNER_SLOT_COORDS[k]![0] === nc[0] && CORNER_SLOT_COORDS[k]![1] === nc[1] && CORNER_SLOT_COORDS[k]![2] === nc[2])!;
    cp.push(CORNER_SLOTS.indexOf(nSlot));
  }
  PHYS_CORNER_MAP[key] = cp;

  const ep: number[] = [];
  const dp: number[] = [];
  for (let s = 0; s < 12; s++) {
    const name = EDGE_SLOTS[s]!;
    const coord = EDGE_SLOT_COORDS[name]!;
    let nc = coord;
    let dPhase = 0;
    if (face === 'U') {
      if (coord[1] === 1) nc = rotY180(coord);
      else if (coord[1] === 0) { nc = rotY90(coord, dirSign === 1 ? -1 : 1); dPhase = dirSign === 1 ? 1 : 2; }
    } else if (face === 'D') {
      if (coord[1] === -1) nc = rotY180(coord);
      else if (coord[1] === 0) { nc = rotY90(coord, dirSign === 1 ? 1 : -1); dPhase = dirSign === 1 ? 2 : 1; }
    } else if (face === 'F') {
      if (coord[2] === 1) nc = rotZ180(coord);
      else if (coord[2] === 0) { nc = rotZ90(coord, dirSign === 1 ? -1 : 1); dPhase = dirSign === 1 ? 1 : 2; }
    } else if (face === 'B') {
      if (coord[2] === -1) nc = rotZ180(coord);
      else if (coord[2] === 0) { nc = rotZ90(coord, dirSign === 1 ? 1 : -1); dPhase = dirSign === 1 ? 2 : 1; }
    } else if (face === 'R') {
      if (coord[0] === 1) nc = rotX180(coord);
      else if (coord[0] === 0) { nc = rotX90(coord, dirSign === 1 ? -1 : 1); dPhase = dirSign === 1 ? 1 : 2; }
    } else if (face === 'L') {
      if (coord[0] === -1) nc = rotX180(coord);
      else if (coord[0] === 0) { nc = rotX90(coord, dirSign === 1 ? 1 : -1); dPhase = dirSign === 1 ? 2 : 1; }
    }
    const nSlot = Object.keys(EDGE_SLOT_COORDS).find(k => EDGE_SLOT_COORDS[k]![0] === nc[0] && EDGE_SLOT_COORDS[k]![1] === nc[1] && EDGE_SLOT_COORDS[k]![2] === nc[2])!;
    ep.push(EDGE_SLOTS.indexOf(nSlot));
    dp.push(dPhase);
  }
  PHYS_EDGE_MAP[key] = ep;
  PHYS_EDGE_DP[key] = dp;
}

/**
 * Independent reference transition oracle.
 * Materializes logical placement from raw geometry and normalizes back to canonical coordinates.
 */
function referenceOracle(state: GearCubeState, move: Move): GearCubeState {
  const c = state.cornerConfiguration;
  const tRefC = T_REF[c]!;
  const tFreeC = T_FREE[c]!;
  const bxC = B_X[c]!;
  const byC = B_Y[c]!;
  const bzC = B_Z[c]!;
  const v4x = V4[state.sliceX.permutationClass]!;
  const v4y = V4[state.sliceY.permutationClass]!;
  const v4z = V4[state.sliceZ.permutationClass]!;

  const fp = FRAME_PERMS[3]!;
  const cView = [
    tRefC[fp.T_ref[0]!]!, tRefC[fp.T_ref[1]!]!, tRefC[fp.T_ref[2]!]!, tRefC[fp.T_ref[3]!]!,
    4 + tFreeC[fp.T_free[0]!]!, 4 + tFreeC[fp.T_free[1]!]!, 4 + tFreeC[fp.T_free[2]!]!, 4 + tFreeC[fp.T_free[3]!]!,
  ];
  const eView = [
    bxC[v4x[fp.X[0]!]!]!, bxC[v4x[fp.X[1]!]!]!, bxC[v4x[fp.X[2]!]!]!, bxC[v4x[fp.X[3]!]!]!,
    4 + byC[v4y[fp.Y[0]!]!]!, 4 + byC[v4y[fp.Y[1]!]!]!, 4 + byC[v4y[fp.Y[2]!]!]!, 4 + byC[v4y[fp.Y[3]!]!]!,
    8 + bzC[v4z[fp.Z[0]!]!]!, 8 + bzC[v4z[fp.Z[1]!]!]!, 8 + bzC[v4z[fp.Z[2]!]!]!, 8 + bzC[v4z[fp.Z[3]!]!]!,
  ];

  const key = `${move.face}-${move.direction}`;
  const cMap = PHYS_CORNER_MAP[key]!;
  const eMap = PHYS_EDGE_MAP[key]!;
  const eDp = PHYS_EDGE_DP[key]!;

  const nextCView: number[] = new Array(8);
  for (let s = 0; s < 8; s++) nextCView[cMap[s]!] = cView[s]!;
  const nextEView: number[] = new Array(12);
  for (let s = 0; s < 12; s++) nextEView[eMap[s]!] = eView[s]!;

  const dblSlot = nextCView.indexOf(3);
  const nextFp = FRAME_PERMS[dblSlot]!;

  const tRefCur = `${nextCView[nextFp.T_ref[0]!]!},${nextCView[nextFp.T_ref[1]!]!},${nextCView[nextFp.T_ref[2]!]!},${nextCView[nextFp.T_ref[3]!]!}`;
  const tFreeCur = `${nextCView[4 + nextFp.T_free[0]!]! - 4},${nextCView[4 + nextFp.T_free[1]!]! - 4},${nextCView[4 + nextFp.T_free[2]!]! - 4},${nextCView[4 + nextFp.T_free[3]!]! - 4}`;
  const nextC = CORNER_LOOKUP.get(`${tRefCur}|${tFreeCur}`)!;

  const nbx = B_X[nextC]!;
  const xCur = `${nbx.indexOf(nextEView[nextFp.X[0]!]!)},${nbx.indexOf(nextEView[nextFp.X[1]!]!)},${nbx.indexOf(nextEView[nextFp.X[2]!]!)},${nbx.indexOf(nextEView[nextFp.X[3]!]!)}`;
  const nextKx = V4_LOOKUP.get(xCur)!;
  const nextPx = ((state.sliceX.phase + eDp[0]!) % 3) as SliceGearPhase;

  const nby = B_Y[nextC]!;
  const yCur = `${nby.indexOf(nextEView[4 + nextFp.Y[0]!]! - 4)},${nby.indexOf(nextEView[4 + nextFp.Y[1]!]! - 4)},${nby.indexOf(nextEView[4 + nextFp.Y[2]!]! - 4)},${nby.indexOf(nextEView[4 + nextFp.Y[3]!]! - 4)}`;
  const nextKy = V4_LOOKUP.get(yCur)!;
  const nextPy = ((state.sliceY.phase + eDp[4]!) % 3) as SliceGearPhase;

  const nbz = B_Z[nextC]!;
  const zCur = `${nbz.indexOf(nextEView[8 + nextFp.Z[0]!]! - 8)},${nbz.indexOf(nextEView[8 + nextFp.Z[1]!]! - 8)},${nbz.indexOf(nextEView[8 + nextFp.Z[2]!]! - 8)},${nbz.indexOf(nextEView[8 + nextFp.Z[3]!]! - 8)}`;
  const nextKz = V4_LOOKUP.get(zCur)!;
  const nextPz = ((state.sliceZ.phase + eDp[8]!) % 3) as SliceGearPhase;

  return {
    cornerConfiguration: nextC,
    sliceX: { permutationClass: nextKx, phase: nextPx },
    sliceY: { permutationClass: nextKy, phase: nextPy },
    sliceZ: { permutationClass: nextKz, phase: nextPz },
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
