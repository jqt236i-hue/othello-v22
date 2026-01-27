/**
 * @file state_hash.test.js
 * @description Test stateHash determinism - same seed + same actions = same hash
 */

const ResultSchema = require('../../game/schema/result');
const SeededPRNG = require('../../game/schema/prng');
const CardLogic = require('../../game/logic/cards');
const CoreLogic = require('../../game/logic/core');
const TurnPipeline = require('../../game/turn/turn_pipeline');
const { createMockPrng } = require('../test-helpers');

describe('StateHash Specification', () => {
    describe('stableStringify', () => {
        test('handles undefined as null', () => {
            expect(ResultSchema.stableStringify(undefined)).toBe('null');
        });

        test('handles NaN as null', () => {
            expect(ResultSchema.stableStringify(NaN)).toBe('null');
        });

        test('handles Infinity as null', () => {
            expect(ResultSchema.stableStringify(Infinity)).toBe('null');
            expect(ResultSchema.stableStringify(-Infinity)).toBe('null');
        });

        test('sorts object keys deterministically', () => {
            const obj1 = { b: 1, a: 2, c: 3 };
            const obj2 = { c: 3, a: 2, b: 1 };
            expect(ResultSchema.stableStringify(obj1)).toBe(ResultSchema.stableStringify(obj2));
        });

        test('excludes functions', () => {
            const obj = { a: 1, fn: () => { }, b: 2 };
            const result = ResultSchema.stableStringify(obj);
            expect(result).not.toContain('fn');
            expect(result).toContain('"a":1');
            expect(result).toContain('"b":2');
        });
    });

    describe('extractHashableState', () => {
        test('includes core game state fields', () => {
            const gameState = {
                board: [[0, 0], [0, 0]],
                currentPlayer: 1,
                consecutivePasses: 0,
                gameOver: false, // should be excluded
                winner: null // should be excluded
            };
            const cardState = {
                deck: ['card1'],
                discard: [],
                hands: { black: ['card2'], white: [] },
                turnIndex: 1,
                turnCountByPlayer: { black: 1, white: 0 },
                charge: { black: 0, white: 0 },
                specialStones: [],
                bombs: [],
                markers: [],
                hyperactiveSeqCounter: 0,
                extraPlaceRemainingByPlayer: { black: 0, white: 0 },
                hasUsedCardThisTurnByPlayer: { black: false, white: false },
                pendingEffectByPlayer: { black: null, white: null },
                activeEffectsByPlayer: { black: [], white: [] },
                selectedCardId: 'card2', // should be excluded
                _nextMarkerId: 1 // should be excluded
            };

            const hashable = ResultSchema.extractHashableState(gameState, cardState);

            // Core fields should be present
            expect(hashable.board).toEqual(gameState.board);
            expect(hashable.currentPlayer).toBe(gameState.currentPlayer);
            expect(hashable.deck).toEqual(cardState.deck);
            expect(hashable.hands).toEqual(cardState.hands);

            // UI fields should be excluded
            expect(hashable.gameOver).toBeUndefined();
            expect(hashable.winner).toBeUndefined();
            expect(hashable.selectedCardId).toBeUndefined();
            expect(hashable._nextMarkerId).toBeUndefined();
        });

        test('includes prngState when provided', () => {
            const gameState = { board: [], currentPlayer: 1 };
            const cardState = {
                deck: [], discard: [], hands: { black: [], white: [] },
                turnIndex: 0, turnCountByPlayer: {}, charge: {},
                specialStones: [], bombs: [], markers: [],
                extraPlaceRemainingByPlayer: {},
                hasUsedCardThisTurnByPlayer: {},
                pendingEffectByPlayer: {},
                activeEffectsByPlayer: {}
            };
            const prngState = { _seed: 12345, _current: 67890 };

            const hashable = ResultSchema.extractHashableState(gameState, cardState, prngState);
            expect(hashable.prngState).toEqual(prngState);
        });
    });

    describe('computeStateHashSync', () => {
        test('same state produces same hash', () => {
            const state1 = { a: 1, b: [1, 2, 3] };
            const state2 = { a: 1, b: [1, 2, 3] };

            const hash1 = ResultSchema.computeStateHashSync(state1);
            const hash2 = ResultSchema.computeStateHashSync(state2);

            expect(hash1).toBe(hash2);
        });

        test('different state produces different hash', () => {
            const state1 = { a: 1 };
            const state2 = { a: 2 };

            const hash1 = ResultSchema.computeStateHashSync(state1);
            const hash2 = ResultSchema.computeStateHashSync(state2);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('Deterministic game hash', () => {
        test('same seed + same actions = same hash sequence', () => {
            const seed = 42424242;
            const mockPrng = createMockPrng();

            // Run 1
            const prng1 = SeededPRNG.createPRNG(seed);
            const cardState1 = CardLogic.createCardState(prng1);
            CardLogic.dealInitialHands(cardState1, prng1);
            const gameState1 = CoreLogic.createGameState();
            const hashable1 = ResultSchema.extractHashableState(gameState1, cardState1);
            const hash1 = ResultSchema.computeStateHashSync(hashable1);

            // Run 2 with same seed
            const prng2 = SeededPRNG.createPRNG(seed);
            const cardState2 = CardLogic.createCardState(prng2);
            CardLogic.dealInitialHands(cardState2, prng2);
            const gameState2 = CoreLogic.createGameState();
            const hashable2 = ResultSchema.extractHashableState(gameState2, cardState2);
            const hash2 = ResultSchema.computeStateHashSync(hashable2);

            expect(hash1).toBe(hash2);
        });

        test('different seeds produce different initial hashes', () => {
            const mockPrng = createMockPrng();

            const prng1 = SeededPRNG.createPRNG(11111);
            const cardState1 = CardLogic.createCardState(prng1);
            const gameState1 = CoreLogic.createGameState();
            const hash1 = ResultSchema.computeStateHashSync(
                ResultSchema.extractHashableState(gameState1, cardState1)
            );

            const prng2 = SeededPRNG.createPRNG(22222);
            const cardState2 = CardLogic.createCardState(prng2);
            const gameState2 = CoreLogic.createGameState();
            const hash2 = ResultSchema.computeStateHashSync(
                ResultSchema.extractHashableState(gameState2, cardState2)
            );

            expect(hash1).not.toBe(hash2);
        });
    });
});
