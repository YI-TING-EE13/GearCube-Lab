import type {
  GearCubeState,
  CornerConfiguration,
  EdgeSliceCoordinate,
  SlicePermutationClass,
  SliceGearPhase,
} from '@gearcube/core';

/**
 * Maps an EdgeSliceCoordinate (permutationClass: 0..3, phase: 0..2) to an integer [0..11].
 */
function sliceIndex(slice: EdgeSliceCoordinate): number {
  return slice.permutationClass * 3 + slice.phase;
}

/**
 * Bijective dense integer rank for a canonical GearCubeState in range [0..41471].
 *
 * rank(S) = cornerConfiguration * 1728 + sliceIndex(sliceX) * 144 + sliceIndex(sliceY) * 12 + sliceIndex(sliceZ)
 */
export function rankState(state: GearCubeState): number {
  return (
    state.cornerConfiguration * 1728 +
    sliceIndex(state.sliceX) * 144 +
    sliceIndex(state.sliceY) * 12 +
    sliceIndex(state.sliceZ)
  );
}

/**
 * Reconstructs an EdgeSliceCoordinate from a slice integer index in [0..11].
 */
function unrankSlice(idx: number): EdgeSliceCoordinate {
  const permutationClass = Math.floor(idx / 3) as SlicePermutationClass;
  const phase = (idx % 3) as SliceGearPhase;
  return { permutationClass, phase };
}

/**
 * Exact inverse of rankState, reconstructing a canonical GearCubeState from an integer rank in [0..41471].
 */
export function unrankState(rank: number): GearCubeState {
  const cornerConfiguration = Math.floor(rank / 1728) as CornerConfiguration;
  let rem = rank % 1728;
  const idxX = Math.floor(rem / 144);
  rem %= 144;
  const idxY = Math.floor(rem / 12);
  const idxZ = rem % 12;

  return {
    cornerConfiguration,
    sliceX: unrankSlice(idxX),
    sliceY: unrankSlice(idxY),
    sliceZ: unrankSlice(idxZ),
  };
}
