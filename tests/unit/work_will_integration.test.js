const CardLogic = require('../../game/logic/cards');
const Turn = require('../../game/turn/turn_pipeline');
const { createNoopPrng } = require('../test-helpers');

test('Using Work Will arms next placement and places a WORK anchor on placement', () => {
    const prng = createNoopPrng();
    const cs = CardLogic.createCardState(prng);
    const gs = { board: Array(8).fill(0).map(()=>Array(8).fill(0)) };

    // give black enough charge and the card in hand
    cs.charge.black = 20;
    cs.hands.black.push('work_01');

    // Make placement at (2,3) legal by setting up an adjacent white stone and black beyond
    gs.board[3][3] = (CardLogic.WHITE || -1);
    gs.board[4][3] = (CardLogic.BLACK || 1);

    // Use card and place at (2,3) via Turn.applyTurn
    const res = Turn.applyTurnSafe(cs, gs, 'black', { useCardId: 'work_01', type: 'place', row: 2, col: 3 }, prng);
    expect(res.ok).toBe(true);

    // After placement the work anchor should be present at (2,3)
    const s = (res.cardState.specialStones || []).find(x => x.type === 'WORK' && x.row === 2 && x.col === 3 && x.owner === 'black');
    expect(s).toBeTruthy();
    expect(res.cardState.workNextPlacementArmedByPlayer.black).toBe(false);
});
