const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outDir = path.resolve(__dirname, '..', 'artifacts', 'visual_flip_removal', 'baseline');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1000, height: 1000 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('[PAGE_CONSOLE]', msg.type(), msg.text()));

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'networkidle' });

  // Ensure board is present
  await page.waitForSelector('#board');

  // Helper: screenshot board element
  async function screenshotBoard(name) {
    const board = await page.$('#board');
    if (!board) throw new Error('Board element not found');
    const clip = await board.boundingBox();
    if (!clip) throw new Error('Could not get board bounding box');
    const p = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: p, clip: clip });
    console.log('Saved:', p);
  }

  // 1) Swap flow (use existing setup if possible)
  await page.evaluate(() => {
    // Prepare a swap scenario at 2,2
    gameState.board[2][2] = WHITE;
    cardState.specialStones = cardState.specialStones || [];
    cardState.specialStones = cardState.specialStones.filter(s => !(s.row === 2 && s.col === 2));
    if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
  });
  await page.waitForTimeout(350);
  await screenshotBoard('swap');

  // 2) Tempt flow (set a breeding at 3,3 and play tempt)
  await page.evaluate(() => {
    gameState.board[3][3] = BLACK;
    cardState.specialStones = cardState.specialStones || [];
    cardState.specialStones = cardState.specialStones.filter(s => !(s.row === 3 && s.col === 3));
    cardState.specialStones.push({ row: 3, col: 3, type: 'BREEDING', owner: 'white', remainingOwnerTurns: 3 });
    if (!cardState.hands.black.includes('tempt_01')) cardState.hands.black.push('tempt_01');
    cardState.selectedCardId = 'tempt_01';
    if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
  });
  await page.waitForTimeout(350);
  await screenshotBoard('tempt');

  // 3) Breeding immediate spawn
  await page.evaluate(() => {
    const precomputed = { spawned: [{ row: 4, col: 4 }], flipped: [], destroyed: [], anchors: [] };
    if (typeof processBreedingImmediateAtPlacement === 'function') processBreedingImmediateAtPlacement(BLACK, 2, 2, precomputed);
  });
  await page.waitForTimeout(800);
  await screenshotBoard('breeding');

  await browser.close();
  console.log('Baseline capture complete');
})();