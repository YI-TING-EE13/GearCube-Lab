import {
  ALL_MOVES,
  applyMove,
  SOLVED_GEAR_CUBE_STATE,
  type CornerConfiguration,
  type EdgeSliceCoordinate,
  type GearCubeState,
  type SliceGearPhase,
  type SlicePermutationClass,
} from '@gearcube/core';

const SOLVED_SLICE: EdgeSliceCoordinate = {
  permutationClass: 0,
  phase: 0,
};

function sliceIndex(slice: EdgeSliceCoordinate): number {
  return slice.permutationClass * 3 + slice.phase;
}

function decodeSlice(index: number): EdgeSliceCoordinate {
  return {
    permutationClass: Math.floor(index / 3) as SlicePermutationClass,
    phase: (index % 3) as SliceGearPhase,
  };
}

function indexCXY(c: number, x: number, y: number): number {
  return (c * 12 + x) * 12 + y;
}

function indexCXZ(c: number, x: number, z: number): number {
  return (c * 12 + x) * 12 + z;
}

function indexCYZ(c: number, y: number, z: number): number {
  return (c * 12 + y) * 12 + z;
}

function assertPdbConstructionInvariants(
  name: string,
  table: Int8Array,
  reachableCount: number
): void {
  if (table.length !== 3456) {
    throw new Error(`${name} PDB construction invariant failure: table length was ${table.length}, expected 3456`);
  }
  if (reachableCount !== 3456) {
    throw new Error(`${name} PDB construction invariant failure: reachable count was ${reachableCount} / 3456`);
  }

  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < table.length; i++) {
    const val = table[i]!;
    if (val === -1) {
      throw new Error(`${name} PDB construction invariant failure: uninitialized sentinel -1 found at index ${i}`);
    }
    if (val < min) min = val;
    if (val > max) max = val;
  }

  if (min !== 0) {
    throw new Error(`${name} PDB construction invariant failure: min distance was ${min}, expected 0`);
  }
  if (max !== 7) {
    throw new Error(`${name} PDB construction invariant failure: max distance was ${max}, expected 7`);
  }
}

function buildCxyTable(): Int8Array {
  const table = new Int8Array(3456).fill(-1);
  const queue = new Int32Array(3456);
  let head = 0;
  let tail = 0;

  const solvedC = SOLVED_GEAR_CUBE_STATE.cornerConfiguration;
  const solvedX = sliceIndex(SOLVED_GEAR_CUBE_STATE.sliceX);
  const solvedY = sliceIndex(SOLVED_GEAR_CUBE_STATE.sliceY);
  const rootIndex = indexCXY(solvedC, solvedX, solvedY);

  table[rootIndex] = 0;
  queue[tail++] = rootIndex;

  while (head < tail) {
    const currIndex = queue[head++]!;
    const d = table[currIndex]!;

    const y = currIndex % 12;
    const cX = Math.floor(currIndex / 12);
    const x = cX % 12;
    const c = Math.floor(cX / 12) as CornerConfiguration;

    const rep: GearCubeState = {
      cornerConfiguration: c,
      sliceX: decodeSlice(x),
      sliceY: decodeSlice(y),
      sliceZ: SOLVED_SLICE,
    };

    for (let m = 0; m < ALL_MOVES.length; m++) {
      const move = ALL_MOVES[m]!;
      const nextConcrete = applyMove(rep, move);
      const nextIdx = indexCXY(
        nextConcrete.cornerConfiguration,
        sliceIndex(nextConcrete.sliceX),
        sliceIndex(nextConcrete.sliceY)
      );

      if (table[nextIdx] === -1) {
        table[nextIdx] = d + 1;
        queue[tail++] = nextIdx;
      }
    }
  }

  assertPdbConstructionInvariants('CXY', table, tail);
  return table;
}

function buildCxzTable(): Int8Array {
  const table = new Int8Array(3456).fill(-1);
  const queue = new Int32Array(3456);
  let head = 0;
  let tail = 0;

  const solvedC = SOLVED_GEAR_CUBE_STATE.cornerConfiguration;
  const solvedX = sliceIndex(SOLVED_GEAR_CUBE_STATE.sliceX);
  const solvedZ = sliceIndex(SOLVED_GEAR_CUBE_STATE.sliceZ);
  const rootIndex = indexCXZ(solvedC, solvedX, solvedZ);

  table[rootIndex] = 0;
  queue[tail++] = rootIndex;

  while (head < tail) {
    const currIndex = queue[head++]!;
    const d = table[currIndex]!;

    const z = currIndex % 12;
    const cX = Math.floor(currIndex / 12);
    const x = cX % 12;
    const c = Math.floor(cX / 12) as CornerConfiguration;

    const rep: GearCubeState = {
      cornerConfiguration: c,
      sliceX: decodeSlice(x),
      sliceY: SOLVED_SLICE,
      sliceZ: decodeSlice(z),
    };

    for (let m = 0; m < ALL_MOVES.length; m++) {
      const move = ALL_MOVES[m]!;
      const nextConcrete = applyMove(rep, move);
      const nextIdx = indexCXZ(
        nextConcrete.cornerConfiguration,
        sliceIndex(nextConcrete.sliceX),
        sliceIndex(nextConcrete.sliceZ)
      );

      if (table[nextIdx] === -1) {
        table[nextIdx] = d + 1;
        queue[tail++] = nextIdx;
      }
    }
  }

  assertPdbConstructionInvariants('CXZ', table, tail);
  return table;
}

function buildCyzTable(): Int8Array {
  const table = new Int8Array(3456).fill(-1);
  const queue = new Int32Array(3456);
  let head = 0;
  let tail = 0;

  const solvedC = SOLVED_GEAR_CUBE_STATE.cornerConfiguration;
  const solvedY = sliceIndex(SOLVED_GEAR_CUBE_STATE.sliceY);
  const solvedZ = sliceIndex(SOLVED_GEAR_CUBE_STATE.sliceZ);
  const rootIndex = indexCYZ(solvedC, solvedY, solvedZ);

  table[rootIndex] = 0;
  queue[tail++] = rootIndex;

  while (head < tail) {
    const currIndex = queue[head++]!;
    const d = table[currIndex]!;

    const z = currIndex % 12;
    const cY = Math.floor(currIndex / 12);
    const y = cY % 12;
    const c = Math.floor(cY / 12) as CornerConfiguration;

    const rep: GearCubeState = {
      cornerConfiguration: c,
      sliceX: SOLVED_SLICE,
      sliceY: decodeSlice(y),
      sliceZ: decodeSlice(z),
    };

    for (let m = 0; m < ALL_MOVES.length; m++) {
      const move = ALL_MOVES[m]!;
      const nextConcrete = applyMove(rep, move);
      const nextIdx = indexCYZ(
        nextConcrete.cornerConfiguration,
        sliceIndex(nextConcrete.sliceY),
        sliceIndex(nextConcrete.sliceZ)
      );

      if (table[nextIdx] === -1) {
        table[nextIdx] = d + 1;
        queue[tail++] = nextIdx;
      }
    }
  }

  assertPdbConstructionInvariants('CYZ', table, tail);
  return table;
}

const PDB_CXY: Int8Array = buildCxyTable();
const PDB_CXZ: Int8Array = buildCxzTable();
const PDB_CYZ: Int8Array = buildCyzTable();

/**
 * Estimates the optimal distance to the solved state using the accepted
 * H2 Two-Slice Pattern Database Max heuristic:
 * max(d_CXY, d_CXZ, d_CYZ).
 *
 * Package-internal only.
 */
export function estimateIdaStarHeuristic(state: GearCubeState): number {
  const c = state.cornerConfiguration;
  const x = state.sliceX.permutationClass * 3 + state.sliceX.phase;
  const y = state.sliceY.permutationClass * 3 + state.sliceY.phase;
  const z = state.sliceZ.permutationClass * 3 + state.sliceZ.phase;

  const dCXY = PDB_CXY[(c * 12 + x) * 12 + y]!;
  const dCXZ = PDB_CXZ[(c * 12 + x) * 12 + z]!;
  const dCYZ = PDB_CYZ[(c * 12 + y) * 12 + z]!;

  return Math.max(dCXY, dCXZ, dCYZ);
}
