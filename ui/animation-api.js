// Centralized animation API for UI-side animation implementations
// This is a lightweight shim: consumers call exported async functions regardless of whether an implementation is present.

let __impl = {};

function setUIImpl(obj) { __impl = obj || {}; }
function clearUIImpl() { __impl = {}; }

async function animateFadeOutAt(row, col, opts) {
    if (__impl && typeof __impl.animateFadeOutAt === 'function') return __impl.animateFadeOutAt(row, col, opts);
    // Default: resolve immediately (no-op) to keep game headless-friendly
    return Promise.resolve();
}

async function animateMove(from, to, opts) {
    if (__impl && typeof __impl.animateMove === 'function') return __impl.animateMove(from, to, opts);
    return Promise.resolve();
}

async function animateFlip(row, col, opts) {
    if (__impl && typeof __impl.animateFlip === 'function') return __impl.animateFlip(row, col, opts);
    return Promise.resolve();
}

module.exports = { setUIImpl, clearUIImpl, animateFadeOutAt, animateMove, animateFlip };
