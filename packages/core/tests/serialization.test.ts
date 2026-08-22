/**
 * @file serialization.test.ts
 * @description Unit tests, golden vectors, strict validation, and 41,472 exhaustive round-trips for logical serialization.
 */

import { describe, it, expect } from 'vitest';
import {
  SOLVED_GEAR_CUBE_STATE,
  CANONICAL_DOMAIN_SIZE,
  applyMove,
  serializeLogicalState,
  deserializeLogicalState,
  equalsGearCubeState,
  type GearCubeState,
  type CornerConfiguration,
  type SlicePermutationClass,
  type SliceGearPhase,
} from '../src/index.js';

describe('Phase 1D — Logical State Serialization & Deserialization', () => {
  // ==========================================================================
  // 1. Golden Serialization Strings
  // ==========================================================================
  describe('Golden Serialization Strings', () => {
    it('serializes canonical Solved state to "C:0|X:0.0|Y:0.0|Z:0.0"', () => {
      expect(serializeLogicalState(SOLVED_GEAR_CUBE_STATE)).toBe('C:0|X:0.0|Y:0.0|Z:0.0');
    });

    it('deserializes "C:0|X:0.0|Y:0.0|Z:0.0" to exact SOLVED_GEAR_CUBE_STATE', () => {
      const state = deserializeLogicalState('C:0|X:0.0|Y:0.0|Z:0.0');
      expect(equalsGearCubeState(state, SOLVED_GEAR_CUBE_STATE)).toBe(true);
    });

    it('matches U CW golden string "C:6|X:1.0|Y:3.1|Z:1.0"', () => {
      const uCwState = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'U', direction: 'CW' });
      const serialized = serializeLogicalState(uCwState);
      expect(serialized).toBe('C:6|X:1.0|Y:3.1|Z:1.0');
      const roundtrip = deserializeLogicalState(serialized);
      expect(equalsGearCubeState(roundtrip, uCwState)).toBe(true);
    });

    it('matches R CW golden string "C:21|X:3.1|Y:0.0|Z:3.0"', () => {
      const rCwState = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'R', direction: 'CW' });
      const serialized = serializeLogicalState(rCwState);
      expect(serialized).toBe('C:21|X:3.1|Y:0.0|Z:3.0');
      const roundtrip = deserializeLogicalState(serialized);
      expect(equalsGearCubeState(roundtrip, rCwState)).toBe(true);
    });
  });

  // ==========================================================================
  // 2. serializeLogicalState Validation Errors
  // ==========================================================================
  describe('serializeLogicalState Strict Input Validation', () => {
    it('throws TypeError for non-object inputs', () => {
      // @ts-expect-error Testing runtime validation
      expect(() => serializeLogicalState(null)).toThrow(TypeError);
      // @ts-expect-error Testing runtime validation
      expect(() => serializeLogicalState(undefined)).toThrow(TypeError);
      // @ts-expect-error Testing runtime validation
      expect(() => serializeLogicalState('C:0|X:0.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      // @ts-expect-error Testing runtime validation
      expect(() => serializeLogicalState(42)).toThrow(TypeError);
    });

    it('throws TypeError for structurally invalid state objects', () => {
      // @ts-expect-error Testing runtime validation
      expect(() => serializeLogicalState({ cornerConfiguration: 24 })).toThrow(TypeError);
      // @ts-expect-error Testing runtime validation
      expect(() => serializeLogicalState({ ...SOLVED_GEAR_CUBE_STATE, cornerConfiguration: -1 })).toThrow(TypeError);
    });
  });

  // ==========================================================================
  // 3. deserializeLogicalState Strict Error Handling
  // ==========================================================================
  describe('deserializeLogicalState Strict Error Handling', () => {
    it('throws TypeError on non-string inputs', () => {
      // @ts-expect-error Testing runtime validation
      expect(() => deserializeLogicalState(null)).toThrow(TypeError);
      // @ts-expect-error Testing runtime validation
      expect(() => deserializeLogicalState(undefined)).toThrow(TypeError);
      // @ts-expect-error Testing runtime validation
      expect(() => deserializeLogicalState(123)).toThrow(TypeError);
      // @ts-expect-error Testing runtime validation
      expect(() => deserializeLogicalState({})).toThrow(TypeError);
    });

    it('throws TypeError on invalid component counts', () => {
      expect(() => deserializeLogicalState('')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:0.0|Y:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:0.0|Y:0.0|Z:0.0|EXTRA:0')).toThrow(TypeError);
    });

    it('throws TypeError on whitespace or extraneous formatting', () => {
      expect(() => deserializeLogicalState(' C:0|X:0.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:0.0|Y:0.0|Z:0.0 ')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0 |X:0.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X: 0.0|Y:0.0|Z:0.0')).toThrow(TypeError);
    });

    it('throws TypeError on signed, floating, or non-integer coordinates', () => {
      expect(() => deserializeLogicalState('C:+0|X:0.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:-1|X:0.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:1.5|X:0.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:+0.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:0.+0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:0.5.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:abc|X:0.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:a.b|Y:0.0|Z:0.0')).toThrow(TypeError);
    });

    it('throws TypeError on out-of-range coordinate values', () => {
      expect(() => deserializeLogicalState('C:24|X:0.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:99|X:0.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:4.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:0.3|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:0.0|Y:4.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:0.0|Y:0.3|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:0.0|Y:0.0|Z:4.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|X:0.0|Y:0.0|Z:0.3')).toThrow(TypeError);
    });

    it('throws TypeError on wrong prefixes or out-of-order fields', () => {
      expect(() => deserializeLogicalState('D:0|X:0.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|A:0.0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('X:0.0|C:0|Y:0.0|Z:0.0')).toThrow(TypeError);
      expect(() => deserializeLogicalState('C:0|Y:0.0|X:0.0|Z:0.0')).toThrow(TypeError);
    });
  });

  // ==========================================================================
  // 4. Exhaustive 41,472 Round-Trip & Uniqueness Verification
  // ==========================================================================
  describe('Exhaustive 41,472 Domain Round-Trip & Uniqueness', () => {
    it('verifies 41,472 / 41,472 bijective round-trips and uniqueness', { timeout: 30000 }, () => {
      const seenStrings = new Set<string>();
      let verifiedCount = 0;

      for (let c = 0; c < 24; c++) {
        for (let kX = 0; kX < 4; kX++) {
          for (let pX = 0; pX < 3; pX++) {
            for (let kY = 0; kY < 4; kY++) {
              for (let pY = 0; pY < 3; pY++) {
                for (let kZ = 0; kZ < 4; kZ++) {
                  for (let pZ = 0; pZ < 3; pZ++) {
                    const originalState: GearCubeState = {
                      cornerConfiguration: c as CornerConfiguration,
                      sliceX: {
                        permutationClass: kX as SlicePermutationClass,
                        phase: pX as SliceGearPhase,
                      },
                      sliceY: {
                        permutationClass: kY as SlicePermutationClass,
                        phase: pY as SliceGearPhase,
                      },
                      sliceZ: {
                        permutationClass: kZ as SlicePermutationClass,
                        phase: pZ as SliceGearPhase,
                      },
                    };

                    const serialized = serializeLogicalState(originalState);
                    seenStrings.add(serialized);

                    const recoveredState = deserializeLogicalState(serialized);
                    if (!equalsGearCubeState(recoveredState, originalState)) {
                      throw new Error(`Round-trip mismatch at serialized "${serialized}"`);
                    }

                    verifiedCount++;
                  }
                }
              }
            }
          }
        }
      }

      expect(verifiedCount).toBe(CANONICAL_DOMAIN_SIZE);
      expect(seenStrings.size).toBe(CANONICAL_DOMAIN_SIZE);
    });
  });
});
