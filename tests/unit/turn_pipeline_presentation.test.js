const TurnPipeline = require('../../game/turn/turn_pipeline');
const CardLogic = require('../../game/logic/cards');

test('applyTurnSafe returns presentationEvents including actionId and plyIndex', () => {
  const cs = CardLogic.createCardState({ shuffle: arr => arr, random: () => 0 });
  const gs = { board: Array(8).fill(0).map(() => Array(8).fill(0)), currentPlayer: 1, turnNumber: 0 };
  // Standard initial othello setup for a valid black move at (2,3)
  gs.board[3][3] = CardLogic.WHITE || -1;
  gs.board[3][4] = CardLogic.BLACK || 1;
  gs.board[4][3] = CardLogic.BLACK || 1;
  gs.board[4][4] = CardLogic.WHITE || -1;

  const action = { type: 'place', actionId: 'act-1', row: 2, col: 3 };
  const res = TurnPipeline.applyTurnSafe(cs, gs, 'black', action, null, { currentStateVersion: 0 });

  expect(res.ok).toBe(true);
  expect(Array.isArray(res.presentationEvents)).toBe(true);
  if (res.presentationEvents.length > 0) {
    const ev = res.presentationEvents[0];
    expect(ev).toHaveProperty('actionId');
    expect(ev.actionId).toBe('act-1');
    expect(ev).toHaveProperty('turnIndex');
    expect(typeof ev.turnIndex).toBe('number');
    expect(ev).toHaveProperty('plyIndex');
    expect(typeof ev.plyIndex === 'number' || ev.plyIndex === null).toBe(true);
  }
});