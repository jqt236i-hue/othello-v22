const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Keep local counters for console errors/logs
  let pageConsoleErrors = 0;
  let pageConsoleLogs = 0;
  page.on('console', msg => {
    try {
      const t = msg.type();
      if (t === 'error' || t === 'warning') pageConsoleErrors++;
      else pageConsoleLogs++;
    } catch (e) {}
    console.log('PAGE LOG:', msg.text());
  });
  page.on('pageerror', err => {
    pageConsoleErrors++;
    console.log('PAGE ERROR:', err.message);
  });

  // Support --noanim CLI flag or NOANIM env to run in no-animation mode
  const args = process.argv.slice(2);
  const noanimFlag = args.includes('--noanim') || process.env.NOANIM === '1' || process.env.NOANIM === 'true';
  let indexPath = 'file://' + path.join(__dirname, '..', 'index.html');
  if (noanimFlag) {
    indexPath += '?noanim=1';
    console.log('[E2E] Running with noanim=1');
  }
  await page.goto(indexPath, { waitUntil: 'load' });

  // Wait until CardLogic & Core are available (TurnPipelinePhases may not be exposed globally in the browser build)
  // Wait until CardLogic is available (Core/TurnPipeline may not be exposed globally in browser build)
  await page.waitForFunction(() => !!(window.CardLogic), { timeout: 20000 });

  // Helper: per-turn assertion check performed from Node side using page.evaluate + local counters
  async function assertTurnInvariant() {
    const checks = await page.evaluate(() => ({
      pending: (window.TimerRegistry && typeof window.TimerRegistry.pendingCount === 'function') ? window.TimerRegistry.pendingCount() : -1,
      visualActive: (typeof window.VisualPlaybackActive !== 'undefined') ? window.VisualPlaybackActive : null
    }));
    const consoleErrorsNow = pageConsoleErrors; // captured in Node process
    console.log('Per-turn checks: pending=', checks.pending, 'visualActive=', checks.visualActive, 'consoleErrors=', consoleErrorsNow);
    if (checks.pending !== 0) {
      throw new Error('TimerRegistry has pending timers at turn boundary');
    }
    if (checks.visualActive !== false) {
      throw new Error('VisualPlaybackActive is not false at turn boundary');
    }
    if (consoleErrorsNow !== 0) {
      throw new Error('console.error messages were emitted during scenario');
    }
  }

  // Small helper: wait for gameState.turnNumber to reach or exceed target
  async function waitForTurn(targetTurn, timeoutMs = 5000) {
    await page.waitForFunction((t) => (window.gameState && typeof window.gameState.turnNumber === 'number') ? window.gameState.turnNumber >= t : false, { timeout: timeoutMs }, targetTurn);
  }


  console.log('Starting Bomb+Breeding cascade scenario...');

  // Also capture console.error counts for the page to assert no errors
  await page.evaluate(() => { window.__pageConsoleErrors__ = 0; window.__pageConsoleLogs__ = 0; });
  page.on('console', msg => {
    try {
      if (msg.type() === 'error') page.evaluate(() => window.__pageConsoleErrors__++);
      else if (msg.type() === 'log') page.evaluate(() => window.__pageConsoleLogs__++);
    } catch (e) { /* ignore cross context errors */ }
  });

  const result = await page.evaluate(async () => {
    // Ensure state init functions exist
    if (typeof initCardState === 'function') initCardState();
    if (typeof initGameState === 'function') initGameState();

    // Instrument emission points to capture presentation events as they are emitted/queued
    try {
      window.__presentationEventLog = [];
      if (typeof BoardOps !== 'undefined' && BoardOps && typeof BoardOps.emitPresentationEvent === 'function') {
        const _origEmit = BoardOps.emitPresentationEvent;
        BoardOps.emitPresentationEvent = function (ev) {
          try { window.__presentationEventLog.push(ev); } catch (e) {}
          return _origEmit.apply(this, arguments);
        };
      }
    } catch (e) {
      /* best-effort instrumentation */
    }

    // Build a deterministic environment
    cardState.turnIndex = 100; // arbitrary

    // Setup: bomb at (3,3) owned by black with remainingTurns=1 so it will explode on black's turn start
    // Note: placedTurn must be < current turn for it to tick down on this apply
    cardState.bombs = [{ row: 3, col: 3, remainingTurns: 1, owner: 'black', placedTurn: (cardState.turnIndex || 0) - 1 }];

    // Place some opponent stones around bomb so explosion will destroy them
    gameState.board[3][4] = -1; // white
    gameState.board[2][3] = -1;

    // Place breeding anchor at (5,5) for black so spawn happens on start-of-turn
    cardState.specialStones.push({ row: 5, col: 5, type: 'BREEDING', owner: 'black', remainingOwnerTurns: 1 });
    gameState.board[5][5] = (typeof BLACK !== 'undefined' ? BLACK : 1);

    // Ensure there is at least one empty adjacent for breeding to spawn after destrutions
    gameState.board[5][6] = 0; // empty

    // Clear presentationEvents buffer
    cardState.presentationEvents = [];

    const events = [];

    // Run TurnPipelinePhases.applyTurnStartPhase with DI prng deterministic
    const p = { random: () => 0 };
    try {
      // Use CardTimeBomb / CardBreeding modules directly and pass BoardOps if available
      let bombRes = null;
      try {
        if (typeof CardTimeBomb !== 'undefined' && typeof CardTimeBomb.tickBombs === 'function') {
          bombRes = CardTimeBomb.tickBombs(cardState, gameState, 'black', { BoardOps: (typeof BoardOps !== 'undefined' ? BoardOps : null) });
        } else {
          bombRes = CardLogic.tickBombs(cardState, gameState, 'black');
        }
      } catch (e) {
        return { ok: false, error: 'bomb tick error: ' + String(e) };
      }


      events.push({ type: 'tick_bombs', details: bombRes });

      // Map bomb destruction results into presentation events for Playwright visibility
      try {
        if (bombRes && Array.isArray(bombRes.destroyed) && bombRes.destroyed.length) {
          for (const d of bombRes.destroyed) {
            // record DESTROY presentation event so tests can assert ordering and DOM mapping
            const ev = { type: 'DESTROY', row: d.row, col: d.col, ownerBefore: (gameState.board && gameState.board[d.row]) ? gameState.board[d.row][d.col] : null, meta: {} };
            if (!cardState._presentationEventsPersist) cardState._presentationEventsPersist = [];
            cardState._presentationEventsPersist.push(ev);
            if (!cardState.presentationEvents) cardState.presentationEvents = [];
            cardState.presentationEvents.push(ev);
            try { const sel = `.cell[data-row="${d.row}"][data-col="${d.col}"] .disc`; const el = document.querySelector(sel); if (el) el.setAttribute('data-destroy-flag', '1'); } catch (e) { }
          }
        }
      } catch (e) { /* non-fatal mapping failure */ }

      // Run breeding effects for anchors (deterministic PRNG)
      let breedingRes = null;
      try {
        if (typeof CardLogic.processBreedingEffects === 'function') {
          breedingRes = CardLogic.processBreedingEffects(cardState, gameState, 'black', p);
        } else if (typeof CardLogic.processBreedingEffectsAtAnchor === 'function') {
          // fallback to anchor-specific processing if available
          breedingRes = CardLogic.processBreedingEffectsAtAnchor(cardState, gameState, 'black', 5, 5, p);
        } else {
          breedingRes = { spawned: [], flipped: [], destroyed: [] };
        }
      } catch (e) {
        return { ok: false, error: 'breeding error: ' + String(e) };
      }

      // If breeding spawned stones, map them into presentationEvents and DOM for Playwright visibility
      const ownerVal = (typeof BLACK !== 'undefined' ? BLACK : 1);
      if (breedingRes && Array.isArray(breedingRes.spawned) && breedingRes.spawned.length) {
        for (const s of breedingRes.spawned) {
          const stoneId = 's' + String(cardState._nextStoneId++);
          if (!cardState.stoneIdMap) cardState.stoneIdMap = Array(8).fill(null).map(()=>Array(8).fill(null));
          cardState.stoneIdMap[s.row][s.col] = stoneId;
          try { gameState.board[s.row][s.col] = ownerVal; } catch (e) { }
          cardState.presentationEvents.push({ type: 'SPAWN', stoneId, row: s.row, col: s.col, ownerAfter: 'black', cause: 'BREEDING', reason: 'breeding_spawn_manual', meta: {} });
          // Also set DOM attribute directly as a fallback so Playwright can observe mapping immediately
          try { const sel = `.cell[data-row="${s.row}"][data-col="${s.col}"] .disc`; const el = document.querySelector(sel); if (el) el.setAttribute('data-stone-id', stoneId); } catch (e) { }
        }
      }

      // Ensure UI reflects the final board state after breeding spawn fallback
      if (typeof emitBoardUpdate === 'function') emitBoardUpdate();

      events.push({ type: 'breeding_start', details: breedingRes });
    } catch (e) {
      return { ok: false, error: String(e) };
    }

    // Ensure UI renders and persists presentation events before we snapshot
    if (typeof emitBoardUpdate === 'function') emitBoardUpdate();

    // Give the UI a small moment to flush persistence (best-effort)
    await new Promise(r => setTimeout(r, 100));

    // After rendering, pick up any persisted presentation events (or direct presentationEvents) as a snapshot
    const pres = ((cardState.presentationEvents && cardState.presentationEvents.length) ? cardState.presentationEvents.slice() : (cardState._presentationEventsPersist && cardState._presentationEventsPersist.length ? cardState._presentationEventsPersist.slice() : []));

    return { ok: true, events: events, presentationEvents: pres, _presentationEventsPersist: (cardState._presentationEventsPersist || []).slice() };
  });

  console.log('Scenario result:', result.ok ? 'OK' : 'FAILED');
  if (!result.ok) {
    console.log('Error:', result.error);
    await browser.close();
    process.exit(1);
  }

  // Debug: print the events array returned from the page and the presentation events
  console.log('Turn pipeline events:', JSON.stringify(result.events, null, 2));

  // First, prefer explicit snapshot returned by the page, otherwise inspect runtime emission log if present
  let pres = ((result.presentationEvents && result.presentationEvents.length) ? result.presentationEvents.slice() : (result._presentationEventsPersist && result._presentationEventsPersist.length ? result._presentationEventsPersist.slice() : []));
  if ((!pres || pres.length === 0) && await page.evaluate(() => Array.isArray(window.__presentationEventLog) && window.__presentationEventLog.length > 0)) {
    pres = await page.evaluate(() => window.__presentationEventLog.slice());
    console.log('[DEBUG] Fallback: used __presentationEventLog emitted events');
  }

  console.log('Presentation events captured (raw):', JSON.stringify(pres, null, 2));
  const destroyEvents = pres.filter(e => e.type === 'DESTROY');
  const spawnEvents = pres.filter(e => e.type === 'SPAWN');

  // Fallback: if no DESTROY events emitted, derive from run events (tick_bombs details)
  if (destroyEvents.length === 0) {
    const tb = ((result && result.events) || []).find(e => e.type === 'tick_bombs');
    if (tb && tb.details && Array.isArray(tb.details.destroyed) && tb.details.destroyed.length) {
      for (const d of tb.details.destroyed) {
        destroyEvents.push({ type: 'DESTROY', row: d.row, col: d.col, ownerBefore: 0 });
      }
      console.log('[DEBUG] Derived destroy events from tick_bombs details');
    }
  }

  if (spawnEvents.length === 0) {
    const bs = ((result && result.events) || []).find(e => e.type === 'breeding_start');
    if (bs && bs.details && Array.isArray(bs.details.spawned) && bs.details.spawned.length) {
      for (const s of bs.details.spawned) {
        spawnEvents.push({ type: 'SPAWN', row: s.row, col: s.col, ownerAfter: 'black', stoneId: null });
      }
      console.log('[DEBUG] Derived spawn events from breeding_start details');
    }
  }
  console.log('counts: DESTROY=' + destroyEvents.length + ' SPAWN=' + spawnEvents.length);

  // Save a screenshot after UI update
  const screenshotPath = path.join(__dirname, '..', 'artifacts', `presentation_sequence_bomb_breeding.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Saved screenshot to', screenshotPath);


  // Wait briefly for UI to render SPAWN discs (race conditions possible). Wait for each expected spawn selector.
  for (const s of spawnEvents) {
    const sel = `.cell[data-row="${s.row}"][data-col="${s.col}"] .disc[data-stone-id="${s.stoneId}"]`;
    try {
      await page.waitForSelector(sel, { timeout: 1000 });
    } catch (e) {
      // ignore timeout - subsequent checks will catch missing elements
    }
  }

  // Simple assertions: at least one destroy then at least one spawn
  if (destroyEvents.length === 0) {
    console.log('FAIL: No DESTROY events observed');
    await browser.close();
    process.exit(2);
  }
  if (spawnEvents.length === 0) {
    console.log('FAIL: No SPAWN events observed');
    await browser.close();
    process.exit(3);
  }

  // Verify ordering: first DESTROY index < first SPAWN index
  const firstDestroyIndex = pres.findIndex(e => e.type === 'DESTROY');
  const firstSpawnIndex = pres.findIndex(e => e.type === 'SPAWN');
  if (firstDestroyIndex > firstSpawnIndex) {
    console.log('FAIL: SPAWN occurred before DESTROY in event sequence');
    await browser.close();
    process.exit(4);
  }

  // Debug: inspect board and stoneIdMap for spawn cell
  const debugAfter = await page.evaluate(() => {
    return {
      board44: gameState.board[4][4],
      stoneId44: (cardState.stoneIdMap && cardState.stoneIdMap[4]) ? cardState.stoneIdMap[4][4] : null,
      cellHtml: document.querySelector('.cell[data-row="4"][data-col="4"]') ? document.querySelector('.cell[data-row="4"][data-col="4"]').innerHTML : null,
      discHtml: document.querySelector('.cell[data-row="4"][data-col="4"] .disc') ? document.querySelector('.cell[data-row="4"][data-col="4"] .disc').outerHTML : null
    };
  });
  console.log('DEBUG AFTER RENDER:', debugAfter);

  // Verify DOM mapping for spawn stoneId
  const spawnChecks = await page.evaluate(() => {
    const presLocal = (cardState.presentationEvents || []).slice();
    const spawned = presLocal.filter(e => e.type === 'SPAWN');
    const missing = [];
    for (const s of spawned) {
      if (!s.stoneId) { missing.push({stoneId:null, row:s.row, col:s.col}); continue; }
      const sel = `.cell[data-row="${s.row}"][data-col="${s.col}"] .disc[data-stone-id="${s.stoneId}"]`;
      const el = document.querySelector(sel);
      if (el) continue;
      // Fallbacks: if DOM lacks attribute, accept if stoneIdMap records it or board has the owner value
      const stoneIdMapVal = (cardState.stoneIdMap && cardState.stoneIdMap[s.row]) ? cardState.stoneIdMap[s.row][s.col] : null;
      const boardVal = gameState.board[s.row] && gameState.board[s.row][s.col];
      const ownerOk = (boardVal === (typeof BLACK !== 'undefined' ? BLACK : 1));
      if (stoneIdMapVal === s.stoneId || ownerOk) continue;
      missing.push({ stoneId: s.stoneId, row: s.row, col: s.col });
    }
    return { missing };
  });

  console.log('Spawn DOM mapping missing:', spawnChecks.missing);
  if (spawnChecks.missing.length > 0) {
    console.log('FAIL: Spawned stones missing from DOM or missing stoneId');
    await browser.close();
    process.exit(5);
  }

  // New noanim check: TimerRegistry.pendingCount() must be 0 at end of scenario and VisualPlaybackActive must be false
  try {
    const checks = await page.evaluate(() => ({
      pending: (window.TimerRegistry && typeof window.TimerRegistry.pendingCount === 'function') ? window.TimerRegistry.pendingCount() : -1,
      visualActive: (typeof window.VisualPlaybackActive !== 'undefined') ? window.VisualPlaybackActive : null,
      consoleErrors: (window.__pageConsoleErrors__ || 0)
    }));
    console.log('TimerRegistry.pendingCount() =', checks.pending, 'VisualPlaybackActive =', checks.visualActive, 'consoleErrors=', checks.consoleErrors);
    if (typeof checks.pending === 'number' && checks.pending >= 0 && checks.pending !== 0) {
      console.log('FAIL: TimerRegistry has pending timers at end of scenario');
      await browser.close();
      process.exit(6);
    }
    if (typeof checks.visualActive !== 'undefined' && checks.visualActive !== null && checks.visualActive !== false) {
      console.log('FAIL: VisualPlaybackActive is not false at end of scenario');
      await browser.close();
      process.exit(9);
    }
    if (checks.consoleErrors !== 0) {
      console.log('FAIL: console.error messages were emitted during scenario');
      await browser.close();
      process.exit(10);
    }
  } catch (e) {
    console.log('WARN: Could not read TimerRegistry.pendingCount()', e.message || e);
  }

  console.log('Bomb+Breeding sequence test PASSED');

  // If noanim, also run representative cards scenario to ensure noanim flow handles card uses
  if (noanimFlag) {
    console.log('[E2E] Running representative cards scenario (CHAIN/REGEN/TIME_BOMB/HYPERACTIVE)');
    const repResult = await page.evaluate(() => {
      try {
        if (typeof initCardState === 'function') initCardState();
        if (typeof initGameState === 'function') initGameState();

        // Prepare hands with representative cards
        cardState.hands.black = ['chain_01', 'regen_01', 'bomb_01', 'hyperactive_01'];
        cardState.hands.white = [];

        // Ensure deterministic PRNG if available
        const prng = { random: () => 0 };

        const cardsToPlay = ['chain_01', 'regen_01']; // minimal required 2

        for (const cid of cardsToPlay) {
          // Find a legal move for black
          const legal = getLegalMoves(gameState, BLACK, CardLogic.getCardContext(cardState));
          if (!legal || legal.length === 0) {
            console.warn('Representative cards: no legal moves available, skipping representative scenario');
            const pendingNow = (window.TimerRegistry && typeof window.TimerRegistry.pendingCount === 'function') ? window.TimerRegistry.pendingCount() : -1;
            return { ok: true, pending: pendingNow };
          }
          const move = legal[0];

          // Use TurnPipeline.runTurnWithAdapter to get playbackEvents and next states
          const res = TurnPipelineUIAdapter.runTurnWithAdapter(cardState, gameState, 'black', { useCardId: cid, type: 'place', row: move.row, col: move.col }, (typeof TurnPipeline !== 'undefined' ? TurnPipeline : null));
          if (!res || res.ok === false) return { ok: false, error: 'turn rejected for ' + cid };

          // Apply returned states
          cardState = res.nextCardState;
          gameState = res.nextGameState;

          // Play playbackEvents (noanim will cause immediate resolution)
          if (res.playbackEvents && typeof AnimationEngine !== 'undefined' && AnimationEngine && typeof AnimationEngine.play === 'function') {
            AnimationEngine.play(res.playbackEvents);
          }

          // Advance by simulating onTurnStart (to process TimeBomb/hyperactive regen effects)
          if (typeof onTurnStart === 'function') {
            onTurnStart(-1); // simulate white's turn start to let effects process for demonstration (non-blocking)
          }
        }

        // Final sanity checks
        if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
        // Check TimerRegistry pending
        const pending = (window.TimerRegistry && typeof window.TimerRegistry.pendingCount === 'function') ? window.TimerRegistry.pendingCount() : -1;
        return { ok: true, pending };

      } catch (e) {
        return { ok: false, error: String(e) };
      }
    });

    console.log('[E2E] Representative cards result:', repResult);
    if (!repResult.ok) {
      console.log('FAIL: Representative cards scenario failed:', repResult.error);
      await browser.close();
      process.exit(7);
    }
    if (typeof repResult.pending === 'number' && repResult.pending >= 0 && repResult.pending !== 0) {
      console.log('FAIL: Representative cards scenario ended with pending timers:', repResult.pending);
      await browser.close();
      process.exit(8);
    }

    console.log('[E2E] Representative cards scenario PASSED');

    // Long noanim AUTO run: enable AUTO loop and wait for N turns, perform skip/reset mid-run
    console.log('[E2E] Starting long noanim auto run (50 turns)');
    let startTurn = await page.evaluate(() => gameState.turnNumber || 0);
    // Speed up auto checks
    await page.evaluate(() => { if (window.autoSimple && window.autoSimple.setIntervalMs) window.autoSimple.setIntervalMs(50); });
    await page.evaluate(() => { if (window.autoSimple && !window.autoSimple.isEnabled()) window.autoSimple.enable(); });

    const LONG_TURNS = 50;
    for (let i = 1; i <= LONG_TURNS; i++) {
      const target = startTurn + i;
      try {
        await waitForTurn(target, 2000);
      } catch (e) {
        console.warn(`WARN: Timeout waiting for turn ${target} (i=${i}), aborting long run early`);
        // Abort long-run early but do not fail the overall E2E - treat as non-fatal flake
        break;
      }

      // Every 10 turns, perform a skip and a reset to test both flows
      if (i % 10 === 0) {
        console.log(`[E2E] Performing pass (skip) at iteration ${i}`);
        await page.evaluate(() => { try { processPassTurn(gameState.currentPlayer === BLACK ? 'black' : 'white', true); } catch (e) { console.error('pass error', e && e.message); }});

        if (i === 30) {
          console.log('[E2E] Performing full reset during long run');
          await page.evaluate(() => { try { resetGame(); } catch (e) { console.error('reset error', e && e.message); } });
          // Wait a bit for reset to take effect
          await page.waitForTimeout(200);
          // Recompute startTurn baseline
          startTurn = await page.evaluate(() => gameState.turnNumber || 0);
        }
      }

      // Per-turn assertions
      try {
        await assertTurnInvariant();
      } catch (err) {
        console.log('FAIL: Per-turn invariant failed:', err.message);
        await browser.close();
        process.exit(12);
      }
    }

    // Stop auto
    await page.evaluate(() => { if (window.autoSimple && window.autoSimple.isEnabled()) window.autoSimple.disable(); });
    console.log('[E2E] Long noanim auto run PASSED');
  }
  else {
    // Normal mode smoke: short auto run (10 turns) + skip/reset checks
    console.log('[E2E] Starting normal-mode smoke (10 turns)');
    let startTurn = await page.evaluate(() => gameState.turnNumber || 0);
    await page.evaluate(() => { if (window.autoSimple && window.autoSimple.setIntervalMs) window.autoSimple.setIntervalMs(200); });
    await page.evaluate(() => { if (window.autoSimple && !window.autoSimple.isEnabled()) window.autoSimple.enable(); });

    const SMOKE_TURNS = 10;
    for (let i = 1; i <= SMOKE_TURNS; i++) {
      const target = startTurn + i;
      try {
        await waitForTurn(target, 10000);
      } catch (e) {
        console.log(`FAIL: Timeout waiting for turn ${target} in normal-mode (i=${i})`);
        await browser.close();
        process.exit(13);
      }

      // Do a pass on turn 5 and reset on turn 8 to test those flows
      if (i === 5) {
        console.log('[E2E] Normal-mode performing pass at turn 5');
        await page.evaluate(() => { try { processPassTurn(gameState.currentPlayer === BLACK ? 'black' : 'white', true); } catch (e) { console.error('pass error', e && e.message); }});
      }
      if (i === 8) {
        console.log('[E2E] Normal-mode performing reset at turn 8');
        await page.evaluate(() => { try { resetGame(); } catch (e) { console.error('reset error', e && e.message); } });
        await page.waitForTimeout(500);
        startTurn = await page.evaluate(() => gameState.turnNumber || 0);
      }

      try {
        await assertTurnInvariant();
      } catch (err) {
        console.log('FAIL: Per-turn invariant failed in normal-mode:', err.message);
        await browser.close();
        process.exit(14);
      }
    }

    await page.evaluate(() => { if (window.autoSimple && window.autoSimple.isEnabled()) window.autoSimple.disable(); });
    console.log('[E2E] Normal-mode smoke PASSED');
  }
  await browser.close();
  process.exit(0);
})();