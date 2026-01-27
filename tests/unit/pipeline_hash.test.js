const TurnPipeline = require('../../game/turn/turn_pipeline');
const CardLogic = require('../../game/logic/cards');

afterEach(() => {
  if (typeof global._originalRequire !== 'undefined') {
    global.require = global._originalRequire;
    delete global._originalRequire;
  }
});

test('applyTurnSafe rejects with HASH_UNAVAILABLE when SHA-256 is not available in Node', () => {
  // Simulate missing SHA-256 by monkeypatching ResultSchema.computeStateHashSync to throw
  const ResultSchema = require('../../game/schema/result');
  const origComputeSync = ResultSchema.computeStateHashSync;
  ResultSchema.computeStateHashSync = () => { throw new Error('HASH_UNAVAILABLE: SHA-256 not available in this environment'); };

  const cs = CardLogic.createCardState({ shuffle: arr => arr, random: () => 0 });
  cs.turnIndex = 0;
  const gs = { board: Array(8).fill(0).map(() => Array(8).fill(0)), currentPlayer: 1 };

  const action = { type: 'pass' };
  const res = TurnPipeline.applyTurnSafe(cs, gs, 'black', action, null, { currentStateVersion: 0 });
  console.log('applyTurnSafe when computeStateHashSync throws ->', res);

  // Restore
  ResultSchema.computeStateHashSync = origComputeSync;

  expect(res.ok).toBe(false);
  expect(res.rejectedReason).toBe('HASH_UNAVAILABLE');
  expect(res.events && res.events.length > 0).toBe(true);
});

test('applyTurnSafe produces a 64-char hex stateHash when SHA-256 is available', () => {
  const cs = CardLogic.createCardState({ shuffle: arr => arr, random: () => 0 });
  cs.turnIndex = 0;
  const gs = { board: Array(8).fill(0).map(() => Array(8).fill(0)), currentPlayer: 1 };

  const action = { type: 'pass' };
  const res = TurnPipeline.applyTurnSafe(cs, gs, 'black', action, null, { currentStateVersion: 0 });

  expect(res.ok).toBe(true);
  expect(typeof res.stateHash).toBe('string');
  expect(res.stateHash.length).toBe(64);
});