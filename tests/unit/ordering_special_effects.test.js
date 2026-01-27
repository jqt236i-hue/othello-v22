const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');
const TurnPhases = require('../../game/turn/turn_pipeline_phases');
const Hyper = require('../../game/logic/cards/hyperactive');
const { createNoopPrng } = require('../test-helpers');

describe('Ordering: special effects and hyperactive sequencing', () => {
    test('Turn-start special effects run in specification order (bombs -> UDG -> Dragon -> Breeding -> Hyperactive)', () => {
        const prng = createNoopPrng();
        const cs = CardLogic.createCardState(prng);
        const gs = Core.createGameState();

        // Set up a bomb that will explode on tick
        cs.bombs = [{ row: 0, col: 7, remainingTurns: 1, owner: 'black' }];
        gs.board[0][6] = Core.WHITE; // will be destroyed by explosion

        // UDG anchor at (1,1) owned by black, adjacent white to be destroyed
        cs.specialStones.push({ row: 1, col: 1, type: 'ULTIMATE_DESTROY_GOD', owner: 'black', remainingOwnerTurns: 1 });
        gs.board[1][1] = Core.BLACK; // anchor must contain owner's stone
        gs.board[0][1] = Core.WHITE;

        // Dragon anchor at (2,2) owned by black, adjacent white to convert
        cs.specialStones.push({ row: 2, col: 2, type: 'DRAGON', owner: 'black', remainingOwnerTurns: 1 });
        gs.board[2][2] = Core.BLACK; // anchor must contain owner's stone
        gs.board[2][3] = Core.WHITE;

        // Breeding anchor at (3,3) with an empty adjacent cell available
        cs.specialStones.push({ row: 3, col: 3, type: 'BREEDING', owner: 'black', remainingOwnerTurns: 1 });
        gs.board[3][3] = Core.BLACK; // anchor must contain owner's stone
        // ensure at least one empty neighbor for spawning
        gs.board[3][4] = Core.EMPTY;

        // Hyperactive stones with sequences ensure ordering
        cs.specialStones.push({ row: 4, col: 4, type: 'HYPERACTIVE', owner: 'black', hyperactiveSeq: 2 });
        cs.specialStones.push({ row: 5, col: 5, type: 'HYPERACTIVE', owner: 'black', hyperactiveSeq: 1 });
        // anchors must have stones and ensure empty neighbors for hyperactive moves
        gs.board[4][4] = Core.BLACK;
        gs.board[5][5] = Core.BLACK;
        gs.board[4][5] = Core.EMPTY;
        gs.board[6][6] = Core.EMPTY;

        const events = [];
        // Apply turn-start phase for black
        TurnPhases.applyTurnStartPhase(CardLogic, Core, cs, gs, 'black', events, prng);

        // Find indices of interest
        const idxBombs = events.findIndex(e => e.type === 'bombs_exploded');
        const idxUdg = events.findIndex(e => e.type === 'udg_destroyed_start');
        const idxDragon = events.findIndex(e => e.type === 'dragon_converted_start');
        const idxBreed = events.findIndex(e => e.type === 'breeding_spawned_start');
        const idxHyper = events.findIndex(e => e.type === 'hyperactive_moved_start');

        expect(idxBombs).toBeGreaterThanOrEqual(0);
        expect(idxUdg).toBeGreaterThanOrEqual(0);
        expect(idxDragon).toBeGreaterThanOrEqual(0);
        expect(idxBreed).toBeGreaterThanOrEqual(0);
        expect(idxHyper).toBeGreaterThanOrEqual(0);

        // Assert ordering
        expect(idxBombs).toBeLessThan(idxUdg);
        expect(idxUdg).toBeLessThan(idxDragon);
        expect(idxDragon).toBeLessThan(idxBreed);
        expect(idxBreed).toBeLessThan(idxHyper);
    });

    test('Hyperactive processing follows marker creation order (createdSeq ascending)', () => {
        const cs = { specialStones: [
            { row: 2, col: 2, type: 'HYPERACTIVE', owner: 'black', createdSeq: 5 },
            { row: 3, col: 3, type: 'HYPERACTIVE', owner: 'black', createdSeq: 2 },
            { row: 4, col: 4, type: 'HYPERACTIVE', owner: 'black', createdSeq: 3 }
        ] };
        const gs = Core.createGameState();
        // Anchors must contain owner's stones
        gs.board[2][2] = Core.BLACK;
        gs.board[3][3] = Core.BLACK;
        gs.board[4][4] = Core.BLACK;
        // Ensure empty neighbors exist for moves
        gs.board[1][2] = Core.EMPTY;
        gs.board[2][3] = Core.EMPTY;
        gs.board[3][4] = Core.EMPTY;

        const res = Hyper.processHyperactiveMoves(cs, gs, { random: () => 0 });
        // moved array should reflect moves in createdSeq ascending order (2,3,5 -> indices 1,2,0)
        const movedFrom = res.moved.map(m => `${m.from.row},${m.from.col}`);
        expect(movedFrom[0]).toBe('3,3'); // createdSeq 2
        expect(movedFrom[1]).toBe('4,4'); // createdSeq 3
        expect(movedFrom[2]).toBe('2,2'); // createdSeq 5
    });

    test('Mixed-type effects processed in createdSeq order', () => {
        const cs = CardLogic.createCardState({ random: () => 0 });
        const gs = Core.createGameState();

        // Dragon anchor createdSeq 1
        cs.specialStones.push({ row: 1, col: 1, type: 'DRAGON', owner: 'black', remainingOwnerTurns: 1, createdSeq: 1 });
        gs.board[1][1] = Core.BLACK; gs.board[1][2] = Core.WHITE;

        // Bomb createdSeq 2 will explode
        cs.bombs.push({ row: 0, col: 7, remainingTurns: 1, owner: 'black', createdSeq: 2 });
        gs.board[0][6] = Core.WHITE; // will be destroyed

        // Breeding anchor createdSeq 3
        cs.specialStones.push({ row: 3, col: 3, type: 'BREEDING', owner: 'black', remainingOwnerTurns: 1, createdSeq: 3 });
        gs.board[3][3] = Core.BLACK; gs.board[3][4] = Core.EMPTY;

        const events = [];
        TurnPhases.applyTurnStartPhase(CardLogic, Core, cs, gs, 'black', events, { random: () => 0 });

        const types = events.map(e => e.type).filter(Boolean);
        const idxDragon = types.indexOf('dragon_converted_start');
        const idxBombs = types.indexOf('bombs_exploded');
        const idxBreed = types.indexOf('breeding_spawned_start');

        expect(idxDragon).toBeLessThan(idxBombs);
        expect(idxBombs).toBeLessThan(idxBreed);
    });
});
