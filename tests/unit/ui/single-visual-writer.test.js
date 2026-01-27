const jsdom = require('jsdom');
const { JSDOM } = jsdom;

beforeEach(() => {
    const dom = new JSDOM(require('fs').readFileSync(require('path').resolve(__dirname, '../../../index.html'), 'utf8'));
    global.window = dom.window;
    global.document = dom.window.document;
    document.body.innerHTML = '<div id="board"></div>';
    global.boardEl = document.getElementById('board');
});

afterEach(() => {
    delete global.window;
    delete global.document;
});

test('renderBoard throws when VisualPlaybackActive and __DEV__', () => {
    window.VisualPlaybackActive = true;
    window.__DEV__ = true;

    const ui = require('../../../ui.js');
    expect(() => {
        // call the function reference
        const { renderBoard } = require('../../../ui.js');
        renderBoard();
    }).toThrow(/renderBoard called during active VisualPlayback/);
});

test('renderBoard logs and aborts playback when VisualPlaybackActive in prod', () => {
    window.VisualPlaybackActive = true;
    delete window.__DEV__;
    // Mock AnimationEngine.abortAndSync
    const mockEngine = { abortAndSync: jest.fn() };
    window.AnimationEngine = mockEngine;

    const { renderBoard } = require('../../../ui.js');
    // Should not throw
    expect(() => renderBoard()).not.toThrow();
    expect(mockEngine.abortAndSync).toHaveBeenCalled();
});