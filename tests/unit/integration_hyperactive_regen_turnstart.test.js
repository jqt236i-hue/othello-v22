const TurnPipeline = require('../../game/turn/turn_pipeline');
const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');
const { createNoopPrng } = require('../test-helpers');

describe('Turn start: HYPERACTIVE + REGEN interaction', () => {
    test('hyperactive flip can trigger regen and regen-capture (charge credited by resulting color)', () => {
        const prng = createNoopPrng();
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        // Board setup:
        // - A black hyperactive stone at (3,3) with only one empty neighbor at (3,4)
        // - A white regen stone at (3,5) that will be flipped by a "virtual placement" at (3,4)
        //   because (3,6) is black.
        // - After regen back to WHITE at (3,5), a single-origin capture upwards flips (2,5)
        //   because (1,5) is WHITE.
        const B = Core.BLACK;
        const W = Core.WHITE;
        const E = Core.EMPTY;

        // Clear board
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) gs.board[r][c] = E;
        }

        gs.board[3][3] = B; // hyperactive anchor
        // Surrounding cells: all filled except (3,4) which is empty target.
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const r = 3 + dr;
                const c = 3 + dc;
                if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;
                if (r === 3 && c === 3) continue;
                if (r === 3 && c === 4) continue;
                gs.board[r][c] = B;
            }
        }

        gs.board[3][4] = E; // only empty neighbor
        gs.board[3][5] = W; // regen stone (will be flipped to B by the hyperactive virtual placement)
        gs.board[3][6] = B; // terminator for the flip line

        gs.board[2][5] = B; // will be captured by regen (white)
        gs.board[1][5] = W; // terminator for the capture line

        cs.specialStones.push({ row: 3, col: 3, type: 'HYPERACTIVE', owner: 'black', hyperactiveSeq: 1 });
        cs.specialStones.push({ row: 3, col: 5, type: 'REGEN', owner: 'white', regenRemaining: 1, ownerColor: W });

        cs.charge.black = 0;
        cs.charge.white = 0;

        // Deterministic PRNG: always picks the first candidate (there is only one anyway).
        const deterministicPrng = { random: () => 0, shuffle: () => { } };

        const res = TurnPipeline.applyTurn(cs, gs, 'black', { type: 'pass' }, deterministicPrng);

        expect(res.gameState.board[3][5]).toBe(W); // regened back
        expect(res.gameState.board[2][5]).toBe(W); // capture happened

        // Hyperactive normal flip (white->black) counts for black charge: 1
        expect(res.cardState.charge.black).toBe(1);
        // Regen-capture flip counts for resulting color (white): 1
        expect(res.cardState.charge.white).toBe(1);
    });
});
