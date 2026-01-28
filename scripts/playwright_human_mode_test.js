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
    page.on('console', msg => { logs.push({ type: msg.type(), text: msg.text() }); console.log('[page]', msg.type(), msg.text()); });
    page.on('pageerror', e => console.error('[pageerror]', e && e.stack ? e.stack : e));

    await page.goto(`http://${SERVER_HOST}:${SERVER_PORT}/`);
    // Wait for UI ready
    await page.waitForFunction(() => !!(document.querySelector('.cell') && (window.getLegalMoves || (typeof CoreLogic !== 'undefined' && CoreLogic && CoreLogic.getLegalMoves))), { timeout: 30000 });

    // Force HUMAN_PLAY_MODE to both
    await page.evaluate(() => { window.HUMAN_PLAY_MODE = 'both'; if (typeof __uiImpl_turn_manager !== 'undefined') __uiImpl_turn_manager.humanPlayMode = 'both'; if (typeof window.addLog === 'function') addLog('Test: HUMAN_PLAY_MODE set to both'); });

    // Ensure Auto is disabled
    await page.evaluate(() => { try { if (window.autoSimple && typeof window.autoSimple.disable === 'function') window.autoSimple.disable(); } catch (e) {} });

    // Pick a legal move for black
    const move = await page.evaluate(() => { try { return (window.getLegalMoves ? window.getLegalMoves(window.gameState) : (typeof CoreLogic !== 'undefined' ? CoreLogic.getLegalMoves(window.gameState, window.gameState.currentPlayer, {}) : []))[0]; } catch (e) { return { error: String(e) }; } });
    console.log('Selected move for test:', move);
    if (!move || move.error) { console.error('No move'); await browser.close(); process.exitCode = 2; return; }

    // Click move via handleCellClick if available
    await page.evaluate(({ r, c }) => { if (typeof handleCellClick === 'function') handleCellClick(r, c); else { const sel = `.cell[data-row="${r}"][data-col="${c}"]`; const el = document.querySelector(sel); if (el) el.click(); } }, { r: move.row, c: move.col });

    // Wait for a bit and check CPU logs for white
    await page.waitForTimeout(2000);
    const cpuLogs = logs.filter(l => /\[CPU\]|processCpuTurn|processAutoBlackTurn|\[AI\]/.test(l.text));
    console.log('CPU logs during test:', cpuLogs.map(l => l.text));
    // Only treat as white CPU action if logs indicate real selection/execution (not ignore messages)
    const whiteCpuTriggered = cpuLogs.some(l => /(Lv1 white:)|(Starting CPU turn for white)|(選択 \(|選択 \[)/.test(l.text));

    if (whiteCpuTriggered) {
      console.error('WHITE CPU triggered despite HUMAN_PLAY_MODE=both');
      process.exitCode = 2;
    } else {
      console.log('PASS: WHITE CPU not triggered when HUMAN_PLAY_MODE=both');
    }

    await browser.close();
  } catch (e) {
    console.error('Error in playwright_human_mode_test:', e && e.stack ? e.stack : e);
    process.exitCode = 2;
  } finally {
    if (serverProc) serverProc.kill();
  }
})();