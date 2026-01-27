const AMModule = require('../../game/schema/action_manager');
const TurnManager = require('../../game/turn-manager');

beforeEach(() => {
  const store = {};
  global.localStorage = {
    setItem: (k, v) => { store[k] = v; },
    getItem: (k) => store[k] || null,
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; }
  };
  global.ActionManager = AMModule;
});

afterEach(() => {
  delete global.localStorage;
  delete global.ActionManager;
  AMModule.ActionManager.reset();
});

test('resetGame resets and clears ActionManager storage', () => {
  // Seed an action and ensure it's saved
  AMModule.ActionManager.recordAction({ actionId: 'test-1', turnIndex: 0 });
  expect(AMModule.ActionManager.getActionCount()).toBeGreaterThan(0);

  // Provide minimal globals expected by resetGame
  global.cpuSmartness = { black: 1, white: 1 };
  // Minimal createGameState stub to avoid heavy initialization
  global.createGameState = () => ({ board: Array(8).fill(0).map(() => Array(8).fill(0)), currentPlayer: 1 });
  // Stub UI helpers invoked by resetGame
  global.addLog = () => {};
  global.emitBoardUpdate = () => {};
  global.emitGameStateChange = () => {};

  // Call resetGame (exports for tests)
  TurnManager.resetGame();

  // Cleanup test globals
  delete global.cpuSmartness;
  delete global.createGameState;
  delete global.addLog;
  delete global.emitBoardUpdate;
  delete global.emitGameStateChange;

  // After reset, action count should be 0 and storage cleared
  expect(AMModule.ActionManager.getActionCount()).toBe(0);
  const stored = localStorage.getItem(AMModule.ActionManager._storageKey);
  expect(stored === null || stored === undefined).toBe(true);
});