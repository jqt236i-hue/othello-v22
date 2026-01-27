/* TimerRegistry
 * Lightweight wrapper around setTimeout/clearTimeout to allow
 * - central pending count tracking
 * - clearAll / clearScope for resets (play/skip/reset/newGame)
 * - scoping timers to an execution scope (AnimationEngine.play)
 * - injectable mock in tests
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TimerRegistry = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    const timers = new Map(); // id -> handle
    const timerScopes = new Map(); // scopeId -> Set(timerId)
    let nextId = 1;
    let nextScopeId = 1;

    function set(fn, ms, scopeId) {
        const id = nextId++;
        const handle = setTimeout(() => {
            // Remove from registry before executing so pendingCount reflects accurate state
            timers.delete(id);
            if (scopeId && timerScopes.has(scopeId)) {
                const s = timerScopes.get(scopeId);
                s.delete(id);
                if (s.size === 0) timerScopes.delete(scopeId);
            }
            try { fn(); } catch (e) { console.error('[TimerRegistry] Timer callback error', e); }
        }, ms);
        timers.set(id, handle);
        if (scopeId) {
            if (!timerScopes.has(scopeId)) timerScopes.set(scopeId, new Set());
            timerScopes.get(scopeId).add(id);
        }
        return id;
    }

    function clear(id) {
        const handle = timers.get(id);
        if (handle) {
            clearTimeout(handle);
            timers.delete(id);
            // Also remove from any scope set
            for (const [scopeId, setIds] of timerScopes.entries()) {
                if (setIds.has(id)) {
                    setIds.delete(id);
                    if (setIds.size === 0) timerScopes.delete(scopeId);
                    break;
                }
            }
        }
    }

    function clearAll() {
        for (const [id, handle] of timers.entries()) {
            clearTimeout(handle);
        }
        timers.clear();
        timerScopes.clear();
    }

    function pendingCount() {
        return timers.size;
    }

    function newScope() {
        const id = nextScopeId++;
        timerScopes.set(id, new Set());
        return id;
    }

    function clearScope(scopeId) {
        const setIds = timerScopes.get(scopeId);
        if (!setIds) return;
        for (const id of Array.from(setIds)) {
            const h = timers.get(id);
            if (h) clearTimeout(h);
            timers.delete(id);
        }
        timerScopes.delete(scopeId);
    }

    return {
        setTimeout: set,
        clearTimeout: clear,
        clearAll,
        pendingCount,
        newScope,
        clearScope
    };
}));