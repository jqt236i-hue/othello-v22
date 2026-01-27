const TimerRegistry = require('../../../ui/timer-registry.js');

describe('TimerRegistry', () => {
    beforeEach(() => {
        TimerRegistry.clearAll();
    });

    test('pendingCount increases and decreases', done => {
        expect(TimerRegistry.pendingCount()).toBe(0);
        const id = TimerRegistry.setTimeout(() => {
            expect(TimerRegistry.pendingCount()).toBe(0);
            done();
        }, 10);
        expect(TimerRegistry.pendingCount()).toBe(1);
        // Do nothing; callback will assert
    });

    test('clearAll cancels timers', done => {
        const id = TimerRegistry.setTimeout(() => {
            // should not run
            done.fail(new Error('Timer should have been cleared'));
        }, 50);
        expect(TimerRegistry.pendingCount()).toBe(1);
        TimerRegistry.clearAll();
        expect(TimerRegistry.pendingCount()).toBe(0);
        // Wait a bit to ensure callback does not run
        setTimeout(() => done(), 60);
    });

    test('scope creation and clearScope works', done => {
        const scope = TimerRegistry.newScope();
        expect(typeof scope).toBe('number');
        TimerRegistry.setTimeout(() => done.fail(new Error('scoped timer should have been cleared')), 50, scope);
        expect(TimerRegistry.pendingCount()).toBe(1);
        TimerRegistry.clearScope(scope);
        expect(TimerRegistry.pendingCount()).toBe(0);
        setTimeout(() => done(), 60);
    });
});