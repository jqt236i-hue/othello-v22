const CardBreeding = require('../../game/logic/cards/breeding');
const SharedConstants = require('../../shared-constants');

const { BLACK, WHITE, EMPTY } = SharedConstants;

function mkBoard() { return Array(8).fill(null).map(() => Array(8).fill(EMPTY)); }

describe('Breeding helpers', () => {
    test('processBreedingEffects spawns on empty adjacent and decrements', () => {
        const cs = { specialStones: [ { row: 2, col: 2, type: 'BREEDING', owner: 'black', remainingOwnerTurns: 2 } ], bombs: [] };
        const board = mkBoard(); board[2][2] = BLACK;
        const gs = { board };
        const res = CardBreeding.processBreedingEffects(cs, gs, 'black', { random: () => 0 });
        expect(res.spawned.length).toBe(1);
        // remainingOwnerTurns decremented
        expect(cs.specialStones.find(s => s.row === 2 && s.col === 2).remainingOwnerTurns).toBe(1);
    });

    test('processBreedingEffects destroys anchor when countdown reaches 0', () => {
        const cs = { specialStones: [ { row: 3, col: 3, type: 'BREEDING', owner: 'black', remainingOwnerTurns: 1 } ], bombs: [] };
        const board = mkBoard(); board[3][3] = BLACK;
        const gs = { board };
        const res = CardBreeding.processBreedingEffects(cs, gs, 'black', { random: () => 0 });
        expect(res.destroyed).toEqual([{ row: 3, col: 3 }]);
        expect(gs.board[3][3]).toBe(EMPTY);
    });

    test('processBreedingEffectsAtAnchor spawns immediately without decrement', () => {
        const cs = { specialStones: [ { row: 4, col: 4, type: 'BREEDING', owner: 'black', remainingOwnerTurns: 3 } ], bombs: [] };
        const board = mkBoard(); board[4][4] = BLACK;
        const gs = { board };
        const res = CardBreeding.processBreedingEffectsAtAnchor(cs, gs, 'black', 4, 4, { random: () => 0 });
        expect(res.spawned.length).toBe(1);
        // remainingOwnerTurns should be unchanged
        expect(cs.specialStones.find(s => s.row === 4 && s.col === 4).remainingOwnerTurns).toBe(3);
    });
});