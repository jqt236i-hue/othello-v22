const Adapter = require('../../game/turn/pipeline_ui_adapter');

describe('pipeline_ui_adapter JSON-safety', () => {
    test('mapToPlaybackEvents returns JSON-safe plain objects and plain `after` per target', () => {
        const pres = [
            { type: 'SPAWN', row: 3, col: 3, stoneId: 's1', ownerAfter: 'black', meta: { special: 'WORK', timer: 2 }, actionId: 'a1', turnIndex: 0, plyIndex: 0 },
            { type: 'DESTROY', row: 2, col: 2, stoneId: 's2', ownerBefore: 'white', actionId: 'a2' },
            { type: 'CHANGE', row: 4, col: 4, ownerBefore: 'black', ownerAfter: 'white', actionId: 'a3' },
            { type: 'MOVE', prevRow: 1, prevCol: 1, row: 1, col: 2, stoneId: 's4', actionId: 'a4' }
        ];
        const finalCardState = { turnIndex: 0 };
        const finalGameState = { board: Array(8).fill(null).map(()=>Array(8).fill(0)) };

        const out = Adapter.mapToPlaybackEvents(pres, finalCardState, finalGameState);

        expect(Array.isArray(out)).toBe(true);
        for (const ev of out) {
            expect(ev && typeof ev === 'object').toBe(true);
            // Not a Map or Set
            expect(ev instanceof Map).toBe(false);
            expect(ev instanceof Set).toBe(false);

            expect(ev.targets && Array.isArray(ev.targets)).toBe(true);
            for (const t of ev.targets) {
                expect(t && typeof t === 'object').toBe(true);
                expect(t instanceof Map).toBe(false);
                expect(t instanceof Set).toBe(false);
                if (t.after !== undefined) {
                    expect(t.after && typeof t.after === 'object').toBe(true);
                    // after should only have primitive values
                    expect(typeof t.after.color === 'number' || t.after.color === null).toBeTruthy();
                    expect(typeof t.after.special === 'string' || t.after.special === null).toBeTruthy();
                    expect(typeof t.after.timer === 'number' || t.after.timer === null).toBeTruthy();
                }
            }
        }
    });
});
