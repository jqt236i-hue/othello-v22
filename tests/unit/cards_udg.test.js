const CardUdG = require('../../game/logic/cards/udg');
const Core = require('../../game/logic/core');

describe('cards/udg module', () => {
    test('processUltimateDestroyGodEffects destroys surrounding enemy stones and decrements timer', () => {
        const cs = { specialStones: [{ row: 4, col: 4, type: 'ULTIMATE_DESTROY_GOD', owner: 'black', remainingOwnerTurns: 3 }] };
        const gs = Core.createGameState();
        gs.board[4][4] = Core.BLACK;
        // Surround with enemy stones
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = 4 + dr, c = 4 + dc;
                gs.board[r][c] = Core.WHITE;
            }
        }

        const res = CardUdG.processUltimateDestroyGodEffects(cs, gs, 'black');
        expect(res.destroyed.length).toBe(8);
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = 4 + dr, c = 4 + dc;
                expect(gs.board[r][c]).toBe(Core.EMPTY);
            }
        }
        // Timer decremented and is present in anchors
        expect(res.anchors.length).toBeGreaterThan(0);
        expect(cs.specialStones.find(s => s.type === 'ULTIMATE_DESTROY_GOD').remainingOwnerTurns).toBe(2);
    });

    test('processUltimateDestroyGodEffects expires anchor at 0 and removes anchor', () => {
        const cs = { specialStones: [{ row: 4, col: 4, type: 'ULTIMATE_DESTROY_GOD', owner: 'black', remainingOwnerTurns: 1 }] };
        const gs = Core.createGameState();
        gs.board[4][4] = Core.BLACK;
        // Surround with single enemy stone
        gs.board[3][3] = Core.WHITE;

        const res = CardUdG.processUltimateDestroyGodEffects(cs, gs, 'black');
        // should destroy neighbor and then expire anchor
        expect(res.destroyed.length).toBeGreaterThanOrEqual(1);
        expect(res.expired.length).toBeGreaterThanOrEqual(1);
        expect(gs.board[4][4]).toBe(Core.EMPTY);
        expect(cs.specialStones.find(s => s.type === 'ULTIMATE_DESTROY_GOD')).toBeUndefined();
    });

    test('processUltimateDestroyGodEffectsAtAnchor performs immediate destruction on placement and does not consume owner-turn counts', () => {
        const cs = { specialStones: [{ row: 4, col: 4, type: 'ULTIMATE_DESTROY_GOD', owner: 'black', remainingOwnerTurns: 3 }] };
        const gs = Core.createGameState();
        gs.board[4][4] = Core.BLACK;
        gs.board[3][3] = Core.WHITE;
        const res = CardUdG.processUltimateDestroyGodEffectsAtAnchor(cs, gs, 'black', 4, 4, { decrementRemainingOwnerTurns: false });
        expect(res.destroyed.length).toBe(1);
        expect(gs.board[3][3]).toBe(Core.EMPTY);
        // Remaining owner-turn activations should remain unchanged after placement immediate activation
        expect(cs.specialStones.find(s => s.type === 'ULTIMATE_DESTROY_GOD').remainingOwnerTurns).toBe(3);
    });

    test('UDG total activations: immediate + three owner-turn-starts = 4 total', () => {
        const cs = { specialStones: [{ row: 4, col: 4, type: 'ULTIMATE_DESTROY_GOD', owner: 'black', remainingOwnerTurns: 3 }] };
        const gs = Core.createGameState();
        gs.board[4][4] = Core.BLACK;

        // Immediate activation on placement should not decrement.
        CardUdG.processUltimateDestroyGodEffectsAtAnchor(cs, gs, 'black', 4, 4, { decrementRemainingOwnerTurns: false });
        expect(cs.specialStones.find(s => s.type === 'ULTIMATE_DESTROY_GOD').remainingOwnerTurns).toBe(3);

        // Three owner-turn-start activations should consume the three remaining counts and then expire
        CardUdG.processUltimateDestroyGodEffects(cs, gs, 'black');
        CardUdG.processUltimateDestroyGodEffects(cs, gs, 'black');
        const last = CardUdG.processUltimateDestroyGodEffects(cs, gs, 'black');
        expect(last.expired.length).toBeGreaterThanOrEqual(1);
        expect(cs.specialStones.find(s => s.type === 'ULTIMATE_DESTROY_GOD')).toBeUndefined();
    });
});