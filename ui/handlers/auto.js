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
    autoToggleBtn.addEventListener('click', () => {
        if (!Auto) return console.warn('[AUTO UI] Auto backend not available');
        Auto.toggle();
        autoToggleBtn.textContent = Auto.isEnabled() ? 'AUTO: ON' : 'AUTO: OFF';
        if (typeof addLog === 'function') addLog(`Auto mode ${Auto.isEnabled() ? 'ON' : 'OFF'}`);
    });
    // reflect current state if any
    if (Auto && Auto.isEnabled && Auto.isEnabled()) autoToggleBtn.textContent = 'AUTO: ON';
}

function triggerAutoIfNeeded() {
    // Backward-compatible legacy API: call processAutoBlackTurn once if possible
    if (typeof processAutoBlackTurn === 'function') {
        try { processAutoBlackTurn(); return true; } catch (e) { return false; }
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
