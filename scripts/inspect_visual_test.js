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

  const specials = await p.evaluate(() => (cardState && cardState.specialStones) ? cardState.specialStones.slice(0, 50) : []);
  console.log('cardState.specialStones (sample):', JSON.stringify(specials, null, 2));

  const coords = [[3,0],[3,1],[5,0],[5,1],[7,0],[7,1],[4,0],[4,1]];
  for (const [r,c] of coords) {
    const sel = `.cell[data-row="${r}"][data-col="${c}"] .disc`;
    const res = await p.$eval(sel, el => ({ class: el.className, dataset: el.dataset, inner: el.innerHTML })).catch(e => ({ error: e && e.message }));
    console.log(sel, res);
  }

  await b.close();
})();