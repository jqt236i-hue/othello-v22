const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1000, height: 1000 } });
  const page = await context.newPage();
  page.on('console', m => console.log('[PAGE_CONSOLE]', m.type(), m.text()));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');

  await page.evaluate(() => {
    const precomputed = { spawned: [{ row: 4, col: 4 }], flipped: [], destroyed: [], anchors: [] };
    if (typeof processBreedingImmediateAtPlacement === 'function') processBreedingImmediateAtPlacement(1, 2, 2, precomputed);
    if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
  });

  await page.waitForTimeout(1800);

  const res = await page.evaluate(() => {
    const sel = '.cell[data-row="4"][data-col="4"] .disc';
    const el = document.querySelector(sel);
    if (!el) return { classes: null, cssVar: '', img: false };
    return { classes: Array.from(el.classList || []), cssVar: el.style.getPropertyValue('--special-stone-image').trim(), img: !!(el && el.querySelector('.special-stone-img')) };
  });

  console.log('INSPECT:', res);
  await browser.close();
})();