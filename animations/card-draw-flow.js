/* REMOVED in Phase2: animations/card-draw-flow.js
   Stubbed to avoid runtime errors while physical removal is staged. */

console.warn('animations/card-draw-flow.js: REMOVED (Phase2 stub)');

async function dealInitialCards() {
    // No-op: initial dealing is handled synchronously in Phase2 (no animation)
    renderCardUI && typeof renderCardUI === 'function' && renderCardUI();
}

async function playDrawAnimation() {
    // No-op stub
    return;
}
