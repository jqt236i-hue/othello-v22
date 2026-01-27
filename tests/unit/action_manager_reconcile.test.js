const AMModule = require('../../game/schema/action_manager');
const ActionManager = AMModule.ActionManager;

afterEach(() => {
  if (typeof global.localStorage !== 'undefined') {
    try { localStorage.clear(); } catch (e) { }
    delete global.localStorage;
  }
  ActionManager.reset();
});

test('reconcileWithServer marks acknowledged and returns missing actions', () => {
  const store = {};
  global.localStorage = {
    setItem: (k, v) => { store[k] = v; },
    getItem: (k) => store[k] || null,
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; }
  };

  ActionManager.recordAction({ actionId: 'a1', turnIndex: 0 });
  ActionManager.recordAction({ actionId: 'a2', turnIndex: 1 });
  ActionManager.recordAction({ actionId: 'a3', turnIndex: 2 });

  const missing = ActionManager.reconcileWithServer(['a2','a99']);
  // a2 acknowledged, missing should include a1 and a3
  const missingIds = missing.map(a => a.actionId).sort();
  expect(missingIds).toEqual(['a1','a3']);

  const unacked = ActionManager.getUnacknowledgedActions().map(a => a.actionId).sort();
  expect(unacked).toEqual(['a1','a3']);

  // a2 should be acknowledged
  expect(ActionManager.getActions().some(a => a.actionId === 'a2' && a.acknowledged)).toBe(true);
});