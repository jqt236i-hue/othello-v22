const { onBoardUpdated } = require('../../../ui/presentation-handler');
const Playback = require('../../../ui/playback-engine');

describe('Presentation handler integrates with PlaybackEngine', () => {
    let originalCardState;
    let playbackApi;
    beforeEach(() => {
        originalCardState = global.cardState;
        jest.useFakeTimers();
        playbackApi = (global.window && global.window.PlaybackEngine) ? global.window.PlaybackEngine : Playback;
    });
    afterEach(() => {
        global.cardState = originalCardState;
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('calls Playback.playPresentationEvents when presentation events are present', async () => {
        const playSpy = jest.spyOn(playbackApi, 'playPresentationEvents').mockImplementation(async () => {});
        global.cardState = { presentationEvents: [{ type: 'PLAYBACK_EVENTS', events: [{ a: 1 }] }] };
        await onBoardUpdated();
        expect(playSpy).toHaveBeenCalled();
        playSpy.mockRestore();
    });

    test('SCHEDULE_CPU_TURN causes processCpuTurn to be called via onSchedule', async () => {
        const cpu = require('../../../cpu/cpu-turn');
        const spy = jest.spyOn(cpu, 'processCpuTurn').mockImplementation(() => {});

        global.cardState = { presentationEvents: [{ type: 'SCHEDULE_CPU_TURN', delayMs: 10 }] };
        await onBoardUpdated();

        jest.advanceTimersByTime(10);

        expect(spy).toHaveBeenCalledTimes(1);
        spy.mockRestore();
    });

    test('SCHEDULE_CPU_TURN triggers CPU when presentation-handler is wired to cpu module via setUIImpl', async () => {
        const cpu = require('../../../cpu/cpu-turn');
        const spy = jest.spyOn(cpu, 'processCpuTurn').mockImplementation(() => {});

        // Wire presentation handler to use cpu module directly
        const ph = require('../../../ui/presentation-handler');
        ph.setUIImpl({});
        ph.setUIImpl({ scheduleCpuTurn: (delay) => { cpu.processCpuTurn(); } });

        global.cardState = { presentationEvents: [{ type: 'SCHEDULE_CPU_TURN', delayMs: 10 }] };
        await onBoardUpdated();

        jest.advanceTimersByTime(10);

        expect(spy).toHaveBeenCalledTimes(1);

        spy.mockRestore();
    });

    test('SCHEDULE_CPU_TURN ignored when no scheduler is registered and no global exists', async () => {
        jest.useFakeTimers();
        // Ensure no global and no UI wiring
        try { delete global.processCpuTurn; } catch (e) {}
        const ph = require('../../../ui/presentation-handler');
        ph.setUIImpl({});

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const schedulePlaySpy = jest.spyOn(playbackApi, 'playPresentationEvents');
        global.cardState = { presentationEvents: [{ type: 'SCHEDULE_CPU_TURN', delayMs: 10 }] };

        await onBoardUpdated();
        // advance timers used by playback-engine scheduling
        jest.advanceTimersByTime(20);

        expect(warnSpy).toHaveBeenCalled();

        schedulePlaySpy.mockRestore(); warnSpy.mockRestore();
        jest.useRealTimers();
    });

    test('SCHEDULE_CPU_TURN triggers CPU when presentation-handler is wired to cpu module via setUIImpl', async () => {
        const cpu = require('../../../cpu/cpu-turn');
        const spy = jest.spyOn(cpu, 'processCpuTurn').mockImplementation(() => {});

        // Wire presentation handler to use cpu module directly (clear any previous impl first)
        const ph = require('../../../ui/presentation-handler');
        ph.setUIImpl({});
        ph.setUIImpl({ scheduleCpuTurn: (delay) => { cpu.processCpuTurn(); } });

        const schedulePlaySpy = jest.spyOn(playbackApi, 'playPresentationEvents');
        global.cardState = { presentationEvents: [{ type: 'SCHEDULE_CPU_TURN', delayMs: 10 }] };
        await onBoardUpdated();

        // Advance playback-engine timer which invokes the onSchedule callback
        jest.advanceTimersByTime(10);
        jest.runOnlyPendingTimers();
        await Promise.resolve();

        expect(schedulePlaySpy).not.toHaveBeenCalled();
        expect(spy).toHaveBeenCalledTimes(1);

        schedulePlaySpy.mockRestore();
        spy.mockRestore();
    });

    test('SCHEDULE_CPU_TURN handled via module when no UI scheduler registered', async () => {
        jest.useFakeTimers();
        // Ensure no global and no UI wiring
        try { delete global.processCpuTurn; } catch (e) {}
        const ph = require('../../../ui/presentation-handler');
        ph.setUIImpl({});

        // Spy CPU module instead of expecting a console warning (module-first fallback behavior)
        const cpu = require('../../../cpu/cpu-turn');
        const cpuSpy = jest.spyOn(cpu, 'processCpuTurn').mockImplementation(() => {});
        const schedulePlaySpy = jest.spyOn(playbackApi, 'playPresentationEvents');

        global.cardState = { presentationEvents: [{ type: 'SCHEDULE_CPU_TURN', delayMs: 10 }] };

        await onBoardUpdated();
        // advance timers used by scheduling
        jest.advanceTimersByTime(20);

        expect(schedulePlaySpy).not.toHaveBeenCalled();
        expect(cpuSpy).toHaveBeenCalled();

        schedulePlaySpy.mockRestore(); cpuSpy.mockRestore();
        jest.useRealTimers();
    });
});
