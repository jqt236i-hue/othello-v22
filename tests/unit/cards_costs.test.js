const CardCosts = require('../../game/logic/cards/costs');
const SharedConstants = require('../../shared-constants');

describe('Card cost helpers', () => {
    test('getCardCost returns catalog cost for known card', () => {
        const def = SharedConstants.CARD_DEFS[0];
        const cost = CardCosts.getCardCost(def.id);
        expect(cost).toBe(def.cost);
    });

    test('getCardCost returns 0 for unknown card', () => {
        const cost = CardCosts.getCardCost('unknown_card_id');
        expect(cost).toBe(0);
    });
});
