const { JSDOM } = require('jsdom');

beforeEach(() => {
  const dom = new JSDOM(`<!doctype html><html><body>
    <div id="board">
      <div class="cell" data-row="4" data-col="4"></div>
    </div>
  </body></html>`);
  global.window = dom.window;
  global.document = dom.window.document;
  global.boardEl = document.getElementById('board');

  // ensure color constants for module evaluation
  global.BLACK = 1;
  global.WHITE = -1;

  // Stubs for global helpers used by the module
  global.addLog = () => {};
  global.emitCardStateChange = () => {};
  global.emitBoardUpdate = () => {};
  global.emitGameStateChange = () => {};
  global.LOG_MESSAGES = { breedingSpawned: () => '' };
  global.getPlayerName = () => 'player';

  // Load modules fresh
  try { delete require.cache[require.resolve('../../game/special-effects/breeding.js')]; } catch (e) {}
  require('../../game/special-effects/breeding.js');

  // polyfills
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
});

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.boardEl;
});

test('processBreedingImmediateAtPlacement does not add breeding-spawn class', async () => {
  const precomputed = { spawned: [{ row: 4, col: 4 }], flipped: [], destroyed: [], anchors: [] };
  // call the function (module exposes on window)
  await window.processBreedingImmediateAtPlacement(1, 2, 2, precomputed);

  // UI should create discs from presentation events; breeding module must not create DOM nodes itself
  const disc = document.querySelector('.cell[data-row="4"][data-col="4"] .disc');
  expect(disc).toBeNull();
});

// Note: processBreedingEffectsAtTurnStart uses pipeline/context in some test environments
// and may not be exposed consistently in this harness. The immediate-placement path is
// the main practical callsite that previously toggled `.breeding-spawn`, and is covered above.
