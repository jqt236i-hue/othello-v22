// Jest global setup for No-Animation unit tests
process.env.NOANIM = '1';

// Also provide a no-op TimerRegistry for node tests if needed
if (typeof global.TimerRegistry === 'undefined') {
    global.TimerRegistry = {
        setTimeout: (fn, ms, scope) => setTimeout(fn, ms),
        clearTimeout: (id) => clearTimeout(id),
        clearAll: () => {},
        pendingCount: () => 0,
        newScope: () => null,
        clearScope: () => {}
    };
}

// Ensure window globals for noanim tests
if (typeof global.window === 'undefined') global.window = {};
global.window.DISABLE_ANIMATIONS = true;

// requestAnimationFrame polyfill for Node/JSDOM tests
if (typeof global.requestAnimationFrame === 'undefined') {
    global.requestAnimationFrame = function (cb) { return setTimeout(cb, 0); };
    global.cancelAnimationFrame = function (id) { clearTimeout(id); };
}

// Common no-op/compat globals used across UI and game tests
if (typeof global.emitBoardUpdate === 'undefined') global.emitBoardUpdate = function () {};
if (typeof global.emitGameStateChange === 'undefined') global.emitGameStateChange = function () {};
if (typeof global.emitPresentationEvent === 'undefined') global.emitPresentationEvent = function (cardState, ev) {
    try { if (cardState && Array.isArray(cardState.presentationEvents)) cardState.presentationEvents.push(ev); }
    catch (e) { /* ignore */ }
};
if (typeof global.renderBoard === 'undefined') global.renderBoard = function () {};
if (typeof global.addLog === 'undefined') global.addLog = function () {};
if (typeof global.applyFlipAnimations === 'undefined') global.applyFlipAnimations = function () { /* shim for legacy tests */ };

// Ensure the animation API module is loaded for tests
try { require('../ui/animation-api'); } catch (e) { /* ignore if not present */ }

// Centralized timer tracking for tests: register intervals/timeouts so we can clear them after each test
global.__jest_tracked_intervals = new Set();
global.__jest_tracked_timeouts = new Set();

const _origSetInterval = global.setInterval;
const _origClearInterval = global.clearInterval;
global.setInterval = function(fn, ms, ...args) {
    const id = _origSetInterval(fn, ms, ...args);
    try { global.__jest_tracked_intervals.add(id); } catch (e) {}
    return id;
};
global.clearInterval = function(id) {
    try { global.__jest_tracked_intervals.delete(id); } catch (e) {}
    return _origClearInterval(id);
};

const _origSetTimeout = global.setTimeout;
const _origClearTimeout = global.clearTimeout;
global.setTimeout = function(fn, ms, ...args) {
    const id = _origSetTimeout(fn, ms, ...args);
    try { global.__jest_tracked_timeouts.add(id); } catch (e) {}
    return id;
};
global.clearTimeout = function(id) {
    try { global.__jest_tracked_timeouts.delete(id); } catch (e) {}
    return _origClearTimeout(id);
};

global.__clearRegisteredTimers = function() {
    try {
        for (const id of Array.from(global.__jest_tracked_intervals)) { try { _origClearInterval(id); } catch (e) {} }
        global.__jest_tracked_intervals.clear();
        for (const id of Array.from(global.__jest_tracked_timeouts)) { try { _origClearTimeout(id); } catch (e) {} }
        global.__jest_tracked_timeouts.clear();
    } catch (e) { /* best-effort */ }
};

// Extra debug: surface uncaught rejections / exceptions and process exit
process.on('exit', (code) => { console.log('***PROCESS EXIT***', code); });
process.on('uncaughtException', (err) => { console.error('***UNCAUGHT_EXCEPTION***', err && err.stack ? err.stack : err); });
process.on('unhandledRejection', (reason) => { console.error('***UNHANDLED_REJECTION***', reason && reason.stack ? reason.stack : reason); });
process.on('SIGTERM', () => { console.log('***SIGTERM***'); process.exit(1); });
process.on('SIGINT', () => { console.log('***SIGINT***'); process.exit(1); });

