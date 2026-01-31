const jsdom = require('jsdom');
const { JSDOM } = jsdom;

beforeEach(() => {
    const dom = new JSDOM(require('fs').readFileSync(require('path').resolve(__dirname, '../../../index.html'), 'utf8'));
    global.window = dom.window;
    global.document = dom.window.document;
    // Minimal DOM elements required by engine
    document.body.innerHTML = '<div id="board"><div class="cell" data-row="3" data-col="3"><div class="disc black"></div></div></div>';
    global.boardEl = document.getElementById('board');

    // Expose timer registry
    const TimerRegistry = require('../../../ui/timer-registry.js');
    window.TimerRegistry = TimerRegistry;
});

afterEach(() => {
    delete global.window;
    delete global.document;
});

test('AnimationEngine.play locks input during destroy and unlocks after', async () => {
    // Enable animations
    process.env.NOANIM = '0';
    window.DISABLE_ANIMATIONS = false;

    const AnimationEngine = require('../../../ui/animation-engine.js');

    const events = [
        { type: 'destroy', phase: 3, targets: [{ r: 3, col: 3, after: { color: 0, special: null, timer: null } }] }
    ];

    // Start playback but do not await immediately
    const p = AnimationEngine.play(events);

    // Immediately after starting, playback active and lock should be set
    expect(window.VisualPlaybackActive).toBe(true);
    expect(global.boardEl.classList.contains('playback-locked')).toBe(true);

    // Fire animationend so playback can finish
    const disc = document.querySelector('.cell .disc');
    setTimeout(() => {
        const ev = document.createEvent('Event');
        ev.initEvent('animationend', true, true);
        disc.dispatchEvent(ev);
    }, 50);

    await p;

    expect(window.VisualPlaybackActive).toBe(false);
    expect(global.boardEl.classList.contains('playback-locked')).toBe(false);
});