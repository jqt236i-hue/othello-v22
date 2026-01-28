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

    await page.goto(`http://${SERVER_HOST}:${SERVER_PORT}/`);

    // Wait until board cells or game state are present; be tolerant of different build timings
    await page.waitForFunction(() => !!(document.querySelector('.cell') || (typeof window !== 'undefined' && window.gameState && typeof window.gameState.currentPlayer === 'number')), { timeout: 45000 });

    const move = await page.evaluate(() => {
      try {
        let moves = [];
        if (typeof CoreLogic !== 'undefined' && CoreLogic && typeof CoreLogic.getLegalMoves === 'function' && window.gameState) {
          moves = CoreLogic.getLegalMoves(window.gameState, window.gameState.currentPlayer, {});
        } else if (window.getLegalMoves) {
          moves = window.getLegalMoves(window.gameState);
        }
        return moves && moves.length ? moves[0] : null;
      } catch (e) { return { error: String(e) }; }
    });

    console.log('Selected move from getLegalMoves:', move);
    if (!move || move.error) {
      console.error('No move available or error computing move', move);
      await browser.close();
      process.exitCode = 2;
      return;
    }

    // Prefer direct call to handleCellClick if available (simulates user input bypassing DOM timing issues)
    const clicked = await page.evaluate(({ r, c }) => {
      try {
        if (typeof handleCellClick === 'function') { handleCellClick(r, c); return 'handleCellClick'; }
        const sel = `.cell[data-row="${r}"][data-col="${c}"]`;
        const el = document.querySelector(sel);
        if (el) { el.click(); return 'dom-click'; }
        return 'no-selector';
      } catch (e) { return 'error:' + (e.message || String(e)); }
    }, { r: move.row, c: move.col });

    console.log('Click method used:', clicked);

    // Wait for presentation and CPU logs
    await page.waitForTimeout(2000);
    const cpuStartLogs = logs.filter(l => /\[AI\] Starting CPU turn|processCpuTurn invoked|processAutoBlackTurn|\[CPU\]|\[AI\]|processCpuTurn/.test(l.text));
    console.log('Captured CPU-related logs count:', cpuStartLogs.length);
    cpuStartLogs.forEach((l, i) => console.log('CPU LOG', i, l.type, l.text));

    await page.screenshot({ path: 'tmp/click-and-capture-v2.png' });
    await browser.close();
  } catch (e) {
    console.error('Error in playwright_click_move_and_capture_v2:', e && e.stack ? e.stack : e);
    process.exitCode = 2;
  } finally {
    if (serverProc) serverProc.kill();
  }
})();