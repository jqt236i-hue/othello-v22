const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');
const Turn = require('../../game/turn/turn_pipeline');
const { createNoopPrng } = require('../test-helpers');

describe('TIME_BOMB (時限爆弾)', () => {
    test('bomb is cleared when flipped by normal move', () => {
        const prng = createNoopPrng();
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        // Put a bomb marker on an initial WHITE stone at (3,3).
        // Black's standard opening move at (2,3) flips (3,3).
        cs.bombs.push({ row: 3, col: 3, remainingTurns: 3, owner: 'white', placedTurn: -1 });

        expect(gs.board[3][3]).toBe(Core.WHITE);
        Turn.applyTurn(cs, gs, 'black', { type: 'place', row: 2, col: 3 }, prng);

        // The bomb stone got flipped to BLACK as a normal flip, so the bomb effect is disabled.
        expect(gs.board[3][3]).toBe(Core.BLACK);
        expect(cs.bombs.some(b => b.row === 3 && b.col === 3)).toBe(false);
    });
});
