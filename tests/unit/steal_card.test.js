const { applyStealCard } = require('../../game/logic/effects/steal_card');

describe('steal card effect', () => {
    test('steals cards from opponent into player hand', () => {
        const cs = { hands: { black: [], white: ['a','b','c'] }, maxHandSize: 5 };
        const res = applyStealCard(cs, 'black', 2);
        expect(res.stolenCount).toBe(2);
        expect(cs.hands.black.length).toBe(2);
        expect(cs.hands.white.length).toBe(1);
    });
});
