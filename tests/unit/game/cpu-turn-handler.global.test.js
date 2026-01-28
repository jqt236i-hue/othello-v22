describe('cpu-turn-handler module does not pollute globals', () => {
    beforeEach(() => {
        // Ensure we test module initialization freshly
        try { delete global.processCpuTurn; } catch (e) {}
        jest.resetModules();
    });

    test('requiring cpu-turn-handler does not expose processCpuTurn on globalThis', () => {
        require('../../../game/cpu-turn-handler');
        expect(typeof global.processCpuTurn).not.toBe('function');
    });
});
