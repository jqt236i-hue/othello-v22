const CardLogic=require('../game/logic/cards');
const { createNoopPrng } = require('../tests/test-helpers');
const Core=require('../game/logic/core');
const cs=CardLogic.createCardState(createNoopPrng());
const gs=Core.createGameState();

gs.board[3][3]=Core.WHITE;
cs.bombs.push({row:3,col:3,remainingTurns:4,owner:'white'});
cs.hands.black.push('tempt_01');
cs.charge.black=30;

console.log('hands.black:', cs.hands.black);
const cardId='tempt_01';
const handKey='black';
console.log('idx:', cs.hands[handKey].indexOf(cardId));
console.log('charge >= cost?', cs.charge['black'] >= CardLogic.getCardCost(cardId));
console.log('getCardType:', CardLogic.getCardType(cardId));
console.log('getTemptWillTargets direct:', CardLogic.getTemptWillTargets(cs,gs,'black'));
console.log('applyCardUsage 3-arg:', CardLogic.applyCardUsage(cs,'black','tempt_01'));
