const cpu = require('../../../cpu/cpu-turn');

describe('processCpuTurn - no double run when handler exists', () => {
  let origGenerate, origExecuteMove;
  beforeEach(() => {
    jest.useFakeTimers();
    // Stub generateMoves to return a candidate so duplicated code would have executed
    origGenerate = global.generateMovesForPlayer;
    global.generateMovesForPlayer = jest.fn(() => [{ row: 1, col: 1 }]);
    // Spy on executeMove to count how many times it's invoked
    origExecuteMove = global.executeMove;
    global.executeMove = jest.fn();
  });
  afterEach(() => {
    jest.useRealTimers();
    if (origGenerate === undefined) delete global.generateMovesForPlayer; else global.generateMovesForPlayer = origGenerate;
    if (origExecuteMove === undefined) delete global.executeMove; else global.executeMove = origExecuteMove;
  });

  test('when handler.runCpuTurn exists it should not result in two executeMove calls', async () => {
    // Provide handler that itself calls executeMove once
    const handler = { runCpuTurn: async () => { try { executeMove({ row: 1, col: 1, player: 'white' }); } catch (e) {} } };
    jest.mock('../../../game/cpu-turn-handler', () => handler, { virtual: true });
    // Call processCpuTurn
    await cpu.processCpuTurn();
    // Allow timers/promises to flush
    jest.runOnlyPendingTimers();
    await Promise.resolve();

    // Expect executeMove to have been called exactly once (handler) and NOT called again by local duplicated logic
    expect(global.executeMove.mock.calls.length).toBe(1);
  });
});