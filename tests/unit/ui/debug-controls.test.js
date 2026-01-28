const fs = require('fs');
const path = require('path');

// Load the module under test (JSDOM is available in Jest environment)
require('../../../../ui/handlers/debug');

describe('setupDebugControls - human play mode button', () => {
    beforeEach(() => {
        // Reset globals
        if (typeof window !== 'undefined') {
            window.HUMAN_PLAY_MODE = undefined;
            window.DEBUG_HUMAN_VS_HUMAN = false;
            if (typeof window.__uiImpl_turn_manager !== 'undefined') delete window.__uiImpl_turn_manager.humanPlayMode;
            window.addLog = () => {};
            if (!document.body) document.body = (new (require('jsdom').JSDOM)()).window.document.body;
        }
    });

    test('cycles human play mode through black -> white -> both and updates globals', () => {
        const humanBtn = document.createElement('button');
        humanBtn.id = 'humanVsHumanBtn';
        // Call setupDebugControls with only the human button
        if (typeof setupDebugControls !== 'function') throw new Error('setupDebugControls not loaded');
        setupDebugControls(null, humanBtn, null);

        expect(humanBtn.textContent).toBe('人間: 黒');
        expect(window.HUMAN_PLAY_MODE).toBe('black');

        // Click -> white
        humanBtn.click();
        expect(window.HUMAN_PLAY_MODE).toBe('white');
        expect(humanBtn.textContent).toBe('人間: 白');
        expect(window.DEBUG_HUMAN_VS_HUMAN).toBe(false);

        // Click -> both
        humanBtn.click();
        expect(window.HUMAN_PLAY_MODE).toBe('both');
        expect(humanBtn.textContent).toBe('人間: 両方');
        expect(window.DEBUG_HUMAN_VS_HUMAN).toBe(true);

        // Click -> back to black
        humanBtn.click();
        expect(window.HUMAN_PLAY_MODE).toBe('black');
        expect(humanBtn.textContent).toBe('人間: 黒');
        expect(window.DEBUG_HUMAN_VS_HUMAN).toBe(false);
    });
});
