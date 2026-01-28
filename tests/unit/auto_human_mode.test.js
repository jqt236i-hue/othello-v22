const Auto = require('../../game/auto');

describe('Auto enable respects HUMAN_PLAY_MODE', () => {
    beforeEach(() => {
        // Ensure starting disabled
        Auto.disable();
        if (typeof global.window === 'undefined') global.window = {};
        global.window.HUMAN_PLAY_MODE = undefined;
        global.window.DEBUG_HUMAN_VS_HUMAN = false;
    });

    afterEach(() => {
        Auto.disable();
        delete global.window.HUMAN_PLAY_MODE;
    });

    test('enable blocked when HUMAN_PLAY_MODE is white', () => {
        global.window.HUMAN_PLAY_MODE = 'white';
        Auto.enable();
        expect(Auto.isEnabled()).toBe(false);
    });

    test('enable blocked when HUMAN_PLAY_MODE is both', () => {
        global.window.HUMAN_PLAY_MODE = 'both';
        Auto.enable();
        expect(Auto.isEnabled()).toBe(false);
    });

    test('enable allowed when HUMAN_PLAY_MODE is black or unset', () => {
        global.window.HUMAN_PLAY_MODE = 'black';
        Auto.enable();
        expect(Auto.isEnabled()).toBe(true);
        Auto.disable();

        delete global.window.HUMAN_PLAY_MODE;
        Auto.enable();
        // default is black when unset
        expect(Auto.isEnabled()).toBe(true);
        Auto.disable();
    });
});
