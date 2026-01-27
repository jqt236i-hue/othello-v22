/**
 * Stone Visual Cross-Fade Utility
 * 
 * Provides smooth, non-disappearing cross-fade transitions for stone visual changes.
 * Uses CSS transitions + requestAnimationFrame for precise timing.
 * 
 * @module ui/stone-visuals
 */

/**
 * Cross-fade a stone's visual appearance using opacity transitions
 * 
 * @param {HTMLElement} disc - The disc element to animate
 * @param {Object} options - Animation options
 * @param {string} options.effectKey - The stone effect key (e.g., 'regenStone')
 * @param {number} [options.owner] - Owner color (BLACK or WHITE)
 * @param {number} [options.durationMs=600] - Fade duration in milliseconds
 * @param {boolean} [options.fadeIn=true] - Whether to fade in (true) or out (false)
 * @param {boolean} [options.autoFadeOut=false] - Auto fade-out after fade-in
 * @returns {Promise<void>}
 * 
 * @example
 * // Fade in regen stone
 * await crossfadeStoneVisual(disc, { effectKey: 'regenStone', owner: BLACK });
 * 
 * // Fade out
 * await crossfadeStoneVisual(disc, { effectKey: 'regenStone', fadeIn: false });
 * 
 * // Auto fade-in then fade-out
 * await crossfadeStoneVisual(disc, { 
 *   effectKey: 'regenStone', 
 *   owner: BLACK,
 *   autoFadeOut: true 
 * });
 */

function _isNoAnim() {
    try {
        if (typeof window !== 'undefined' && window.DISABLE_ANIMATIONS === true) return true;
        if (typeof location !== 'undefined' && /[?&]noanim=1/.test(location.search)) return true;
        if (typeof process !== 'undefined' && (process.env.NOANIM === '1' || process.env.NOANIM === 'true' || process.env.DISABLE_ANIMATIONS === '1')) return true;
    } catch (e) { }
    return false;
}
// If global NOANIM mode is active, mark the root element so CSS fallbacks can disable
// transitions/animations as a safety net (no behavioral change when not present).
try {
    if (typeof window !== 'undefined' && _isNoAnim() && typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.classList.add('no-anim');
    }
} catch (e) { }

function _Timer() {
    if (typeof TimerRegistry !== 'undefined') return TimerRegistry;
    return {
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        clearTimeout: (id) => clearTimeout(id),
        clearAll: () => {},
        pendingCount: () => 0
    };
}

async function crossfadeStoneVisual(disc, options = {}) {
    console.log('[VISUAL_DEBUG] crossfadeStoneVisual invoked', options && options.effectKey);
    // Simplified: remove overlay-based cross-fade and apply final visual state immediately.
    // This function no longer performs opacity transitions or creates overlays.
    const {
        effectKey,
        owner,
        newColor = null, // Optional: new stone color (BLACK=1, WHITE=-1)
        fadeWholeStone = false // kept for compatibility with callers
    } = options;

    if (!disc || !disc.parentElement) return;

    // Apply final color immediately
    if (newColor !== null) {
        disc.classList.remove('black', 'white');
        disc.classList.add(newColor === 1 ? 'black' : 'white');
    }

    // Apply visual effect immediately (no animation)
    if (effectKey && typeof applyStoneVisualEffect === 'function') {
        try { console.log('[VISUAL_DEBUG] crossfade attempting applyStoneVisualEffect', effectKey); } catch (e) {}
        try { applyStoneVisualEffect(disc, effectKey, { owner }); } catch (e) { console.warn('[VISUAL_DEBUG] applyStoneVisualEffect threw', e); }
        try { console.log('[VISUAL_DEBUG] crossfade after apply classes:', disc && disc.className); } catch (e) {}
    }

    // Clean up any overlay remnants if present
    try {
        const overlay = disc.parentElement.querySelector('.stone-fade-overlay');
        if (overlay) overlay.remove();
    } catch (e) { }

    // Ensure disc is visible and not instant-hidden
    disc.classList.remove('stone-hidden', 'stone-hidden-all', 'stone-instant');
    try { disc.style.opacity = ''; } catch (e) { }

    return;
}

// Export for window or module systems
if (typeof window !== 'undefined') {
    window.crossfadeStoneVisual = crossfadeStoneVisual;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { crossfadeStoneVisual };
}
