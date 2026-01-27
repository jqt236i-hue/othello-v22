/* eslint-env node, jest */
const bootstrap = require('../../../ui/bootstrap');

describe('UI bootstrap DI', () => {
    test('installGameDI sets timers and does not throw', async () => {
        expect(typeof bootstrap.installGameDI).toBe('function');
        const res = bootstrap.installGameDI();
        const timers = require('../../../game/timers');
        expect(typeof timers.waitMs).toBe('function');
        await expect(timers.waitMs(0)).resolves.toBeUndefined();
    });
});