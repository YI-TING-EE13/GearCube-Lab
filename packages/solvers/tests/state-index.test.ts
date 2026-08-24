import { describe, it, expect } from 'vitest';
import {
  CORNER_CONFIGURATIONS,
  equalsGearCubeState,
  SLICE_PERMUTATION_CLASSES,
  SLICE_GEAR_PHASES,
  SOLVED_GEAR_CUBE_STATE,
  type GearCubeState,
} from '@gearcube/core';
import { rankState, unrankState } from '../src/state-index.js';

describe('Phase 4A — Solver State Index (Dense Rank & Unrank)', () => {
  it('verifies rankState and unrankState form an exact 41,472/41,472 bijection across the Cartesian domain', () => {
    let stateCount = 0;
    let bijectionFailures = 0;
    const seenRanks = new Uint8Array(41472);
    let minRank = Infinity;
    let maxRank = -Infinity;

    for (const c of CORNER_CONFIGURATIONS) {
      for (const px of SLICE_PERMUTATION_CLASSES) {
        for (const hx of SLICE_GEAR_PHASES) {
          for (const py of SLICE_PERMUTATION_CLASSES) {
            for (const hy of SLICE_GEAR_PHASES) {
              for (const pz of SLICE_PERMUTATION_CLASSES) {
                for (const hz of SLICE_GEAR_PHASES) {
                  const state: GearCubeState = {
                    cornerConfiguration: c,
                    sliceX: { permutationClass: px, phase: hx },
                    sliceY: { permutationClass: py, phase: hy },
                    sliceZ: { permutationClass: pz, phase: hz },
                  };

                  const rank = rankState(state);
                  stateCount++;

                  if (rank < minRank) minRank = rank;
                  if (rank > maxRank) maxRank = rank;

                  if (rank < 0 || rank >= 41472 || seenRanks[rank] !== 0) {
                    bijectionFailures++;
                  }
                  seenRanks[rank] = 1;

                  const reconstructed = unrankState(rank);
                  if (!equalsGearCubeState(reconstructed, state)) {
                    bijectionFailures++;
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(stateCount).toBe(41472);
    expect(minRank).toBe(0);
    expect(maxRank).toBe(41471);
    expect(bijectionFailures).toBe(0);

    let roundtripFailures = 0;
    for (let i = 0; i < 41472; i++) {
      if (seenRanks[i] !== 1) roundtripFailures++;
      const state = unrankState(i);
      if (rankState(state) !== i) roundtripFailures++;
    }
    expect(roundtripFailures).toBe(0);
  });

  it('verifies rank of SOLVED_GEAR_CUBE_STATE is exactly 0', () => {
    expect(rankState(SOLVED_GEAR_CUBE_STATE)).toBe(0);
    expect(unrankState(0)).toEqual(SOLVED_GEAR_CUBE_STATE);
  });
});
