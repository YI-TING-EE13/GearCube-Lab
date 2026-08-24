/**
 * @file history-ui.test.tsx
 * @description Presentational component structure and accessibility tests using standard React DOM server rendering.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HistoryControls } from './HistoryControls.js';
import { TimelineScrubber } from './TimelineScrubber.js';
import { ScramblePanel } from './ScramblePanel.js';
import type { HistoryEntry } from './history.js';
import { SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME } from '@gearcube/core';

function getElementHtml(html: string, ariaLabel: string): string {
  const target = `aria-label="${ariaLabel}"`;
  const idx = html.indexOf(target);
  if (idx === -1) return '';
  const startTag = html.lastIndexOf('<', idx);
  const endTag = html.indexOf('>', idx);
  if (startTag === -1 || endTag === -1) return '';
  return html.substring(startTag, endTag + 1);
}

describe('History and Scramble UI Components (Static Structure & Accessibility)', () => {
  describe('HistoryControls', () => {
    it('renders all control buttons and applies enabled/disabled attributes correctly', () => {
      // 1. Idle state with undo available but not redo
      const htmlIdle = renderToStaticMarkup(
        <HistoryControls
          canUndo={true}
          canRedo={false}
          canResetBaseline={true}
          isBusy={false}
          onUndo={() => {}}
          onRedo={() => {}}
          onResetBaseline={() => {}}
        />
      );

      expect(htmlIdle).toContain('Undo');
      expect(htmlIdle).toContain('Redo');
      expect(htmlIdle).toContain('Back to baseline');

      const undoBtn = getElementHtml(htmlIdle, 'Undo move');
      const redoBtn = getElementHtml(htmlIdle, 'Redo move');
      const baselineBtn = getElementHtml(htmlIdle, 'Back to baseline');

      expect(undoBtn).not.toContain('disabled');
      expect(redoBtn).toContain('disabled');
      expect(baselineBtn).not.toContain('disabled');

      // 2. Busy state: all buttons disabled
      const htmlBusy = renderToStaticMarkup(
        <HistoryControls
          canUndo={true}
          canRedo={true}
          canResetBaseline={true}
          isBusy={true}
          onUndo={() => {}}
          onRedo={() => {}}
          onResetBaseline={() => {}}
        />
      );

      expect(getElementHtml(htmlBusy, 'Undo move')).toContain('disabled');
      expect(getElementHtml(htmlBusy, 'Redo move')).toContain('disabled');
      expect(getElementHtml(htmlBusy, 'Back to baseline')).toContain('disabled');
    });
  });

  describe('TimelineScrubber', () => {
    const mockEntries: HistoryEntry[] = [
      {
        move: { face: 'U', direction: 'CW' },
        resultingState: SOLVED_GEAR_CUBE_STATE,
        resultingFrame: DEFAULT_SPATIAL_FRAME,
        notation: 'U+',
      },
      {
        move: { face: 'R', direction: 'CCW' },
        resultingState: SOLVED_GEAR_CUBE_STATE,
        resultingFrame: DEFAULT_SPATIAL_FRAME,
        notation: 'R-',
      },
    ];

    it('renders baseline chip, entry chips, and active cursor step indicator', () => {
      // Cursor at step 0 (U+)
      const html = renderToStaticMarkup(
        <TimelineScrubber
          entries={mockEntries}
          cursorIndex={0}
          isBusy={false}
          onScrub={() => {}}
        />
      );

      expect(html).toContain('Move History');
      expect(html).toContain('1 / 2');
      expect(html).toContain('Baseline');
      expect(html).toContain('U+');
      expect(html).toContain('R-');
      expect(html).toContain('aria-label="Step 1: U+"');
      expect(html).toContain('aria-label="Step 2: R-"');

      // Step 1 is active (cursorIndex === 0)
      const chipStep1 = getElementHtml(html, 'Step 1: U+');
      expect(chipStep1).toContain('aria-current="step"');
      expect(chipStep1).toContain('timeline-chip-active');

      const baselineChip = getElementHtml(html, 'Timeline start baseline');
      expect(baselineChip).not.toContain('timeline-chip-active');
    });

    it('disables scrub buttons when isBusy is true', () => {
      const html = renderToStaticMarkup(
        <TimelineScrubber
          entries={mockEntries}
          cursorIndex={-1}
          isBusy={true}
          onScrub={() => {}}
        />
      );

      expect(getElementHtml(html, 'Timeline start baseline')).toContain('disabled');
      expect(getElementHtml(html, 'Step 1: U+')).toContain('disabled');
      expect(getElementHtml(html, 'Step 2: R-')).toContain('disabled');
    });
  });

  describe('ScramblePanel', () => {
    it('renders seed input, scramble button, and deterministic preview', () => {
      const html = renderToStaticMarkup(
        <ScramblePanel
          seed="abc"
          isBusy={false}
          onSeedChange={() => {}}
          onScramble={() => {}}
        />
      );

      expect(html).toContain('Deterministic Scramble');
      expect(html).toContain('value="abc"');
      expect(html).toContain('Scramble');
      expect(html).toContain('B+ U+ L+ R+ F- L+... (20 moves)');

      const scrambleBtn = getElementHtml(html, 'Generate scramble');
      expect(scrambleBtn).not.toContain('disabled');
    });

    it('disables input and scramble button when isBusy is true', () => {
      const html = renderToStaticMarkup(
        <ScramblePanel
          seed="test"
          isBusy={true}
          onSeedChange={() => {}}
          onScramble={() => {}}
        />
      );

      expect(getElementHtml(html, 'Scramble seed')).toContain('disabled');
      expect(getElementHtml(html, 'Generate scramble')).toContain('disabled');
    });
  });
});
