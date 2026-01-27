const { generateActionId, ActionManager, setActionIdGenerator, setTimeProvider } = require('../../game/schema/action_manager');

describe('ActionManager refactor (action id / time provider)', () => {
  test('default action id generator produces local-<counter> ids', () => {
    const id1 = generateActionId();
    const id2 = generateActionId();
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
    expect(id1).not.toBe(id2);
    expect(id1.startsWith('local-')).toBe(true);
    expect(id2.startsWith('local-')).toBe(true);
  });

  test('setActionIdGenerator overrides generator', () => {
    setActionIdGenerator(() => 'custom-1');
    const id = generateActionId();
    expect(id).toBe('custom-1');
    // restore default for other tests
    setActionIdGenerator(null);
  });

  test('setTimeProvider injects timestamps into create/record/import', () => {
    const ts = 1234567890;
    setTimeProvider({ now: () => ts });
    const a = ActionManager.createAction('place', 'black', { row: 1, col: 1 });
    expect(a.timestamp).toBe(ts);
    ActionManager.recordAction(a);
    const last = ActionManager.getLastAction();
    expect(last.recordedAt).toBe(ts);
    ActionManager.importActions([{ actionId: 'x', turnIndex: 0 }]);
    const imported = ActionManager.getActions().find(x => x.actionId === 'x');
    expect(imported.importedAt).toBe(ts);

    // restore null time provider
    setTimeProvider(null);
  });
});