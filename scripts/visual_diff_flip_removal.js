const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch').default || require('pixelmatch');
const VISUAL_THRESHOLD = parseFloat(process.env.VISUAL_THRESHOLD) || 0.15;
const THRESHOLD_PIXELS = parseInt(process.env.THRESHOLD_PIXELS) || 200;

async function captureScreenshots(destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1000, height: 1000 } });
  const page = await context.newPage();

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'), { waitUntil: 'networkidle' });
  await page.waitForSelector('#board');

  async function screenshotBoard(name) {
    const board = await page.$('#board');
    const clip = await board.boundingBox();
    const p = path.join(destDir, `${name}.png`);
    await page.screenshot({ path: p, clip });
    console.log('Saved:', p);
  }

  // swap
  await page.evaluate(() => {
    gameState.board[2][2] = WHITE;
    cardState.specialStones = cardState.specialStones || [];
    cardState.specialStones = cardState.specialStones.filter(s => !(s.row === 2 && s.col === 2));
    if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
  });
  await page.waitForTimeout(350);
  await screenshotBoard('swap');

  // tempt
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

  // breeding
  await page.evaluate(() => {
    const precomputed = { spawned: [{ row: 4, col: 4 }], flipped: [], destroyed: [], anchors: [] };
    if (typeof processBreedingImmediateAtPlacement === 'function') processBreedingImmediateAtPlacement(BLACK, 2, 2, precomputed);
  });
  await page.waitForTimeout(800);
  await screenshotBoard('breeding');

  await browser.close();
}

function compareImages(basePath, newPath, diffPath) {
  const img1 = PNG.sync.read(fs.readFileSync(basePath));
  const img2 = PNG.sync.read(fs.readFileSync(newPath));
  const { width, height } = img1;
  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: VISUAL_THRESHOLD });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  return mismatched;
}

(async () => {
  const baselineDir = path.resolve(__dirname, '..', 'artifacts', 'visual_flip_removal', 'baseline');
  const currentDir = path.resolve(__dirname, '..', 'artifacts', 'visual_flip_removal', 'current');
  const diffDir = path.resolve(__dirname, '..', 'artifacts', 'visual_flip_removal', 'diff');
  fs.mkdirSync(currentDir, { recursive: true });
  fs.mkdirSync(diffDir, { recursive: true });

  console.log('Capturing current screenshots...');
  await captureScreenshots(currentDir);

  const tests = ['swap', 'tempt', 'breeding'];
  let totalMismatches = 0;
  for (const t of tests) {
    const base = path.join(baselineDir, `${t}.png`);
    const cur = path.join(currentDir, `${t}.png`);
    const diff = path.join(diffDir, `${t}.diff.png`);
    if (!fs.existsSync(base)) {
      console.error('Baseline missing for', t, '->', base);
      process.exit(2);
    }
    const mismatches = compareImages(base, cur, diff);
    console.log(`${t}: ${mismatches} mismatched pixels -> diff saved: ${diff}`);
    totalMismatches += mismatches;
  }

  if (totalMismatches > THRESHOLD_PIXELS) {
    console.error('Visual diff FAILED: total mismatched pixels =', totalMismatches);
    process.exit(2);
  }
  console.log('Visual diff OK: total mismatched pixels =', totalMismatches);
  process.exit(0);
})();