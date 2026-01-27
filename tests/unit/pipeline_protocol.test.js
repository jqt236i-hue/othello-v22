const TurnPipeline = require('../../game/turn/turn_pipeline');
const SeededPRNG = require('../../game/schema/prng');
const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');
const ResultSchema = require('../../game/schema/result');
const { createMockPrng } = require('../test-helpers');

describe('TurnPipeline protocol guarantees', () => {
  test('determinism: same seed + same actions => same stateHash', () => {
    const seed = 12345;
    const prng1 = SeededPRNG.createPRNG(seed);
    const cs1 = CardLogic.createCardState(prng1);
    const gs1 = Core.createGameState();

    const res1 = TurnPipeline.applyTurnSafe(cs1, gs1, 'black', { type: 'pass' }, prng1, { currentStateVersion: 0, prngState: { _seed: seed } });
    expect(res1.ok).toBe(true);
    expect(res1.stateHash).toBeDefined();

    const prng2 = SeededPRNG.createPRNG(seed);
    const cs2 = CardLogic.createCardState(prng2);
    const gs2 = Core.createGameState();

    const res2 = TurnPipeline.applyTurnSafe(cs2, gs2, 'black', { type: 'pass' }, prng2, { currentStateVersion: 0, prngState: { _seed: seed } });
    expect(res2.ok).toBe(true);
    expect(res2.stateHash).toBeDefined();

    expect(res1.stateHash).toBe(res2.stateHash);
  });

  test('duplicate actionId is rejected when previousActionIds includes it', () => {
    const prng = createMockPrng(1);
    const cs = CardLogic.createCardState(prng);
    const gs = Core.createGameState();

    const action = { type: 'pass', actionId: 'a-dup' };
    const res = TurnPipeline.applyTurnSafe(cs, gs, 'black', action, prng, { currentStateVersion: 0, previousActionIds: ['a-dup'] });
    expect(res.ok).toBe(false);
    expect(res.rejectedReason).toBe('DUPLICATE_ACTION');
  });

  test('out-of-order action (turnIndex mismatch) is rejected', () => {
    const prng = createMockPrng(2);
    const cs = CardLogic.createCardState(prng);
    const gs = Core.createGameState();

    const action = { type: 'place', turnIndex: 5, row: 2, col: 3 };
    const res = TurnPipeline.applyTurnSafe(cs, gs, 'black', action, prng, { currentStateVersion: 1 });
    expect(res.ok).toBe(false);
    expect(res.rejectedReason).toBe('OUT_OF_ORDER');
  });

  test('version mismatch leads to rejection', () => {
    const prng = createMockPrng(3);
    const cs = CardLogic.createCardState(prng);
    const gs = Core.createGameState();

    const action = { type: 'pass' };
    const res = TurnPipeline.applyTurnSafe(cs, gs, 'black', action, prng, { currentStateVersion: 0, expectedStateVersion: 5 });
    expect(res.ok).toBe(false);
    expect(res.rejectedReason).toBe('VERSION_MISMATCH');
  });

  test('StateValidator validates post-ok states', () => {
    const prng = createMockPrng(4);
    const cs = CardLogic.createCardState(prng);
    const gs = Core.createGameState();

    const res = TurnPipeline.applyTurnSafe(cs, gs, 'black', { type: 'pass' }, prng, { currentStateVersion: 0 });
    expect(res.ok).toBe(true);
    const validation = require('../../game/schema/state_validator').validateState(res.gameState, res.cardState);
    expect(validation.valid).toBe(true);
  });

  test('serialize/deserialize preserves stateHash equality (including prngState)', () => {
    const seed = 4242;
    const prng = SeededPRNG.createPRNG(seed);
    const cs = CardLogic.createCardState(prng);
    const gs = Core.createGameState();

    const res = TurnPipeline.applyTurnSafe(cs, gs, 'black', { type: 'pass' }, prng, { currentStateVersion: 0, prngState: { _seed: seed } });
    expect(res.ok).toBe(true);

    const hash1 = res.stateHash;

    const serialized = JSON.stringify({ gameState: res.gameState, cardState: res.cardState, prngState: { _seed: seed } });
    const parsed = JSON.parse(serialized);

    const hashable = ResultSchema.extractHashableState(parsed.gameState, parsed.cardState, parsed.prngState);
    const hash2 = ResultSchema.computeStateHashSync(hashable);
    expect(hash1).toBe(hash2);
  });
});
