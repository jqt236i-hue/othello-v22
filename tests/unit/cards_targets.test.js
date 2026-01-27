const CardTargets = require('../../game/logic/cards/targets');
const SharedConstants = require('../../shared-constants');

const { BLACK, WHITE, EMPTY } = SharedConstants;

describe('Card target helpers', () => {
    test('getTemptWillTargets returns opponent special stones that are occupied', () => {
        const cardState = {
            specialStones: [
                { row: 1, col: 1, type: 'PROTECTED', owner: 'white' },
                { row: 2, col: 2, type: 'DRAGON', owner: 'black' },
                { row: 3, col: 3, type: 'BREEDING', owner: 'white' }
            ]
        };
        const board = Array(8).fill(null).map(() => Array(8).fill(EMPTY));
        board[1][1] = BLACK; // occupied by black visually
        board[2][2] = BLACK;
        board[3][3] = EMPTY; // empty visually - should be ignored

        const gs = { board };

        const res = CardTargets.getTemptWillTargets(cardState, gs, 'black');
        expect(res).toEqual([{ row: 1, col: 1 }]);
    });

    test('getTemptWillTargets returns empty array if no matches', () => {
        const cardState = { specialStones: [] };
        const gs = { board: Array(8).fill(null).map(() => Array(8).fill(EMPTY)) };
        const res = CardTargets.getTemptWillTargets(cardState, gs, 'black');
        expect(res).toEqual([]);
    });
});
