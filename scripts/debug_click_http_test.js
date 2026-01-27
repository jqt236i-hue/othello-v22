const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const base = process.env.BASE_URL || 'http://127.0.0.1:8000';
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 600, height: 1200 } });
  const page = await context.newPage();
  page.on('console', msg => console.log('[PAGE]', msg.type(), msg.text()));

  await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');

  // Try click a legal cell selector first
  let clicked = false;
  const legal = await page.$('#board .cell.legal');
  if (legal) {
    try {
      await legal.evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })));
      await page.waitForTimeout(200);
      console.log('Clicked legal cell (dispatched) — done');
      clicked = true;
    } catch (e) {
      console.warn('Dispatch click failed, falling back to elementHandle.click with force', e && e.message);
      await legal.click({ force: true });
      await page.waitForTimeout(200);
      console.log('Clicked legal cell (force) — done');
      clicked = true;
    }
  }

  // If clicking .cell.legal didn't work, query game logic for an explicit legal move and click its cell
  if (!clicked) {
    const move = await page.evaluate(() => {
      try {
        const context = (typeof CardLogic !== 'undefined') ? CardLogic.getCardContext(cardState) : {};
        const moves = (typeof getLegalMoves === 'function') ? getLegalMoves(gameState, gameState.currentPlayer, context) : [];
        return moves && moves.length ? moves[0] : null;
      } catch (e) { return null; }
    });
    if (move && typeof move.row === 'number' && typeof move.col === 'number') {
      const sel = `.cell[data-row="${move.row}"][data-col="${move.col}"]`;
      const cell = await page.$(sel);
      if (cell) {
        await cell.evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })));
        await page.waitForTimeout(200);
        console.log('Clicked move from getLegalMoves:', move);
        clicked = true;
      }
    } else {
      console.error('No legal move found via getLegalMoves either');
    }
  }

  // Enable debug mode and run visual test
  const debugBtn = await page.$('#debugModeBtn');
  if (debugBtn) {
    await debugBtn.click();
    await page.waitForTimeout(160);
    const visBtn = await page.$('#visualTestBtn');
    if (visBtn) {
      await visBtn.click();
      await page.waitForTimeout(400);
      const specialCount = await page.$$eval('.disc.special-stone', els => els.length);
      console.log('specialCount=', specialCount);
      let beforeBg = '';
      let inlineBg = '';
      if (specialCount > 0) {
        try {
          beforeBg = await page.$eval('.disc.special-stone', el => getComputedStyle(el, '::before').getPropertyValue('background-image'));
          inlineBg = await page.$eval('.disc.special-stone', el => el.style.backgroundImage || '');
        } catch (e) { console.warn('Failed to read backgrounds', e && e.message); }
      } else {
        console.warn('No .disc.special-stone elements found after visualTest');
      }
      console.log('beforeBg=', beforeBg);
      console.log('inlineBg=', inlineBg);

      // Save screenshot
      const board = await page.$('#board');
      const outDir = path.resolve(__dirname, '..', 'artifacts');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const screenshotPath = path.join(outDir, 'http_debug_test.png');
      await board.screenshot({ path: screenshotPath });
      console.log('Saved screenshot to', screenshotPath);
    }
  }

  await browser.close();
})();