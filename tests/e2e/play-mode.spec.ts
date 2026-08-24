import { test, expect, type Page } from '@playwright/test';

// Helper to attach error listeners
function setupErrorCollectors(page: Page, errors: string[]) {
  page.on('pageerror', (exception) => {
    errors.push(`[PAGE_ERROR] ${exception.message}\n${exception.stack}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`[CONSOLE_ERROR] ${msg.text()}`);
    }
  });
}

test.describe('GearCube Play Mode End-to-End Suite', () => {
  let errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    setupErrorCollectors(page, errors);
    await page.goto('/');
    // Wait for canvas to be mounted
    await expect(page.locator('canvas')).toBeVisible();
  });

  test.afterEach(async () => {
    expect(errors, `Expected 0 unhandled errors, got:\n${errors.join('\n')}`).toEqual([]);
  });

  test('1. E2E_APP_LOAD_FLOW: initial layout and components render cleanly', async ({ page }) => {
    await expect(page.getByText('Face Controls')).toBeVisible();
    await expect(page.getByRole('group', { name: 'History Controls' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Scramble Controls' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Move History Timeline' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');
  });

  test('2. E2E_MOVE_HISTORY_FLOW: two-step move creates exactly one canonical history entry', async ({ page }) => {
    const uCwBtn = page.getByRole('button', { name: /U Clockwise/ });
    await uCwBtn.click();

    // Reached midpoint: no history entries yet
    await expect(page.getByText('HALF-TURN: U CW')).toBeVisible();
    await expect(page.getByRole('button', { name: /Step 1:/ })).toHaveCount(0);

    // Finish the move
    const uFinishBtn = page.getByRole('button', { name: /U CW — Finish 180° turn/ });
    await uFinishBtn.click();

    // Completed: exactly 1 entry in timeline
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toHaveAttribute('aria-current', 'step');
  });

  test('3. E2E_TWO_STEP_MIDPOINT_FLOW: midpoint lock creates zero history entries', async ({ page }) => {
    const uCwBtn = page.getByRole('button', { name: /U Clockwise/ });
    await uCwBtn.click();

    await expect(page.getByText('HALF-TURN: U CW')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');
    await expect(page.getByRole('button', { name: /Step 1:/ })).toHaveCount(0);
  });

  test('4. E2E_TWO_STEP_CANCEL_FLOW: cancelling from midpoint creates zero history entries', async ({ page }) => {
    const uCwBtn = page.getByRole('button', { name: /U Clockwise/ });
    await uCwBtn.click();
    await expect(page.getByText('HALF-TURN: U CW')).toBeVisible();

    const uCancelBtn = page.getByRole('button', { name: /U CCW — Reverse to origin/ });
    await uCancelBtn.click();

    await expect(page.getByText('HALF-TURN: U CW')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Step 1:/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');
  });

  test('5. E2E_TWO_STEP_COMPLETE_FLOW: completing two-step finishes turn and appends history', async ({ page }) => {
    await page.getByRole('button', { name: /U Clockwise/ }).click();
    await expect(page.getByText('HALF-TURN: U CW')).toBeVisible();

    await page.getByRole('button', { name: /U CW — Finish 180° turn/ }).click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();
    await expect(page.getByText('1 / 1')).toBeVisible();
  });

  test('6. E2E_DIRECT_180_COMPLETE_FLOW: direct 180 turn completes in one continuous turn', async ({ page }) => {
    const modeBtn = page.getByRole('button', { name: /Direct 180° turn mode/ });
    await modeBtn.click();
    await expect(page.getByRole('button', { name: 'Direct 180° turn mode: ON' })).toBeVisible();

    const rCwBtn = page.getByRole('button', { name: 'R Clockwise (180° full turn)' });
    await rCwBtn.click();

    await expect(page.getByRole('button', { name: 'Step 1: R+' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Step 1: R+' })).toHaveAttribute('aria-current', 'step');
  });

  test('7. E2E_UNDO_FLOW: undo navigates backward in history', async ({ page }) => {
    // Switch to Direct 180 for quick multi-step setup
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await page.getByRole('button', { name: 'U Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();
    await page.getByRole('button', { name: 'R Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toBeVisible();

    const undoBtn = page.getByRole('button', { name: 'Undo move' });
    await undoBtn.click();

    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toHaveAttribute('aria-current', 'step');
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).not.toHaveAttribute('aria-current', 'step');
  });

  test('8. E2E_REDO_FLOW: redo navigates forward in history', async ({ page }) => {
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await page.getByRole('button', { name: 'U Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();

    await page.getByRole('button', { name: 'Undo move' }).click();
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');

    const redoBtn = page.getByRole('button', { name: 'Redo move' });
    await redoBtn.click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toHaveAttribute('aria-current', 'step');
  });

  test('9. E2E_REDO_TRUNCATION_FLOW: move after undo truncates future redo entries', async ({ page }) => {
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await page.getByRole('button', { name: 'U Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();
    await page.getByRole('button', { name: 'R Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toBeVisible();
    await page.getByRole('button', { name: 'F Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 3: F+' })).toBeVisible();

    // Undo twice -> at step 1 (U+)
    await page.getByRole('button', { name: 'Undo move' }).click();
    await page.getByRole('button', { name: 'Undo move' }).click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toHaveAttribute('aria-current', 'step');

    // Make new move D+
    await page.getByRole('button', { name: 'D Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 2: D+' })).toBeVisible();

    // Old Step 3 should no longer exist
    await expect(page.getByRole('button', { name: /Step 3:/ })).toHaveCount(0);
    // Redo should be disabled
    await expect(page.getByRole('button', { name: 'Redo move' })).toBeDisabled();
  });

  test('10. E2E_ARBITRARY_SCRUB_FLOW: clicking any timeline chip restores exact snapshot', async ({ page }) => {
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await page.getByRole('button', { name: 'U Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();
    await page.getByRole('button', { name: 'R Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toBeVisible();
    await page.getByRole('button', { name: 'F Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 3: F+' })).toBeVisible();

    // Scrub to baseline
    await page.getByRole('button', { name: 'Timeline start baseline' }).click();
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');

    // Scrub to step 2
    await page.getByRole('button', { name: 'Step 2: R+' }).click();
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toHaveAttribute('aria-current', 'step');

    // Scrub to step 3
    await page.getByRole('button', { name: 'Step 3: F+' }).click();
    await expect(page.getByRole('button', { name: 'Step 3: F+' })).toHaveAttribute('aria-current', 'step');
  });

  test('11. E2E_RESET_BASELINE_FLOW: back to baseline preserves future redo entries', async ({ page }) => {
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await page.getByRole('button', { name: 'U Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();
    await page.getByRole('button', { name: 'R Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toBeVisible();

    // Click Back to baseline
    await page.getByRole('button', { name: 'Back to baseline' }).click();
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');

    // Redo should be enabled and both chips still visible
    await expect(page.getByRole('button', { name: 'Redo move' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toBeVisible();
  });

  test('12. E2E_SEEDED_SCRAMBLE_FLOW: seed generates reproducible scramble and resets baseline', async ({ page }) => {
    const seedInput = page.getByLabel('Scramble seed');
    await seedInput.fill('abc');

    // Check preview
    await expect(page.getByText(/B\+ U\+ L\+ R\+ F- L\+/)).toBeVisible();

    // Apply scramble
    await page.getByRole('button', { name: 'Generate scramble' }).click();

    // History is reset to 0 entries (only baseline exists)
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');
    await expect(page.getByRole('button', { name: /Step 1:/ })).toHaveCount(0);
    await expect(page.getByText('0 / 0')).toBeVisible();
  });

  test('13. E2E_KEYBOARD_MOVE_FLOW: u and Shift+u trigger moves, unsupported modifiers rejected', async ({ page }) => {
    // Focus canvas/body
    await page.locator('body').click();

    // Press 'u' -> first step of TWO_STEP
    await page.keyboard.press('u');
    await expect(page.getByText('HALF-TURN: U CW')).toBeVisible();
    await expect(page.getByRole('button', { name: /U CW — Finish 180° turn/ })).toBeEnabled();

    // Press 'u' -> finish step
    await page.keyboard.press('u');
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();

    // Press 'Shift+u' -> first step of U CCW
    await page.keyboard.press('Shift+u');
    await expect(page.getByText('HALF-TURN: U CCW')).toBeVisible();
    await expect(page.getByRole('button', { name: /U CCW — Finish 180° turn/ })).toBeEnabled();

    // Press 'Shift+u' -> finish step
    await page.keyboard.press('Shift+u');
    await expect(page.getByRole('button', { name: 'Step 2: U-' })).toBeVisible();

    // Test unsupported modifiers (Control+u, Alt+u) - should not trigger actions
    await page.keyboard.press('Control+u');
    await page.keyboard.press('Alt+u');
    await expect(page.getByRole('button', { name: /Step 3:/ })).toHaveCount(0);
  });

  test('14. E2E_KEYBOARD_UNDO_FLOW: Ctrl+Z / Cmd+Z triggers undo', async ({ page }) => {
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await page.getByRole('button', { name: 'U Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();

    await page.locator('body').click();
    await page.keyboard.press('Control+z');
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');
  });

  test('15. E2E_KEYBOARD_REDO_FLOW: Ctrl+Shift+Z and Ctrl+Y trigger redo, Cmd+Y rejected', async ({ page }) => {
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await page.getByRole('button', { name: 'U Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();

    await page.getByRole('button', { name: 'Undo move' }).click();
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');

    await page.locator('body').click();
    await page.keyboard.press('Control+Shift+z');
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toHaveAttribute('aria-current', 'step');

    // Undo again and test Ctrl+Y
    await page.getByRole('button', { name: 'Undo move' }).click();
    await page.locator('body').click();
    await page.keyboard.press('Control+y');
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toHaveAttribute('aria-current', 'step');

    // Test Cmd+Y (Meta+y) does not trigger action
    await page.getByRole('button', { name: 'Undo move' }).click();
    await page.locator('body').click();
    await page.keyboard.press('Meta+y');
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');
  });

  test('16. E2E_INPUT_FOCUS_EXCLUSION_FLOW: typing in seed input does not trigger puzzle moves', async ({ page }) => {
    const seedInput = page.getByLabel('Scramble seed');
    await seedInput.click();
    await seedInput.fill('');
    await seedInput.pressSequentially('urzyu');

    await expect(seedInput).toHaveValue('urzyu');
    // Ensure no moves were created
    await expect(page.getByRole('button', { name: /Step 1:/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');
  });

  test('17. E2E_BUSY_STATE_BLOCKING_FLOW: selective midpoint enablement and busy state blocking', async ({ page }) => {
    // Start U CW move in TWO_STEP mode
    await page.getByRole('button', { name: /U Clockwise/ }).click();
    await expect(page.getByText('HALF-TURN: U CW')).toBeVisible();

    // At HALF_TURN_LOCKED:
    // Staged face buttons (U CW and U CCW) remain enabled
    await expect(page.getByRole('button', { name: /U CW — Finish 180° turn/ })).toBeEnabled();
    await expect(page.getByRole('button', { name: /U CCW — Reverse to origin/ })).toBeEnabled();

    // Other 5 face buttons (D, F, B, R, L) are disabled
    await expect(page.getByRole('button', { name: /D Clockwise/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /F Clockwise/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /B Clockwise/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /R Clockwise/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: /L Clockwise/ })).toBeDisabled();

    // Mode toggle, Undo, Redo, Back to baseline, Timeline chips, Scramble button are disabled
    await expect(page.getByRole('button', { name: /Direct 180° turn mode/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Undo move' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Redo move' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Back to baseline' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Generate scramble' })).toBeDisabled();

    // Seed input remains editable
    await expect(page.getByLabel('Scramble seed')).toBeEnabled();
  });

  test('18. E2E_RESPONSIVE_LAYOUT_FLOW: desktop, tablet, and mobile layouts fit with zero overflow', async ({ page }) => {
    const viewports = [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);

      // Verify no horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow, `Viewport ${vp.width}x${vp.height} had horizontal document overflow`).toBe(false);

      // Verify primary controls remain visible and clickable
      await expect(page.getByText('Face Controls')).toBeVisible();
      await expect(page.getByRole('button', { name: /U Clockwise/ })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toBeVisible();
      await expect(page.getByRole('group', { name: 'History Controls' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Scramble Controls' })).toBeVisible();
    }
  });

  test('19. E2E_CONSOLE_ERROR_GATE: verified zero unhandled errors', async () => {
    expect(errors).toEqual([]);
  });
});