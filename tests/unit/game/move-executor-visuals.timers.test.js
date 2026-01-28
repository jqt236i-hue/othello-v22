const MoveExec = require('../../../game/move-executor-visuals');
const timers = require('../../../game/timers');

describe('move-executor-visuals timers abstraction', () => {
    beforeEach(() => {
        // restore default impl
        timers.setTimerImpl({});
    });

    test('animateFadeOutAt uses timers.waitMs when UI impl missing', async () => {
        let called = false;
        timers.setTimerImpl({ waitMs: (ms) => { called = true; return Promise.resolve(); } });
        await MoveExec.animateFadeOutAt(1,2,{ durationMs: 123 });
        expect(called).toBe(true);
    });

    test('animateDestroyAt uses timers.waitMs when UI impl missing', async () => {
        let called = false;
        timers.setTimerImpl({ waitMs: (ms) => { called = true; return Promise.resolve(); } });
        await MoveExec.animateDestroyAt(3,4,{ durationMs: 50 });
        expect(called).toBe(true);
    });
});
