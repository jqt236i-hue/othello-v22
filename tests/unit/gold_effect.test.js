const { applyGoldStoneEffect } = require('../../game/logic/effects/gold_stone');

describe('gold_stone effect helper', () => {
    test('calculates charge delta (pure)', () => {
        const res = applyGoldStoneEffect(2);
        expect(res.goldUsed).toBe(true);
        expect(res.chargeDelta).toBe(8);
    });
});
