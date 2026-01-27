const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1000, height: 1000 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('[PAGE_CONSOLE]', msg.type(), msg.text()));

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'networkidle' });

  // Ensure board is present
  await page.waitForSelector('#board');

  const row = 3, col = 3;

  // Prepare state and inspect pre/post flush
  const before = await page.evaluate(({ r, c }) => {
    // Ensure disc exists
    gameState.board[r][c] = BLACK;
    // Prepare presentation events array
    cardState.presentationEvents = cardState.presentationEvents || [];
    cardState.presentationEvents.push({ type: 'CROSSFADE_STONE', row: r, col: c, effectKey: 'regenStone', owner: BLACK, durationMs: 600 });
    return { hasFlush: (typeof CardLogic !== 'undefined' && typeof CardLogic.flushPresentationEvents === 'function'), events: (cardState.presentationEvents || []).slice() };
  }, { r: row, c: col });
  console.log('BEFORE FLUSH:', before);

  const boardListeners = await page.evaluate(() => { const t = (typeof GameEvents !== 'undefined' && GameEvents.EVENT_TYPES) ? GameEvents.EVENT_TYPES.BOARD_UPDATED : null; const list = (t && GameEvents && GameEvents.gameEvents && GameEvents.gameEvents.listeners && GameEvents.gameEvents.listeners[t]) ? GameEvents.gameEvents.listeners[t].slice() : []; return { t, count: list.length, fns: list.map(f => (typeof f === 'function') ? f.toString().slice(0,200) : String(f)) }; });
  console.log('BOARD_UPDATED listeners:', boardListeners);

  await page.evaluate(() => { if (typeof emitBoardUpdate === 'function') emitBoardUpdate(); });

  // Wait a tick and capture post state (give presentation-handler time to process)
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ eventsNow: cardState.presentationEvents ? cardState.presentationEvents.slice() : null, hasFlush: (typeof CardLogic !== 'undefined' && typeof CardLogic.flushPresentationEvents === 'function') }));
  console.log('AFTER FLUSH (cardState.presentationEvents):', after);


  // Wait for UI to process
  await page.waitForTimeout(1000);

  // Debug: inspect DOM and game state around the target cell
  const debug = await page.evaluate(({ r, c }) => {
    const boardVal = (typeof gameState !== 'undefined' && Array.isArray(gameState.board)) ? gameState.board[r][c] : null;
    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    const hasCell = !!cell;
    const disc = cell ? cell.querySelector('.disc') : null;
    const hasDisc = !!disc;
    const classes = disc ? Array.from(disc.classList || []) : [];
    const cssVar = disc ? disc.style.getPropertyValue('--special-stone-image') : '';
    const img = !!(disc && disc.querySelector('.special-stone-img'));
    return { boardVal, hasCell, hasDisc, classes, cssVar: cssVar.trim(), img };
  }, { r: row, c: col });

  console.log('PRESENTATION DEBUG:', debug);
  const check = { special: debug.classes.includes('special-stone') || debug.classes.includes('regen-stone'), cssVar: debug.cssVar, img: debug.img };
  console.log('PRESENTATION CHECK:', check);

  if (!check.special && !check.cssVar && !check.img) {
    console.error('Presentation E2E: visual not applied');
    await browser.close();
    process.exit(2);
  }

  await browser.close();
  console.log('Presentation E2E: OK');
})();