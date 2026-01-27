const Core = require('../../game/logic/core');

describe('Core logic basic behaviors', () => {
    test('initial game state has 4 center discs', () => {
        const state = Core.createGameState();
        const counts = Core.countDiscs(state);
        expect(counts.black).toBe(2);
        expect(counts.white).toBe(2);
    });

    test('initial legal moves for black are 4', () => {
        const state = Core.createGameState();
        const moves = Core.getLegalMoves(state, Core.BLACK);
        expect(moves.length).toBe(4);
    });

    test('applyMove flips discs appropriately', () => {
        const state = Core.createGameState();
        // Black places at (2,3) which flips (3,3)
        const flips = Core.getFlipsWithContext(state, 2, 3, Core.BLACK);
        expect(flips.length).toBeGreaterThan(0);
        const move = { row: 2, col: 3, flips };
        const next = Core.applyMove(state, move);
        expect(next.board[2][3]).toBe(Core.BLACK);
        // flipped disc at 3,3 should be black
        expect(next.board[3][3]).toBe(Core.BLACK);
    });

    test('protected stones block flips in that direction', () => {
        // Setup a contrived board: Black at (3,4), White at (3,3), Black at (3,2)
        const state = Core.createGameState();
        state.board[3][2] = Core.BLACK;
        state.board[3][3] = Core.WHITE;
        state.board[3][4] = Core.BLACK;
        // If we attempt to place at (3,1) by White, normally it would flip toward (3,2) but protected blocks
        const protectedStones = [{ row: 3, col: 2 }];
        const flips = Core.getFlipsWithContext(state, 3, 1, Core.WHITE, { protectedStones });
        // The protected at 3,2 should prevent flipping
        expect(flips.length).toBe(0);
    });

    test('isGameOver when board full', () => {
        const state = Core.createGameState();
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) state.board[r][c] = Core.BLACK;
        expect(Core.isGameOver(state)).toBe(true);
    });
});
