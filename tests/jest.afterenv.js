// Jest after-env hooks: run when jest testing framework is available

// Run cleanup after each test to avoid leaking timers across tests
afterEach(() => {
    try { if (typeof global.__clearRegisteredTimers === 'function') global.__clearRegisteredTimers(); } catch (e) {}
    try { if (global.TimerRegistry && typeof global.TimerRegistry.clearAll === 'function') global.TimerRegistry.clearAll(); } catch (e) {}
    try { if (global.window && global.window.TimerRegistry && typeof global.window.TimerRegistry.clearAll === 'function') global.window.TimerRegistry.clearAll(); } catch (e) {}
});

// Global cleanup and diagnostic at the very end
afterAll(() => {
    try {
        if (typeof global.__clearRegisteredTimers === 'function') global.__clearRegisteredTimers();
        if (global.TimerRegistry && typeof global.TimerRegistry.clearAll === 'function') global.TimerRegistry.clearAll();
        if (global.window && global.window.TimerRegistry && typeof global.window.TimerRegistry.clearAll === 'function') global.window.TimerRegistry.clearAll();
        if (global.window) {
            if (global.window._uiMirrorIntervalId) { clearInterval(global.window._uiMirrorIntervalId); global.window._uiMirrorIntervalId = null; }
            if (global.window._actionSaveIntervalId) { clearInterval(global.window._actionSaveIntervalId); global.window._actionSaveIntervalId = null; }
            if (global.window._workVisualsObserver && typeof global.window._teardownWorkVisualsObserver === 'function') {
                try { global.window._teardownWorkVisualsObserver(); } catch (e) {}
            }
            if (global.window._workStoneImagesPreloadTimeoutId) { clearTimeout(global.window._workStoneImagesPreloadTimeoutId); global.window._workStoneImagesPreloadTimeoutId = null; }
        }
    } catch (e) { /* best-effort cleanup only */ }

    // Diagnostic: enumerate active handles after cleanup (do NOT force-exit here)
    try {
        const getActive = process._getActiveHandles ? process._getActiveHandles() : (process._getActiveRequests ? process._getActiveRequests() : []);
        const list = (getActive || []).map(h => {
            try {
                const ctor = h && h.constructor ? (h.constructor.name || 'Unknown') : typeof h;
                const info = { type: ctor };
                if (h && typeof h._onTimeout !== 'undefined') info._onTimeout = !!h._onTimeout;
                if (h && typeof h.hasRef === 'function') info.hasRef = h.hasRef();
                return info;
            } catch (e) { return { type: 'error' }; }
        });
        if (list.length) {
            if (process.env && process.env.JEST_DEBUG_HANDLES === '1') {
                console.error('[JEST AFTERENV] Active handles after cleanup:', list);
            }
        }
    } catch (e) { /* ignore */ }
});