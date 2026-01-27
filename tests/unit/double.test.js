const CardLogic = require('../../game/logic/cards');
const { createNoopPrng } = require('../test-helpers');

describe('Double place card', () => {
    test('DOUBLE_PLACE grants extra place remaining', () => {
        const cs = CardLogic.createCardState(createNoopPrng());
        cs.pendingEffectByPlayer.black = { type: 'DOUBLE_PLACE' };
        const gs = { board: Array(8).fill(null).map(() => Array(8).fill(0)) };
        const effects = CardLogic.applyPlacementEffects(cs, gs, 'black', 3, 3, 0);
        expect(effects.doublePlaceActivated).toBe(true);
        expect(cs.extraPlaceRemainingByPlayer.black).toBeGreaterThan(0);
    });

    test('DOUBLE_PLACE works when extraPlaceRemainingByPlayer missing in state (quick harness)', () => {
        const cs = {
            pendingEffectByPlayer: { black: { type: 'DOUBLE_PLACE' } },
            charge: { black: 0, white: 0 },
            hands: { black: [], white: [] },
            discard: [],
            specialStones: [],
            bombs: [],
            hasUsedCardThisTurnByPlayer: { black: false, white: false }
        };
        const gs = { board: Array(8).fill(null).map(() => Array(8).fill(0)) };
        const effects = CardLogic.applyPlacementEffects(cs, gs, 'black', 3, 3, 0);
        expect(effects.doublePlaceActivated).toBe(true);
        expect(cs.extraPlaceRemainingByPlayer).toBeDefined();
        expect(cs.extraPlaceRemainingByPlayer.black).toBeGreaterThan(0);
    });
});
