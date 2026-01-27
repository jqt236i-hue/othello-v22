const CardSelectors = require('../../game/logic/cards/selectors');
const SharedConstants = require('../../shared-constants');

const { BLACK, WHITE, EMPTY } = SharedConstants;

function mkEmptyBoard() { return Array(8).fill(null).map(() => Array(8).fill(EMPTY)); }

describe('Card selector helpers', () => {
    test('getDestroyTargets returns all non-empty cells', () => {
        const gs = { board: mkEmptyBoard() };
        gs.board[0][0] = BLACK;
        gs.board[7][7] = WHITE;
        const res = CardSelectors.getDestroyTargets({}, gs);
        expect(res).toContainEqual({ row: 0, col: 0 });
        expect(res).toContainEqual({ row: 7, col: 7 });
    });

    test('getSwapTargets excludes protected and bombs and only opponent stones', () => {
        const cardState = {
            specialStones: [{ row: 1, col: 1, type: 'PROTECTED', owner: 'white' }],
            bombs: [{ row: 2, col: 2, remainingTurns: 2, owner: 'white' }]
        };
        const gs = { board: mkEmptyBoard() };
        gs.board[1][1] = WHITE; // protected - should be excluded
        gs.board[2][2] = WHITE; // bomb - excluded
        gs.board[3][3] = WHITE; // valid
        gs.board[4][4] = BLACK; // player's own - excluded

        const res = CardSelectors.getSwapTargets(cardState, gs, 'black');
        expect(res).toContainEqual({ row: 3, col: 3 });
        expect(res).not.toContainEqual({ row: 1, col: 1 });
        expect(res).not.toContainEqual({ row: 2, col: 2 });
    });

    test('getInheritTargets returns normal stones only for player', () => {
        const cardState = { specialStones: [{ row: 0, col: 0, type: 'PROTECTED', owner: 'black' }], bombs: [] };
        const gs = { board: mkEmptyBoard() };
        gs.board[0][0] = BLACK; // protected - should be excluded
        gs.board[1][1] = BLACK; // normal - included
        const res = CardSelectors.getInheritTargets(cardState, gs, 'black');
        expect(res).toContainEqual({ row: 1, col: 1 });
        expect(res).not.toContainEqual({ row: 0, col: 0 });
    });
});