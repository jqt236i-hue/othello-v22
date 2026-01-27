const TurnPipeline = require('../../game/turn/turn_pipeline');
const TurnPipelineUIAdapter = require('../../game/turn/pipeline_ui_adapter');
const CardLogic = require('../../game/logic/cards');

afterEach(() => {
  // Clean up any test-injected ActionManager
  if (typeof global !== 'undefined' && global.ActionManager) delete global.ActionManager;
});

test('runTurnWithAdapter forwards previousActionIds to applyTurnSafe and duplicate action is rejected', () => {
  const cs = CardLogic.createCardState({ shuffle: arr => arr, random: () => 0 });
  cs.turnIndex = 0;
  const gs = { board: Array(8).fill(0).map(() => Array(8).fill(0)), currentPlayer: 1 };

  // Prepare a duplicate action id scenario
  const action = { type: 'place', actionId: 'dup-1', row: 2, col: 3, turnIndex: 0 };

  // Inject a minimal ActionManager stub that reports previously-seen action ids
  global.ActionManager = { ActionManager: { getActions: () => [{ actionId: 'dup-1' }] } };

  const res = TurnPipelineUIAdapter.runTurnWithAdapter(cs, gs, 'black', action, TurnPipeline);

  expect(res.ok).toBe(false);
  expect(res.rejectedReason).toBe('DUPLICATE_ACTION');
  expect(Array.isArray(res.events)).toBe(true);
  expect(res.events.some(e => e.reason === 'DUPLICATE_ACTION')).toBe(true);
});