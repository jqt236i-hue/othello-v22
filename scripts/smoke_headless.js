/**
 * Minimal headless smoke tests (no Jest).
 * Run: `node scripts/smoke_headless.js`
 */

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || 'assertion failed');
};

const Shared = require('../shared-constants');
const Core = require('../game/logic/core');
const CardLogic = require('../game/logic/cards');
const Turn = require('../game/turn/turn_pipeline');

function setup() {
  const gs = Core.createGameState();
  const cs = CardLogic.createCardState({
    shuffle: (arr) => arr, // deterministic; keep order
    random: () => 0.0
  });
  // Ensure predictable hands/charge
  cs.hands.black = [];
  cs.hands.white = [];
  cs.discard = [];
  cs.charge.black = 10;
  cs.charge.white = 10;
  return { cs, gs };
}

function forceHand(cs, playerKey, cardId) {
  if (!cs.hands[playerKey].includes(cardId)) cs.hands[playerKey].push(cardId);
}

function testSwapOnEnemyIsAllowedAndAddsCharge() {
  const { cs, gs } = setup();

  // Create an enemy stone adjacent to a normal position so swap can be exercised.
  // Start position has WHITE at (3,3) and (4,4). We'll target (3,3) as the "swap placement".
  assert(gs.board[3][3] === Shared.WHITE, 'expected initial WHITE at (3,3)');

  forceHand(cs, 'black', 'swap_01');
  const beforeCharge = cs.charge.black;
  const cost = CardLogic.getCardDef('swap_01').cost;

  // Use swap card, then "place" on enemy stone (3,3).
  const res = Turn.applyTurn(cs, gs, 'black', { useCardId: 'swap_01', type: 'place', row: 3, col: 3 });

  assert(res && res.gameState && res.cardState, 'expected turn result');
  assert(gs.board[3][3] === Shared.BLACK, 'swap placement should result in BLACK at (3,3)');
  const placeEv = (res.events || []).find(e => e.type === 'place');
  const flipCount = placeEv && Array.isArray(placeEv.flips) ? placeEv.flips.length : 0;
  const expected = Math.min(30, beforeCharge - cost + 1 + flipCount);
  assert(cs.charge.black === expected, `swap charge mismatch: got ${cs.charge.black}, expected ${expected}`);
  return true;
}

function testDestroyThenPlaceInSameTurn() {
  const { cs, gs } = setup();

  // Destroy a known occupied cell, then place a legal black move.
  assert(gs.board[4][4] === Shared.WHITE, 'expected initial WHITE at (4,4)');

  forceHand(cs, 'black', 'destroy_01');

  // Choose a known legal black move that does not rely on (4,4): (3,2) flips (3,3).
  const moveRow = 3, moveCol = 2;
  assert(gs.board[moveRow][moveCol] === Shared.EMPTY, 'expected empty at (3,2)');

  Turn.applyTurn(cs, gs, 'black', {
    useCardId: 'destroy_01',
    type: 'place',
    destroyTarget: { row: 4, col: 4 },
    row: moveRow,
    col: moveCol
  });

  assert(gs.board[4][4] === Shared.EMPTY, 'destroy target should be EMPTY');
  assert(gs.board[moveRow][moveCol] === Shared.BLACK, 'placed stone should be BLACK');
  return true;
}

function testDragonConvertsBomb() {
  const { cs, gs } = setup();

  // Place a bomb-owned stone next to a dragon anchor and ensure dragon conversion can flip it.
  // We'll put a BLACK dragon at (4,4), and a WHITE bomb at (4,3).
  gs.board[4][4] = Shared.BLACK;
  gs.board[4][3] = Shared.WHITE;
  cs.specialStones.push({ row: 4, col: 4, type: 'DRAGON', owner: 'black', remainingOwnerTurns: 5 });
  cs.bombs.push({ row: 4, col: 3, remainingTurns: 3, owner: 'white', placedTurn: -1 });

  const res = CardLogic.processDragonEffectsAtAnchor(cs, gs, 'black', 4, 4);
  const convertedKeys = new Set((res.converted || []).map(p => `${p.row},${p.col}`));

  assert(convertedKeys.has('4,3'), 'dragon should convert bomb stone at (4,3)');
  assert(gs.board[4][3] === Shared.BLACK, 'bomb stone color should become BLACK');
  assert(!(cs.bombs || []).some(b => b.row === 4 && b.col === 3), 'bomb effect should be cleared when flipped');
  return true;
}

function testUltimateDestroyGodDestroysAndExpires() {
  const { cs, gs } = setup();

  // Place a BLACK UDG at (4,4) and surround with WHITE stones.
  gs.board[4][4] = Shared.BLACK;
  cs.specialStones.push({ row: 4, col: 4, type: 'ULTIMATE_DESTROY_GOD', owner: 'black', remainingOwnerTurns: 3 });

  const targets = [
    [3, 3], [3, 4], [3, 5],
    [4, 3],         [4, 5],
    [5, 3], [5, 4], [5, 5]
  ];
  for (const [r, c] of targets) gs.board[r][c] = Shared.WHITE;

  // First trigger: destroys all 8 surrounding, remaining -> 2, anchor remains
  let res = CardLogic.processUltimateDestroyGodEffects(cs, gs, 'black');
  assert(res.destroyed.length === 8, 'UDG should destroy 8 stones on first trigger');
  assert(gs.board[4][4] === Shared.BLACK, 'UDG anchor should remain after first trigger');
  assert(cs.specialStones.find(s => s.type === 'ULTIMATE_DESTROY_GOD').remainingOwnerTurns === 2, 'UDG remaining should decrement to 2');

  // Repopulate one enemy stone, second trigger destroys it, remaining -> 1
  gs.board[4][3] = Shared.WHITE;
  res = CardLogic.processUltimateDestroyGodEffects(cs, gs, 'black');
  assert(res.destroyed.length === 1, 'UDG should destroy newly placed enemy stone');
  assert(cs.specialStones.find(s => s.type === 'ULTIMATE_DESTROY_GOD').remainingOwnerTurns === 1, 'UDG remaining should decrement to 1');

  // Third trigger: remaining -> 0 and anchor should be destroyed
  gs.board[4][5] = Shared.WHITE;
  res = CardLogic.processUltimateDestroyGodEffects(cs, gs, 'black');
  assert(gs.board[4][4] === Shared.EMPTY, 'UDG anchor should be destroyed at expiry');
  assert((cs.specialStones || []).every(s => s.type !== 'ULTIMATE_DESTROY_GOD'), 'UDG marker should be removed at expiry');
  return true;
}

function testUltimateDestroyGodImmediateOnPlacement() {
  const { cs, gs } = setup();

  // Give black the UDG card and place at a legal location.
  forceHand(cs, 'black', 'udg_01');
  cs.charge.black = 30;
  // Place white stones around a future anchor (2,3) so immediate destroy has targets.
  gs.board[1][2] = Shared.WHITE;
  gs.board[1][3] = Shared.WHITE;
  gs.board[1][4] = Shared.WHITE;
  gs.board[2][2] = Shared.WHITE;
  gs.board[2][4] = Shared.WHITE;
  gs.board[3][2] = Shared.WHITE;
  gs.board[3][3] = Shared.WHITE;
  gs.board[3][4] = Shared.WHITE;

  const res = Turn.applyTurn(cs, gs, 'black', { useCardId: 'udg_01', type: 'place', row: 2, col: 3 });
  const immediate = (res.events || []).find(e => e.type === 'udg_destroyed_immediate');
  assert(immediate && immediate.details && immediate.details.length > 0, 'UDG should destroy immediately on placement');
  return true;
}

function testDragonDoesNotConvertUdg() {
  const { cs, gs } = setup();

  // Place a WHITE UDG next to a BLACK dragon anchor; conversion must skip UDG.
  gs.board[4][4] = Shared.BLACK;
  gs.board[4][3] = Shared.WHITE;
  cs.specialStones.push({ row: 4, col: 4, type: 'DRAGON', owner: 'black', remainingOwnerTurns: 5 });
  cs.specialStones.push({ row: 4, col: 3, type: 'ULTIMATE_DESTROY_GOD', owner: 'white', remainingOwnerTurns: 3 });

  const res = CardLogic.processDragonEffectsAtAnchor(cs, gs, 'black', 4, 4);
  const convertedKeys = new Set((res.converted || []).map(p => `${p.row},${p.col}`));

  assert(!convertedKeys.has('4,3'), 'dragon should not convert UDG stone at (4,3)');
  assert(gs.board[4][3] === Shared.WHITE, 'UDG stone color should remain WHITE');
  return true;
}

function testHyperactiveMoveFlipsAfterMove() {
  const { cs, gs } = setup();

  // Clear board to create a deterministic flip setup.
  gs.board = Array.from({ length: 8 }, () => Array(8).fill(Shared.EMPTY));

  // Hyperactive BLACK stone at (4,4) will move to the first candidate (3,3) when random() returns 0.
  gs.board[4][4] = Shared.BLACK;
  cs.specialStones.push({ row: 4, col: 4, type: 'HYPERACTIVE', owner: 'black', hyperactiveSeq: 1 });

  // After moving to (3,3), BLACK should flip WHITE at (3,4) because (3,5) is BLACK.
  gs.board[3][4] = Shared.WHITE;
  gs.board[3][5] = Shared.BLACK;

  const prng = { shuffle: (arr) => arr, random: () => 0.0 };
  const res = CardLogic.processHyperactiveMoves(cs, gs, prng);

  assert(res.moved && res.moved.length === 1, 'expected exactly one hyperactive move');
  assert(gs.board[3][3] === Shared.BLACK, 'expected hyperactive stone moved to (3,3)');
  assert(gs.board[3][4] === Shared.BLACK, 'expected WHITE at (3,4) flipped to BLACK after move');
  assert(Array.isArray(res.flipped) && res.flipped.some(p => p.row === 3 && p.col === 4), 'expected flipped list to include (3,4)');
  return true;
}

function testInheritWillAppliesPermaProtected() {
  const { cs, gs } = setup();

  // Ensure a normal BLACK stone exists and no special markers.
  gs.board[3][3] = Shared.BLACK;
  cs.specialStones = [];
  cs.bombs = [];
  cs.pendingEffectByPlayer.black = { type: 'INHERIT_WILL', cardId: 'inherit_01' };

  const res = CardLogic.applyInheritWill(cs, gs, 'black', 3, 3);
  assert(res && res.applied, 'expected inherit will to apply');
  const hasPerma = (cs.specialStones || []).some(s => s.row === 3 && s.col === 3 && s.type === 'PERMA_PROTECTED');
  assert(hasPerma, 'expected PERMA_PROTECTED marker at (3,3)');
  assert(cs.pendingEffectByPlayer.black === null, 'expected pending effect cleared');
  return true;
}

function clearBoard(gs) {
  gs.board = Array.from({ length: 8 }, () => Array(8).fill(Shared.EMPTY));
}

function testChainWillNoCandidate() {
  const { cs, gs } = setup();
  clearBoard(gs);
  cs.charge.black = 30;

  // Setup: BLACK places at (2,3) flipping (3,3) only.
  gs.board[4][3] = Shared.BLACK;
  gs.board[3][3] = Shared.WHITE;

  forceHand(cs, 'black', 'chain_01');
  const prng = { random: () => 0.0, shuffle: (arr) => arr };
  const res = Turn.applyTurn(cs, gs, 'black', { useCardId: 'chain_01', type: 'place', row: 2, col: 3 }, prng);

  const chainEv = (res.events || []).find(e => e.type === 'chain_flipped');
  assert(!chainEv, 'expected no chain flips when no candidate');
  return true;
}

function testChainWillUniqueMax() {
  const { cs, gs } = setup();
  clearBoard(gs);
  cs.charge.black = 30;

  // Primary flip at (3,3) from placement at (2,3)
  gs.board[4][3] = Shared.BLACK;
  gs.board[3][3] = Shared.WHITE;

  // Chain line: from (3,3) to the right with two whites and a black end (score 2)
  gs.board[3][4] = Shared.WHITE;
  gs.board[3][5] = Shared.WHITE;
  gs.board[3][6] = Shared.BLACK;

  forceHand(cs, 'black', 'chain_01');
  const prng = { random: () => 0.0, shuffle: (arr) => arr };
  const res = Turn.applyTurn(cs, gs, 'black', { useCardId: 'chain_01', type: 'place', row: 2, col: 3 }, prng);

  // Expect chain flips (3,4) and (3,5)
  assert(gs.board[3][4] === Shared.BLACK, 'expected chain flip at (3,4)');
  assert(gs.board[3][5] === Shared.BLACK, 'expected chain flip at (3,5)');
  const chainEv = (res.events || []).find(e => e.type === 'chain_flipped');
  assert(chainEv && chainEv.details && chainEv.details.length === 2, 'expected 2 chain flips');
  return true;
}

function testChainWillTieDeterministic() {
  const { cs, gs } = setup();
  clearBoard(gs);
  cs.charge.black = 30;

  // Primary flip at (3,3) from placement at (2,3)
  gs.board[4][3] = Shared.BLACK;
  gs.board[3][3] = Shared.WHITE;

  // Two equal chain directions from (3,3)
  gs.board[3][4] = Shared.WHITE;
  gs.board[3][5] = Shared.WHITE;
  gs.board[3][6] = Shared.BLACK;

  gs.board[4][4] = Shared.WHITE;
  gs.board[5][5] = Shared.WHITE;
  gs.board[6][6] = Shared.BLACK;

  forceHand(cs, 'black', 'chain_01');
  const prng = { random: () => 0.0, shuffle: (arr) => arr };
  const res = Turn.applyTurn(cs, gs, 'black', { useCardId: 'chain_01', type: 'place', row: 2, col: 3 }, prng);

  // With deterministic pick 0, expect first candidate in evaluation order.
  const chainEv = (res.events || []).find(e => e.type === 'chain_flipped');
  assert(chainEv && chainEv.details && chainEv.details.length === 2, 'expected 2 chain flips in tie');
  return true;
}

function testChainWillTieDifferentPick() {
  const { cs, gs } = setup();
  clearBoard(gs);
  cs.charge.black = 30;

  // Primary flip at (3,3) from placement at (2,3)
  gs.board[4][3] = Shared.BLACK;
  gs.board[3][3] = Shared.WHITE;

  // Two equal chain directions from (3,3)
  gs.board[3][4] = Shared.WHITE;
  gs.board[3][5] = Shared.WHITE;
  gs.board[3][6] = Shared.BLACK;

  gs.board[4][4] = Shared.WHITE;
  gs.board[5][5] = Shared.WHITE;
  gs.board[6][6] = Shared.BLACK;

  forceHand(cs, 'black', 'chain_01');
  const prng = { random: () => 0.99, shuffle: (arr) => arr };
  const res = Turn.applyTurn(cs, gs, 'black', { useCardId: 'chain_01', type: 'place', row: 2, col: 3 }, prng);

  const chainEv = (res.events || []).find(e => e.type === 'chain_flipped');
  assert(chainEv && chainEv.details && chainEv.details.length === 2, 'expected 2 chain flips in tie');
  // Expect the down-right line to be chosen when picking the last candidate
  assert(gs.board[4][4] === Shared.BLACK, 'expected chain flip at (4,4) with different pick');
  assert(gs.board[5][5] === Shared.BLACK, 'expected chain flip at (5,5) with different pick');
  return true;
}

function testChainWillProtectedBlocks() {
  const { cs, gs } = setup();
  clearBoard(gs);
  cs.charge.black = 30;

  // Primary flip at (3,3)
  gs.board[4][3] = Shared.BLACK;
  gs.board[3][3] = Shared.WHITE;

  // Chain line to the right but blocked by PERMA_PROTECTED at (3,4)
  gs.board[3][4] = Shared.WHITE;
  gs.board[3][5] = Shared.WHITE;
  gs.board[3][6] = Shared.BLACK;
  cs.specialStones.push({ row: 3, col: 4, type: 'PERMA_PROTECTED', owner: 'white' });

  forceHand(cs, 'black', 'chain_01');
  const prng = { random: () => 0.0, shuffle: (arr) => arr };
  const res = Turn.applyTurn(cs, gs, 'black', { useCardId: 'chain_01', type: 'place', row: 2, col: 3 }, prng);

  const chainEv = (res.events || []).find(e => e.type === 'chain_flipped');
  assert(!chainEv, 'expected no chain flips when protected blocks direction');
  return true;
}

function testChainWillAppliesAcrossDoublePlaceTurn() {
  const { cs, gs } = setup();
  clearBoard(gs);
  cs.charge.black = 30;

  // First placement setup
  gs.board[4][3] = Shared.BLACK;
  gs.board[3][3] = Shared.WHITE;
  gs.board[3][4] = Shared.WHITE;
  gs.board[3][5] = Shared.WHITE;
  gs.board[3][6] = Shared.BLACK;

  forceHand(cs, 'black', 'chain_01');
  const prng = { random: () => 0.0, shuffle: (arr) => arr };
  Turn.applyTurn(cs, gs, 'black', { useCardId: 'chain_01', type: 'place', row: 2, col: 3 }, prng);

  // Simulate extra placement in same turn (keep pending CHAIN_WILL)
  gs.currentPlayer = Shared.BLACK;
  cs.lastTurnStartedFor = 'black';
  cs.pendingEffectByPlayer.black = { type: 'CHAIN_WILL', cardId: 'chain_01' };

  // Second placement setup
  gs.board[2][2] = Shared.WHITE;
  gs.board[2][3] = Shared.BLACK;
  gs.board[2][4] = Shared.WHITE;
  gs.board[2][5] = Shared.WHITE;
  gs.board[2][6] = Shared.BLACK;
  gs.board[3][3] = Shared.WHITE;
  gs.board[4][4] = Shared.WHITE;
  gs.board[5][5] = Shared.BLACK;

  const res2 = Turn.applyTurn(cs, gs, 'black', { type: 'place', row: 2, col: 1 }, prng);
  const chainEv2 = (res2.events || []).find(e => e.type === 'chain_flipped');
  assert(chainEv2 && chainEv2.details && chainEv2.details.length > 0, 'expected chain to apply on second placement in same turn');
  return true;
}


function testRegenFlipAndCapture() {
  const { cs, gs } = setup();
  clearBoard(gs);
  // Manually set a scenario: regen stone at (3,3), white anchors at (3,1) and (3,5)
  gs.board[3][3] = Shared.BLACK;
  cs.specialStones.push({ row: 3, col: 3, type: 'REGEN', owner: 'black', regenRemaining: 1, ownerColor: Shared.BLACK });
  gs.board[3][1] = Shared.WHITE;
  gs.board[3][5] = Shared.WHITE;

  // Simulate a flip turning (3,3) to WHITE
  gs.board[3][3] = Shared.WHITE;
  const regenRes = CardLogic.applyRegenAfterFlips(cs, gs, [{ row: 3, col: 3 }], 'white');

  assert(gs.board[3][3] === Shared.BLACK, 'regen stone should revert to black');
  assert((regenRes.regened || []).length === 1, 'regen should fire once');
  assert((regenRes.captureFlips || []).length === 0, 'no capture when no enclosed line');
  return true;
}

function testRegenCaptureCanFlipMultipleDirections() {
  const { cs, gs } = setup();
  clearBoard(gs);

  // Regen stone owned by BLACK at (3,3); simulate it being flipped to WHITE.
  gs.board[3][3] = Shared.WHITE;
  cs.specialStones.push({ row: 3, col: 3, type: 'REGEN', owner: 'black', regenRemaining: 1, ownerColor: Shared.BLACK });

  // Two-direction capture after regen returns to BLACK:
  // Right direction: (3,4)(3,5) are WHITE, (3,6) is BLACK
  gs.board[3][4] = Shared.WHITE;
  gs.board[3][5] = Shared.WHITE;
  gs.board[3][6] = Shared.BLACK;

  // Down direction: (4,3)(5,3) are WHITE, (6,3) is BLACK
  gs.board[4][3] = Shared.WHITE;
  gs.board[5][3] = Shared.WHITE;
  gs.board[6][3] = Shared.BLACK;

  const res = CardLogic.applyRegenAfterFlips(cs, gs, [[3, 3]], 'white');
  assert(res.regened.length === 1, 'expected regen to trigger');
  const keys = new Set((res.captureFlips || []).map(p => `${p.row},${p.col}`));
  assert(keys.has('3,4') && keys.has('3,5'), 'expected right-direction capture flips');
  assert(keys.has('4,3') && keys.has('5,3'), 'expected down-direction capture flips');
  assert(gs.board[3][4] === Shared.BLACK && gs.board[3][5] === Shared.BLACK, 'expected right-direction stones flipped to BLACK');
  assert(gs.board[4][3] === Shared.BLACK && gs.board[5][3] === Shared.BLACK, 'expected down-direction stones flipped to BLACK');
  return true;
}


function main() {
  const tests = [
    ['swap_on_enemy', testSwapOnEnemyIsAllowedAndAddsCharge],
    ['destroy_then_place', testDestroyThenPlaceInSameTurn],
    ['dragon_converts_bomb', testDragonConvertsBomb],
    ['udg_destroys_and_expires', testUltimateDestroyGodDestroysAndExpires],
    ['udg_immediate_on_placement', testUltimateDestroyGodImmediateOnPlacement],
    ['dragon_does_not_convert_udg', testDragonDoesNotConvertUdg],
    ['hyperactive_move_flips_after_move', testHyperactiveMoveFlipsAfterMove],
    ['inherit_will_applies_perma_protected', testInheritWillAppliesPermaProtected],
    ['chain_no_candidate', testChainWillNoCandidate],
    ['chain_unique_max', testChainWillUniqueMax],
    ['chain_tie_deterministic', testChainWillTieDeterministic],
    ['chain_tie_different_pick', testChainWillTieDifferentPick],
    ['chain_protected_blocks', testChainWillProtectedBlocks],
    ['chain_double_place', testChainWillAppliesAcrossDoublePlaceTurn],
    ['regen_flip_capture', testRegenFlipAndCapture],
    ['regen_multi_direction_capture', testRegenCaptureCanFlipMultipleDirections]
  ];
  for (const [name, fn] of tests) {
    fn();
    // eslint-disable-next-line no-console
    console.log('[OK]', name);
  }
  // eslint-disable-next-line no-console
  console.log('All smoke tests passed.');
}

main();
