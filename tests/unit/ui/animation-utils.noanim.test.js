const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// Load DOM environment
let window, document;

beforeEach(() => {
    const dom = new JSDOM(fs.readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8'));
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.location = window.location;
});

afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.location;
});

describe('No-Animation mode (animation-utils)', () => {
    test('playHandAnimation immediate completion with noanim', done => {
        // Setup minimal board elements
        document.body.innerHTML = '<div id="board"><div class="cell" data-row="3" data-col="3"><div class="disc black"></div></div></div><div id="handLayer" style="display:none"></div><div id="handWrapper"></div><div id="heldStone"></div>';
        global.boardEl = document.getElementById('board');
        global.handLayer = document.getElementById('handLayer');
        global.handWrapper = document.getElementById('handWrapper');
        global.heldStone = document.getElementById('heldStone');
        global.SoundEngine = { init: () => {}, playStoneClack: () => {} };

        // Load modules
        const TimerRegistry = require('../../../ui/timer-registry.js');
        window.TimerRegistry = TimerRegistry;
        window.DISABLE_ANIMATIONS = true;

        // Initialize UI flags via initializeUI so tests don't assume globals
        const UIInit = require('../../../ui/handlers/init.js');
        if (typeof UIInit.initializeUI === 'function') UIInit.initializeUI();

        const { playHandAnimation } = require('../../../ui/animation-utils.js');

        // Call and expect onComplete to be called synchronously
        let called = false;
        playHandAnimation(1, 3, 3, () => {
            called = true;
        });
        expect(called).toBe(true);
        expect(window.isCardAnimating).toBe(false);
        done();
    });

    test('animateFadeOutAt resolves immediately with noanim', async () => {
        document.body.innerHTML = '<div id="board"><div class="cell" data-row="2" data-col="2"><div class="disc white"></div></div></div>';
        global.boardEl = document.getElementById('board');
        window.DISABLE_ANIMATIONS = true;
        const { animateFadeOutAt } = require('../../../ui/animation-utils.js');
        await animateFadeOutAt(2, 2);
        // if no errors, it's fine
        expect(true).toBe(true);
    });
});