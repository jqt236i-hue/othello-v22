const { applyPlunderWill } = require('../../game/logic/effects/plunder_will');

describe('plunder will effect', () => {
    test('steals up to flipCount from opponent charge', () => {
        const cs = { charge: { black: 1, white: 4 } };
        const res = applyPlunderWill(cs, 'black', 3);
        expect(res.plundered).toBe(3);
        expect(cs.charge.black).toBe(4);
        expect(cs.charge.white).toBe(1);
    });
});
