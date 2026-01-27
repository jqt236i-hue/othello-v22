const CardFlips = require('../../game/logic/cards/flips');
const SharedConstants = require('../../shared-constants');

const { BLACK, WHITE, EMPTY } = SharedConstants;

function mkBoard() { return Array(8).fill(null).map(() => Array(8).fill(EMPTY)); }

describe('getFlipsWithContext', () => {
    test('captures in two directions', () => {
        const board = mkBoard();
        // right direction
        board[0][1] = -1; board[0][2] = 1;
        // down direction
        board[1][0] = -1; board[2][0] = 1;
        const gs = { board };
        const res = CardFlips.getFlipsWithContext(gs, 0, 0, 1, {});
        expect(res).toContainEqual([0,1]);
        expect(res).toContainEqual([1,0]);
    });

    test('respects protected stones', () => {
        const board = mkBoard();
        board[1][0] = -1; board[2][0] = -1; board[3][0] = 1;
        const ctx = { protectedStones: [{ row: 2, col: 0 }] };
        const res = CardFlips.getFlipsWithContext({ board }, 1, -1, 1, ctx);
        // placing at out-of-bounds should return [] - border case: use valid pos
        const res2 = CardFlips.getFlipsWithContext({ board }, 0, 0, 1, ctx);
        expect(res2).not.toContainEqual([2,0]);
    });

    test('returns empty if no terminator', () => {
        const board = mkBoard();
        board[4][5] = -1; board[4][6] = -1; // no terminator
        const res = CardFlips.getFlipsWithContext({ board }, 4, 4, 1, {});
        expect(res).toEqual([]);
    });
});
