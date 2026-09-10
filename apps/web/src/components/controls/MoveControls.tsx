/**
 * @file MoveControls.tsx
 * @description Play-workspace overlay for canonical face moves and turn interaction controls.
 * @remarks The overlay owns input affordances and accessibility text; session
 * animation/history state remains in the parent controller. During a staged
 * turn it selectively enables the controls required by the current interaction
 * mode while preserving the canonical 12-move command shape.
 */

import React from 'react';
import { FACES, type Face, type Direction, type Move } from '@gearcube/core';
import type { StagedMoveSession, TurnInteractionMode } from '../cube/animation';
import { formatMoveGuidance, getFaceAxisMapping } from './move-guidance.js';
import { OrientationLegend } from './OrientationLegend.js';

export interface MoveControlsProps {
  readonly interactionMode: TurnInteractionMode;
  readonly isIdle: boolean;
  readonly isAnimating: boolean;
  readonly isChallengeGenerating: boolean;
  readonly stagedMove: StagedMoveSession | null;
  readonly onTriggerMove: (move: Move) => void;
  readonly onChangeInteractionMode: (mode: TurnInteractionMode) => void;
}

interface FaceMoveGroupProps {
  readonly face: Face;
  readonly interactionMode: TurnInteractionMode;
  readonly isAnimating: boolean;
  readonly isChallengeGenerating: boolean;
  readonly stagedMove: StagedMoveSession | null;
  readonly onTriggerMove: (move: Move) => void;
}

const FaceMoveGroup: React.FC<FaceMoveGroupProps> = React.memo(
  ({
    face,
    interactionMode,
    isAnimating,
    isChallengeGenerating,
    stagedMove,
    onTriggerMove,
  }) => {
    const isLocked = stagedMove?.phase === 'HALF_TURN_LOCKED';
    const isStagedFace = stagedMove?.move.face === face;
    const mapping = getFaceAxisMapping(face);

    // Disabled logic:
    // If animating: all disabled
    // If half-turn locked: only the staged face is enabled; other 5 faces disabled
    const isGroupDisabled =
      isAnimating || isChallengeGenerating || (isLocked && !isStagedFace);

    const handleMove = (e: React.MouseEvent, direction: Direction) => {
      e.stopPropagation();
      if (!isGroupDisabled) {
        onTriggerMove({ face, direction });
      }
    };

    // Tooltip and accessibility text use the same face-local orientation contract
    // as the persistent legend and describe the staged midpoint action.
    const getButtonTitle = (direction: Direction): string => {
      const move: Move = { face, direction };
      if (isLocked && isStagedFace && stagedMove) {
        return formatMoveGuidance(
          move,
          interactionMode,
          stagedMove.phase,
          stagedMove.move.direction
        );
      }
      return formatMoveGuidance(move, interactionMode);
    };

    const isCwFinish = isLocked && isStagedFace && stagedMove.move.direction === 'CW';
    const isCcwFinish = isLocked && isStagedFace && stagedMove.move.direction === 'CCW';

    return (
      <div className={`face-control-card ${isLocked && isStagedFace ? 'active-staged-card' : ''}`}>
        <span className="face-label" aria-label={`${face} face, ${mapping.faceName} (${mapping.axisLabel})`}>
          {face} ({mapping.axisLabel})
        </span>
        <div className="button-pair">
          <button
            type="button"
            className={`move-btn cw-btn ${isCwFinish ? 'finish-btn' : ''}`}
            disabled={isGroupDisabled}
            onClick={(e) => handleMove(e, 'CW')}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={getButtonTitle('CW')}
            title={getButtonTitle('CW')}
          >
            <span aria-hidden="true">↻</span>
            <span>CW</span>
          </button>
          <button
            type="button"
            className={`move-btn ccw-btn ${isCcwFinish ? 'finish-btn' : ''}`}
            disabled={isGroupDisabled}
            onClick={(e) => handleMove(e, 'CCW')}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={getButtonTitle('CCW')}
            title={getButtonTitle('CCW')}
          >
            <span aria-hidden="true">↺</span>
            <span>CCW</span>
          </button>
        </div>
      </div>
    );
  }
);

FaceMoveGroup.displayName = 'FaceMoveGroup';

export const MoveControls: React.FC<MoveControlsProps> = React.memo(
  ({
    interactionMode,
    isIdle,
    isAnimating,
    isChallengeGenerating,
    stagedMove,
    onTriggerMove,
    onChangeInteractionMode,
  }) => {
    const isLocked = stagedMove?.phase === 'HALF_TURN_LOCKED';
    const isDirect180 = interactionMode === 'DIRECT_180';
    const [isOrientationExpanded, setIsOrientationExpanded] = React.useState(true);

    const handleToggleMode = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isIdle && !isChallengeGenerating) {
        onChangeInteractionMode(isDirect180 ? 'TWO_STEP' : 'DIRECT_180');
      }
    };

    return (
      <div
        className="move-controls-overlay"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className={`move-controls-panel ${isLocked ? 'panel-half-turn-locked' : ''}`}>
          <div className="orientation-disclosure">
            <button
              type="button"
              className="orientation-disclosure-summary"
              aria-expanded={isOrientationExpanded}
              aria-controls="orientation-guidance-content"
              aria-label={`${isOrientationExpanded ? 'Collapse' : 'Expand'} orientation guidance`}
              title={`${isOrientationExpanded ? 'Collapse' : 'Expand'} orientation guidance`}
              onClick={() => setIsOrientationExpanded((expanded) => !expanded)}
            >
              <span>Orientation guidance</span>
              <span className="orientation-disclosure-indicator" aria-hidden="true">
                {isOrientationExpanded ? '−' : '+'}
              </span>
            </button>
            <div
              id="orientation-guidance-content"
              className="orientation-disclosure-content"
              hidden={!isOrientationExpanded}
            >
              <OrientationLegend />
            </div>
          </div>
          <div className="move-controls-header">
            <div className="header-title-row">
              <span className="panel-title">Face Controls</span>
              <button
                type="button"
                className={`mode-toggle-btn ${isDirect180 ? 'mode-direct-active' : ''}`}
                disabled={!isIdle || isChallengeGenerating}
                onClick={handleToggleMode}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label={`Direct 180° turn mode: ${isDirect180 ? 'ON' : 'OFF'}`}
                title={`Toggle Direct 180° turn mode (Currently ${isDirect180 ? 'ON' : 'OFF'})`}
              >
                <span className="mode-toggle-label">Direct 180°</span>
                <span className={`mode-toggle-pill ${isDirect180 ? 'pill-on' : 'pill-off'}`}>
                  {isDirect180 ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {isChallengeGenerating ? (
              <span className="animating-indicator">Generating certified challenge…</span>
            ) : isLocked && stagedMove ? (
              <div className="half-turn-guidance">
                <span className="locked-badge">HALF-TURN: {stagedMove.move.face} {stagedMove.move.direction}</span>
                <span className="locked-action-hint">
                  {formatMoveGuidance(
                    { face: stagedMove.move.face, direction: stagedMove.move.direction },
                    interactionMode,
                    stagedMove.phase,
                    stagedMove.move.direction
                  )}
                </span>
              </div>
            ) : isAnimating ? (
              <span className="animating-indicator">
                Turning ({isDirect180 ? '180°' : '90°'})...
              </span>
            ) : (
              <span className="move-controls-instructions">
                CW / CCW: outside the selected face toward the cube center · Press a face key (Shift = CCW).
              </span>
            )}
          </div>

          <div className="faces-grid">
            {FACES.map((face) => (
              <FaceMoveGroup
                key={face}
                face={face}
                interactionMode={interactionMode}
                isAnimating={isAnimating}
                isChallengeGenerating={isChallengeGenerating}
                stagedMove={stagedMove}
                onTriggerMove={onTriggerMove}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

MoveControls.displayName = 'MoveControls';
