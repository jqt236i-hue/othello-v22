/**
 * @file bombs.js
 * @description Bomb handling (tick + explosion UI)
 */

/**
 * Process all bombs: decrement turn counters and explode those that reach 0
 * @async
 * @returns {Promise<void>}
 */
async function processBombs(precomputedEvents = null) {
    if (!cardState.bombs || cardState.bombs.length === 0) return;

    // Snapshot bomb owners BEFORE ticking, because tickBombs removes exploded bombs from cardState.bombs.
    const bombOwnerValByPos = new Map();
    for (const b of cardState.bombs) {
        const ownerVal = b.owner === 'black' ? BLACK : WHITE;
        bombOwnerValByPos.set(`${b.row},${b.col}`, ownerVal);
    }

    // Use pipeline-produced events if provided, otherwise compute them here
    const activeKey = (typeof getPlayerKey === 'function') ? getPlayerKey(gameState.currentPlayer) : (gameState.currentPlayer === BLACK ? 'black' : 'white');
    const events = Array.isArray(precomputedEvents) ? precomputedEvents.slice() : [];
    if (events.length === 0) {
        if (typeof TurnPipelinePhases !== 'undefined' && typeof TurnPipelinePhases.applyTurnStartPhase === 'function') {
            TurnPipelinePhases.applyTurnStartPhase(CardLogic, Core, cardState, gameState, activeKey, events);
        } else {
            console.error('[PROCESS-BOMBS] TurnPipelinePhases.applyTurnStartPhase not available; skipping bomb processing');
            return;
        }
    }

    // Look for all bombs_exploded events produced by the pipeline; process them in order
    const bombEvents = events.filter(e => e.type === 'bombs_exploded');
    if (!bombEvents || bombEvents.length === 0) {
        // Nothing exploded but counters may have changed; emit status update
        emitGameStateChange();
        return;
    }

    const alreadyAnimated = new Set();

    for (const bombEvent of bombEvents) {
        const result = (bombEvent && bombEvent.details) ? bombEvent.details : null;
        if (!result || !result.exploded || result.exploded.length === 0) continue;

        // Log explosions for this event
        for (const pos of result.exploded) {
            addLog(LOG_MESSAGES.bombExploded(posToNotation(pos.row, pos.col)));
        }

        // Animation order: 1) bomb anchor fades out, 2) surrounding destroyed stones in batch
        const destroyedKeySet = new Set((result.destroyed || []).map(p => `${p.row},${p.col}`));

        for (const center of result.exploded) {
            const centerKey = `${center.row},${center.col}`;

            // 1) bomb itself first (if present in destroyed list)
            if (destroyedKeySet.has(centerKey) && !alreadyAnimated.has(centerKey)) {
                alreadyAnimated.add(centerKey);
                const ownerVal = bombOwnerValByPos.get(centerKey);
                await animateFadeOutAt(center.row, center.col, {
                    createGhost: true,
                    color: ownerVal
                });
            }

            // 2) surrounding 8 as batch
            const batch = [];
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const r = center.row + dr;
                    const c = center.col + dc;
                    if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;
                    const key = `${r},${c}`;
                    if (!destroyedKeySet.has(key) || alreadyAnimated.has(key)) continue;
                    alreadyAnimated.add(key);
                    batch.push(animateFadeOutAt(r, c));
                }
            }
            if (batch.length > 0) await Promise.all(batch);
        }

        // Fallback: any destroyed stones not covered by exploded centers
        const leftover = [];
        for (const pos of (result.destroyed || [])) {
            const key = `${pos.row},${pos.col}`;
            if (alreadyAnimated.has(key)) continue;
            alreadyAnimated.add(key);
            leftover.push(animateFadeOutAt(pos.row, pos.col));
        }
        if (leftover.length > 0) await Promise.all(leftover);
    }

    // Update board display after animations
    emitBoardUpdate();

    // Always update status
    emitGameStateChange();
}

/**
 * Handle UI for bomb explosion
 * @param {number} row
 * @param {number} col
 */
async function explodeBombUI(row, col) {
    addLog(LOG_MESSAGES.bombExploded(posToNotation(row, col)));

    // Animate 3x3 destruction
    // Note: Logical stones are already removed by CardLogic, but UI is stale so we can animate
    const tasks = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                // We blindly animate explosion on all 9 squares
                tasks.push(animateDestroyAt(r, c));
            }
        }
    }
    await Promise.all(tasks);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { processBombs, explodeBombUI };
}
