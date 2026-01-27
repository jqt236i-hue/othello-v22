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
  if (_enabled) return;
  _enabled = true;
  _cancelToken = { cancelled: false };
  _runLoop(_cancelToken).catch(err => {
    console.error('[AUTO] Error in auto loop:', err);
    disable();
  });
}

function disable() {
  if (!_enabled) return;
  _enabled = false;
  if (_cancelToken) _cancelToken.cancelled = true;
  _cancelToken = null;
}

function toggle() {
  if (isEnabled()) disable(); else enable();
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
        if (!isProcessing && !isCardAnimating) {
          // Prefer calling public CPU entry point
          if (typeof processAutoBlackTurn === 'function') {
            try {
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
})();


