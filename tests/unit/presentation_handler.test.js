const { handlePresentationEvent, onBoardUpdated } = require('../../ui/presentation-handler');

describe('presentation handler', () => {
    beforeEach(() => {
        // reset globals
        global.cardState = { presentationEvents: [] };
        delete global.crossfadeStoneVisual;
        delete global.applyStoneVisualEffect;
        delete global.animateProtectionExpireAt;
        delete global.CardLogic;
        // Minimal DOM mock
        global.document = { querySelector: () => null };
    });

    test('handles CROSSFADE_STONE by calling crossfade if available', async () => {
        const discMock = {};
        // make document.querySelector return node with disc
        global.document = { querySelector: () => ({ querySelector: () => discMock }) };
        let called = false;
        global.crossfadeStoneVisual = jest.fn(() => { called = true; return Promise.resolve(); });
        handlePresentationEvent({ type: 'CROSSFADE_STONE', row: 1, col: 2, effectKey: 'regenStone', owner: 1 });
        expect(global.crossfadeStoneVisual).toHaveBeenCalled();
        expect(called).toBe(true);
    });

    test('falls back to applyStoneVisualEffect when crossfade is absent', () => {
        const discMock = {};
        global.document = { querySelector: () => ({ querySelector: () => discMock }) };
        global.applyStoneVisualEffect = jest.fn();
        handlePresentationEvent({ type: 'CROSSFADE_STONE', row: 1, col: 2, effectKey: 'regenStone', owner: 1 });
        expect(global.applyStoneVisualEffect).toHaveBeenCalledWith(discMock, 'regenStone', { owner: 1 });
    });

    test('onBoardUpdated flushes events using CardLogic.flushPresentationEvents', () => {
        const evs = [{ type: 'CROSSFADE_STONE', row: 1, col: 2, effectKey: 'regenStone', owner: 1 }];
        global.CardLogic = { flushPresentationEvents: () => evs };
        global.document = { querySelector: () => ({ querySelector: () => ({}) }) };
        global.crossfadeStoneVisual = jest.fn(() => Promise.resolve());
        onBoardUpdated();
        expect(global.crossfadeStoneVisual).toHaveBeenCalled();
    });
});