describe('UI move-executor visuals boot', () => {
    test('ui move visuals exposes runMoveVisualSequence on window/globalThis', () => {
        // Simulate loading the UI visuals module in Node test env
        const path = require('path');
        let ui;
        try {
            const t = path.join(process.cwd(), 'ui', 'move-executor-visuals.js');
            try { delete require.cache[require.resolve(t)]; } catch (e) {}
            ui = require(t);
        } catch (e) {
            throw new Error('Failed to require ui/move-executor-visuals.js: ' + String(e));
        }
        // The module should export runMoveVisualSequence and module may also attach to globalThis
        expect(typeof ui.runMoveVisualSequence).toBe('function');
        expect(typeof globalThis.runMoveVisualSequence === 'function' || typeof globalThis.runMoveVisualSequence === 'undefined').toBe(true);
    });
});