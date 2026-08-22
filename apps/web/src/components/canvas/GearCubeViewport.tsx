/**
 * @file GearCubeViewport.tsx
 * @description React Three Fiber canvas viewport with camera, OrbitControls, lighting, and static solved Gear Cube model.
 */

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  SOLVED_GEAR_CUBE_STATE,
  DEFAULT_SPATIAL_FRAME,
  materializeState,
} from '@gearcube/core';
import { placementToTransforms } from '@gearcube/kinematics';
import { GearCubeModel } from '../cube/GearCubeModel';

export const GearCubeViewport: React.FC = () => {
  // Authoritative static pipeline: Core solved state + Default frame -> Physical view -> 26 ComponentTransforms
  const transforms = useMemo(() => {
    const view = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);
    return placementToTransforms(view);
  }, []);

  return (
    <div className="canvas-container" style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{
          position: [3.5, 3.0, 4.5],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
      >
        {/* Studio Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        <directionalLight position={[-5, -4, -5]} intensity={0.4} />

        {/* Orbit Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2.5}
          maxDistance={10.0}
        />

        {/* Static Gear Cube Model */}
        <GearCubeModel transforms={transforms} />
      </Canvas>
    </div>
  );
};