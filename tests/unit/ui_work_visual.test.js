const SharedConstants = require('../../shared-constants');

// If test environment doesn't provide a DOM (jsdom not installed), skip this suite.
if (typeof document === 'undefined') {
    describe('UI Work visual integration (skipped - no DOM available)', () => {
        test('skipped', () => { expect(true).toBe(true); });
    });
} else {
    const _maybeDescribe = describe;
    const { BLACK, WHITE, EMPTY } = SharedConstants;

    function createEmptyBoard() {
        return Array(8).fill(null).map(() => Array(8).fill(EMPTY));
    }

    _maybeDescribe('UI Work visual integration', () => {
    beforeEach(() => {
        // Minimal DOM required by ui.js
        document.body.innerHTML = '<div id="board"></div><div id="occ-black"></div><div id="occ-white"></div>';
        // Ensure globals exist
        global.gameState = { board: createEmptyBoard(), currentPlayer: BLACK };
        global.cardState = { specialStones: [], bombs: [], presentationEvents: [] };
        // Load visual effects and UI module AFTER board exists
        require('../../game/visual-effects-map');
        require('../../ui');
    });

    afterEach(() => {
        // cleanup loaded modules to avoid cross-test pollution
        jest.resetModules();
        document.body.innerHTML = '';
        global.gameState = undefined;
        global.cardState = undefined;
    });

    test('placing a WORK special results in disc getting special image var and classes', () => {
        // Arrange: put a WORK anchor on board
        cardState.specialStones = [{ row: 4, col: 4, type: 'WORK', owner: 'black', remainingOwnerTurns: 5 }];
        gameState.board[4][4] = BLACK;

        // Act
        expect(typeof renderBoard).toBe('function');
        renderBoard();

        const sel = '.cell[data-row="4"][data-col="4"] .disc';
        const disc = document.querySelector(sel);
        expect(disc).toBeTruthy();

        // The helper should have been applied and set the CSS var
        const img = disc.style.getPropertyValue('--special-stone-image');
        expect(img).toBeTruthy();
        expect(img.includes('work_stone-black.png')).toBe(true);

        // Also class applied
        expect(disc.classList.contains('special-stone')).toBe(true);
        expect(disc.classList.contains('work-stone')).toBe(true);
    });

    test('numeric owner values (1/-1) also apply work visuals', () => {
        // black numeric owner
        cardState.specialStones = [{ row: 5, col: 5, type: 'WORK', owner: 1, remainingOwnerTurns: 5 }];
        gameState.board[5][5] = BLACK;
        renderBoard();
        const disc2 = document.querySelector('.cell[data-row="5"][data-col="5"] .disc');
        expect(disc2).toBeTruthy();
        const img2 = disc2.style.getPropertyValue('--special-stone-image');
        expect(img2).toBeTruthy();
        expect(img2.includes('work_stone-black.png')).toBe(true);
        expect(disc2.classList.contains('work-stone')).toBe(true);

        // white numeric owner
        cardState.specialStones = [{ row: 6, col: 6, type: 'WORK', owner: -1, remainingOwnerTurns: 5 }];
        gameState.board[6][6] = WHITE;
        renderBoard();
        const disc3 = document.querySelector('.cell[data-row="6"][data-col="6"] .disc');
        expect(disc3).toBeTruthy();
        const img3 = disc3.style.getPropertyValue('--special-stone-image');
        expect(img3).toBeTruthy();
        expect(img3.includes('work_stone-white.png')).toBe(true);
        expect(disc3.classList.contains('work-stone')).toBe(true);
    });
});
}
