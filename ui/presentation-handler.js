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

    async function onBoardUpdated() {
        try {
            // Pull presentation events from CardLogic (best-effort)
            let events = [];
            if (typeof CardLogic !== 'undefined' && typeof CardLogic.flushPresentationEvents === 'function') {
                try {
                    events = CardLogic.flushPresentationEvents(cardState) || [];
                } catch (e) { events = []; }
            }
            // Fallback: if flush returned nothing, consume the persistent copy saved by emitPresentationEvent
            console.log('[PRESENTATION_DEBUG] persistLen', cardState && cardState._presentationEventsPersist ? cardState._presentationEventsPersist.length : 0);
            if ((!events || events.length === 0) && cardState && Array.isArray(cardState._presentationEventsPersist) && cardState._presentationEventsPersist.length) {
                events = cardState._presentationEventsPersist.slice();
                cardState._presentationEventsPersist.length = 0;
                console.log('[PRESENTATION_DEBUG] onBoardUpdated consumed persistent presentation events, count', events.length);
            }
            console.log('[PRESENTATION_DEBUG] onBoardUpdated invoked, events count', events.length);
            // Process events sequentially
            for (const ev of events) {
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

    // Export for tests
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { onBoardUpdated, handlePresentationEvent };
    }
})();