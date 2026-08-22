/**
 * @file materials.ts
 * @description Color palette, face material definitions, and physical sticker normal helpers for Gear Cube renderer.
 */

import type { Face, CornerPieceId, EdgePieceId, CenterPieceId } from '@gearcube/core';
import type { ComponentId } from '@gearcube/kinematics';

/** Frozen physical face color palette */
export const FACE_COLORS: Readonly<Record<Face, string>> = {
  U: '#FFFFFF', // Pure White
  D: '#FFD500', // Canary Yellow
  F: '#009B48', // Emerald Green
  B: '#0046AD', // Cobalt Blue
  R: '#B71234', // Ruby Red
  L: '#FF5800', // Bright Orange
};

/** Internal piece base body color */
export const BODY_COLOR = '#1A1A1A';

/** Canonical outward unit normal vector for each cube face in solved home orientation */
export const FACE_NORMALS: Readonly<Record<Face, readonly [number, number, number]>> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0],
};

/** Sticker descriptor for a physical piece */
export interface PieceSticker {
  readonly face: Face;
  readonly color: string;
  readonly localNormal: readonly [number, number, number];
}

/**
 * Extracts physical face stickers from a CornerPieceId.
 * Local sticker normals correspond strictly to the physical piece's home face directions.
 */
export function getCornerStickers(pieceId: CornerPieceId): readonly PieceSticker[] {
  const letters = pieceId.replace('corner-', '').split('') as Face[];
  return letters.map((face) => ({
    face,
    color: FACE_COLORS[face],
    localNormal: FACE_NORMALS[face],
  }));
}

/**
 * Extracts physical face stickers from an EdgePieceId.
 * Local sticker normals correspond strictly to the physical piece's home face directions.
 */
export function getEdgeStickers(pieceId: EdgePieceId): readonly PieceSticker[] {
  const letters = pieceId.replace('edge-', '').split('') as Face[];
  return letters.map((face) => ({
    face,
    color: FACE_COLORS[face],
    localNormal: FACE_NORMALS[face],
  }));
}

/**
 * Extracts physical face sticker from a CenterPieceId.
 * In canonical center mesh frame, the outward face plate always points along +Y.
 */
export function getCenterSticker(pieceId: CenterPieceId): PieceSticker {
  const face = pieceId.replace('center-', '') as Face;
  return {
    face,
    color: FACE_COLORS[face],
    localNormal: [0, 1, 0],
  };
}

/**
 * Computes the physical-home radial spindle unit vector for an EdgePieceId.
 * Derived strictly from physical EdgePieceId letters, never from current slot.
 */
export function getEdgeHomeSpindleAxis(pieceId: EdgePieceId): readonly [number, number, number] {
  const letters = pieceId.replace('edge-', '').split('') as [Face, Face];
  const n1 = FACE_NORMALS[letters[0]];
  const n2 = FACE_NORMALS[letters[1]];
  const sumX = n1[0] + n2[0];
  const sumY = n1[1] + n2[1];
  const sumZ = n1[2] + n2[2];
  const len = Math.hypot(sumX, sumY, sumZ);
  return [sumX / len, sumY / len, sumZ / len];
}

/**
 * Routes ComponentId to piece category.
 */
export function getPieceCategory(componentId: ComponentId): 'corner' | 'edge' | 'center' {
  if (componentId.startsWith('corner-')) return 'corner';
  if (componentId.startsWith('edge-')) return 'edge';
  if (componentId.startsWith('center-')) return 'center';
  throw new Error(`Unknown ComponentId: ${componentId}`);
}