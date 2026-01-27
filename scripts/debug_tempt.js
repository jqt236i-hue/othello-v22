const CardLogic = require('../game/logic/cards');
const Core = require('../game/logic/core');

const { createNoopPrng } = require('../tests/test-helpers');
const cs = CardLogic.createCardState(createNoopPrng());
const gs = Core.createGameState();

gs.board[3][3] = Core.WHITE;
cs.bombs.push({ row: 3, col: 3, remainingTurns: 4, owner: 'white' });
cs.hands.black.push('tempt_01');
cs.charge.black = 30;

console.log('hands before:', cs.hands.black);
const ok = CardLogic.applyCardUsage(cs, gs, 'black', 'tempt_01');
console.log('applyCardUsage returned:', ok);
console.log('hands after:', cs.hands.black);
console.log('pendingEffectByPlayer:', cs.pendingEffectByPlayer);
console.log('charge:', cs.charge);
console.log('specialStones:', cs.specialStones);
console.log('bombs:', cs.bombs);
console.log('isSpecialStoneAt (internal util):', require('../game/logic/cards/utils').isSpecialStoneAt(cs, 3, 3));
console.log('getSpecialOwnerAt (internal util):', require('../game/logic/cards/utils').getSpecialOwnerAt(cs, 3, 3));
const targets = CardLogic.getTemptWillTargets(cs, gs, 'black');
console.log('targets:', targets);
