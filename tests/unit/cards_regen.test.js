const CardRegen = require('../../game/logic/cards/regen');

function mkBoard() { return Array(8).fill(null).map(() => Array(8).fill(0)); }

describe('REGEN helpers', () => {
    test('applyRegenWill adds REGEN special stone', () => {
        const cs = { specialStones: [] };
        const res = CardRegen.applyRegenWill(cs, 'black', 2, 2);
        expect(res.applied).toBe(true);
        expect(cs.specialStones.some(s => s.type === 'REGEN' && s.row === 2 && s.col === 2 && s.owner === 'black')).toBe(true);
    });

    test('applyRegenAfterFlips reverts color and captures appropriately', () => {
        // Setup: regen at (1,1) owned by black. Black ownerColor=1.
        const cs = { specialStones: [ { row: 1, col: 1, type: 'REGEN', owner: 'black', regenRemaining: 1 } ], bombs: [] };
        const board = mkBoard();
        // The cell has been flipped to white (-1) by some flipper, so regen should revert it to black and potentially capture
        board[1][1] = -1;
        // Place a line of opponent stones to the right that ends with a black to be captured after regen
        board[1][2] = -1; board[1][3] = 1;
        const gs = { board };

        const res = CardRegen.applyRegenAfterFlips(cs, gs, [{ row: 1, col: 1 }], 'white', false);
        expect(res.regened).toEqual([{ row: 1, col: 1 }]);
        // capture flips should include [1,2]
        expect(res.captureFlips).toContainEqual({ row: 1, col: 2 });
        // board should have been reverted and captured cell set to black
        expect(gs.board[1][1]).toBe(1);
        expect(gs.board[1][2]).toBe(1);
        // regen counter decreased
        expect(cs.specialStones.find(s => s.row === 1 && s.col === 1).regenRemaining).toBe(0);
    });

    test('applyRegenAfterFlips with skipCapture true does not capture', () => {
        const cs = { specialStones: [ { row: 4, col: 4, type: 'REGEN', owner: 'black', regenRemaining: 1 } ], bombs: [] };
        const board = mkBoard(); board[4][4] = -1; board[4][5] = -1; board[4][6] = 1;
        const gs = { board };
        const res = CardRegen.applyRegenAfterFlips(cs, gs, [{ row: 4, col: 4 }], 'white', true);
        expect(res.regened).toEqual([{ row: 4, col: 4 }]);
        expect(res.captureFlips).toEqual([]);
    });
});