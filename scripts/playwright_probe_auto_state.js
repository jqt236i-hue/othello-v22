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
  try {
    await waitForPort(SERVER_PORT, SERVER_HOST, 2000);
    const browser = await chromium.launch({ headless: false, slowMo: 100 });
    const page = await browser.newPage();
    page.on('console', msg => console.log('[page]', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('[pageerror]', err && err.stack ? err.stack : err));

    await page.goto(`http://${SERVER_HOST}:${SERVER_PORT}/`);

    await page.waitForSelector('#autoToggleBtn', { timeout: 3000 });

    // Evaluate diagnostics
    const diag = await page.evaluate(() => {
      return {
        autoExists: !!(window.autoSimple && typeof window.autoSimple.isEnabled === 'function'),
        autoEnabled: window.autoSimple ? window.autoSimple.isEnabled() : null,
        autoBtnText: document.getElementById('autoToggleBtn') ? document.getElementById('autoToggleBtn').textContent.trim() : null,
        humanPlayMode: window.HUMAN_PLAY_MODE,
        debugHvH: window.DEBUG_HUMAN_VS_HUMAN,
        isProcessing: window.isProcessing,
        isCardAnimating: window.isCardAnimating,
        hasProcessAutoBlackTurn: typeof processAutoBlackTurn === 'function',
        hasProcessCpuTurn: typeof processCpuTurn === 'function',
        hasProcessCpuTurnGlobal: !!(window.processCpuTurn),
        // Capture recent logs if present
        lastLogLines: (window.__recentConsole__ && Array.isArray(window.__recentConsole__)) ? window.__recentConsole__.slice(-20) : null
      };
    });

    console.log('DIAGNOSTICS:', JSON.stringify(diag, null, 2));

    await page.screenshot({ path: 'tmp/auto-probe.png', fullPage: false });

    // Keep browser open briefly to observe
    await page.waitForTimeout(4000);

    await browser.close();
  } catch (e) {
    console.error('Error in playwright_probe_auto_state:', e && e.stack ? e.stack : e);
    process.exitCode = 2;
  }
})();
