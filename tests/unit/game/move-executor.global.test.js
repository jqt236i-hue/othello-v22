const ME = require('../../../game/move-executor');

describe('move-executor global exposure', () => {
    afterAll(() => {
        try { delete globalThis.executeMove; } catch (e) { /* ignore */ }
    });

    test('module exports executeMove', () => {
        expect(typeof ME.executeMove).toBe('function');
    });

    test('executeMove is exposed on globalThis', () => {
        expect(typeof globalThis.executeMove).toBe('function');
    });
});
