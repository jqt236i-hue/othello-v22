const TurnPipeline = require('../../game/turn/turn_pipeline');
const CardLogic = require('../../game/logic/cards');

test('presentationEvents include actionId, turnIndex and monotonic plyIndex', () => {
  const cs = CardLogic.createCardState({ shuffle: arr => arr, random: () => 0 });
  cs.turnIndex = 0;
  const gs = { board: Array(8).fill(0).map(() => Array(8).fill(0)), currentPlayer: 1 };
  // Setup classic othello initial four stones to produce flip events
  gs.board[3][3] = CardLogic.WHITE || -1;
  gs.board[3][4] = CardLogic.BLACK || 1;
  gs.board[4][3] = CardLogic.BLACK || 1;
  gs.board[4][4] = CardLogic.WHITE || -1;

  const action = { type: 'place', actionId: 'act-1', row: 2, col: 3 };
  const res = TurnPipeline.applyTurnSafe(cs, gs, 'black', action, null, { currentStateVersion: 0 });

  expect(res.ok).toBe(true);
  expect(Array.isArray(res.presentationEvents)).toBe(true);
  const events = res.presentationEvents;
  expect(events.length).toBeGreaterThan(0);

  // Determine expected turnIndex from resulting cardState (turnIndex may be incremented at turn start)
  const expectedTurnIndex = res.cardState && typeof res.cardState.turnIndex === 'number' ? res.cardState.turnIndex : 0;

  // All events must have actionId and turnIndex and numeric plyIndex
  for (const ev of events) {
    expect(ev).toHaveProperty('actionId');
    expect(ev.actionId).toBe('act-1');
    expect(ev).toHaveProperty('turnIndex');
    expect(ev.turnIndex).toBe(expectedTurnIndex);
    expect(ev).toHaveProperty('plyIndex');
    expect(typeof ev.plyIndex).toBe('number');
  }

  // plyIndex must be monotonic and start from 0
  const plySeq = events.map(e => e.plyIndex);
  expect(plySeq[0]).toBe(0);
  for (let i = 1; i < plySeq.length; i++) {
    expect(plySeq[i]).toBe(plySeq[i - 1] + 1);
  }
});