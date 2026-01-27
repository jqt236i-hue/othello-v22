const CardUtils=require('../game/logic/cards/utils');
const CardLogic=require('../game/logic/cards');
const { createNoopPrng } = require('../tests/test-helpers');
const Core=require('../game/logic/core');
const cs=CardLogic.createCardState(createNoopPrng());
const gs=Core.createGameState();

gs.board[3][3]=Core.WHITE;
cs.bombs.push({row:3,col:3,remainingTurns:4,owner:'white'});
cs.hands.black.push('tempt_01');
cs.charge.black=30;

for (let r=0;r<8;r++){
  for(let c=0;c<8;c++){
    const isSpec = CardUtils.isSpecialStoneAt(cs,r,c);
    const owner = CardUtils.getSpecialOwnerAt(cs,r,c);
    if (isSpec) console.log('cell',r,c,'is special owner',owner,'board',gs.board[r][c]);
  }
}
console.log('getTemptWillTargets:', CardLogic.getTemptWillTargets(cs,gs,'black'));
console.log('applyCardUsage direct call returns:', CardLogic.applyCardUsage(cs,'black','tempt_01'));
