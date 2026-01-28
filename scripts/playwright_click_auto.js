const { chromium } = require('playwright');
const { spawn } = require('child_process');
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
    // Try to see if server exists
    await waitForPort(SERVER_PORT, SERVER_HOST, 500).catch(async () => {
      console.log('Static server not detected on port', SERVER_PORT, '- starting local server');
      serverProc = spawn(process.execPath, ['scripts/simple_static_server.js'], { stdio: ['ignore', 'pipe', 'pipe'], cwd: __dirname + '/..' });
      serverProc.stdout.on('data', d => console.log('[server]', d.toString().trim()));
      serverProc.stderr.on('data', d => console.error('[server-err]', d.toString().trim()));
      await waitForPort(SERVER_PORT, SERVER_HOST, 5000);
    });

    // Run headful with slowMo to observe behavior and avoid race conditions
    const browser = await chromium.launch({ headless: false, slowMo: 80 });
    const page = await browser.newPage();
    page.on('console', msg => console.log('[page]', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('[pageerror]', err && err.stack ? err.stack : err));

    await page.goto(`http://${SERVER_HOST}:${SERVER_PORT}/`);

    // Wait for auto button and click
    await page.waitForSelector('#autoToggleBtn', { timeout: 2000 });
    const textBefore = await page.$eval('#autoToggleBtn', el => el.textContent.trim());
    console.log('AUTO button text before click:', textBefore);

    // Click the button - try normal click first; if it times out or fails, dispatch click via evaluate
    try {
      await page.click('#autoToggleBtn', { timeout: 5000 });
    } catch (e) {
      console.warn('Direct click failed or timed out, dispatching click via evaluate:', e && e.message);
      try {
        await page.evaluate(() => { const b = document.getElementById('autoToggleBtn'); if (b && typeof b.click === 'function') b.click(); });
      } catch (e2) { console.error('Evaluate click also failed', e2 && e2.message); }
    }
    // wait for UI to settle
    await page.waitForTimeout(500);
    const textAfter = await page.$eval('#autoToggleBtn', el => el.textContent.trim());
    // Take a screenshot for inspection
    await page.screenshot({ path: 'tmp/auto-click-after.png', fullPage: false });
    // Dump window.autoSimple state if available
    const hasAuto = await page.evaluate(() => !!(window.autoSimple && typeof window.autoSimple.isEnabled === 'function'));
    const autoEnabledVal = hasAuto ? await page.evaluate(() => window.autoSimple.isEnabled()) : null;
    console.log('window.autoSimple exists?', hasAuto, 'isEnabled=', autoEnabledVal);
    console.log('AUTO button text after click:', textAfter);

    // Validate that it toggled
    if (textBefore === textAfter) {
      console.error('AUTO button did not toggle text. It may be missing backend integration.');
      // For debugging, dump whether window.autoSimple exists
      const hasAuto = await page.evaluate(() => !!(window.autoSimple && typeof window.autoSimple.isEnabled === 'function'));
      console.log('window.autoSimple exists?', hasAuto);
      if (hasAuto) {
        const isEnabled = await page.evaluate(() => window.autoSimple.isEnabled());
        console.log('window.autoSimple.isEnabled() ===', isEnabled);
      }
      process.exitCode = 2;
    } else {
      console.log('AUTO toggle successful');
    }

    await browser.close();
  } catch (e) {
    console.error('Error in playwright_click_auto:', e && e.stack ? e.stack : e);
    process.exitCode = 2;
  } finally {
    if (serverProc) {
      serverProc.kill();
    }
  }
})();