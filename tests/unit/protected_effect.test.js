const { applyProtectedNextStone } = require('../../game/logic/effects/protected_next_stone');

describe('protected next stone effect', () => {
    test('registers a temporary protected special stone', () => {
        const cs = { specialStones: [] };
        const res = applyProtectedNextStone(cs, 'black', 2, 2);
        expect(res.applied).toBe(true);
        expect(cs.specialStones.length).toBe(1);
        const s = cs.specialStones[0];
        expect(s.type).toBe('PROTECTED');
        expect(s.expiresForPlayer).toBe('black');
    });
});
