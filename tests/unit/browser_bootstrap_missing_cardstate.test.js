const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// Simulate initial browser load where `cardState` is missing/uninitialized.
// The test asserts that first render does not throw (regression for cards.js:1471).

beforeEach(() => {
  const dom = new JSDOM(fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8'));
  global.window = dom.window;
  global.document = dom.window.document;
  global.location = dom.window.location;
  // Expose minimal constants used by UI logic
  const SC = require('../../shared-constants');
  // shared-constants sets window.BLACK when run in a browser, but some modules reference bare identifiers.
  // Ensure direct globals exist for the test harness.
  global.BLACK = SC.BLACK;
  global.WHITE = SC.WHITE;
  global.EMPTY = SC.EMPTY;
});

afterEach(() => {
  delete global.window;
  delete global.document;
  delete global.location;
  try { delete require.cache[require.resolve('../../ui/diff-renderer')]; } catch (e) {}
});

describe('Browser bootstrap: missing cardState', () => {
  test('initial render does not throw when cardState is absent', () => {
    // Minimal board container
    document.body.innerHTML = '<div id="board"></div>';
    const boardEl = document.getElementById('board');

    // Minimal game state (standard Othello starting position)
    const emptyRow = () => [0,0,0,0,0,0,0,0];
    const board = [emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()];
    board[3][3] = -1; board[3][4] = 1; board[4][3] = 1; board[4][4] = -1;
    global.gameState = { board, currentPlayer: 1, turnNumber: 0 };

    // Ensure cardState is absent (declare explicitly as undefined to avoid ReferenceError)
    global.cardState = undefined;

    // Provide minimal UI helpers expected by diff-renderer
    global.getPlayerKey = (p) => (p === 1 ? 'black' : 'white');
    // Provide minimal globals/stubs to avoid ReferenceErrors during test
    global.getLegalMoves = () => [];
    global.CardLogic = {
      getCardContext: () => ({ protectedStones: [], permaProtectedStones: [], bombs: [] }),
      getSelectableTargets: () => []
    };

    // Load the diff-renderer module (defines initializeBoardDOM, buildCurrentCellState)
    const diff = require('../../ui/diff-renderer');

    // Initialize DOM and assert that building current cell state does not throw
    expect(() => diff.initializeBoardDOM(boardEl)).not.toThrow();
    expect(() => diff.buildCurrentCellState()).not.toThrow();

    const state = diff.buildCurrentCellState();
    expect(Array.isArray(state)).toBe(true);
    expect(state.length).toBe(8);
    expect(Array.isArray(state[3]) && state[3].length === 8).toBe(true);
  });
});
