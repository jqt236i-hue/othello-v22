const BoardOps = require('../../game/logic/board_ops');

describe('BoardOps presentation event meta', () => {
  test('emitted presentation events include actionId, turnIndex and incremental plyIndex when currentActionMeta is set', () => {
    const cs = { presentationEvents: [], _nextStoneId: 1, turnIndex: 7 };
    const gs = { board: Array(8).fill(0).map(() => Array(8).fill(0)) };

    cs._currentActionMeta = { actionId: 'action-xyz', turnIndex: 7, plyIndex: 0 };

    const spawn = BoardOps.spawnAt(cs, gs, 2, 2, 'black', 'TEST', 'test_spawn');
    const change = BoardOps.changeAt(cs, gs, 2, 2, 'white', 'TEST', 'test_change');
    const move = BoardOps.moveAt(cs, gs, 2, 2, 3, 3, 'TEST', 'test_move');

    expect(Array.isArray(cs.presentationEvents)).toBe(true);
    expect(cs.presentationEvents.length).toBeGreaterThanOrEqual(3);

    // Check each event has actionId and turnIndex and correct increasing plyIndex
    for (let i = 0; i < 3; i++) {
      const ev = cs.presentationEvents[i];
      expect(ev.actionId).toBe('action-xyz');
      expect(ev.turnIndex).toBe(7);
      expect(typeof ev.plyIndex).toBe('number');
      expect(ev.plyIndex).toBe(i);
    }
  });
});