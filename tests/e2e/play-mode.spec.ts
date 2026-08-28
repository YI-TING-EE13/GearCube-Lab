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

// Pure rectangle overlap helper
function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  const aRight = a.x + a.width;
  const aBottom = a.y + a.height;
  const bRight = b.x + b.width;
  const bBottom = b.y + b.height;
  return !(aRight <= b.x || bRight <= a.x || aBottom <= b.y || bBottom <= a.y);
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

  test('12. E2E_SEEDED_SCRAMBLE_FLOW: seed generates reproducible scramble and resets baseline while preserving mode', async ({ page }) => {
    // Switch to Direct 180 mode prior to scramble
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await expect(page.getByRole('button', { name: 'Direct 180° turn mode: ON' })).toBeVisible();

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

    // Mode is preserved
    await expect(page.getByRole('button', { name: 'Direct 180° turn mode: ON' })).toBeVisible();
  });

  test('13. E2E_KEYBOARD_MOVE_FLOW: u, Shift+u, midpoint cancel, and modifier rejection', async ({ page }) => {
    // Focus canvas/body
    await page.locator('body').click();

    // Test direction-relative midpoint cancellation
    await page.keyboard.press('u');
    await expect(page.getByText('HALF-TURN: U CW')).toBeVisible();
    await expect(page.getByRole('button', { name: /U CW — Finish 180° turn/ })).toBeEnabled();

    // Opposite direction (Shift+u) cancels turn back to baseline
    await page.keyboard.press('Shift+u');
    await expect(page.getByText('HALF-TURN: U CW')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Step 1:/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');
    await expect(page.getByRole('button', { name: /U Clockwise/ })).toBeEnabled();
    await expect(page.getByText('Turning')).toHaveCount(0);

    // Press 'u' -> first step of TWO_STEP
    await page.keyboard.press('u');
    await expect(page.getByText('HALF-TURN: U CW')).toBeVisible();
    await expect(page.getByRole('button', { name: /U CW — Finish 180° turn/ })).toBeEnabled();

    // Press 'u' -> finish step
    await page.keyboard.press('u');
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();
    await expect(page.getByText('Turning')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /U Counter-Clockwise/ })).toBeEnabled();

    // Press 'Shift+u' -> first step of U CCW
    await page.keyboard.press('Shift+u');
    await expect(page.getByText('HALF-TURN: U CCW')).toBeVisible();
    await expect(page.getByRole('button', { name: /U CCW — Finish 180° turn/ })).toBeEnabled();

    // Press 'Shift+u' -> finish step
    await page.keyboard.press('Shift+u');
    await expect(page.getByRole('button', { name: 'Step 2: U-' })).toBeVisible();
    await expect(page.getByText('Turning')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /U Clockwise/ })).toBeEnabled();

    // Test unsupported modifiers (Control+u, Meta+u, Alt+u) - should not trigger actions
    await page.keyboard.press('Control+u');
    await page.keyboard.press('Meta+u');
    await page.keyboard.press('Alt+u');
    await expect(page.getByRole('button', { name: /Step 3:/ })).toHaveCount(0);
    await expect(page.getByText('2 / 2')).toBeVisible();
  });

  test('14. E2E_KEYBOARD_UNDO_FLOW: Control+Z and Meta+Z both trigger undo when actionable', async ({ page }) => {
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await page.getByRole('button', { name: 'U Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();
    await page.getByRole('button', { name: 'R Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toBeVisible();

    await page.locator('body').click();
    // Test Control+z -> Undo from step 2 to step 1
    await page.keyboard.press('Control+z');
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toHaveAttribute('aria-current', 'step');

    // Test Meta+z -> Undo from step 1 to baseline
    await page.keyboard.press('Meta+z');
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');
  });

  test('15. E2E_KEYBOARD_REDO_FLOW: Control+Shift+Z, Meta+Shift+Z, Control+Y trigger redo, Meta+Y rejected', async ({ page }) => {
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await page.getByRole('button', { name: 'U Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();
    await page.getByRole('button', { name: 'R Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toBeVisible();
    await page.getByRole('button', { name: 'F Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 3: F+' })).toBeVisible();

    // Reset to baseline so 3 redo steps are available
    await page.getByRole('button', { name: 'Back to baseline' }).click();
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');

    await page.locator('body').click();

    // Meta+y should be rejected / produce no redo action
    await page.keyboard.press('Meta+y');
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');

    // Control+Shift+z -> redo step 1 (U+)
    await page.keyboard.press('Control+Shift+z');
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toHaveAttribute('aria-current', 'step');

    // Meta+Shift+z -> redo step 2 (R+)
    await page.keyboard.press('Meta+Shift+z');
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toHaveAttribute('aria-current', 'step');

    // Control+y -> redo step 3 (F+)
    await page.keyboard.press('Control+y');
    await expect(page.getByRole('button', { name: 'Step 3: F+' })).toHaveAttribute('aria-current', 'step');
  });

  test('16. E2E_INPUT_FOCUS_EXCLUSION_FLOW: typing and history shortcuts in focused seed input do not trigger puzzle moves', async ({ page }) => {
    // Create an initial history move
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await page.getByRole('button', { name: 'U Clockwise (180° full turn)' }).click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toHaveAttribute('aria-current', 'step');

    // Focus scramble seed input
    const seedInput = page.getByLabel('Scramble seed');
    await seedInput.click();
    await seedInput.fill('');
    await seedInput.pressSequentially('ur');

    // Verify seed input contains 'ur' and no moves were created
    await expect(seedInput).toHaveValue('ur');
    await expect(page.getByRole('button', { name: /Step 2:/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toHaveAttribute('aria-current', 'step');

    // Press Control+z and Meta+z while seed input is focused -> puzzle history must not undo
    await page.keyboard.press('Control+z');
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toHaveAttribute('aria-current', 'step');

    await page.keyboard.press('Meta+z');
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toHaveAttribute('aria-current', 'step');

    // Additional typing letters
    await seedInput.pressSequentially('zy');
    await expect(page.getByRole('button', { name: /Step 2:/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toHaveAttribute('aria-current', 'step');
  });

  test('17. E2E_BUSY_STATE_BLOCKING_FLOW: active animation blocking, selective midpoint enablement, and seed edit', async ({ page }) => {
    // 1. ACTIVE_ANIMATION_BUSY_GATE: in Direct 180 mode, trigger 400ms animation
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await expect(page.getByRole('button', { name: 'Direct 180° turn mode: ON' })).toBeVisible();

    const rCwBtn = page.getByRole('button', { name: 'R Clockwise (180° full turn)' });
    await rCwBtn.click();

    // Verify observable active animation indicator
    const turningIndicator = page.getByText('Turning (180°)...');
    await expect(turningIndicator).toBeVisible();

    // While turning indicator is visible, verify all controls are disabled concurrently
    const allMoveButtons = page.locator('.move-btn');
    await Promise.all([
      expect(page.getByRole('button', { name: /Direct 180° turn mode/ })).toBeDisabled(),
      expect(page.getByRole('button', { name: 'Undo move' })).toBeDisabled(),
      expect(page.getByRole('button', { name: 'Redo move' })).toBeDisabled(),
      expect(page.getByRole('button', { name: 'Back to baseline' })).toBeDisabled(),
      expect(page.getByRole('button', { name: 'Generate scramble' })).toBeDisabled(),
      ...Array.from({ length: 12 }, (_, i) => expect(allMoveButtons.nth(i)).toBeDisabled()),
    ]);

    // Settle to IDLE
    await expect(page.getByRole('button', { name: 'Step 1: R+' })).toBeVisible();
    await expect(turningIndicator).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Direct 180° turn mode/ })).toBeEnabled();

    // 2. MIDPOINT_SELECTIVE_GATE: switch back to TWO_STEP mode
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await expect(page.getByRole('button', { name: 'Direct 180° turn mode: OFF' })).toBeVisible();

    // In TWO_STEP mode, click U CW
    const uCwBtn = page.getByRole('button', { name: /U Clockwise/ });
    await uCwBtn.click();

    // At HALF_TURN_LOCKED:
    await expect(page.getByText('HALF-TURN: U CW')).toBeVisible();

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

    // Seed input remains editable at midpoint
    const seedInput = page.getByLabel('Scramble seed');
    await expect(seedInput).toBeEnabled();
    await seedInput.fill('locked-seed-edit');
    await expect(seedInput).toHaveValue('locked-seed-edit');

    // Finish the move
    const finishBtn = page.getByRole('button', { name: /U CW — Finish 180° turn/ });
    await finishBtn.click();
    await expect(page.getByRole('button', { name: 'Step 2: U+' })).toBeVisible();
  });

  test('18. E2E_RESPONSIVE_LAYOUT_FLOW: desktop, tablet, and mobile layouts fit, bounds checked, zero overlap', async ({ page }) => {
    const viewports = [
      { name: 'Desktop', width: 1440, height: 900 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Mobile Standard', width: 375, height: 667 },
      { name: 'Mobile Tall', width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // A. Verify no horizontal document overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow, `Viewport ${vp.name} (${vp.width}x${vp.height}) had horizontal document overflow`).toBe(false);

      // B. Bounding box checks
      const historyPanel = page.getByRole('group', { name: 'History Controls' });
      const scramblePanel = page.getByRole('region', { name: 'Scramble Controls' });
      const movePanel = page.locator('.move-controls-panel');
      const timelinePanel = page.getByRole('region', { name: 'Move History Timeline' });

      const historyBox = await historyPanel.boundingBox();
      const scrambleBox = await scramblePanel.boundingBox();
      const moveBox = await movePanel.boundingBox();
      const timelineBox = await timelinePanel.boundingBox();

      expect(historyBox, `historyBox on ${vp.name}`).not.toBeNull();
      expect(scrambleBox, `scrambleBox on ${vp.name}`).not.toBeNull();
      expect(moveBox, `moveBox on ${vp.name}`).not.toBeNull();
      expect(timelineBox, `timelineBox on ${vp.name}`).not.toBeNull();

      if (historyBox && scrambleBox && moveBox && timelineBox) {
        // Verify all panels are within viewport bounds
        expect(historyBox.x).toBeGreaterThanOrEqual(0);
        expect(historyBox.y).toBeGreaterThanOrEqual(0);
        expect(scrambleBox.x + scrambleBox.width).toBeLessThanOrEqual(vp.width + 1);
        expect(moveBox.y + moveBox.height).toBeLessThanOrEqual(vp.height + 1);
        expect(timelineBox.x).toBeGreaterThanOrEqual(0);

        // C. Collision gates using rectsOverlap helper
        if (vp.width > 900) {
          // Desktop: Top panels do not collide; bottom panels do not collide
          expect(rectsOverlap(historyBox, scrambleBox), `History and Scramble must not overlap on ${vp.name}`).toBe(false);
          expect(rectsOverlap(timelineBox, moveBox), `Timeline and Move controls must not overlap on ${vp.name}`).toBe(false);
        } else if (vp.width >= 641 && vp.width <= 900) {
          // Tablet Portrait: Timeline scrubber is elevated above MoveControls panel
          expect(rectsOverlap(timelineBox, moveBox), `Timeline scrubber and Move controls must not overlap on ${vp.name}`).toBe(false);
        } else if (vp.width <= 640) {
          // Mobile: Timeline scrubber is elevated above MoveControls panel (no vertical overlap)
          expect(rectsOverlap(timelineBox, moveBox), `Timeline scrubber and Move controls must not overlap on ${vp.name}`).toBe(false);
        }
      }

      // D. Actionability checks via trial clicks / interactions
      await page.getByRole('button', { name: /U Clockwise/ }).click({ trial: true });
      await page.getByRole('button', { name: /Direct 180° turn mode/ }).click({ trial: true });
      await page.getByRole('button', { name: 'Generate scramble' }).click({ trial: true });
      await page.getByRole('button', { name: 'Timeline start baseline' }).click({ trial: true });

      // E. Mobile HALF_TURN_LOCKED responsive gate
      if (vp.width <= 640) {
        // Enter half-turn locked state
        await page.getByRole('button', { name: /U Clockwise/ }).click();
        await expect(page.getByText('HALF-TURN: U CW')).toBeVisible();

        const lockedMoveBox = await movePanel.boundingBox();
        const lockedTimelineBox = await timelinePanel.boundingBox();
        expect(lockedMoveBox).not.toBeNull();
        expect(lockedTimelineBox).not.toBeNull();

        if (lockedMoveBox && lockedTimelineBox) {
          // Verify scrubber and move controls do NOT overlap in half-turn locked state
          expect(
            rectsOverlap(lockedTimelineBox, lockedMoveBox),
            `Timeline scrubber and Move controls must not overlap in HALF_TURN_LOCKED on ${vp.name}`
          ).toBe(false);
        }

        // Cancel back to baseline
        await page.getByRole('button', { name: /U CCW — Reverse to origin/ }).click();
        await expect(page.getByText('HALF-TURN: U CW')).toHaveCount(0);
        await expect(page.getByRole('button', { name: /U Clockwise/ })).toBeEnabled();
        await expect(page.getByText('Turning')).toHaveCount(0);
      }
    }
  });

  test('19. E2E_CONSOLE_ERROR_GATE: verified zero unhandled errors', async () => {
    expect(errors).toEqual([]);
  });
});