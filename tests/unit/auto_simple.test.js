const Auto = require('../../game/auto');

describe('Auto simple loop', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.BLACK = 1;
    global.gameState = { currentPlayer: BLACK };
    global.isProcessing = false;
    global.isCardAnimating = false;
    // mock CPU entry
    global.processAutoBlackTurn = jest.fn();
  });

  afterEach(() => {
    Auto.disable();
    jest.useRealTimers();
    delete global.processAutoBlackTurn;
  });

  test('enable starts loop and calls processAutoBlackTurn when conditions met', async () => {
    Auto.setIntervalMs(100);
    Auto.enable();
    // advance time to let loop run a few times
    jest.advanceTimersByTime(350);
    expect(global.processAutoBlackTurn).toHaveBeenCalled();
  });

  test('does not trigger while processing', async () => {
    Auto.setIntervalMs(100);
    global.isProcessing = true;
    Auto.enable();
    jest.advanceTimersByTime(350);
    expect(global.processAutoBlackTurn).not.toHaveBeenCalled();
  });

  test('disable stops further calls', async () => {
    Auto.setIntervalMs(100);
    Auto.enable();
    jest.advanceTimersByTime(150);
    expect(global.processAutoBlackTurn).toHaveBeenCalled();
    const calls = global.processAutoBlackTurn.mock.calls.length;
    Auto.disable();
    jest.advanceTimersByTime(500);
    expect(global.processAutoBlackTurn.mock.calls.length).toBe(calls);
  });
});