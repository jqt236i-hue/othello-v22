/* REMOVED in Phase2: animations/card-animation-utils.js
   Stubbed to avoid runtime errors while physical removal is staged. */

console.warn('animations/card-animation-utils.js: REMOVED (Phase2 stub)');

function getCardPosition() {
    // Return safe default so callers that accidentally run this still behave
    return { x: 0, y: 0, width: 0, height: 0 };
}

function createFlyingCard() {
    const el = (typeof document !== 'undefined') ? document.createElement('div') : {};
    if (el && el.classList) el.className = 'flying-card stub';
    return el;
}

function animateCardFadeIn() {
    // No-op stub
    return Promise.resolve();
}
