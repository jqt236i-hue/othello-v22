const ph = require('../../../ui/presentation-handler');
const cpu = require('../../../cpu/cpu-turn');

describe('presentation handler dedupe uses configurable CPU_DEDUPE_MS', () => {
  let spy;
  beforeEach(() => {
    jest.useFakeTimers();
    spy = jest.spyOn(cpu, 'processCpuTurn').mockImplementation(() => {});
  });
  afterEach(() => {
    spy.mockRestore();
    jest.useRealTimers();
    try { delete global.__cpuLastRunAt; } catch (e) {}
    try { delete global.CPU_DEDUPE_MS; } catch (e) {}
  });

  test('when CPU_DEDUPE_MS is large and recent run exists, fallback skips calling CPU', async () => {
    // Set recent CPU run and large dedupe window
    try { global.__cpuLastRunAt = Date.now(); } catch (e) {}
    try { global.CPU_DEDUPE_MS = 1000; } catch (e) {}

    global.cardState = { presentationEvents: [{ type: 'SCHEDULE_CPU_TURN', delayMs: 0 }] };
    await ph.onBoardUpdated();
    // advance immediate timers
    jest.runOnlyPendingTimers();
    await Promise.resolve();

    expect(spy).not.toHaveBeenCalled();
  });
});