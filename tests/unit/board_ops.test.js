const BoardOps = require('../../game/logic/board_ops');
const CardLogic = require('../../game/logic/cards');

test('spawnAt places stone and emits SPAWN', () => {
    const cs = CardLogic.createCardState();
    const gs = { board: Array(8).fill(0).map(()=>Array(8).fill(0)) };

    const res = BoardOps.spawnAt(cs, gs, 2, 2, 'black', 'TEST', 'test_spawn');
    expect(res.stoneId).toBeDefined();
    expect(gs.board[2][2]).not.toBe(0);
    expect(Array.isArray(cs.presentationEvents)).toBe(true);
    const ev = cs.presentationEvents.find(e => e.type === 'SPAWN' && e.stoneId === res.stoneId);
    expect(ev).toBeDefined();
    expect(ev.row).toBe(2);
    expect(ev.col).toBe(2);
});

test('destroyAt clears stone and emits DESTROY', () => {
    const cs = CardLogic.createCardState();
    const gs = { board: Array(8).fill(0).map(()=>Array(8).fill(0)) };
    gs.board[3][3] = (CardLogic.BLACK || 1);

    const res = BoardOps.destroyAt(cs, gs, 3, 3, 'TEST', 'test_destroy');
    expect(res.destroyed).toBe(true);
    expect(gs.board[3][3]).toBe(0);
    const ev = cs.presentationEvents.find(e => e.type === 'DESTROY' && e.row === 3 && e.col === 3);
    expect(ev).toBeDefined();
});

test('changeAt flips owner and emits CHANGE', () => {
    const cs = CardLogic.createCardState();
    const gs = { board: Array(8).fill(0).map(()=>Array(8).fill(0)) };
    gs.board[4][4] = (CardLogic.BLACK || 1);

    const res = BoardOps.changeAt(cs, gs, 4, 4, 'white', 'TEST', 'test_change');
    expect(res.changed).toBe(true);
    expect(gs.board[4][4]).toBe((CardLogic.WHITE || -1));
    const ev = cs.presentationEvents.find(e => e.type === 'CHANGE' && e.row === 4 && e.col === 4);
    expect(ev).toBeDefined();
});

test('moveAt moves a stone and emits MOVE', () => {
    const cs = CardLogic.createCardState();
    const gs = { board: Array(8).fill(0).map(()=>Array(8).fill(0)) };
    gs.board[5][5] = (CardLogic.BLACK || 1);

    const res = BoardOps.moveAt(cs, gs, 5, 5, 6, 6, 'TEST', 'test_move');
    expect(res.moved).toBe(true);
    expect(gs.board[5][5]).toBe(0);
    expect(gs.board[6][6]).toBe((CardLogic.BLACK || 1));
    const ev = cs.presentationEvents.find(e => e.type === 'MOVE' && e.row === 6 && e.col === 6);
    expect(ev).toBeDefined();
});