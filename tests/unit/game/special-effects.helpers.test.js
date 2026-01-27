const Helpers = require('../../../game/special-effects/helpers');
const CardLogic = require('../../../game/logic/cards');

describe('special-effects helpers', () => {
    afterEach(() => {
        // cleanup global exposure to avoid test bleed
        try { delete global.getFlipBlockers; } catch (e) { /* ignore */ }
        try { delete globalThis.getFlipBlockers; } catch (e) { /* ignore */ }
        global.cardState = undefined;
    });

    test('getFlipBlockers is exported and exposed globally', () => {
        expect(typeof Helpers.getFlipBlockers).toBe('function');
        expect(typeof globalThis.getFlipBlockers).toBe('function');
    });

    test('getFlipBlockers returns empty array when no specials', () => {
        global.cardState = {};
        const res = Helpers.getFlipBlockers();
        expect(Array.isArray(res)).toBe(true);
        expect(res.length).toBe(0);
    });

    test('getFlipBlockers filters perma types and maps fields', () => {
        global.cardState = {
            specialStones: [
                { row: 1, col: 2, owner: 'black', type: 'PERMA_PROTECTED' },
                { row: 3, col: 4, owner: 'white', type: 'DRAGON' },
                { row: 5, col: 6, owner: 'black', type: 'PROTECTED' }
            ]
        };
        const res = Helpers.getFlipBlockers();
        expect(res.length).toBe(2);
        expect(res).toEqual(expect.arrayContaining([
            { row: 1, col: 2, owner: 'black' },
            { row: 3, col: 4, owner: 'white' }
        ]));
    });
});
