const swap = require('../../game/logic/effects/swap_with_enemy');
const Core = require('../../game/logic/core');

describe('effects/swap_with_enemy', () => {
    test('applySwapWithEnemy swaps opponent stone and increments charge', () => {
        const cs = { specialStones: [], charge: { black: 0, white: 0 }, pendingEffectByPlayer: { black: null, white: null } };
        const gs = Core.createGameState();
        gs.board[2][2] = Core.WHITE;
        const res = swap.applySwapWithEnemy(cs, gs, 'black', 2, 2);
        expect(res.swapped).toBe(true);
        expect(gs.board[2][2]).toBe(Core.BLACK);
        expect(cs.charge.black).toBe(1);
    });
    test('applySwapWithEnemy respects protection', () => {
        const cs = { specialStones: [{ row: 2, col: 2, type: 'PROTECTED', owner: 'white' }], charge: { black: 0, white: 0 }, pendingEffectByPlayer: { black: null, white: null } };
        const gs = Core.createGameState();
        gs.board[2][2] = Core.WHITE;
        const res = swap.applySwapWithEnemy(cs, gs, 'black', 2, 2);
        expect(res.swapped).toBe(false);
    });
});