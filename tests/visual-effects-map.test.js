const { JSDOM } = require('jsdom');

beforeEach(() => {
    // Fresh DOM for each test
    const dom = new JSDOM('<!doctype html><html><body><div class="cell"><div class="disc black" style="position:relative"></div></div></body></html>', { url: 'http://localhost:8000/' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.getComputedStyle = dom.window.getComputedStyle;
    global.requestAnimationFrame = dom.window.requestAnimationFrame || (cb => setTimeout(cb, 0));
});

describe('applyStoneVisualEffect', () => {
    test('applies background effect (goldStone) and sets resolved URL or injects fallback', async () => {
        const ui = require('../ui/visual-effects-map');
        const disc = document.querySelector('.disc');
        const res = await ui.applyStoneVisualEffect(disc, 'goldStone', {});
        expect(res).toBe(true);
        const cssVar = disc.style.getPropertyValue('--special-stone-image');
        expect(cssVar).toContain('gold_stone.png');
    });

    test('applies pseudoElement effect (ultimateDragon) resolves owner-specific path', async () => {
        const ui = require('../ui/visual-effects-map');
        const disc = document.querySelector('.disc');
        const res = await ui.applyStoneVisualEffect(disc, 'ultimateDragon', { owner: 1 });
        expect(res).toBe(true);
        const cssVar = disc.style.getPropertyValue('--special-stone-image');
        expect(cssVar).toContain('ultimate_reverse_dragon-black.png');
        // owner class and data attribute present
        expect(disc.className).toContain('ud-black');
        expect(disc.dataset.ud).toBe('black');
    });
});
