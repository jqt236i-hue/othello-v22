const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext();
  const p = await c.newPage();
  p.on('console', msg => console.log('[PAGE]', msg.type(), msg.text()));
  await p.goto('http://127.0.0.1:8000/index.html', { waitUntil: 'networkidle' });
  await p.waitForSelector('#board');
  await p.evaluate(() => { document.querySelector('#debugModeBtn') && document.querySelector('#debugModeBtn').click(); });
  await p.waitForTimeout(120);
  await p.evaluate(() => { document.querySelector('#visualTestBtn') && document.querySelector('#visualTestBtn').click(); });
  await p.waitForTimeout(400);

  const sel = '.cell[data-row="3"][data-col="0"] .disc';
  const res = await p.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { error: 'missing disc' };
    try {
      applyStoneVisualEffect(el, 'ultimateDragon', { owner: 1 });
      return { class: el.className, before: getComputedStyle(el, '::before').getPropertyValue('background-image'), inline: el.style.backgroundImage || '' };
    } catch (e) {
      return { error: e && e.message };
    }
  }, sel);

  console.log('after manual apply:', res);
  await b.close();
})();