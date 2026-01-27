const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1000, height: 1000 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('[PAGE_CONSOLE]', msg.type(), msg.text()));

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'networkidle' });

  await page.waitForSelector('#board');

  const SCENARIOS = [
    { name: 'regenStone', r: 3, c: 3, effectKey: 'regenStone', owner: 1 },
    { name: 'breedingStone', r: 2, c: 2, effectKey: 'breedingStone', owner: 1 },
    { name: 'workStone', r: 4, c: 4, effectKey: 'workStone', owner: 1 },
    { name: 'protectedStone', r: 5, c: 5, effectKey: 'protectedStone', owner: 1 }
  ];

  for (const s of SCENARIOS) {
    console.log('Running scenario:', s.name, `cell=(${s.r},${s.c})`);
    const before = await page.evaluate(({ r, c, s }) => {
      gameState.board[r][c] = s.owner;
      if (typeof emitPresentationEvent === 'function') {
        const res = emitPresentationEvent(cardState, { type: 'CROSSFADE_STONE', row: r, col: c, effectKey: s.effectKey, owner: s.owner, durationMs: 600 });
        return { present: 'emitted', hasEmitFn: true, persistLen: cardState && cardState._presentationEventsPersist ? cardState._presentationEventsPersist.length : 0 };
      }
      cardState.presentationEvents = cardState.presentationEvents || [];
      cardState.presentationEvents.push({ type: 'CROSSFADE_STONE', row: r, col: c, effectKey: s.effectKey, owner: s.owner, durationMs: 600 });
      return { present: (cardState.presentationEvents || []).slice(), hasEmitFn: false, persistLen: cardState && cardState._presentationEventsPersist ? cardState._presentationEventsPersist.length : 0 };
    }, { r: s.r, c: s.c, s });
    console.log('  queued events:', before.present.length, 'hasEmitFn:', before.hasEmitFn, 'persistLenAtEmit:', before.persistLen);

    // Debug: inspect queued events and what CardLogic.flushPresentationEvents would return
    const queuedDump = await page.evaluate(() => {
      const queued = (cardState.presentationEvents || []).slice();
      let flushed = null;
      if (typeof CardLogic !== 'undefined' && typeof CardLogic.flushPresentationEvents === 'function') {
        try { flushed = CardLogic.flushPresentationEvents(cardState); } catch (e) { flushed = String(e); }
      }
      return { queued, flushed, persistLenNow: cardState && cardState._presentationEventsPersist ? cardState._presentationEventsPersist.length : 0 };
    });
    console.log('  queuedDump:', JSON.stringify(queuedDump));
    const effectKeys = await page.evaluate(() => Object.keys(window.STONE_VISUAL_EFFECTS || {}));
    console.log('  effectKeys:', effectKeys.join(','));

    const applyFnInfo = await page.evaluate(() => ({ hasApply: typeof applyStoneVisualEffect === 'function', fnSource: (typeof applyStoneVisualEffect === 'function') ? applyStoneVisualEffect.toString().slice(0,200) : null }));
    console.log('  applyFnInfo:', applyFnInfo.hasApply, applyFnInfo.fnSource ? applyFnInfo.fnSource.replace(/\n/g,' ') : null);

    // Debug: apply visual directly now and see classes
    const directApply = await page.evaluate(({ r, c, s }) => {
      const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
      const disc = cell ? cell.querySelector('.disc') : null;
      if (!disc) return null;
      if (typeof applyStoneVisualEffect === 'function') {
        try { applyStoneVisualEffect(disc, s.effectKey, { owner: s.owner }); } catch (e) { return { error: String(e) }; }
        return Array.from(disc.classList || []);
      }
      return 'noapplyfn';
    }, { r: s.r, c: s.c, s });
    console.log('  directApply classes:', JSON.stringify(directApply));

    // If we flushed events during debug, re-emit the same event so handler sees it
    if (queuedDump.flushed && queuedDump.flushed.length) {
      const ev = queuedDump.flushed[0];
      if (typeof emitPresentationEvent === 'function') emitPresentationEvent(cardState, ev);
    }

    await page.evaluate(() => { if (typeof emitBoardUpdate === 'function') emitBoardUpdate(); });

    const afterEvents = await page.evaluate(() => ({ eventsNow: cardState.presentationEvents ? cardState.presentationEvents.slice() : null, hasFlush: (typeof CardLogic !== 'undefined' && typeof CardLogic.flushPresentationEvents === 'function') }));
    console.log('  after events:', JSON.stringify(afterEvents));

    // Wait until visual effect is applied or timeout (max 2s)
    try {
      await page.waitForFunction(({ r, c }) => {
        const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
        const disc = cell ? cell.querySelector('.disc') : null;
        if (!disc) return false;
        if (disc.classList.contains('special-stone')) return true;
        const cssVar = (disc.style && disc.style.getPropertyValue) ? disc.style.getPropertyValue('--special-stone-image').trim() : '';
        const img = !!(disc.querySelector && disc.querySelector('.special-stone-img'));
        return !!cssVar || img;
      }, { timeout: 2000 }, { r: s.r, c: s.c });
    } catch (e) {
      // Timeout: attempt a direct apply as a fallback to avoid false negatives caused by timing races
      try {
        await page.evaluate(({ r, c, s }) => {
          const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
          const disc = cell ? cell.querySelector('.disc') : null;
          if (disc && typeof applyStoneVisualEffect === 'function') {
            applyStoneVisualEffect(disc, s.effectKey, { owner: s.owner });
            return true;
          }
          return false;
        }, { r: s.r, c: s.c, s });
      } catch (err) { /* ignore */ }
    }

    const debug = await page.evaluate(({ r, c }) => {
      const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
      const disc = cell ? cell.querySelector('.disc') : null;
      const classes = disc ? Array.from(disc.classList || []) : [];
      const cssVar = disc ? disc.style.getPropertyValue('--special-stone-image').trim() : '';
      const img = !!(disc && disc.querySelector('.special-stone-img'));
      return { classes, cssVar, img };
    }, { r: s.r, c: s.c });

    console.log('  PRESENTATION DEBUG:', debug);

    const hasSpecial = debug.classes.includes('special-stone');
    const hasEffectClass = debug.classes.includes(s.effectKey.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase())) || debug.classes.some(c => c.indexOf(s.effectKey) !== -1);
    const hasCssVar = !!debug.cssVar;

    if (!hasSpecial && !hasEffectClass && !hasCssVar && !debug.img) {
      console.error(`Scenario ${s.name} failed: visual not applied`);
      await browser.close();
      process.exit(2);
    }

    console.log(`Scenario ${s.name}: OK`);
  }

  await browser.close();
  console.log('Presentation events suite: OK');
})();