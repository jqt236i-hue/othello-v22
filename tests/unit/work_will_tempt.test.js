const Shared = require('../../shared-constants');
const CardLogic = require('../../game/logic/cards');
const CardWork = require('../../game/logic/cards/work_will');

function emptyBoard() {
    const b = Array(8).fill(null).map(() => Array(8).fill(Shared.EMPTY));
    b[3][3] = Shared.BLACK; b[3][4] = Shared.WHITE; b[4][3] = Shared.WHITE; b[4][4] = Shared.BLACK;
    return b;
}

describe('Work Will + TEMPT interactions', () => {
    test('TEMPT on WORK anchor removes anchor and emits WORK_REMOVED event', () => {
        const cs = CardLogic.createCardState({ shuffle: arr => arr });
        const gs = { board: emptyBoard() };

        // Place a black work anchor at (2,2)
        gs.board[2][2] = Shared.BLACK;
        CardWork.placeWorkStone(cs, gs, 'black', 2, 2);
        cs.presentationEvents = [];

        // White uses TEMPT directly on (2,2)
        cs.hands.white.push('tempt_01');
        cs.charge.white = 999; // ignore cost
        CardLogic.applyCardUsage(cs, gs, 'white', 'tempt_01');
        const r = CardLogic.applyTemptWill(cs, gs, 'white', 2, 2);
        expect(r.applied).toBe(true);

        // Work anchor must be removed
        const s = (cs.specialStones || []).find(x => x.type === 'WORK' && x.row === 2 && x.col === 2);
        expect(s).toBeUndefined();

        // Presentation event emitted
        const ev = (cs.presentationEvents || []).find(e => e.type === 'WORK_REMOVED' && e.row === 2 && e.col === 2);
        expect(ev).toBeDefined();
        expect(ev.ownerBefore).toBe('black');
        expect(ev.ownerAfter).toBe('white');
    });

    test('After TEMPT, original owner gets no income and anchor cleared', () => {
        const cs = CardLogic.createCardState({ shuffle: arr => arr });
        const gs = { board: emptyBoard() };

        gs.board[4][4] = Shared.BLACK;
        CardWork.placeWorkStone(cs, gs, 'black', 4, 4);
        // Steal by white
        cs.hands.white.push('tempt_01'); cs.charge.white = 999;
        CardLogic.applyCardUsage(cs, gs, 'white', 'tempt_01');
        CardLogic.applyTemptWill(cs, gs, 'white', 4, 4);

        // Anchor cleared for black
        expect(cs.workAnchorPosByPlayer.black).toBe(null);

        // Calling processWorkEffects for black yields no gain
        const res = CardWork.processWorkEffects(cs, gs, 'black');
        expect(res.gained).toBe(0);
    });
});
