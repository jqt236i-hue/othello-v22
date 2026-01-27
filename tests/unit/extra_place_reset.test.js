const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');
const { createNoopPrng } = require('../test-helpers');

describe('Extra place reset behavior', () => {
    test('extraPlaceRemaining is reset on owner turn start', () => {
        const prng = createNoopPrng();
        const cs = CardLogic.createCardState(prng);
        cs.extraPlaceRemainingByPlayer.black = 1;
        const gs = Core.createGameState();

        CardLogic.onTurnStart(cs, 'black', gs, prng);
        expect(cs.extraPlaceRemainingByPlayer.black).toBe(0);
    });
});