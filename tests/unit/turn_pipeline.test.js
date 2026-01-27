const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');
const Turn = require('../../game/turn/turn_pipeline');
const { createNoopPrng } = require('../test-helpers');

describe('Turn pipeline', () => {
    test('double place flow: use DOUBLE_PLACE then place twice', () => {
        const prng = createNoopPrng();
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        // Give black the double card and enough charge
        cs.hands.black.push('double_01');
        cs.charge.black = 30;

        // Black places at 2,3 (legal) after using the card

        // First action: use card and place on a known legal initial move (2,3)
        const res1 = Turn.applyTurn(cs, gs, 'black', { useCardId: 'double_01', type: 'place', row: 2, col: 3 }, prng);
        // After first placement, the extraPlaceRemaining should be set (activated by placement effects)
        expect(cs.extraPlaceRemainingByPlayer.black).toBeGreaterThanOrEqual(1);

        // Choose a legal second move after the board changed
        const player = Core.BLACK;
        const legal = Core.getLegalMoves(gs, player, CardLogic.getCardContext(cs));
        expect(legal.length).toBeGreaterThan(0);
        const move = legal[0];

        // Second action: place again using the extra place
        const res2 = Turn.applyTurn(cs, gs, 'black', { type: 'place', row: move.row, col: move.col }, prng);
        // After consuming the extra place, it should be zero
        expect(cs.extraPlaceRemainingByPlayer.black).toBe(0);
    });
});
