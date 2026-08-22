/**
 * @file CornerPiece.tsx
 * @description Visual 3D mesh group for a Corner piece with 3 physical face stickers.
 */

import React from 'react';
import type { CornerPieceId } from '@gearcube/core';
import { BODY_COLOR, getCornerStickers } from './materials';

export interface CornerPieceProps {
  readonly pieceId: CornerPieceId;
}

export const CornerPiece: React.FC<CornerPieceProps> = React.memo(({ pieceId }) => {
  const stickers = getCornerStickers(pieceId);

  return (
    <group>
      {/* Base dark cuboid body */}
      <mesh>
        <boxGeometry args={[0.88, 0.88, 0.88]} />
        <meshStandardMaterial color={BODY_COLOR} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* 3 Physical face stickers */}
      {stickers.map((sticker) => {
        const [nx, ny, nz] = sticker.localNormal;
        const posX = nx * 0.445;
        const posY = ny * 0.445;
        const posZ = nz * 0.445;

        const sizeX = nx !== 0 ? 0.02 : 0.74;
        const sizeY = ny !== 0 ? 0.02 : 0.74;
        const sizeZ = nz !== 0 ? 0.02 : 0.74;

        return (
          <mesh key={sticker.face} position={[posX, posY, posZ]}>
            <boxGeometry args={[sizeX, sizeY, sizeZ]} />
            <meshStandardMaterial color={sticker.color} roughness={0.3} metalness={0.05} />
          </mesh>
        );
      })}
    </group>
  );
});

CornerPiece.displayName = 'CornerPiece';