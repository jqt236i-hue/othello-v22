const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');
const Turn = require('../../game/turn/turn_pipeline');
const { createNoopPrng } = require('../test-helpers');

describe('HYPERACTIVE_WILL (多動の意志)', () => {
    test('placement does NOT move hyperactive stone; movement happens at subsequent turn-start', () => {
        const prng = { random: () => 0, shuffle: () => { } };
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        // Ensure a post-move flip would be possible if the hyperactive moved after placement
        gs.board[1][3] = Core.WHITE;
        gs.board[1][4] = Core.BLACK;

        cs.hands.black.push('hyperactive_01');
        cs.charge.black = 10;

        // 1) Placement turn: should NOT move immediately
        const resPlace = Turn.applyTurn(cs, gs, 'black', { useCardId: 'hyperactive_01', type: 'place', row: 2, col: 3 }, prng);
        const imm = resPlace.events.find(e => e.type === 'hyperactive_moved_immediate');
        expect(imm).toBeFalsy();

        // Anchor remains in place
        expect(gs.board[2][3]).toBe(Core.BLACK);
        expect(cs.specialStones.some(s => s.type === 'HYPERACTIVE' && s.row === 2 && s.col === 3)).toBe(true);

        // 2) Next player's turn-start should run hyperactive moves
        Turn.applyTurn(cs, gs, 'white', { type: 'pass' }, prng);

        // After turn-start processing, hyperactive should have moved to (1,2) and flipped (1,3)
        expect(gs.board[1][2]).toBe(Core.BLACK);
        expect(gs.board[1][3]).toBe(Core.BLACK);
        expect(gs.board[2][3]).toBe(Core.EMPTY);
        expect(cs.charge.black).toBe(4); // charge updates after flips
    });

    test('turn start movement runs on both players turns', () => {
        const prng = { random: () => 0, shuffle: () => { } };
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        gs.board[2][2] = Core.BLACK;
        cs.specialStones.push({ row: 2, col: 2, type: 'HYPERACTIVE', owner: 'black', hyperactiveSeq: 1 });

        Turn.applyTurn(cs, gs, 'white', { type: 'pass' }, prng);

        expect(gs.board[1][1]).toBe(Core.BLACK); // first candidate (top-left)
        expect(gs.board[2][2]).toBe(Core.EMPTY);
    });

    test('hyperactive stone is destroyed when no adjacent empty cells', () => {
        const prng = { random: () => 0, shuffle: () => { } };
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        gs.board[3][3] = Core.BLACK;
        cs.specialStones.push({ row: 3, col: 3, type: 'HYPERACTIVE', owner: 'black', hyperactiveSeq: 1 });

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                gs.board[3 + dr][3 + dc] = Core.WHITE;
            }
        }

        Turn.applyTurn(cs, gs, 'black', { type: 'pass' }, prng);
        expect(gs.board[3][3]).toBe(Core.EMPTY);
        expect(cs.specialStones.some(s => s.type === 'HYPERACTIVE')).toBe(false);
    });

    test('hyperactive attribute clears on dragon conversion', () => {
        const prng = createNoopPrng();
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        gs.board[3][3] = Core.BLACK;
        gs.board[2][2] = Core.WHITE;
        cs.specialStones.push({ row: 2, col: 2, type: 'HYPERACTIVE', owner: 'white', hyperactiveSeq: 1 });
        cs.specialStones.push({ row: 3, col: 3, type: 'DRAGON', owner: 'black', remainingOwnerTurns: 1 });

        CardLogic.processDragonEffects(cs, gs, 'black');
        expect(gs.board[2][2]).toBe(Core.BLACK);
        expect(cs.specialStones.some(s => s.type === 'HYPERACTIVE' && s.row === 2 && s.col === 2)).toBe(false);
    });

    test('hyperactive attribute clears on swap', () => {
        const prng = createNoopPrng();
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        gs.board[2][2] = Core.WHITE;
        cs.specialStones.push({ row: 2, col: 2, type: 'HYPERACTIVE', owner: 'white', hyperactiveSeq: 1 });

        const swapped = CardLogic.applySwapEffect(cs, gs, 'black', 2, 2);
        expect(swapped).toBe(true);
        expect(gs.board[2][2]).toBe(Core.BLACK);
        expect(cs.specialStones.some(s => s.type === 'HYPERACTIVE' && s.row === 2 && s.col === 2)).toBe(false);
    });
});
