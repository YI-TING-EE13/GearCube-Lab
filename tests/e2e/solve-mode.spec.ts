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

// Bounding rectangle overlap detection
function rectsOverlap(
  r1: { x: number; y: number; width: number; height: number },
  r2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    r1.x + r1.width <= r2.x ||
    r2.x + r2.width <= r1.x ||
    r1.y + r1.height <= r2.y ||
    r2.y + r2.height <= r1.y
  );
}

test.describe('GearCube Solve Mode & Playback End-to-End Suite', () => {
  let errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    setupErrorCollectors(page, errors);
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
  });

  test.afterEach(async () => {
    expect(errors, `Expected 0 unhandled errors, got:\n${errors.join('\n')}`).toEqual([]);
  });

  test('1. E2E_SOLVE_UI_FLOW: solver controls render with default algorithm IDA* and clean initial state', async ({ page }) => {
    const solverRegion = page.getByRole('region', { name: 'Solver Controls' });
    await expect(solverRegion).toBeVisible();

    const algoSelect = page.getByLabel('Solver Algorithm');
    await expect(algoSelect).toBeVisible();
    await expect(algoSelect).toHaveValue('IDA_STAR');

    const solveBtn = page.getByRole('button', { name: 'Solve current state' });
    await expect(solveBtn).toBeVisible();
    await expect(solveBtn).toBeEnabled();

    // Initial cube status
    await expect(page.getByTestId('cube-status')).toHaveText('Cube: Solved');

    // Playback controls should not be visible before a solve with moves
    await expect(page.getByTestId('playback-controls')).toBeHidden();
  });

  test('2. WORKER_EXECUTION_GATE: real Worker created and executes solver in Worker thread producing solution', async ({ page }) => {
    const workerPromise = page.waitForEvent('worker');

    // Scramble the cube to create an unsolved state
    await page.getByRole('button', { name: 'Generate scramble' }).click();
    await expect(page.getByTestId('cube-status')).toHaveText('Cube: Unsolved');

    // Select BFS algorithm to ensure observable search lifecycle
    await page.getByLabel('Solver Algorithm').selectOption('BFS');

    // Click Solve
    await page.getByRole('button', { name: 'Solve current state' }).click();

    // Capture the real browser Web Worker and verify worker script URL
    const worker = await workerPromise;
    expect(worker.url()).toContain('solver.worker');

    // Wait for solve completion
    await expect(page.getByTestId('solver-solution-summary')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('solver-status')).toContainText('Solved');

    // Playback controls should appear
    await expect(page.getByTestId('playback-controls')).toBeVisible();
    await expect(page.getByTestId('playback-progress')).toContainText('0 /');
  });

  test('3. MAIN_THREAD_ACTIONABILITY_GATE: main-thread UI interactions remain responsive while solver search is active', async ({ page }) => {
    // 1. Create a non-trivial distance state in DIRECT_180 mode with 6 alternating moves
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await page.getByRole('button', { name: /^U Clockwise/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^R Clockwise/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^F Clockwise/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^D Clockwise/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^L Clockwise/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /^B Clockwise/ }).click();
    await page.waitForTimeout(300);

    // Switch mode back to TWO_STEP (OFF)
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await expect(page.getByRole('button', { name: 'Direct 180° turn mode: OFF' })).toBeVisible();

    // Select BFS algorithm
    await page.getByLabel('Solver Algorithm').selectOption('BFS');

    // Arm worker listener before starting search
    const workerPromise = page.waitForEvent('worker');

    // Install test-owned page-side actionability observer to deterministically interact during active search
    await page.evaluate(() => {
      document.documentElement.removeAttribute('data-e2e-solver-actionability');

      const checkAndInteract = () => {
        const statusEl = document.querySelector('[data-testid="solver-status"]');
        const statusText = statusEl?.textContent || '';
        const isSearching = statusText.includes('Searching');

        const modeBtn = document.querySelector(
          'button[aria-label="Direct 180° turn mode: OFF"]'
        ) as HTMLButtonElement | null;

        if (isSearching && modeBtn && !modeBtn.disabled) {
          observer.disconnect();

          modeBtn.addEventListener(
            'click',
            () => {
              const currentStatus =
                document.querySelector('[data-testid="solver-status"]')
                  ?.textContent || '';
              if (currentStatus.includes('Searching')) {
                document.documentElement.setAttribute(
                  'data-e2e-solver-actionability',
                  'searching-click-processed'
                );
              }
            },
            { once: true }
          );

          modeBtn.click();
        }
      };

      const observer = new MutationObserver(() => {
        checkAndInteract();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
      });

      checkAndInteract();
    });

    // Start search via real Playwright pointer click
    await page.getByRole('button', { name: 'Solve current state' }).click();

    // Capture the real solver Worker and verify the dedicated solver script URL
    const worker = await workerPromise;
    expect(worker.url()).toContain('solver.worker');

    // Verify main-thread click was processed while Solver status was actively Searching
    await expect(page.locator('html')).toHaveAttribute(
      'data-e2e-solver-actionability',
      'searching-click-processed',
      { timeout: 10000 }
    );

    // Verify production UI mode changed to ON
    await expect(
      page.getByRole('button', { name: 'Direct 180° turn mode: ON' })
    ).toBeVisible();

    // Wait for search to finish
    await expect(page.getByTestId('solver-status')).toContainText('Solved', {
      timeout: 25000,
    });
  });

  test('4. STALE_RESULT_GATE: external canonical user action cancels active search and rejects stale solution', async ({ page }) => {
    // 1. Create deterministic non-solved state
    await page.getByLabel('Scramble seed').fill('abc');
    await page.getByRole('button', { name: 'Generate scramble' }).click();
    await expect(page.getByTestId('cube-status')).toHaveText('Cube: Unsolved');

    // 2. Select BFS algorithm
    await page.getByLabel('Solver Algorithm').selectOption('BFS');

    // 3. Start solve
    await page.getByRole('button', { name: 'Solve current state' }).click();

    // 4. REQUIRE solver status Searching... / ACTIVE
    await expect(page.getByTestId('solver-status')).toContainText('Searching...');
    await expect(page.getByRole('button', { name: 'Cancel Search' })).toBeVisible();

    // 5. While ACTIVE, perform external canonical action which cancels search
    await page.getByRole('button', { name: 'Generate scramble' }).click();

    // 8. Verify solver returns to Idle
    await expect(page.getByTestId('solver-status')).toContainText('Idle');

    // 9. Verify no Solution Playback is installed
    await expect(page.getByTestId('playback-controls')).toBeHidden();

    // 10. Allow event-loop settling and confirm no stale playback appears
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('solver-status')).toContainText('Idle');
    await expect(page.getByTestId('playback-controls')).toBeHidden();
  });

  test('5. DIRECT_180_PLAYBACK_GATE: solves and plays back solution in DIRECT_180 mode committing exactly 1 history entry per move', async ({ page }) => {
    // Switch to DIRECT_180 mode
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();
    await expect(page.getByRole('button', { name: 'Direct 180° turn mode: ON' })).toBeVisible();

    // Scramble cube
    await page.getByRole('button', { name: 'Generate scramble' }).click();
    await expect(page.getByTestId('cube-status')).toHaveText('Cube: Unsolved');

    // Solve with IDA*
    await page.getByRole('button', { name: 'Solve current state' }).click();
    await expect(page.getByTestId('solver-status')).toContainText('Solved', { timeout: 15000 });

    // Read solution depth N from summary text
    const summaryText = await page.getByTestId('solver-solution-summary').textContent();
    const match = summaryText?.match(/Solution Depth:\s*(\d+)/);
    expect(match).not.toBeNull();
    const solutionDepth = parseInt(match![1]!, 10);
    expect(solutionDepth).toBeGreaterThan(0);

    // Initial timeline should only have baseline chip
    const timelineButtons = page.getByRole('region', { name: 'Move History Timeline' }).getByRole('button');
    await expect(timelineButtons).toHaveCount(1); // Only baseline

    // Click Play
    await page.getByRole('button', { name: 'Play solution' }).click();

    // Wait for playback to complete
    await expect(page.getByTestId('playback-progress')).toHaveText(`${solutionDepth} / ${solutionDepth}`, { timeout: 35000 });
    await expect(page.getByTestId('cube-status')).toHaveText('Cube: Solved');

    // Verify exactly solutionDepth history entries were committed
    await expect(timelineButtons).toHaveCount(1 + solutionDepth);
  });

  test('6. TWO_STEP_PLAYBACK_GATE: solves and plays back solution in TWO_STEP mode committing exactly 1 history entry per move', async ({ page }) => {
    // Ensure TWO_STEP mode
    await expect(page.getByRole('button', { name: 'Direct 180° turn mode: OFF' })).toBeVisible();

    // Scramble cube
    await page.getByRole('button', { name: 'Generate scramble' }).click();
    await expect(page.getByTestId('cube-status')).toHaveText('Cube: Unsolved');

    // Solve with IDA*
    await page.getByRole('button', { name: 'Solve current state' }).click();
    await expect(page.getByTestId('solver-status')).toContainText('Solved', { timeout: 15000 });

    const summaryText = await page.getByTestId('solver-solution-summary').textContent();
    const match = summaryText?.match(/Solution Depth:\s*(\d+)/);
    const solutionDepth = parseInt(match![1]!, 10);
    expect(solutionDepth).toBeGreaterThan(0);

    const timelineButtons = page.getByRole('region', { name: 'Move History Timeline' }).getByRole('button');
    await expect(timelineButtons).toHaveCount(1);

    // Click Play
    await page.getByRole('button', { name: 'Play solution' }).click();

    // Wait for playback to complete
    await expect(page.getByTestId('playback-progress')).toHaveText(`${solutionDepth} / ${solutionDepth}`, { timeout: 40000 });
    await expect(page.getByTestId('cube-status')).toHaveText('Cube: Solved');

    // History count must be exactly 1 + solutionDepth, not 1 + 2*solutionDepth
    await expect(timelineButtons).toHaveCount(1 + solutionDepth);
  });

  test('7. PLAYBACK_PAUSE_BOUNDARY_GATE: pausing during TWO_STEP playback finishes in-flight canonical move to IDLE and stops before next move', async ({ page }) => {
    // 1. Ensure TWO_STEP mode
    await expect(page.getByRole('button', { name: 'Direct 180° turn mode: OFF' })).toBeVisible();

    // 2. Create solution with >= 2 moves
    await page.getByLabel('Scramble seed').fill('test_pause');
    await page.getByRole('button', { name: 'Generate scramble' }).click();

    // 3. Accept solution via IDA*
    await page.getByRole('button', { name: 'Solve current state' }).click();
    await expect(page.getByTestId('solver-status')).toContainText('Solved', { timeout: 15000 });

    const summaryText = await page.getByTestId('solver-solution-summary').textContent();
    const match = summaryText?.match(/Solution Depth:\s*(\d+)/);
    const solutionDepth = parseInt(match![1]!, 10);
    expect(solutionDepth).toBeGreaterThanOrEqual(2);

    // 4. Install test-owned page-side pause observer to deterministically trigger Pause on first in-flight move
    await page.evaluate((depth) => {
      document.documentElement.removeAttribute('data-e2e-pause-requested');

      const checkAndPause = () => {
        const progressEl = document.querySelector('[data-testid="playback-progress"]');
        const progressText = progressEl?.textContent?.trim() || '';
        const isFirstMove = progressText.startsWith('0 /') || progressText === `0 / ${depth}`;

        const pauseBtn = document.querySelector('button[aria-label="Pause solution"]') as HTMLButtonElement | null;
        const isTurning = document.body.textContent?.includes('Turning') || !!document.querySelector('.animating-indicator');

        if (isFirstMove && isTurning && pauseBtn && !pauseBtn.disabled) {
          pauseBtn.click();
          document.documentElement.setAttribute('data-e2e-pause-requested', 'true');
          observer.disconnect();
        }
      };

      const observer = new MutationObserver(() => {
        checkAndPause();
      });

      observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
      checkAndPause();
    }, solutionDepth);

    // 5. Click Play via real Playwright pointer click
    await page.getByRole('button', { name: 'Play solution' }).click();

    // 6. Verify page-side pause observer fired during the first in-flight canonical move
    await expect(page.locator('html')).toHaveAttribute('data-e2e-pause-requested', 'true', { timeout: 10000 });

    // 8, 9, 10, 14. Verify current move finishes completely and settles to IDLE (Play solution re-appears)
    await expect(page.getByRole('button', { name: 'Play solution' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/HALF-TURN:/)).toHaveCount(0);
    await expect(page.getByText('Turning')).toHaveCount(0);

    // 11. Playback progress must advance exactly one move
    await expect(page.getByTestId('playback-progress')).toHaveText(`1 / ${solutionDepth}`);

    // 12. History must gain exactly one canonical entry (1 baseline + 1 step)
    const timelineButtons = page.getByRole('region', { name: 'Move History Timeline' }).getByRole('button');
    await expect(timelineButtons).toHaveCount(2);

    // 13. Verify no second solver move begins automatically while paused
    await page.waitForTimeout(500);
    await expect(page.getByTestId('playback-progress')).toHaveText(`1 / ${solutionDepth}`);
  });

  test('8. PLAYBACK_STEP_BACK_FORWARD_GATE: Step Backward and Step Forward navigate solution step-by-step with strict start bound', async ({ page }) => {
    // Switch to DIRECT_180 mode
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();

    // Scramble cube with deterministic seed (resets history to baseline)
    await page.getByLabel('Scramble seed').fill('abc');
    await page.getByRole('button', { name: 'Generate scramble' }).click();

    // Solve with IDA*
    await page.getByRole('button', { name: 'Solve current state' }).click();
    await expect(page.getByTestId('solver-status')).toContainText('Solved', { timeout: 15000 });

    const summaryText = await page.getByTestId('solver-solution-summary').textContent();
    const match = summaryText?.match(/Solution Depth:\s*(\d+)/);
    const solutionDepth = parseInt(match![1]!, 10);
    expect(solutionDepth).toBeGreaterThanOrEqual(2);

    const stepFwdBtn = page.getByRole('button', { name: 'Step solution forward' });
    const stepBackBtn = page.getByRole('button', { name: 'Step solution backward' });
    const timelineRegion = page.getByRole('region', { name: 'Move History Timeline' });

    // Step backward is disabled at index 0
    await expect(stepBackBtn).toBeDisabled();

    // Step Forward 1
    await stepFwdBtn.click();
    await expect(page.getByTestId('playback-progress')).toHaveText(`1 / ${solutionDepth}`);
    await expect(timelineRegion.getByRole('button')).toHaveCount(2); // baseline + 1 step

    // Step Forward 2
    await stepFwdBtn.click();
    await expect(page.getByTestId('playback-progress')).toHaveText(`2 / ${solutionDepth}`);
    await expect(timelineRegion.getByRole('button')).toHaveCount(3); // baseline + 2 steps
    await expect(timelineRegion.getByRole('button', { name: /Step 2:/ })).toHaveAttribute('aria-current', 'step');

    // Step Backward 1 -> index 1
    await expect(stepBackBtn).toBeEnabled();
    await stepBackBtn.click();
    await expect(page.getByTestId('playback-progress')).toHaveText(`1 / ${solutionDepth}`);
    await expect(timelineRegion.getByRole('button', { name: /Step 1:/ })).toHaveAttribute('aria-current', 'step');

    // Step Backward 2 -> index 0 (playback start baseline)
    await stepBackBtn.click();
    await expect(page.getByTestId('playback-progress')).toHaveText(`0 / ${solutionDepth}`);
    await expect(timelineRegion.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute('aria-current', 'step');

    // Step backward must be DISABLED and cannot cross playbackStartHistoryCursor
    await expect(stepBackBtn).toBeDisabled();

    // Step Forward again -> restores expected canonical prefix (index 1)
    await stepFwdBtn.click();
    await expect(page.getByTestId('playback-progress')).toHaveText(`1 / ${solutionDepth}`);
    await expect(timelineRegion.getByRole('button', { name: /Step 1:/ })).toHaveAttribute('aria-current', 'step');
  });

  test('9. RESPONSIVE_SOLVER_UI_GATE: all panels accessible, visible, and zero overlap across desktop, tablet, and mobile', async ({ page }) => {
    // Generate scramble and solve so both Solver Controls and Solution Playback exist
    await page.getByLabel('Scramble seed').fill('responsive_test');
    await page.getByRole('button', { name: 'Generate scramble' }).click();
    await page.getByRole('button', { name: 'Solve current state' }).click();
    await expect(page.getByTestId('solver-status')).toContainText('Solved', { timeout: 15000 });
    await expect(page.getByTestId('playback-controls')).toBeVisible();

    const viewports = [
      { name: 'desktop', width: 1280, height: 800 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(300);

      // Verify all 6 regions are visible
      const solverRegion = page.getByRole('region', { name: 'Solver Controls' });
      const playbackRegion = page.getByRole('region', { name: 'Solution Playback' });
      const historyGroup = page.getByRole('group', { name: 'History Controls' });
      const scrambleRegion = page.getByRole('region', { name: 'Scramble Controls' });
      const timelineRegion = page.getByRole('region', { name: 'Move History Timeline' });
      const moveControlsPanel = page.locator('.move-controls-panel');

      await expect(solverRegion).toBeVisible();
      await expect(playbackRegion).toBeVisible();
      await expect(historyGroup).toBeVisible();
      await expect(scrambleRegion).toBeVisible();
      await expect(timelineRegion).toBeVisible();
      await expect(moveControlsPanel).toBeVisible();

      // Check no horizontal scrollbar / overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalOverflow, `Horizontal overflow detected at viewport ${vp.name}`).toBe(false);

      // Check bounding box overlaps
      const solverBox = await solverRegion.boundingBox();
      const playbackBox = await playbackRegion.boundingBox();
      const historyBox = await historyGroup.boundingBox();
      const scrambleBox = await scrambleRegion.boundingBox();
      const timelineBox = await timelineRegion.boundingBox();
      const moveBox = await moveControlsPanel.boundingBox();

      expect(solverBox, `solverBox missing at ${vp.name}`).not.toBeNull();
      expect(playbackBox, `playbackBox missing at ${vp.name}`).not.toBeNull();
      expect(historyBox, `historyBox missing at ${vp.name}`).not.toBeNull();
      expect(scrambleBox, `scrambleBox missing at ${vp.name}`).not.toBeNull();
      expect(timelineBox, `timelineBox missing at ${vp.name}`).not.toBeNull();
      expect(moveBox, `moveBox missing at ${vp.name}`).not.toBeNull();

      if (solverBox && playbackBox && historyBox && scrambleBox && timelineBox && moveBox) {
        // Solver and Playback do not overlap each other
        expect(rectsOverlap(solverBox, playbackBox), `Solver overlaps Playback at ${vp.name}`).toBe(false);

        // Solver does not overlap existing panels
        expect(rectsOverlap(solverBox, historyBox), `Solver overlaps History at ${vp.name}`).toBe(false);
        expect(rectsOverlap(solverBox, scrambleBox), `Solver overlaps Scramble at ${vp.name}`).toBe(false);
        expect(rectsOverlap(solverBox, timelineBox), `Solver overlaps Timeline at ${vp.name}`).toBe(false);
        expect(rectsOverlap(solverBox, moveBox), `Solver overlaps MoveControls at ${vp.name}`).toBe(false);

        // Playback does not overlap existing panels
        expect(rectsOverlap(playbackBox, historyBox), `Playback overlaps History at ${vp.name}`).toBe(false);
        expect(rectsOverlap(playbackBox, scrambleBox), `Playback overlaps Scramble at ${vp.name}`).toBe(false);
        expect(rectsOverlap(playbackBox, timelineBox), `Playback overlaps Timeline at ${vp.name}`).toBe(false);
        expect(rectsOverlap(playbackBox, moveBox), `Playback overlaps MoveControls at ${vp.name}`).toBe(false);
      }
    }
  });
});
