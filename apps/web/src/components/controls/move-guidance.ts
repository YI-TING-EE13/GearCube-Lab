import type { Direction, Face, Move } from '@gearcube/core';
import type { StagingPhase, TurnInteractionMode } from '../cube/animation.js';

export type OrientationAxis = 'X' | 'Y' | 'Z';
export type OrientationSign = -1 | 1;

export interface FaceAxisMapping {
  readonly face: Face;
  readonly axis: OrientationAxis;
  readonly sign: OrientationSign;
  readonly axisLabel: `${'+' | '-'}${OrientationAxis}`;
  readonly faceName: string;
}

export const FACE_AXIS_MAP: Readonly<Record<Face, FaceAxisMapping>> = Object.freeze({
  R: { face: 'R', axis: 'X', sign: 1, axisLabel: '+X', faceName: 'Right' },
  L: { face: 'L', axis: 'X', sign: -1, axisLabel: '-X', faceName: 'Left' },
  U: { face: 'U', axis: 'Y', sign: 1, axisLabel: '+Y', faceName: 'Up' },
  D: { face: 'D', axis: 'Y', sign: -1, axisLabel: '-Y', faceName: 'Down' },
  F: { face: 'F', axis: 'Z', sign: 1, axisLabel: '+Z', faceName: 'Front' },
  B: { face: 'B', axis: 'Z', sign: -1, axisLabel: '-Z', faceName: 'Back' },
});

export const FACE_LOCAL_VIEWING_CONVENTION =
  'viewed from outside the selected face toward the cube center';

function directionName(direction: Direction): string {
  return direction === 'CW' ? 'Clockwise' : 'Counter-Clockwise';
}

/** Returns the single UI-owned mapping from a face to the accepted world axis. */
export function getFaceAxisMapping(face: Face): FaceAxisMapping {
  return FACE_AXIS_MAP[face];
}

/**
 * Builds the semantic action text used by both visible guidance and accessible
 * button names. CW/CCW always use the face-local outside-looking-toward-center
 * convention; they never depend on the current camera screen orientation.
 */
export function formatMoveGuidance(
  move: Move,
  interactionMode: TurnInteractionMode,
  phase: StagingPhase = 'IDLE',
  stagedDirection?: Direction
): string {
  const mapping = getFaceAxisMapping(move.face);
  const direction = directionName(move.direction);

  if (phase === 'HALF_TURN_LOCKED' && stagedDirection !== undefined) {
    if (move.direction === stagedDirection) {
      return `${move.face} ${move.direction} — Finish 180° turn — ${move.face} (${mapping.axisLabel}); finish the canonical 180° turn on the ${mapping.faceName} (${mapping.axisLabel}) face; Direction: ${direction} (${move.direction}), ${FACE_LOCAL_VIEWING_CONVENTION}.`;
    }
    return `${move.face} ${move.direction} — Reverse to origin — ${move.face} (${mapping.axisLabel}); reverse to the original position on the ${mapping.faceName} (${mapping.axisLabel}) face; Direction: ${direction} (${move.direction}), ${FACE_LOCAL_VIEWING_CONVENTION}.`;
  }

  if (interactionMode === 'DIRECT_180') {
    return `${move.face} ${direction} (180° full turn) — ${move.face} (${mapping.axisLabel}); rotate the ${mapping.faceName} (${mapping.axisLabel}) face 180° ${direction.toLowerCase()}; Direction: ${direction} (${move.direction}), ${FACE_LOCAL_VIEWING_CONVENTION}.`;
  }

  return `${move.face} ${direction} (90° physical step) — ${move.face} (${mapping.axisLabel}); rotate the ${mapping.faceName} (${mapping.axisLabel}) face 90° ${direction.toLowerCase()} as the first physical step; Direction: ${direction} (${move.direction}), ${FACE_LOCAL_VIEWING_CONVENTION}.`;
}
