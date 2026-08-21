import { describe, expect, it } from 'vitest';
import {
  CANONICAL_DOMAIN_SIZE,
  CORNER_CONFIGURATIONS,
  isGearCubeState,
  isSolved,
  SLICE_GEAR_PHASES,
  SLICE_PERMUTATION_CLASSES,
  type GearCubeState,
} from '../src/index.js';

describe('Canonical Domain Cardinality (Pure Cartesian Verification)', () => {
  it('generates exactly 41,472 valid Cartesian coordinate states with exactly 1 solved state', () => {
    let stateCount = 0;
    let solvedCount = 0;

    for (const c of CORNER_CONFIGURATIONS) {
      for (const xK of SLICE_PERMUTATION_CLASSES) {
        for (const xP of SLICE_GEAR_PHASES) {
          for (const yK of SLICE_PERMUTATION_CLASSES) {
            for (const yP of SLICE_GEAR_PHASES) {
              for (const zK of SLICE_PERMUTATION_CLASSES) {
                for (const zP of SLICE_GEAR_PHASES) {
                  const state: GearCubeState = {
                    cornerConfiguration: c,
                    sliceX: { permutationClass: xK, phase: xP },
                    sliceY: { permutationClass: yK, phase: yP },
                    sliceZ: { permutationClass: zK, phase: zP },
                  };

                  expect(isGearCubeState(state)).toBe(true);
                  if (isSolved(state)) {
                    solvedCount++;
                  }
                  stateCount++;
                }
              }
            }
          }
        }
      }
    }

    expect(stateCount).toBe(CANONICAL_DOMAIN_SIZE);
    expect(stateCount).toBe(41472);
    expect(solvedCount).toBe(1);
  });
});
