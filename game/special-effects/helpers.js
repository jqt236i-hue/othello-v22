/**
 * @file helpers.js
 * @description Shared helpers for special effects
 */

/**
 * Clear all special effects (protection, bombs, dragons) at a specific position
 * Used by DESTROY effect
 * @param {number} row 
 * @param {number} col 
 */
function clearSpecialAt(row, col) {
    // Use local implementation (matches card-effects-applier.js)
    local_clearSpecialAt(row, col);
}

// Monkey-patch generic data cleanup into CardLogic or just implement locally?
// CardLogic doesn't have 'removeSpecialsAt'.
// We'll implement it locally using direct array manipulation for now, 
// matching previous behavior.

function local_clearSpecialAt(row, col) {
    // Clear from unified specialStones
    if (cardState.specialStones) {
        cardState.specialStones = cardState.specialStones.filter(s => !(s.row === row && s.col === col));
    }
    // Bombs are separate
    if (cardState.bombs) {
        cardState.bombs = cardState.bombs.filter(b => !(b.row === row && b.col === col));
    }
}

function getFlipBlockers() {
    if (!cardState || !cardState.specialStones) return [];
    return cardState.specialStones
        .filter(s => s.type === 'PERMA_PROTECTED' || s.type === 'DRAGON' || s.type === 'BREEDING' || s.type === 'ULTIMATE_DESTROY_GOD')
        .map(s => ({ row: s.row, col: s.col, owner: s.owner }));
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        clearSpecialAt: local_clearSpecialAt,
        getFlipBlockers
    };
}

// Exposing helpers to the browser global object is a UI responsibility. If a consumer needs
// a global helper for debug/visualization, the UI layer should import this module and attach
// functions to the browser global explicitly. This keeps `game/**` free of direct references to browser globals.
if (typeof globalThis !== 'undefined') {
    try { globalThis.getFlipBlockers = getFlipBlockers; } catch (e) { /* ignore */ }
}
