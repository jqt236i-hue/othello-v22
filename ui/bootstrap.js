(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.UIBootstrap = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function addLog(text) {
        try {
            const logEl = (typeof document !== 'undefined') ? document.getElementById('log') : null;
            if (logEl) {
                const entry = document.createElement('div');
                entry.className = 'logEntry';
                entry.textContent = String(text);
                logEl.appendChild(entry);
                try { logEl.scrollTop = logEl.scrollHeight; } catch (e) { if (logEl && logEl.parentElement) logEl.parentElement.scrollTop = logEl.parentElement.scrollHeight; }
                return;
            }
        } catch (e) {
            // ignore DOM errors
        }
        if (typeof console !== 'undefined' && console.log) console.log('[log]', String(text));
    }

    function updateBgmButtons() {
        try {
            const bgmPlayBtn = (typeof document !== 'undefined') ? document.getElementById('bgmPlayBtn') : null;
            const bgmPauseBtn = (typeof document !== 'undefined') ? document.getElementById('bgmPauseBtn') : null;
            if (typeof SoundEngine !== 'undefined' && SoundEngine.allowBgmPlay && !SoundEngine.bgm?.paused) {
                if (bgmPlayBtn) bgmPlayBtn.classList.add('btn-active');
                if (bgmPauseBtn) bgmPauseBtn.classList.remove('btn-active');
            } else {
                if (bgmPlayBtn) bgmPlayBtn.classList.remove('btn-active');
                if (bgmPauseBtn) bgmPauseBtn.classList.add('btn-active');
            }
        } catch (e) {
            // defensive no-op
        }
    }

    function updateStatus() {
        try {
            if (typeof updateCpuCharacter === 'function') {
                updateCpuCharacter();
            }
        } catch (e) { /* no-op */ }
    }

    // export to global/window for non-module callers
    if (typeof window !== 'undefined') {
        try { window.addLog = addLog; } catch (e) {}
        try { window.updateBgmButtons = updateBgmButtons; } catch (e) {}
        try { window.updateStatus = updateStatus; } catch (e) {}
    }

    // DI: Install game-side implementations (timers, UI helpers)
    function installGameDI() {
        // Timers implementation using browser timing APIs
        const timersImpl = {
            waitMs: (ms) => new Promise((resolve) => {
                try {
                    if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') return window.setTimeout(resolve, ms);
                    return setTimeout(resolve, ms);
                } catch (e) { setTimeout(resolve, ms); }
            }),
            requestFrame: () => new Promise((resolve) => {
                try {
                    if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(resolve);
                    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') return window.requestAnimationFrame(resolve);
                    setTimeout(resolve, 0);
                } catch (e) { setTimeout(resolve, 0); }
            })
        };

        // Inject into game/timers when available
        try {
            const gameTimers = require('../game/timers');
            if (gameTimers && typeof gameTimers.setTimerImpl === 'function') gameTimers.setTimerImpl(timersImpl);
        } catch (e) { /* ignore in non-module UI contexts */ }

        // Helper to connect UI modules to their game counterparts
        const connect = (uiPath, gamePath, mapFn) => {
            try {
                const uiMod = require(uiPath);
                const gameMod = require(gamePath);
                if (gameMod && typeof gameMod.setUIImpl === 'function') {
                    const impl = mapFn ? mapFn(uiMod, timersImpl) : uiMod;
                    gameMod.setUIImpl(impl || {});
                }
            } catch (e) { /* ignore missing modules in headless contexts */ }
        };

        // Move visuals
        connect('./move-executor-visuals', '../game/move-executor-visuals', (uiMod) => ({
            applyFlipAnimations: uiMod.applyFlipAnimations,
            setDiscColorAt: uiMod.setDiscColorAt,
            removeBombOverlayAt: uiMod.removeBombOverlayAt,
            clearAllStoneVisualEffectsAt: uiMod.clearAllStoneVisualEffectsAt,
            syncDiscVisualToCurrentState: uiMod.syncDiscVisualToCurrentState,
            getFlipAnimMs: uiMod.getFlipAnimMs,
            getPhaseGapMs: uiMod.getPhaseGapMs,
            getTurnTransitionGapMs: uiMod.getTurnTransitionGapMs,
            animateFlipsWithDeferredColor: uiMod.animateFlipsWithDeferredColor,
            animateRegenBack: uiMod.animateRegenBack,
            applyPendingSpecialstoneVisual: uiMod.applyPendingSpecialstoneVisual,
            runMoveVisualSequence: uiMod.runMoveVisualSequence
        }));

        // Provide scheduling helper to game/move-executor so CPU turns are delayed to allow visuals to complete
        connect('./move-executor-visuals', '../game/move-executor', (uiMod, timers) => ({
            scheduleCpuTurn: (ms, cb) => { return timers.waitMs(ms || 0).then(cb); }
        }));

        // Visual effects map
        connect('./visual-effects-map', '../game/visual-effects-map', (uiMod) => ({
            applyStoneVisualEffect: uiMod.applyStoneVisualEffect,
            removeStoneVisualEffect: uiMod.removeStoneVisualEffect,
            getSupportedEffectKeys: uiMod.getSupportedEffectKeys,
            __setSpecialStoneScaleImpl__: uiMod.__setSpecialStoneScaleImpl__ || function(scale) { if (typeof window !== 'undefined' && window.setSpecialStoneScale) window.setSpecialStoneScale(scale); }
        }));

        // Turn manager helpers (readCpuSmartness / scheduleCpuTurn / isDocumentHidden / pulseDeckUI)
        try {
            const tm = require('../game/turn-manager');
            if (tm && typeof tm.setUIImpl === 'function') {
                tm.setUIImpl({
                    readCpuSmartness: () => ({ black: 1, white: 1 }),
                    isDocumentHidden: () => (typeof document !== 'undefined' && document.hidden) || false,
                    pulseDeckUI: () => {},
                    scheduleCpuTurn: (ms, cb) => { timersImpl.waitMs(ms || 0).then(cb); }
                });
            }
        } catch (e) { /* ignore */ }

        // Special-effects UI hooks: many modules accept setUIImpl; wire basic helpers
        const specialModules = ['../game/special-effects/breeding', '../game/special-effects/dragons', '../game/special-effects/hyperactive'];
        for (const p of specialModules) {
            try {
                const m = require(p);
                if (m && typeof m.setUIImpl === 'function') {
                    m.setUIImpl({ /* currently no-op placeholders; UI modules provide visuals */ });
                }
            } catch (e) { /* ignore */ }
        }

        return { timersImpl };
    }

    // Auto-install in browser contexts (idempotent)
    try {
        if (typeof window !== 'undefined') {
            installGameDI();
        }
    } catch (e) { /* ignore */ }

    if (typeof module !== 'undefined' && module.exports) {
        return { addLog, updateBgmButtons, updateStatus, installGameDI };
    }

    return { addLog, updateBgmButtons, updateStatus, installGameDI };
}));