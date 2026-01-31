describe('animateFadeOutAt runtime behavior', () => {
    beforeEach(() => {
        // Polyfill DOM if needed
        if (typeof document === 'undefined') {
            const { JSDOM } = require('jsdom');
            const dom = new JSDOM('<!doctype html><html><body></body></html>');
            global.window = dom.window;
            global.document = dom.window.document;
            // ensure other globals used by UI are present
            global.requestAnimationFrame = dom.window.requestAnimationFrame;
            global.cancelAnimationFrame = dom.window.cancelAnimationFrame;
        }

        // Prepare DOM
        document.body.innerHTML = '<div id="board"><div class="cell" data-row="3" data-col="3"><div class="disc black"></div></div></div>';
        global.boardEl = document.getElementById('board');
        // Enable animations for this test
        process.env.NOANIM = '0';
        global.window.DISABLE_ANIMATIONS = false;
        // Load UI utilities and get animateFadeOutAt
        const utils = require('../../../ui/animation-utils');
        const { animateFadeOutAt } = utils;
        // Attach to global so tests can call it easily
        global.animateFadeOutAt = animateFadeOutAt;
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        process.env.NOANIM = '1';
        global.window.DISABLE_ANIMATIONS = true;
        delete global.boardEl;
        global.__clearRegisteredTimers();
    });

    test('resolves when animationend is fired', async () => {
        const p = animateFadeOutAt(3, 3);
        const disc = document.querySelector('.cell .disc');
        // Fire animationend shortly after
        setTimeout(() => {
            const ev = document.createEvent('Event');
            ev.initEvent('animationend', true, true);
            disc.dispatchEvent(ev);
        }, 10);
        jest.advanceTimersByTime(20);
        await expect(p).resolves.toBeUndefined();
    });

    test('resolves via safety timeout when animationend does not fire', async () => {
        const SharedConstants = require('../../../shared-constants');
        const timeoutMs = SharedConstants.DESTROY_FADE_MS + 200;
        const p = animateFadeOutAt(3, 3);
        // Advance time to beyond safety timeout
        jest.advanceTimersByTime(timeoutMs + 10);
        await expect(p).resolves.toBeUndefined();
    });
});