/**
 * @file protections.js
 * @description Protection expiry handlers
 */

/**
 * Process expired protected stones at turn end
 * @async
 * @param {number} player - Player whose turn just ended (BLACK=1 or WHITE=-1)
 * @returns {Promise<void>}
 */
// Timers abstraction (injected by UI)
(function () {
let timers = null;
if (typeof require === 'function') {
    try { timers = require('../timers'); } catch (e) { /* ignore */ }
}
const waitMs = (ms) => (timers && typeof timers.waitMs === 'function' ? timers.waitMs(ms) : Promise.resolve());

async function processExpiredProtectionsAtTurnEnd(player) {
    // Find protected stones from unified specialStones
    const protectedStones = cardState.specialStones ? cardState.specialStones.filter(s => s.type === 'PROTECTED') : [];
    if (protectedStones.length === 0) return;

    // Find protected stones that are expiring for this player
    const expiringStones = protectedStones.filter(p => p.expiresForPlayer === player);

    if (expiringStones.length === 0) return;

    // Animate fade-out for each expiring stone
    const animationPromises = expiringStones.map(p => animateProtectionExpireAt(p.row, p.col));
    await Promise.all(animationPromises);

    // Remove expired protections from cardState (unified array)
    cardState.specialStones = cardState.specialStones.filter(
        s => !(s.type === 'PROTECTED' && s.expiresForPlayer === player)
    );

    // Update display
    emitBoardUpdate();
    emitGameStateChange();
}

/**
 * Animate protection expiration (fade out from gray to normal color)
 * @param {number} row
 * @param {number} col
 */
async function animateProtectionExpireAt(row, col) {
    // Ask UI to animate protection expiry; UI may ignore if not present.
    if (typeof emitPresentationEvent === 'function') {
        emitPresentationEvent(cardState, { type: 'PROTECTION_EXPIRE', row, col, durationMs: 600, effectKey: 'protectionExpire' });
    }
    // Preserve pacing: wait same duration so turn sequencing remains unchanged.
    await waitMs(600);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { processExpiredProtectionsAtTurnEnd };
}
})();
