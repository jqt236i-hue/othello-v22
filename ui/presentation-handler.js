// Presentation event handler: subscribes to board updates and dispatches presentation events to UI
(function () {
    function handlePresentationEvent(ev) {
        try {
            console.log('[PRESENTATION_DEBUG] handlePresentationEvent invoked', ev && ev.type, ev);
            if (!ev || !ev.type) return;
            // Handle cross-fade stone request
            if (ev.type === 'CROSSFADE_STONE') {
                const { row, col, effectKey, owner, newColor, durationMs, autoFadeOut, fadeWholeStone } = ev;
                // Robust application: attempt to apply visual multiple times until the renderer stabilizes.
                (function tryApply(retries) {
                    try {
                        const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                        const disc = cell ? cell.querySelector('.disc') : null;
                        if (!disc) {
                            if (retries > 0) setTimeout(() => tryApply(retries - 1), 80);
                            return;
                        }

                        // Ensure disc DOM matches current state to avoid being overwritten by renderer later
                        try { if (typeof syncDiscVisualToCurrentState === 'function') syncDiscVisualToCurrentState(row, col); } catch (e) { }
                        // Prefer the crossfade helper if available (it delegates to applyStoneVisualEffect internally)
                        try { console.log('[PRESENTATION_DEBUG] tryApply invoking visual helper; hasCrossfade:', typeof crossfadeStoneVisual === 'function', 'hasApply:', typeof applyStoneVisualEffect === 'function'); } catch (e) {}
                        if (typeof crossfadeStoneVisual === 'function') {
                            try { crossfadeStoneVisual(disc, { effectKey, owner, newColor, durationMs, autoFadeOut, fadeWholeStone }).catch(() => {}); } catch (e) { console.warn('[PRESENTATION_DEBUG] crossfadeStoneVisual error', e); }
                        } else if (typeof applyStoneVisualEffect === 'function') {
                            try { applyStoneVisualEffect(disc, effectKey, { owner }); } catch (e) { console.warn('[PRESENTATION_DEBUG] applyStoneVisualEffect error', e); }
                        }

                        // Debug: log current classes after trying to apply
                        try { console.log('[PRESENTATION_DEBUG] tryApply classes after attempt:', disc && disc.className); } catch (e) {}

                        // If applied successfully (special-stone class present), stop retrying
                        try {
                            if (disc.classList && disc.classList.contains('special-stone')) return;
                        } catch (e) { }

                        // Otherwise retry a few more times to survive renderer overwrites
                        if (retries > 0) setTimeout(() => tryApply(retries - 1), 80);
                        else {
                            // Final fallback: forcibly apply classes and css var from STONE_VISUAL_EFFECTS to guarantee UI shows something
                            try {
                                const cellF = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                                const discF = cellF ? cellF.querySelector('.disc') : null;
                                if (discF) {
                                    const eff = (typeof window !== 'undefined' && window.STONE_VISUAL_EFFECTS) ? window.STONE_VISUAL_EFFECTS[effectKey] : null;
                                    if (eff) {
                                        try { discF.classList.add('special-stone'); } catch (e) {}
                                        try { discF.classList.add(eff.cssClass); } catch (e) {}
                                        if (eff.cssMethod === 'background') {
                                            let imagePath = eff.imagePath;
                                            if (eff.imagePathByOwner && owner !== undefined) {
                                                const ownerKey = (owner === 1) ? '1' : '-1';
                                                imagePath = eff.imagePathByOwner[ownerKey] || imagePath;
                                            }
                                            try { discF.style.setProperty('--special-stone-image', `url('${imagePath}')`); } catch (e) {}
                                            try { discF.style.backgroundImage = `url('${imagePath}')`; } catch (e) {}
                                        } else if (eff.cssMethod === 'pseudoElement' && eff.imagePathByOwner && owner !== undefined) {
                                            try { discF.classList.add(owner === 1 ? 'ud-black' : 'ud-white'); } catch (e) {}
                                            const ownerKey = owner === 1 ? '1' : '-1';
                                            const imagePath2 = eff.imagePathByOwner[ownerKey] || null;
                                            if (imagePath2) {
                                                try { discF.style.setProperty('--special-stone-image', `url('${imagePath2}')`); } catch (e) {}
                                            }
                                        }
                                    }
                                }
                            } catch (e) { }
                        }
                    } catch (e) {
                        if (retries > 0) setTimeout(() => tryApply(retries - 1), 80);
                    }
                })(5);
            }

            if (ev.type === 'PROTECTION_EXPIRE') {
                // UI can animate protection expiry; provide default no-op if not present
                if (typeof animateProtectionExpireAt === 'function') {
                    try { animateProtectionExpireAt(ev.row, ev.col); } catch (e) { }
                }
            }

        } catch (e) {
            console.error('[PresentationHandler] handlePresentationEvent error', e);
        }
    }

    // UI DI: allow UI to register scheduleCpuTurn impl
    let __presentation_ui_impl = {};
    function setUIImpl(obj) { __presentation_ui_impl = obj || {}; }

    // Helper: get configurable dedupe window (ms) for CPU fallback calls
    function getCpuDedupeMs() {
        try {
            if (typeof window !== 'undefined' && typeof window.CPU_DEDUPE_MS === 'number') return window.CPU_DEDUPE_MS;
            if (typeof global !== 'undefined' && typeof global.CPU_DEDUPE_MS === 'number') return global.CPU_DEDUPE_MS;
        } catch (e) { /* ignore */ }
        return 150;
    }

    async function onBoardUpdated() {
        try {
            // Pull presentation events from CardLogic (best-effort)
            let events = [];
            if (typeof CardLogic !== 'undefined' && typeof CardLogic.flushPresentationEvents === 'function') {
                try {
                    events = CardLogic.flushPresentationEvents(cardState) || [];
                } catch (e) { events = []; }
            }

            // Fallback: if flush returned nothing, try in-memory presentation events first
            console.log('[PRESENTATION_DEBUG] persistLen', cardState && cardState._presentationEventsPersist ? cardState._presentationEventsPersist.length : 0);
            if ((!events || events.length === 0) && cardState && Array.isArray(cardState.presentationEvents) && cardState.presentationEvents.length) {
                events = cardState.presentationEvents.slice();
                cardState.presentationEvents.length = 0;
                console.log('[PRESENTATION_DEBUG] onBoardUpdated consumed cardState.presentationEvents, count', events.length);
            }
            // Fallback: then consume the persistent copy saved by emitPresentationEvent
            if ((!events || events.length === 0) && cardState && Array.isArray(cardState._presentationEventsPersist) && cardState._presentationEventsPersist.length) {
                events = cardState._presentationEventsPersist.slice();
                cardState._presentationEventsPersist.length = 0;
                console.log('[PRESENTATION_DEBUG] onBoardUpdated consumed persistent presentation events, count', events.length);
            }

            console.log('[PRESENTATION_DEBUG] onBoardUpdated invoked, events count', events.length);

            // First, let the UI PlaybackEngine consume playback events (excluding SCHEDULE_CPU_TURN)
            try {
                const Playback = (typeof window !== 'undefined' && window.PlaybackEngine) ? window.PlaybackEngine : (typeof require === 'function' ? require('../ui/playback-engine') : null);
                if (Playback && typeof Playback.playPresentationEvents === 'function') {
                    try {
                        const playbackOnly = (events || []).filter(e => e.type !== 'SCHEDULE_CPU_TURN');
                        if (playbackOnly.length) {
                            await Playback.playPresentationEvents({ presentationEvents: playbackOnly }, {
                                AnimationEngine: (typeof window !== 'undefined' ? window.AnimationEngine : null),
                                scheduleCpuTurn: (delay, cb) => setTimeout(cb, delay),
                                onSchedule: (ev) => {
                                    // Prefer UI-supplied schedule function if present
                                    if (__presentation_ui_impl && typeof __presentation_ui_impl.scheduleCpuTurn === 'function') {
                                        try {
                                            __presentation_ui_impl.scheduleCpuTurn(ev.delayMs || 0, ev);
                                            console.log('[PresentationHandler] used UIImpl.scheduleCpuTurn via Playback onSchedule', ev);
                                        } catch (e) { console.error('[PresentationHandler] UIImpl.scheduleCpuTurn threw', e); }
                                        return;
                                    }

                                    // Fallback: if UI doesn't provide a scheduler, defer CPU invocation by the requested delay
                                    // This avoids immediate CPU runs during Playback when __presentation_ui_impl may not yet be registered.
                                    try {
                                        const delayMs = Number.isFinite(ev.delayMs) ? ev.delayMs : 0;
                                        setTimeout(() => {
                                            try {
                                                const cpu = require('../cpu/cpu-turn');
                                                if (cpu && typeof cpu.processCpuTurn === 'function') { cpu.processCpuTurn(); console.log('[PresentationHandler] processCpuTurn invoked via Playback onSchedule (module)'); return; }
                                            } catch (e) { /* ignore require errors in browser envs */ }
                                            const cpuFn =
                                                (typeof globalThis !== 'undefined' && typeof globalThis.processCpuTurn === 'function') ? globalThis.processCpuTurn :
                                                (typeof window !== 'undefined' && typeof window.processCpuTurn === 'function') ? window.processCpuTurn :
                                                null;
                                            if (cpuFn) {
                                                try { cpuFn(); console.log('[PresentationHandler] processCpuTurn invoked via Playback onSchedule fallback'); } catch (e) { console.error('[PresentationHandler] processCpuTurn threw', e); }
                                            } else {
                                                console.warn('[PresentationHandler] scheduleCpuTurn not available and no global processCpuTurn; SCHEDULE_CPU_TURN ignored via Playback', ev);
                                            }
                                        }, delayMs);
                                    } catch (e) { console.error('[PresentationHandler] SCHEDULE_CPU_TURN playback fallback scheduling failed', e); }
                                }
                            });
                        }
                    } catch (e) { /* continue to event fallback */ }
                }
            } catch (e) { /* ignore require errors in some envs */ }

            // Process events sequentially (SCHEDULE_CPU_TURN is handled here to avoid duplication)
            for (const ev of events) {
                if (ev && ev.type === 'SCHEDULE_CPU_TURN') {
                    const delay = Number.isFinite(ev.delayMs) ? ev.delayMs : 0;

                    // Diagnostic: record scheduling request origin + human mode
                    try { const humanMode = (typeof window !== 'undefined' && typeof window.HUMAN_PLAY_MODE === 'string') ? window.HUMAN_PLAY_MODE : null; try { console.log('[DIAG][PRES] SCHEDULE_CPU_TURN requested', { ev, delay, humanMode, time: Date.now(), stack: (new Error()).stack.split('\n').slice(1,6).join('\n') }); } catch(e){} } catch(e){}

                    // Deduplicate scheduling: do not schedule another CPU turn if one is pending
                    if (cardState && cardState.__cpuScheduled) {
                        console.log('[PRESENTATION_DEBUG] SCHEDULE_CPU_TURN already scheduled, skipping', ev);
                        continue;
                    }

                    if (__presentation_ui_impl && typeof __presentation_ui_impl.scheduleCpuTurn === 'function') {
                        try {
                            // Mark as scheduled and call UI impl; accept optional callback to clear flag
                            if (cardState) cardState.__cpuScheduled = true;
                            const maybePromise = __presentation_ui_impl.scheduleCpuTurn(delay, () => {
                                try {
                                    if (cardState) cardState.__cpuScheduled = false;
                                    // UI impl may call CPU itself; but ensure CPU is invoked if it did not
                                    try {
                                        console.log('[DIAG][PRES] UIImpl callback invoked, attempting CPU fallback if needed', { humanMode: (typeof window !== 'undefined' ? window.HUMAN_PLAY_MODE : null), time: Date.now(), stack: (new Error()).stack.split('\n').slice(1,6).join('\n') });
                                        // Dedupe: skip invoking CPU if it has run very recently to avoid double-calls
                                        const lastCpuRun = (typeof window !== 'undefined' && typeof window.__cpuLastRunAt === 'number') ? window.__cpuLastRunAt : ((typeof global !== 'undefined' && typeof global.__cpuLastRunAt === 'number') ? global.__cpuLastRunAt : null);
                                        const dedupeMs = getCpuDedupeMs();
                                        if (lastCpuRun && (Date.now() - lastCpuRun) < dedupeMs) {
                                            console.log('[DIAG][PRES] skipping CPU fallback: recent CPU run detected', { since: Date.now() - lastCpuRun, dedupeMs });
                                        } else {
                                            const cpu = require('../cpu/cpu-turn');
                                            if (cpu && typeof cpu.processCpuTurn === 'function') cpu.processCpuTurn();
                                        }
                                    } catch (e) { /* ignore module load errors in some contexts */ }
                                } catch (e) { console.error('[PRESENTATION_DEBUG] UIImpl callback error', e); }
                            });
                            // If UI impl returned a promise, clear flag when resolved as extra safety
                            if (maybePromise && typeof maybePromise.then === 'function') {
                                maybePromise.then(() => { if (cardState) cardState.__cpuScheduled = false; }).catch(() => { if (cardState) cardState.__cpuScheduled = false; });
                            }

                            console.log('[PRESENTATION_DEBUG] SCHEDULE_CPU_TURN scheduled via UIImpl', ev);
                        } catch (e) { console.error('[PRESENTATION_DEBUG] UIImpl.scheduleCpuTurn threw', e); if (cardState) cardState.__cpuScheduled = false; }
                    } else {
                        try {
                            if (cardState) cardState.__cpuScheduled = true;
                            setTimeout(() => {
                                try {
                                    if (cardState) cardState.__cpuScheduled = false;
                                    // Dedupe check before invoking CPU in fallback path
                                    try {
                                        const lastCpuRun = (typeof window !== 'undefined' && typeof window.__cpuLastRunAt === 'number') ? window.__cpuLastRunAt : ((typeof global !== 'undefined' && typeof global.__cpuLastRunAt === 'number') ? global.__cpuLastRunAt : null);
                                        const dedupeMs2 = getCpuDedupeMs();
                                        if (lastCpuRun && (Date.now() - lastCpuRun) < dedupeMs2) {
                                            console.log('[DIAG][PRES] skipping fallback CPU call: recent CPU run detected', { since: Date.now() - lastCpuRun, dedupeMs: dedupeMs2 });
                                            return;
                                        }
                                    } catch (e) { /* ignore */ }
                                    // Prefer direct module call so tests and non-global environments work
                                    try {
                                        console.log('[DIAG][PRES] fallback SCHEDULE_CPU_TURN execution: attempting module cpu', { humanMode: (typeof window !== 'undefined' ? window.HUMAN_PLAY_MODE : null), time: Date.now(), stack: (new Error()).stack.split('\n').slice(1,6).join('\n') });
                                        const cpu = require('../cpu/cpu-turn');
                                        if (cpu && typeof cpu.processCpuTurn === 'function') { cpu.processCpuTurn(); return; }
                                    } catch (e) { /* ignore require failure in browser contexts */ }
                                    const cpuFn = (typeof globalThis !== 'undefined' && typeof globalThis.processCpuTurn === 'function') ? globalThis.processCpuTurn : (typeof window !== 'undefined' && typeof window.processCpuTurn === 'function') ? window.processCpuTurn : null;
                                    if (cpuFn) { console.log('[DIAG][PRES] calling global cpuFn', { humanMode: (typeof window !== 'undefined' ? window.HUMAN_PLAY_MODE : null)}); cpuFn(); }
                                    else console.warn('[PRESENTATION_DEBUG] no cpuFn available for SCHEDULE_CPU_TURN (ignored)', ev);
                                } catch (e) { console.error('[PRESENTATION_DEBUG] SCHEDULE_CPU_TURN execution threw', e); if (cardState) cardState.__cpuScheduled = false; }
                            }, delay);
                        } catch (e) { console.error('[PRESENTATION_DEBUG] SCHEDULE_CPU_TURN scheduling failed', e); if (cardState) cardState.__cpuScheduled = false; }
                    }
                    continue;
                }
                handlePresentationEvent(ev);
            }
        } catch (e) {
            console.error('[PresentationHandler] onBoardUpdated error', e);
        }
    }

    // Subscribe to board updates if event system available
    if (typeof GameEvents !== 'undefined' && GameEvents.gameEvents && GameEvents.EVENT_TYPES) {
        GameEvents.gameEvents.on(GameEvents.EVENT_TYPES.BOARD_UPDATED, onBoardUpdated);
    } else {
        // Fallback: patch emitBoardUpdate to call handler
        const origEmit = typeof emitBoardUpdate === 'function' ? emitBoardUpdate : null;
        window.emitBoardUpdate = function () {
            try {
                if (origEmit) origEmit();
            } catch (e) { /* ignore */ }
            try {
                console.log('[PRESENTATION_DEBUG] emitBoardUpdate wrapper invoked');
                if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
                    window.requestAnimationFrame(() => {
                        console.log('[PRESENTATION_DEBUG] emitBoardUpdate first rAF');
                        // Schedule one more frame to run after paint so renderer updates do not overwrite visuals
                        window.requestAnimationFrame(() => { try { console.log('[PRESENTATION_DEBUG] emitBoardUpdate second rAF -> calling onBoardUpdated'); onBoardUpdated(); } catch (e) { } });
                    });
                } else {
                    setTimeout(() => { try { console.log('[PRESENTATION_DEBUG] emitBoardUpdate setTimeout -> calling onBoardUpdated'); onBoardUpdated(); } catch (e) { } }, 60);
                }
            } catch (e) { /* ignore */ }
        };
    }

    // Export for tests and DI
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { onBoardUpdated, handlePresentationEvent, setUIImpl };
    }
})();
