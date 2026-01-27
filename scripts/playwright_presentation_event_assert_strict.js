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

  // Prepare state and enqueue regenStone presentation event
  await page.evaluate(({ r, c }) => {
    gameState.board[r][c] = BLACK;
    cardState.presentationEvents = cardState.presentationEvents || [];
    cardState.presentationEvents.push({ type: 'CROSSFADE_STONE', row: r, col: c, effectKey: 'regenStone', owner: BLACK, durationMs: 600 });
  }, { r: row, c: col });

  // Trigger board update so presentation-handler will consume persisted events
  await page.evaluate(() => { if (typeof emitBoardUpdate === 'function') emitBoardUpdate(); });

  // Wait enough time for retries / fallback to have been applied
  await page.waitForTimeout(1200);

  // Inspect DOM: require both class and css var to be present
  const result = await page.evaluate(({ r, c }) => {
    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    const disc = cell ? cell.querySelector('.disc') : null;
    const classes = disc ? Array.from(disc.classList || []) : [];
    const cssVar = disc ? disc.style.getPropertyValue('--special-stone-image').trim() : '';
    return { classes, cssVar };
  }, { r: row, c: col });

  console.log('STRICT CHECK:', result);

  const hasSpecialClass = Array.isArray(result.classes) && result.classes.includes('special-stone');
  const hasCssVar = typeof result.cssVar === 'string' && result.cssVar.length > 0;

  if (!hasSpecialClass || !hasCssVar) {
    console.error('Strict presentation assertion failed: missing class or css var');
    await browser.close();
    process.exit(2);
  }

  await browser.close();
  console.log('Strict presentation assertion: OK');
})();