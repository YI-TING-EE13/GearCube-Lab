import { test, expect } from '@playwright/test';

test.describe('M6 Play orientation and certified challenge UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('ORIENTATION_ACCESSIBILITY_GATE: persistent legend and semantic face controls expose the canonical axes', async ({ page }) => {
    const legend = page.getByRole('region', { name: 'Orientation legend' });
    await expect(legend).toBeVisible();
    await expect(legend).toContainText('X axis:');
    await expect(legend).toContainText('L (-X) ↔ R (+X)');
    await expect(legend).toContainText('Y axis:');
    await expect(legend).toContainText('D (-Y) ↔ U (+Y)');
    await expect(legend).toContainText('Z axis:');
    await expect(legend).toContainText('B (-Z) ↔ F (+Z)');
    await expect(legend).toContainText('outside the selected face toward the cube center');

    const faceLabels = page.locator('.face-label');
    await expect(faceLabels).toHaveCount(6);
    await expect(page.getByText('R (+X)', { exact: true })).toBeVisible();
    await expect(page.getByText('L (-X)', { exact: true })).toBeVisible();
    await expect(page.getByText('U (+Y)', { exact: true })).toBeVisible();
    await expect(page.getByText('D (-Y)', { exact: true })).toBeVisible();
    await expect(page.getByText('F (+Z)', { exact: true })).toBeVisible();
    await expect(page.getByText('B (-Z)', { exact: true })).toBeVisible();

    const rClockwise = page.getByRole('button', { name: /^R Clockwise/ });
    await expect(rClockwise).toHaveAttribute('aria-label', /Right \(\+X\)/);
    await expect(rClockwise).toHaveAttribute('title', /outside the selected face toward the cube center/);
    await expect(page.getByRole('button', { name: /^R Counter-Clockwise/ })).toHaveAttribute(
      'aria-label',
      /Right \(\+X\)/
    );
    await expect(rClockwise).toContainText('CW');
    await expect(page.getByRole('button', { name: /^R Counter-Clockwise/ })).toContainText('CCW');
  });

  test('CERTIFIED_CHALLENGE_PLAY_BASELINE_GATE: solver-depth certification selects a new empty Play baseline', async ({ page }) => {
    const challenge = page.getByRole('region', { name: 'Certified Challenge Controls' });
    const status = challenge.getByTestId('challenge-status');

    await expect(challenge.getByRole('button', { name: 'Challenge difficulty Normal' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await challenge.getByRole('button', { name: 'Generate Normal challenge' }).click();

    await expect(status).toHaveText(/Normal challenge · Optimal distance: [56] moves/, {
      timeout: 10_000,
    });
    await expect(page.getByRole('button', { name: 'Timeline start baseline' })).toHaveAttribute(
      'aria-current',
      'step'
    );
    await expect(page.getByRole('button', { name: /Step 1:/ })).toHaveCount(0);
    await expect(page.getByTestId('solver-status')).toContainText('Idle');
    await expect(page.getByTestId('playback-controls')).toHaveCount(0);

    const challengeButton = challenge.getByRole('button', { name: 'Challenge difficulty Challenge' });
    await challengeButton.click();
    await expect(challengeButton).toHaveAttribute('aria-pressed', 'true');
    await expect(challenge.getByRole('button', { name: 'Challenge difficulty Normal' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  test.describe('RESPONSIVE_ORIENTATION_CHALLENGE_GATE', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('keeps challenge controls, legend, and face actions reachable without horizontal overflow', async ({ page }) => {
      await expect(page.getByTestId('play-controls-toggle')).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByRole('region', { name: 'Certified Challenge Controls' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Orientation legend' })).toBeVisible();
      await expect(page.getByRole('button', { name: /^R Clockwise/ })).toBeVisible();

      const widths = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));
      expect(widths.document).toBeLessThanOrEqual(widths.viewport);
      expect(widths.body).toBeLessThanOrEqual(widths.viewport);
    });
  });
});
