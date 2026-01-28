const cpu = require('../../../cpu/cpu-turn');

describe('processAutoBlackTurn defensive checks', () => {
    beforeEach(() => {
        // reset global flags
        if (typeof global.window === 'undefined') global.window = {};
        global.window.autoSimple = { isEnabled: () => false };
        global.window.HUMAN_PLAY_MODE = 'black';
        // Ensure isProcessing reset
        if (typeof global.isProcessing !== 'undefined') global.isProcessing = false;
    });

    afterEach(() => {
        delete global.window.autoSimple;
        delete global.window.HUMAN_PLAY_MODE;
    });

    test('ignores call when auto is disabled', () => {
        cpu.processAutoBlackTurn();
        expect(global.isProcessing).not.toBe(true); // should not set processing to true
    });

    test('ignores call when human mode is not black', () => {
        global.window.autoSimple = { isEnabled: () => true };
        global.window.HUMAN_PLAY_MODE = 'both';
        cpu.processAutoBlackTurn();
        expect(global.isProcessing).not.toBe(true);
    });
});
