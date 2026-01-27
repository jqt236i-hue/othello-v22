const dragonMod = require('../../game/logic/effects/dragon');
const Core = require('../../game/logic/core');

describe('effects/dragon module', () => {
    test('processDragonEffects converts surrounding opponent stones except protected ones', () => {
        const cs = { specialStones: [{ row: 4, col: 4, type: 'DRAGON', owner: 'black', remainingOwnerTurns: 2 }] };
        const gs = Core.createGameState();
        gs.board[4][4] = Core.BLACK;
        gs.board[3][3] = Core.WHITE;
        gs.board[3][4] = Core.BLACK;
        gs.board[3][5] = Core.WHITE;

        const res = dragonMod.processDragonEffects(cs, gs, 'black');
        expect(res.converted.length).toBeGreaterThanOrEqual(1);
        expect(gs.board[3][3]).toBe(Core.BLACK);
    });
});