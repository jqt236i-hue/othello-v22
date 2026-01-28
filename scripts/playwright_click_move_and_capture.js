const { chromium } = require('playwright');
const net = require('net');
const SERVER_PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
const SERVER_HOST = '127.0.0.1';

function waitForPort(port, host, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function tryConnect() {
      const sock = new net.Socket();
      sock.setTimeout(500);
      sock.on('connect', () => { sock.destroy(); resolve(true); });
      sock.on('error', () => { sock.destroy(); if (Date.now() - start > timeout) return reject(new Error('timeout')); setTimeout(tryConnect, 200); });
      sock.on('timeout', () => { sock.destroy(); if (Date.now() - start > timeout) return reject(new Error('timeout')); setTimeout(tryConnect, 200); });
      sock.connect(port, host);
    })();
  })
}

(async () => {
  let serverProc = null;
  try {
    await waitForPort(SERVER_PORT, SERVER_HOST, 500).catch(async () => {
      console.log('Static server not detected on port', SERVER_PORT, '- starting local server');
      const { spawn } = require('child_process');
      serverProc = spawn(process.execPath, ['scripts/simple_static_server.js'], { stdio: ['ignore', 'pipe', 'pipe'], cwd: __dirname + '/..' });
      serverProc.stdout.on('data', d => console.log('[server]', d.toString().trim()));
      serverProc.stderr.on('data', d => console.error('[server-err]', d.toString().trim()));
      await waitForPort(SERVER_PORT, SERVER_HOST, 5000);
    });

    const browser = await chromium.launch({ headless: false, slowMo: 80 });
    const page = await browser.newPage();
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      logs.push({ type: msg.type(), text });
      console.log('[page]', msg.type(), text);
    });
    page.on('pageerror', err => { console.error('[pageerror]', err && err.stack ? err.stack : err); });
    // Log failed requests to identify missing assets causing 404s
    page.on('requestfailed', req => {
      try {
        const failure = req.failure && req.failure();
        console.log('[reqfail]', req.url(), failure && failure.errorText ? failure.errorText : '<no failure text>', req.response && req.response() ? req.response().status() : '<no status>');
      } catch (e) { /* ignore */ }
    });
    // Also watch responses to catch 404s and capture the failing URL
    page.on('response', resp => {
      try {
        if (resp && typeof resp.status === 'function' && resp.status() === 404) console.log('[resp404]', resp.url());
      } catch (e) { /* ignore */ }
    });
    // Additionally check requestfinished events for 404 status (some resources may finalize here)
    page.on('requestfinished', req => {
      try {
        const r = req.response && req.response();
        if (r && typeof r.status === 'function' && r.status() === 404) console.log('[reqfinished-404]', req.url());
      } catch (e) { /* ignore */ }
    });
    // Temporarily log all outgoing requests (short-lived helper to identify missing assets)
    page.on('request', req => {
      try { console.log('[req]', req.method(), req.url(), req.resourceType()); } catch(e){}
    });

    await page.goto(`http://${SERVER_HOST}:${SERVER_PORT}/`);

    // Wait for UI ready (getLegalMoves + board are sufficient; handleCellClick may be undefined in some builds)
    try {
      await page.waitForFunction(() => !!window.__uiReady, { timeout: 5000 });
    } catch (e) {
      console.error('UI did not initialize within 5s; recent console logs:', logs.slice(-20));
      throw e;
    }

    const move = await page.evaluate(() => {
      try {
        const moves = window.getLegalMoves ? window.getLegalMoves(window.gameState) : [];
        return moves && moves.length ? moves[0] : null;
      } catch (e) { return { error: String(e) }; }
    });

    console.log('Selected move from getLegalMoves:', move);
    if (!move || move.error) {
      console.error('No move available or error computing move');
      await browser.close();
      process.exitCode = 2;
      return;
    }

    // Click cell via selector
    const sel = `.cell[data-row="${move.row}"][data-col="${move.col}"]`;
    await page.waitForSelector(sel, { timeout: 5000 });
    await page.click(sel);

    // Wait for CPU start console message (deterministic & short)
    try {
      const cpuConsole = await page.waitForEvent('console', { timeout: 3000, predicate: m => /processCpuTurn|processAutoBlackTurn|\[DIAG\]\[CPU\]/.test(m.text()) });
      console.log('Detected CPU console message:', cpuConsole.text());
    } catch (e) {
      console.log('No CPU console message within 3s; dumping recent logs count:', logs.length);
      logs.slice(-20).forEach((l, i) => console.log('RECENT LOG', i, l.type, l.text));
    }

    await page.screenshot({ path: 'tmp/click-and-capture.png' });
    await browser.close();
  } catch (e) {
    console.error('Error in playwright_click_move_and_capture:', e && e.stack ? e.stack : e);
    process.exitCode = 2;
  } finally {
    if (serverProc) serverProc.kill();
  }
})();