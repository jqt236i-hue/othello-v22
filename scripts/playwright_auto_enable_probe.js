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
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', msg => console.log('[page]', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('[pageerror]', err && err.stack ? err.stack : err));

    await page.goto(`http://${SERVER_HOST}:${SERVER_PORT}/`);
    await page.waitForSelector('#autoToggleBtn', { timeout: 3000 });

    const result = await page.evaluate(() => {
      const res = {};
      try {
        window.HUMAN_PLAY_MODE = 'both';
        if (window.autoSimple && typeof window.autoSimple.enable === 'function') {
          window.autoSimple.enable();
          res.enabledWhenBoth = window.autoSimple.isEnabled();
        } else res.enabledWhenBoth = null;

        // reset
        if (window.autoSimple && typeof window.autoSimple.disable === 'function') window.autoSimple.disable();

        window.HUMAN_PLAY_MODE = 'black';
        if (window.autoSimple && typeof window.autoSimple.enable === 'function') {
          window.autoSimple.enable();
          res.enabledWhenBlack = window.autoSimple.isEnabled();
        } else res.enabledWhenBlack = null;

        // cleanup
        if (window.autoSimple && typeof window.autoSimple.disable === 'function') window.autoSimple.disable();
      } catch (e) {
        res.error = e && e.message ? e.message : String(e);
      }
      return res;
    });

    console.log('AUTO enable probe result:', result);

    await browser.close();
  } catch (e) {
    console.error('Error in playwright_auto_enable_probe:', e && e.stack ? e.stack : e);
    process.exitCode = 2;
  }
})();
