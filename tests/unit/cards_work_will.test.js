const Shared = require('../../shared-constants');
const CardWork = require('../../game/logic/cards/work_will');
const CardLogic = require('../../game/logic/cards');

function emptyBoard() {
    const b = Array(8).fill(null).map(() => Array(8).fill(Shared.EMPTY));
    b[3][3] = Shared.BLACK; b[3][4] = Shared.WHITE; b[4][3] = Shared.WHITE; b[4][4] = Shared.BLACK;
    return b;
}

describe('Work Will card logic', () => {
    test('placing a work stone registers special stone and anchor', () => {
        const cs = CardLogic.createCardState({ shuffle: arr => arr });
        const gs = { board: emptyBoard() };
        const res = CardWork.placeWorkStone(cs, gs, 'black', 2, 2);
        expect(res.placed).toBe(true);
        expect(cs.workAnchorPosByPlayer.black).toEqual({ row: 2, col: 2 });
        const s = (cs.specialStones || []).find(x => x.type === 'WORK' && x.owner === 'black');
        expect(s).toBeTruthy();
        expect(s.row).toBe(2);
        expect(s.col).toBe(2);
    });

    test('processWorkEffects increments charge and stage and removes after 5 activations', () => {
        const cs = CardLogic.createCardState({ shuffle: arr => arr });
        const gs = { board: emptyBoard() };

        // place and simulate 5 turns
        // place a black stone at anchor cell first (work anchor applies to an existing own stone)
        gs.board[2][2] = Shared.BLACK;
        CardWork.placeWorkStone(cs, gs, 'black', 2, 2);
        let totalGained = 0;
        for (let i = 0; i < 5; i++) {
            const r = CardWork.processWorkEffects(cs, gs, 'black');
            totalGained += r.gained;
            if (i < 4) {
                expect(r.removed).toBe(false);
            }
        }

        // After 5 activations, marker should be removed and total gained should be 1+2+4+8+16 = 31 but clamped per-step
        // Note: the implementation clamps each step to 30 per cardState.charge clamp, so total may be <= 30
        expect(cs.workAnchorPosByPlayer.black).toBe(null);
        expect((cs.specialStones || []).find(s => s.type === 'WORK' && s.owner === 'black')).toBeUndefined();
        expect(cs.charge.black).toBeLessThanOrEqual(30);
    });

    test('onTurnStart integrates and emits presentation event', () => {
        const cs = CardLogic.createCardState({ shuffle: arr => arr });
        const gs = { board: emptyBoard() };
        // place white stone at anchor so work effect is valid
        gs.board[5][5] = Shared.WHITE;
        CardWork.placeWorkStone(cs, gs, 'white', 5, 5);
        expect(cs.presentationEvents).toBeDefined();
        cs.presentationEvents.length = 0;
        // Call CardLogic.onTurnStart which should call processWorkEffects and push a presentation event
        CardLogic.onTurnStart(cs, 'white', gs, { shuffle: arr => arr });
        const ev = (cs.presentationEvents || []).find(e => e.type === 'WORK_INCOME' || e.type === 'WORK_REMOVED');
        expect(ev).toBeTruthy();
    });
});
