/**
 * @file deterministic_init.test.js
 * @description Test that game initialization is deterministic with same seed
 */

const SeededPRNG = require('../../game/schema/prng');
const CardLogic = require('../../game/logic/cards');

describe('Deterministic Initialization', () => {
    test('same seed produces identical deck order', () => {
        const seed = 12345;

        // First initialization
        const prng1 = SeededPRNG.createPRNG(seed);
        const state1 = CardLogic.createCardState(prng1);

        // Second initialization with same seed
        const prng2 = SeededPRNG.createPRNG(seed);
        const state2 = CardLogic.createCardState(prng2);

        // Decks should be identical
        expect(state1.deck).toEqual(state2.deck);
    });

    test('same seed produces identical initial hands after dealing', () => {
        const seed = 54321;

        // First initialization
        const prng1 = SeededPRNG.createPRNG(seed);
        const state1 = CardLogic.createCardState(prng1);
        CardLogic.dealInitialHands(state1, prng1);

        // Second initialization with same seed
        const prng2 = SeededPRNG.createPRNG(seed);
        const state2 = CardLogic.createCardState(prng2);
        CardLogic.dealInitialHands(state2, prng2);

        // Hands should be identical
        expect(state1.hands.black).toEqual(state2.hands.black);
        expect(state1.hands.white).toEqual(state2.hands.white);
        // Remaining deck should be identical
        expect(state1.deck).toEqual(state2.deck);
    });

    test('initGame produces consistent results', () => {
        const seed = 99999;

        // First initialization
        const prng1 = SeededPRNG.createPRNG(seed);
        const result1 = CardLogic.initGame(prng1);

        // Second initialization with same seed
        const prng2 = SeededPRNG.createPRNG(seed);
        const result2 = CardLogic.initGame(prng2);

        // Card states should be identical
        expect(result1.cardState.deck).toEqual(result2.cardState.deck);
        expect(result1.cardState.hands).toEqual(result2.cardState.hands);
        expect(result1.cardState.discard).toEqual(result2.cardState.discard);
    });

    test('different seeds produce different results', () => {
        const seed1 = 11111;
        const seed2 = 22222;

        const prng1 = SeededPRNG.createPRNG(seed1);
        const state1 = CardLogic.createCardState(prng1);

        const prng2 = SeededPRNG.createPRNG(seed2);
        const state2 = CardLogic.createCardState(prng2);

        // Decks should be different (with high probability)
        expect(state1.deck).not.toEqual(state2.deck);
    });

    test('PRNG state can be saved and restored', () => {
        const seed = 77777;

        const prng = SeededPRNG.createPRNG(seed);

        // Consume some random numbers
        prng.random();
        prng.random();
        prng.random();

        // Save state
        const savedState = prng.getState();

        // Consume more random numbers
        const val1 = prng.random();
        const val2 = prng.random();

        // Create new PRNG from saved state
        const restoredPrng = SeededPRNG.fromState(savedState);

        // Should produce same sequence
        expect(restoredPrng.random()).toBe(val1);
        expect(restoredPrng.random()).toBe(val2);
    });
});
