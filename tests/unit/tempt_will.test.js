const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');
const { createNoopPrng } = require('../test-helpers');

describe('TEMPT_WILL (誘惑の意志)', () => {
    test('cannot use when no opponent special stones exist', () => {
        const cs = CardLogic.createCardState(createNoopPrng());
        const gs = Core.createGameState();

        cs.hands.black.push('tempt_01');
        cs.charge.black = 30;

        const ok = CardLogic.applyCardUsage(cs, gs, 'black', 'tempt_01');
        expect(ok).toBe(false);
    });

    test('can steal opponent special stone and keep counters', () => {
        const cs = CardLogic.createCardState(createNoopPrng());
        const gs = Core.createGameState();

        // Prepare a WHITE special stone at (3,3)
        gs.board[3][3] = Core.WHITE;
        cs.specialStones.push({ row: 3, col: 3, type: 'DRAGON', owner: 'white', remainingOwnerTurns: 5 });

        cs.hands.black.push('tempt_01');
        cs.charge.black = 30;

        const ok = CardLogic.applyCardUsage(cs, gs, 'black', 'tempt_01');
        expect(ok).toBe(true);
        expect(cs.pendingEffectByPlayer.black.type).toBe('TEMPT_WILL');
        expect(cs.pendingEffectByPlayer.black.stage).toBe('selectTarget');

        const res = CardLogic.applyTemptWill(cs, gs, 'black', 3, 3);
        expect(res.applied).toBe(true);
        expect(gs.board[3][3]).toBe(Core.BLACK);

        const marker = cs.specialStones.find(s => s.row === 3 && s.col === 3 && s.type === 'DRAGON');
        expect(marker).toBeTruthy();
        expect(marker.owner).toBe('black');
        expect(marker.remainingOwnerTurns).toBe(5);

        // Not treated as flip for charge gain; only cost is consumed.
        expect(cs.charge.black).toBe(10); // 30 - 20
    });

    test('cannot steal a normal opponent stone (not special)', () => {
        const cs = CardLogic.createCardState(createNoopPrng());
        const gs = Core.createGameState();

        // Place a normal WHITE stone with no special markers.
        gs.board[3][3] = Core.WHITE;

        cs.hands.black.push('tempt_01');
        cs.charge.black = 30;

        // Usage should fail because there are still no opponent special stones.
        const ok = CardLogic.applyCardUsage(cs, gs, 'black', 'tempt_01');
        expect(ok).toBe(false);
    });

    test('can steal a time bomb (bomb ownership transfers, countdown unchanged)', () => {
        const cs = CardLogic.createCardState(createNoopPrng());
        const gs = Core.createGameState();

        gs.board[3][3] = Core.WHITE;
        cs.bombs.push({ row: 3, col: 3, remainingTurns: 4, owner: 'white' });

        cs.hands.black.push('tempt_01');
        cs.charge.black = 30;

        const ok = CardLogic.applyCardUsage(cs, gs, 'black', 'tempt_01');
        expect(ok).toBe(true);

        const res = CardLogic.applyTemptWill(cs, gs, 'black', 3, 3);
        expect(res.applied).toBe(true);

        expect(gs.board[3][3]).toBe(Core.BLACK);
        const bomb = cs.bombs.find(b => b.row === 3 && b.col === 3);
        expect(bomb.owner).toBe('black');
        expect(bomb.remainingTurns).toBe(4);
    });

    test('can steal opponent-owned special stone even if its current color is already yours', () => {
        const cs = CardLogic.createCardState(createNoopPrng());
        const gs = Core.createGameState();

        // Special marker belongs to WHITE, but the board color is BLACK (e.g., flipped by other effects).
        gs.board[3][3] = Core.BLACK;
        cs.specialStones.push({ row: 3, col: 3, type: 'DRAGON', owner: 'white', remainingOwnerTurns: 5 });

        cs.hands.black.push('tempt_01');
        cs.charge.black = 30;

        const ok = CardLogic.applyCardUsage(cs, gs, 'black', 'tempt_01');
        expect(ok).toBe(true);

        const res = CardLogic.applyTemptWill(cs, gs, 'black', 3, 3);
        expect(res.applied).toBe(true);
        expect(gs.board[3][3]).toBe(Core.BLACK);

        const marker = cs.specialStones.find(s => s.row === 3 && s.col === 3 && s.type === 'DRAGON');
        expect(marker.owner).toBe('black');
        expect(marker.remainingOwnerTurns).toBe(5);
    });

    test('debug HvH: can use a card from the other hand but apply effect for current player', () => {
        const cs = CardLogic.createCardState(createNoopPrng());
        const gs = Core.createGameState();

        // BLACK owns a special stone on board
        gs.board[3][3] = Core.BLACK;
        cs.specialStones.push({ row: 3, col: 3, type: 'BREEDING', owner: 'black', remainingOwnerTurns: 3 });

        // Card is in BLACK's hand, but WHITE uses it (debug HvH-like flow)
        cs.hands.black.push('tempt_01');
        cs.charge.white = 30;

        const ok = CardLogic.applyCardUsage(cs, gs, 'white', 'tempt_01', 'black');
        expect(ok).toBe(true);
        expect(cs.hands.black.includes('tempt_01')).toBe(false);
        expect(cs.pendingEffectByPlayer.white.type).toBe('TEMPT_WILL');

        const res = CardLogic.applyTemptWill(cs, gs, 'white', 3, 3);
        expect(res.applied).toBe(true);
        expect(gs.board[3][3]).toBe(Core.WHITE);

        const marker = cs.specialStones.find(s => s.row === 3 && s.col === 3 && s.type === 'BREEDING');
        expect(marker.owner).toBe('white');
        expect(marker.remainingOwnerTurns).toBe(3);
    });
});
