describe('emitBoardUpdate wrapper in presentation handler', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        global.window = {};
        global.cardState = { presentationEvents: [{ type: 'PLAYBACK_EVENTS', events: [{ a: 1 }] }] };
        // mock PlaybackEngine on window
        global.window.PlaybackEngine = { playPresentationEvents: jest.fn(async () => {}) };
        // provide rAF to call microtask synchronously
        global.window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    });
    afterEach(() => {
        jest.useRealTimers();
        try { delete global.window; } catch (e) {}
        try { delete global.cardState; } catch (e) {}
    });

    test('window.emitBoardUpdate wrapper calls PlaybackEngine.playPresentationEvents', async () => {
        // Re-require presentation-handler to set up the wrapper in the presence of global.window
        jest.resetModules();
        const ph = require('../../../ui/presentation-handler');
        expect(typeof global.window.emitBoardUpdate).toBe('function');
        global.window.emitBoardUpdate();
        // rAF uses setTimeout; run timers
        jest.advanceTimersByTime(1);
        expect(global.window.PlaybackEngine.playPresentationEvents).toHaveBeenCalled();
    });
});