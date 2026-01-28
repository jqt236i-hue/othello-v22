/**
 * @file pipeline_ui_adapter.js
 * @description Bridge TurnPipeline event log -> browser UI via Canonical Playback Events.
 * alings with 03-visual-rulebook.v2.txt.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TurnPipelineUIAdapter = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    /**
     * Helper to get visual state of a cell from game/card state.
     */
    function getVisualStateAt(r, c, cardState, gameState) {
        if (!gameState || !gameState.board) return { color: 0, special: null, timer: null };
        const color = gameState.board[r][c];

        // Find special stone
        let special = null;
        let timer = null;

        if (cardState && cardState.specialStones) {
            const s = cardState.specialStones.find(ss => ss.row === r && ss.col === c);
            if (s) {
                special = s.type;
                timer = s.remainingOwnerTurns;
            }
        }

        // Bomb check (legacy bombs might be separate)
        if (!special && cardState && cardState.bombs) {
            const b = cardState.bombs.find(bb => bb.row === r && bb.col === c);
            if (b) {
                special = 'TIME_BOMB';
                timer = b.remainingTurns;
            }
        }

        return { color, special, timer };
    }

    /**
     * Converts presentation events (BoardOps output) into PlaybackEvents.
     * This expects events to be JSON-safe presentationEvents as emitted by BoardOps.
     */
    function mapToPlaybackEvents(presEvents, finalCardState, finalGameState) {
        const playbackEvents = [];
        let currentPhase = 1;

        for (const ev of presEvents || []) {
            const pEvent = {
                type: null,
                phase: currentPhase,
                targets: [],
                rawType: ev.type,
                actionId: ev.actionId || null,
                turnIndex: (typeof ev.turnIndex === 'number') ? ev.turnIndex : (finalCardState && typeof finalCardState.turnIndex === 'number' ? finalCardState.turnIndex : 0),
                plyIndex: (typeof ev.plyIndex === 'number') ? ev.plyIndex : null
            };

            switch (ev.type) {
                case 'SPAWN':
                    pEvent.type = 'spawn';
                    pEvent.targets = [{ r: ev.row, col: ev.col, stoneId: ev.stoneId, ownerAfter: ev.ownerAfter }];
                    break;
                case 'DESTROY':
                    pEvent.type = 'destroy';
                    pEvent.targets = [{ r: ev.row, col: ev.col, stoneId: ev.stoneId, ownerBefore: ev.ownerBefore }];
                    currentPhase++;
                    pEvent.phase = currentPhase;
                    break;
                case 'CHANGE':
                    // Map CHANGE -> flip to match UI AnimationEngine expectations (Spec B)
                    pEvent.type = 'flip';
                    pEvent.targets = [{ r: ev.row, col: ev.col, ownerBefore: ev.ownerBefore, ownerAfter: ev.ownerAfter }];
                    currentPhase++;
                    pEvent.phase = currentPhase;
                    break;
                case 'MOVE':
                    pEvent.type = 'move';
                    pEvent.targets = [{ from: { r: ev.prevRow, c: ev.prevCol }, to: { r: ev.row, c: ev.col }, stoneId: ev.stoneId }];
                    currentPhase++;
                    pEvent.phase = currentPhase;
                    break;
                default:
                    // Unknown presentation event -> log
                    pEvent.type = 'log';
                    pEvent.message = `PresentationEvent: ${ev.type}`;
            }

            // NOTE: Do not populate 'after' using a final snapshot. Adapter is a thin transform.
            // Instead, include minimal per-target 'after' info derived from the presentation event itself
            // so that visual writers can render based on event payload without requiring snapshots.
            if (pEvent.type !== 'log') {
                for (const t of pEvent.targets) {
                    // Add a best-effort 'after' using event-sourced owner fields (no final snapshot)
                    if (t.ownerAfter !== undefined) {
                        t.after = {
                            color: (t.ownerAfter === 'black') ? 1 : -1,
                            special: (ev.meta && ev.meta.special) || null,
                            timer: (ev.meta && ev.meta.timer) || null
                        };
                    } else if (pEvent.type === 'destroy') {
                        t.after = { color: 0, special: null, timer: null };
                    } else {
                        t.after = { color: 0, special: null, timer: null };
                    }
                }
            }

            if (pEvent.type) playbackEvents.push(pEvent);
        }

        return playbackEvents;
    }

    /**
     * Minimal adapter to run a placement via TurnPipeline and return both state and PlaybackEvents.
     */
    function runTurnWithAdapter(cardState, gameState, playerKey, action, turnPipeline) {
        if (!turnPipeline) throw new Error('TurnPipeline not available');

        // Build options for applyTurnSafe: include current state version and previous action ids if ActionManager is available
        const options = {};
        if (typeof ActionManager !== 'undefined' && ActionManager.ActionManager) {
            try {
                if (typeof ActionManager.ActionManager.getRecentActionIds === 'function') {
                    options.previousActionIds = ActionManager.ActionManager.getRecentActionIds(200);
                } else if (typeof ActionManager.ActionManager.getActions === 'function') {
                    options.previousActionIds = ActionManager.ActionManager.getActions().map(a => a.actionId).filter(Boolean);
                }
            } catch (e) { /* ignore */ }
        }
        if (cardState && typeof cardState.turnIndex === 'number') {
            options.currentStateVersion = cardState.turnIndex;
        }

        // Attempt to pass the current game PRNG (when available in browser env) to ensure deterministic rule logic
        const runtimePrng = (typeof getGamePrng === 'function') ? getGamePrng() : (typeof globalThis !== 'undefined' && typeof globalThis.getGamePrng === 'function') ? globalThis.getGamePrng() : undefined;
        if (typeof console !== 'undefined' && console.log) console.log('[TurnPipelineUIAdapter] runtimePrng available:', !!runtimePrng);
        const result = (typeof turnPipeline.applyTurnSafe === 'function')
            ? turnPipeline.applyTurnSafe(cardState, gameState, playerKey, action, runtimePrng, options)
            : turnPipeline.applyTurn(cardState, gameState, playerKey, action, runtimePrng);

        if (result.ok === false) {
            return { ok: false, rejectedReason: result.rejectedReason || 'UNKNOWN', events: result.events };
        }

        // Prefer pipeline-produced presentationEvents when available
        const pres = result.presentationEvents || result.cardState && result.cardState.presentationEvents || [];
        const playbackEvents = mapToPlaybackEvents(pres, result.cardState, result.gameState);

        return {
            ok: true,
            nextCardState: result.cardState,
            nextGameState: result.gameState,
            playbackEvents: playbackEvents,
            rawEvents: result.events,
            presentationEvents: pres
        };
    }

    return {
        mapToPlaybackEvents,
        runTurnWithAdapter
    };
}));
