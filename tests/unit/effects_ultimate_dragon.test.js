const ult = require('../../game/logic/effects/ultimate_reverse_dragon');
const Core = require('../../game/logic/core');

describe('effects/ultimate_reverse_dragon', () => {
    test('applyUltimateDragon places DRAGON special stone with remainingOwnerTurns', () => {
        const cs = { specialStones: [] };
        const gs = Core.createGameState();
        const res = ult.applyUltimateDragon(cs, 'black', 2, 2);
        expect(res.placed).toBe(true);
        expect(cs.specialStones.length).toBe(1);
        expect(cs.specialStones[0].type).toBe('DRAGON');
        expect(cs.specialStones[0].remainingOwnerTurns).toBeGreaterThan(0);
    });
});