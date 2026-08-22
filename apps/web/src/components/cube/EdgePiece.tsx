/**
 * @file EdgePiece.tsx
 * @description Visual 3D mesh group for an Edge Gear piece with C2-symmetric placeholder cog geometry aligned to its physical home spindle axis.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { EdgePieceId } from '@gearcube/core';
import { BODY_COLOR, getEdgeStickers, getEdgeHomeSpindleAxis } from './materials';

export interface EdgePieceProps {
  readonly pieceId: EdgePieceId;
}

export const EdgePiece: React.FC<EdgePieceProps> = React.memo(({ pieceId }) => {
  const stickers = getEdgeStickers(pieceId);
  const spindleAxis = getEdgeHomeSpindleAxis(pieceId);

  // Compute local geometry rotation that aligns child cylinder (+Y) with physical home spindle axis
  const gearQuaternion = useMemo(() => {
    const fromVec = new THREE.Vector3(0, 1, 0);
    const toVec = new THREE.Vector3(spindleAxis[0], spindleAxis[1], spindleAxis[2]);
    return new THREE.Quaternion().setFromUnitVectors(fromVec, toVec);
  }, [spindleAxis]);

  return (
    <group>
      {/* Central dark core body */}
      <mesh>
        <boxGeometry args={[0.72, 0.72, 0.72]} />
        <meshStandardMaterial color={BODY_COLOR} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* C2-symmetric gear cog geometry aligned to physical home spindle axis */}
      <group quaternion={gearQuaternion}>
        {/* Central spindle cylinder along spindle axis */}
        <mesh>
          <cylinderGeometry args={[0.34, 0.34, 0.78, 16]} />
          <meshStandardMaterial color={BODY_COLOR} roughness={0.5} metalness={0.2} />
        </mesh>

        {/* 4 symmetric teeth cogs (C2-symmetric under 180° rotation around spindle axis) */}
        <mesh rotation={[0, 0, 0]}>
          <boxGeometry args={[0.78, 0.65, 0.28]} />
          <meshStandardMaterial color={BODY_COLOR} roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.78, 0.65, 0.28]} />
          <meshStandardMaterial color={BODY_COLOR} roughness={0.5} metalness={0.2} />
        </mesh>
      </group>

      {/* 2 Physical face stickers */}
      {stickers.map((sticker) => {
        const [nx, ny, nz] = sticker.localNormal;
        const posX = nx * 0.365;
        const posY = ny * 0.365;
        const posZ = nz * 0.365;

        const sizeX = nx !== 0 ? 0.02 : 0.62;
        const sizeY = ny !== 0 ? 0.02 : 0.62;
        const sizeZ = nz !== 0 ? 0.02 : 0.62;

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

EdgePiece.displayName = 'EdgePiece';