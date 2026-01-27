const dmod = require('../../game/logic/effects/destroy_one_stone');
const Core = require('../../game/logic/core');

describe('effects/destroy_one_stone', () => {
    test('applyDestroyOneStone destroys a stone and removes special markers', () => {
        const cs = { specialStones: [{ row: 3, col: 3, type: 'PERMA_PROTECTED', owner: 'black' }], pendingEffectByPlayer: { black: null, white: null } };
        const gs = Core.createGameState();
        gs.board[3][3] = Core.BLACK;
        const res = dmod.applyDestroyOneStone(cs, gs, 'black', 3, 3);
        expect(res.destroyed).toBe(true);
        expect(gs.board[3][3]).toBe(Core.EMPTY);
        expect(cs.specialStones.length).toBe(0);
    });
});