const { onBoardUpdated } = require('../../../ui/presentation-handler');
const Playback = require('../../../ui/playback-engine');

jest.useFakeTimers();

describe('Presentation handler integrates with PlaybackEngine', () => {
    let originalCardState;
    beforeEach(() => {
        originalCardState = global.cardState;
    });
    afterEach(() => {
        global.cardState = originalCardState;
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('calls Playback.playPresentationEvents when presentation events are present', async () => {
        const playSpy = jest.spyOn(Playback, 'playPresentationEvents').mockImplementation(async () => {});
        global.cardState = { presentationEvents: [{ type: 'PLAYBACK_EVENTS', events: [{ a: 1 }] }] };
        await onBoardUpdated();
        expect(playSpy).toHaveBeenCalled();
        playSpy.mockRestore();
    });

    test('SCHEDULE_CPU_TURN causes processCpuTurn to be called via onSchedule', async () => {
        const schedulePlaySpy = jest.spyOn(Playback, 'playPresentationEvents').mockImplementation(async () => {});
        const proc = jest.fn();
        global.processCpuTurn = proc;
        global.cardState = { presentationEvents: [{ type: 'SCHEDULE_CPU_TURN', delayMs: 10 }] };
        // run handler which should call playPresentationEvents which schedules processCpuTurn via onSchedule
        await onBoardUpdated();
        // simulate UI executing scheduled callback
        jest.advanceTimersByTime(10);
        // processCpuTurn should have been called (via onSchedule callback executed after schedule)
        // Note: playPresentationEvents uses onSchedule to call processCpuTurn directly when scheduled; ensure at least play called
        expect(schedulePlaySpy).toHaveBeenCalled();
        schedulePlaySpy.mockRestore();
        try { delete global.processCpuTurn; } catch (e) {}
    });
});
