const TurnPipeline = require('../../game/turn/turn_pipeline');
const TurnPipelineUIAdapter = require('../../game/turn/pipeline_ui_adapter');
const CardLogic = require('../../game/logic/cards');

test('runTurnWithAdapter returns playbackEvents with action metadata', () => {
  const cs = CardLogic.createCardState({ shuffle: arr => arr, random: () => 0 });
  const gs = { board: Array(8).fill(0).map(() => Array(8).fill(0)), currentPlayer: 1, turnNumber: 0 };
  gs.board[3][3] = CardLogic.WHITE || -1;
  gs.board[3][4] = CardLogic.BLACK || 1;
  gs.board[4][3] = CardLogic.BLACK || 1;
  gs.board[4][4] = CardLogic.WHITE || -1;

  const action = { type: 'place', actionId: 'act-2', row: 2, col: 3 };
  const res = TurnPipelineUIAdapter.runTurnWithAdapter(cs, gs, 'black', action, TurnPipeline);

  expect(res.ok).toBe(true);
  expect(Array.isArray(res.presentationEvents)).toBe(true);
  expect(Array.isArray(res.playbackEvents)).toBe(true);
  if (res.playbackEvents.length > 0) {
    const p = res.playbackEvents[0];
    expect(p.actionId).toBe('act-2');
    expect(typeof p.turnIndex).toBe('number');
    expect(p.plyIndex === null || typeof p.plyIndex === 'number').toBe(true);
  }
});