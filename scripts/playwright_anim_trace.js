const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    // Print all console messages from the page to our stdout
    // Include location if available
    const location = msg.location();
    console.log('[PAGE_CONSOLE]', msg.type(), msg.text(), location);
  });

  // Open local file directly as http server kept stopping in this environment
  await page.goto('file:///C:/Users/quarr/Desktop/othello_v2/othello_v2/index.html', { waitUntil: 'networkidle' });

  // Inject enhanced observer (listen for overlays and breeding-spawn class changes)
  await page.evaluate(() => {
    (() => {
      // Installer that sets up child/attribute observers on a board element
      function installObservers(board) {
        if (!board) return;
        // Track overlays that we've seen (to avoid duplicate logs)
        const overlays = new WeakSet();

        // ChildList observer to detect overlay additions/removals
        const childObs = new MutationObserver((mutations) => {
          for (const m of mutations) {
            // Look for added nodes containing .stone-fade-overlay
            for (const n of m.addedNodes) {
              if (!(n instanceof HTMLElement)) continue;
              const overlaysFound = n.matches && n.matches('.stone-fade-overlay') ? [n] : Array.from(n.querySelectorAll ? n.querySelectorAll('.stone-fade-overlay') : []);
              for (const o of overlaysFound) {
                if (overlays.has(o)) continue;
                overlays.add(o);
                const cs = getComputedStyle(o);
                console.log('[ANIM_OBS] OVERLAY_ADDED', { className: o.className, opacity: cs.opacity, transition: cs.transition });
              }
            }

            // Look for removed nodes containing .stone-fade-overlay
            for (const n of m.removedNodes) {
              if (!(n instanceof HTMLElement)) continue;
              const overlaysFound = n.matches && n.matches('.stone-fade-overlay') ? [n] : Array.from(n.querySelectorAll ? n.querySelectorAll('.stone-fade-overlay') : []);
              for (const o of overlaysFound) {
                console.log('[ANIM_OBS] OVERLAY_REMOVED', { className: o.className });
              }
            }
          }
        });

        // Attribute observer to detect breeding-spawn class added/removed on .disc
        const discState = new WeakMap(); // element -> { hasBreeding: bool }
        const attrObs = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (!(m.target instanceof HTMLElement)) continue;
            const el = m.target;
            if (!board.contains(el)) continue;
            if (!el.classList) continue;
            if (!el.classList.contains('disc')) continue;

            const prevState = (discState.get(el) || {});
            const prevBreeding = prevState.hasBreeding || false;
            const nowBreeding = el.classList.contains('breeding-spawn');
            if (nowBreeding && !prevBreeding) {
              const cs = getComputedStyle(el);
              console.log('[ANIM_OBS] BREEDING_CLASS_ADDED', { className: el.className, animationName: cs.animationName });
              discState.set(el, Object.assign(prevState, { hasBreeding: true }));
            } else if (!nowBreeding && prevBreeding) {
              const cs = getComputedStyle(el);
              console.log('[ANIM_OBS] BREEDING_CLASS_REMOVED', { className: el.className, animationName: cs.animationName });
              discState.set(el, Object.assign(prevState, { hasBreeding: false }));
            }

            // Detect flip class additions/removals for diagnostics
            const prevFlip = prevState.hasFlip || false;
            const nowFlip = el.classList.contains('flip');
            if (nowFlip && !prevFlip) {
              console.log('[ANIM_OBS] FLIP_CLASS_ADDED', { className: el.className });
              discState.set(el, Object.assign(prevState, { hasFlip: true }));
            } else if (!nowFlip && prevFlip) {
              console.log('[ANIM_OBS] FLIP_CLASS_REMOVED', { className: el.className });
              discState.set(el, Object.assign(prevState, { hasFlip: false }));
            }
          }
        });

        // Start observers
        childObs.observe(board, { childList: true, subtree: true });
        attrObs.observe(board, { attributes: true, subtree: true, attributeFilter: ['class'] });

        console.log('[ANIM_OBS] enhanced observers installed on .board');
        window.__animObsStop = () => { childObs.disconnect(); attrObs.disconnect(); };
      }

      // If board exists now, install immediately; otherwise wait until it's added
      const boardNow = document.getElementById('board');
      if (boardNow) {
        installObservers(boardNow);
      } else {
        console.log('[ANIM_OBS] #board not found; waiting for it to appear');
        const waiter = new MutationObserver((mutations, obs) => {
          for (const m of mutations) {
            for (const n of m.addedNodes) {
              if (!(n instanceof HTMLElement)) continue;
              if (n.matches && n.matches('#board')) {
                installObservers(n);
                obs.disconnect();
                return;
              }
              const found = n.querySelector && (n.querySelector('#board') || n.querySelector('[id="board"]'));
              if (found) {
                installObservers(found);
                obs.disconnect();
                return;
              }
            }
          }
        });
        waiter.observe(document.body, { childList: true, subtree: true });
      }

    })();
  });

  // Ensure debug mode and fill hands; enable NOANIM
  await page.evaluate(() => {
    window.DEBUG_UNLIMITED_USAGE = true;
    window.DEBUG_HUMAN_VS_HUMAN = true;
    // GLOBAL NOANIM flag used by UI helpers
    window.DISABLE_ANIMATIONS = true;
    if (typeof fillDebugHand === 'function') fillDebugHand();
    if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
  });

  // 1) Swap: place a white stone at (2,2), use swap_01
  await page.evaluate(() => {
    gameState.board[2][2] = WHITE;
    // Ensure no special stones there
    cardState.specialStones = cardState.specialStones || [];
    cardState.specialStones = cardState.specialStones.filter(s => !(s.row === 2 && s.col === 2));
    if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
  });

  // Select swap card and use it
  await page.evaluate(() => {
    cardState.selectedCardId = 'swap_01';
    if (typeof useSelectedCard === 'function') useSelectedCard();
  });
  // Click target to trigger swap
  await page.click('.cell[data-row="2"][data-col="2"]');
  await page.waitForTimeout(1000);

  // 2) Tempt: place a BREEDING special stone at (3,3), ensure tempt_01 in hand
  await page.evaluate(() => {
    gameState.board[3][3] = BLACK;
    cardState.specialStones = cardState.specialStones || [];
    // remove existing at pos
    cardState.specialStones = cardState.specialStones.filter(s => !(s.row === 3 && s.col === 3));
    cardState.specialStones.push({ row: 3, col: 3, type: 'BREEDING', owner: 'white', remainingOwnerTurns: 3 });
    if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
    // Ensure tempt_01 present
    if (!cardState.hands.black.includes('tempt_01')) cardState.hands.black.push('tempt_01');
    cardState.selectedCardId = 'tempt_01';
    if (typeof useSelectedCard === 'function') useSelectedCard();
  });
  // Click target
  await page.click('.cell[data-row="3"][data-col="3"]');
  await page.waitForTimeout(1000);

  // 3) Breeding: trigger immediate spawn using processBreedingImmediateAtPlacement precomputed result
  await page.evaluate(() => {
    // call the placement immediate process with a precomputed result containing a spawned stone at (4,4)
    const precomputed = { spawned: [{ row: 4, col: 4 }], flipped: [], destroyed: [], anchors: [] };
    if (typeof processBreedingImmediateAtPlacement === 'function') {
      processBreedingImmediateAtPlacement(BLACK, 2, 2, precomputed);
    }
  });

  // Wait for animations to happen
  await page.waitForTimeout(1500);

  // Stop observer
  await page.evaluate(() => { if (window.__animTraceStop) window.__animTraceStop(); console.log('[ANIM_TRACE] observer stopped'); });

  await browser.close();
})();
