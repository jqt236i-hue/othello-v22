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

  // Instrument processCpuTurn to observe calls
  await page.evaluate(() => {
    window.__cpuCalled = 0;
    const orig = window.processCpuTurn;
    window.processCpuTurn = function() {
      window.__cpuCalled = (window.__cpuCalled || 0) + 1;
      console.log('[PAGE][INSTR] processCpuTurn wrapper called: count=' + window.__cpuCalled);
      try { if (typeof orig === 'function') orig(); } catch (e) { console.warn('[PAGE][INSTR] orig threw', e && e.message); }
    };
  });

  await page.waitForTimeout(200);

  // Check processCpuTurn presence before click
  const beforeType = await page.evaluate(() => (typeof processCpuTurn));
  console.log('processCpuTurn before click:', beforeType);

  // Click a legal move
  let clicked = false;
  const legal = await page.$('#board .cell.legal');
  if (legal) {
    await legal.evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })));
    await page.waitForTimeout(200);
    console.log('Clicked legal cell (dispatched) — done');
    clicked = true;
  }

  // Wait a bit for playback handling, then check processCpuTurn presence
  await page.waitForTimeout(200);
  const midType = await page.evaluate(() => (typeof processCpuTurn));
  console.log('processCpuTurn after events:', midType);

  // Wait long enough for CPU schedule delay
  await page.waitForTimeout(700);

  // Check instrument flag
  const cpuCalls = await page.evaluate(() => window.__cpuCalled || 0);
  console.log('cpuCalls=', cpuCalls);
  const afterType = await page.evaluate(() => (typeof processCpuTurn));
  console.log('processCpuTurn after wait:', afterType);

  // As a final verification, call processCpuTurn manually to observe game CPU debug logs
  const manualCalled = await page.evaluate(() => {
    try {
      if (typeof processCpuTurn === 'function') {
        processCpuTurn();
        return true;
      }
      return false;
    } catch (e) { return 'err:' + (e && e.message); }
  });
  console.log('manualCalled:', manualCalled);

  await page.waitForTimeout(200);

  await browser.close();
})();