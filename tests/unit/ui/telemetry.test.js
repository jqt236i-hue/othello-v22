const jsdom = require('jsdom');
const { JSDOM } = jsdom;

beforeEach(() => {
  const dom = new JSDOM(require('fs').readFileSync(require('path').resolve(__dirname, '../../../index.html'), 'utf8'));
  global.window = dom.window;
  global.document = dom.window.document;
  // Minimal DOM
  document.body.innerHTML = '<div id="board"></div>';
  global.boardEl = document.getElementById('board');

  // Provide TimerRegistry mock
  const TimerRegistry = require('../../../ui/timer-registry.js');
  window.TimerRegistry = TimerRegistry;

  // Ensure telemetry helpers exist on this fresh window
  window.__telemetry__ = window.__telemetry__ || { watchdogFired: 0, singleVisualWriterHits: 0, abortCount: 0 };
  if (typeof window.getTelemetrySnapshot !== 'function') window.getTelemetrySnapshot = () => Object.assign({}, window.__telemetry__);
  if (typeof window.resetTelemetry !== 'function') window.resetTelemetry = () => { window.__telemetry__ = { watchdogFired: 0, singleVisualWriterHits: 0, abortCount: 0 }; };
  // Initialize telemetry (reset to zero)
  window.resetTelemetry();
});

afterEach(() => {
  delete global.window;
  delete global.document;
});

test('watchdog increments telemetry', () => {
  const Engine = require('../../../ui/animation-engine.js');
  // Ensure counter starts at zero
  expect(window.getTelemetrySnapshot().watchdogFired).toBe(0);
  Engine.handleWatchdog && Engine.handleWatchdog();
  // handler increments telemetry
  const snap = window.getTelemetrySnapshot();
  expect(snap.watchdogFired).toBeGreaterThanOrEqual(1);
});

test('abortAndSync increments abortCount', () => {
  const Engine = require('../../../ui/animation-engine.js');
  const before = window.getTelemetrySnapshot().abortCount;
  Engine.abortAndSync && Engine.abortAndSync();
  const after = window.getTelemetrySnapshot().abortCount;
  expect(after).toBe(before + 1);
});

test('prod single visual writer increments and calls abortAndSync', () => {
  // set VisualPlaybackActive to true and ensure __DEV__ not set
  window.VisualPlaybackActive = true;
  delete window.__DEV__;

  // Mock AnimationEngine.abortAndSync
  window.AnimationEngine = { abortAndSync: jest.fn() };

  // Ensure counter is 0
  expect(window.getTelemetrySnapshot().singleVisualWriterHits).toBe(0);

  // Call renderBoard which should detect and call abortAndSync
  const { renderBoard } = require('../../../ui.js');
  // Should not throw (prod)
  expect(() => renderBoard()).not.toThrow();
  expect(window.AnimationEngine.abortAndSync).toHaveBeenCalled();
  expect(window.getTelemetrySnapshot().singleVisualWriterHits).toBe(1);
});