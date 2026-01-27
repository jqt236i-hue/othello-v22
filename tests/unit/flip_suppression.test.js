/*
 * Tests to ensure flip animation classes are suppressed by default.
 */

const { JSDOM } = require('jsdom');

beforeEach(() => {
  // Setup a minimal DOM board via JSDOM
  const dom = new JSDOM(`<!doctype html><html><body>
    <div id="board">
      <div class="cell" data-row="1" data-col="1"><div class="disc black"></div></div>
    </div>
  </body></html>`);
  global.window = dom.window;
  global.document = dom.window.document;
  // expose boardEl used by helpers
  global.boardEl = document.getElementById('board');

  // Load the module now that window/document are present so it attaches helpers to window
  // Ensure we load a fresh copy so previous test requires didn't run before JSDOM setup
  try { delete require.cache[require.resolve('../../game/move-executor-visuals.js')]; } catch (e) {}
  require('../../game/move-executor-visuals.js');
  // Expose helpers for convenience
  global.applyFlipAnimations = window.applyFlipAnimations;
  global.animateFlipsWithDeferredColor = window.animateFlipsWithDeferredColor;

  // Polyfill requestAnimationFrame for Node env
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
});

afterEach(() => {
  // cleanup JSDOM globals
  delete global.window;
  delete global.document;
  delete global.boardEl;
});

test('applyFlipAnimations does not add flip class', (done) => {
  const disc = document.querySelector('.cell[data-row="1"][data-col="1"] .disc');
  expect(disc).not.toBeNull();

  // Call the helper
  applyFlipAnimations([[1,1]]);

  // Wait a frame to allow requestAnimationFrame logic to run
  requestAnimationFrame(() => {
    expect(disc.classList.contains('flip')).toBe(false);
    done();
  });
});

// Note: animateFlipsWithDeferredColor is exercised indirectly via integration tests; here we only assert
// the public helper applyFlipAnimations suppresses flip-class behavior.
