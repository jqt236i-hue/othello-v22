const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('[PAGE]', msg.type(), msg.text()));

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');

  // Click a legal cell to ensure placement works
  const legal = await page.$('#board .cell.legal');
  if (!legal) {
    console.error('No legal cell found');
  } else {
    await legal.click();
    await page.waitForTimeout(200);
    console.log('Clicked legal cell — done');
  }

  // Now enable debug mode and run visual test
  const debugBtn = await page.$('#debugModeBtn');
  if (debugBtn) {
    await debugBtn.click();
    await page.waitForTimeout(120);
    const visBtn = await page.$('#visualTestBtn');
    if (visBtn) {
      await visBtn.click();
      await page.waitForTimeout(400);
      const specialCount = await page.$$eval('.disc.special-stone', els => els.length);
      const beforeBg = await page.$eval('.disc.special-stone', el => getComputedStyle(el, '::before').getPropertyValue('background-image'));
      const inlineBg = await page.$eval('.disc.special-stone', el => el.style.backgroundImage || '');
      console.log('specialCount=', specialCount);
      console.log('beforeBg=', beforeBg);
      console.log('inlineBg=', inlineBg);
    }
  }

  await browser.close();
})();