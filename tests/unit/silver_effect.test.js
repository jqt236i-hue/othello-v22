const { applySilverStoneEffect } = require('../../game/logic/effects/silver_stone');

describe('silver_stone effect helper', () => {
    test('calculates charge delta (pure)', () => {
        const res = applySilverStoneEffect(2);
        expect(res.silverUsed).toBe(true);
        expect(res.chargeDelta).toBe(6);
    });
});
