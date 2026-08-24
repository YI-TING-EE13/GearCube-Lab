import type { Move } from '@gearcube/core';

/**
 * Returns the exact algebraic inverse of a canonical directed move.
 * For any move (face, direction), its inverse has the same face and opposite direction (CW <-> CCW).
 */
export function inverseMove(move: Move): Move {
  return {
    face: move.face,
    direction: move.direction === 'CW' ? 'CCW' : 'CW',
  };
}
