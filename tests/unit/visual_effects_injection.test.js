// Test that applying workStone results in an injected fallback image when pseudo-element is not available
const { BLACK } = require('../../shared-constants');

if (typeof document === 'undefined') {
    describe('Visual injection fallback (skipped - no DOM)', () => {
        test('skipped', () => expect(true).toBe(true));
    });
} else {
    describe('visual injection fallback', () => {
        beforeEach(() => {
            document.body.innerHTML = '<div id="board"></div>';
            require('../../game/visual-effects-map');
        });
        afterEach(() => {
            jest.resetModules();
            document.body.innerHTML = '';
        });

        test('workStone injection occurs when applyStoneVisualEffect called', (done) => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-row', '4');
            cell.setAttribute('data-col', '4');
            const disc = document.createElement('div');
            disc.className = 'disc black';
            cell.appendChild(disc);
            document.getElementById('board').appendChild(cell);

            applyStoneVisualEffect(disc, 'workStone', { owner: 1 });

            setTimeout(() => {
                const img = disc.querySelector('.special-stone-img');
                try {
                    expect(img).toBeTruthy();
                    expect(img.src.includes('work_stone-black.png')).toBe(true);
                    done();
                } catch (e) { done(e); }
            }, 120);
        });
    });
}
