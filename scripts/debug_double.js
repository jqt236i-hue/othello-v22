const CL=require('../game/logic/cards');
const { createNoopPrng } = require('../tests/test-helpers');
const Core=require('../game/logic/core');
const cs=CL.createCardState(createNoopPrng());
const gs=Core.createGameState();
cs.hands.black.push('double_01');
cs.charge.black=30;
try{
  const ok=CL.applyCardUsage(cs, gs, 'black', 'double_01');
  console.log('applyCardUsage ok:', ok);
  console.log('pending:', cs.pendingEffectByPlayer.black);
} catch (e) {
  console.log('ERROR:', e.message);
}
