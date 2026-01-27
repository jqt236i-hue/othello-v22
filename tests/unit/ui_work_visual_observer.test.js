const SharedConstants = require('../../shared-constants');

// Skip if no DOM available
if (typeof document === 'undefined') {
    describe('UI Work visuals observer (skipped - no DOM)', () => {
        test('skipped', () => expect(true).toBe(true));
    });
} else {
    const { BLACK, WHITE, EMPTY } = SharedConstants;

    describe('UI Work visuals observer', () => {
        beforeEach(() => {
            document.body.innerHTML = '<div id="board"></div>';
            global.gameState = { board: Array(8).fill(0).map(() => Array(8).fill(EMPTY)), currentPlayer: BLACK };
            global.cardState = { specialStones: [], bombs: [], presentationEvents: [] };
            require('../../game/visual-effects-map');
            require('../../ui');
        });

        afterEach(() => {
            jest.resetModules();
            document.body.innerHTML = '';
            if (window._teardownWorkVisualsObserver) window._teardownWorkVisualsObserver();
            global.gameState = undefined;
            global.cardState = undefined;
        });

        test('observer applies work visual when disc is appended dynamically', (done) => {
            // Arrange: cardState has a WORK anchor but the disc will be appended after
            cardState.specialStones = [{ row: 2, col: 3, type: 'WORK', owner: 'black', remainingOwnerTurns: 5 }];
            gameState.board[2][3] = BLACK;

            // Create cell container
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-row', '2');
            cell.setAttribute('data-col', '3');

            // Append after a short timeout to simulate late insertion
            setTimeout(() => {
                const disc = document.createElement('div');
                disc.className = 'disc black';
                cell.appendChild(disc);
                document.getElementById('board').appendChild(cell);
            }, 20);

            // Wait a bit for observer debounce to run
            setTimeout(() => {
                const disc = document.querySelector('.cell[data-row="2"][data-col="3"] .disc');
                try {
                    expect(disc).toBeTruthy();
                    const img = disc.style.getPropertyValue('--special-stone-image');
                    expect(img).toBeTruthy();
                    expect(img.includes('work_stone-black.png')).toBe(true);
                    expect(disc.classList.contains('work-stone')).toBe(true);
                    done();
                } catch (e) { done(e); }
            }, 120);
        });
    });
}
