const { chromium } = require('playwright');

(async () => {
  // Allow file:// navigation fallback when no local server is available
  let browser;
  try {
    browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  } catch (e) {
    // Some Windows environments block Playwright's bundled chromium executable (EPERM).
    // Fall back to an installed browser channel when available.
    const msg = e && e.message ? e.message : String(e);
    console.warn('[debug_browser_init] chromium.launch failed, attempting channel fallback:', msg);
    try {
      browser = await chromium.launch({ channel: 'msedge', args: ['--allow-file-access-from-files'] });
    } catch (e2) {
      const msg2 = e2 && e2.message ? e2.message : String(e2);
      console.warn('[debug_browser_init] msedge channel failed, attempting chrome channel:', msg2);
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
    // Print all console messages for visibility
    console.log(`[console:${type}] ${text}${location ? ` (${location.url}:${location.lineNumber}:${location.columnNumber})` : ''}`);
  });

  page.on('pageerror', err => {
    console.log('[pageerror] ', err && err.stack ? err.stack : String(err));
    // capture as a synthetic console error if none present
    if (!consoleErrors.length) consoleErrors.push({ text: String(err), location: null, stack: err && err.stack });
  });

  try {
    console.log('Navigating to http://localhost:8000...');
    let serverStarted = null;
    try {
      await page.goto('http://localhost:8000', { waitUntil: 'load', timeout: 15000 });
    } catch (e) {
      console.warn('http://localhost:8000 not available, attempting to start temporary static server and navigate to it');
      // Start a lightweight static server that serves project files from repo root
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
        if (!full.startsWith(rootDir)) {
          res.statusCode = 403; res.end('Forbidden'); return;
        }
        fs.readFile(full, (err, data) => {
          if (err) { res.statusCode = 404; res.end('Not Found'); return; }
          res.setHeader('content-type', contentTypeFor(path.extname(full)));
          res.end(data);
        });
      });
      await new Promise((resolve, reject) => {
        srv.listen(0, '127.0.0.1', () => { resolve(); });
      });
      const port = srv.address().port;
      serverStarted = srv;
      console.log(`Temporary server started on http://127.0.0.1:${port}`);
      try {
        await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'load', timeout: 30000 });
      } catch (navErr) {
        console.warn('Navigation to temporary server failed:', navErr && navErr.message ? navErr.message : navErr);
        // proceed to evaluate snippet if possible
      }
    }

    // Allow any console messages to be processed
    await page.waitForTimeout(500);

    const firstError = consoleErrors.length ? consoleErrors[0] : null;
    if (firstError) {
      console.log('\n=== FIRST ERROR ===');
      console.log(firstError.text);
      if (firstError.location) console.log(`at ${firstError.location.url}:${firstError.location.lineNumber}:${firstError.location.columnNumber}`);
      if (firstError.stack) console.log(firstError.stack);
    } else {
      console.log('\nNo console.error observed on page.');
    }

    const snippetResult = await page.evaluate(() => ({
      // Board container is #board (not .board). Use both selectors for backwards compatibility.
      hasBoardEl: !!(document.getElementById('board') || document.querySelector('.board')),
      cellCount: document.querySelectorAll('#board .cell, .board .cell, .cell').length,
      hasGameState: !!window.gameState,
      hasCardState: !!window.cardState,
      hasHandleCellClick: typeof window.handleCellClick,
      hasResetGame: typeof window.resetGame,
      currentPlayer: window.gameState && window.gameState.currentPlayer !== undefined ? window.gameState.currentPlayer : null,
    }));

    console.log('\n=== SNIPPET RESULT ===');
    console.log(JSON.stringify(snippetResult, null, 2));

  } catch (e) {
    console.error('Error running debug script:', e && e.stack ? e.stack : e);
  } finally {
    await browser.close();
  }
})();
