const Hyper = require('../../../game/special-effects/hyperactive');

beforeEach(() => {
    global.BLACK = 1;
    global.WHITE = -1;
    global.cardState = { presentationEvents: [] };
    global.gameState = { board: Array.from({ length: 8 }, () => Array(8).fill(0)) };
});

test('processHyperactiveMovesAtTurnStart emits CHANGE presentation events for flips', async () => {
    // Precompute a result with a flipped stone at (2,3)
    const precomputedResult = {
        moved: [],
        destroyed: [],
        flipped: [{ row: 2, col: 3 }],
        flippedByOwner: { black: [{ row: 2, col: 3 }] }
    };
    // Set resulting board owner
    global.gameState.board[2][3] = global.BLACK;

    const emitted = [];
    global.emitPresentationEvent = (cs, ev) => { emitted.push(ev); };

    await Hyper.processHyperactiveMovesAtTurnStart(global.BLACK, precomputedResult, []);

    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted.some(e => e.type === 'CHANGE' && e.row === 2 && e.col === 3)).toBe(true);
});
