const CardTimeBomb = require('../../game/logic/cards/time_bomb');
const SharedConstants = require('../../shared-constants');

const { BLACK, WHITE, EMPTY } = SharedConstants;

function mkBoard() { return Array(8).fill(null).map(() => Array(8).fill(EMPTY)); }

describe('Time bomb helpers', () => {
    test('applyTimeBomb places a bomb', () => {
        const cs = { bombs: [], turnIndex: 5 };
        const res = CardTimeBomb.applyTimeBomb(cs, 'black', 3, 3, { addMarker: (cs, kind, r, c, owner, data) => { cs.bombs.push({ row: r, col: c, remainingTurns: data.remainingTurns, owner, placedTurn: data.placedTurn }); return { placed: true }; } });
        expect(res.placed).toBe(true);
        expect(cs.bombs.length).toBe(1);
        expect(cs.bombs[0].remainingTurns).toBe(SharedConstants.TIME_BOMB_TURNS);
    });

    test('tickBombs decreases turn and explodes when zero', () => {
        const cs = { bombs: [{ row: 2, col: 2, remainingTurns: 1, owner: 'black', placedTurn: 0 }], specialStones: [] };
        const board = mkBoard();
        board[1][1] = WHITE; board[1][2] = WHITE; board[1][3] = WHITE;
        const gs = { board };
        const res = CardTimeBomb.tickBombs(cs, gs, 'black');
        expect(res.exploded).toEqual([{ row: 2, col: 2 }]);
        // destroyed should include surrounding cells that were non-empty
        expect(res.destroyed).toContainEqual({ row: 1, col: 1 });
        // bomb list should be empty after explosion
        expect(cs.bombs.length).toBe(0);
    });

    test('bomb does not tick on same placed turn', () => {
        const cs = { bombs: [{ row: 0, col: 0, remainingTurns: 3, owner: 'black', placedTurn: 10 }], turnIndex: 10 };
        const gs = { board: mkBoard() };
        const res = CardTimeBomb.tickBombs(cs, gs, 'black');
        expect(res.exploded).toEqual([]);
        expect(cs.bombs.length).toBe(1);
    });

    test('clear bomb on flip prevents explosion', () => {
        const cs = { bombs: [{ row: 4, col: 4, remainingTurns: 1, owner: 'black', placedTurn: 0 }], specialStones: [] };
        const board = mkBoard();
        board[4][4] = -1; // currently white
        const gs = { board };
        // simulate flip clearing the bomb
        cs.bombs = cs.bombs.filter(b => !(b.row === 4 && b.col === 4));
        const res = CardTimeBomb.tickBombs(cs, gs, 'black');
        expect(res.exploded).toEqual([]);
    });
});