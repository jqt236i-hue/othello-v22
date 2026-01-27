const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');

describe('Countdown semantics (0 fires then expires)', () => {
    test('DRAGON: when remainingOwnerTurns is 1, it fires (0) and anchor is destroyed', () => {
        const cs = { specialStones: [{ row: 3, col: 3, type: 'DRAGON', owner: 'black', remainingOwnerTurns: 1 }] };
        const gs = Core.createGameState();
        gs.board[3][3] = Core.BLACK;
        gs.board[2][2] = Core.WHITE;

        const res = CardLogic.processDragonEffects(cs, gs, 'black');
        expect(res.anchors && res.anchors.length).toBe(1);
        expect(res.anchors[0].remainingNow).toBe(0);
        expect(gs.board[2][2]).toBe(Core.BLACK);
        // Anchor destroyed after firing at 0
        expect(gs.board[3][3]).toBe(Core.EMPTY);
        expect((cs.specialStones || []).filter(s => s.type === 'DRAGON').length).toBe(0);
    });

    test('BREEDING: when remainingOwnerTurns is 1, it spawns (0) and anchor is destroyed', () => {
        const prng = { random: () => 0, shuffle: () => {} };
        const cs = { specialStones: [{ row: 3, col: 3, type: 'BREEDING', owner: 'black', remainingOwnerTurns: 1 }], bombs: [] };
        const gs = Core.createGameState();
        gs.board[3][3] = Core.BLACK;

        const res = CardLogic.processBreedingEffects(cs, gs, 'black', prng);
        expect(res.anchors && res.anchors.length).toBe(1);
        expect(res.anchors[0].remainingNow).toBe(0);
        expect(res.spawned.length).toBe(1);
        // Anchor destroyed after spawn at 0
        expect(gs.board[3][3]).toBe(Core.EMPTY);
        expect((cs.specialStones || []).filter(s => s.type === 'BREEDING').length).toBe(0);
    });
});

