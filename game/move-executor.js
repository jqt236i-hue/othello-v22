(function () {
// Move execution and flip animations extracted from turn-manager
// Refactored to use Shared Logic via wrappers

let __uiImpl_move_executor = {};
function setUIImpl(obj) { __uiImpl_move_executor = obj || {}; }

function getHumanPlayMode() {
    try {
        if (__uiImpl_move_executor && typeof __uiImpl_move_executor.getHumanPlayMode === 'function') {
            const mode = __uiImpl_move_executor.getHumanPlayMode();
            if (typeof mode === 'string') return mode;
        }
    } catch (e) { /* ignore */ }
    if (__uiImpl_move_executor && typeof __uiImpl_move_executor.humanPlayMode === 'string') return __uiImpl_move_executor.humanPlayMode;
    if (__uiImpl_move_executor && __uiImpl_move_executor.DEBUG_HUMAN_VS_HUMAN) return 'both';
    return 'black';
}

if (typeof CardLogic === 'undefined') {
    console.error('CardLogic/CoreLogic is not loaded.');
}

async function executeMove(move) {
    try {
        const hadSelection = cardState.selectedCardId !== null;
        cardState.selectedCardId = null;
        const playerKey = getPlayerKey(move.player);
        const debugUsePipeline = !!(__uiImpl_move_executor && __uiImpl_move_executor.DEBUG_USE_TURN_PIPELINE) && typeof TurnPipeline !== 'undefined' && typeof TurnPipeline.applyTurn === 'function';
        const pipelineSnapshot = debugUsePipeline ? runPipelineDebugSnapshot(move, playerKey) : null;
        const pipelineAvailable = (typeof TurnPipelineUIAdapter !== 'undefined' && typeof TurnPipeline !== 'undefined');

        console.log('[DEBUG][executeMove] enter', { playerKey, isProcessing, isCardAnimating, USE_TURN_PIPELINE: !!(__uiImpl_move_executor && __uiImpl_move_executor.USE_TURN_PIPELINE), DEBUG_HUMAN_VS_HUMAN: !!(__uiImpl_move_executor && __uiImpl_move_executor.DEBUG_HUMAN_VS_HUMAN), pendingEffectByPlayer: cardState.pendingEffectByPlayer });

        if (!pipelineAvailable) {
            throw new Error('TurnPipeline/TurnPipelineUIAdapter is not available. Legacy path has been removed.');
        }

        await executeMoveViaPipeline(move, hadSelection, playerKey);
        if (pipelineSnapshot) {
            comparePipelineSnapshot(pipelineSnapshot, cardState, gameState);
        }

    } catch (error) {
        console.error('[CRITICAL] Error in executeMove:', error);
        isProcessing = false;
    } finally {
        console.log('[DEBUG][executeMove] exit', { isProcessing, isCardAnimating, uiIsProcessing: (__uiImpl_move_executor && typeof __uiImpl_move_executor.isProcessing !== 'undefined' ? __uiImpl_move_executor.isProcessing : undefined), uiIsCardAnimating: (__uiImpl_move_executor && typeof __uiImpl_move_executor.isCardAnimating !== 'undefined' ? __uiImpl_move_executor.isCardAnimating : undefined), gameStateCurrentPlayer: gameState && gameState.currentPlayer });
    }
}

async function executeMoveViaPipeline(move, hadSelection, playerKey) {
    const action = (typeof ActionManager !== 'undefined' && ActionManager.ActionManager && typeof ActionManager.ActionManager.createAction === 'function')
        ? ActionManager.ActionManager.createAction('place', playerKey, { row: move.row, col: move.col })
        : { type: 'place', row: move.row, col: move.col };

    if (action && cardState && typeof cardState.turnIndex === 'number') {
        action.turnIndex = cardState.turnIndex;
    }

    const res = TurnPipelineUIAdapter.runTurnWithAdapter(cardState, gameState, playerKey, action, TurnPipeline);

    // Check if action was rejected (explicit false check, not truthy check)
    if (res.ok === false) {
        console.warn('[MoveExecutor] Action rejected:', res.rejectedReason, 'events:', JSON.stringify(res.events || res, null, 2));
        // Do not record, do not increment turnIndex
        // Important: reset isProcessing to allow auto-loop to continue
        isProcessing = false;
        emitBoardUpdate();
        return;
    }

    if (typeof ActionManager !== 'undefined' && ActionManager.ActionManager) {
        try {
            ActionManager.ActionManager.recordAction(action);
            ActionManager.ActionManager.incrementTurnIndex();
        } catch (e) {
            console.warn('[MoveExecutor] Failed to record action:', e);
        }
    }

    gameState = res.nextGameState;
    cardState = res.nextCardState;
    console.log('[DEBUG][executeMoveViaPipeline] after apply', { gameStateCurrentPlayer: gameState.currentPlayer, playerKey, isProcessing, isCardAnimating, pendingEffect: cardState.pendingEffectByPlayer });

    const phases = res.phases || {};
    const effects = res.placementEffects || {};
    const immediate = res.immediate || {};

    // Request UI-side playback by emitting a presentation event (Playback should be performed by UI's PlaybackEngine)
    if (res.playbackEvents && res.playbackEvents.length) {
        cardState.presentationEvents = cardState.presentationEvents || [];
        cardState.presentationEvents.push({ type: 'PLAYBACK_EVENTS', events: res.playbackEvents, meta: { move, phases, effects, immediate } });
    } else {
        // No playback events produced; nothing for the UI to play
    }

    // Finalize turn: pipeline handles the turn-end logic (do NOT call the CardLogic turn-end writer from UI)
    if (isGameOver(gameState)) { showResult(); isProcessing = false; return; }

    await onTurnStartLogic(gameState.currentPlayer);
    // Record completion timestamp so CPU turns invoked immediately after can be deferred by CPU handler if necessary
    try {
        try {
            const cpu = require('../cpu/cpu-turn');
            if (cpu && typeof cpu.setLastMoveCompletedAt === 'function') cpu.setLastMoveCompletedAt(Date.now());
        } catch (e) {
            try { global.__lastMoveCompletedAt = Date.now(); } catch (err) { /* ignore environments without global */ }
        }
    } catch (e) { /* defensive */ }
    console.log('[DEBUG][executeMoveViaPipeline] after onTurnStart', { gameStateCurrentPlayer: gameState.currentPlayer, isProcessing, isCardAnimating, pendingEffect: cardState.pendingEffectByPlayer });
    const humanPlayMode = getHumanPlayMode();
    const isHumanWhite = (humanPlayMode === 'white' || humanPlayMode === 'both');

    if (gameState.currentPlayer === WHITE && !isHumanWhite) {
        isProcessing = true;
        try { console.log('[DIAG][MOVE] schedule CPU request', { CPU_DELAY: CPU_TURN_DELAY_MS, humanPlayMode, time: Date.now(), stack: (new Error()).stack.split('\n').slice(1,6).join('\n') }); } catch (e) {}
        console.log('[DEBUG][executeMoveViaPipeline] scheduling CPU', { CPU_DELAY: CPU_TURN_DELAY_MS });
        if (__uiImpl_move_executor && typeof __uiImpl_move_executor.scheduleCpuTurn === 'function') {
            __uiImpl_move_executor.scheduleCpuTurn(CPU_TURN_DELAY_MS, () => {
                console.log('[DEBUG][executeMoveViaPipeline] scheduled CPU callback firing, isProcessing, isCardAnimating', { isProcessing, isCardAnimating });
                try { processCpuTurn(); } catch (e) { console.error('[DEBUG][executeMoveViaPipeline] processCpuTurn threw', e); }
            });
        } else {
            // Fallback: do not call time APIs in game layer. Emit a presentation event so UI can schedule the CPU turn.
            console.log('[DEBUG][executeMoveViaPipeline] scheduleCpuTurn not available; emitting SCHEDULE_CPU_TURN presentation event');
            try {
                cardState.presentationEvents = cardState.presentationEvents || [];
                cardState.presentationEvents.push({ type: 'SCHEDULE_CPU_TURN', delayMs: CPU_TURN_DELAY_MS, reason: 'CPU_TURN' });
                // Trigger a UI update so presentation handlers can consume the scheduling request.
                // In some browser flows, the last BOARD_UPDATED is emitted before this event is appended.
                try { if (typeof emitBoardUpdate === 'function') emitBoardUpdate(); } catch (e) { /* ignore */ }
            } catch (e) {
                console.error('[DEBUG][executeMoveViaPipeline] failed to emit SCHEDULE_CPU_TURN event', e);
            }
        }
    } else {
        isProcessing = false;
        emitBoardUpdate();
    }
}

let deepClone = (obj) => (typeof globalThis !== 'undefined' && typeof globalThis.structuredClone === 'function') ? globalThis.structuredClone(obj) : JSON.parse(JSON.stringify(obj));
if (typeof require === 'function') {
  try { deepClone = require('../utils/deepClone'); } catch (e) { /* ignore in browser-like env */ }
}

function runPipelineDebugSnapshot(move, playerKey) {
    try {
        const action = { type: 'place', row: move.row, col: move.col };
        return TurnPipeline.applyTurn(deepClone(cardState), deepClone(gameState), playerKey, action);
    } catch (e) { return null; }
}

function comparePipelineSnapshot(snapshot, actualCardState, actualGameState) { }

async function onTurnStartLogic(player) {
    if (typeof onTurnStart === 'function') await onTurnStart(player);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        executeMove,
        executeMoveViaPipeline,
        setUIImpl
    };
}

// Exposing `executeMove` to browser globals is a UI responsibility to avoid direct browser-global references in `game/**`.
// UI code can import this module and attach `executeMove` to the browser global if necessary.
if (typeof globalThis !== 'undefined') {
    try { globalThis.executeMove = executeMove; } catch (e) { /* ignore */ }
}
})();
