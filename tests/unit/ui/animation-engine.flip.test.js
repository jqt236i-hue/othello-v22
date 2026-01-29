const jsdom = require('jsdom');
const { JSDOM } = jsdom;

beforeEach(() => {
  const dom = new JSDOM(require('fs').readFileSync(require('path').resolve(__dirname, '../../../index.html'), 'utf8'));
  global.window = dom.window;
  global.document = dom.window.document;
  document.body.innerHTML = '<div id="board"></div>';
  global.boardEl = document.getElementById('board');

  // Expose timer registry and make timers execute immediately for deterministic test
  const TimerRegistry = require('../../../ui/timer-registry.js');
  window.TimerRegistry = TimerRegistry;
  // Make setTimeout call immediate to avoid waiting during tests
  window.TimerRegistry.setTimeout = (fn, ms, scope) => { try { fn(); } catch (e) { } return 0; };
});

afterEach(() => {
  delete global.window;
  delete global.document;
});

test('flip animation applies final visual state and does not leave flip class', async () => {
  const AnimationEngine = require('../../../ui/animation-engine.js');

  // Ensure a place event happens first
  const events = [
    { type: 'place', phase: 1, targets: [{ r: 2, col: 2, after: { color: 1, special: null, timer: null } }] },
    { type: 'flip', phase: 2, targets: [{ r: 2, col: 2, after: { color: -1, special: null, timer: null } }] }
  ];

  await AnimationEngine.play(events);

  const cell = document.querySelector('.cell[data-row="2"][data-col="2"]');
  expect(cell).toBeTruthy();
  const disc = cell.querySelector('.disc');
  expect(disc).toBeTruthy();

  // final color should be white (-1)
  expect(disc.classList.contains('white')).toBe(true);

  // flip class should not be left on the element after animation completes
  expect(disc.classList.contains('flip')).toBe(false);
});