const CardUtils = require('../../game/logic/cards/utils');
const SharedConstants = require('../../shared-constants');

const { BLACK, WHITE, EMPTY } = SharedConstants;

function createEmptyBoard() {
    return Array(8).fill(null).map(() => Array(8).fill(EMPTY));
}

describe('Card utility helpers', () => {
    test('getSpecialMarkerAt returns special stone marker', () => {
        const cardState = {
            specialStones: [{ row: 1, col: 1, type: 'PROTECTED', owner: 'black' }],
            bombs: []
        };
        const res = CardUtils.getSpecialMarkerAt(cardState, 1, 1);
        expect(res).toEqual({ kind: 'specialStone', marker: cardState.specialStones[0] });
    });

    test('getSpecialMarkerAt returns bomb marker', () => {
        const cardState = {
            specialStones: [],
            bombs: [{ row: 2, col: 2, remainingTurns: 1, owner: 'white' }]
        };
        const res = CardUtils.getSpecialMarkerAt(cardState, 2, 2);
        expect(res).toEqual({ kind: 'bomb', marker: cardState.bombs[0] });
    });

    test('isSpecialStoneAt returns true for special or bomb', () => {
        const cardState = {
            specialStones: [{ row: 3, col: 3, type: 'DRAGON', owner: 'black' }],
            bombs: [{ row: 4, col: 4, remainingTurns: 2, owner: 'white' }]
        };
        expect(CardUtils.isSpecialStoneAt(cardState, 3, 3)).toBe(true);
        expect(CardUtils.isSpecialStoneAt(cardState, 4, 4)).toBe(true);
    });

    test('getSpecialOwnerAt returns owner for marker', () => {
        const cardState = {
            specialStones: [{ row: 5, col: 5, type: 'BREEDING', owner: 'black' }],
            bombs: []
        };
        const res = CardUtils.getSpecialOwnerAt(cardState, 5, 5);
        expect(res).toBe('black');
    });

    test('isNormalStoneForPlayer checks board and specials', () => {
        const gameState = { board: createEmptyBoard() };
        gameState.board[0][0] = BLACK;
        gameState.board[0][1] = WHITE;

        const baseCardState = { specialStones: [], bombs: [] };
        expect(CardUtils.isNormalStoneForPlayer(baseCardState, gameState, 'black', 0, 0)).toBe(true);
        expect(CardUtils.isNormalStoneForPlayer(baseCardState, gameState, 'black', 0, 1)).toBe(false);

        const withSpecial = { specialStones: [{ row: 0, col: 0, type: 'PROTECTED', owner: 'black' }], bombs: [] };
        expect(CardUtils.isNormalStoneForPlayer(withSpecial, gameState, 'black', 0, 0)).toBe(false);

        const withBomb = { specialStones: [], bombs: [{ row: 0, col: 0, remainingTurns: 1, owner: 'black' }] };
        expect(CardUtils.isNormalStoneForPlayer(withBomb, gameState, 'black', 0, 0)).toBe(false);
    });
});
