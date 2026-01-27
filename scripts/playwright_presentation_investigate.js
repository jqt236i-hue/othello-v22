const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1000, height: 1000 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('[PAGE_CONSOLE]', msg.type(), msg.text()));

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');

  const row = 3, col = 3;

  const before = await page.evaluate(({ r, c }) => {
    gameState.board[r][c] = BLACK;
    cardState.presentationEvents = cardState.presentationEvents || [];
    cardState.presentationEvents.push({ type: 'CROSSFADE_STONE', row: r, col: c, effectKey: 'regenStone', owner: BLACK, durationMs: 600 });
    return { hasFlush: (typeof CardLogic !== 'undefined' && typeof CardLogic.flushPresentationEvents === 'function'), events: (cardState.presentationEvents || []).slice() };
  }, { r: row, c: col });
  console.log('BEFORE FLUSH:', before);

  const applyFnInfo = await page.evaluate(() => ({ hasApply: typeof applyStoneVisualEffect === 'function', fnSource: (typeof applyStoneVisualEffect === 'function') ? applyStoneVisualEffect.toString().slice(0,200) : null }));
  console.log('APPLY FN INFO:', applyFnInfo);

  const boardListeners = await page.evaluate(() => {
    const t = (typeof GameEvents !== 'undefined' && GameEvents.EVENT_TYPES) ? GameEvents.EVENT_TYPES.BOARD_UPDATED : null;
    const list = (t && GameEvents && GameEvents.gameEvents && GameEvents.gameEvents.listeners && GameEvents.gameEvents.listeners[t]) ? GameEvents.gameEvents.listeners[t].slice() : null;
    return { t, count: list ? list.length : 0 };
  });
  console.log('BOARD_UPDATED listeners:', boardListeners);

  const directFlushRes = await page.evaluate(() => {
    if (typeof CardLogic !== 'undefined' && typeof CardLogic.flushPresentationEvents === 'function') {
      try {
        const res = CardLogic.flushPresentationEvents(cardState);
        return { returned: res, afterArray: cardState.presentationEvents ? cardState.presentationEvents.slice() : null };
      } catch (e) {
        return { error: String(e) };
      }
    }
    return { available: false };
  });

  console.log('DIRECT FLUSH RESULT:', directFlushRes);

  // Now call the presentation handler via emitBoardUpdate()
  await page.evaluate(() => { if (typeof emitBoardUpdate === 'function') emitBoardUpdate(); });
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({ eventsNow: cardState.presentationEvents ? cardState.presentationEvents.slice() : null }));
  console.log('AFTER emitBoardUpdate:', after);

  const afterApply = await page.evaluate(({ r, c }) => {
    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    const disc = cell ? cell.querySelector('.disc') : null;
    const res = { hasDisc: !!disc, classes: disc ? Array.from(disc.classList) : [], cssVar: disc ? disc.style.getPropertyValue('--special-stone-image').trim() : '', img: !!(disc && disc.querySelector('.special-stone-img')) };
    if (disc && typeof applyStoneVisualEffect === 'function') {
      try { applyStoneVisualEffect(disc, 'regenStone', { owner: 1 }); } catch (e) { res.error = String(e); res.errorStack = e && e.stack ? e.stack : null; }
    } else { res.applyAvailable = (typeof applyStoneVisualEffect === 'function'); }
    const classesAfter = disc ? Array.from(disc.classList) : [];
    res.classesAfter = classesAfter;
    return res;
  }, { r: row, c: col });

  console.log('AFTER APPLY RESULT:', afterApply);

  await browser.close();
})();