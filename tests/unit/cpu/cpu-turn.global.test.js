describe('cpu/cpu-turn module exports', () => {
    beforeEach(() => {
        try { delete global.processCpuTurn; } catch (e) {}
        jest.resetModules();
    });

    test('cpu module exports processCpuTurn but does not pollute globals', () => {
        const cpu = require('../../../cpu/cpu-turn');
        expect(typeof cpu.processCpuTurn).toBe('function');
        expect(typeof global.processCpuTurn).not.toBe('function');
    });
});
