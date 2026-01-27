const { notifyUI, _pushEvent } = require('../../../game/turn/ui-notifier');

describe('UI Notifier', () => {
    let cs;
    beforeEach(() => {
        cs = { presentationEvents: [], turnIndex: 5 };
    });

    test('notifyUI uses emitPresentationEvent helper if present', () => {
        global.emitPresentationEvent = jest.fn((cardState, ev) => { cardState.presentationEvents.push(ev); });
        const gameState = { currentPlayer: 1 };
        const ev = notifyUI(cs, gameState, { stateChanged: true, cardStateChanged: true, render: true });
        expect(global.emitPresentationEvent).toHaveBeenCalledWith(cs, expect.objectContaining({ type: 'STATE_UPDATED' }));
        delete global.emitPresentationEvent;
    });

    test('notifyUI falls back to direct push when helper missing', () => {
        const gameState = { currentPlayer: -1 };
        const ev = notifyUI(cs, gameState, { stateChanged: true });
        expect(cs.presentationEvents.some(e => e.type === 'STATE_UPDATED' && e.stateChanged === true)).toBe(true);
    });
});
