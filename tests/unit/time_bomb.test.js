const { applyTimeBomb } = require('../../game/logic/effects/time_bomb');

describe('time bomb effect', () => {
    test('places a bomb with remaining turns', () => {
        const cs = { bombs: [], turnIndex: 10 };
        const res = applyTimeBomb(cs, 'white', 3, 3);
        expect(res.placed).toBe(true);
        expect(cs.bombs.length).toBe(1);
        expect(cs.bombs[0].remainingTurns).toBe(3);
        expect(cs.bombs[0].placedTurn).toBe(10);
    });
});
