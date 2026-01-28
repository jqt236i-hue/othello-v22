/**
 * @file auto.js
 * @description Auto mode handlers
 */

/**
 * オートモードの設定
 * Setup auto toggle button
 */
// Simple Auto UI handler (integrates with game/auto.js)
const Auto = (typeof require === 'function') ? require('../../game/auto') : (window.autoSimple || null);

function setupAutoToggle(autoToggleBtn, autoSmartBlack, autoSmartWhite) {
    if (!autoToggleBtn) return;
    autoToggleBtn.textContent = 'AUTO: OFF';
    // Use a non-blocking click handler so long-running Auto startup doesn't block UI events or test automation
    autoToggleBtn.addEventListener('click', () => {
        if (!Auto) return console.warn('[AUTO UI] Auto backend not available');
        // Defer toggle to avoid blocking the click event — use microtask for tighter ordering than macrotask
        (typeof queueMicrotask === 'function' ? queueMicrotask : (fn => Promise.resolve().then(fn)))(() => {
            try {
                const before = Auto && typeof Auto.isEnabled === 'function' ? Auto.isEnabled() : null;
                // Diagnostic: log toggle attempt with stack and HUMAN_PLAY_MODE
                try { console.log('[DIAG][AUTO_UI] toggle click', { before, humanMode: (typeof window !== 'undefined' ? window.HUMAN_PLAY_MODE : null), stack: (new Error()).stack.split('\n').slice(1,6).join('\n'), time: Date.now() }); } catch (e) {}
                Auto.toggle();
                const after = Auto && typeof Auto.isEnabled === 'function' ? Auto.isEnabled() : null;
                autoToggleBtn.textContent = after ? 'AUTO: ON' : 'AUTO: OFF';
                if (typeof addLog === 'function') addLog(`Auto mode ${after ? 'ON' : 'OFF'}`);
                try { console.log('[DIAG][AUTO_UI] toggle completed', { before, after, humanMode: (typeof window !== 'undefined' ? window.HUMAN_PLAY_MODE : null), time: Date.now() }); } catch (e) {}

                // If an attempt was made to enable but it stayed disabled, provide user-facing note
                try {
                    if (before === false && after === false && typeof window !== 'undefined' && window.HUMAN_PLAY_MODE && window.HUMAN_PLAY_MODE !== 'black') {
                        if (typeof addLog === 'function') addLog('Auto の有効化は拒否されました（人間操作が黒ではありません）');
                    }
                } catch (e) { /* ignore */ }

            } catch (e) {
                console.error('[AUTO UI] toggle handler failed', e && e.stack ? e.stack : e);
            }
        });
    });
    // reflect current state if any (synchronously read)
    try {
        if (Auto && typeof Auto.isEnabled === 'function' && Auto.isEnabled()) autoToggleBtn.textContent = 'AUTO: ON';
    } catch (e) { /* ignore */ }
}

function triggerAutoIfNeeded() {
    // Backward-compatible legacy API: call processAutoBlackTurn once if possible
    // Only invoke if Auto mode is currently enabled to avoid accidental triggers
    if (typeof processAutoBlackTurn === 'function') {
        if (Auto && typeof Auto.isEnabled === 'function' && !Auto.isEnabled()) return false;
        try {
            // Use microtask to avoid racing with presentation handlers but still be deterministic
            (typeof queueMicrotask === 'function' ? queueMicrotask : (fn => Promise.resolve().then(fn)))(() => { try { processAutoBlackTurn(); } catch (e) {} });
            return true;
        } catch (e) { return false; }
    }
    return false;
}

if (typeof window !== 'undefined') {
    window.setupAutoToggle = setupAutoToggle;
    window.triggerAutoIfNeeded = triggerAutoIfNeeded;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setupAutoToggle, triggerAutoIfNeeded };
} 
