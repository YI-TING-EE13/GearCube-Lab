import { describe, expect, it } from 'vitest';
import {
  FACE_AXIS_MAP,
  FACE_LOCAL_VIEWING_CONVENTION,
  formatMoveGuidance,
  getFaceAxisMapping,
} from './move-guidance.js';

describe('M6 orientation and move guidance contracts', () => {
  it('ORIENTATION_AXIS_MAP_GATE: exposes all six canonical face-axis mappings', () => {
    expect(Object.keys(FACE_AXIS_MAP).sort()).toEqual(['B', 'D', 'F', 'L', 'R', 'U']);
    expect(getFaceAxisMapping('R')).toMatchObject({ axis: 'X', sign: 1, axisLabel: '+X' });
    expect(getFaceAxisMapping('L')).toMatchObject({ axis: 'X', sign: -1, axisLabel: '-X' });
    expect(getFaceAxisMapping('U')).toMatchObject({ axis: 'Y', sign: 1, axisLabel: '+Y' });
    expect(getFaceAxisMapping('D')).toMatchObject({ axis: 'Y', sign: -1, axisLabel: '-Y' });
    expect(getFaceAxisMapping('F')).toMatchObject({ axis: 'Z', sign: 1, axisLabel: '+Z' });
    expect(getFaceAxisMapping('B')).toMatchObject({ axis: 'Z', sign: -1, axisLabel: '-Z' });
  });

  it('FACE_LOCAL_DIRECTION_GATE: states the outside-looking-toward-center convention', () => {
    const guidance = formatMoveGuidance(
      { face: 'R', direction: 'CW' },
      'DIRECT_180'
    );
    expect(guidance).toContain(FACE_LOCAL_VIEWING_CONVENTION);
    expect(guidance).not.toContain('screen');
  });

  it('DIRECT_180_GUIDANCE_GATE: describes the semantic axis and 180-degree action', () => {
    const guidance = formatMoveGuidance(
      { face: 'R', direction: 'CW' },
      'DIRECT_180'
    );
    expect(guidance).toContain('R (+X)');
    expect(guidance).toContain('Clockwise (CW)');
    expect(guidance).toContain('Right (+X) face 180° clockwise');
  });

  it('TWO_STEP_FIRST_STEP_GUIDANCE_GATE: describes the first 90-degree physical step', () => {
    const guidance = formatMoveGuidance(
      { face: 'U', direction: 'CCW' },
      'TWO_STEP',
      'FIRST_HALF_ANIMATING'
    );
    expect(guidance).toContain('U (+Y)');
    expect(guidance).toContain('Counter-Clockwise (CCW)');
    expect(guidance).toContain('90° counter-clockwise as the first physical step');
  });

  it('HALF_TURN_LOCKED_GUIDANCE_GATE: distinguishes finish and reverse actions', () => {
    const finish = formatMoveGuidance(
      { face: 'F', direction: 'CW' },
      'TWO_STEP',
      'HALF_TURN_LOCKED',
      'CW'
    );
    const reverse = formatMoveGuidance(
      { face: 'F', direction: 'CCW' },
      'TWO_STEP',
      'HALF_TURN_LOCKED',
      'CW'
    );

    expect(finish).toContain('finish the canonical 180° turn');
    expect(reverse).toContain('reverse to the original position');
    expect(finish).not.toBe(reverse);
  });
});
