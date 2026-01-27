const CardFlips = require('../../game/logic/cards/flips');

function mkBoard() {
    return Array(8).fill(null).map(() => Array(8).fill(0));
}

describe('Directional chain flips', () => {
    test('simple horizontal flip', () => {
        const board = mkBoard();
        // ownerVal = 1 (black), opponent = -1 (white)
        board[0][1] = -1;
        board[0][2] = -1;
        board[0][3] = 1; // terminator
        const gs = { board };
        const flips = CardFlips.getDirectionalChainFlips(gs, 0, 0, 1, [0,1], {});
        expect(flips).toEqual([{ row: 0, col: 1 }, { row: 0, col: 2 }]);
    });

    test('blocked by protected stone', () => {
        const board = mkBoard();
        board[1][1] = -1;
        board[1][2] = -1;
        board[1][3] = 1;
        const gs = { board };
        const context = { protectedStones: [{ row: 1, col: 2 }] };
        const flips = CardFlips.getDirectionalChainFlips(gs, 1, 0, 1, [0,1], context);
        expect(flips).toEqual([]);
    });

    test('returns empty if no terminator owner value', () => {
        const board = mkBoard();
        board[2][1] = -1;
        board[2][2] = -1;
        // no terminating owner cell
        const gs = { board };
        const flips = CardFlips.getDirectionalChainFlips(gs, 2, 0, 1, [0,1], {});
        expect(flips).toEqual([]);
    });

    test('returns empty when immediate neighbor is not opponent', () => {
        const board = mkBoard();
        board[3][1] = 0; // empty
        const gs = { board };
        const flips = CardFlips.getDirectionalChainFlips(gs, 3, 0, 1, [0,1], {});
        expect(flips).toEqual([]);
    });
});