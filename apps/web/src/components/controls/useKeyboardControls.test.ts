import { describe, it, expect } from 'vitest';
import {
  resolveKeyboardAction,
  isEditableTarget,
  isActionAllowed,
} from './useKeyboardControls';
import type { StagedMoveSession } from '../cube/animation';
import type { Move } from '@gearcube/core';

describe('useKeyboardControls pure helpers', () => {
  describe('isEditableTarget', () => {
    it('returns false for null/undefined/non-objects', () => {
      expect(isEditableTarget(null)).toBe(false);
      expect(isEditableTarget(undefined)).toBe(false);
      expect(isEditableTarget('string' as unknown as EventTarget)).toBe(false);
    });

    it('returns true for input, textarea, and select elements', () => {
      expect(isEditableTarget({ tagName: 'INPUT' } as unknown as EventTarget)).toBe(true);
      expect(isEditableTarget({ tagName: 'textarea' } as unknown as EventTarget)).toBe(true);
      expect(isEditableTarget({ tagName: 'SELECT' } as unknown as EventTarget)).toBe(true);
    });

    it('returns true for isContentEditable elements', () => {
      expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget)).toBe(true);
    });

    it('returns false for standard non-editable elements', () => {
      expect(isEditableTarget({ tagName: 'DIV', isContentEditable: false } as unknown as EventTarget)).toBe(false);
      expect(isEditableTarget({ tagName: 'BUTTON' } as unknown as EventTarget)).toBe(false);
      expect(isEditableTarget({ tagName: 'CANVAS' } as unknown as EventTarget)).toBe(false);
    });
  });

  describe('resolveKeyboardAction - Face Moves', () => {
    it('resolves unshifted face keys to Clockwise (CW) moves', () => {
      const faces = ['u', 'd', 'f', 'b', 'r', 'l'] as const;
      for (const f of faces) {
        const action = resolveKeyboardAction({ key: f });
        expect(action).toEqual({
          type: 'MOVE',
          move: { face: f.toUpperCase(), direction: 'CW' },
        });
      }
    });

    it('resolves Shift-modified face keys to Counter-Clockwise (CCW) moves', () => {
      const faces = ['u', 'd', 'f', 'b', 'r', 'l'] as const;
      for (const f of faces) {
        const action = resolveKeyboardAction({ key: f, shiftKey: true });
        expect(action).toEqual({
          type: 'MOVE',
          move: { face: f.toUpperCase(), direction: 'CCW' },
        });
      }
    });

    it('rejects face keys with Ctrl, Meta, or Alt modifiers', () => {
      expect(resolveKeyboardAction({ key: 'u', ctrlKey: true })).toBeNull();
      expect(resolveKeyboardAction({ key: 'u', metaKey: true })).toBeNull();
      expect(resolveKeyboardAction({ key: 'u', altKey: true })).toBeNull();
      expect(resolveKeyboardAction({ key: 'u', ctrlKey: true, shiftKey: true })).toBeNull();
      expect(resolveKeyboardAction({ key: 'u', metaKey: true, shiftKey: true })).toBeNull();
      expect(resolveKeyboardAction({ key: 'u', altKey: true, shiftKey: true })).toBeNull();
    });

    it('ignores repeat key events', () => {
      expect(resolveKeyboardAction({ key: 'u', repeat: true })).toBeNull();
      expect(resolveKeyboardAction({ key: 'z', ctrlKey: true, repeat: true })).toBeNull();
    });

    it('ignores keys when targeting editable elements', () => {
      const inputTarget = { tagName: 'INPUT' } as unknown as EventTarget;
      expect(resolveKeyboardAction({ key: 'u', target: inputTarget })).toBeNull();
      expect(resolveKeyboardAction({ key: 'z', ctrlKey: true, target: inputTarget })).toBeNull();
    });
  });

  describe('resolveKeyboardAction - History Shortcuts', () => {
    it('resolves Ctrl+Z and Cmd+Z to UNDO', () => {
      expect(resolveKeyboardAction({ key: 'z', ctrlKey: true })).toEqual({ type: 'UNDO' });
      expect(resolveKeyboardAction({ key: 'z', metaKey: true })).toEqual({ type: 'UNDO' });
    });

    it('resolves Ctrl+Shift+Z and Cmd+Shift+Z to REDO', () => {
      expect(resolveKeyboardAction({ key: 'z', ctrlKey: true, shiftKey: true })).toEqual({ type: 'REDO' });
      expect(resolveKeyboardAction({ key: 'z', metaKey: true, shiftKey: true })).toEqual({ type: 'REDO' });
    });

    it('resolves Ctrl+Y to REDO on Windows/Linux', () => {
      expect(resolveKeyboardAction({ key: 'y', ctrlKey: true })).toEqual({ type: 'REDO' });
    });

    it('rejects Cmd+Y to avoid macOS history collision', () => {
      expect(resolveKeyboardAction({ key: 'y', metaKey: true })).toBeNull();
    });

    it('rejects history shortcuts contaminated with Alt or both Ctrl and Meta', () => {
      expect(resolveKeyboardAction({ key: 'z', ctrlKey: true, altKey: true })).toBeNull();
      expect(resolveKeyboardAction({ key: 'z', metaKey: true, altKey: true })).toBeNull();
      expect(resolveKeyboardAction({ key: 'z', ctrlKey: true, metaKey: true })).toBeNull();
      expect(resolveKeyboardAction({ key: 'y', ctrlKey: true, altKey: true })).toBeNull();
    });

    it('rejects unmapped random keys', () => {
      expect(resolveKeyboardAction({ key: 'a' })).toBeNull();
      expect(resolveKeyboardAction({ key: 'Escape' })).toBeNull();
      expect(resolveKeyboardAction({ key: 'Enter' })).toBeNull();
    });
  });

  describe('isActionAllowed - State Gating', () => {
    const idleOptions = {
      isIdle: true,
      isAnimating: false,
      stagedMove: null,
      canUndo: true,
      canRedo: true,
    };

    it('allows move, undo, and redo in IDLE state', () => {
      expect(isActionAllowed({ type: 'MOVE', move: { face: 'U', direction: 'CW' } }, idleOptions)).toBe(true);
      expect(isActionAllowed({ type: 'UNDO' }, idleOptions)).toBe(true);
      expect(isActionAllowed({ type: 'REDO' }, idleOptions)).toBe(true);
    });

    it('rejects all actions during active animation', () => {
      const animatingOptions = { ...idleOptions, isAnimating: true, isIdle: false };
      expect(isActionAllowed({ type: 'MOVE', move: { face: 'U', direction: 'CW' } }, animatingOptions)).toBe(false);
      expect(isActionAllowed({ type: 'UNDO' }, animatingOptions)).toBe(false);
      expect(isActionAllowed({ type: 'REDO' }, animatingOptions)).toBe(false);
    });

    it('respects canUndo and canRedo boundaries', () => {
      expect(isActionAllowed({ type: 'UNDO' }, { ...idleOptions, canUndo: false })).toBe(false);
      expect(isActionAllowed({ type: 'REDO' }, { ...idleOptions, canRedo: false })).toBe(false);
    });

    it('handles HALF_TURN_LOCKED staged state with direction-relative rules', () => {
      const uMove: Move = { face: 'U', direction: 'CW' };
      const stagedUPlus = {
        move: uMove,
        phase: 'HALF_TURN_LOCKED',
      } as unknown as StagedMoveSession;

      const halfTurnOptions = {
        isIdle: false,
        isAnimating: false,
        stagedMove: stagedUPlus,
        canUndo: true,
        canRedo: true,
      };

      // Staged face (U) in both directions is allowed (same dir = finish, opp dir = cancel)
      expect(isActionAllowed({ type: 'MOVE', move: { face: 'U', direction: 'CW' } }, halfTurnOptions)).toBe(true);
      expect(isActionAllowed({ type: 'MOVE', move: { face: 'U', direction: 'CCW' } }, halfTurnOptions)).toBe(true);

      // Unrelated faces are rejected
      expect(isActionAllowed({ type: 'MOVE', move: { face: 'R', direction: 'CW' } }, halfTurnOptions)).toBe(false);
      expect(isActionAllowed({ type: 'MOVE', move: { face: 'F', direction: 'CCW' } }, halfTurnOptions)).toBe(false);

      // History operations are rejected at midpoint
      expect(isActionAllowed({ type: 'UNDO' }, halfTurnOptions)).toBe(false);
      expect(isActionAllowed({ type: 'REDO' }, halfTurnOptions)).toBe(false);
    });

    it('handles HALF_TURN_LOCKED staged CCW state', () => {
      const uCcwMove: Move = { face: 'U', direction: 'CCW' };
      const stagedUMinus = {
        move: uCcwMove,
        phase: 'HALF_TURN_LOCKED',
      } as unknown as StagedMoveSession;

      const halfTurnOptions = {
        isIdle: false,
        isAnimating: false,
        stagedMove: stagedUMinus,
        canUndo: true,
        canRedo: true,
      };

      expect(isActionAllowed({ type: 'MOVE', move: { face: 'U', direction: 'CCW' } }, halfTurnOptions)).toBe(true);
      expect(isActionAllowed({ type: 'MOVE', move: { face: 'U', direction: 'CW' } }, halfTurnOptions)).toBe(true);
      expect(isActionAllowed({ type: 'MOVE', move: { face: 'D', direction: 'CW' } }, halfTurnOptions)).toBe(false);
    });
  });
});