/**
 * @file GearCubeViewport.tsx
 * @description React Three Fiber canvas viewport hosting the interactive Gear Cube session, MoveControls, HistoryControls, TimelineScrubber, and ScramblePanel overlays.
 */

import React, { useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Move } from '@gearcube/core';
import { GearCubeModel } from '../cube/GearCubeModel';
import { MoveControls } from '../controls/MoveControls';
import { useKeyboardControls } from '../controls/useKeyboardControls';
import {
  type GearCubeSessionState,
  type TurnInteractionMode,
  isSessionAnimating,
  isSessionIdle,
} from '../cube/animation';
import {
  type PlayApplicationState,
  createInitialPlayApplicationState,
  startPlayMove,
  stepPlayAnimation,
  setPlayInteractionMode,
  undoPlay,
  redoPlay,
  scrubPlay,
  backToBaselinePlay,
  applyScrambleToPlay,
} from '../history/play-session';
import { canUndo, canRedo } from '../history/history';
import { HistoryControls } from '../history/HistoryControls';
import { TimelineScrubber } from '../history/TimelineScrubber';
import { ScramblePanel } from '../history/ScramblePanel';

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
  const [app, setApp] = useState<PlayApplicationState>(createInitialPlayApplicationState);
  const [seed, setSeed] = useState<string>('GearCube-Lab');

  const handleTriggerMove = useCallback((move: Move) => {
    setApp((prev) => startPlayMove(prev, move, performance.now()));
  }, []);

  const handleStepAnimation = useCallback((nowMs: number) => {
    setApp((prev) => stepPlayAnimation(prev, nowMs));
  }, []);

  const handleChangeInteractionMode = useCallback((mode: TurnInteractionMode) => {
    setApp((prev) => setPlayInteractionMode(prev, mode));
  }, []);

  const handleUndo = useCallback(() => {
    setApp((prev) => undoPlay(prev));
  }, []);

  const handleRedo = useCallback(() => {
    setApp((prev) => redoPlay(prev));
  }, []);

  const handleResetBaseline = useCallback(() => {
    setApp((prev) => backToBaselinePlay(prev));
  }, []);

  const handleScrub = useCallback((index: number) => {
    setApp((prev) => scrubPlay(prev, index));
  }, []);

  const handleScramble = useCallback(() => {
    setApp((prev) => applyScrambleToPlay(prev, seed));
  }, [seed]);

  const { session, history } = app;
  const isAnimating = isSessionAnimating(session);
  const isIdle = isSessionIdle(session);
  const isBusy = !isIdle;

  const hasUndo = canUndo(history);
  const hasRedo = canRedo(history);
  const canReset = history.cursorIndex !== -1;

  useKeyboardControls({
    isIdle,
    isAnimating,
    stagedMove: session.stagedMove,
    canUndo: hasUndo,
    canRedo: hasRedo,
    onTriggerMove: handleTriggerMove,
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

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

      {/* Top Bar: History Navigation & Scramble Controls */}
      <div className="top-overlay-bar">
        <HistoryControls
          canUndo={hasUndo}
          canRedo={hasRedo}
          canResetBaseline={canReset}
          isBusy={isBusy}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onResetBaseline={handleResetBaseline}
        />

        <ScramblePanel
          seed={seed}
          isBusy={isBusy}
          onSeedChange={setSeed}
          onScramble={handleScramble}
        />
      </div>

      {/* Left/Bottom-Left: Timeline Scrubber */}
      <TimelineScrubber
        entries={history.entries}
        cursorIndex={history.cursorIndex}
        isBusy={isBusy}
        onScrub={handleScrub}
      />

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