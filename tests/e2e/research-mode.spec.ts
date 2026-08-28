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

    // Capture the dedicated benchmark worker and verify worker script URL
    const worker: Worker = await workerPromise;
    expect(worker.url()).toMatch(/benchmark\.worker/);

    // Wait for completion
    await expect(page.getByTestId('research-status')).toHaveText('Completed', { timeout: 30000 });
  });

  test('3. MAIN_THREAD_ACTIONABILITY_GATE: main thread processes UI interactions while benchmark worker is active', async ({ page }) => {
    await enterResearchMode(page);
    await configureLongCancellationSuite(page);

    // Arm worker listener before starting long-running benchmark
    const workerPromise = page.waitForEvent('worker');

    // Register a one-shot click listener on the research button to verify main-thread event processing
    const researchBtn = page.getByTestId('workspace-mode-research');
    await researchBtn.evaluate((element) => {
      element.addEventListener(
        'click',
        () => {
          element.setAttribute('data-e2e-click-observed', 'true');
        },
        { once: true }
      );
    });

    await page.getByTestId('research-run-button').click();

    // Observe ACTIVE status
    await expect(page.getByTestId('research-status')).toHaveText('Running benchmark...');

    // Capture the dedicated benchmark worker and verify isolated execution context while actively running
    const worker: Worker = await workerPromise;
    expect(worker.url()).toMatch(/benchmark\.worker/);

    const isWorkerContext = await worker.evaluate(() => typeof document === 'undefined');
    expect(isWorkerContext).toBe(true);

    // Perform a real Playwright pointer click to prove main-thread interaction
    await researchBtn.click();

    // Require observable DOM effect: click event was received and processed on main thread
    await expect(researchBtn).toHaveAttribute('data-e2e-click-observed', 'true');

    // Require benchmark is STILL ACTIVE on the Worker thread
    await expect(page.getByTestId('research-status')).toHaveText('Running benchmark...');

    // Clean up: cancel benchmark using real click
    const cancelBtn = page.getByTestId('research-cancel-button');
    await cancelBtn.click();
    await expect(page.getByTestId('research-status')).toHaveText('Cancelled');
  });

  test('4. BENCHMARK_CANCELLATION_GATE: cancel button terminates active benchmark worker and produces CANCELLED state', async ({ page }) => {
    await enterResearchMode(page);
    await configureLongCancellationSuite(page);

    // Track total benchmark workers created throughout test lifecycle
    let totalBenchmarkWorkersCreated = 0;
    page.on('worker', (w) => {
      if (w.url().includes('benchmark.worker')) {
        totalBenchmarkWorkersCreated++;
      }
    });

    // Arm worker creation listener before starting benchmark
    const workerPromise = page.waitForEvent('worker');

    await page.getByTestId('research-run-button').click();

    // Capture benchmark worker and verify URL identity
    const worker: Worker = await workerPromise;
    expect(worker.url()).toMatch(/benchmark\.worker/);

    // Observe ACTIVE status
    await expect(page.getByTestId('research-status')).toHaveText('Running benchmark...');

    // Arm worker close observation before triggering cancel
    const workerClosedPromise = new Promise<void>((resolve) => {
      worker.once('close', () => resolve());
    });

    // Click Cancel via real Playwright click
    const cancelBtn = page.getByTestId('research-cancel-button');
    await cancelBtn.click();

    // Verify CANCELLED state
    await expect(page.getByTestId('research-status')).toHaveText('Cancelled');
    await expect(page.getByTestId('research-summary')).toBeHidden();
    await expect(page.getByTestId('research-download-json')).toBeHidden();
    await expect(page.getByTestId('research-download-csv')).toBeHidden();

    // Await Worker termination/close event
    await workerClosedPromise;

    // Verify page.workers() contains no live benchmark Worker
    const liveBenchmarkWorkers = page.workers().filter((w) => w === worker || w.url().includes('benchmark.worker'));
    expect(liveBenchmarkWorkers).toHaveLength(0);

    // Observe for bounded 1s interval to confirm no stale completion arrives
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('research-status')).toHaveText('Cancelled');
    await expect(page.getByTestId('research-summary')).toBeHidden();

    // Verify exactly 1 benchmark worker was created (no restart / replacement Worker B)
    expect(totalBenchmarkWorkersCreated, 'Exactly 1 benchmark worker must be created throughout cancellation lifecycle').toBe(1);
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
    const worker = await workerPromise;
    expect(worker.url()).toMatch(/benchmark\.worker/);

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

    // Check exact metadata cards
    const summary = page.getByTestId('research-summary');
    const suiteCard = summary.locator('.meta-card', { hasText: 'Suite ID' });
    await expect(suiteCard.locator('.meta-value')).toHaveText('e2e-browser-fast');

    const casesCard = summary.locator('.meta-card', { hasText: 'Sampled Cases' });
    await expect(casesCard.locator('.meta-value')).toHaveText('2');

    const trialsCard = summary.locator('.meta-card', { hasText: 'Measured Trials' });
    await expect(trialsCard.locator('.meta-value')).toHaveText('6');

    const platformCard = summary.locator('.meta-card', { hasText: 'Platform' });
    await expect(platformCard.locator('.meta-value')).toHaveText('browser');

    // Check all algorithm representations exist in cards
    const algCards = summary.locator('.alg-summary-card');
    await expect(algCards).toHaveCount(3);
    await expect(summary.locator('.alg-summary-title', { hasText: /Breadth-First Search/ })).toBeVisible();
    await expect(summary.locator('.alg-summary-title', { hasText: /Bidirectional BFS/ })).toBeVisible();
    await expect(summary.locator('.alg-summary-title', { hasText: /IDA\*/ })).toBeVisible();

    // Check by-depth summary table (3 rows for 3 algorithms at depth 1)
    const table = page.getByTestId('research-summary-table');
    await expect(table).toBeVisible();

    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(3);

    // BFS row verification
    const bfsRow = rows.filter({ hasText: /Breadth-First Search/ });
    await expect(bfsRow).toHaveCount(1);
    await expect(bfsRow.locator('td').nth(1)).toHaveText('1'); // Depth
    await expect(bfsRow.locator('td').nth(2)).toHaveText('2'); // Trials
    await expect(bfsRow.locator('td').nth(3)).toHaveText('2'); // Solved
    await expect(bfsRow.locator('td').nth(4)).toHaveText('0'); // Limits

    // Bidirectional BFS row verification
    const bibfsRow = rows.filter({ hasText: /Bidirectional BFS/ });
    await expect(bibfsRow).toHaveCount(1);
    await expect(bibfsRow.locator('td').nth(1)).toHaveText('1'); // Depth
    await expect(bibfsRow.locator('td').nth(2)).toHaveText('2'); // Trials
    await expect(bibfsRow.locator('td').nth(3)).toHaveText('2'); // Solved
    await expect(bibfsRow.locator('td').nth(4)).toHaveText('0'); // Limits

    // IDA* row verification
    const idaRow = rows.filter({ hasText: /IDA\*/ });
    await expect(idaRow).toHaveCount(1);
    await expect(idaRow.locator('td').nth(1)).toHaveText('1'); // Depth
    await expect(idaRow.locator('td').nth(2)).toHaveText('2'); // Trials
    await expect(idaRow.locator('td').nth(3)).toHaveText('2'); // Solved
    await expect(idaRow.locator('td').nth(4)).toHaveText('0'); // Limits
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

    // Arm worker creation listener before starting benchmark
    const workerPromise = page.waitForEvent('worker');

    await page.getByTestId('research-run-button').click();

    // Capture benchmark worker and verify URL identity
    const worker: Worker = await workerPromise;
    expect(worker.url()).toMatch(/benchmark\.worker/);

    // Observe ACTIVE status
    await expect(page.getByTestId('research-status')).toHaveText('Running benchmark...');

    // Arm worker close observation before triggering mode switch
    const workerClosedPromise = new Promise<void>((resolve) => {
      worker.once('close', () => resolve());
    });

    // Switch to PLAY while benchmark is active via real click
    await page.getByTestId('workspace-mode-play').click();
    await expect(page.getByTestId('research-panel')).toBeHidden();

    // Await Worker termination/close event
    await workerClosedPromise;

    // Verify page.workers() contains no live benchmark Worker
    const liveBenchmarkWorkers = page.workers().filter((w) => w === worker || w.url().includes('benchmark.worker'));
    expect(liveBenchmarkWorkers).toHaveLength(0);

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

      // A. Document and body horizontal overflow verification
      const { docScrollWidth, docClientWidth, bodyScrollWidth } = await page.evaluate(() => ({
        docScrollWidth: document.documentElement.scrollWidth,
        docClientWidth: document.documentElement.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
      }));
      expect(docScrollWidth).toBeLessThanOrEqual(docClientWidth);
      expect(bodyScrollWidth).toBeLessThanOrEqual(docClientWidth);

      // B. Workspace mode switch bounds verification
      const switchBox = await page.getByTestId('workspace-mode-switch').boundingBox();
      expect(switchBox).not.toBeNull();
      expect(switchBox!.x).toBeGreaterThanOrEqual(0);
      expect(switchBox!.y).toBeGreaterThanOrEqual(0);
      expect(switchBox!.x + switchBox!.width).toBeLessThanOrEqual(vp.width);
      expect(switchBox!.y + switchBox!.height).toBeLessThanOrEqual(vp.height);

      // C. Research panel horizontal bounds verification
      const panel = page.getByTestId('research-panel');
      const panelBox = await panel.boundingBox();
      expect(panelBox).not.toBeNull();
      expect(panelBox!.x).toBeGreaterThanOrEqual(0);
      expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(vp.width);

      // D. Essential control actionability verification (using trial click)
      const suiteInput = page.getByTestId('research-input-suite-id');
      await suiteInput.scrollIntoViewIfNeeded();
      await suiteInput.click({ trial: true });

      const depth1Cb = page.getByTestId('research-checkbox-depth-1');
      await depth1Cb.scrollIntoViewIfNeeded();
      await depth1Cb.click({ trial: true });

      const bfsCb = page.getByTestId('research-checkbox-algo-BFS');
      await bfsCb.scrollIntoViewIfNeeded();
      await bfsCb.click({ trial: true });

      const runBtn = page.getByTestId('research-run-button');
      await runBtn.scrollIntoViewIfNeeded();
      await runBtn.click({ trial: true });

      const activeResearchBtn = page.getByTestId('workspace-mode-research');
      await activeResearchBtn.scrollIntoViewIfNeeded();
      await activeResearchBtn.click({ trial: true });

      // E. Mobile portrait: verify mode switch and top overlay bar do not overlap in PLAY mode
      if (vp.width === 375) {
        await returnToPlayMode(page);

        const playSwitchBox = await page.getByTestId('workspace-mode-switch').boundingBox();
        const topBarBox = await page.locator('.top-overlay-bar').boundingBox();

        expect(playSwitchBox).not.toBeNull();
        expect(topBarBox).not.toBeNull();

        const overlap = rectsOverlap(playSwitchBox!, topBarBox!);
        expect(overlap, 'Workspace mode switch and top-overlay-bar must not overlap in PLAY mode at mobile portrait').toBe(false);
      }
    }
  });

  test('13. PUBLIC_READINESS_HYGIENE_GATE: favicon loads and Research checkbox form semantics are stable', async ({ page }) => {
    // A. Favicon link element verification
    const iconLinks = page.locator('link[rel~="icon"]');
    await expect(iconLinks).toHaveCount(1);

    const iconType = await iconLinks.getAttribute('type');
    expect(iconType).toBe('image/svg+xml');

    const iconHref = await iconLinks.getAttribute('href');
    expect(iconHref).toBe('/favicon.svg');

    // B. Direct HTTP retrieval of the resolved favicon asset
    const response = await page.request.get(iconHref!);
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('image/svg+xml');

    // C. Form semantics verification in Research Mode
    await enterResearchMode(page);

    // 1. Depth checkboxes 1..8
    for (let depth = 1; depth <= 8; depth++) {
      const depthCb = page.locator(`#research-depth-${depth}`);
      await expect(depthCb).toHaveCount(1);
      await expect(depthCb).toHaveAttribute('name', 'exactDepths');
      await expect(depthCb).toHaveAttribute('value', String(depth));

      // Accessible visible label verification
      const label = page.locator('label.research-checkbox-label', { has: depthCb });
      await expect(label).toContainText(`Depth ${depth}`);
    }

    // 2. Algorithm checkboxes
    const expectedAlgos = [
      { id: 'research-algorithm-BFS', val: 'BFS', label: 'Breadth-First Search (BFS)' },
      { id: 'research-algorithm-BIDIRECTIONAL_BFS', val: 'BIDIRECTIONAL_BFS', label: 'Bidirectional BFS' },
      { id: 'research-algorithm-IDA_STAR', val: 'IDA_STAR', label: 'IDA*' },
    ];

    for (const alg of expectedAlgos) {
      const algoCb = page.locator(`#${alg.id}`);
      await expect(algoCb).toHaveCount(1);
      await expect(algoCb).toHaveAttribute('name', 'algorithms');
      await expect(algoCb).toHaveAttribute('value', alg.val);

      // Accessible visible label verification
      const label = page.locator('label.research-checkbox-label', { has: algoCb });
      await expect(label).toContainText(alg.label);
    }
  });
});
