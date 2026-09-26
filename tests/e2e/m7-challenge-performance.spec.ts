import { expect, test, type Locator, type Page } from '@playwright/test';

const browserErrorsByPage = new WeakMap<Page, string[]>();

function collectBrowserErrors(page: Page, errors: string[]): void {
  page.on('pageerror', (exception) => {
    errors.push('[PAGE_ERROR] ' + exception.message + '\n' + String(exception.stack ?? ''));
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push('[CONSOLE_ERROR] ' + message.text());
    }
  });
}

function challengePanel(page: Page): Locator {
  return page.getByRole('region', { name: 'Certified Challenge Controls' });
}

function performancePanel(page: Page): Locator {
  return page.getByRole('region', { name: 'Challenge Performance' });
}

function performanceMetric(performance: Locator, label: string): Locator {
  return performance
    .locator('.challenge-performance-details > div')
    .filter({ hasText: label })
    .locator('dd');
}

async function readPerformanceMetric(
  performance: Locator,
  label: string
): Promise<string> {
  return (await performanceMetric(performance, label).innerText()).trim();
}

async function expandChallengeControls(page: Page): Promise<Locator> {
  const panel = challengePanel(page);
  const disclosure = panel.getByRole('button', {
    name: /^(Expand|Collapse) certified challenge controls$/,
  });

  if ((await disclosure.getAttribute('aria-expanded')) === 'false') {
    await disclosure.click();
  }

  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  return panel;
}

async function generateEasyChallenge(
  page: Page
): Promise<{ challenge: Locator; performance: Locator }> {
  const challenge = await expandChallengeControls(page);
  const easy = challenge.getByRole('button', {
    name: 'Challenge difficulty Easy',
  });
  await easy.click();
  await expect(easy).toHaveAttribute('aria-pressed', 'true');

  await challenge.getByRole('button', {
    name: 'Generate Easy challenge',
  }).click();

  await expect(challenge.getByTestId('challenge-status')).toHaveText(
    /Easy challenge · Optimal distance: [2-4] moves/,
    { timeout: 15_000 }
  );

  const performance = performancePanel(page);
  await expect(performance).toBeVisible();
  await expect(performance).toContainText('Challenge in progress');
  await expect(performanceMetric(performance, 'Your moves')).toHaveText('0');
  await expect(performanceMetric(performance, 'Optimal moves')).toHaveText(
    /^[2-4]$/
  );
  return { challenge, performance };
}

async function enableDirect180(page: Page): Promise<void> {
  const off = page.getByRole('button', {
    name: 'Direct 180° turn mode: OFF',
  });
  if (await off.count()) {
    await off.click();
  }
  await expect(
    page.getByRole('button', { name: 'Direct 180° turn mode: ON' })
  ).toBeVisible();
}

async function completeAssistedEasyChallenge(
  page: Page
): Promise<{ challenge: Locator; performance: Locator }> {
  const { challenge, performance } = await generateEasyChallenge(page);
  await enableDirect180(page);

  await page.getByRole('button', { name: 'Solve current state' }).click();
  await expect(
    performance.locator('.challenge-performance-assistance')
  ).toContainText(/Assisted(?: run)? — solution help was used\./, {
    timeout: 15_000,
  });
  await expect(page.getByTestId('solver-status')).toContainText('Solved', {
    timeout: 30_000,
  });

  const playback = page.getByTestId('playback-controls');
  await expect(playback).toBeVisible();
  await playback.getByRole('button', { name: 'Play solution' }).click();
  await expect(performance.getByText('Challenge Complete', { exact: true }))
    .toBeVisible({ timeout: 30_000 });

  await expect(performanceMetric(performance, 'Your moves')).not.toHaveText('0');
  await expect(performanceMetric(performance, 'Optimal moves')).toHaveText(
    /^[2-4]$/
  );
  await expect(performanceMetric(performance, 'Move delta')).not.toHaveText('');
  await expect(performanceMetric(performance, 'Efficiency')).toHaveText(/^\d+%$/);
  await expect(performanceMetric(performance, 'Time')).toHaveText(
    /^\d{2}:\d{2}(?::\d{2})?$/
  );
  await expect(performance).toContainText(
    'Assisted run — solution help was used.'
  );
  await expect(
    performance.getByText('Solved optimally', { exact: true })
  ).toHaveCount(0);
  await expect(
    performance.getByRole('button', { name: 'Retry same challenge' })
  ).toBeEnabled();
  await expect(
    performance.getByRole('button', { name: 'Generate new challenge' })
  ).toBeEnabled();

  return { challenge, performance };
}

async function assertDesktopChallengeStackClearsFaceControls(
  page: Page,
  action: Locator
): Promise<void> {
  for (const viewport of [
    { width: 1025, height: 720 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    const rectangles = await page.evaluate(() => {
      const challengeStack = document.querySelector<HTMLElement>('.challenge-stack');
      const moveControls = document.querySelector<HTMLElement>(
        '.move-controls-panel'
      );
      if (!challengeStack || !moveControls) {
        throw new Error('Desktop Challenge or Face Controls region is not mounted.');
      }

      const readRect = (element: HTMLElement) => {
        const { top, right, bottom, left, width, height } =
          element.getBoundingClientRect();
        return { top, right, bottom, left, width, height };
      };

      return {
        challengeStack: readRect(challengeStack),
        moveControls: readRect(moveControls),
      };
    });
    const intersectionWidth =
      Math.min(rectangles.challengeStack.right, rectangles.moveControls.right) -
      Math.max(rectangles.challengeStack.left, rectangles.moveControls.left);
    const intersectionHeight =
      Math.min(rectangles.challengeStack.bottom, rectangles.moveControls.bottom) -
      Math.max(rectangles.challengeStack.top, rectangles.moveControls.top);

    expect(rectangles.challengeStack.width).toBeGreaterThan(0);
    expect(rectangles.challengeStack.height).toBeGreaterThan(0);
    expect(rectangles.moveControls.width).toBeGreaterThan(0);
    expect(rectangles.moveControls.height).toBeGreaterThan(0);
    const noIntersection = intersectionWidth <= 0 || intersectionHeight <= 0;
    expect(
      noIntersection,
      `Challenge stack intersects Face Controls at ${viewport.width}x${viewport.height}: ${JSON.stringify(rectangles)}`
    ).toBe(true);
    await action.click({ trial: true });
  }
}

test.describe('M7 Challenge Performance lifecycle acceptance', () => {
  test.beforeEach(async ({ page }) => {
    const browserErrors: string[] = [];
    browserErrorsByPage.set(page, browserErrors);
    collectBrowserErrors(page, browserErrors);

    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    expect(
      browserErrorsByPage.get(page) ?? [],
      'M7 flow should not emit browser page or console errors'
    ).toEqual([]);
  });

  test('M7_ACTIVE_MOVE_ACCOUNTING_GATE: Undo changes visible history but not committed Challenge moves', async ({
    page,
  }) => {
    const { performance } = await generateEasyChallenge(page);
    await enableDirect180(page);

    await page.getByRole('button', { name: /^F Clockwise/ }).click();
    await expect(performanceMetric(performance, 'Your moves')).toHaveText('1');

    const timeline = page.getByRole('region', { name: 'Move History Timeline' });
    const firstMove = page.getByRole('button', { name: /^Step 1: F/ });
    await expect(firstMove).toHaveAttribute('aria-current', 'step');

    await page.getByRole('button', { name: 'Undo move' }).click();
    await expect(
      page.getByRole('button', { name: 'Timeline start baseline' })
    ).toHaveAttribute('aria-current', 'step');
    await expect(timeline).toContainText('0 / 1');
    await expect(performanceMetric(performance, 'Your moves')).toHaveText('1');

    await page.getByRole('button', { name: /^D Counter-Clockwise/ }).click();
    await expect(performanceMetric(performance, 'Your moves')).toHaveText('2');
    await expect(timeline).toContainText('1 / 1');
    await expect(
      page.getByRole('button', { name: /^Step 1: D/ })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Step 2:/ })).toHaveCount(0);
  });

  test('M7_ASSISTED_COMPLETION_GATE: Solve assistance and frozen completion metrics are visible', async ({
    page,
  }) => {
    const { performance } = await completeAssistedEasyChallenge(page);
    const completedMoveCount = await readPerformanceMetric(
      performance,
      'Your moves'
    );

    const undo = page.getByRole('button', { name: 'Undo move' });
    await expect(undo).toBeEnabled();
    await undo.click();

    await expect(performance.getByText('Challenge Complete', { exact: true }))
      .toBeVisible();
    await expect(performanceMetric(performance, 'Your moves')).toHaveText(
      completedMoveCount
    );
    await expect(performance).toContainText(
      'Assisted run — solution help was used.'
    );
  });

  test('M7_RETRY_SAME_CERTIFICATE_GATE: Retry preserves visible certificate metadata and resets the run', async ({
    page,
  }) => {
    const { challenge, performance } =
      await completeAssistedEasyChallenge(page);
    const certificate = {
      difficulty: await readPerformanceMetric(performance, 'Difficulty'),
      seed: await readPerformanceMetric(performance, 'Seed'),
      optimalMoves: await readPerformanceMetric(performance, 'Optimal moves'),
    };

    const retry = performance.getByRole('button', {
      name: 'Retry same challenge',
    });
    await assertDesktopChallengeStackClearsFaceControls(page, retry);
    await retry.click();

    await expect(performance).toContainText('Challenge in progress');
    await expect(performanceMetric(performance, 'Your moves')).toHaveText('0');
    await expect(performanceMetric(performance, 'Difficulty')).toHaveText(
      certificate.difficulty
    );
    await expect(performanceMetric(performance, 'Seed')).toHaveText(
      certificate.seed
    );
    await expect(performanceMetric(performance, 'Optimal moves')).toHaveText(
      certificate.optimalMoves
    );
    await expect(performance).not.toContainText(/Assisted/i);

    await expect(
      page.getByRole('button', { name: 'Timeline start baseline' })
    ).toHaveAttribute('aria-current', 'step');
    await expect(
      page.getByRole('button', { name: /^Step 1:/ })
    ).toHaveCount(0);
    await expect(page.getByTestId('solver-status')).toContainText('Idle');
    await expect(page.getByTestId('playback-controls')).toHaveCount(0);
    await expect(challenge.getByTestId('challenge-status')).toHaveText(
      /Easy challenge · Optimal distance: [2-4] moves/
    );
  });

  test('M7_NEW_CHALLENGE_GATE: New Challenge abandons the completed result before installing a new run', async ({
    page,
  }) => {
    const { challenge, performance } =
      await completeAssistedEasyChallenge(page);
    await expect(
      performance.getByText('Challenge Complete', { exact: true })
    ).toBeVisible();
    await expect(
      performance.getByRole('button', { name: 'Generate new challenge' })
    ).toBeVisible();
    const newChallenge = performance.getByRole('button', {
      name: 'Generate new challenge',
    });
    await assertDesktopChallengeStackClearsFaceControls(page, newChallenge);

    await page.evaluate(() => {
      const challengeUi = document.querySelector<HTMLElement>('.challenge-stack');
      if (!challengeUi) {
        throw new Error('Certified Challenge UI is not mounted.');
      }

      type ChallengeSnapshot = {
        challengeStatus: string | null;
        performanceText: string | null;
        performancePresent: boolean;
        performanceIsCompleted: boolean;
        performanceIsActive: boolean;
      };

      const readSnapshot = (): ChallengeSnapshot => {
        const challengeStatus =
          challengeUi.querySelector<HTMLElement>('[data-testid="challenge-status"]')
            ?.innerText.trim() ?? null;
        const performance = challengeUi.querySelector<HTMLElement>(
          '[data-testid="challenge-performance"]'
        );
        const performanceText = performance?.innerText.trim() ?? null;

        return {
          challengeStatus,
          performanceText,
          performancePresent: performance !== null,
          performanceIsCompleted:
            performanceText?.includes('Challenge Complete') ?? false,
          performanceIsActive:
            performanceText?.includes('Challenge in progress') ?? false,
        };
      };

      const snapshots = [readSnapshot()];
      const observer = new MutationObserver(() => {
        snapshots.push(readSnapshot());
      });
      observer.observe(challengeUi, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });

      const observedWindow = window as Window & {
        __m7NewChallengeSnapshots?: ChallengeSnapshot[];
        __m7NewChallengeObserver?: MutationObserver;
      };
      observedWindow.__m7NewChallengeSnapshots = snapshots;
      observedWindow.__m7NewChallengeObserver = observer;
    });

    await performance
      .getByRole('button', { name: 'Generate new challenge' })
      .click();
    await expect(
      performance.getByText('Challenge Complete', { exact: true })
    ).toHaveCount(0);

    const acceptedStatus = /^Easy challenge · Optimal distance: [2-4] moves$/;
    await expect(challenge.getByTestId('challenge-status')).toHaveText(
      acceptedStatus,
      { timeout: 15_000 }
    );
    await expect(performance).toBeVisible();
    await expect(performance).toContainText('Challenge in progress');
    await expect(performanceMetric(performance, 'Your moves')).toHaveText('0');
    await expect(performanceMetric(performance, 'Optimal moves')).toHaveText(
      /^[2-4]$/
    );

    const chronology = await page.evaluate(() => {
      const observedWindow = window as Window & {
        __m7NewChallengeSnapshots?: {
          challengeStatus: string | null;
          performanceText: string | null;
          performancePresent: boolean;
          performanceIsCompleted: boolean;
          performanceIsActive: boolean;
        }[];
        __m7NewChallengeObserver?: MutationObserver;
      };
      observedWindow.__m7NewChallengeObserver?.disconnect();
      const snapshots = [...(observedWindow.__m7NewChallengeSnapshots ?? [])];
      delete observedWindow.__m7NewChallengeObserver;
      delete observedWindow.__m7NewChallengeSnapshots;
      return snapshots;
    });

    expect(chronology[0]?.performanceIsCompleted).toBe(true);
    const generationSnapshots = chronology.filter((snapshot) =>
      snapshot.challengeStatus?.startsWith('Generating Easy challenge…')
    );
    expect(generationSnapshots.length).toBeGreaterThan(0);
    expect(
      generationSnapshots.every(
        (snapshot) =>
          !snapshot.performanceIsActive && !snapshot.performancePresent
      )
    ).toBe(true);

    const firstActiveIndex = chronology.findIndex(
      (snapshot) => snapshot.performanceIsActive
    );
    expect(firstActiveIndex).toBeGreaterThanOrEqual(0);
    expect(chronology[firstActiveIndex]?.challengeStatus).toMatch(acceptedStatus);
    expect(
      chronology
        .slice(0, firstActiveIndex)
        .every((snapshot) => !snapshot.performanceIsActive)
    ).toBe(true);

    const finalSnapshot = chronology.at(-1);
    expect(finalSnapshot?.challengeStatus).toMatch(acceptedStatus);
    expect(finalSnapshot?.performanceIsActive).toBe(true);
    expect(finalSnapshot?.performanceText).toContain('Your moves');
  });

  test('M7_SCRAMBLE_RESET_GATE: ordinary Scramble clears certification and performance while Solver remains usable', async ({
    page,
  }) => {
    const { challenge, performance } = await generateEasyChallenge(page);

    await page.getByLabel('Scramble seed').fill('review_f2_reset');
    await page.getByRole('button', { name: 'Generate scramble' }).click();

    await expect(performance).toHaveCount(0);
    await expect(challenge.getByTestId('challenge-status')).toHaveText(
      'No certified challenge selected.'
    );
    await expect(
      page.getByRole('button', { name: 'Timeline start baseline' })
    ).toHaveAttribute('aria-current', 'step');
    await expect(
      page.getByRole('region', { name: 'Move History Timeline' })
    ).toContainText('0 / 0');
    await expect(page.getByRole('button', { name: /^Step 1:/ })).toHaveCount(0);

    const solve = page.getByRole('button', { name: 'Solve current state' });
    await expect(solve).toBeEnabled();
    await solve.click();
    await expect(page.getByTestId('solver-status')).toContainText('Solved', {
      timeout: 30_000,
    });
    await expect(page.getByTestId('playback-controls')).toBeVisible();
  });

  test('M7_WORKSPACE_PRESERVATION_GATE: Play to Research to Play preserves the active run', async ({
    page,
  }) => {
    const { performance } = await generateEasyChallenge(page);
    await enableDirect180(page);
    await page.getByRole('button', { name: /^U Clockwise/ }).click();
    await expect(performanceMetric(performance, 'Your moves')).toHaveText('1');

    const runIdentity = {
      difficulty: await readPerformanceMetric(performance, 'Difficulty'),
      seed: await readPerformanceMetric(performance, 'Seed'),
      moves: await readPerformanceMetric(performance, 'Your moves'),
      optimalMoves: await readPerformanceMetric(performance, 'Optimal moves'),
    };

    await page.getByTestId('workspace-mode-research').click();
    await expect(page.getByTestId('research-panel')).toBeVisible();
    await expect(page.getByTestId('play-controls-drawer')).toHaveCount(0);
    await expect(performancePanel(page)).toHaveCount(0);

    await page.getByTestId('workspace-mode-play').click();
    await expect(page.getByTestId('play-controls-drawer')).toBeVisible();
    const restoredPerformance = performancePanel(page);
    await expect(restoredPerformance).toBeVisible();
    await expect(restoredPerformance).toContainText('Challenge in progress');
    await expect(
      performanceMetric(restoredPerformance, 'Difficulty')
    ).toHaveText(runIdentity.difficulty);
    await expect(performanceMetric(restoredPerformance, 'Seed')).toHaveText(
      runIdentity.seed
    );
    await expect(performanceMetric(restoredPerformance, 'Your moves')).toHaveText(
      runIdentity.moves
    );
    await expect(
      performanceMetric(restoredPerformance, 'Optimal moves')
    ).toHaveText(runIdentity.optimalMoves);
  });

  test('M7_RESPONSIVE_COMPLETION_GATE: compact completion actions remain reachable, scrollable, and keyboard accessible', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByTestId('play-controls-toggle')).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    const { performance } = await completeAssistedEasyChallenge(page);
    await performance.scrollIntoViewIfNeeded();
    await expect(performance).toBeInViewport();

    const retry = performance.getByRole('button', {
      name: 'Retry same challenge',
    });
    const newChallenge = performance.getByRole('button', {
      name: 'Generate new challenge',
    });
    await expect(retry).toBeVisible();
    await expect(retry).toBeEnabled();
    await expect(newChallenge).toBeVisible();
    await expect(newChallenge).toBeEnabled();
    await expect(retry).toBeInViewport();
    await expect(newChallenge).toBeInViewport();

    const drawer = page.getByTestId('play-controls-drawer');
    await expect(drawer).toHaveAttribute('data-open', 'true');
    const drawerMetrics = await page
      .locator('.play-controls-drawer-content')
      .evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        scrollTop: element.scrollTop,
      }));
    expect(drawerMetrics.scrollHeight).toBeGreaterThan(
      drawerMetrics.clientHeight
    );
    expect(drawerMetrics.scrollTop).toBeGreaterThan(0);

    const widths = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
    expect(widths.body).toBeLessThanOrEqual(widths.viewport);

    await retry.focus();
    await expect(retry).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(newChallenge).toBeFocused();
  });
});
