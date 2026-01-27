const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // Capture console and page errors for debugging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Use file:// URL to load index.html directly (avoids relying on local server)
  const path = require('path');
  const indexPath = 'file://' + path.join(__dirname, '..', 'index.html');
  await page.goto(indexPath, { waitUntil: 'load' });

  // Give the page some time to initialize
  // Wait until CardLogic, addLog and updateBgmButtons are available
  await page.waitForFunction(() => !!(window.CardLogic && window.addLog && window.updateBgmButtons), { timeout: 20000 });
  const globals = await page.evaluate(() => ({
    hasCardLogic: !!window.CardLogic,
    hasAddLog: !!window.addLog,
    hasUpdateBgmButtons: !!window.updateBgmButtons,
    hasCardState: !!window.cardState,
    hasGameState: !!window.gameState
  }));
  console.log('PAGE GLOBALS:', globals);
  if (!globals.hasCardLogic || !globals.hasAddLog) throw new Error('Required globals not present');

  function runCheck(flips, type, expectedMultiplier) {
    return page.evaluate(({ flips, type, expectedMultiplier }) => {
      // Build minimal cardState and gameState local to this eval (do not require global cardState)
      const cs = {
        charge: { black: 10, white: 0 },
        pendingEffectByPlayer: { black: { type: type, cardId: type === 'GOLD_STONE' ? 'gold_stone' : 'silver_stone' } },
        specialStones: [],
        hands: { black: [], white: [] },
        discard: [],
        hasUsedCardThisTurnByPlayer: { black: false, white: false }
      };
      const gs = { board: Array(8).fill(0).map(() => Array(8).fill(0)) };

      // Call CardLogic directly
      let effects;
      try {
        effects = window.CardLogic.applyPlacementEffects(cs, gs, 'black', 0, 0, flips);
      } catch (e) {
        return { error: e.message };
      }

      // Also format expected text
      const expectedChargeGain = flips * expectedMultiplier;

      return {
        flips, type, effects, finalCharge: cs.charge.black, expectedChargeGain
      };
    }, { flips, type, expectedMultiplier });
  }

  console.log('Running UI checks...');

  const gold2 = await runCheck(2, 'GOLD_STONE', 4);
  console.log('GOLD flips=2 ->', gold2);

  const gold3 = await runCheck(3, 'GOLD_STONE', 4);
  console.log('GOLD flips=3 ->', gold3);

  const silver2 = await runCheck(2, 'SILVER_STONE', 3);
  console.log('SILVER flips=2 ->', silver2);

  const silver3 = await runCheck(3, 'SILVER_STONE', 3);
  console.log('SILVER flips=3 ->', silver3);


  // Now test full UI path: set global cardState minimally and call applyProtectionAfterMove
  const uiRes = await page.evaluate(() => {
    // Initialize cardState using provided init function so closure variable is populated
    if (typeof initCardState === 'function') initCardState();
    // Now mutate the closure-scoped variable directly
    cardState.charge = { black: 10, white: 0 };
    cardState.pendingEffectByPlayer = { black: { type: 'GOLD_STONE', cardId: 'gold_stone' } };
    cardState.specialStones = [];
    // Ensure gameState variable (also a closure variable in game scripts) exists
    if (typeof gameState === 'undefined') gameState = { board: Array(8).fill(0).map(() => Array(8).fill(0)) };

    const move = { player: BLACK || 1, row: 0, col: 0, flips: [ [1,1], [2,2] ] };
    const effects = CardLogic.applyPlacementEffects(cardState, gameState, 'black', 0, 0, 2);
    const uiEffects = applyProtectionAfterMove(move, effects);

    // Read log entries
    const entries = Array.from(document.querySelectorAll('.logEntry'));
    return {
      lastLog: entries.length ? entries[entries.length-1].textContent : null,
      effects: uiEffects
    };
  });
  console.log('UI path result (GOLD):', uiRes);
  // Assert GOLD log format matches expectation
  if (!uiRes.lastLog || !uiRes.lastLog.includes('金の意志')) {
    throw new Error('GOLD UI log missing or incorrect: ' + String(uiRes.lastLog));
  }

  const uiResSilver = await page.evaluate(() => {
    if (typeof initCardState === 'function') initCardState();
    cardState.charge = { black: 10, white: 0 };
    cardState.pendingEffectByPlayer = { black: { type: 'SILVER_STONE', cardId: 'silver_stone' } };
    cardState.specialStones = [];

    const move = { player: BLACK || 1, row: 0, col: 0, flips: [ [1,1], [2,2], [3,3] ] };
    const effects = CardLogic.applyPlacementEffects(cardState, gameState, 'black', 0, 0, 3);
    const uiEffects = applyProtectionAfterMove(move, effects);

    const entries = Array.from(document.querySelectorAll('.logEntry'));
    return {
      lastLog: entries.length ? entries[entries.length-1].textContent : null,
      effects: uiEffects
    };
  });
  console.log('UI path result (SILVER):', uiResSilver);
  if (!uiResSilver.lastLog || !uiResSilver.lastLog.includes('銀の意志')) {
    throw new Error('SILVER UI log missing or incorrect: ' + String(uiResSilver.lastLog));
  }

  // --- Extended: check all card types via CARD_DEFS ---
  console.log('Running full card set UI checks...');
  const cardResults = await page.evaluate(() => {
    const defs = (window.SharedConstants && window.SharedConstants.CARD_DEFS) ? window.SharedConstants.CARD_DEFS.filter(d => d.enabled !== false) : [];
    const res = [];
    for (const def of defs) {
      try {
        // Build logic-level cs/gs and verify CardLogic.applyPlacementEffects behavior
        // Use CardLogic.createCardState so full shape is present (avoid missing fields errors)
        let cs = null;
        try {
          cs = CardLogic.createCardState({ random: () => 0 });
        } catch (e) {
          cs = { charge: { black: 30, white: 0 }, hands: { black: [def.id], white: [] }, discard: [], specialStones: [], bombs: [], hasUsedCardThisTurnByPlayer: { black: false, white: false }, pendingEffectByPlayer: { black: null, white: null }, lastUsedCardByPlayer: { black: null, white: null } };
        }
        cs.hands.black = [def.id];
        cs.charge.black = 30;
        const gs = { board: Array(8).fill(0).map(() => Array(8).fill(0)) };

        // Pre-conditions for particular card types
        if (def.type === 'TEMPT_WILL') {
          // ensure there is an opponent special stone to target
          cs.specialStones.push({ row: 3, col: 3, type: 'DRAGON', owner: 'white', remainingOwnerTurns: 5 });
          gs.board[3][3] = (BLACK || 1) * -1;
        }
        if (def.type === 'SWAP_WITH_ENEMY' || def.type === 'DESTROY_ONE_STONE' || def.type === 'INHERIT_WILL' || def.type === 'STEAL_CARD') {
          gs.board[1][1] = (BLACK || 1) * -1; // an opponent stone to act on
        }
        if (def.type === 'PLUNDER_WILL') {
          // give opponent some charge to plunder
          cs.charge.white = 5;
          gs.board[2][2] = (BLACK || 1) * -1;
        }

        let logicError = null;
        let logicEffects = null;
        try {
          const used = CardLogic.applyCardUsage(cs, gs, 'black', def.id);
          if (!used) {
            logicError = 'applyCardUsage returned false';
          } else {
            // For selection-based cards, do NOT perform placement (selection required)
            const selectionTypes = new Set(['DESTROY_ONE_STONE','SWAP_WITH_ENEMY','INHERIT_WILL','TEMPT_WILL']);
            if (!selectionTypes.has(def.type)) {
              logicEffects = CardLogic.applyPlacementEffects(cs, gs, 'black', 0, 0, 2);
              // Augment logicEffects with immediate follow-up outcomes when available
              try {
                  if (logicEffects && logicEffects.breedingPlaced && typeof CardLogic.processBreedingEffectsAtAnchor === 'function') {
                  const bNow = CardLogic.processBreedingEffectsAtAnchor(cs, gs, 'black', 0, 0, { random: () => 0 });
                  logicEffects.breedingSpawned = bNow && bNow.spawned ? bNow.spawned.length : 0;
                  logicEffects.breedingFlipped = bNow && bNow.flipped ? bNow.flipped.length : 0;
                }
                if (logicEffects && logicEffects.regenPlaced && typeof CardLogic.applyRegenAfterFlips === 'function') {
                  const regenRes = CardLogic.applyRegenAfterFlips(cs, gs, [[1,1],[2,2]], 'black');
                  logicEffects.regenTriggered = regenRes && regenRes.regened ? regenRes.regened.length : 0;
                  logicEffects.regenCapture = regenRes && regenRes.captureFlips ? regenRes.captureFlips.length : 0;
                }
              } catch (e) {
                console.log('[PLAYWRIGHT] augmentation error for', def.id, e && e.message ? e.message : String(e));
              }
            }
          }
        } catch (e) {
          logicError = e && e.message ? e.message : String(e);
        }

        // Now exercise UI path: initialize page-scoped cardState/gameState and call applyProtectionAfterMove
        if (typeof initCardState === 'function') initCardState();
        // Mirror important fields
        cardState.charge = { black: 30, white: 0 };
        cardState.hands = { black: [def.id], white: [] };
        cardState.discard = [];
        cardState.specialStones = [];
        cardState.bombs = [];
        cardState.hasUsedCardThisTurnByPlayer = { black: false, white: false };
        cardState.pendingEffectByPlayer = { black: null, white: null };

        // Before calling global applyCardUsage, mirror preconditions to global cardState as well
        // (so UI-level application has same context)
        if (def.type === 'TEMPT_WILL') {
          cardState.specialStones.push({ row: 3, col: 3, type: 'DRAGON', owner: 'white', remainingOwnerTurns: 5 });
          gameState.board[3][3] = (BLACK || 1) * -1;
        }
        if (def.type === 'SWAP_WITH_ENEMY' || def.type === 'DESTROY_ONE_STONE' || def.type === 'INHERIT_WILL' || def.type === 'STEAL_CARD') {
          gameState.board[1][1] = (BLACK || 1) * -1;
        }
        if (def.type === 'PLUNDER_WILL') {
          cardState.charge.white = 5;
          gameState.board[2][2] = (BLACK || 1) * -1;
        }

        // Use applyCardUsage via global CardLogic to set up pendingEffect in the real cardState if possible (uses signature with gameState)
        let uiError = null;
        let uiEffects = null;
        let lastLog = null;
        try {
          const ok = CardLogic.applyCardUsage(cardState, gameState, 'black', def.id);
          // capture pending stage immediately after usage (before any UI consumption)
          const beforeStage = (cardState.pendingEffectByPlayer && cardState.pendingEffectByPlayer.black && cardState.pendingEffectByPlayer.black.stage) ? cardState.pendingEffectByPlayer.black.stage : null;

          // Now simulate a placement move which should trigger placement-side logging/visuals
          const move = { player: BLACK || 1, row: 0, col: 0, flips: [ [1,1], [2,2] ] };
          const beforeCount = document.querySelectorAll('.logEntry').length;
          uiEffects = applyProtectionAfterMove(move);

          // Capture presentationEvents emitted into cardState by BoardOps
          let presEvents = [];
          try {
            if (typeof cardState !== 'undefined' && Array.isArray(cardState.presentationEvents)) {
              presEvents = cardState.presentationEvents.slice();
              cardState.presentationEvents.length = 0; // flush
            }
          } catch (e) {
            // ignore
          }

          const entries = Array.from(document.querySelectorAll('.logEntry'));
          const added = entries.slice(beforeCount);
          lastLog = added.length ? added[added.length - 1].textContent : null;

          // Basic DOM assertions from presentation events (PoC checks)
          if (presEvents && presEvents.length) {
            for (const ev of presEvents) {
              if (ev.type === 'SPAWN' && ev.stoneId) {
                const sel = `.cell[data-row="${ev.row}"][data-col="${ev.col}"] .disc[data-stone-id="${ev.stoneId}"]`;
                const el = document.querySelector(sel);
                if (!el) {
                  // mark lastLog to help debug
                  lastLog = (lastLog || '') + ` | MISSING_SPAWN:${ev.stoneId}@${ev.row},${ev.col}`;
                }
              }
              if (ev.type === 'DESTROY' && ev.stoneId) {
                const sel = `.cell[data-row="${ev.row}"][data-col="${ev.col}"] .disc[data-stone-id="${ev.stoneId}"]`;
                const el = document.querySelector(sel);
                if (el) {
                  lastLog = (lastLog || '') + ` | STILL_PRESENT_DESTROY:${ev.stoneId}@${ev.row},${ev.col}`;
                }
              }
              if (ev.type === 'MOVE' && ev.stoneId) {
                const sel = `.cell[data-row="${ev.row}"][data-col="${ev.col}"] .disc[data-stone-id="${ev.stoneId}"]`;
                const el = document.querySelector(sel);
                if (!el) {
                  lastLog = (lastLog || '') + ` | MISSING_MOVE:${ev.stoneId}@${ev.row},${ev.col}`;
                }
              }
              if (ev.type === 'CHANGE' && ev.stoneId) {
                const sel = `.cell[data-row="${ev.row}"][data-col="${ev.col}"] .disc[data-stone-id="${ev.stoneId}"]`;
                const el = document.querySelector(sel);
                if (!el) {
                  lastLog = (lastLog || '') + ` | MISSING_CHANGE:${ev.stoneId}@${ev.row},${ev.col}`;
                }
              }
            }
          }

          // capture pending stage after UI call as well
          const afterStage = (cardState.pendingEffectByPlayer && cardState.pendingEffectByPlayer.black && cardState.pendingEffectByPlayer.black.stage) ? cardState.pendingEffectByPlayer.black.stage : null;
          cardState._pendingStageBefore = beforeStage;
          cardState._pendingStageAfter = afterStage;
        } catch (e) {
          uiError = e && e.message ? e.message : String(e);
        }

        const pendingStage = (cardState._pendingStageBefore) ? cardState._pendingStageBefore : ((cardState.pendingEffectByPlayer && cardState.pendingEffectByPlayer.black && cardState.pendingEffectByPlayer.black.stage) ? cardState.pendingEffectByPlayer.black.stage : null);
        res.push({ id: def.id, type: def.type, name: def.name, logicError, logicEffects, uiError, uiEffects, lastLog, pendingStage });
      } catch (outerErr) {
        res.push({ id: def.id, type: def.type, name: def.name, logicError: outerErr && outerErr.message ? outerErr.message : String(outerErr), logicEffects: null, uiError: outerErr && outerErr.message ? outerErr.message : String(outerErr), uiEffects: null, lastLog: null });
      }
    }
    return res;
  });

  console.log('Card UI results summary:');
  const selectionTypes = new Set(['DESTROY_ONE_STONE','SWAP_WITH_ENEMY','INHERIT_WILL','TEMPT_WILL']);
  const immediateExpected = new Set(['GOLD_STONE','SILVER_STONE','TIME_BOMB','ULTIMATE_REVERSE_DRAGON','ULTIMATE_DESTROY_GOD','DOUBLE_PLACE','HYPERACTIVE_WILL']);

  const failures = [];
  for (const r of cardResults) {
    // Print summary
    console.log(`  ${r.id} ${r.type} ${r.name} -> logicError:${r.logicError ? r.logicError : 'ok'} uiError:${r.uiError ? r.uiError : 'ok'} lastLog:${r.lastLog ? r.lastLog : 'null'} pendingStage:${r.pendingStage ? r.pendingStage : 'null'}`);

    // Validate according to type
    if (r.logicError || r.uiError) {
      failures.push({ r, reason: 'error' });
      continue;
    }

    if (selectionTypes.has(r.type)) {
      // selection flow should register a selectTarget stage
      if (r.pendingStage !== 'selectTarget') {
        failures.push({ r, reason: 'expected selection stage' });
      }
      continue;
    }

    if (immediateExpected.has(r.type)) {
      // immediate effect should emit a log mentioning the card name
      if (!r.lastLog || !r.lastLog.includes(r.name)) {
        failures.push({ r, reason: 'expected immediate log with card name' });
      }
      continue;
    }

      // For other card types: if logicEffects indicate a *notable* outcome (e.g., plunderAmount>0, regenTriggered>0, breedingSpawned>0), ensure a log exists
      const notable = (r.logicEffects && (
        (r.logicEffects.plunderAmount && r.logicEffects.plunderAmount > 0) ||
        (r.logicEffects.regenTriggered && r.logicEffects.regenTriggered > 0) ||
        (r.logicEffects.regenCapture && r.logicEffects.regenCapture > 0) ||
        (r.logicEffects.breedingSpawned && r.logicEffects.breedingSpawned > 0) ||
        (r.logicEffects.breedingFlipped && r.logicEffects.breedingFlipped > 0) ||
        (r.logicEffects.stolenCount && r.logicEffects.stolenCount > 0) ||
        (r.logicEffects.destroyed && r.logicEffects.destroyed.length > 0)
      ));
      if (notable) {
        if (!r.lastLog) failures.push({ r, reason: 'expected log when logic shows notable effect' });
      }
  }

  if (failures.length) {
    console.log('Failures detected for', failures.length, 'cards:');
    for (const f of failures) console.log('  FAIL:', f.r.id, f.r.type, f.r.name, 'reason:', f.reason, 'logicError:', f.r.logicError, 'uiError:', f.r.uiError, 'lastLog:', f.r.lastLog, 'pendingStage:', f.r.pendingStage, 'logicEffects:', f.r.logicEffects);
    await browser.close();
    throw new Error('Some cards failed UI/visual checks. See output for details.');
  }

  console.log('All cards passed UI checks.');

  // --- Visual check: WORK stone images + timer ---
  console.log('Running WORK visual check...');
  const workVisualCheck = await page.evaluate(() => {
    try {
      if (typeof initCardState === 'function') initCardState();
      // black work stone at (4,4)
      cardState.specialStones = cardState.specialStones || [];
      cardState.specialStones.push({ row: 4, col: 4, type: 'WORK', owner: 'black', ownerColor: 'black', workStage: 0, remainingOwnerTurns: 5 });
      cardState.workAnchorPosByPlayer = cardState.workAnchorPosByPlayer || { black: null, white: null };
      cardState.workAnchorPosByPlayer.black = { row: 4, col: 4 };
      gameState.board[4][4] = (BLACK || 1);
      // force a re-render
      if (typeof renderBoard === 'function') renderBoard();

      const sel = `.cell[data-row="4"][data-col="4"] .disc`;
      const disc = document.querySelector(sel);
      const imgVar = disc ? disc.style.getPropertyValue('--special-stone-image') : null;
      const timer = disc ? disc.querySelector('.work-timer') : null;
      const timerText = timer ? timer.textContent : null;

      // Now white owner check at (5,5)
      cardState.specialStones.push({ row: 5, col: 5, type: 'WORK', owner: 'white', ownerColor: 'white', workStage: 0, remainingOwnerTurns: 5 });
      gameState.board[5][5] = (BLACK || 1) * -1;
      if (typeof renderBoard === 'function') renderBoard();
      const selW = `.cell[data-row="5"][data-col="5"] .disc`;
      const discW = document.querySelector(selW);
      const imgVarW = discW ? discW.style.getPropertyValue('--special-stone-image') : null;
      const timerW = discW ? discW.querySelector('.work-timer') : null;
      const timerTextW = timerW ? timerW.textContent : null;

      return { imgVar, timerText, imgVarW, timerTextW };
    } catch (e) {
      return { error: e.message || String(e) };
    }
  });

  console.log('WORK visual check result:', workVisualCheck);
  if (!workVisualCheck.imgVar || !workVisualCheck.imgVar.includes('work_stone-black.png')) {
    // gather debug info
    const dbg = await page.evaluate(() => {
      const sel = `.cell[data-row="4"][data-col="4"] .disc`;
      const disc = document.querySelector(sel);
      return {
        outerHTML: disc ? disc.outerHTML : null,
        classList: disc ? Array.from(disc.classList) : null,
        dataset: disc ? { ...disc.dataset } : null,
        cssText: disc ? disc.getAttribute('style') : null
      };
    });
    console.log('WORK visual debug black:', dbg);
    // Try to apply effect directly to debug why automatic application did not occur
    const appliedDebug = await page.evaluate(() => {
      const sel = `.cell[data-row="4"][data-col="4"] .disc`;
      const disc = document.querySelector(sel);
      if (!disc || typeof applyStoneVisualEffect !== 'function') return { error: 'no disc or no applyStoneVisualEffect' };
      applyStoneVisualEffect(disc, 'workStone', { owner: 1 });
      return { outerHTML: disc.outerHTML, dataset: { ...disc.dataset }, cssText: disc.getAttribute('style') };
    });
    console.log('WORK visual post-apply debug:', appliedDebug);
    throw new Error('Work image not set for black');
  }
  if (workVisualCheck.timerText !== '5') throw new Error('Work timer not showing 5 for black');
  if (!workVisualCheck.imgVarW || !workVisualCheck.imgVarW.includes('work_stone-white.png')) {
    const dbgW = await page.evaluate(() => {
      const sel = `.cell[data-row="5"][data-col="5"] .disc`;
      const disc = document.querySelector(sel);
      return {
        outerHTML: disc ? disc.outerHTML : null,
        classList: disc ? Array.from(disc.classList) : null,
        dataset: disc ? { ...disc.dataset } : null,
        cssText: disc ? disc.getAttribute('style') : null
      };
    });
    console.log('WORK visual debug white:', dbgW);
    throw new Error('Work image not set for white');
  }
  if (workVisualCheck.timerTextW !== '5') throw new Error('Work timer not showing 5 for white');

  // --- Additional E2E: TEMPT on WORK anchor should remove anchor and emit WORK_REMOVED ---
  console.log('Running TEMPT+WORK E2E check...');
  const temptWorkCheck = await page.evaluate(() => {
    try {
      if (typeof initCardState === 'function') initCardState();
      // Setup: black has a WORK anchor at (3,3)
      cardState.specialStones = cardState.specialStones || [];
      cardState.specialStones.push({ row: 3, col: 3, type: 'WORK', owner: 'black', ownerColor: 'black', workStage: 1 });
      cardState.workAnchorPosByPlayer = cardState.workAnchorPosByPlayer || { black: null, white: null };
      cardState.workAnchorPosByPlayer.black = { row: 3, col: 3 };
      gameState.board[3][3] = (BLACK || 1);

      // White uses TEMPT on (3,3)
      cardState.hands.white = cardState.hands.white || [];
      cardState.hands.white.push('tempt_01');
      cardState.charge.white = 999;
      const used = CardLogic.applyCardUsage(cardState, gameState, 'white', 'tempt_01');
      if (!used) return { ok: false, reason: 'applyCardUsage failed' };

      const res = CardLogic.applyTemptWill(cardState, gameState, 'white', 3, 3);
      const pres = (cardState.presentationEvents || []).slice();
      return { ok: !!res.applied, res, pres };
    } catch (e) {
      return { ok: false, error: e && e.message ? e.message : String(e) };
    }
  });

  console.log('TEMPT+WORK check result:', temptWorkCheck);
  // Validate result
  if (!temptWorkCheck.ok) {
    await browser.close();
    throw new Error('TEMPT+WORK scenario failed: ' + (temptWorkCheck.reason || temptWorkCheck.error || JSON.stringify(temptWorkCheck.res)));
  }

  // Ensure presentation events include WORK_REMOVED
  const workRemovedFound = (temptWorkCheck.pres || []).some(e => e.type === 'WORK_REMOVED' && e.row === 3 && e.col === 3 && (e.cause === 'TEMPT_WILL' || e.cause === undefined));
  if (!workRemovedFound) {
    await browser.close();
    throw new Error('WORK_REMOVED presentation event not found after TEMPT');
  }

  console.log('TEMPT+WORK E2E check passed.');

  await browser.close();

})();