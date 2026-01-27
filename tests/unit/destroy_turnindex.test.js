test('executeDestroy attaches cardState.turnIndex to action passed to TurnPipelineUIAdapter', async () => {
  // Simulate browser global
  global.window = global;

  // Minimal cardState and gameState
  global.cardState = { presentationEvents: [], turnIndex: 7 };
  global.gameState = { board: Array(8).fill(0).map(() => Array(8).fill(0)), currentPlayer: 1 };

  // Provide browser-like globals used by executeDestroy
  global.isProcessing = false;
  global.isCardAnimating = false;
  global.addLog = () => {};
  global.LOG_MESSAGES = { destroyApplied: () => 'destroyed', destroyFailed: () => 'failed' };
  global.emitCardStateChange = () => {};
  global.emitBoardUpdate = () => {};
  global.emitGameStateChange = () => {};
  global.posToNotation = (r, c) => `${r},${c}`;

  // Stub ActionManager.createAction to return an object
  global.ActionManager = { ActionManager: { createAction: (type, playerKey, payload) => ({ type, playerKey, ...payload }) } };

  let capturedAction = null;
  // Stub TurnPipelineUIAdapter to capture action and provide TurnPipeline
  global.TurnPipelineUIAdapter = { runTurnWithAdapter: (cs, gs, pk, action) => { capturedAction = action; return { ok: true, nextCardState: cs, nextGameState: gs, playbackEvents: [] }; } };
  global.TurnPipeline = {};
  global.LOG_MESSAGES.destroyFailed = () => 'destroy failed';

  // Require the destroy module (it attaches executeDestroy to window)
  require('../../game/card-effects/destroy');

  // Call the exported function
  await global.executeDestroy(0, 0, 'black');

  expect(capturedAction).not.toBeNull();
  expect(typeof capturedAction.turnIndex).toBe('number');
  expect(capturedAction.turnIndex).toBe(global.cardState.turnIndex);

  // Cleanup
  delete global.executeDestroy;
  delete global.TurnPipelineUIAdapter;
  delete global.TurnPipeline;
  delete global.ActionManager;
  delete global.gameState;
  delete global.cardState;
  delete global.window;
  delete global.isProcessing;
  delete global.isCardAnimating;
  delete global.addLog;
  delete global.LOG_MESSAGES;
  delete global.emitCardStateChange;
  delete global.emitBoardUpdate;
  delete global.emitGameStateChange;
  delete global.posToNotation;
});