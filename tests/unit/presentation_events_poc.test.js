const CardLogic = require('../../game/logic/cards');
const { createNoopPrng } = require('../test-helpers');

test('Breeding spawn emits presentation SPWAN event with stoneId', () => {
    const prng = createNoopPrng();
    const cs = CardLogic.createCardState(prng);
    const gs = { board: Array(8).fill(0).map(()=>Array(8).fill(0)) };

    // Place a breeding anchor for black at (4,4)
    cs.specialStones.push({ row: 4, col: 4, type: 'BREEDING', owner: 'black', remainingOwnerTurns: 3 });
    gs.board[4][4] = (CardLogic.BLACK || 1);

    const res = CardLogic.processBreedingEffectsAtAnchor(cs, gs, 'black', 4, 4, prng);

    expect(res.spawned && res.spawned.length).toBeGreaterThan(0);
    const s = res.spawned[0];
    expect(s.stoneId).toBeDefined();

    expect(Array.isArray(cs.presentationEvents)).toBe(true);
    const evt = cs.presentationEvents.find(e => e.type === 'SPAWN' && e.stoneId === s.stoneId);
    expect(evt).toBeDefined();
    expect(evt.row).toBe(s.row);
    expect(evt.col).toBe(s.col);
    expect(evt.ownerAfter).toBe('black');
});