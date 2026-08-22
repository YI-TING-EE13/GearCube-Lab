/**
 * @file GearCubeModel.tsx
 * @description Renders 26 persistent top-level piece groups in stable ComponentId order with declarative quaternion binding.
 */

import React from 'react';
import type { CornerPieceId, EdgePieceId, CenterPieceId } from '@gearcube/core';
import type { ComponentTransform } from '@gearcube/kinematics';
import { CornerPiece } from './CornerPiece';
import { EdgePiece } from './EdgePiece';
import { CenterPiece } from './CenterPiece';
import { getPieceCategory } from './materials';

export interface GearCubeModelProps {
  readonly transforms: readonly ComponentTransform[];
}

/** Pure descriptor describing a single rendered scene node for testing and inspection */
export interface RenderedPieceDescriptor {
  readonly componentId: ComponentTransform['componentId'];
  readonly category: 'corner' | 'edge' | 'center';
  readonly position: readonly [number, number, number];
  readonly quaternion: readonly [number, number, number, number];
}

/** Pure adapter function transforming ComponentTransforms into scene node descriptors */
export function adaptTransformsForRendering(
  transforms: readonly ComponentTransform[]
): readonly RenderedPieceDescriptor[] {
  return transforms.map((t) => ({
    componentId: t.componentId,
    category: getPieceCategory(t.componentId),
    position: t.position,
    quaternion: t.rotationQuaternion,
  }));
}

export const GearCubeModel: React.FC<GearCubeModelProps> = React.memo(({ transforms }) => {
  return (
    <group>
      {transforms.map((transform) => {
        const category = getPieceCategory(transform.componentId);

        return (
          <group
            key={transform.componentId}
            position={transform.position}
            quaternion={transform.rotationQuaternion}
          >
            {category === 'corner' && (
              <CornerPiece pieceId={transform.componentId as CornerPieceId} />
            )}
            {category === 'edge' && (
              <EdgePiece pieceId={transform.componentId as EdgePieceId} />
            )}
            {category === 'center' && (
              <CenterPiece pieceId={transform.componentId as CenterPieceId} />
            )}
          </group>
        );
      })}
    </group>
  );
});

GearCubeModel.displayName = 'GearCubeModel';