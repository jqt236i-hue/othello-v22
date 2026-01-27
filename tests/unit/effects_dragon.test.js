const { processDragonEffectsAtAnchor, processDragonEffectsAtTurnStartAnchor } = require('../../game/logic/effects/dragon');

function mkBoard() { return Array(8).fill(null).map(() => Array(8).fill(0)); }

describe('dragon effect protections', () => {
    test('dragon does not convert BREEDING anchors (immediate)', () => {
        const cs = {
            specialStones: [
                { type: 'DRAGON', owner: 'black', row: 3, col: 3 },
                { type: 'BREEDING', owner: 'white', row: 3, col: 4 }
            ]
        };
        const board = mkBoard();
        board[3][3] = 1; // black
        board[3][4] = -1; // white breeding
        const gs = { board };
        const res = processDragonEffectsAtAnchor(cs, gs, 'black', 3, 3);
        expect(res.converted).toEqual([]);
        expect(gs.board[3][4]).toBe(-1);
    });

    test('dragon converts adjacent normal opponent stones', () => {
        const cs = {
            specialStones: [
                { type: 'DRAGON', owner: 'black', row: 3, col: 3 }
            ]
        };
        const board = mkBoard();
        board[3][3] = 1;
        board[3][4] = -1; // normal opponent stone
        const gs = { board };
        const res = processDragonEffectsAtAnchor(cs, gs, 'black', 3, 3);
        expect(res.converted).toContainEqual({ row: 3, col: 4 });
        expect(gs.board[3][4]).toBe(1);
    });

    test('dragon does not convert BREEDING at turn start', () => {
        const cs = {
            specialStones: [
                { type: 'DRAGON', owner: 'black', row: 4, col: 4, remainingOwnerTurns: 1 },
                { type: 'BREEDING', owner: 'white', row: 4, col: 5 }
            ]
        };
        const board = mkBoard();
        board[4][4] = 1;
        board[4][5] = -1;
        const gs = { board };
        const res = processDragonEffectsAtTurnStartAnchor(cs, gs, 'black', 4, 4);
        expect(res.converted).toEqual([]);
        expect(gs.board[4][5]).toBe(-1);
    });
});
