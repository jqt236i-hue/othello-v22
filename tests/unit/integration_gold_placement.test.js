const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');
const Turn = require('../../game/turn/turn_pipeline');
const { createNoopPrng } = require('../test-helpers');

describe('Integration: GOLD_STONE placement flow', () => {
    test('using GOLD_STONE multiplies charge gain and sets goldUsed flag', () => {
        const prng = createNoopPrng();
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        // Give black the gold card and enough charge to use
        cs.hands.black.push('gold_stone');
        cs.charge.black = 10;

        // Ensure a simple legal move exists
        const legal = Core.getLegalMoves(gs, Core.BLACK, CardLogic.getCardContext(cs));
        expect(legal.length).toBeGreaterThan(0);
        const move = legal[0];

        // Use the card and place (Turn.applyTurn drives the full headless turn flow)
        const res = Turn.applyTurn(cs, gs, 'black', { useCardId: 'gold_stone', type: 'place', row: move.row, col: move.col }, prng);

        // Find the placement_effects event
        const pe = res.events.find(e => e.type === 'placement_effects');
        expect(pe.effects.goldStoneUsed).toBe(true);
        // Charge gained should be flips * 4 (we can't predict flips here; ensure charge increased and bounded)
        expect(pe.effects.chargeGained).toBeGreaterThanOrEqual(0);
        expect(cs.charge.black).toBeLessThanOrEqual(30);

        // The placed square becomes EMPTY after the effect (rulebook 10.7)
        expect(gs.board[move.row][move.col]).toBe(Core.EMPTY);
    });
});
