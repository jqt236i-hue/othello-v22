const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');
const Turn = require('../../game/turn/turn_pipeline');
const { createNoopPrng } = require('../test-helpers');

describe('Integration: SILVER_STONE placement flow', () => {
    test('using SILVER_STONE multiplies charge gain and disappears', () => {
        const prng = createNoopPrng();
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        cs.hands.black.push('silver_stone');
        cs.charge.black = 10;

        const legal = Core.getLegalMoves(gs, Core.BLACK, CardLogic.getCardContext(cs));
        expect(legal.length).toBeGreaterThan(0);
        const move = legal[0]; // initial board legal moves flip exactly 1

        const res = Turn.applyTurn(cs, gs, 'black', { useCardId: 'silver_stone', type: 'place', row: move.row, col: move.col }, prng);

        const pe = res.events.find(e => e.type === 'placement_effects');
        expect(pe.effects.silverStoneUsed).toBe(true);
        expect(pe.effects.chargeGained).toBe(3);
        // charge: 10 - cost(3) + gained(3) = 10
        expect(cs.charge.black).toBe(10);

        // Stone disappears after placement
        expect(gs.board[move.row][move.col]).toBe(Core.EMPTY);
    });
});
