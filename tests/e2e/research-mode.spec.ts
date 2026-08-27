import { test, expect, type Page, type Worker } from '@playwright/test';

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

// Raw WebGL HTMLCanvasElement bitmap capture types & helpers
export interface RawCanvasBitmapCapture {
  dataUrl: string;
  width: number;
  height: number;
}

export interface RawCanvasComparisonResult {
  sameDimensions: boolean;
  width: number;
  height: number;
  totalPixels: number;
  differingPixels: number;
  differingPixelFraction: number;
  maxChannelDelta: number;
  diffBoundingBox: { minX: number; minY: number; maxX: number; maxY: number } | null;
  preNonUniformPixelCount: number;
  postNonUniformPixelCount: number;
}

async function captureRawCanvasBitmap(page: Page): Promise<RawCanvasBitmapCapture> {
  return page.evaluate(async () => {
    // 1. Locate WebGL canvas element
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      throw new Error('No HTMLCanvasElement found in document');
    }

    // 2. Symmetric render settling: wait 2 rAF turns
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    // 3. Obtain raw canvas image directly from HTMLCanvasElement (excluding HTML overlays)
    const dataUrl = canvas.toDataURL('image/png');
    return {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
    };
  });
}

async function compareRawCanvasCaptures(
  page: Page,
  preCapture: RawCanvasBitmapCapture,
  postCapture: RawCanvasBitmapCapture
): Promise<RawCanvasComparisonResult> {
  return page.evaluate(async ({ pre, post }) => {
    async function decodeDataUrl(dataUrl: string): Promise<ImageData> {
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(new Error(`Failed to decode canvas data URL: ${String(e)}`));
      });
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.naturalWidth || img.width;
      tempCanvas.height = img.naturalHeight || img.height;
      const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Could not get 2d context for canvas image comparison');
      }
      ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    }

    function countNonUniformPixels(imageData: ImageData): number {
      const data = imageData.data;
      if (data.length < 4) return 0;
      const firstR = data[0];
      const firstG = data[1];
      const firstB = data[2];
      const firstA = data[3];
      let nonUniform = 0;
      for (let i = 4; i < data.length; i += 4) {
        if (
          data[i] !== firstR ||
          data[i + 1] !== firstG ||
          data[i + 2] !== firstB ||
          data[i + 3] !== firstA
        ) {
          nonUniform++;
        }
      }
      return nonUniform;
    }

    const imgA = await decodeDataUrl(pre.dataUrl);
    const imgB = await decodeDataUrl(post.dataUrl);

    const width = imgA.width;
    const height = imgA.height;
    const sameDimensions = imgA.width === imgB.width && imgA.height === imgB.height;

    const preNonUniformPixelCount = countNonUniformPixels(imgA);
    const postNonUniformPixelCount = countNonUniformPixels(imgB);

    if (!sameDimensions) {
      return {
        sameDimensions: false,
        width,
        height,
        totalPixels: width * height,
        differingPixels: -1,
        differingPixelFraction: 1,
        maxChannelDelta: 255,
        diffBoundingBox: null,
        preNonUniformPixelCount,
        postNonUniformPixelCount,
      };
    }

    const totalPixels = width * height;
    let differingPixels = 0;
    let maxChannelDelta = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    const dataA = imgA.data;
    const dataB = imgB.data;

    for (let i = 0; i < dataA.length; i += 4) {
      const dr = Math.abs(dataA[i] - dataB[i]);
      const dg = Math.abs(dataA[i + 1] - dataB[i + 1]);
      const db = Math.abs(dataA[i + 2] - dataB[i + 2]);
      const da = Math.abs(dataA[i + 3] - dataB[i + 3]);
      const maxDelta = Math.max(dr, dg, db, da);

      if (maxDelta > 0) {
        differingPixels++;
        if (maxDelta > maxChannelDelta) {
          maxChannelDelta = maxDelta;
        }
        const pixelIndex = i / 4;
        const px = pixelIndex % width;
        const py = Math.floor(pixelIndex / width);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }

    const diffBoundingBox =
      differingPixels > 0
        ? { minX, minY, maxX, maxY }
        : null;

    return {
      sameDimensions: true,
      width,
      height,
      totalPixels,
      differingPixels,
      differingPixelFraction: totalPixels > 0 ? differingPixels / totalPixels : 0,
      maxChannelDelta,
      diffBoundingBox,
      preNonUniformPixelCount,
      postNonUniformPixelCount,
    };
  }, { pre: preCapture, post: postCapture });
}

// Research mode navigation helpers
async function enterResearchMode(page: Page): Promise<void> {
  await page.getByTestId('workspace-mode-research').click();
  await expect(page.getByTestId('research-panel')).toBeVisible();
}

async function returnToPlayMode(page: Page): Promise<void> {
  await page.getByTestId('workspace-mode-play').click();
  await expect(page.getByTestId('research-panel')).toBeHidden();
}

// Suite configuration helpers
async function configureFastSuite(page: Page): Promise<void> {
  // Suite ID & Seed
  await page.getByTestId('research-input-suite-id').fill('e2e-browser-fast');
  await page.getByTestId('research-input-seed').fill('e2e-browser-fast');

  // Cases per depth: 2
  await page.getByTestId('research-input-cases-per-depth').fill('2');

  // Warmup runs: 0, Measured runs: 1
  await page.getByTestId('research-input-warmup-runs').fill('0');
  await page.getByTestId('research-input-measured-runs').fill('1');

  // Depths: Check Depth 1 ONLY (uncheck depths 2..8)
  for (let d = 1; d <= 8; d++) {
    const cb = page.getByTestId(`research-checkbox-depth-${d}`);
    const isChecked = await cb.isChecked();
    if (d === 1 && !isChecked) {
      await cb.check();
    } else if (d > 1 && isChecked) {
      await cb.uncheck();
    }
  }

  // Algorithms: Check BFS, BIDIRECTIONAL_BFS, IDA_STAR
  for (const algo of ['BFS', 'BIDIRECTIONAL_BFS', 'IDA_STAR']) {
    const cb = page.getByTestId(`research-checkbox-algo-${algo}`);
    if (!(await cb.isChecked())) {
      await cb.check();
    }
  }
}

async function configureLongCancellationSuite(page: Page): Promise<void> {
  // Suite ID & Seed
  await page.getByTestId('research-input-suite-id').fill('e2e-browser-cancel');
  await page.getByTestId('research-input-seed').fill('e2e-browser-cancel');

  // Cases per depth: 8
  await page.getByTestId('research-input-cases-per-depth').fill('8');

  // Warmup runs: 0, Measured runs: 1
  await page.getByTestId('research-input-warmup-runs').fill('0');
  await page.getByTestId('research-input-measured-runs').fill('1');

  // Depths: Check Depth 8 ONLY (uncheck depths 1..7)
  for (let d = 1; d <= 8; d++) {
    const cb = page.getByTestId(`research-checkbox-depth-${d}`);
    const isChecked = await cb.isChecked();
    if (d === 8 && !isChecked) {
      await cb.check();
    } else if (d < 8 && isChecked) {
      await cb.uncheck();
    }
  }

  // Algorithms: Check BFS ONLY
  const bfsCb = page.getByTestId('research-checkbox-algo-BFS');
  if (!(await bfsCb.isChecked())) {
    await bfsCb.check();
  }
  const bibfsCb = page.getByTestId('research-checkbox-algo-BIDIRECTIONAL_BFS');
  if (await bibfsCb.isChecked()) {
    await bibfsCb.uncheck();
  }
  const idaCb = page.getByTestId('research-checkbox-algo-IDA_STAR');
  if (await idaCb.isChecked()) {
    await idaCb.uncheck();
  }
}

test.describe('GearCube Browser Research Mode End-to-End Suite', () => {
  let errors: string[] = [];

  test.beforeEach(async ({ page }) => {
    errors = [];
    setupErrorCollectors(page, errors);
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
  });

  test.afterEach(async () => {
    // GATE 13: ZERO_BROWSER_ERROR_GATE
    expect(errors, `Expected 0 unhandled browser errors, got:\n${errors.join('\n')}`).toEqual([]);
  });

  test('1. RESEARCH_MODE_UI_GATE: workspace mode toggle switches between PLAY and RESEARCH with clean overlay isolation', async ({ page }) => {
    // Initial state: PLAY mode
    const playBtn = page.getByTestId('workspace-mode-play');
    const researchBtn = page.getByTestId('workspace-mode-research');

    await expect(playBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(researchBtn).toHaveAttribute('aria-pressed', 'false');

    // ResearchPanel is not rendered
    await expect(page.getByTestId('research-panel')).toBeHidden();

    // Play overlays are rendered
    await expect(page.getByRole('region', { name: 'Solver Controls' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Move History Timeline' })).toBeVisible();

    // Enter Research mode
    await enterResearchMode(page);

    await expect(playBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(researchBtn).toHaveAttribute('aria-pressed', 'true');

    // ResearchPanel is visible
    await expect(page.getByTestId('research-panel')).toBeVisible();

    // Play overlays are hidden in Research mode
    await expect(page.getByRole('region', { name: 'Solver Controls' })).toBeHidden();
    await expect(page.getByRole('region', { name: 'Move History Timeline' })).toBeHidden();
    await expect(page.getByTestId('workspace-mode-switch')).toBeVisible();

    // Return to Play mode
    await returnToPlayMode(page);

    await expect(playBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('research-panel')).toBeHidden();
    await expect(page.getByRole('region', { name: 'Solver Controls' })).toBeVisible();
  });

  test('2. REAL_BENCHMARK_WORKER_GATE: real benchmark Web Worker created in Worker context and executes search', async ({ page }) => {
    await enterResearchMode(page);
    await configureFastSuite(page);

    // Arm worker listener before starting benchmark
    const workerPromise = page.waitForEvent('worker');

    await page.getByTestId('research-run-button').click();

    // Capture the dedicated benchmark worker
    const worker: Worker = await workerPromise;
    expect(worker.url()).toMatch(/benchmark\.worker/);

    // Verify worker execution context (isolated from DOM document)
    const isWorkerContext = await worker.evaluate(() => typeof document === 'undefined');
    expect(isWorkerContext).toBe(true);

    // Wait for completion
    await expect(page.getByTestId('research-status')).toHaveText('Completed', { timeout: 30000 });
  });

  test('3. MAIN_THREAD_ACTIONABILITY_GATE: main thread processes UI interactions while benchmark worker is active', async ({ page }) => {
    await enterResearchMode(page);
    await configureLongCancellationSuite(page);

    await page.getByTestId('research-run-button').click();

    // Observe ACTIVE status
    await expect(page.getByTestId('research-status')).toHaveText('Running benchmark...');

    // Interact with benign enabled control (clicking already-active research button)
    const researchBtn = page.getByTestId('workspace-mode-research');
    await researchBtn.click();

    // Verify main thread processed interaction without error and status remains active
    await expect(researchBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('research-status')).toHaveText('Running benchmark...');

    // Clean up: cancel benchmark
    const cancelBtn = page.getByTestId('research-cancel-button');
    await cancelBtn.scrollIntoViewIfNeeded();
    await cancelBtn.dispatchEvent('click');
    await expect(page.getByTestId('research-status')).toHaveText('Cancelled');
  });

  test('4. BENCHMARK_CANCELLATION_GATE: cancel button terminates active benchmark worker and produces CANCELLED state', async ({ page }) => {
    await enterResearchMode(page);
    await configureLongCancellationSuite(page);

    await page.getByTestId('research-run-button').click();

    // Observe ACTIVE status
    await expect(page.getByTestId('research-status')).toHaveText('Running benchmark...');

    // Click Cancel
    const cancelBtn = page.getByTestId('research-cancel-button');
    await cancelBtn.scrollIntoViewIfNeeded();
    await cancelBtn.dispatchEvent('click');

    // Verify CANCELLED state
    await expect(page.getByTestId('research-status')).toHaveText('Cancelled');
    await expect(page.getByTestId('research-summary')).toBeHidden();
    await expect(page.getByTestId('research-download-json')).toBeHidden();
    await expect(page.getByTestId('research-download-csv')).toBeHidden();

    // Observe for bounded 1s interval to confirm no stale completion arrives
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('research-status')).toHaveText('Cancelled');
    await expect(page.getByTestId('research-summary')).toBeHidden();
  });

  test('5. STATIC_CONFIG_ERROR_GATE: invalid static config triggers validation error and spawns zero workers', async ({ page }) => {
    await enterResearchMode(page);

    // Uncheck all depth checkboxes to create structurally invalid config
    for (let d = 1; d <= 8; d++) {
      const cb = page.getByTestId(`research-checkbox-depth-${d}`);
      if (await cb.isChecked()) {
        await cb.uncheck();
      }
    }

    let workerSpawned = false;
    page.on('worker', () => {
      workerSpawned = true;
    });

    await page.getByTestId('research-run-button').click();

    // Expect static validation error banner
    await expect(page.getByTestId('research-config-error')).toBeVisible();
    await expect(page.getByTestId('research-config-error')).toContainText('exactDepths must be a non-empty array');

    // Status remains Idle and no worker spawned
    await expect(page.getByTestId('research-status')).toHaveText('Idle');
    expect(workerSpawned).toBe(false);
  });

  test('6. WORKER_CONFIG_ERROR_GATE: corpus capacity overflow triggers worker-side CONFIG_ERROR', async ({ page }) => {
    await enterResearchMode(page);

    // Configure depth 1 with 13 cases (canonical capacity is 12)
    await page.getByTestId('research-input-cases-per-depth').fill('13');

    for (let d = 1; d <= 8; d++) {
      const cb = page.getByTestId(`research-checkbox-depth-${d}`);
      const isChecked = await cb.isChecked();
      if (d === 1 && !isChecked) {
        await cb.check();
      } else if (d > 1 && isChecked) {
        await cb.uncheck();
      }
    }

    const workerPromise = page.waitForEvent('worker');
    await page.getByTestId('research-run-button').click();

    // Worker is spawned and fails validation
    await workerPromise;

    await expect(page.getByTestId('research-status')).toHaveText('Error');
    await expect(page.getByTestId('research-worker-error')).toBeVisible();
    await expect(page.getByTestId('research-worker-error')).toContainText('CONFIG_ERROR');
    await expect(page.getByTestId('research-worker-error')).toContainText('exceeds available states');

    await expect(page.getByTestId('research-summary')).toBeHidden();
    await expect(page.getByTestId('research-download-json')).toBeHidden();
  });

  test('7. RESULT_SUMMARY_GATE: completed benchmark renders metadata, per-algorithm summary, and by-depth table', async ({ page }) => {
    await enterResearchMode(page);
    await configureFastSuite(page);

    await page.getByTestId('research-run-button').click();

    await expect(page.getByTestId('research-status')).toHaveText('Completed', { timeout: 30000 });
    await expect(page.getByTestId('research-summary')).toBeVisible();

    // Check metadata cards
    const summary = page.getByTestId('research-summary');
    await expect(summary).toContainText('e2e-browser-fast');
    await expect(summary).toContainText('2'); // Sampled cases
    await expect(summary).toContainText('6'); // Measured trials
    await expect(summary).toContainText('browser');

    // Check by-depth summary table (3 rows for 3 algorithms at depth 1)
    const table = page.getByTestId('research-summary-table');
    await expect(table).toBeVisible();

    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      const row = rows.nth(i);
      await expect(row).toContainText('1'); // Depth 1
      await expect(row).toContainText('2'); // Trials 2
    }
  });

  test('8. JSON_DOWNLOAD_GATE: json export download emits valid BenchmarkReport with exact shape and metadata', async ({ page }) => {
    await enterResearchMode(page);
    await configureFastSuite(page);

    await page.getByTestId('research-run-button').click();
    await expect(page.getByTestId('research-status')).toHaveText('Completed', { timeout: 30000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('research-download-json').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('gearcube-benchmark-e2e-browser-fast.json');

    const stream = await download.createReadStream();
    expect(stream).not.toBeNull();

    const chunks: Buffer[] = [];
    for await (const chunk of stream!) {
      chunks.push(Buffer.from(chunk));
    }
    const jsonStr = Buffer.concat(chunks).toString('utf8');
    const report = JSON.parse(jsonStr);

    expect(String(report.schemaVersion)).toBe('1');
    expect(report.config.suiteId).toBe('e2e-browser-fast');
    expect(report.config.seed).toBe('e2e-browser-fast');
    expect(report.config.exactDepths).toEqual([1]);
    expect(report.config.casesPerDepth).toBe(2);
    expect(report.cases).toHaveLength(2);
    expect(report.trials).toHaveLength(6);
    expect(report.summary.totalCases).toBe(2);
    expect(report.summary.totalTrials).toBe(6);
    expect(report.environment.platform).toBe('browser');
  });

  test('9. CSV_DOWNLOAD_GATE: csv export download emits 14-column tabular trials matching exact schema', async ({ page }) => {
    await enterResearchMode(page);
    await configureFastSuite(page);

    await page.getByTestId('research-run-button').click();
    await expect(page.getByTestId('research-status')).toHaveText('Completed', { timeout: 30000 });

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('research-download-csv').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('gearcube-benchmark-e2e-browser-fast.csv');

    const stream = await download.createReadStream();
    expect(stream).not.toBeNull();

    const chunks: Buffer[] = [];
    for await (const chunk of stream!) {
      chunks.push(Buffer.from(chunk));
    }
    const csvStr = Buffer.concat(chunks).toString('utf8');
    const lines = csvStr.split(/\r?\n/).filter((l) => l.trim().length > 0);

    // Exact header line
    expect(lines[0]).toBe(
      'schemaVersion,suiteId,seed,caseId,exactDepth,algorithm,repetitionIndex,status,solutionDepth,solutionMoves,nodesExpanded,nodesGenerated,limitReason,elapsedMs'
    );

    // 1 header + 6 measured trials = 7 lines
    expect(lines).toHaveLength(7);

    for (let i = 1; i <= 6; i++) {
      const cols = lines[i].split(',');
      expect(cols).toHaveLength(14);
      expect(cols[0]).toBe('1'); // schemaVersion
      expect(cols[1]).toBe('e2e-browser-fast'); // suiteId
    }
  });

  test('10. PLAY_RESEARCH_ISOLATION_GATE: play session state, history, and canvas visual state preserved across research lifecycle', async ({ page }) => {
    // 1. Switch to DIRECT_180 and perform 2 moves: U+ and R+
    await page.getByRole('button', { name: /Direct 180° turn mode/ }).click();

    await page.getByRole('button', { name: /^U Clockwise/ }).click();
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();

    await page.getByRole('button', { name: /^R Clockwise/ }).click();
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toBeVisible();

    // Settle move animation (400ms duration)
    await page.waitForTimeout(500);

    // Before Research: verify logical state
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toHaveAttribute('aria-current', 'step');
    await expect(page.getByRole('button', { name: 'Direct 180° turn mode: ON' })).toBeVisible();

    // Capture PRE raw WebGL canvas bitmap (direct HTMLCanvasElement capture, excluding all HTML overlays)
    const preCapture = await captureRawCanvasBitmap(page);

    // 2. Enter Research mode
    await page.getByTestId('workspace-mode-research').click();
    await expect(page.getByTestId('research-panel')).toBeVisible();

    // 3. Attempt keyboard moves & undo while in Research mode
    await page.keyboard.press('u');
    await page.keyboard.press('Control+z');

    // 4. Run benchmark in Research mode
    await configureFastSuite(page);
    await page.getByTestId('research-run-button').click();
    await expect(page.getByTestId('research-status')).toHaveText('Completed', { timeout: 30000 });

    // 5. Return to Play mode
    await page.getByTestId('workspace-mode-play').click();
    await expect(page.getByTestId('research-panel')).toBeHidden();

    // Settle move animation / state transitions
    await page.waitForTimeout(500);

    // Verify history, cursor, and mode are completely unchanged
    await expect(page.getByRole('button', { name: 'Step 1: U+' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Step 3:/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Step 2: R+' })).toHaveAttribute('aria-current', 'step');
    await expect(page.getByRole('button', { name: 'Direct 180° turn mode: ON' })).toBeVisible();

    // Capture POST raw WebGL canvas bitmap
    const postCapture = await captureRawCanvasBitmap(page);

    // Compare raw WebGL canvas captures
    const result = await compareRawCanvasCaptures(page, preCapture, postCapture);

    // Non-triviality gate
    expect(result.width, 'Raw canvas width must be > 0').toBeGreaterThan(0);
    expect(result.height, 'Raw canvas height must be > 0').toBeGreaterThan(0);
    expect(result.preNonUniformPixelCount, 'Pre capture must contain non-uniform rendered 3D cube pixels').toBeGreaterThan(0);
    expect(result.postNonUniformPixelCount, 'Post capture must contain non-uniform rendered 3D cube pixels').toBeGreaterThan(0);

    // Exact equality gate
    expect(result.sameDimensions, 'Raw canvas dimensions must be identical').toBe(true);
    expect(result.differingPixels, `Expected 0 differing decoded raw canvas pixels, got ${result.differingPixels} with max channel delta ${result.maxChannelDelta}`).toBe(0);
    expect(result.maxChannelDelta, 'Decoded max channel delta must be 0').toBe(0);
    expect(result.diffBoundingBox, 'Diff bounding box must be null').toBeNull();
  });

  test('11. MODE_SWITCH_CANCELLATION_GATE: switching to PLAY while benchmark is active cancels worker execution', async ({ page }) => {
    await enterResearchMode(page);
    await configureLongCancellationSuite(page);

    await page.getByTestId('research-run-button').click();
    await expect(page.getByTestId('research-status')).toHaveText('Running benchmark...');

    // Switch to PLAY while benchmark is active
    await page.getByTestId('workspace-mode-play').click();
    await expect(page.getByTestId('research-panel')).toBeHidden();

    // Re-enter Research mode
    await enterResearchMode(page);

    // Status is CANCELLED and no summary is rendered
    await expect(page.getByTestId('research-status')).toHaveText('Cancelled');
    await expect(page.getByTestId('research-summary')).toBeHidden();
    await expect(page.getByTestId('research-download-json')).toBeHidden();
  });

  test('12. RESPONSIVE_RESEARCH_LAYOUT_GATE: research panel and mode switch adapt to desktop, tablet, and mobile without overflow or overlap', async ({ page }) => {
    const viewports = [
      { width: 1280, height: 800 },
      { width: 768, height: 1024 },
      { width: 375, height: 667 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto('/');
      await expect(page.locator('canvas')).toBeVisible();

      await enterResearchMode(page);

      // Verify no page-level horizontal overflow
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

      // Verify critical controls are visible/scrollable
      const panel = page.getByTestId('research-panel');
      await expect(panel).toBeVisible();

      const runBtn = page.getByTestId('research-run-button');
      await runBtn.scrollIntoViewIfNeeded();
      await expect(runBtn).toBeVisible();

      // For mobile 375x667, return to PLAY and verify mode switch and top overlay bar do not overlap
      if (vp.width === 375) {
        await returnToPlayMode(page);

        const switchBox = await page.getByTestId('workspace-mode-switch').boundingBox();
        const topBarBox = await page.locator('.top-overlay-bar').boundingBox();

        expect(switchBox).not.toBeNull();
        expect(topBarBox).not.toBeNull();

        const overlap = rectsOverlap(switchBox!, topBarBox!);
        expect(overlap, 'Workspace mode switch and top-overlay-bar must not overlap in PLAY mode at mobile portrait').toBe(false);
      }
    }
  });
});
