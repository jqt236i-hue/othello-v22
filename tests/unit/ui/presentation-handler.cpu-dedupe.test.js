const { onBoardUpdated } = require('../../../ui/presentation-handler');
const cpu = require('../../../cpu/cpu-turn');

describe('SCHEDULE_CPU_TURN deduplication', () => {
    let spy;
    beforeEach(() => {
        jest.useFakeTimers();
        spy = jest.spyOn(cpu, 'processCpuTurn').mockImplementation(() => {});
    });
    afterEach(() => {
        spy.mockRestore();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('multiple SCHEDULE_CPU_TURN events schedule CPU only once', async () => {
        global.cardState = { presentationEvents: [{ type: 'SCHEDULE_CPU_TURN', delayMs: 10 }, { type: 'SCHEDULE_CPU_TURN', delayMs: 10 }] };
        await onBoardUpdated();
        jest.advanceTimersByTime(10);
        jest.runOnlyPendingTimers();
        await Promise.resolve();
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
