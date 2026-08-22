/**
 * @file GearCubeModel.test.ts
 * @description Pure Node/Vitest unit tests for Gear Cube 3D scene descriptor adapter, piece routing, and physical spindle axes.
 */

import { describe, it, expect } from 'vitest';
import {
  SOLVED_GEAR_CUBE_STATE,
  DEFAULT_SPATIAL_FRAME,
  SPATIAL_FRAMES,
  materializeState,
  CORNER_PIECE_IDS,
  EDGE_PIECE_IDS,
  CENTER_PIECE_IDS,
  type CornerPieceId,
  type EdgePieceId,
  type CenterPieceId,
  type Face,
} from '@gearcube/core';
import { placementToTransforms } from '@gearcube/kinematics';
import { adaptTransformsForRendering } from './GearCubeModel';
import {
  FACE_COLORS,
  getCornerStickers,
  getEdgeStickers,
  getCenterSticker,
  getEdgeHomeSpindleAxis,
} from './materials';

// Test-local face normals dictionary
const TEST_LOCAL_FACE_NORMALS: Record<Face, readonly [number, number, number]> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0],
};

describe('GearCubeModel Scene Adapter & Routing (Pure Vitest Node)', () => {
  it('SCENE_TRANSFORM_ADAPTER_GATE & COMPONENT_IDENTITY_GATE: 26 / 26 transforms map 1-to-1 to scene descriptors', () => {
    for (const frame of SPATIAL_FRAMES) {
      const view = materializeState(SOLVED_GEAR_CUBE_STATE, frame);
      const transforms = placementToTransforms(view);
      const descriptors = adaptTransformsForRendering(transforms);

      // Exactly 26 scene descriptors
      expect(descriptors).toHaveLength(26);

      // 26 unique persistent ComponentIds in exact stable order
      const expectedIds = [...CORNER_PIECE_IDS, ...EDGE_PIECE_IDS, ...CENTER_PIECE_IDS];
      const seenIds = new Set<string>();

      for (let i = 0; i < 26; i++) {
        const d = descriptors[i]!;
        expect(d.componentId).toBe(expectedIds[i]);
        expect(seenIds.has(d.componentId)).toBe(false);
        seenIds.add(d.componentId);

        // Position and quaternion match transform
        expect(d.position).toEqual(transforms[i]!.position);
        expect(d.quaternion).toEqual(transforms[i]!.rotationQuaternion);
      }

      expect(seenIds.size).toBe(26);
    }
  });

  it('PIECE_ROUTING_GATE: exact 8 corners, 12 edges, 6 centers routed by ComponentId', () => {
    const view = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);
    const transforms = placementToTransforms(view);
    const descriptors = adaptTransformsForRendering(transforms);

    const cornerDescriptors = descriptors.filter((d) => d.category === 'corner');
    const edgeDescriptors = descriptors.filter((d) => d.category === 'edge');
    const centerDescriptors = descriptors.filter((d) => d.category === 'center');

    expect(cornerDescriptors).toHaveLength(8);
    expect(edgeDescriptors).toHaveLength(12);
    expect(centerDescriptors).toHaveLength(6);

    for (const c of cornerDescriptors) {
      expect(c.componentId.startsWith('corner-')).toBe(true);
      const cornerId = c.componentId as CornerPieceId;
      const stickers = getCornerStickers(cornerId);
      expect(stickers).toHaveLength(3);
      for (const s of stickers) {
        expect(FACE_COLORS[s.face]).toBe(s.color);
      }
    }

    for (const e of edgeDescriptors) {
      expect(e.componentId.startsWith('edge-')).toBe(true);
      const edgeId = e.componentId as EdgePieceId;
      const stickers = getEdgeStickers(edgeId);
      expect(stickers).toHaveLength(2);
      for (const s of stickers) {
        expect(FACE_COLORS[s.face]).toBe(s.color);
      }
    }

    for (const c of centerDescriptors) {
      expect(c.componentId.startsWith('center-')).toBe(true);
      const centerId = c.componentId as CenterPieceId;
      const sticker = getCenterSticker(centerId);
      expect(sticker.localNormal).toEqual([0, 1, 0]);
      expect(FACE_COLORS[sticker.face]).toBe(sticker.color);
    }
  });

  it('EDGE_HOME_SPINDLE_AXIS_GATE: 12 / 12 edge pieces derive correct physical home radial axis', () => {
    const invSqrt2 = 1 / Math.SQRT2;

    // Test-local expected axes for all 12 EdgePieceIds
    const expectedAxes: Record<EdgePieceId, readonly [number, number, number]> = {
      'edge-UB': [0, invSqrt2, -invSqrt2],
      'edge-UF': [0, invSqrt2, invSqrt2],
      'edge-DF': [0, -invSqrt2, invSqrt2],
      'edge-DB': [0, -invSqrt2, -invSqrt2],
      'edge-FL': [-invSqrt2, 0, invSqrt2],
      'edge-FR': [invSqrt2, 0, invSqrt2],
      'edge-BR': [invSqrt2, 0, -invSqrt2],
      'edge-BL': [-invSqrt2, 0, -invSqrt2],
      'edge-UR': [invSqrt2, invSqrt2, 0],
      'edge-UL': [-invSqrt2, invSqrt2, 0],
      'edge-DL': [-invSqrt2, -invSqrt2, 0],
      'edge-DR': [invSqrt2, -invSqrt2, 0],
    };

    let checkedCount = 0;

    for (const edgeId of EDGE_PIECE_IDS) {
      const axis = getEdgeHomeSpindleAxis(edgeId);
      const expected = expectedAxes[edgeId];

      expect(axis[0]).toBeCloseTo(expected[0], 5);
      expect(axis[1]).toBeCloseTo(expected[1], 5);
      expect(axis[2]).toBeCloseTo(expected[2], 5);

      // Verify unit length
      const len = Math.hypot(axis[0], axis[1], axis[2]);
      expect(len).toBeCloseTo(1.0, 5);

      // Verify independent derivation from test-local face normals
      const [face1, face2] = edgeId.replace('edge-', '').split('') as [Face, Face];
      const n1 = TEST_LOCAL_FACE_NORMALS[face1];
      const n2 = TEST_LOCAL_FACE_NORMALS[face2];
      const sumX = n1[0] + n2[0];
      const sumY = n1[1] + n2[1];
      const sumZ = n1[2] + n2[2];
      const sumLen = Math.hypot(sumX, sumY, sumZ);
      expect(axis[0]).toBeCloseTo(sumX / sumLen, 5);
      expect(axis[1]).toBeCloseTo(sumY / sumLen, 5);
      expect(axis[2]).toBeCloseTo(sumZ / sumLen, 5);

      checkedCount++;
    }

    expect(checkedCount).toBe(12);
  });

  it('Immutability: adaptTransformsForRendering leaves input ComponentTransforms untouched', () => {
    const view = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);
    const transforms = placementToTransforms(view);
    const jsonBefore = JSON.stringify(transforms);

    const descriptors = adaptTransformsForRendering(transforms);
    expect(JSON.stringify(transforms)).toBe(jsonBefore);
    expect(descriptors).toHaveLength(26);
  });
});