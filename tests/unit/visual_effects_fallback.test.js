// Ensure applyStoneVisualEffect sets a fallback inline backgroundImage
const { JSDOM } = require('jsdom');
const path = require('path');

if (typeof document === 'undefined') {
    describe('Visual effects fallback (skipped - no DOM)', () => {
        test('skipped', () => expect(true).toBe(true));
    });
} else {
    const { BLACK } = require('../../shared-constants');

    describe('applyStoneVisualEffect fallback', () => {
        beforeEach(() => {
            // Minimal DOM
            document.body.innerHTML = '<div id="board"></div>';
            require('../../game/visual-effects-map');
        });

        afterEach(() => {
            jest.resetModules();
            document.body.innerHTML = '';
        });

        test('workStone sets inline backgroundImage as fallback', () => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-row', '4');
            cell.setAttribute('data-col', '4');
            const disc = document.createElement('div');
            disc.className = 'disc black';
            cell.appendChild(disc);
            document.getElementById('board').appendChild(cell);

            // apply visual
            applyStoneVisualEffect(disc, 'workStone', { owner: 1 });

            const bg = disc.style.backgroundImage;
            expect(bg).toBeTruthy();
            expect(bg.includes('work_stone-black.png')).toBe(true);
        });
    });
}
