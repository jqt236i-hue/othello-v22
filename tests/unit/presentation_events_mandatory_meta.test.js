const BoardOps = require('../../game/logic/board_ops');
const CardLogic = require('../../game/logic/cards');
const CardWork = require('../../game/logic/cards/work_will');
const Shared = require('../../shared-constants');

function emptyBoard() {
    const b = Array(8).fill(null).map(() => Array(8).fill(Shared.EMPTY));
    b[3][3] = Shared.BLACK; b[3][4] = Shared.WHITE; b[4][3] = Shared.WHITE; b[4][4] = Shared.BLACK;
    return b;
}

describe('presentation events must include action meta (actionId, turnIndex, plyIndex)', () => {
    test('BoardOps.emitPresentationEvent fills action meta and increments plyIndex', () => {
        const cs = CardLogic.createCardState({ shuffle: arr => arr });
        // Set action context
        BoardOps.setActionContext(cs, { actionId: 'act-1', turnIndex: cs.turnIndex || 0, plyIndex: 0 });

        BoardOps.emitPresentationEvent(cs, { type: 'TEST_A' });
        BoardOps.emitPresentationEvent(cs, { type: 'TEST_B' });

        const evs = cs.presentationEvents.slice();
        expect(evs.length).toBeGreaterThanOrEqual(2);
        expect(evs[0].actionId).toBe('act-1');
        expect(typeof evs[0].turnIndex).toBe('number');
        expect(evs[0].plyIndex).toBe(0);
        expect(evs[1].plyIndex).toBe(1);

        BoardOps.clearActionContext(cs);
    });

    test('cards.js emits WORK_REMOVED/WORK_INCOME via BoardOps and events include action meta', () => {
        const cs = CardLogic.createCardState({ shuffle: arr => arr });
        const gs = { board: emptyBoard() };

        // Place a black work anchor at (2,2)
        gs.board[2][2] = Shared.BLACK;
        CardWork.placeWorkStone(cs, gs, 'black', 2, 2);
        cs.presentationEvents = [];

        // Set action context for the TEMPT action
        BoardOps.setActionContext(cs, { actionId: 'tempt-1', turnIndex: cs.turnIndex || 0, plyIndex: 0 });

        // White uses TEMPT directly on (2,2)
        cs.hands.white.push('tempt_01');
        cs.charge.white = 999; // ignore cost
        CardLogic.applyCardUsage(cs, gs, 'white', 'tempt_01');
        const r = CardLogic.applyTemptWill(cs, gs, 'white', 2, 2);
        expect(r.applied).toBe(true);

        const ev = (cs.presentationEvents || []).find(e => e.type === 'WORK_REMOVED' && e.row === 2 && e.col === 2);
        expect(ev).toBeDefined();
        expect(ev.actionId).toBe('tempt-1');
        expect(typeof ev.turnIndex).toBe('number');
        expect(typeof ev.plyIndex).toBe('number');

        BoardOps.clearActionContext(cs);
    });
});