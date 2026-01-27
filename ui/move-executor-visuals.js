(function () {
// UI-side visual helpers and animation sequence for move execution
// This file contains DOM-manipulating code and is intended to run in browser/UI context.

// Visual helpers and animation sequence for move execution

function _assertNotDuringPlayback() {
    if (typeof window !== 'undefined' && window.VisualPlaybackActive === true) {
        if (typeof window !== 'undefined' && window.__DEV__ === true) {
            throw new Error('Legacy visual helper called during active VisualPlayback (dev fail-fast)');
        } else {
            console.error('Legacy visual helper called during active VisualPlayback. Aborting playback and syncing final state (prod fallback)');
            if (typeof window !== 'undefined') { window.__telemetry__ = window.__telemetry__ || { watchdogFired: 0, singleVisualWriterHits: 0, abortCount: 0 }; window.__telemetry__.singleVisualWriterHits = (window.__telemetry__.singleVisualWriterHits || 0) + 1; }
            if (typeof AnimationEngine !== 'undefined' && AnimationEngine && typeof AnimationEngine.abortAndSync === 'function') {
                AnimationEngine.abortAndSync();
            }
            return false;
        }
    }
    return true;
}

// Local NOANIM helper (mirrors logic in ui/stone-visuals.js)
function _isNoAnim() {
    try {
        if (typeof window !== 'undefined' && window.DISABLE_ANIMATIONS === true) return true;
        if (typeof location !== 'undefined' && /[?&]noanim=1/.test(location.search)) return true;
        if (typeof process !== 'undefined' && (process.env.NOANIM === '1' || process.env.NOANIM === 'true' || process.env.DISABLE_ANIMATIONS === '1')) return true;
    } catch (e) { }
    return false;
}

function applyFlipAnimations(flipsToAnimate) {
    if (!_assertNotDuringPlayback()) return;
    // Defer to the next frame to avoid clobbering by synchronous DOM updates
    requestAnimationFrame(() => {
        flipsToAnimate.forEach(([r, c]) => {
            const cell = boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
            const disc = cell ? cell.querySelector('.disc') : null;
            if (disc) {
                disc.classList.remove('flip');
                void disc.offsetWidth;
                // flip animation suppressed (visual-only change)
                console.log(`Suppressed flip animation for (${r},${c})`);
            }
        });
    });
}

function setDiscColorAt(row, col, color) {
    if (!_assertNotDuringPlayback()) return;
    const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    const disc = cell ? cell.querySelector('.disc') : null;
    if (!disc) return;
    disc.classList.remove('black', 'white');
    disc.classList.add(color === BLACK ? 'black' : 'white');
}

function removeBombOverlayAt(row, col) {
    if (!_assertNotDuringPlayback()) return;
    const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    const disc = cell ? cell.querySelector('.disc') : null;
    if (!disc) return;
    disc.classList.remove('bomb');
    const timer = disc.querySelector('.bomb-timer');
    if (timer) timer.remove();
    const icon = disc.querySelector('.bomb-icon');
    if (icon) icon.remove();
}

function clearAllStoneVisualEffectsAt(row, col) {
    if (!_assertNotDuringPlayback()) return;
    const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    const disc = cell ? cell.querySelector('.disc') : null;
    if (!disc) return;

    disc.classList.remove('special-stone', 'ud-black', 'ud-white', 'breeding-black', 'breeding-white');
    delete disc.dataset.ud;
    delete disc.dataset.breeding;

    // Remove any known visual-effect classes without touching gameplay/animation classes.
    try {
        if (typeof STONE_VISUAL_EFFECTS !== 'undefined' && STONE_VISUAL_EFFECTS) {
            for (const k of Object.keys(STONE_VISUAL_EFFECTS)) {
                const eff = STONE_VISUAL_EFFECTS[k];
                if (eff && eff.cssClass) disc.classList.remove(eff.cssClass);
            }
        }
    } catch (e) {
        // visuals only
    }

    // Clear CSS vars used by overlay visuals.
    disc.style.removeProperty('--special-stone-image');
    disc.style.removeProperty('--dragon-image-path');
    disc.style.removeProperty('--breeding-image-path');
}

function syncDiscVisualToCurrentState(row, col) {
    if (!_assertNotDuringPlayback()) return;
    const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    const disc = cell ? cell.querySelector('.disc') : null;
    if (!disc) return;

    // Bomb overlay is separate from STONE_VISUAL_EFFECTS.
    const hasBomb = !!(cardState && cardState.bombs && cardState.bombs.find(b => b.row === row && b.col === col));
    if (!hasBomb) removeBombOverlayAt(row, col);

    clearAllStoneVisualEffectsAt(row, col);

    const special = (cardState && cardState.specialStones) ? cardState.specialStones.find(s => s.row === row && s.col === col) : null;
    if (!special) return;

    const ownerVal = (special.owner === 'black') ? BLACK : (special.owner === 'white') ? WHITE : (Number.isFinite(special.owner) ? special.owner : null);
    const effectKey = (typeof getEffectKeyForSpecialType === 'function') ? getEffectKeyForSpecialType(special.type) : null;
    if (effectKey && typeof applyStoneVisualEffect === 'function') {
        // [Regen Fix] Do not show icon if regen is already consumed (until turn end)
        if (special.type === 'REGEN' && (special.regenRemaining || 0) <= 0) {
            return;
        }
        applyStoneVisualEffect(disc, effectKey, { owner: ownerVal });
    }
}

const TIME_BOMB_TURNS = (typeof CardLogic !== 'undefined' && Number.isFinite(CardLogic.TIME_BOMB_TURNS))
    ? CardLogic.TIME_BOMB_TURNS
    : 3;

function getFlipAnimMs() {
    return (typeof FLIP_ANIMATION_DURATION_MS !== 'undefined' && Number.isFinite(FLIP_ANIMATION_DURATION_MS))
        ? FLIP_ANIMATION_DURATION_MS
        : 600;
}

function getPhaseGapMs() {
    return (typeof PHASE_GAP_MS !== 'undefined' && Number.isFinite(PHASE_GAP_MS))
        ? PHASE_GAP_MS
        : 200;
}

function getTurnTransitionGapMs() {
    // Visual-only pause between "placement immediate effects" and the next player's turn-start effects.
    // This prevents effects like HYPERACTIVE_WILL from looking like a single 2-square move.
    return (typeof TURN_TRANSITION_GAP_MS !== 'undefined' && Number.isFinite(TURN_TRANSITION_GAP_MS))
        ? TURN_TRANSITION_GAP_MS
        : getPhaseGapMs();
}

async function animateFlipsWithDeferredColor(flips, fromColor, toColor) {
    if (!_assertNotDuringPlayback()) return;
    if (!flips || flips.length === 0) return;
    const options = arguments[3] && typeof arguments[3] === 'object' ? arguments[3] : {};
    const skipVisualSync = options.skipVisualSync || null; // Set of "r,c"
    const applyColorAfterFlip = !!options.applyColorAfterFlip;
    const delay = getFlipAnimMs();

    const discsToAnimate = [];

    if (applyColorAfterFlip) {
        // Prepare discs with pre-flip color
        for (const [r, c] of flips) {
            setDiscColorAt(r, c, fromColor);
            if (!skipVisualSync || !skipVisualSync.has(`${r},${c}`)) {
                syncDiscVisualToCurrentState(r, c);
            }
            const cell = boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
            const disc = cell ? cell.querySelector('.disc') : null;
            if (!disc) continue;
            discsToAnimate.push({ r, c, disc });
        }

        // Apply flip classes next frame
        await new Promise(resolve => requestAnimationFrame(() => {
            for (const { r, c, disc } of discsToAnimate) {
                disc.classList.remove('flip');
                void disc.offsetWidth;
                // deferred flip animation suppressed (color-after option)
                console.log(`Deferred flip suppressed for (${r},${c}) with color-after option`);
            }
            setTimeout(resolve, delay);
        }));

        // After flip, set final color
        for (const [r, c] of flips) {
            setDiscColorAt(r, c, toColor);
            if (!skipVisualSync || !skipVisualSync.has(`${r},${c}`)) {
                syncDiscVisualToCurrentState(r, c);
            }
        }

    } else {
        // Default previous behavior: apply final color immediately, then flip
        for (const [r, c] of flips) {
            setDiscColorAt(r, c, toColor);
            if (!skipVisualSync || !skipVisualSync.has(`${r},${c}`)) {
                syncDiscVisualToCurrentState(r, c);
            }

            const cell = boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
            const disc = cell ? cell.querySelector('.disc') : null;
            if (!disc) continue;
            discsToAnimate.push({ r, c, disc });
        }

        // Apply flip classes in next frame to ensure DOM updates have settled
        await new Promise(resolve => requestAnimationFrame(() => {
            for (const { r, c, disc } of discsToAnimate) {
                disc.classList.remove('flip');
                void disc.offsetWidth;
                // deferred flip animation suppressed
                console.log(`Deferred flip suppressed for (${r},${c})`);
            }
            // wait for animation duration
            setTimeout(resolve, delay);
        }));
    }
}

async function animateRegenBack(regenedPositions, flipperColor) {
    if (!_assertNotDuringPlayback()) return;
    if (!regenedPositions || regenedPositions.length === 0) return;

    const ownerColor = -flipperColor;
    const durationMs = 600;

    // Apply visual effects and cross-fade
    for (const { row, col } of regenedPositions) {
        const cell = boardEl.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
        const disc = cell ? cell.querySelector('.disc') : null;
        if (!disc) continue;

        // Set owner color (background transitions via CSS)
        setDiscColorAt(row, col, ownerColor);

        // Cross-fade: fade in then auto fade out
        await crossfadeStoneVisual(disc, {
            effectKey: 'regenStone',
            owner: ownerColor,
            durationMs,
            autoFadeOut: true
        });
    }
}

function applyPendingSpecialstoneVisual(move, pendingType) {
    if (!_assertNotDuringPlayback()) return;
    if (!pendingType) return;

    const placedCell = boardEl.querySelector(`.cell[data-row="${move.row}"][data-col="${move.col}"]`);
    const disc = placedCell ? placedCell.querySelector('.disc') : null;
    if (!disc) return;

    if (pendingType === 'TIME_BOMB') {
        disc.classList.add('bomb');
        if (!disc.querySelector('.bomb-timer')) {
            const timeLabel = document.createElement('div');
            timeLabel.className = 'bomb-timer';
            timeLabel.textContent = TIME_BOMB_TURNS;
            disc.appendChild(timeLabel);
            const bombIcon = document.createElement('div');
            bombIcon.className = 'bomb-icon';
            bombIcon.textContent = '?';
            disc.appendChild(bombIcon);
        }
    }

    const effectKey = (typeof getEffectKeyForPendingType === 'function')
        ? getEffectKeyForPendingType(pendingType)
        : null;
    if (effectKey && typeof applyStoneVisualEffect === 'function') {
        applyStoneVisualEffect(disc, effectKey, { owner: move.player });
    }
}

async function runMoveVisualSequence(move, hadSelection, phases, effects, immediate) {
    if (!_assertNotDuringPlayback()) return;
    if (typeof window !== 'undefined') {
        if (window.__moveVisualSequenceActive) {
            console.warn('[Visuals] Reentrant runMoveVisualSequence detected - ignoring to avoid recursion');
            return;
        }
        window.__moveVisualSequenceActive = true;
    }
    try {
        const primaryFlips = phases.primaryFlips || [];
        const chainFlips = phases.chainFlips || [];
        const regenCaptureFlips = phases.regenCaptureFlips || [];
        const regened = phases.regened || [];

        const totalFlipCount = primaryFlips.length + chainFlips.length + regenCaptureFlips.length;
        const movedPlayer = getPlayerName(move.player);

    if (typeof logPlacementEffects === 'function') {
        logPlacementEffects(effects, move.player);
    }

    addLog(LOG_MESSAGES.placedWithFlips(movedPlayer, posToNotation(move.row, move.col), totalFlipCount));
    if (regened.length > 0) addLog(LOG_MESSAGES.regenTriggered(regened.length));
    if (regenCaptureFlips.length > 0) addLog(LOG_MESSAGES.regenCapture(regenCaptureFlips.length));

    if (typeof resetRenderStats === 'function') resetRenderStats();

    emitBoardUpdate();
    if (hadSelection && typeof emitCardStateChange === 'function') emitCardStateChange();

    // Defensive: some special visuals (WORK / HYPERACTIVE) may not be applied during the "pending" placement path
    // due to earlier animation or diff timing. If a work or hyperactive marker was placed as an effect, ensure
    // the disc visual is synced immediately so the player sees the correct image before flips.
    try {
        if (effects && effects.workPlaced) {
            console.log('[Visuals] workPlaced detected — syncing visuals for placed cell', move.row, move.col);
            // Sync this disc visual immediately
            syncDiscVisualToCurrentState(move.row, move.col);
            // Also run the general helper (no-op if nothing to apply)
            if (typeof ensureWorkVisualsApplied === 'function') ensureWorkVisualsApplied();
        }

        if (effects && effects.hyperactivePlaced) {
            console.log('[Visuals] hyperactivePlaced detected — syncing visuals for placed cell', move.row, move.col);
            // Sync this disc visual immediately
            syncDiscVisualToCurrentState(move.row, move.col);
            // Attempt to ensure pending specialstone visuals are applied (falls back if not applicable)
            try {
                if (typeof applyPendingSpecialstoneVisual === 'function') applyPendingSpecialstoneVisual(move, 'HYPERACTIVE_WILL');
            } catch (e) { /* ignore */ }
        }
    } catch (e) {
        /* defensive */
    }

    // Vanish Gold/Silver immediately after placement render
    if (effects.goldStoneUsed || effects.silverStoneUsed) {
        const effectKey = effects.goldStoneUsed ? 'goldStone' : 'silverStone';
        animateFadeOutAt(move.row, move.col, { createGhost: true, color: move.player, effectKey });
    }

    // Set intermediate colors for sequence
    if (chainFlips.length > 0) {
        for (const [r, c] of chainFlips) setDiscColorAt(r, c, -move.player);
    }
    if (regenCaptureFlips.length > 0) {
        for (const [r, c] of regenCaptureFlips) setDiscColorAt(r, c, move.player);
    }

    // Flips
    if (primaryFlips.length > 0) {
        await animateFlipsWithDeferredColor(primaryFlips, -move.player, move.player);
    }
    if (chainFlips.length > 0) {
        await animateFlipsWithDeferredColor(chainFlips, -move.player, move.player);
    }
    if (regened.length > 0) {
        for (const p of regened) setDiscColorAt(p.row, p.col, move.player);
        await animateRegenBack(regened, move.player);
    }
    if (regenCaptureFlips.length > 0) {
        await animateFlipsWithDeferredColor(regenCaptureFlips, move.player, -move.player);
    }

    // Immediate effects
    if (immediate.dragonConverted && immediate.dragonConverted.length > 0) {
        const coords = immediate.dragonConverted.map(p => [p.row, p.col]);
        await animateFlipsWithDeferredColor(coords, -move.player, move.player, { applyColorAfterFlip: true });
    }
    if (immediate.breedingSpawned && immediate.breedingSpawned.length > 0) {
        const BREEDING_FADE_MS = 350;
        for (const spawn of immediate.breedingSpawned) {
            const cell = boardEl.querySelector(`.cell[data-row="${spawn.row}"][data-col="${spawn.col}"]`);
            if (cell) {
                let disc = cell.querySelector('.disc');
                if (!disc) {
                    disc = document.createElement('div');
                    disc.className = 'disc ' + (player === BLACK ? 'black' : 'white');
                    cell.appendChild(disc);
                } else {
                    // Ensure no leftover inline opacity is set
                    try { disc.style.opacity = ''; } catch (e) { }
                }

                // Preserve pacing to keep sequence timing unchanged; no CSS fade-in is used.
                await new Promise(resolve => setTimeout(resolve, BREEDING_FADE_MS));
            }
        }
    }
    if (immediate.udgDestroyed && immediate.udgDestroyed.length > 0) {
        for (const p of immediate.udgDestroyed) await animateFadeOutAt(p.row, p.col);
    }
    if (immediate.hyperactiveMoved && immediate.hyperactiveMoved.length > 0) {
        for (const m of immediate.hyperactiveMoved) {
            if (typeof animateHyperactiveMove === 'function') await animateHyperactiveMove(m.from, m.to);
        }
    }

    emitGameStateChange();
    } finally {
        if (typeof window !== 'undefined') window.__moveVisualSequenceActive = false;
    }
}

if (typeof window !== 'undefined') {
    window.applyFlipAnimations = applyFlipAnimations;
    window.setDiscColorAt = setDiscColorAt;
    window.removeBombOverlayAt = removeBombOverlayAt;
    window.clearAllStoneVisualEffectsAt = clearAllStoneVisualEffectsAt;
    window.syncDiscVisualToCurrentState = syncDiscVisualToCurrentState;
    window.getFlipAnimMs = getFlipAnimMs;
    window.getPhaseGapMs = getPhaseGapMs;
    window.getTurnTransitionGapMs = getTurnTransitionGapMs;
    window.animateFlipsWithDeferredColor = animateFlipsWithDeferredColor;
    window.animateRegenBack = animateRegenBack;
    window.applyPendingSpecialstoneVisual = applyPendingSpecialstoneVisual;
    // Do not overwrite an existing implementation (UI may provide it); only set if not present
    if (typeof window.runMoveVisualSequence !== 'function') window.runMoveVisualSequence = runMoveVisualSequence;
}

// Notify game/ module of UI implementations so game can delegate without referencing window.
try {
    const gameVisuals = require('../game/move-executor-visuals');
    if (gameVisuals && typeof gameVisuals.setUIImpl === 'function') {
        gameVisuals.setUIImpl({
            applyFlipAnimations,
            setDiscColorAt,
            removeBombOverlayAt,
            clearAllStoneVisualEffectsAt,
            syncDiscVisualToCurrentState,
            getFlipAnimMs,
            getPhaseGapMs,
            getTurnTransitionGapMs,
            animateFlipsWithDeferredColor,
            animateRegenBack,
            applyPendingSpecialstoneVisual,
            runMoveVisualSequence
        });
    }
} catch (e) { /* not available in some environments */ }

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        applyFlipAnimations,
        setDiscColorAt,
        removeBombOverlayAt,
        clearAllStoneVisualEffectsAt,
        syncDiscVisualToCurrentState,
        getFlipAnimMs,
        getPhaseGapMs,
        getTurnTransitionGapMs,
        animateFlipsWithDeferredColor,
        animateRegenBack,
        applyPendingSpecialstoneVisual,
        runMoveVisualSequence
    };
}
})(); 