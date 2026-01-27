const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');
const Turn = require('../../game/turn/turn_pipeline');
const { createNoopPrng } = require('../test-helpers');

describe('Integration: immediate dragon/breeding activation (headless)', () => {
    test('ULTIMATE_REVERSE_DRAGON converts adjacent stones immediately and grants charge', () => {
        const prng = createNoopPrng();
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        // Make a known legal initial move for BLACK at (2,3).
        // Add an extra adjacent WHITE stone that is NOT part of the normal flips,
        // so we can verify the dragon conversion.
        gs.board[2][2] = Core.WHITE;

        cs.hands.black.push('udr_01');
        cs.charge.black = 30;

        const res = Turn.applyTurn(cs, gs, 'black', { useCardId: 'udr_01', type: 'place', row: 2, col: 3 }, prng);
        const imm = res.events.find(e => e.type === 'dragon_converted_immediate');
        expect(imm).toBeTruthy();
        expect(gs.board[2][2]).toBe(Core.BLACK);

        // Cost(30) + normal flip(1) + dragon conversion(1) => 30-30+1+1 = 2
        expect(cs.charge.black).toBe(2);
    });

    test('BREEDING_WILL spawns immediately in an adjacent empty cell', () => {
        const prng = { random: () => 0, shuffle: () => { } };
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        cs.hands.black.push('breeding_01');
        cs.charge.black = 30;

        const res = Turn.applyTurn(cs, gs, 'black', { useCardId: 'breeding_01', type: 'place', row: 2, col: 3 }, prng);
        const imm = res.events.find(e => e.type === 'breeding_spawned_immediate');
        expect(imm).toBeTruthy();

        // With deterministic PRNG, first empty adjacent cell is (1,2)
        expect(gs.board[1][2]).toBe(Core.BLACK);
    });
});
