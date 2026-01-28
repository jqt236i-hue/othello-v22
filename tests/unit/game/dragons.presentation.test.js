const Dragons = require('../../../game/special-effects/dragons');

beforeEach(() => {
    global.BLACK = 1;
    global.WHITE = -1;
    global.cardState = { presentationEvents: [] };
    global.gameState = { board: Array.from({ length: 8 }, () => Array(8).fill(0)) };
});

test('processUltimateReverseDragonsAtTurnStart emits CHANGE presentation events for converted flips', async () => {
    const precomputedEvents = [ { type: 'dragon_converted_immediate', details: [ { row: 3, col: 4 } ] } ];
    global.gameState.board[3][4] = global.BLACK;
    const emitted = [];
    global.emitPresentationEvent = (cs, ev) => { emitted.push(ev); };

    await Dragons.processUltimateReverseDragonsAtTurnStart(global.BLACK, null, precomputedEvents);

    expect(emitted.some(e => e.type === 'CHANGE' && e.row === 3 && e.col === 4)).toBe(true);
});
