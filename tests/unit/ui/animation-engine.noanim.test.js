const jsdom = require('jsdom');
const { JSDOM } = jsdom;

beforeEach(() => {
    const dom = new JSDOM(require('fs').readFileSync(require('path').resolve(__dirname, '../../../index.html'), 'utf8'));
    global.window = dom.window;
    global.document = dom.window.document;
    // Minimal DOM elements required by engine
    document.body.innerHTML = '<div id="board"></div>';
    global.boardEl = document.getElementById('board');

    // Expose timer registry
    const TimerRegistry = require('../../../ui/timer-registry.js');
    window.TimerRegistry = TimerRegistry;
});

afterEach(() => {
    delete global.window;
    delete global.document;
});

test('AnimationEngine.play resolves in noanim and VisualPlaybackActive toggles', async () => {
    window.DISABLE_ANIMATIONS = true;
    const AnimationEngine = require('../../../ui/animation-engine.js');

    expect(window.VisualPlaybackActive).toBe(undefined);

    const events = [
        { type: 'place', phase: 1, targets: [{ r: 2, col: 2, after: { color: 1, special: null, timer: null } }] },
        { type: 'flip', phase: 2, targets: [{ r: 2, col: 3, after: { color: -1, special: null, timer: null } }] },
        { type: 'destroy', phase: 3, targets: [{ r: 3, col: 3, after: { color: 0, special: null, timer: null } }] },
        { type: 'spawn', phase: 4, targets: [{ r: 5, col: 5, after: { color: 1, special: null, timer: null } }] }
    ];

    await AnimationEngine.play(events);

    expect(window.VisualPlaybackActive).toBe(false);
    // TimerRegistry should have no pending timers
    expect(window.TimerRegistry.pendingCount()).toBe(0);

    // Test abortAndSync idempotence
    window.VisualPlaybackActive = true;
    AnimationEngine.abortAndSync();
    expect(window.VisualPlaybackActive).toBe(false);
    expect(window.TimerRegistry.pendingCount()).toBe(0);
});