/**
 * @file CenterPiece.tsx
 * @description Visual 3D mesh group for a Center piece with rotationally symmetric geometry facing local +Y.
 */

import React from 'react';
import type { CenterPieceId } from '@gearcube/core';
import { BODY_COLOR, getCenterSticker } from './materials';

export interface CenterPieceProps {
  readonly pieceId: CenterPieceId;
}

export const CenterPiece: React.FC<CenterPieceProps> = React.memo(({ pieceId }) => {
  const sticker = getCenterSticker(pieceId);

  return (
    <group>
      {/* Base dark bezel cap */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.42, 0.46, 0.4, 32]} />
        <meshStandardMaterial color={BODY_COLOR} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Rotationally symmetric colored circular face plate facing local +Y */}
      <mesh position={[0, 0.405, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.02, 32]} />
        <meshStandardMaterial color={sticker.color} roughness={0.3} metalness={0.05} />
      </mesh>

      {/* Internal concentric ring accent */}
      <mesh position={[0, 0.418, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.01, 32]} />
        <meshStandardMaterial color={BODY_COLOR} roughness={0.5} metalness={0.2} />
      </mesh>
    </group>
  );
});

CenterPiece.displayName = 'CenterPiece';