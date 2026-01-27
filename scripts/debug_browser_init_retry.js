const { chromium } = require('playwright');

(async () => {
  // Enhanced debug script: retry navigation to temporary server until page initializes
  let browser;
  try {
    browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    console.warn('[debug_browser_init_retry] chromium.launch failed, attempting channel fallback:', msg);
    try {
      browser = await chromium.launch({ channel: 'msedge', args: ['--allow-file-access-from-files'] });
    } catch (e2) {
      const msg2 = e2 && e2.message ? e2.message : String(e2);
      console.warn('[debug_browser_init_retry] msedge channel failed, attempting chrome channel:', msg2);
      browser = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] });
    }
  }

  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const location = msg.location ? msg.location() : undefined;
    if (type === 'error') consoleErrors.push({ text, location });
    console.log(`[console:${type}] ${text}${location ? ` (${location.url}:${location.lineNumber}:${location.columnNumber})` : ''}`);
  });
  page.on('pageerror', err => {
    console.log('[pageerror] ', err && err.stack ? err.stack : String(err));
    if (!consoleErrors.length) consoleErrors.push({ text: String(err), location: null, stack: err && err.stack });
  });

  try {
    console.log('Attempting to navigate to http://localhost:8000...');
    let serverStarted = null;
    let targetUrl = 'http://localhost:8000';
    let navigated = false;

    // Try to navigate to localhost:8000 first with a short timeout
    try {
      await page.goto(targetUrl, { waitUntil: 'load', timeout: 8000 });
      navigated = true;
    } catch (e) {
      console.warn('http://localhost:8000 not available, will start temporary server and retry');
      // Start temporary server
      const http = require('http');
      const fs = require('fs');
      const path = require('path');
      const rootDir = path.resolve(__dirname, '..');
      function contentTypeFor(ext) {
        return {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.json': 'application/json'
        }[ext] || 'application/octet-stream';
      }
      const srv = http.createServer((req, res) => {
        let reqPath = decodeURIComponent(req.url.split('?')[0]);
        if (reqPath === '/') reqPath = '/index.html';
        const full = path.join(rootDir, reqPath.replace(/^\/+/, ''));
        if (!full.startsWith(rootDir)) { res.statusCode = 403; res.end('Forbidden'); return; }
        fs.readFile(full, (err, data) => {
          if (err) { res.statusCode = 404; res.end('Not Found'); return; }
          res.setHeader('content-type', contentTypeFor(path.extname(full)));
          res.end(data);
        });
      });
      await new Promise((resolve, reject) => { srv.listen(0, '127.0.0.1', () => { resolve(); }); });
      const port = srv.address().port;
      serverStarted = srv;
      targetUrl = `http://127.0.0.1:${port}`;
      console.log(`Temporary server started on ${targetUrl}`);

      // Retry navigation until a valid page is loaded or timeout
      const maxAttempts = 12;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`Navigation attempt ${attempt} to ${targetUrl}`);
          await page.goto(targetUrl, { waitUntil: 'load', timeout: 8000 });
          // detect chrome-error pages or blank error documents
          const curUrl = page.url();
          const content = await page.content();
          if (/chrome-error:\/\/chromewebdata/.test(curUrl) || /chromewebdata/.test(content) || /ERR_/.test(content) || /This page isn\'t working/.test(content)) {
            console.warn('Navigation landed on error page; retrying...');
            await page.waitForTimeout(500);
            continue;
          }
          navigated = true;
          console.log('Navigation to temporary server succeeded');
          break;
        } catch (navErr) {
          console.warn('Navigation attempt failed:', navErr && navErr.message ? navErr.message : navErr);
          await page.waitForTimeout(500);
          continue;
        }
      }
    }

    if (!navigated) console.warn('Unable to navigate to project page after retries; proceeding to collect available logs');

    // Allow console messages to arrive
    await page.waitForTimeout(800);

    // After navigation, try waiting for initialization conditions: hasBoardEl && cellCount>0 && hasGameState && resetGame function
    const initTimeoutMs = 15000;
    const start = Date.now();
    let initState = null;
    while (Date.now() - start < initTimeoutMs) {
      initState = await page.evaluate(() => ({
        hasBoardEl: !!(document.getElementById('board') || document.querySelector('.board')),
        cellCount: document.querySelectorAll('#board .cell, .board .cell, .cell').length,
        hasGameState: !!window.gameState,
        hasCardState: !!window.cardState,
        hasHandleCellClickFunc: typeof window.handleCellClick === 'function',
        hasResetGameFunc: typeof window.resetGame === 'function',
        currentPlayer: window.gameState && window.gameState.currentPlayer !== undefined ? window.gameState.currentPlayer : null,
      }));
      if (initState.hasBoardEl && initState.cellCount > 0 && initState.hasGameState && initState.hasResetGameFunc) break;
      await page.waitForTimeout(500);
    }

    // If resetGame available, try invoking it and observe changes
    let resetResult = null;
    if (initState && initState.hasResetGameFunc) {
      try {
        await page.evaluate(() => { window.resetGame && window.resetGame(); });
        // allow UI to update
        await page.waitForTimeout(500);
        const after = await page.evaluate(() => ({
          cellCount: document.querySelectorAll('#board .cell, .board .cell, .cell').length,
          hasGameState: !!window.gameState
        }));
        resetResult = after;
      } catch (e) {
        resetResult = { error: String(e) };
      }
    }

    const firstError = consoleErrors.length ? consoleErrors[0] : null;
    if (firstError) {
      console.log('\n=== FIRST ERROR ===');
      console.log(firstError.text);
      if (firstError.location) console.log(`at ${firstError.location.url}:${firstError.location.lineNumber}:${firstError.location.columnNumber}`);
      if (firstError.stack) console.log(firstError.stack);
    } else {
      console.log('\nNo console.error observed on page.');
    }

    console.log('\n=== SNIPPET RESULT (enhanced) ===');
    console.log(JSON.stringify({ initState, resetResult, pageUrl: page.url() }, null, 2));

  } catch (e) {
    console.error('Error running debug retry script:', e && e.stack ? e.stack : e);
  } finally {
    await browser.close();
  }
})();
