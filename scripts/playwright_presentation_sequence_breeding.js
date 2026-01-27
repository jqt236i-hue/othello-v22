const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch').default || require('pixelmatch');
const VISUAL_THRESHOLD = parseFloat(process.env.VISUAL_THRESHOLD) || 0.15;
const MAX_ALLOWED_MISMATCHES = parseInt(process.env.MAX_ALLOWED_MISMATCHES) || 75;

(async () => {
  const baselineDir = path.resolve(__dirname, '..', 'artifacts', 'visual_presentation');
  if (!fs.existsSync(baselineDir)) fs.mkdirSync(baselineDir, { recursive: true });
  const baselinePath = path.join(baselineDir, 'breeding_sequence_baseline.png');
  const diffPath = path.join(baselineDir, 'breeding_sequence_diff.png');

  const MAX_ATTEMPTS = 3;
  const WAIT_PER_ATTEMPT = 3000; // ms
  const POLL_INTERVAL = 200; // ms
  const MAX_ALLOWED_MISMATCHES = 50; // pixels allowed for transient variation

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1000, height: 1000 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('[PAGE_CONSOLE]', msg.type(), msg.text()));

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');

  const spawnSelector = '.cell[data-row="4"][data-col="4"] .disc';

  // Helper: deterministically prepare board and attempt to apply visual
  async function deterministicApply() {
    await page.evaluate(() => {
      const r = 4, c = 4;
      gameState.board[r][c] = 1;
      if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
    });

    await page.evaluate(() => {
      const r = 4, c = 4;
      const sel = `.cell[data-row="${r}"][data-col="${c}"] .disc`;
      const el = document.querySelector(sel);
      if (el) {
        // transient spawn marker
        el.classList.add('breeding-spawn');
        setTimeout(() => { try { el.classList.remove('breeding-spawn'); } catch (e) {} }, 300);
        if (typeof applyStoneVisualEffect === 'function') applyStoneVisualEffect(el, 'breedingStone', { owner: 1 });
      }
      if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
    });
  }

  // Helper: wait for DOM condition (class presence or css var indicating breeding asset)
  async function waitForFinalVisual(timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ok = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const classes = Array.from(el.classList || []);
        if (classes.includes('special-stone') || classes.some(c => c.indexOf('breeding') !== -1)) return true;
        const bg = window.getComputedStyle(el).getPropertyValue('--stone-image') || '';
        if (bg.indexOf('BREEDING') !== -1 || bg.indexOf('breeding') !== -1) return true;
        return false;
      }, spawnSelector);
      if (ok) return true;
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }
    return false;
  }

  // Helper: capture screenshot and compare (returns {ok, mismatches, diffPath, screenshotPath})
  async function captureAndCompare(tag) {
    const boardEl = await page.$('#board');
    if (!boardEl) throw new Error('Board element not found');
    const buffer = await boardEl.screenshot({ type: 'png' });

    const screenshotPath = path.join(baselineDir, `breeding_sequence_attempt_${tag}.png`);
    fs.writeFileSync(screenshotPath, buffer);

    if (!fs.existsSync(baselinePath)) {
      fs.writeFileSync(baselinePath, buffer);
      console.log('Sequence baseline image created at:', baselinePath);
      console.log('Please review and commit this baseline. Exiting with code 2 to indicate baseline created.');
      await browser.close();
      process.exit(2);
    }

    const baselinePng = PNG.sync.read(fs.readFileSync(baselinePath));
    const currPng = PNG.sync.read(buffer);

    if (baselinePng.width !== currPng.width || baselinePng.height !== currPng.height) {
      return { ok: false, error: 'Dimension mismatch', screenshotPath };
    }

    const { width, height } = baselinePng;
    const diff = new PNG({ width, height });
    const mismatches = pixelmatch(baselinePng.data, currPng.data, diff.data, width, height, { threshold: VISUAL_THRESHOLD });

    if (mismatches > 0) {
      const attemptDiffPath = path.join(baselineDir, `breeding_sequence_diff_${tag}.png`);
      fs.writeFileSync(attemptDiffPath, PNG.sync.write(diff));
      return { ok: mismatches <= MAX_ALLOWED_MISMATCHES, mismatches, diffPath: attemptDiffPath, screenshotPath };
    }

    return { ok: true, mismatches: 0, screenshotPath };
  }

  // Try a few attempts: apply -> wait -> compare. If DOM indicates success and visual compare within tolerance, succeed.
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`Attempt ${attempt}/${MAX_ATTEMPTS}: applying deterministic visuals`);
    await deterministicApply();

    const settled = await waitForFinalVisual(WAIT_PER_ATTEMPT);
    if (!settled) console.warn(`Attempt ${attempt}: final visual did NOT settle within ${WAIT_PER_ATTEMPT}ms`);
    else console.log(`Attempt ${attempt}: final visual detected via DOM`);

    const result = await captureAndCompare(attempt);
    if (result.ok) {
      console.log(`Sequence visual check OK on attempt ${attempt}. Mismatches: ${result.mismatches || 0}`);
      await browser.close();
      process.exit(0);
    } else {
      console.warn(`Attempt ${attempt} visual check failed.`, result);
      // small delay before retry
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.error('Sequence visual check FAILED after attempts. See artifacts under', baselineDir);
  await browser.close();
  process.exit(1);
})();