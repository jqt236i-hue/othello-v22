const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');

describe('Breeding effects', () => {
    test('spawns a stone in an empty adjacent cell and flips any surrounds', () => {
        const cs = { specialStones: [{ row: 3, col: 3, type: 'BREEDING', owner: 'black', remainingOwnerTurns: 2 }] };
        const gs = Core.createGameState();
        // Ensure anchor is black at 3,3
        gs.board[3][3] = Core.BLACK;
        // Ensure one empty adjacent (2,2)
        gs.board[2][2] = Core.EMPTY;

        const prng = { random: () => 0 }; // deterministic choose first
        const res = CardLogic.processBreedingEffects(cs, gs, 'black', prng);
        expect(res.spawned.length).toBe(1);
        const t = res.spawned[0];
        expect(gs.board[t.row][t.col]).toBe(Core.BLACK);
    });
});
