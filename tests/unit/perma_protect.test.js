const { applyPermaProtectNextStone } = require('../../game/logic/effects/perma_protect_next_stone');

describe('perma protect effect', () => {
    test('registers a permanent protected special stone', () => {
        const cs = { specialStones: [] };
        const res = applyPermaProtectNextStone(cs, 'white', 4, 4);
        expect(res.applied).toBe(true);
        expect(cs.specialStones.length).toBe(1);
        const s = cs.specialStones[0];
        expect(s.type).toBe('PERMA_PROTECTED');
        expect(s.owner).toBe('white');
    });
});
