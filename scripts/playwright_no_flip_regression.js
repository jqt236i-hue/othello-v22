const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages
  const logs = [];
  page.on('console', msg => {
    const location = msg.location();
    const text = msg.text();
    logs.push({ type: msg.type(), text, location });
    console.log('[PAGE_CONSOLE]', msg.type(), text, location);
  });

  await page.goto('file://' + __dirname.replace(/\\scripts$/, '') + '/index.html', { waitUntil: 'networkidle' });

  // Install a targeted observer that flags flip-class additions
  await page.evaluate(() => {
    window.__flipDetected = false;
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          const el = m.target;
          if (!el || !el.classList) continue;
          if (el.classList.contains('disc')) {
            if (el.classList.contains('flip')) {
              window.__flipDetected = true;
              console.log('[ANIM_OBS] FLIP_CLASS_ADDED', { className: el.className });
            }
          }
        }
        if (m.type === 'childList') {
          for (const n of m.addedNodes) {
            try {
              if (n.nodeType === 1 && n.matches && n.matches('.disc.flip')) {
                window.__flipDetected = true;
                console.log('[ANIM_OBS] FLIP_NODE_ADDED', { className: n.className });
              }
            } catch (e) { }
          }
        }
      }
    });
    const board = document.getElementById('board');
    if (board) obs.observe(board, { attributes: true, subtree: true, attributeFilter: ['class'], childList: true, characterData: false });
    window.__flipObserverStop = () => obs.disconnect();
    console.log('[ANIM_REG] flip observer installed');
  });

  // Enable debug / noanim as appropriate and prepare hands
  await page.evaluate(() => {
    window.DEBUG_UNLIMITED_USAGE = true;
    window.DEBUG_HUMAN_VS_HUMAN = true;
    window.DISABLE_ANIMATIONS = false; // test default (animations suppressed by code change)
    if (typeof fillDebugHand === 'function') fillDebugHand();
  });

  // 1) Swap flow
  await page.evaluate(() => {
    gameState.board[2][2] = WHITE;
    cardState.specialStones = cardState.specialStones || [];
    cardState.specialStones = cardState.specialStones.filter(s => !(s.row === 2 && s.col === 2));
    if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
  });
  await page.evaluate(() => { cardState.selectedCardId = 'swap_01'; if (typeof useSelectedCard === 'function') useSelectedCard(); });
  await page.click('.cell[data-row="2"][data-col="2"]');
  await page.waitForTimeout(1000);

  // 2) Tempt flow
  await page.evaluate(() => {
    gameState.board[3][3] = BLACK;
    cardState.specialStones = cardState.specialStones || [];
    cardState.specialStones = cardState.specialStones.filter(s => !(s.row === 3 && s.col === 3));
    cardState.specialStones.push({ row: 3, col: 3, type: 'BREEDING', owner: 'white', remainingOwnerTurns: 3 });
    if (!cardState.hands.black.includes('tempt_01')) cardState.hands.black.push('tempt_01');
    cardState.selectedCardId = 'tempt_01';
    if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
    if (typeof useSelectedCard === 'function') useSelectedCard();
  });
  await page.click('.cell[data-row="3"][data-col="3"]');
  await page.waitForTimeout(1000);

  // 3) Breeding immediate spawn
  await page.evaluate(() => {
    const precomputed = { spawned: [{ row: 4, col: 4 }], flipped: [], destroyed: [], anchors: [] };
    if (typeof processBreedingImmediateAtPlacement === 'function') processBreedingImmediateAtPlacement(BLACK, 2, 2, precomputed);
  });
  await page.waitForTimeout(1500);

  // Check observer flag
  const flipDetected = await page.evaluate(() => !!window.__flipDetected);
  await page.evaluate(() => { if (window.__flipObserverStop) window.__flipObserverStop(); });

  await browser.close();

  if (flipDetected) {
    console.error('FLIP CLASS DETECTED during regression flows — failure');
    process.exit(2);
  }
  console.log('No flip classes observed — success');
  process.exit(0);
})();