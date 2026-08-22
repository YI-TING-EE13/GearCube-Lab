/**
 * @file serialization.ts
 * @description Canonical logical state serialization and strict deserialization parser.
 */

import {
  type GearCubeState,
  type CornerConfiguration,
  type SlicePermutationClass,
  type SliceGearPhase,
} from './values.js';
import {
  isGearCubeState,
  isCornerConfiguration,
  isSlicePermutationClass,
  isSliceGearPhase,
} from './validation.js';

/**
 * Serializes a canonical GearCubeState into its deterministic logical string representation.
 *
 * Exact Grammar: `C:<cornerConfiguration>|X:<kx>.<px>|Y:<ky>.<py>|Z:<kz>.<pz>`
 * Solved State: `"C:0|X:0.0|Y:0.0|Z:0.0"`
 *
 * @param state Canonical discrete puzzle state
 * @returns Deterministic serialized logical string
 * @throws TypeError if state is not a valid GearCubeState
 */
export function serializeLogicalState(state: GearCubeState): string {
  if (!isGearCubeState(state)) {
    throw new TypeError('Invalid GearCubeState supplied to serializeLogicalState');
  }
  return `C:${state.cornerConfiguration}|X:${state.sliceX.permutationClass}.${state.sliceX.phase}|Y:${state.sliceY.permutationClass}.${state.sliceY.phase}|Z:${state.sliceZ.permutationClass}.${state.sliceZ.phase}`;
}

/**
 * Parses and strictly validates a serialized logical string into a canonical GearCubeState.
 *
 * @param serialized Serialized logical state string
 * @returns Reconstructed canonical GearCubeState
 * @throws TypeError if input is not a string, malformed, out of range, or contains extraneous content
 */
export function deserializeLogicalState(serialized: string): GearCubeState {
  if (typeof serialized !== 'string') {
    throw new TypeError(`Serialized state must be a string, received ${typeof serialized}`);
  }

  const parts = serialized.split('|');
  if (parts.length !== 4) {
    throw new TypeError(`Malformed serialized state component count: expected 4 parts, got ${parts.length} in "${serialized}"`);
  }

  const parseCorner = (str: string): CornerConfiguration => {
    if (!str.startsWith('C:')) {
      throw new TypeError(`Malformed corner prefix in "${str}": expected "C:"`);
    }
    const val = str.slice(2);
    if (!/^\d+$/.test(val)) {
      throw new TypeError(`Invalid corner integer value in "${str}": "${val}"`);
    }
    const c = Number(val);
    if (!isCornerConfiguration(c)) {
      throw new TypeError(`CornerConfiguration out of range in "${str}": ${c}`);
    }
    return c;
  };

  const parseSlice = (
    str: string,
    prefix: 'X' | 'Y' | 'Z',
  ): { permutationClass: SlicePermutationClass; phase: SliceGearPhase } => {
    if (!str.startsWith(`${prefix}:`)) {
      throw new TypeError(`Malformed slice prefix in "${str}": expected "${prefix}:"`);
    }
    const val = str.slice(2);
    const sub = val.split('.');
    if (sub.length !== 2 || !/^\d+$/.test(sub[0]!) || !/^\d+$/.test(sub[1]!)) {
      throw new TypeError(`Malformed slice coordinate format in "${str}": expected "<k>.<p>", got "${val}"`);
    }
    const k = Number(sub[0]);
    const p = Number(sub[1]);
    if (!isSlicePermutationClass(k)) {
      throw new TypeError(`SlicePermutationClass out of range in "${str}": k=${k}`);
    }
    if (!isSliceGearPhase(p)) {
      throw new TypeError(`SliceGearPhase out of range in "${str}": p=${p}`);
    }
    return { permutationClass: k, phase: p };
  };

  const state: GearCubeState = {
    cornerConfiguration: parseCorner(parts[0]!),
    sliceX: parseSlice(parts[1]!, 'X'),
    sliceY: parseSlice(parts[2]!, 'Y'),
    sliceZ: parseSlice(parts[3]!, 'Z'),
  };

  if (!isGearCubeState(state)) {
    throw new TypeError('Deserialized state failed full structural validation');
  }

  return state;
}
