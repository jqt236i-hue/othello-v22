const { playPresentationEvents } = require('../../../ui/playback-engine');

describe('PlaybackEngine', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    test('plays PLAYBACK_EVENTS via AnimationEngine.play when available', async () => {
        const cardState = { presentationEvents: [{ type: 'PLAYBACK_EVENTS', events: [{ foo: 'bar' }] }] };
        const mockPlay = jest.fn(async () => {});
        await playPresentationEvents(cardState, { AnimationEngine: { play: mockPlay } });
        expect(mockPlay).toHaveBeenCalledWith([{ foo: 'bar' }]);
    });

    test('SCHEDULE_CPU_TURN calls scheduleCpuTurn when provided', async () => {
        const cardState = { presentationEvents: [{ type: 'SCHEDULE_CPU_TURN', delayMs: 50 }] };
        const scheduleSpy = jest.fn((delay, cb) => { setTimeout(cb, delay); });
        const procSpy = jest.fn();
        await playPresentationEvents(cardState, { scheduleCpuTurn: scheduleSpy, onSchedule: procSpy });
        expect(scheduleSpy).toHaveBeenCalledWith(50, expect.any(Function));
        // advance timers to execute callback
        jest.advanceTimersByTime(50);
        jest.runOnlyPendingTimers();
        expect(procSpy).toHaveBeenCalled();
    });
});
