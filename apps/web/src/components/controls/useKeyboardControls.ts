import { useEffect, useRef } from 'react';
import type { Face, Direction, Move } from '@gearcube/core';
import type { StagedMoveSession } from '../cube/animation';

export type KeyboardMoveAction = {
  type: 'MOVE';
  move: Move;
};

export type KeyboardHistoryAction = {
  type: 'UNDO' | 'REDO';
};

export type KeyboardAction = KeyboardMoveAction | KeyboardHistoryAction | null;

export interface KeyboardEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  target?: EventTarget | null;
}

export interface KeyboardControlsOptions {
  isIdle: boolean;
  isAnimating: boolean;
  stagedMove: StagedMoveSession | null;
  canUndo: boolean;
  canRedo: boolean;
  onTriggerMove: (move: Move) => void;
  onUndo: () => void;
  onRedo: () => void;
}

const FACE_KEYS = new Set<string>(['u', 'd', 'f', 'b', 'r', 'l']);

/**
 * Pure helper to verify if an event target is an editable input/text element.
 */
export function isEditableTarget(target: EventTarget | null | undefined): boolean {
  if (!target || typeof target !== 'object') {
    return false;
  }
  const element = target as HTMLElement;
  const tagName = element.tagName ? element.tagName.toLowerCase() : '';
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  if (element.isContentEditable === true) {
    return true;
  }
  return false;
}

/**
 * Pure helper to resolve a raw keyboard event to an abstract KeyboardAction.
 * Returns null if the event is not a recognized or valid GearCube shortcut.
 */
export function resolveKeyboardAction(event: KeyboardEventLike): KeyboardAction {
  if (event.repeat) {
    return null;
  }

  if (isEditableTarget(event.target)) {
    return null;
  }

  const alt = !!event.altKey;
  if (alt) {
    return null;
  }

  const key = event.key.toLowerCase();
  const ctrl = !!event.ctrlKey;
  const meta = !!event.metaKey;
  const shift = !!event.shiftKey;

  // Face move shortcuts: u, d, f, b, r, l (no Ctrl, no Meta, no Alt)
  if (FACE_KEYS.has(key)) {
    if (ctrl || meta) {
      return null;
    }
    const face = key.toUpperCase() as Face;
    const direction: Direction = shift ? 'CCW' : 'CW';
    return {
      type: 'MOVE',
      move: { face, direction },
    };
  }

  // History shortcuts: Undo (Ctrl+Z or Cmd+Z) / Redo (Ctrl+Shift+Z or Cmd+Shift+Z)
  if (key === 'z') {
    const isCommand = (ctrl && !meta) || (meta && !ctrl);
    if (!isCommand) {
      return null;
    }
    if (shift) {
      return { type: 'REDO' };
    }
    return { type: 'UNDO' };
  }

  // History shortcut: Redo via Ctrl+Y (Windows/Linux only; Cmd+Y is explicitly rejected)
  if (key === 'y') {
    if (ctrl && !meta && !shift) {
      return { type: 'REDO' };
    }
    return null;
  }

  return null;
}

/**
 * Pure helper to check if a resolved action is actionable given current state.
 */
export function isActionAllowed(
  action: KeyboardAction,
  options: {
    isIdle: boolean;
    isAnimating: boolean;
    stagedMove: StagedMoveSession | null;
    canUndo: boolean;
    canRedo: boolean;
  }
): boolean {
  if (!action) {
    return false;
  }

  if (options.isAnimating) {
    return false;
  }

  if (action.type === 'UNDO') {
    return options.isIdle && options.stagedMove === null && options.canUndo;
  }

  if (action.type === 'REDO') {
    return options.isIdle && options.stagedMove === null && options.canRedo;
  }

  if (action.type === 'MOVE') {
    // IDLE state (not at half turn)
    if (options.isIdle && options.stagedMove === null) {
      return true;
    }

    // HALF_TURN_LOCKED state
    if (options.stagedMove !== null) {
      const stagedFace = options.stagedMove.move.face;
      // Only the staged face can be continued or cancelled
      return action.move.face === stagedFace;
    }
  }

  return false;
}

/**
 * React hook to bind keyboard event listener to window with a stable listener lifecycle.
 */
export function useKeyboardControls(options: KeyboardControlsOptions): void {
  const latestOptionsRef = useRef<KeyboardControlsOptions>(options);
  latestOptionsRef.current = options;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const current = latestOptionsRef.current;
      const action = resolveKeyboardAction(event);
      if (!action) {
        return;
      }

      const allowed = isActionAllowed(action, {
        isIdle: current.isIdle,
        isAnimating: current.isAnimating,
        stagedMove: current.stagedMove,
        canUndo: current.canUndo,
        canRedo: current.canRedo,
      });

      if (!allowed) {
        return;
      }

      event.preventDefault();

      if (action.type === 'MOVE') {
        current.onTriggerMove(action.move);
      } else if (action.type === 'UNDO') {
        current.onUndo();
      } else if (action.type === 'REDO') {
        current.onRedo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
