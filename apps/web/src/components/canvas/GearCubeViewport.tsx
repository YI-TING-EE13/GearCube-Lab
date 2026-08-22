/**
 * @file GearCubeViewport.tsx
 * @description React Three Fiber canvas viewport hosting the interactive Phase 2E staged Gear Cube session, lighting, OrbitControls, and MoveControls overlay with turn interaction mode switching.
 */

import React, { useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Move } from '@gearcube/core';
import { GearCubeModel } from '../cube/GearCubeModel';
import { MoveControls } from '../controls/MoveControls';
import {
  type GearCubeSessionState,
  type TurnInteractionMode,
  createInitialSessionState,
  startMove,
  stepAnimation,
  isSessionAnimating,
  isSessionIdle,
  setTurnInteractionMode,
} from '../cube/animation';

interface AnimatedGearCubeSceneProps {
  readonly session: GearCubeSessionState;
  readonly onStepAnimation: (nowMs: number) => void;
}

/**
 * Internal Canvas-descendant driver component executing the frame loop via R3F useFrame.
 */
const AnimatedGearCubeScene: React.FC<AnimatedGearCubeSceneProps> = ({
  session,
  onStepAnimation,
}) => {
  useFrame(() => {
    if (isSessionAnimating(session)) {
      onStepAnimation(performance.now());
    }
  });

  return <GearCubeModel transforms={session.displayTransforms} />;
};

export const GearCubeViewport: React.FC = () => {
  const [session, setSession] = useState<GearCubeSessionState>(createInitialSessionState);

  const handleTriggerMove = useCallback((move: Move) => {
    setSession((prev) => startMove(prev, move, performance.now()));
  }, []);

  const handleStepAnimation = useCallback((nowMs: number) => {
    setSession((prev) => stepAnimation(prev, nowMs));
  }, []);

  const handleChangeInteractionMode = useCallback((mode: TurnInteractionMode) => {
    setSession((prev) => setTurnInteractionMode(prev, mode));
  }, []);

  const isAnimating = isSessionAnimating(session);
  const isIdle = isSessionIdle(session);

  return (
    <div className="canvas-container" style={{ width: '100vw', height: '100vh', position: 'relative' }}>
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

        {/* Dynamic Animated Gear Cube Scene */}
        <AnimatedGearCubeScene
          session={session}
          onStepAnimation={handleStepAnimation}
        />
      </Canvas>

      {/* 12-Move Control Overlay with Phase 2E Turn Interaction Mode Support */}
      <MoveControls
        interactionMode={session.interactionMode}
        isIdle={isIdle}
        isAnimating={isAnimating}
        stagedMove={session.stagedMove}
        onTriggerMove={handleTriggerMove}
        onChangeInteractionMode={handleChangeInteractionMode}
      />
    </div>
  );
};