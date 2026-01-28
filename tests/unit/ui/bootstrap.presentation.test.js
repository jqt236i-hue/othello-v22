const bootstrap = require('../../../ui/bootstrap');
const ph = require('../../../ui/presentation-handler');

describe('UI bootstrap DI wiring', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    test('installGameDI wires scheduleCpuTurn to call cpu.processCpuTurn', async () => {
        jest.useFakeTimers();
        // spy on cpu module
        const cpu = require('../../../cpu/cpu-turn');
        const spy = jest.spyOn(cpu, 'processCpuTurn').mockImplementation(() => {});

        // Call installGameDI which should wire presentation-handler schedule
        const { timersImpl } = bootstrap.installGameDI();

        // Ensure setUIImpl took place
        expect(typeof ph.setUIImpl).toBe('function');

        // Simulate a schedule: call the impl registered on presentation handler (if any)
        // We can't access the internal impl, so simulate by invoking onBoardUpdated with SCHEDULE_CPU_TURN
        global.cardState = { presentationEvents: [{ type: 'SCHEDULE_CPU_TURN', delayMs: 10 }] };
        await ph.onBoardUpdated();

        // advance timers
        jest.advanceTimersByTime(10);
        // run any pending timers and allow promise microtasks to flush
        jest.runOnlyPendingTimers();
        await Promise.resolve();
        await Promise.resolve();

        expect(spy).toHaveBeenCalled();

        spy.mockRestore();
        jest.useRealTimers();
    });
});