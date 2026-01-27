const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function mkdirp(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function waitForConsoleMatch(page, matcher, timeoutMs) {
  return new Promise((resolve) => {
    const onConsole = (msg) => {
      try {
        const text = msg.text();
        if (matcher.test(text)) {
          page.off('console', onConsole);
          resolve({ matched: true, text });
        }
      } catch (e) {}
    };
    page.on('console', onConsole);
    setTimeout(() => {
      page.off('console', onConsole);
      resolve({ matched: false });
    }, timeoutMs);
  });
}

async function run({ iterations = 500, timeoutMs = 3000, headless = true, injectMock = false } = {}) {
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  const runDir = path.join(__dirname, '..', 'artifacts', `cpu-fuzzer-${timestamp()}`);
  mkdirp(runDir);
  const indexPath = 'file://' + path.join(__dirname, '..', 'index.html');

  const summary = { iterations, failures: [] };

  for (let i = 1; i <= iterations; i++) {
    const iterId = String(i).padStart(4, '0');
    console.log(`Iteration ${i}/${iterations}`);

    const logs = [];
    page.removeAllListeners('console');
    page.on('console', msg => {
      try { logs.push({ type: msg.type(), text: msg.text() }); } catch (e) {}
    });

    try {
      await page.goto(indexPath, { waitUntil: 'load' });
      // Staged readiness checks to avoid brittle single-wait timeouts
      console.log(`[FUZZ_DEBUG] stage1: wait DOM ready (timeout=${Math.min(timeoutMs,5000)})`);
      await page.waitForFunction(() => document.readyState === 'complete', { timeout: Math.min(timeoutMs, 5000) });

      console.log('[FUZZ_DEBUG] stage2: wait minimal globals (addLog)');
      await page.waitForFunction(() => !!window.addLog, { timeout: Math.min(timeoutMs, 5000) });

      console.log(`[FUZZ_DEBUG] stage3: wait full UI APIs & board render (timeout=${timeoutMs})`);
      // relax: don't require an UI click handler to be present; requiring getLegalMoves + board/gameState is enough
      await page.waitForFunction(() => !!(window.getLegalMoves && (document.querySelector('.board') || (window.gameState && typeof window.gameState.turnNumber === 'number'))), { timeout: timeoutMs });

      // Ensure cardState is initialized so CardLogic.getCardContext(cardState) won't throw during rendering
      if (typeof initCardState === 'function') {
        console.log('[FUZZ_DEBUG] calling initCardState to ensure cardState exists');
        // Ensure SeededPRNG exists so initCardState can create a PRNG
        await page.evaluate(() => {
          try {
            if (typeof SeededPRNG === 'undefined' || !SeededPRNG || typeof SeededPRNG.createPRNG !== 'function') {
              window.SeededPRNG = { createPRNG: (seed) => ({ _seed: seed, random: () => 0, shuffle: (arr) => arr, nextInt: () => 0, getState: () => ({ seed, calls: 0 }), restoreState: () => {} }) };
              console.log('[FUZZ_DEBUG] injected minimal SeededPRNG');
            }
            if (typeof initCardState === 'function') initCardState();
          } catch (e) { console.error('[FUZZ_DEBUG] initCardState threw', e && e.message); }
        });
        // Wait for cardState and gameState to exist (ensure first render completed)
        try {
          await page.waitForFunction(() => !!(window.cardState && window.gameState), { timeout: Math.min(timeoutMs, 5000) });
        } catch (e) {
          console.warn('[FUZZ_DEBUG] cardState/gameState not present after initCardState - attempting bootstrap');
          // Attempt robust bootstrap paths: call known initializers or create via CardLogic.createCardState
          await page.evaluate(() => {
            try {
              if (!window.cardState) {
                if (typeof initCardState === 'function') { initCardState(); }
                else if (typeof CardSystem !== 'undefined' && typeof CardSystem.initCardState === 'function') { CardSystem.initCardState(); }
                else if (typeof CardSys !== 'undefined' && typeof CardSys.initCardState === 'function') { CardSys.initCardState(); }
                else if (typeof CardLogic !== 'undefined' && typeof CardLogic.createCardState === 'function') {
                  try {
                    if (typeof SeededPRNG !== 'undefined' && SeededPRNG.createPRNG) {
                      window.cardState = CardLogic.createCardState(SeededPRNG.createPRNG(0));
                    } else {
                      window.cardState = CardLogic.createCardState({ shuffle: arr => arr, random: () => 0 });
                    }
                    console.log('[FUZZ_DEBUG] bootstrapped cardState via CardLogic.createCardState');
                  } catch (e) {
                    console.error('[FUZZ_DEBUG] createCardState failed', e && e.message);
                  }
                }
              }
            } catch (e) { console.error('[FUZZ_DEBUG] bootstrap cardState attempt failed', e && e.message); }
          });
          try {
            await page.waitForFunction(() => !!(window.cardState && window.gameState), { timeout: Math.min(timeoutMs, 3000) });
          } catch (e2) {
            console.warn('[FUZZ_DEBUG] cardState still missing after bootstrap — injecting minimal cardState');
            await page.evaluate(() => {
              try {
                if (!window.cardState) {
                  window.cardState = {
                    deck: [],
                    discard: [],
                    hands: { black: [], white: [] },
                    turnIndex: 0,
                    lastTurnStartedFor: null,
                    turnCountByPlayer: { black: 0, white: 0 },
                    selectedCardId: null,
                    hasUsedCardThisTurnByPlayer: { black: false, white: false },
                    pendingEffectByPlayer: { black: null, white: null },
                    activeEffectsByPlayer: { black: [], white: [] },
                    markers: [],
                    _nextMarkerId: 1,
                    specialStones: [],
                    bombs: [],
                    presentationEvents: [],
                    _nextStoneId: 5,
                    stoneIdMap: (function () { const m = Array(8).fill(null).map(() => Array(8).fill(null)); m[3][3] = 's1'; m[3][4] = 's2'; m[4][3] = 's3'; m[4][4] = 's4'; return m; })(),
                    hyperactiveSeqCounter: 0,
                    lastUsedCardByPlayer: { black: null, white: null },
                    charge: { black: 0, white: 0 },
                    extraPlaceRemainingByPlayer: { black: 0, white: 0 },
                    workAnchorPosByPlayer: { black: null, white: null },
                    workNextPlacementArmedByPlayer: { black: false, white: false }
                  };
                  console.log('[FUZZ_DEBUG] injected minimal cardState');
                }
              } catch (e3) { console.error('[FUZZ_DEBUG] inject minimal cardState failed', e3 && e3.message); }
            });
          }
        }
      }

      // If AISystem missing, either skip (env issue) or inject a mock if requested
      const aisMissing = logs.some(l => l.text && /AISystem is not loaded/.test(l.text));
      if (aisMissing) {
        // Try to load the real AI module if present on disk, otherwise inject mock when requested
        const aiPath = path.join(__dirname, '..', 'game', 'ai', 'level-system.js');
        if (fs.existsSync(aiPath)) {
          try {
            console.log('[FUZZ_DEBUG] AISystem missing — injecting script from', aiPath);
            await page.addScriptTag({ path: aiPath });
            // Wait briefly for AISystem to appear
            await page.waitForFunction(() => typeof AISystem !== 'undefined', { timeout: Math.min(timeoutMs, 5000) });
          } catch (e) {
            console.warn('[FUZZ_DEBUG] Failed to addScriptTag for AISystem:', e && e.message);
          }
        }

        // If still missing, and allowed, inject a lightweight mock
        const aisNow = await page.evaluate(() => (typeof AISystem !== 'undefined'));
        if (!aisNow && injectMock) {
          console.log('Injecting mock AISystem into page (injectMock=true)');
          await page.evaluate(() => {
            window.AISystem = {
              selectMove(gameState, cardState, candidateMoves) {
                return candidateMoves[Math.floor(Math.random() * candidateMoves.length)];
              },
              selectCardToUse() { return null; }
            };
          });
        }

        // If still missing, skip this iteration as environment issue
        const aisFinal = await page.evaluate(() => (typeof AISystem !== 'undefined'));
        if (!aisFinal) {
          console.warn('AISystem not loaded in page after attempts; skipping iteration as environment issue');
          const sampleDir = path.join(runDir, 'env-issues');
          mkdirp(sampleDir);
          const sname = `env-sample-${String(i).padStart(4,'0')}.json`;
          fs.writeFileSync(path.join(sampleDir, sname), JSON.stringify({ logs }, null, 2), 'utf8');
          continue;
        }
      }

      // Wait for cardState to be initialized by page scripts (do NOT force-create in core)
      try {
        await page.waitForFunction("window.cardState && Array.isArray(window.cardState.specialStones) && Array.isArray(window.cardState.bombs) && window.cardState.hands && typeof window.cardState.charge === 'object'", { timeout: timeoutMs });
        await page.evaluate(() => console.log('[FUZZ_DEBUG] detected page-provided cardState'));
        const csLog = await page.evaluate(() => {
          try { return { present: !!window.cardState, pending: window.cardState ? window.cardState.pendingEffectByPlayer : null, keys: window.cardState ? Object.keys(window.cardState) : null }; } catch (e) { return { error: e && e.message }; }
        });
        console.log('[FUZZ_DEBUG] pre-move cardState:', csLog);
      } catch (e) {
        console.warn('[FUZZ_WARN] window.cardState not present within timeout', e && e.message);
        // As a harness-level fallback (not modifying app code), attempt to create cardState via CardLogic.createCardState()
        try {
          const created = await page.evaluate(() => {
            try {
              if (!window.cardState && typeof window.CardLogic !== 'undefined' && typeof window.CardLogic.createCardState === 'function') {
                window.cardState = window.CardLogic.createCardState({ shuffle: arr => arr, random: () => 0 });
                console.log('[FUZZ_DEBUG] bootstrapped cardState via CardLogic.createCardState');
                return true;
              }
              return false;
            } catch (e) { return false; }
          });
          if (!created) console.warn('[FUZZ_WARN] could not bootstrap cardState via CardLogic');
          else {
            // Augment any missing nested fields so pipeline/UI will not throw on early bootstrapped state
            try {
              await page.evaluate(() => {
                if (window.cardState) {
                  window.cardState.specialStones = window.cardState.specialStones || [];
                  window.cardState.bombs = window.cardState.bombs || [];
                  window.cardState.presentationEvents = window.cardState.presentationEvents || [];
                  window.cardState.markers = window.cardState.markers || [];
                  if (!window.cardState.stoneIdMap) {
                    const m = Array(8).fill(null).map(() => Array(8).fill(null));
                    m[3][3] = 's1'; m[3][4] = 's2'; m[4][3] = 's3'; m[4][4] = 's4';
                    window.cardState.stoneIdMap = m;
                  }
                  window.cardState.extraPlaceRemainingByPlayer = window.cardState.extraPlaceRemainingByPlayer || { black: 0, white: 0 };
                  window.cardState.workAnchorPosByPlayer = window.cardState.workAnchorPosByPlayer || { black: null, white: null };
                  window.cardState.workNextPlacementArmedByPlayer = window.cardState.workNextPlacementArmedByPlayer || { black: false, white: false };
                  console.log('[FUZZ_DEBUG] augmented bootstrapped cardState with missing fields (harness)');
                }
              });
            } catch (eAug) { console.warn('[FUZZ_WARN] augmenting bootstrapped cardState failed', eAug && eAug.message); }
          }
        } catch (e2) {
          console.error('[FUZZ_WARN] bootstrapping cardState attempt failed', e2 && e2.message);
        }

        // If still not present, attempt to call exported resetGame() to initialize state (harness-driven init)
        try {
          const resetCalled = await page.evaluate(() => {
            try {
              if (typeof resetGame === 'function') {
                resetGame();
                console.log('[FUZZ_DEBUG] called resetGame() from harness');
                return true;
              }
              return false;
            } catch (e) { console.error('[FUZZ_DEBUG] resetGame threw', e && e.message); return false; }
          });
          if (resetCalled) {
            try {
              await page.waitForFunction('!!window.cardState', { timeout: Math.floor(timeoutMs / 2) });
              await page.evaluate(() => console.log('[FUZZ_DEBUG] cardState detected after resetGame'));
            } catch (e3) {
              console.warn('[FUZZ_WARN] window.cardState still missing after resetGame', e3 && e3.message);
            }
          }
        } catch (e4) { console.error('[FUZZ_WARN] resetGame attempt failed', e4 && e4.message); }
      }

      // Last-resort harness-only minimal cardState injection (explicit last-resort)
      try {
        await page.evaluate(() => {
          if (!window.cardState) {
            window.cardState = {
              deck: [], discard: [], hands: { black: [], white: [] }, turnIndex: 0,
              lastTurnStartedFor: null, turnCountByPlayer: { black: 0, white: 0 },
              selectedCardId: null, hasUsedCardThisTurnByPlayer: { black: false, white: false },
              pendingEffectByPlayer: { black: null, white: null }, activeEffectsByPlayer: { black: [], white: [] },
              markers: [], _nextMarkerId: 1, specialStones: [], bombs: [], presentationEvents: [], _nextStoneId: 5,
              stoneIdMap: (function () { const m = Array(8).fill(null).map(() => Array(8).fill(null)); m[3][3] = 's1'; m[3][4] = 's2'; m[4][3] = 's3'; m[4][4] = 's4'; return m; })(),
              hyperactiveSeqCounter: 0, lastUsedCardByPlayer: { black: null, white: null }, charge: { black: 0, white: 0 },
              extraPlaceRemainingByPlayer: { black: 0, white: 0 }, workAnchorPosByPlayer: { black: null, white: null }, workNextPlacementArmedByPlayer: { black: false, white: false }
            };
            console.log('[FUZZ_DEBUG] forced minimal cardState (harness last-resort)');
          }
        });
      } catch (e) { console.error('[FUZZ_WARN] forced cardState injection failed', e && e.message); }

      // Find a legal move
      const move = await page.evaluate(() => {
        const gs = window.gameState;
        // Ensure a minimal cardState exists so getCardContext doesn't throw during early-initialization pages
        let cs = window.cardState || null;
        if (!cs) {
          if (typeof window.CardLogic !== 'undefined' && typeof window.CardLogic.createCardState === 'function') {
            try { cs = window.CardLogic.createCardState({ shuffle: arr => arr, random: () => 0 }); } catch (e) { cs = null; }
          }
          if (!cs) {
            cs = { charge: { black: 0, white: 0 }, pendingEffectByPlayer: { black: null, white: null }, hands: { black: [], white: [] }, hasUsedCardThisTurnByPlayer: { black: false, white: false } };
          }
          // If we created a fallback, expose it to the page so subsequent flow (pipeline/UI) sees a consistent state
          try { if (!window.cardState) { window.cardState = cs; console.log('[FUZZ_DEBUG] applied fallback cardState into window.cardState (harness)'); } } catch (e) {}
        }
        try {
          // Prefer direct CoreLogic.getLegalMoves if available (safer), fall back to UI wrapper
          let legal = [];
          try {
            if (typeof CoreLogic !== 'undefined' && typeof CoreLogic.getLegalMoves === 'function') {
              legal = CoreLogic.getLegalMoves(gs, gs.currentPlayer, {});
            } else {
              legal = window.getLegalMoves ? window.getLegalMoves(gs, [], []) : [];
            }
          } catch (e) { legal = []; }
          return legal && legal.length ? legal[0] : null;
        } catch (e) { return null; }
      });

      if (!move) {
        console.warn('No legal move found for iteration', i);
        // Save a sample snapshot for triage
        try {
          const iterDir = path.join(runDir, `no-legal-move-${String(i).padStart(4,'0')}`);
          mkdirp(iterDir);
          const snap = await page.evaluate(() => {
            try {
              const cs = window.cardState || null;
              const hasCardLogic = !!window.CardLogic;
              const hasCreateCardState = !!(window.CardLogic && typeof window.CardLogic.createCardState === 'function');
              let legalCount = null;
              let legalSafe = null;
              try {
                const cs2 = window.cardState || (hasCreateCardState ? window.CardLogic.createCardState({ shuffle: arr => arr, random: () => 0 }) : null);
                let ctx2 = {};
                try { if (window.cardState) { ctx2 = (window.CardLogic && typeof window.CardLogic.getCardContext === 'function') ? window.CardLogic.getCardContext(cs2) : {}; } else { ctx2 = {}; } } catch (e) { ctx2 = {}; }
                let legal = null;
                try {
                  if (typeof CoreLogic !== 'undefined' && typeof CoreLogic.getLegalMoves === 'function') {
                    legal = CoreLogic.getLegalMoves(window.gameState, window.gameState.currentPlayer, {});
                  } else {
                    legal = window.getLegalMoves ? window.getLegalMoves(window.gameState, [], []) : null;
                  }
                } catch (e) { legal = null; }
                legalCount = Array.isArray(legal) ? legal.length : 'err';
                try { legalSafe = legal; } catch (e) { legalSafe = 'err:' + String(e); }
              } catch (e) { legalCount = 'err:' + String(e); }
              return { gameState: window.gameState, cardState: cs, globals: { hasGetLegalMoves: !!window.getLegalMoves, getLegalMovesType: typeof window.getLegalMoves, getLegalMovesSrc: (window.getLegalMoves ? String(window.getLegalMoves).slice(0,200) : null), BLACK: typeof window.BLACK !== 'undefined' ? window.BLACK : null, hasCardLogic, hasCreateCardState, legalCount, legalSafe } };
            } catch (e) { return { error: String(e) }; }
          });
          fs.writeFileSync(path.join(iterDir, 'snapshot.json'), JSON.stringify({ snap, logs }, null, 2), 'utf8');
          await page.screenshot({ path: path.join(iterDir, 'page.png'), fullPage: true });
          fs.writeFileSync(path.join(iterDir, 'logs.txt'), logs.map(l => `[${l.type}] ${l.text}`).join('\n'), 'utf8');
        } catch (e) { console.error('Error saving no-legal-move sample', e && e.message); }
        continue;
      }

      // Intercept scheduling log to know when CPU is scheduled
      const scheduling = waitForConsoleMatch(page, /scheduling CPU|setTimeout firing/i, 2000);

      // Fire the player's move
      await page.evaluate(([r, c]) => {
        try {
          if (typeof handleCellClick === 'function') handleCellClick(r, c);
          else if (typeof executeMove === 'function') executeMove({ player: (window.gameState.currentPlayer || window.BLACK), row: r, col: c });
        } catch (e) { console.error('simulate click error', e && e.message); }
      }, [move.row, move.col]);

      const schedResult = await scheduling;
      // Wait for a CPU-start log within timeoutMs (accept multiple possible markers)
      const startResult = await waitForConsoleMatch(page, /\[AI\] Starting CPU turn|\[DEBUG\]\[processCpuTurn\] enter|\[CPU\]/i, timeoutMs);

      if (!startResult.matched) {
        console.error(`-- FAILURE: CPU did not start within ${timeoutMs}ms (iter ${i})`);
        const snap = await page.evaluate(() => {
          try {
            return {
              gameState: window.gameState,
              cardState: window.cardState,
              isProcessing: typeof window.isProcessing !== 'undefined' ? window.isProcessing : (window.isProcessingGlobal || null),
              isCardAnimating: typeof window.isCardAnimating !== 'undefined' ? window.isCardAnimating : (window.isCardAnimatingGlobal || null),
              pendingEffectByPlayer: window.cardState ? window.cardState.pendingEffectByPlayer : null,
              currentPlayer: window.gameState ? window.gameState.currentPlayer : null
            };
          } catch (e) { return { error: String(e) }; }
        });

        const iterDir = path.join(runDir, `iteration-${iterId}`);
        mkdirp(iterDir);
        fs.writeFileSync(path.join(iterDir, 'snapshot.json'), JSON.stringify({ snap, logs }, null, 2), 'utf8');
        await page.screenshot({ path: path.join(iterDir, 'page.png'), fullPage: true });
        fs.writeFileSync(path.join(iterDir, 'logs.txt'), logs.map(l => `[${l.type}] ${l.text}`).join('\n'), 'utf8');

        summary.failures.push({ iteration: i, snapshotPath: path.join(iterDir, 'snapshot.json'), screenshot: path.join(iterDir, 'page.png') });

        // Optionally break early on first failure - for now continue to gather more
      }

      // small delay between iterations
      await page.waitForTimeout(40);
    } catch (e) {
      console.error('Error during iteration', i, e && e.message);
      // Save rich diagnostics for triage (snapshot, screenshot, logs)
      try {
        const iterDir = path.join(runDir, `iteration-${iterId}`);
        mkdirp(iterDir);
        const snap = await page.evaluate(() => {
          try {
            return {
              gameState: window.gameState,
              cardState: window.cardState,
              isProcessing: typeof window.isProcessing !== 'undefined' ? window.isProcessing : (window.isProcessingGlobal || null),
              isCardAnimating: typeof window.isCardAnimating !== 'undefined' ? window.isCardAnimating : (window.isCardAnimatingGlobal || null),
              pendingEffectByPlayer: window.cardState ? window.cardState.pendingEffectByPlayer : null,
              currentPlayer: window.gameState ? window.gameState.currentPlayer : null,
              globals: {
                hasCardLogic: !!window.CardLogic,
                hasAddLog: !!window.addLog,
                hasGetLegalMoves: !!window.getLegalMoves,
                hasHandleCellClick: !!window.handleCellClick
              }
            };
          } catch (e2) { return { error: String(e2) }; }
        });
        fs.writeFileSync(path.join(iterDir, 'snapshot.json'), JSON.stringify({ snap, logs }, null, 2), 'utf8');
        await page.screenshot({ path: path.join(iterDir, 'page.png'), fullPage: true });
        fs.writeFileSync(path.join(iterDir, 'logs.txt'), logs.map(l => `[${l.type}] ${l.text}`).join('\n'), 'utf8');
      } catch (captureErr) {
        fs.writeFileSync(path.join(runDir, `error-iter-${iterId}.txt`), String(e && e.stack || e) + '\n--- captureErr ---\n' + String(captureErr && captureErr.stack || captureErr), 'utf8');
      }
    }
  }

  await browser.close();

  const summaryPath = path.join(runDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log('Fuzzer finished. Summary:', summary);
  console.log('Artifacts:', runDir);
  return summary;
}

if (require.main === module) {
  const argv = require('minimist')(process.argv.slice(2));
  const iterations = argv.iterations ? Number(argv.iterations) : 500;
  const timeoutMs = argv.timeoutMs ? Number(argv.timeoutMs) : 3000;
  const headless = (typeof argv.headless === 'undefined') ? true : argv.headless === 'true' || argv.headless === true;
  const injectMock = !!argv.injectMock;
  const failOnFailure = !!argv.failOnFailure;
  run({ iterations, timeoutMs, headless, injectMock }).then(summary => {
    if (failOnFailure && summary && summary.failures && summary.failures.length) {
      console.error('Fuzzer detected failures and --failOnFailure was set. Exiting with code 1.');
      process.exit(1);
    }
  }).catch(err => {
    console.error('Fuzzer error', err);
    process.exit(2);
  });
}
