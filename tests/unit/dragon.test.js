const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');

describe('Dragon effects', () => {
    test('converts surrounding opponent stones except protected ones', () => {
        const cs = { specialStones: [{ row: 3, col: 3, type: 'DRAGON', owner: 'black', remainingOwnerTurns: 2 }, { row: 2, col: 2, type: 'PROTECTED', owner: 'black' }] };
        const gs = Core.createGameState();
        // Place dragon anchor
        gs.board[3][3] = Core.BLACK;
        // Place opponent stones around
        gs.board[2][2] = Core.WHITE; // also protected in specialStones
        gs.board[2][3] = Core.WHITE;
        gs.board[4][4] = Core.WHITE;

        const res = CardLogic.processDragonEffects(cs, gs, 'black');
        // Protected at 2,2 should not be converted
        expect(gs.board[2][2]).toBe(Core.WHITE);
        // Others should be converted to black
        expect(gs.board[2][3]).toBe(Core.BLACK);
        expect(gs.board[4][4]).toBe(Core.BLACK);
        expect(res.converted.length).toBeGreaterThanOrEqual(2);
    });
});
