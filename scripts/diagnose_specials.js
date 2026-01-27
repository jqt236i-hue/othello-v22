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

  const specialKeys = await p.evaluate(() => (cardState && cardState.specialStones) ? cardState.specialStones.map(s => `${s.row},${s.col}`) : []);
  const cellKeys = await p.evaluate(() => Array.from(document.querySelectorAll('.cell')).map(c => `${c.dataset.row},${c.dataset.col}`));
  console.log('specialKeys:', specialKeys.join('|'));
  console.log('cellKeys sample:', cellKeys.slice(0, 20).join('|'));

  // Check mapping per special
  const mapping = await p.evaluate(() => {
    const res = [];
    (cardState.specialStones || []).forEach(s => {
      const key = `${s.row},${s.col}`;
      const cell = document.querySelector(`.cell[data-row="${s.row}"][data-col="${s.col}"] .disc`);
      let effectKey = null;
      try { effectKey = (typeof getEffectKeyForSpecialType === 'function') ? getEffectKeyForSpecialType(s.type) : null; } catch (e) {}
      res.push({ key, type: s.type, effectKey, hasCell: !!cell, cellClass: cell ? cell.className : null, inner: cell ? cell.innerHTML : null });
    });
    return res;
  });
  console.log('mapping:', JSON.stringify(mapping, null, 2));

  await b.close();
})();