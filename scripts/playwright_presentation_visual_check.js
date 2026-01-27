const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch').default || require('pixelmatch');
const VISUAL_THRESHOLD = parseFloat(process.env.VISUAL_THRESHOLD) || 0.15;
const TOLERATED_PIXELS = parseInt(process.env.TOLERATED_PIXELS) || 100;

(async () => {
  const baselineDir = path.resolve(__dirname, '..', 'artifacts', 'visual_presentation');
  if (!fs.existsSync(baselineDir)) fs.mkdirSync(baselineDir, { recursive: true });
  const baselinePath = path.join(baselineDir, 'breeding_baseline.png');
  const diffPath = path.join(baselineDir, 'breeding_diff.png');

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1000, height: 1000 } });
  const page = await context.newPage();
  page.on('console', msg => console.log('[PAGE_CONSOLE]', msg.type(), msg.text()));

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');

  // Queue breedingStone visual at the spawn cell (4,4) and trigger board update
  await page.evaluate(() => {
    const r = 4, c = 4;
    gameState.board[r][c] = 1;
    cardState.presentationEvents = cardState.presentationEvents || [];
    cardState.presentationEvents.push({ type: 'CROSSFADE_STONE', row: r, col: c, effectKey: 'breedingStone', owner: 1, durationMs: 600 });
    if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
  });

  // Wait for presentation handling: wait for two consecutive identical board snapshots (accounts for transitions/paints)
  await page.waitForFunction(() => {
    const board = document.querySelector('#board');
    if (!board) return false;

    const cells = Array.from(board.querySelectorAll('.cell')).map(c => {
      // Include disc classes and transform/background-image to detect visual changes
      const disc = c.querySelector('.disc');
      if (!disc) return 'empty';
      const cs = window.getComputedStyle(disc);
      return [disc.className, disc.style.transform || '', cs.backgroundImage || '', cs.opacity || ''].join('|');
    }).join('||');

    const prev = window.__visual_check_last_snapshot;
    window.__visual_check_last_snapshot = cells;
    if (prev && prev === cells) {
      window.__visual_check_last_snapshot = null;
      return true;
    }
    return false;
  }, { timeout: 3000 });
  // Short settle margin
  await page.waitForTimeout(160);

  // Capture board element screenshot
  const boardEl = await page.$('#board');
  if (!boardEl) {
    console.error('Board element not found');
    await browser.close();
    process.exit(1);
  }
  // Take screenshot attempts with retry to reduce flake due to timing/AA issues
  if (!fs.existsSync(baselinePath)) {
    const bufferFirst = await boardEl.screenshot({ type: 'png' });
    fs.writeFileSync(baselinePath, bufferFirst);
    console.log('Baseline image created at:', baselinePath);
    console.log('Please review and commit this baseline. Exiting with code 2 to indicate baseline created.');
    await browser.close();
    process.exit(2);
  }

  const baselinePng = PNG.sync.read(fs.readFileSync(baselinePath));
  const { width, height } = baselinePng;

  const MAX_ATTEMPTS = 3;
  let lastMismatches = null;
  let lastDiffBuffer = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Stabilize and capture
    // wait for two consecutive identical snapshots already done above
    const buffer = await boardEl.screenshot({ type: 'png' });
    const currPng = PNG.sync.read(buffer);

    if (baselinePng.width !== currPng.width || baselinePng.height !== currPng.height) {
      console.error('Baseline and current screenshot dimensions differ');
      await browser.close();
      process.exit(1);
    }

    const diff = new PNG({ width, height });
    const mismatches = pixelmatch(baselinePng.data, currPng.data, diff.data, width, height, { threshold: VISUAL_THRESHOLD });

    if (mismatches === 0) {
      console.log('Visual check OK: no mismatches (attempt', attempt + ')');
      await browser.close();
      process.exit(0);
    }

    lastMismatches = mismatches;
    lastDiffBuffer = PNG.sync.write(diff);

    console.warn('Attempt', attempt, 'mismatches:', mismatches);
    if (attempt < MAX_ATTEMPTS) {
      await page.waitForTimeout(160);
    }
  }

  // After retries, accept small mismatches as tolerated to reduce CI flakiness
  const TOLERATED_PIXELS = 100;
  if (lastMismatches !== null && lastMismatches <= TOLERATED_PIXELS) {
    fs.writeFileSync(diffPath, lastDiffBuffer);
    console.warn('Visual small mismatch tolerated:', lastMismatches, 'pixels. Diff saved to', diffPath);
    await browser.close();
    process.exit(0);
  }

  if (lastDiffBuffer) fs.writeFileSync(diffPath, lastDiffBuffer);
  console.error('Visual mismatch detected:', lastMismatches, 'pixels. Diff saved to', diffPath);
  await browser.close();
  process.exit(1);
})();