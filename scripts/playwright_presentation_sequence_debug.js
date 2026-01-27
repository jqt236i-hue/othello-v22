const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1000, height: 1000 } });
  const page = await context.newPage();
  page.on('console', msg => console.log('[PAGE_CONSOLE]', msg.type(), msg.text()));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');

  await page.evaluate(() => {
    const precomputed = { spawned: [{ row: 4, col: 4 }], flipped: [], destroyed: [], anchors: [] };
    if (typeof processBreedingImmediateAtPlacement === 'function') {
      processBreedingImmediateAtPlacement(1, 2, 2, precomputed);
    }
    if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
  });

  const selector = '.cell[data-row="4"][data-col="4"] .disc';
  for (const t of [0, 200, 500, 1000, 1500, 2000]) {
    await new Promise(r => setTimeout(r, t === 0 ? 0 : t));
    const res = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return { classes: null };
      return { classes: Array.from(el.classList || []) };
    }, selector);
    console.log('t=' + t + 'ms', res);
  }

  await browser.close();
})();