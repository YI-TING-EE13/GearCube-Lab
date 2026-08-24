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

    // Capture the real browser Web Worker
    const worker = await workerPromise;
    expect(worker.url()).toContain('solver.worker');

    // Verify worker execution context (isolated from DOM document)
    const isWorkerContext = await worker.evaluate(() => typeof document === 'undefined');
    expect(isWorkerContext).toBe(true);

    // Wait for solve completion
    await expect(page.getByTestId('solver-solution-summary')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('solver-status')).toContainText('Solved');

    // Playback controls should appear
    await expect(page.getByTestId('playback-controls')).toBeVisible();
    await expect(page.getByTestId('playback-progress')).toContainText('0 /');
  });

  test('3. MAIN_THREAD_ACTIONABILITY_GATE: main-thread UI interactions remain responsive while solver search is active', async ({ page }) => {
    // Scramble cube
    await page.getByRole('button', { name: 'Generate scramble' }).click();

    // Select BFS algorithm
    await page.getByLabel('Solver Algorithm').selectOption('BFS');

    // Start search
    await page.getByRole('button', { name: 'Solve current state' }).click();

    // Toggle turn interaction mode while search runs (main thread UI action)
    const modeBtn = page.getByRole('button', { name: /Direct 180° turn mode/ });
    await modeBtn.click();
    await expect(page.getByRole('button', { name: 'Direct 180° turn mode: ON' })).toBeVisible();

    // Toggle back
    await modeBtn.click();
    await expect(page.getByRole('button', { name: 'Direct 180° turn mode: OFF' })).toBeVisible();

    // Wait for search to finish
    await expect(page.getByTestId('solver-status')).toContainText('Solved', { timeout: 15000 });
  });

  test('4. STALE_RESULT_GATE: external canonical user action cancels active search and rejects stale solution', async ({ page }) => {
    // Scramble cube
    await page.getByRole('button', { name: 'Generate scramble' }).click();

    // Select BFS algorithm
    await page.getByLabel('Solver Algorithm').selectOption('BFS');

    // Start solve
    await page.getByRole('button', { name: 'Solve current state' }).click();

    // While searching, perform external scramble action which cancels search
    await page.getByRole('button', { name: 'Generate scramble' }).click();

    // Verify solver returns to Idle / does not install old playback
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

  test('7. PLAYBACK_PAUSE_BOUNDARY_GATE: pausing during playback allows current move to settle cleanly at IDLE', async ({ page }) => {
    // Switch to DIRECT_180 for quick turn execution
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();

    // Scramble cube
    await page.getByRole('button', { name: 'Generate scramble' }).click();

    // Solve with IDA*
    await page.getByRole('button', { name: 'Solve current state' }).click();
    await expect(page.getByTestId('solver-status')).toContainText('Solved', { timeout: 15000 });

    // Start play then pause
    await page.getByRole('button', { name: 'Play solution' }).click();
    await page.waitForTimeout(100);
    const pauseBtn = page.getByRole('button', { name: 'Pause solution' });
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
    }

    // Wait for the move in flight to settle and verify playback is paused
    await expect(page.getByRole('button', { name: 'Play solution' })).toBeVisible({ timeout: 10000 });
  });

  test('8. PLAYBACK_STEP_BACK_FORWARD_GATE: Step Backward and Step Forward navigate solution step-by-step', async ({ page }) => {
    // Switch to DIRECT_180 mode
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();

    // Perform two manual moves to have a known 2-move distance
    const uBtn = page.getByRole('button', { name: /^U Clockwise/ });
    await uBtn.click();
    await page.waitForTimeout(500);
    const rBtn = page.getByRole('button', { name: /^R Clockwise/ });
    await rBtn.click();
    await page.waitForTimeout(500);

    // Solve
    await page.getByRole('button', { name: 'Solve current state' }).click();
    await expect(page.getByTestId('solver-status')).toContainText('Solved', { timeout: 15000 });

    const stepFwdBtn = page.getByRole('button', { name: 'Step solution forward' });
    const stepBackBtn = page.getByRole('button', { name: 'Step solution backward' });

    // Step backward is disabled at index 0
    await expect(stepBackBtn).toBeDisabled();

    // Step Forward 1
    await stepFwdBtn.click();
    await expect(page.getByTestId('playback-progress')).toContainText('1 /');

    // Step Backward 1
    await expect(stepBackBtn).toBeEnabled();
    await stepBackBtn.click();
    await expect(page.getByTestId('playback-progress')).toContainText('0 /');

    // Step Forward again
    await stepFwdBtn.click();
    await expect(page.getByTestId('playback-progress')).toContainText('1 /');
  });

  test('9. RESPONSIVE_SOLVER_UI_GATE: responsive layouts fit without horizontal overflow across desktop, tablet, and mobile', async ({ page }) => {
    const viewports = [
      { name: 'desktop', width: 1280, height: 800 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(200);

      await expect(page.getByRole('region', { name: 'Solver Controls' })).toBeVisible();
      await expect(page.getByText('Face Controls')).toBeVisible();

      // Check no horizontal scrollbar / overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalOverflow, `Horizontal overflow detected at viewport ${vp.name}`).toBe(false);
    }
  });
});
