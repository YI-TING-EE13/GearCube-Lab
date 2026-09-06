/**
 * @file GearCubeViewport.tsx
 * @description React Three Fiber canvas viewport hosting the interactive Gear Cube session,
 * workspace presentation modes ('PLAY' vs 'RESEARCH'), MoveControls, HistoryControls,
 * TimelineScrubber, ScramblePanel, SolvePanel, PlaybackControls, and ResearchPanel overlays.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { isSolved, serializeLogicalState, type Move } from '@gearcube/core';
import type { SolverAlgorithm } from '@gearcube/solvers';
import type { BenchmarkSuiteConfig } from '@gearcube/benchmark';
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
import { SolvePanel } from '../solver/SolvePanel';
import { PlaybackControls } from '../solver/PlaybackControls';
import { ResearchPanel } from '../research/ResearchPanel';
import { useSolverWorker } from '../../hooks/useSolverWorker';
import { useBenchmarkWorker } from '../../hooks/useBenchmarkWorker';
import {
  createPlaybackMetadata,
  setPlayIntent,
  canDispatchNextMove,
  getNextMoveToDispatch,
  recordMoveDispatch,
  recordMoveSettled,
  canStepBackward,
  recordStepBackward,
  type SolutionPlaybackMetadata,
} from '../solver/playback-controller';

export type WorkspaceMode = 'PLAY' | 'RESEARCH';

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
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('PLAY');
  const [isPlayControlsOpen, setIsPlayControlsOpen] = useState(true);
  const [app, setApp] = useState<PlayApplicationState>(createInitialPlayApplicationState);
  const [seed, setSeed] = useState<string>('GearCube-Lab');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<SolverAlgorithm>('IDA_STAR');
  const [playbackMetadata, setPlaybackMetadata] = useState<SolutionPlaybackMetadata | null>(null);
  const solverAcceptanceTokenRef = useRef<object | null>(null);
  const currentAcceptanceToken = solverAcceptanceTokenRef.current;

  const { state: solverWorkerState, startSearch, cancelSearch } = useSolverWorker();
  const {
    state: benchmarkWorkerState,
    startBenchmark,
    cancelBenchmark,
  } = useBenchmarkWorker();

  // Mode Transition Handlers
  const handleSwitchToPlay = useCallback(() => {
    cancelBenchmark();
    setWorkspaceMode('PLAY');
  }, [cancelBenchmark]);

  const handleSwitchToResearch = useCallback(() => {
    if (!isSessionIdle(app.session)) {
      return;
    }
    solverAcceptanceTokenRef.current = null;
    cancelSearch();
    setPlaybackMetadata(null);
    setWorkspaceMode('RESEARCH');
  }, [app.session, cancelSearch]);

  // Benchmark Execution Callbacks
  const handleStartBenchmark = useCallback(
    (config: BenchmarkSuiteConfig) => {
      if (workspaceMode !== 'RESEARCH') {
        return;
      }
      startBenchmark(config);
    },
    [workspaceMode, startBenchmark]
  );

  const handleCancelBenchmark = useCallback(() => {
    cancelBenchmark();
  }, [cancelBenchmark]);

  // External Action Handlers: Cancel search, clear playback, then mutate play application state
  const handleTriggerMove = useCallback(
    (move: Move) => {
      if (workspaceMode !== 'PLAY') return;
      solverAcceptanceTokenRef.current = null;
      cancelSearch();
      setPlaybackMetadata(null);
      setApp((prev) => startPlayMove(prev, move, performance.now()));
    },
    [workspaceMode, cancelSearch]
  );

  const handleStepAnimation = useCallback((nowMs: number) => {
    setApp((prev) => stepPlayAnimation(prev, nowMs));
  }, []);

  const handleChangeInteractionMode = useCallback(
    (mode: TurnInteractionMode) => {
      if (workspaceMode !== 'PLAY') return;
      setApp((prev) => setPlayInteractionMode(prev, mode));
    },
    [workspaceMode]
  );

  const handleUndo = useCallback(() => {
    if (workspaceMode !== 'PLAY') return;
    solverAcceptanceTokenRef.current = null;
    cancelSearch();
    setPlaybackMetadata(null);
    setApp((prev) => undoPlay(prev));
  }, [workspaceMode, cancelSearch]);

  const handleRedo = useCallback(() => {
    if (workspaceMode !== 'PLAY') return;
    solverAcceptanceTokenRef.current = null;
    cancelSearch();
    setPlaybackMetadata(null);
    setApp((prev) => redoPlay(prev));
  }, [workspaceMode, cancelSearch]);

  const handleResetBaseline = useCallback(() => {
    if (workspaceMode !== 'PLAY') return;
    solverAcceptanceTokenRef.current = null;
    cancelSearch();
    setPlaybackMetadata(null);
    setApp((prev) => backToBaselinePlay(prev));
  }, [workspaceMode, cancelSearch]);

  const handleScrub = useCallback(
    (index: number) => {
      if (workspaceMode !== 'PLAY') return;
      solverAcceptanceTokenRef.current = null;
      cancelSearch();
      setPlaybackMetadata(null);
      setApp((prev) => scrubPlay(prev, index));
    },
    [workspaceMode, cancelSearch]
  );

  const handleScramble = useCallback(() => {
    if (workspaceMode !== 'PLAY') return;
    solverAcceptanceTokenRef.current = null;
    cancelSearch();
    setPlaybackMetadata(null);
    setApp((prev) => applyScrambleToPlay(prev, seed));
  }, [workspaceMode, cancelSearch, seed]);

  // Solver Action Handlers
  const handleSolve = useCallback(() => {
    if (workspaceMode !== 'PLAY') return;
    if (!isSessionIdle(app.session)) return;
    const token = {};
    solverAcceptanceTokenRef.current = token;
    setPlaybackMetadata(null);
    startSearch(selectedAlgorithm, app.session.currentState);
  }, [workspaceMode, app.session, selectedAlgorithm, startSearch]);

  const handleCancelSearch = useCallback(() => {
    solverAcceptanceTokenRef.current = null;
    cancelSearch();
  }, [cancelSearch]);

  // Defensive Solution Acceptance Gate (active only in PLAY mode)
  useEffect(() => {
    if (
      workspaceMode === 'PLAY' &&
      solverWorkerState.status === 'SOLVED' &&
      currentAcceptanceToken !== null &&
      solverAcceptanceTokenRef.current === currentAcceptanceToken
    ) {
      if (
        isSessionIdle(app.session) &&
        serializeLogicalState(app.session.currentState) === solverWorkerState.searchStartStateKey
      ) {
        solverAcceptanceTokenRef.current = null;
        setPlaybackMetadata((prev) => {
          if (prev && prev.solutionStartStateKey === solverWorkerState.searchStartStateKey) {
            return prev;
          }
          return createPlaybackMetadata(
            app.session.currentState,
            solverWorkerState.result.moves,
            app.history.cursorIndex
          );
        });
      }
    }
  }, [
    workspaceMode,
    solverWorkerState,
    app.session,
    app.history.cursorIndex,
    currentAcceptanceToken,
  ]);

  // Playback Control Handlers
  const handlePlay = useCallback(() => {
    if (workspaceMode !== 'PLAY') return;
    setPlaybackMetadata((prev) => (prev ? setPlayIntent(prev, true) : null));
  }, [workspaceMode]);

  const handlePause = useCallback(() => {
    if (workspaceMode !== 'PLAY') return;
    setPlaybackMetadata((prev) => (prev ? setPlayIntent(prev, false) : null));
  }, [workspaceMode]);

  const handleStepForward = useCallback(() => {
    if (workspaceMode !== 'PLAY') return;
    if (!playbackMetadata || playbackMetadata.playing || playbackMetadata.canonicalMoveInFlight) {
      return;
    }
    if (!isSessionIdle(app.session)) {
      return;
    }

    const currentKey = serializeLogicalState(app.session.currentState);
    if (canDispatchNextMove(playbackMetadata, currentKey)) {
      const move = getNextMoveToDispatch(playbackMetadata);
      if (move) {
        setPlaybackMetadata((prev) => (prev ? recordMoveDispatch(prev) : null));
        setApp((prev) => startPlayMove(prev, move, performance.now()));
      }
    } else {
      setPlaybackMetadata(null);
    }
  }, [workspaceMode, playbackMetadata, app.session]);

  const handleStepBackward = useCallback(() => {
    if (workspaceMode !== 'PLAY') return;
    if (!playbackMetadata) return;
    if (!isSessionIdle(app.session)) return;

    const currentKey = serializeLogicalState(app.session.currentState);
    if (canStepBackward(playbackMetadata, app.history.cursorIndex, currentKey)) {
      const nextApp = undoPlay(app);
      setApp(nextApp);
      const resultingKey = serializeLogicalState(nextApp.session.currentState);
      const backRes = recordStepBackward(playbackMetadata, resultingKey);
      if (backRes.status === 'STEPPED_BACK') {
        setPlaybackMetadata(backRes.next);
      } else {
        setPlaybackMetadata(null);
      }
    }
  }, [workspaceMode, playbackMetadata, app]);

  // Playback Animation & Settlement Orchestration Effect
  const stagedPhase = app.session.stagedMove?.phase;
  const isIdle = isSessionIdle(app.session);

  useEffect(() => {
    if (workspaceMode !== 'PLAY') return;
    if (!playbackMetadata) return;

    // Case 1: A move is in flight
    if (playbackMetadata.canonicalMoveInFlight) {
      // TWO_STEP midpoint continuation
      if (stagedPhase === 'HALF_TURN_LOCKED') {
        const move = getNextMoveToDispatch(playbackMetadata);
        if (move) {
          setApp((prev) => startPlayMove(prev, move, performance.now()));
        }
        return;
      }

      // Canonical turn settlement at IDLE
      if (isIdle) {
        const currentKey = serializeLogicalState(app.session.currentState);
        const settleResult = recordMoveSettled(playbackMetadata, currentKey);
        if (settleResult.status === 'SETTLED') {
          setPlaybackMetadata(settleResult.next);
        } else {
          setPlaybackMetadata(null);
        }
        return;
      }
      return;
    }

    // Case 2: Automatic playing while IDLE
    if (playbackMetadata.playing && !playbackMetadata.canonicalMoveInFlight && isIdle) {
      const currentKey = serializeLogicalState(app.session.currentState);
      if (canDispatchNextMove(playbackMetadata, currentKey)) {
        const move = getNextMoveToDispatch(playbackMetadata);
        if (move) {
          setPlaybackMetadata((prev) => (prev ? recordMoveDispatch(prev) : null));
          setApp((prev) => startPlayMove(prev, move, performance.now()));
        }
      } else {
        setPlaybackMetadata(null);
      }
    }
  }, [workspaceMode, stagedPhase, isIdle, app.session.currentState, playbackMetadata]);

  const { session, history } = app;
  const isAnimating = isSessionAnimating(session);
  const isBusy = !isIdle;

  const isCubeSolved = isSolved(session.currentState);
  const hasUndo = canUndo(history);
  const hasRedo = canRedo(history);
  const canReset = history.cursorIndex !== -1;

  const canStepBack = Boolean(
    playbackMetadata &&
    canStepBackward(
      playbackMetadata,
      history.cursorIndex,
      serializeLogicalState(session.currentState)
    )
  );

  useKeyboardControls({
    isIdle: workspaceMode === 'PLAY' && isIdle,
    isAnimating: workspaceMode !== 'PLAY' || isAnimating,
    stagedMove: workspaceMode === 'PLAY' ? session.stagedMove : null,
    canUndo: workspaceMode === 'PLAY' && hasUndo,
    canRedo: workspaceMode === 'PLAY' && hasRedo,
    onTriggerMove: handleTriggerMove,
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  return (
    <div className={`canvas-container workspace-mode-${workspaceMode.toLowerCase()}`}>
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

      {/* Top Center: Always-Visible Workspace Mode Switch */}
      <nav
        className={`workspace-mode-switch workspace-mode-switch-${workspaceMode.toLowerCase()}`}
        aria-label="Workspace Mode"
        data-testid="workspace-mode-switch"
      >
        <button
          type="button"
          className={`workspace-mode-btn ${workspaceMode === 'PLAY' ? 'workspace-mode-btn-active' : ''}`}
          onClick={handleSwitchToPlay}
          aria-pressed={workspaceMode === 'PLAY'}
          data-testid="workspace-mode-play"
        >
          Play
        </button>
        <button
          type="button"
          className={`workspace-mode-btn ${workspaceMode === 'RESEARCH' ? 'workspace-mode-btn-active' : ''}`}
          onClick={handleSwitchToResearch}
          disabled={workspaceMode === 'PLAY' && !isIdle}
          aria-pressed={workspaceMode === 'RESEARCH'}
          data-testid="workspace-mode-research"
        >
          Research
        </button>
      </nav>

      {/* Mode-Conditional UI Clusters */}
      {workspaceMode === 'PLAY' && (
        <>
          {/* Compact screens keep the toggle outside the drawer so it remains reachable when controls are stowed. */}
          <button
            type="button"
            className="play-controls-toggle"
            onClick={() => setIsPlayControlsOpen((open) => !open)}
            aria-expanded={isPlayControlsOpen}
            aria-controls="play-controls-drawer"
            aria-label={isPlayControlsOpen ? 'Close play controls menu' : 'Open play controls menu'}
            title={isPlayControlsOpen ? 'Close play controls menu' : 'Open play controls menu'}
            data-testid="play-controls-toggle"
          >
            <span className="play-controls-toggle-icon" aria-hidden="true">
              {isPlayControlsOpen ? '×' : '☰'}
            </span>
          </button>

          <div
            id="play-controls-drawer"
            className="play-controls-drawer"
            data-open={isPlayControlsOpen}
            role="region"
            aria-label="Play controls"
            data-testid="play-controls-drawer"
          >
            <div className="play-controls-drawer-content">
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

              {/* Right Side Overlay: Solve Panel & Playback Controls */}
              <div className="right-overlay-cluster">
                <SolvePanel
                  isSolved={isCubeSolved}
                  isSessionBusy={isBusy}
                  solverState={solverWorkerState}
                  selectedAlgorithm={selectedAlgorithm}
                  onSelectAlgorithm={setSelectedAlgorithm}
                  onSolve={handleSolve}
                  onCancel={handleCancelSearch}
                />

                <PlaybackControls
                  playbackMetadata={playbackMetadata}
                  isSessionBusy={isBusy}
                  canStepBack={canStepBack}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onStepForward={handleStepForward}
                  onStepBackward={handleStepBackward}
                />
              </div>

              {/* Play-workspace move overlay; solver and playback controls remain in this mode. */}
              <MoveControls
                interactionMode={session.interactionMode}
                isIdle={isIdle}
                isAnimating={isAnimating}
                stagedMove={session.stagedMove}
                onTriggerMove={handleTriggerMove}
                onChangeInteractionMode={handleChangeInteractionMode}
              />
            </div>
          </div>
        </>
      )}

      {workspaceMode === 'RESEARCH' && (
        <div
          className="research-mode-overlay"
          data-testid="research-mode-overlay"
        >
          <ResearchPanel
            benchmarkState={benchmarkWorkerState}
            onStartBenchmark={handleStartBenchmark}
            onCancelBenchmark={handleCancelBenchmark}
          />
        </div>
      )}
    </div>
  );
};
