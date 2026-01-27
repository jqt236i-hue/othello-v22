/**
 * @file destroy.js
 * @description Destroy card handlers
 */

async function handleDestroySelection(row, col, playerKey) {
    // UI flow mostly stays here, calls executeDestroy
    // Logic for validation is simple enough to keep or delegate
    const val = gameState.board[row][col];
    if (val === EMPTY) {
        addLog(LOG_MESSAGES.destroySelectPrompt());
        return;
    }
    await executeDestroy(row, col, playerKey);
}

async function executeDestroy(row, col, playerKey) {
    if (isProcessing || isCardAnimating) return;
    isProcessing = true;
    isCardAnimating = true;

    try {
        if (typeof clearSpecialAt === 'function') clearSpecialAt(row, col);

        // Run destroy as an action through the TurnPipeline to ensure single writer
        const action = (typeof ActionManager !== 'undefined' && ActionManager.ActionManager && typeof ActionManager.ActionManager.createAction === 'function')
            ? ActionManager.ActionManager.createAction('place', playerKey, { destroyTarget: { row, col } })
            : { type: 'place', destroyTarget: { row, col } };

        if (action && cardState && typeof cardState.turnIndex === 'number') {
            action.turnIndex = cardState.turnIndex;
        }

        const res = (typeof TurnPipelineUIAdapter !== 'undefined' && typeof TurnPipeline !== 'undefined')
            ? TurnPipelineUIAdapter.runTurnWithAdapter(cardState, gameState, playerKey, action, TurnPipeline)
            : null;

        if (!res) {
            // Pipeline not available: cannot apply rule-side destroy from UI. Reject action.
            console.error('[DESTROY] TurnPipeline not available; destroy aborted');
            addLog(LOG_MESSAGES.destroyFailed());
            return;
        }

        if (res.ok === false) {
            addLog(LOG_MESSAGES.destroyFailed());
            return;
        }

        // Apply new states
        if (res.nextCardState) cardState = res.nextCardState;
        if (res.nextGameState) gameState = res.nextGameState;

        // Playback visuals
        if (typeof AnimationEngine !== 'undefined' && AnimationEngine && typeof AnimationEngine.play === 'function' && res.playbackEvents) {
            await AnimationEngine.play(res.playbackEvents);
        } else if (typeof runMoveVisualSequence === 'function' && res.playbackEvents) {
            await runMoveVisualSequence({ row, col }, true, {}, {}, {}); // minimal params; playbackEvents used by engine
        }

        addLog(LOG_MESSAGES.destroyApplied(playerKey === 'black' ? '黒' : '白', posToNotation(row, col)));
        if (typeof emitCardStateChange === 'function') emitCardStateChange();
        if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
        if (typeof emitGameStateChange === 'function') emitGameStateChange();

    } finally {
        isProcessing = false;
        isCardAnimating = false;
    }
}

// UI attachments are now the responsibility of the UI layer (ui/handlers/*). Export functions for import by UI.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handleDestroySelection, executeDestroy };
}
