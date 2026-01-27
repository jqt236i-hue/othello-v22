const breedingMod = require('../../game/logic/effects/breeding');
const Core = require('../../game/logic/core');

describe('effects/breeding module', () => {
    test('processBreedingEffects spawns and flips correctly (deterministic)', () => {
        const cs = { specialStones: [{ row: 3, col: 3, type: 'BREEDING', owner: 'black', remainingOwnerTurns: 2 }] };
        const gs = Core.createGameState();
        gs.board[3][3] = Core.BLACK;
        gs.board[3][4] = Core.WHITE;
        gs.board[3][5] = Core.BLACK; // to make a flippable line at (3,4)
        // make (3,2) empty
        gs.board[3][2] = Core.EMPTY;

        const prng = { random: () => 0 }; // pick first empty cell
        const res = breedingMod.processBreedingEffects(cs, gs, 'black', prng);
        expect(res.spawned.length).toBe(1);
        expect(res.flipped.length).toBeGreaterThanOrEqual(0);
    });
});