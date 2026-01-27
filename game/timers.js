// Timers abstraction for game/ to avoid direct use of browser timing APIs
// UI layer can inject real implementations via setTimerImpl
let _impl = {};
function setTimerImpl(obj) { _impl = obj || {}; }
function waitMs(ms) {
    if (_impl && typeof _impl.waitMs === 'function') return _impl.waitMs(ms);
    // Default: non-blocking immediate resolution to keep game logic headless-friendly
    return Promise.resolve();
}
function requestFrame() {
    if (_impl && typeof _impl.requestFrame === 'function') return _impl.requestFrame();
    // Default: immediate resolution
    return Promise.resolve();
}
module.exports = { setTimerImpl, waitMs, requestFrame };