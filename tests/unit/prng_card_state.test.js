const CardLogic = require('../../game/logic/cards');
const { createMockPrng } = require('../test-helpers');

describe('PRNG stability for createCardState', () => {
    test('same seed yields same deck order', () => {
        const p1 = createMockPrng(42);
        const p2 = createMockPrng(42);
        const cs1 = CardLogic.createCardState(p1);
        const cs2 = CardLogic.createCardState(p2);
        expect(cs1.deck).toEqual(cs2.deck);
    });

    test('different seeds likely produce different deck order', () => {
        const p1 = createMockPrng(1);
        const p2 = createMockPrng(2);
        const cs1 = CardLogic.createCardState(p1);
        const cs2 = CardLogic.createCardState(p2);
        // Not strictly required to be different always, but it should be for our seeds
        expect(cs1.deck).not.toEqual(cs2.deck);
    });
});
