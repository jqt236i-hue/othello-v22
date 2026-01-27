const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1000, height: 1000 } });
  const page = await context.newPage();
  page.on('console', m => console.log('[PAGE_CONSOLE]', m.type(), m.text()));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');

  await page.evaluate(() => { gameState.board[4][4] = 1; if (typeof emitBoardUpdate === 'function') emitBoardUpdate(); });
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => { const sel = '.cell[data-row="4"][data-col="4"] .disc'; const el = document.querySelector(sel); return { classes: el ? Array.from(el.classList || []) : null }; });
  console.log('before apply:', before);

  await page.evaluate(() => {
    const sel = '.cell[data-row="4"][data-col="4"] .disc';
    const el = document.querySelector(sel);
    if (el && typeof applyStoneVisualEffect === 'function') {
      applyStoneVisualEffect(el, 'breedingStone', { owner: 1 });
    }
  });

  await page.waitForTimeout(400);
  const after = await page.evaluate(() => { const sel = '.cell[data-row="4"][data-col="4"] .disc'; const el = document.querySelector(sel); return { classes: el ? Array.from(el.classList || []) : null, cssVar: el ? el.style.getPropertyValue('--special-stone-image').trim() : '' }; });
  console.log('after apply:', after);
  await browser.close();
})();