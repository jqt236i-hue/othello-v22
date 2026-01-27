const TM = require('../../../game/turn-manager');

describe('turn-manager requestUIRender', () => {
    beforeEach(() => {
        // clear any globals
        try { delete global.emitBoardUpdate; } catch (e) {}
        try { delete global.renderBoard; } catch (e) {}
        try { delete global.renderCardUI; } catch (e) {}
    });

    test('prefers emitBoardUpdate when available', () => {
        global.emitBoardUpdate = jest.fn();
        TM.requestUIRender();
        expect(global.emitBoardUpdate).toHaveBeenCalled();
    });

    test('falls back to renderBoard and renderCardUI when no emitBoardUpdate', () => {
        global.renderBoard = jest.fn();
        global.renderCardUI = jest.fn();
        TM.requestUIRender();
        expect(global.renderBoard).toHaveBeenCalled();
        expect(global.renderCardUI).toHaveBeenCalled();
    });
});
