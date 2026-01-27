const Chain = require('../../game/logic/cards/chain');
const { createMockPrng } = require('../test-helpers');

function mkBoard() { return Array(8).fill(null).map(() => Array(8).fill(0)); }

describe('Chain choice selection', () => {
    test('selects max score candidate deterministically', () => {
        const board = mkBoard();
        // candidate point at (0,0) has two directions: one flip of length 1, another length 2
        board[0][1] = -1; board[0][2] = -1; board[0][3] = 1; // score 2 to the right
        board[1][0] = -1; board[2][0] = 1; // score 1 down
        board[0][0] = 1; // candidate origin
        const gs = { board };

        const res = Chain.findChainChoice(gs, [{ row: 0, col: 0 }], 1, {}, createMockPrng(42));
        expect(res.applied).toBe(true);
        expect(res.flips.length).toBe(2);
    });

    test('tie broken by PRNG', () => {
        const board = mkBoard();
        // two candidate points each with score 1
        board[0][1] = -1; board[0][2] = 1; board[0][0] = 1; // candidate A
        board[2][1] = -1; board[2][2] = 1; board[2][0] = 1; // candidate B
        const gs = { board };
        const primaryFlips = [{ row: 0, col: 0 }, { row: 2, col: 0 }];

        // createMockPrng with seed chosen so random() selects index 1
        const prng = createMockPrng(7);
        const res = Chain.findChainChoice(gs, primaryFlips, 1, {}, prng);
        expect(res.applied).toBe(true);
        expect(res.chosen).not.toBeNull();
    });
});