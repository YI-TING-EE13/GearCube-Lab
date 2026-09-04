import { test, expect, type Page } from '@playwright/test';

interface Viewport {
  readonly width: number;
  readonly height: number;
}

function setupErrorCollectors(page: Page, errors: string[]) {
  page.on('pageerror', (exception) => {
    errors.push(`[PAGE_ERROR] ${exception.message}\n${exception.stack}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`[CONSOLE_ERROR] ${message.text()}`);
    }
  });
}

async function assertNoHorizontalOverflow(page: Page, viewport: Viewport): Promise<void> {
  const widths = await page.evaluate(() => ({
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(widths.documentScrollWidth, `document overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(widths.viewportWidth);
  expect(widths.bodyScrollWidth, `body overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(widths.viewportWidth);
}

async function assertCanvasHitTarget(page: Page, viewport: Viewport): Promise<void> {
  await expect.poll(async () => page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const container = document.querySelector('.canvas-container');
    if (!canvas || !container) {
      return false;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return Math.abs(canvasRect.x - containerRect.x) <= 1
      && Math.abs(canvasRect.y - containerRect.y) <= 1
      && Math.abs(canvasRect.width - containerRect.width) <= 1
      && Math.abs(canvasRect.height - containerRect.height) <= 1;
  }), {
    message: `canvas did not settle to its resized container at ${viewport.width}x${viewport.height}`,
    timeout: 3_000,
  }).toBe(true);

  const hit = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const point = {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
    };
    return {
      point,
      targetIsCanvas: document.elementFromPoint(point.x, point.y) === canvas,
    };
  });

  expect(hit, `canvas hit target unavailable at ${viewport.width}x${viewport.height}`).not.toBeNull();
  expect(hit?.targetIsCanvas, `closed controls must expose canvas at ${viewport.width}x${viewport.height}`).toBe(true);
}

async function assertCompactControlsState(page: Page, viewport: Viewport, open: boolean): Promise<void> {
  const toggle = page.getByTestId('play-controls-toggle');
  const drawer = page.getByTestId('play-controls-drawer');

  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', String(open));
  await expect(toggle).toHaveAttribute('aria-controls', 'play-controls-drawer');
  await expect(drawer).toHaveAttribute('data-open', String(open));
  await assertNoHorizontalOverflow(page, viewport);

  if (open) {
    const content = page.locator('.play-controls-drawer-content');
    const contentBox = await content.boundingBox();
    expect(contentBox, `drawer content unavailable at ${viewport.width}x${viewport.height}`).not.toBeNull();

    if (contentBox) {
      expect(contentBox.x).toBeGreaterThanOrEqual(0);
      expect(contentBox.y).toBeGreaterThanOrEqual(0);
      expect(contentBox.x + contentBox.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(contentBox.y + contentBox.height).toBeLessThanOrEqual(viewport.height + 1);
    }

    await expect(page.locator('.move-controls-panel')).toBeVisible();
  } else {
    await expect(page.locator('.move-controls-panel')).toBeHidden();

    const hiddenControlWasFocused = await page.evaluate(() => {
      const control = document.querySelector('.play-controls-drawer[data-open="false"] .move-btn') as HTMLElement | null;
      control?.focus();
      return document.activeElement === control;
    });
    expect(hiddenControlWasFocused, 'closed controls must not remain keyboard-focusable').toBe(false);

    await assertCanvasHitTarget(page, viewport);
  }
}

async function tapLocator(page: Page, locator: ReturnType<Page['getByTestId']>): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }

  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe('GearCube Responsive Navigation M1 Qualification', () => {
  let errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    setupErrorCollectors(page, errors);
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
  });

  test.afterEach(async () => {
    expect(errors, `Expected 0 unhandled browser errors, got:\n${errors.join('\n')}`).toEqual([]);
  });

  test('1. RESPONSIVE_M1_MODE_RESIZE_GATE: Play, Solve, and Research remain usable across compact resize transitions', async ({ page }) => {
    test.setTimeout(60_000);

    const phonePortrait = { width: 390, height: 844 };
    const phoneLandscape = { width: 844, height: 390 };
    const tabletPortrait = { width: 768, height: 1024 };
    const tabletLandscape = { width: 1024, height: 768 };
    const shortLandscape = { width: 667, height: 375 };

    await page.setViewportSize(phonePortrait);
    await page.goto('/');
    await assertCompactControlsState(page, phonePortrait, true);

    // A closed drawer remains closed through portrait -> landscape -> portrait.
    const controlsToggle = page.getByTestId('play-controls-toggle');
    await controlsToggle.focus();
    await page.keyboard.press('Enter');
    await assertCompactControlsState(page, phonePortrait, false);
    await page.setViewportSize(phoneLandscape);
    await assertCompactControlsState(page, phoneLandscape, false);
    await page.setViewportSize(phonePortrait);
    await assertCompactControlsState(page, phonePortrait, false);

    // An open drawer remains reachable through tablet portrait -> landscape.
    await page.getByTestId('play-controls-toggle').click();
    await assertCompactControlsState(page, phonePortrait, true);
    await page.setViewportSize(tabletPortrait);
    await assertCompactControlsState(page, tabletPortrait, true);
    await page.setViewportSize(tabletLandscape);
    await assertCompactControlsState(page, tabletLandscape, true);

    // Closing before another resize does not leave a stale overlay behind.
    await page.getByTestId('play-controls-toggle').click();
    await assertCompactControlsState(page, tabletLandscape, false);
    await page.setViewportSize(shortLandscape);
    await assertCompactControlsState(page, shortLandscape, false);

    // Research mode unmounts Play controls and keeps its own short-screen form scrollable.
    await page.goto('/');
    await page.setViewportSize(shortLandscape);
    await page.getByTestId('play-controls-toggle').click();
    await assertCompactControlsState(page, shortLandscape, false);
    await page.getByTestId('workspace-mode-research').click();
    await expect(page.getByTestId('research-panel')).toBeVisible();
    await expect(page.getByTestId('play-controls-toggle')).toHaveCount(0);
    await expect(page.getByTestId('play-controls-drawer')).toHaveCount(0);

    const researchPanel = page.getByTestId('research-panel');
    const researchPanelBox = await researchPanel.boundingBox();
    expect(researchPanelBox).not.toBeNull();
    if (researchPanelBox) {
      expect(researchPanelBox.x).toBeGreaterThanOrEqual(0);
      expect(researchPanelBox.x + researchPanelBox.width).toBeLessThanOrEqual(shortLandscape.width + 1);
      expect(researchPanelBox.y).toBeGreaterThanOrEqual(0);
      expect(researchPanelBox.y + researchPanelBox.height).toBeLessThanOrEqual(shortLandscape.height + 1);
    }

    const researchScrollMetrics = await researchPanel.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
    expect(researchScrollMetrics.scrollHeight).toBeGreaterThan(researchScrollMetrics.clientHeight);
    await page.getByTestId('research-input-suite-id').scrollIntoViewIfNeeded();
    await page.getByTestId('research-run-button').scrollIntoViewIfNeeded();
    await page.getByTestId('research-run-button').click({ trial: true });

    // Returning to Play restores the previous closed state without a stale Research layer.
    await page.getByTestId('workspace-mode-play').click();
    await expect(page.getByTestId('research-panel')).toHaveCount(0);
    await assertCompactControlsState(page, shortLandscape, false);
    await page.getByTestId('play-controls-toggle').click();
    await assertCompactControlsState(page, shortLandscape, true);

    // Solve and Playback share the same drawer and remain reachable at short height.
    await page.goto('/');
    await page.setViewportSize(shortLandscape);
    await page.getByLabel('Scramble seed').fill('responsive_m1_solve');
    await page.getByRole('button', { name: 'Generate scramble' }).click();
    await page.getByRole('button', { name: 'Solve current state' }).click();
    await expect(page.getByTestId('solver-status')).toContainText('Solved', { timeout: 15_000 });
    await expect(page.getByTestId('playback-controls')).toBeVisible();

    await page.getByTestId('play-controls-toggle').click();
    await assertCompactControlsState(page, shortLandscape, false);
    await expect(page.getByTestId('playback-controls')).toBeHidden();
    await page.getByTestId('play-controls-toggle').click();
    await page.getByTestId('playback-controls').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('playback-controls')).toBeVisible();
  });

  test.describe('Chromium touch emulation', () => {
    test.use({ viewport: { width: 667, height: 375 }, hasTouch: true });

    test('2. TOUCH_EMULATION_GATE: touch pointer input, drawer disclosure, and drawer scroll operate in a compact viewport', async ({ page, context, browserName }) => {
      test.skip(browserName !== 'chromium', 'Touch emulation is qualified in Chromium; Firefox and WebKit run the non-touch responsive gate.');

      const viewport = { width: 667, height: 375 };
      const toggle = page.getByTestId('play-controls-toggle');
      await expect(toggle).toBeVisible();

      // Close the drawer with an actual touch tap before observing the canvas hit path.
      await tapLocator(page, toggle);
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');

      const canvasPoint = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) {
          return null;
        }

        canvas.dataset.touchPointerDownCount = '0';
        canvas.dataset.touchPointerType = '';
        canvas.addEventListener('pointerdown', (event) => {
          const target = event.currentTarget as HTMLCanvasElement;
          target.dataset.touchPointerDownCount = String(Number(target.dataset.touchPointerDownCount ?? 0) + 1);
          target.dataset.touchPointerType = event.pointerType;
        }, { capture: true });

        const rect = canvas.getBoundingClientRect();
        const point = {
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
        };
        return {
          point,
          targetIsCanvas: document.elementFromPoint(point.x, point.y) === canvas,
        };
      });

      expect(canvasPoint).not.toBeNull();
      expect(canvasPoint?.targetIsCanvas).toBe(true);
      if (canvasPoint) {
        await page.touchscreen.tap(canvasPoint.point.x, canvasPoint.point.y);
      }

      const canvasTouchEvents = await page.evaluate(() => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
        return {
          pointerDownCount: Number(canvas?.dataset.touchPointerDownCount ?? 0),
          pointerType: canvas?.dataset.touchPointerType ?? '',
        };
      });
      expect(canvasTouchEvents.pointerDownCount).toBeGreaterThan(0);
      expect(canvasTouchEvents.pointerType).toBe('touch');

      // Reopen with touch and prove the short-height drawer has a scrollable viewport.
      await tapLocator(page, toggle);
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const content = page.locator('.play-controls-drawer-content');
      const beforeScroll = await content.evaluate((element) => ({
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        scrollTop: element.scrollTop,
      }));
      expect(beforeScroll.scrollHeight).toBeGreaterThan(beforeScroll.clientHeight);

      const contentBox = await content.boundingBox();
      expect(contentBox).not.toBeNull();
      if (!contentBox) {
        return;
      }

      const cdpSession = await context.newCDPSession(page);
      const x = Math.round(contentBox.x + contentBox.width / 2);
      const startY = Math.round(contentBox.y + contentBox.height - 24);
      await cdpSession.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y: startY }],
      });
      for (const y of [startY - 60, startY - 120, startY - 180]) {
        await cdpSession.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y }],
        });
      }
      await cdpSession.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
      await page.waitForTimeout(150);

      const afterScrollTop = await content.evaluate((element) => element.scrollTop);
      expect(afterScrollTop, `drawer did not scroll at ${viewport.width}x${viewport.height}`).toBeGreaterThan(0);
    });
  });
});
