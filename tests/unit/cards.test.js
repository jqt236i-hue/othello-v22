const CardLogic = require('../../game/logic/cards');
const { createNoopPrng } = require('../test-helpers');

describe('Card logic tests', () => {
    test('GOLD_STONE multiplies flip-based charge gain', () => {
        const cs = CardLogic.createCardState(createNoopPrng());
        // prepare pending effect
        cs.pendingEffectByPlayer.black = { type: 'GOLD_STONE' };
        const gs = { board: Array(8).fill(null).map(() => Array(8).fill(0)) };
        const effects = CardLogic.applyPlacementEffects(cs, gs, 'black', 2, 2, 2);
        expect(effects.goldStoneUsed).toBe(true);
        expect(effects.chargeGained).toBe(8); // 2 flips * 4x
        // GOLD_STONE disappears immediately, so it should not be registered as an on-board special stone marker.
        expect(cs.specialStones.some(s => s.type === 'GOLD' && s.owner === 'black')).toBe(false);
    });
});
