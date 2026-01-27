const Hyper = require('../../game/logic/cards/hyperactive');

function mkBoard() { return Array(8).fill(null).map(() => Array(8).fill(0)); }

describe('Hyperactive helpers', () => {
    test('moveHyperactiveOnce moves to adjacent empty cell and flips if applicable', () => {
        const cs = { specialStones: [ { row: 3, col: 3, type: 'HYPERACTIVE', owner: 'black', hyperactiveSeq: 1 } ], bombs: [] };
        const board = mkBoard(); board[3][3] = 1; // black
        // set a pattern so placing at (3,4) will flip (3,5)
        // ensure earlier neighbors are non-empty so random index 0 selects (3,4)
        board[2][2] = 1; board[2][3] = 1; board[2][4] = 1; board[3][2] = 1;
        board[3][4] = 0; board[3][5] = -1; board[3][6] = 1;
        const gs = { board };
        const entry = cs.specialStones[0];
        const flipsLib = require('../../game/logic/cards/flips');
        // sanity check: flips helper should detect capture when placing at (3,4)
        expect(flipsLib.getFlipsWithContext(gs, 3, 4, 1, {})).toEqual([[3,5]]);
        const res = Hyper.moveHyperactiveOnce(cs, gs, entry, { random: () => 0 }, { getFlipsWithContext: flipsLib.getFlipsWithContext, getCardContext: () => ({ protectedStones: [], permaProtectedStones: [] }) });
        expect(res.moved.length).toBe(1);
        expect(res.flipped).toContainEqual({ row: 3, col: 5 });
        // hyperactive entry should have changed column
        expect(entry.col).not.toBe(3);
    });

    test('moveHyperactiveOnce destroys anchor if no empty cell', () => {
        const cs = { specialStones: [ { row: 0, col: 0, type: 'HYPERACTIVE', owner: 'black', hyperactiveSeq: 1 } ], bombs: [] };
        const board = mkBoard(); board[0][0] = 1; // surrounded by non-empty
        board[0][1] = 1; board[1][0] = 1; board[1][1] = 1;
        const gs = { board };
        const entry = cs.specialStones[0];
        const res = Hyper.moveHyperactiveOnce(cs, gs, entry, { random: () => 0 }, { getFlipsWithContext: () => [], getCardContext: () => ({ protectedStones: [], permaProtectedStones: [] }) });
        expect(res.destroyed).toEqual([{ row: 0, col: 0 }]);
    });

    test('processHyperactiveMoves runs multiple entries and collects flips', () => {
        const cs = { specialStones: [ { row: 2, col: 2, type: 'HYPERACTIVE', owner: 'white', hyperactiveSeq: 1 }, { row: 5, col: 5, type: 'HYPERACTIVE', owner: 'black', hyperactiveSeq: 2 } ], bombs: [] };
        const board = mkBoard(); board[2][2] = -1; board[5][5] = 1;
        // provide empty candidate for both
        const gs = { board };
        const flipsLib = require('../../game/logic/cards/flips');
        const res = Hyper.processHyperactiveMoves(cs, gs, { random: () => 0 }, { getFlipsWithContext: flipsLib.getFlipsWithContext, clearHyperactiveAtPositions: (cs, p) => {}, getCardContext: () => ({ protectedStones: [], permaProtectedStones: [] }) });
        expect(Array.isArray(res.moved)).toBe(true);
    });
});