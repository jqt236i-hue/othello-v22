/**
 * @file animation-engine.js
 * @description The "Single Visual Writer" – Centralized event-driven animation engine.
 * strictly adheres to 03-visual-rulebook.v2.txt.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(
            require('./animation-constants'),
            require('./stone-visuals')
        );
    } else {
        root.AnimationEngine = factory(root.AnimationConstants, { crossfadeStoneVisual: root.crossfadeStoneVisual });
    }
}(typeof self !== 'undefined' ? self : this, function (Constants, Visuals) {

    const { EVENT_TYPES, FLIP_MS, PHASE_GAP_MS, FADE_IN_MS, FADE_OUT_MS, OVERLAY_CROSSFADE_MS, MOVE_MS } = Constants;

    // Helpers: detect noanim / timer registry
    function _isNoAnim() {
        try {
            if (typeof window !== 'undefined' && window.DISABLE_ANIMATIONS === true) return true;
            if (typeof location !== 'undefined' && /[?&]noanim=1/.test(location.search)) return true;
            if (typeof process !== 'undefined' && (process.env.NOANIM === '1' || process.env.NOANIM === 'true' || process.env.DISABLE_ANIMATIONS === '1')) return true;
        } catch (e) { }
        return false;
    }

    // Ensure minimal telemetry helpers exist even without initializeUI
    if (typeof window !== 'undefined') {
        window.__telemetry__ = window.__telemetry__ || { watchdogFired: 0, singleVisualWriterHits: 0, abortCount: 0 };
        if (typeof window.getTelemetrySnapshot !== 'function') {
            window.getTelemetrySnapshot = function () { return Object.assign({}, window.__telemetry__); };
        }
        if (typeof window.resetTelemetry !== 'function') {
            window.resetTelemetry = function () { window.__telemetry__ = { watchdogFired: 0, singleVisualWriterHits: 0, abortCount: 0 }; };
        }
    }

    function _Timer() {
        if (typeof TimerRegistry !== 'undefined') return TimerRegistry;
        return {
            setTimeout: (fn, ms) => setTimeout(fn, ms),
            clearTimeout: (id) => clearTimeout(id),
            clearAll: () => {},
            pendingCount: () => 0,
            newScope: () => null,
            clearScope: () => {}
        };
    }

    class PlaybackEngine {
        constructor() {
            this.isPlaying = false;
            this.boardEl = document.getElementById('board');
            this.isAborted = false;
            this.playbackScope = null;
            this._remainingEvents = [];
            this._watchdogId = null;
        }

        /**
         * Play a sequence of PlaybackEvents.
         * @param {Array} events - Ordered PlaybackEvents
         * @returns {Promise<void>}
         */
        async play(events) {
            if (this.isPlaying) {
                console.warn('[AnimationEngine] Already playing. Aborting previous...');
                this.isAborted = true;
                // Wait a short settle period
                await new Promise(r => _Timer().setTimeout(r, 100));
                this.isAborted = false;
            }

            // Setup playback scope and flags
            this.isPlaying = true;
            this.playbackScope = (typeof TimerRegistry !== 'undefined' && TimerRegistry.newScope) ? TimerRegistry.newScope() : null;
                // expose scope for animations to register timers under
                if (typeof window !== 'undefined') window._currentPlaybackScope = this.playbackScope;

            // VisualPlaybackActive is the single source of truth during playback
            try {
                window.VisualPlaybackActive = true;
                this.setGlobalInteractionLock(true);

                // Watchdog to prevent permanent freezes
                const WATCHDOG_TIMEOUT_MS = (typeof window !== 'undefined' && Number.isFinite(window.PLAYBACK_WATCHDOG_MS)) ? window.PLAYBACK_WATCHDOG_MS : 10000;
                if (this.playbackScope !== null) {
                    this._watchdogId = _Timer().setTimeout(() => this.handleWatchdog(), WATCHDOG_TIMEOUT_MS, this.playbackScope);
                } else {
                    this._watchdogId = _Timer().setTimeout(() => this.handleWatchdog(), WATCHDOG_TIMEOUT_MS);
                }

                // Group by phase
                const phases = this.groupByPhase(events);
                const sortedPhases = Object.keys(phases).sort((a, b) => Number(a) - Number(b));

                for (const phase of sortedPhases) {
                    if (this.isAborted) break;

                    // Remove processed phases from remainingEvents
                    this._remainingEvents = this._remainingEvents.filter(ev => Number(ev.phase || 0) > Number(phase));

                    const phaseEvents = phases[phase];
                    await this.executePhase(phaseEvents);

                    // Gap between readable phases (Section 3)
                    if (phase !== sortedPhases[sortedPhases.length - 1]) {
                        await this._sleep(PHASE_GAP_MS);
                    }
                }
            } catch (err) {
                console.error('[AnimationEngine] Playback error:', err);
            } finally {
                // cleanup watchdog & scope
                if (this.playbackScope !== null) {
                    _Timer().clearScope(this.playbackScope);
                    this.playbackScope = null;
                }
                // remove exposed scope
                if (typeof window !== 'undefined' && window._currentPlaybackScope) delete window._currentPlaybackScope;
                if (this._watchdogId) {
                    _Timer().clearTimeout(this._watchdogId);
                    this._watchdogId = null;
                }
                this.isPlaying = false;
                this.setGlobalInteractionLock(false);
                window.VisualPlaybackActive = false;
            }
        }

        groupByPhase(events) {
            return events.reduce((acc, ev) => {
                const p = ev.phase || 0;
                if (!acc[p]) acc[p] = [];
                acc[p].push(ev);
                return acc;
            }, {});
        }

        async executePhase(phaseEvents) {
            // Group further by (type, batchKey) to run concurrently within a phase
            // For simplicity, we run all events in a phase concurrently unless otherwise specified.
            const promises = phaseEvents.map(ev => this.executeEvent(ev));
            await Promise.all(promises);
        }

        async _sleep(ms) {
            if (_isNoAnim()) return Promise.resolve();
            return new Promise(resolve => {
                const id = _Timer().setTimeout(resolve, ms, this.playbackScope);
            });
        }

        async handleWatchdog() {
            console.warn('[AnimationEngine] WATCHDOG fired. Forcing playback abort and sync.');
            // Telemetry increment
            if (typeof window !== 'undefined') { window.__telemetry__ = window.__telemetry__ || { watchdogFired: 0, singleVisualWriterHits: 0, abortCount: 0 }; window.__telemetry__.watchdogFired = (window.__telemetry__.watchdogFired || 0) + 1; }
            // Clear timers in this scope and mark aborted
            try {
                if (this.playbackScope !== null) _Timer().clearScope(this.playbackScope);
            } catch (e) { /* best-effort */ }
            this.isAborted = true;
            // Apply final state by requesting a full board sync
            try {
                if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
            } catch (e) { console.error('[AnimationEngine] watchdog emitBoardUpdate failed', e); }
            // Ensure flags cleared
            this.setGlobalInteractionLock(false);
            window.VisualPlaybackActive = false;
        }

        // Abort externally and apply final state (used by Single Visual Writer fallback)
        abortAndSync() {
            console.warn('[AnimationEngine] abortAndSync called — stopping playback and syncing state');
            // Telemetry increment for aborts
            if (typeof window !== 'undefined') { window.__telemetry__ = window.__telemetry__ || { watchdogFired: 0, singleVisualWriterHits: 0, abortCount: 0 }; window.__telemetry__.abortCount = (window.__telemetry__.abortCount || 0) + 1; }
            try {
                if (this.playbackScope !== null) _Timer().clearScope(this.playbackScope);
            } catch (e) { }
            this.isAborted = true;
            this.setGlobalInteractionLock(false);
            window.VisualPlaybackActive = false;
            try { if (typeof emitBoardUpdate === 'function') emitBoardUpdate(); } catch (e) { }
        }

        async executeEvent(ev) {
            switch (ev.type) {
                case EVENT_TYPES.PLACE:
                    return this.handlePlace(ev);
                case EVENT_TYPES.FLIP:
                    return this.handleFlip(ev);
                case EVENT_TYPES.DESTROY:
                    return this.handleDestroy(ev);
                case EVENT_TYPES.SPAWN:
                    return this.handleSpawn(ev);
                case EVENT_TYPES.MOVE:
                    return this.handleMove(ev);
                case EVENT_TYPES.STATUS_APPLIED:
                case EVENT_TYPES.STATUS_REMOVED:
                    return this.handleStatusChange(ev);
                case EVENT_TYPES.LOG:
                    this.log(ev.message);
                    return Promise.resolve();
                default:
                    console.warn('[AnimationEngine] Unhandled event type:', ev.type);
                    // Fallback: apply state immediately (Section 1.1)
                    this.applyFinalStates(ev);
                    return Promise.resolve();
            }
        }

        // --- Visual Primitive Handlers ---

        async handlePlace(ev) {
            for (const t of ev.targets) {
                const cell = this.getCellEl(t.r, t.col);
                if (!cell) continue;

                const after = t.after || {};
                const disc = this.createDisc(after);

                // Section 5.1: Disc appears with final color/visuals immediately.
                // Optional fade-in.
                cell.innerHTML = '';
                cell.appendChild(disc);

                disc.classList.add('stone-instant', 'stone-hidden-all');
                disc.offsetHeight; // force reflow
                disc.classList.remove('stone-instant');
                disc.classList.remove('stone-hidden-all');
                // FADE_IN_MS is handled by CSS transition on .disc
            }
            return this._sleep(FADE_IN_MS);
        }

        async handleFlip(ev) {
            const promises = ev.targets.map(async t => {
                const cell = this.getCellEl(t.r, t.col);
                const disc = cell?.querySelector('.disc');
                if (!disc) return;

                const after = t.after || {};

                // Section 1.4 "Spec B": Swap visuals immediately, then motion.
                this.syncDiscVisual(disc, after);

                disc.classList.remove('flip');
                disc.offsetHeight; // reset animation
                // flip animation suppressed (visual-only change)

                return this._sleep(FLIP_MS);
            });
            await Promise.all(promises);
        }

        async handleDestroy(ev) {
            const promises = ev.targets.map(async t => {
                const cell = this.getCellEl(t.r, t.col);
                const disc = cell?.querySelector('.disc');
                if (!disc) return;

                // Section 5.3: Fade out, fixed geometry, then remove.
                disc.classList.add('destroy-fade');
                await this._sleep(FADE_OUT_MS);
                cell.innerHTML = '';
            });
            await Promise.all(promises);
        }

        async handleSpawn(ev) {
            // Spawn is similar to place but explicitly for card-induced spawning
            return this.handlePlace(ev);
        }

        async handleMove(ev) {
            const promises = ev.targets.map(async t => {
                const fromCell = this.getCellEl(t.from.r, t.from.col);
                const toCell = this.getCellEl(t.to.r, t.to.col);
                const disc = fromCell?.querySelector('.disc');
                if (!disc || !toCell) return;

                // Section 5.5: Straight-line interpolation via ghost
                const fromRect = fromCell.getBoundingClientRect();
                const toRect = toCell.getBoundingClientRect();

                // If no-animations mode, skip animation and perform immediate DOM move
                if (_isNoAnim()) {
                    try {
                        toCell.innerHTML = '';
                        disc.style.visibility = 'visible';
                        toCell.appendChild(disc);
                        fromCell.innerHTML = '';
                    } catch (e) {
                        // best-effort
                    }
                    return;
                }

                const ghost = disc.cloneNode(true);
                ghost.classList.add('stone-instant');
                document.body.appendChild(ghost);

                ghost.style.position = 'fixed';
                ghost.style.top = `${fromRect.top + fromRect.height * 0.09}px`;
                ghost.style.left = `${fromRect.left + fromRect.width * 0.09}px`;
                ghost.style.width = `${fromRect.width * 0.82}px`;
                ghost.style.height = `${fromRect.height * 0.82}px`;
                ghost.style.margin = '0';
                ghost.style.zIndex = '1000';

                disc.style.visibility = 'hidden';

                const anim = ghost.animate([
                    { transform: 'translate(0, 0)' },
                    { transform: `translate(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px)` }
                ], {
                    duration: MOVE_MS,
                    easing: 'cubic-bezier(0.2, 0.85, 0.3, 1)'
                });

                await anim.finished;

                // Cleanup
                toCell.innerHTML = '';
                disc.style.visibility = 'visible';
                toCell.appendChild(disc);
                fromCell.innerHTML = '';
                ghost.remove();
            });
            await Promise.all(promises);
        }

        async handleStatusChange(ev) {
            const promises = ev.targets.map(async t => {
                const cell = this.getCellEl(t.r, t.col);
                const disc = cell?.querySelector('.disc');
                if (!disc) return;

                const after = t.after || {};
                const effectKey = window.getEffectKeyForSpecialType(after.special);

                // Section 1.5: True Cross-Fade via overlay
                if (Visuals.crossfadeStoneVisual) {
                    await Visuals.crossfadeStoneVisual(disc, {
                        effectKey: effectKey,
                        owner: after.color, // Usually owner is same as color for these
                        durationMs: OVERLAY_CROSSFADE_MS,
                        newColor: after.color,
                        fadeIn: !!after.special
                    });
                } else {
                    this.syncDiscVisual(disc, after);
                }
            });
            await Promise.all(promises);
        }

        // --- Helpers ---

        getCellEl(r, c) {
            return this.boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
        }

        createDisc(state) {
            const disc = document.createElement('div');
            disc.className = 'disc';
            this.syncDiscVisual(disc, state);
            return disc;
        }

        syncDiscVisual(disc, state) {
            if (!state) return;
            disc.classList.remove('black', 'white');
            if (state.color === 1) disc.classList.add('black');
            else if (state.color === -1) disc.classList.add('white');

            if (state.special) {
                const effectKey = window.getEffectKeyForSpecialType(state.special);
                if (window.applyStoneVisualEffect && effectKey) {
                    window.applyStoneVisualEffect(disc, effectKey, { owner: state.color });
                }
            } else {
                // Clear all special icons
                disc.classList.remove('special-stone');
                disc.style.removeProperty('--special-stone-image');
            }

            // Timer handling
            const existingTimer = disc.querySelector('.stone-timer');
            if (state.timer != null && state.timer > 0) {
                if (!existingTimer) {
                    const timer = document.createElement('div');
                    timer.className = 'stone-timer bomb-timer'; // reuse class for now
                    timer.textContent = state.timer;
                    disc.appendChild(timer);
                } else {
                    existingTimer.textContent = state.timer;
                }
            } else if (existingTimer) {
                existingTimer.remove();
            }
        }

        applyFinalStates(ev) {
            // Fallback: use per-target provided 'after' states when available
            for (const t of ev.targets || []) {
                const state = t.after || { color: 0, special: null, timer: null };
                const [r, c] = [t.r, t.col];
                const cell = this.getCellEl(r, c);
                if (!cell) continue;
                if (state.color === 0) {
                    cell.innerHTML = '';
                } else {
                    let disc = cell.querySelector('.disc');
                    if (!disc) {
                        disc = this.createDisc(state);
                        cell.appendChild(disc);
                    }
                    this.syncDiscVisual(disc, state);
                }
            }
        }

        setGlobalInteractionLock(locked) {
            window.isProcessing = locked;
            window.isCardAnimating = locked; // legacy flag
            // VisualPlaybackActive is the single source of truth for playback state
            window.VisualPlaybackActive = locked;
            if (this.boardEl) {
                if (locked) this.boardEl.classList.add('playback-locked');
                else this.boardEl.classList.remove('playback-locked');
            }
        }

        log(msg) {
            if (window.addLog) window.addLog(msg);
            else console.log('[LOG]', msg);
        }
    }

    return new PlaybackEngine();
}));
