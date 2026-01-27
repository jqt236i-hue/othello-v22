const AMModule = require('../../game/schema/action_manager');
const ActionManager = AMModule.ActionManager;

afterEach(() => {
  // Clear any mocked localStorage
  if (typeof global.localStorage !== 'undefined') {
    try { localStorage.clear(); } catch (e) { /* ignore */ }
    delete global.localStorage;
  }
  ActionManager.reset();
});

test('recordAction persists to localStorage and loadFromStorage restores state', () => {
  // Simple localStorage mock
  const store = {};
  global.localStorage = {
    setItem: (k, v) => { store[k] = v; },
    getItem: (k) => store[k] || null,
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; }
  };

  ActionManager.clearStorage();
  ActionManager.reset();

  const action = { actionId: 'a1', turnIndex: 0, playerKey: 'black', type: 'place' };
  ActionManager.recordAction(action);

  // Ensure it was saved to storage
  const raw = localStorage.getItem(ActionManager._storageKey);
  expect(raw).not.toBeNull();
  const parsed = JSON.parse(raw);
  expect(parsed && Array.isArray(parsed.actions)).toBe(true);
  expect(parsed.actions.some(a => a.actionId === 'a1')).toBe(true);

  // Reset in-memory and reload
  ActionManager.reset();
  expect(ActionManager.getActionCount()).toBe(0);

  const ok = ActionManager.loadFromStorage();
  expect(ok).toBe(true);
  expect(ActionManager.getActionCount()).toBeGreaterThanOrEqual(1);
  expect(ActionManager.getActions().some(a => a.actionId === 'a1')).toBe(true);
});

test('acknowledgeAction and getUnacknowledgedActions work and getRecentActionIds returns most recent first', () => {
  const store = {};
  global.localStorage = {
    setItem: (k, v) => { store[k] = v; },
    getItem: (k) => store[k] || null,
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; }
  };

  ActionManager.reset();
  ActionManager.clearStorage();

  ActionManager.recordAction({ actionId: 'a1', turnIndex: 0, playerKey: 'black', type: 'place' });
  ActionManager.recordAction({ actionId: 'a2', turnIndex: 1, playerKey: 'white', type: 'pass' });

  // two unacked
  const unacked = ActionManager.getUnacknowledgedActions().map(a => a.actionId);
  expect(unacked).toEqual(expect.arrayContaining(['a1', 'a2']));

  // ack a1
  const changed = ActionManager.acknowledgeAction('a1');
  expect(changed).toBe(true);

  const unacked2 = ActionManager.getUnacknowledgedActions().map(a => a.actionId);
  expect(unacked2).toEqual(['a2']);

  // recent ids most recent first
  const recent = ActionManager.getRecentActionIds();
  expect(recent[0]).toBe('a2');
  expect(recent[1]).toBe('a1');

});