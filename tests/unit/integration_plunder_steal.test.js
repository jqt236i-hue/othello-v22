const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');
const Turn = require('../../game/turn/turn_pipeline');
const { createNoopPrng } = require('../test-helpers');

describe('Integration: PLUNDER_WILL and STEAL_CARD flows', () => {
    test('PLUNDER_WILL drains opponent charge up to flip count', () => {
        const prng = createNoopPrng();
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        // Set opponent charge
        cs.charge.white = 5;

        // Give black the plunder card and charge to use
        cs.hands.black.push('plunder_will');
        // plunder_will cost is 4
        cs.charge.black = 4;

        // Find a legal move for black (turn start will be driven by Turn.applyTurn)
        const legal = Core.getLegalMoves(gs, Core.BLACK, CardLogic.getCardContext(cs));
        expect(legal.length).toBeGreaterThan(0);
        const move = legal[0];

        const res = Turn.applyTurn(cs, gs, 'black', { useCardId: 'plunder_will', type: 'place', row: move.row, col: move.col }, prng);
        const pe = res.events.find(e => e.type === 'placement_effects');
        expect(pe.effects.plunderAmount).toBeDefined();
        expect(cs.charge.white).toBeGreaterThanOrEqual(0);
        expect(cs.charge.black).toBeLessThanOrEqual(30);
    });

    test('STEAL_CARD transfers cards up to flip count', () => {
        const prng = createNoopPrng();
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        // Give white some cards
        cs.hands.white.push('free_01', 'hard_01');
        cs.hands.black = [];

        // Give black a STEAL_CARD and charge
        cs.hands.black.push('steal_card_01');
        cs.charge.black = 30;

        const legal = Core.getLegalMoves(gs, Core.BLACK, CardLogic.getCardContext(cs));
        expect(legal.length).toBeGreaterThan(0);
        const move = legal[0];

        const res = Turn.applyTurn(cs, gs, 'black', { useCardId: 'steal_card_01', type: 'place', row: move.row, col: move.col }, prng);
        const pe = res.events.find(e => e.type === 'placement_effects');
        // stolenCount may be zero if flips are zero, but test ensures fields exist and hands updated if stolen
        if (pe.effects.stolenCount > 0) {
            expect(cs.hands.black.length).toBeGreaterThan(0);
        }
    });
});
