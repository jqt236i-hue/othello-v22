const { applyDoublePlace } = require('../../game/logic/effects/double_place');

describe('double place effect helper', () => {
    test('sets extra place remaining for player', () => {
        const cs = { extraPlaceRemainingByPlayer: {} };
        const res = applyDoublePlace(cs, 'black');
        expect(res.activated).toBe(true);
        expect(cs.extraPlaceRemainingByPlayer.black).toBe(1);
    });
});
