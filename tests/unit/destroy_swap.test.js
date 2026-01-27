const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');

describe('Destroy and Swap effects', () => {
    test('applyDestroyEffect removes stone and special markers', () => {
        const cs = { specialStones: [{ row: 3, col: 3, type: 'PERMA_PROTECTED', owner: 'black' }], pendingEffectByPlayer: { black: null, white: null } };
        const gs = Core.createGameState();
        gs.board[3][3] = Core.BLACK;
        const ok = CardLogic.applyDestroyEffect(cs, gs, 'black', 3, 3);
        expect(ok).toBe(true);
        expect(gs.board[3][3]).toBe(Core.EMPTY);
        expect(cs.specialStones.length).toBe(0);
    });
    test('applySwapEffect respects protection and increments charge', () => {
        const cs = { specialStones: [{ row: 2, col: 2, type: 'PROTECTED', owner: 'white' }], charge: { black: 0, white: 0 }, pendingEffectByPlayer: { black: null, white: null } };
        const gs = Core.createGameState();
        // place white at 2,2
        gs.board[2][2] = Core.WHITE;
        // black attempts swap at 2,2 should fail due to protection
        const fail = CardLogic.applySwapEffect(cs, gs, 'black', 2, 2);
        expect(fail).toBe(false);

        // remove protection and try again
        cs.specialStones = [];
        const success = CardLogic.applySwapEffect(cs, gs, 'black', 2, 2);
        expect(success).toBe(true);
        // board should be black
        expect(gs.board[2][2]).toBe(Core.BLACK);
        // charge should be incremented by 1
        expect(cs.charge.black).toBe(1);
    });
    test('applySwapEffect respects protection and increments charge', () => {
        const cs = { specialStones: [{ row: 2, col: 2, type: 'PROTECTED', owner: 'white' }], charge: { black: 0, white: 0 }, pendingEffectByPlayer: { black: null, white: null } };
        const gs = Core.createGameState();
        // place white at 2,2
        gs.board[2][2] = Core.WHITE;
        // black attempts swap at 2,2 should fail due to protection
        const fail = CardLogic.applySwapEffect(cs, gs, 'black', 2, 2);
        expect(fail).toBe(false);

        // remove protection and try again
        cs.specialStones = [];
        const success = CardLogic.applySwapEffect(cs, gs, 'black', 2, 2);
        expect(success).toBe(true);
        // board should be black
        expect(gs.board[2][2]).toBe(Core.BLACK);
        // charge should be incremented by 1
        expect(cs.charge.black).toBe(1);
    });
});
