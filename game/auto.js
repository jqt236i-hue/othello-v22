(function () {
/**
 * @file game/auto.js
 * Minimal, simple Auto mode implementation.
 * - Start/stop/toggle API
 * - Single async loop that periodically attempts to trigger Black's auto turn
 * - Respects `isProcessing` / `isCardAnimating` and `gameState.currentPlayer`
 */

// Default interval between checks (ms)
let AUTO_SIMPLE_INTERVAL_MS = 800;
let _enabled = false;
let _cancelToken = null;
let __autoEnabledAt = null; // timestamp when Auto was enabled (used to avoid immediate auto-run on enable)

// Timers abstraction (injected by UI)
let timers = null;
if (typeof require === 'function') {
    try { timers = require('./timers'); } catch (e) { /* ignore */ }
}

function delay(ms) {
  if (timers && typeof timers.waitMs === 'function') return timers.waitMs(ms);
  return Promise.resolve();
}

function isEnabled() {
  return _enabled === true;
}

function enable() {
  // Defensive: only allow enabling Auto when UI indicates Black is human-play mode.
  try {
    if (typeof globalThis !== 'undefined') {
      const humanMode = (typeof globalThis.HUMAN_PLAY_MODE === 'string') ? globalThis.HUMAN_PLAY_MODE : (globalThis.DEBUG_HUMAN_VS_HUMAN ? 'both' : 'black');
      if (humanMode !== 'black') {
        console.warn('[AUTO] enable blocked: HUMAN_PLAY_MODE !== "black" (current=' + humanMode + ')');
        return;
      }
    }
  } catch (e) { /* ignore */ }

  if (_enabled) return;
  _enabled = true;
  __autoEnabledAt = Date.now();
  _cancelToken = { cancelled: false };
  _runLoop(_cancelToken).catch(err => {
    console.error('[AUTO] Error in auto loop:', err);
    disable();
  });
}

function disable() {
  if (!_enabled) return;
  _enabled = false;
  __autoEnabledAt = null;
  if (_cancelToken) _cancelToken.cancelled = true;
  _cancelToken = null;
}

function toggle() {
  try { console.log('[DIAG][AUTO] toggle called', { enabledBefore: _enabled, humanMode: (typeof globalThis !== 'undefined' ? globalThis.HUMAN_PLAY_MODE : null), stack: (new Error()).stack.split('\n').slice(1,6).join('\n'), time: Date.now() }); } catch (e) {}
  if (isEnabled()) disable(); else enable();
  try { console.log('[DIAG][AUTO] toggle completed', { enabledAfter: _enabled, time: Date.now() }); } catch (e) {}
}

function setIntervalMs(ms) {
  AUTO_SIMPLE_INTERVAL_MS = Number(ms) || AUTO_SIMPLE_INTERVAL_MS;
}

function getIntervalMs() {
  return AUTO_SIMPLE_INTERVAL_MS;
}

async function _runLoop(cancelToken) {
  while (!cancelToken.cancelled && _enabled) {
    try {
      // Only try to trigger when it's black's turn
      if (typeof gameState !== 'undefined' && gameState && gameState.currentPlayer === BLACK) {
        // Don't trigger if game logic/ui is busy
        if (!isProcessing && !isCardAnimating) {          // Suppress when a human interaction was recent to avoid racing human clicks
          try {
            const lastHuman = (typeof globalThis !== 'undefined' && globalThis.__lastHumanActionAt) ? globalThis.__lastHumanActionAt : ((typeof global !== 'undefined' && global.__lastHumanActionAt) ? global.__lastHumanActionAt : null);
            if (lastHuman && (Date.now() - lastHuman) < 300) { // 300ms suppression
              try { console.log('[DIAG][AUTO] suppressed due to recent human interaction', { lastHuman, elapsed: Date.now() - lastHuman}); } catch (e) {}
              await delay(AUTO_SIMPLE_INTERVAL_MS);
              continue;
            }
          } catch (e) { /* ignore */ }
          // Prefer calling public CPU entry point
          if (typeof processAutoBlackTurn === 'function') {
            try {
              // Suppress immediate run if Auto was just enabled recently (avoid preempting human action)
              if (__autoEnabledAt && (Date.now() - __autoEnabledAt) < 500) {
                try { console.log('[DIAG][AUTO] deferred immediate run after enable', { sinceEnable: Date.now() - __autoEnabledAt }); } catch (e) {}
                await delay(500);
                continue;
              }

              processAutoBlackTurn();
            } catch (e) {
              console.error('[AUTO] processAutoBlackTurn threw:', e);
            }
          }
        }
      }
    } catch (e) {
      console.error('[AUTO] Unexpected error in loop:', e);
    }
    // Wait before next check
    await delay(AUTO_SIMPLE_INTERVAL_MS);
  }
}

// Export API
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    enable,
    disable,
    toggle,
    isEnabled,
    setIntervalMs,
    getIntervalMs
  };
}

// Also expose a browser-global fallback so the UI can integrate without a bundler
if (typeof globalThis !== 'undefined') {
  globalThis.autoSimple = globalThis.autoSimple || {
    enable,
    disable,
    toggle,
    isEnabled,
    setIntervalMs,
    getIntervalMs
  };
}
})();


