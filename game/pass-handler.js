(function () {
// Pass and game-end handling utilities extracted from turn-manager
// Refactored to use TurnPipeline exclusively (no legacy path)

if (typeof CardLogic === 'undefined') {
    console.warn('CardLogic not loaded in pass-handler.js');
}

const PASS_HANDLER_VERSION = '2.0'; // TurnPipeline-only version

// Timers abstraction (injected by UI)
let timers = null;
if (typeof require === 'function') {
    try { timers = require('./timers'); } catch (e) { /* ignore */ }
}

/**
 * Helper to apply pass via TurnPipeline with safe fallback.
 * @param {string} playerKey - 'black' or 'white'
 * @returns {{ ok: boolean, events: Array }}
 */
function applyPassViaPipeline(playerKey) {
    if (typeof TurnPipeline === 'undefined') {
        throw new Error('TurnPipeline is not available - cannot process pass');
    }

    // Create action via ActionManager for tracking
        const action = (typeof ActionManager !== 'undefined' && ActionManager.ActionManager && typeof ActionManager.ActionManager.createAction === 'function')
            ? ActionManager.ActionManager.createAction('pass', playerKey, {})
            : { type: 'pass' };

        if (action && cardState && typeof cardState.turnIndex === 'number') {
            action.turnIndex = cardState.turnIndex;
        }

    // Use applyTurnSafe if available, fallback to applyTurn
    if (typeof TurnPipeline.applyTurnSafe === 'function') {
        const result = TurnPipeline.applyTurnSafe(cardState, gameState, playerKey, action);
        if (!result.ok) {
            console.error('[PASS-HANDLER] Pass rejected:', result.events);
            // Log rejected event but continue - do NOT record
            return { ok: false, events: result.events };
        }
        gameState = result.gameState;
        cardState = result.cardState;

        // Record successful action
        if (typeof ActionManager !== 'undefined' && ActionManager.ActionManager) {
            ActionManager.ActionManager.recordAction(action);
            ActionManager.ActionManager.incrementTurnIndex();
        }

        return { ok: true, events: result.events };
    } else {
        // Fallback to regular applyTurn
        const res = TurnPipeline.applyTurn(cardState, gameState, playerKey, action);
        gameState = res.gameState;
        cardState = res.cardState;

        // Record successful action
        if (typeof ActionManager !== 'undefined' && ActionManager.ActionManager) {
            ActionManager.ActionManager.recordAction(action);
            ActionManager.ActionManager.incrementTurnIndex();
        }

        return { ok: true, events: res.events || [] };
    }
}

async function handleDoublePlaceNoSecondMove(move, passedPlayer) {
    const playerName = getPlayerName(passedPlayer);
    if (timers && typeof timers.waitMs === 'function') {
        timers.waitMs(DOUBLE_PLACE_PASS_DELAY_MS).then(async () => {
            addLog(`${playerName}: 二連投石 追加手なし → パス`);
            const playerKey = passedPlayer === BLACK ? 'black' : 'white';

            const result = applyPassViaPipeline(playerKey);
            if (!result.ok) {
                console.warn('[PASS-HANDLER] Pass was rejected, continuing anyway');
            }

            emitBoardUpdate();
            emitGameStateChange();

            if (isGameOver(gameState)) {
                showResult();
                isProcessing = false;
                return;
            }

            if (gameState.currentPlayer === WHITE) {
                isProcessing = true;
                console.log('[PASS-HANDLER] Switching to WHITE turn');
                if (typeof onTurnStartLogic === 'function') {
                    await onTurnStartLogic(WHITE);
                } else if (typeof onTurnStart === 'function') {
                    await onTurnStart(WHITE);
                }
                if (timers && typeof timers.waitMs === 'function') {
                    timers.waitMs(CPU_TURN_DELAY_MS).then(processCpuTurn);
                } else {
                    processCpuTurn();
                }
            } else {
                isProcessing = false;
                console.log('[PASS-HANDLER] Switching to BLACK turn');
                if (typeof onTurnStartLogic === 'function') {
                    await onTurnStartLogic(BLACK);
                } else if (typeof onTurnStart === 'function') {
                    await onTurnStart(BLACK);
                }
                emitBoardUpdate();
            }
        });
    } else {
        // Fallback immediate path
        addLog(`${playerName}: 二連投石 追加手なし → パス`);
        const playerKey = passedPlayer === BLACK ? 'black' : 'white';

        const result = applyPassViaPipeline(playerKey);
        if (!result.ok) {
            console.warn('[PASS-HANDLER] Pass was rejected, continuing anyway');
        }

        emitBoardUpdate();
        emitGameStateChange();

        if (isGameOver(gameState)) {
            showResult();
            isProcessing = false;
            return;
        }

        if (gameState.currentPlayer === WHITE) {
            isProcessing = true;
            console.log('[PASS-HANDLER] Switching to WHITE turn');
            if (typeof onTurnStartLogic === 'function') {
                await onTurnStartLogic(WHITE);
            } else if (typeof onTurnStart === 'function') {
                await onTurnStart(WHITE);
            }
            if (timers && typeof timers.waitMs === 'function') {
                timers.waitMs(CPU_TURN_DELAY_MS).then(processCpuTurn);
            } else {
                processCpuTurn();
            }
        } else {
            isProcessing = false;
            console.log('[PASS-HANDLER] Switching to BLACK turn');
            if (typeof onTurnStartLogic === 'function') {
                await onTurnStartLogic(BLACK);
            } else if (typeof onTurnStart === 'function') {
                await onTurnStart(BLACK);
            }
            emitBoardUpdate();
        }
    }
}

function handleBlackPassWhenNoMoves() {
    if (timers && typeof timers.waitMs === 'function') {
        timers.waitMs(BLACK_PASS_DELAY_MS).then(async () => {
            addLog(`${getPlayerName(BLACK)}: パス (置ける場所がありません)`);
            const passedPlayer = gameState.currentPlayer;
            const playerKey = passedPlayer === BLACK ? 'black' : 'white';

            const result = applyPassViaPipeline(playerKey);
            if (!result.ok) {
                console.warn('[PASS-HANDLER] Pass was rejected, continuing anyway');
            }

            emitBoardUpdate();
            emitGameStateChange();
            if (isGameOver(gameState)) {
                showResult();
                isProcessing = false;
            } else {
                isProcessing = true;
                if (typeof onTurnStartLogic === 'function') {
                    onTurnStartLogic(WHITE);
                } else if (typeof onTurnStart === 'function') {
                    onTurnStart(WHITE);
                }
                if (timers && typeof timers.waitMs === 'function') {
                    timers.waitMs(CPU_TURN_DELAY_MS).then(processCpuTurn);
                } else {
                    processCpuTurn();
                }
            }
        });
    } else {
        addLog(`${getPlayerName(BLACK)}: パス (置ける場所がありません)`);
        const passedPlayer = gameState.currentPlayer;
        const playerKey = passedPlayer === BLACK ? 'black' : 'white';

        const result = applyPassViaPipeline(playerKey);
        if (!result.ok) {
            console.warn('[PASS-HANDLER] Pass was rejected, continuing anyway');
        }

        emitBoardUpdate();
        emitGameStateChange();
        if (isGameOver(gameState)) {
            showResult();
            isProcessing = false;
        } else {
            isProcessing = true;
            if (typeof onTurnStartLogic === 'function') {
                onTurnStartLogic(WHITE);
            } else if (typeof onTurnStart === 'function') {
                onTurnStart(WHITE);
            }
            if (timers && typeof timers.waitMs === 'function') {
                timers.waitMs(CPU_TURN_DELAY_MS).then(processCpuTurn);
            } else {
                processCpuTurn();
            }
        }
    }
}

async function processPassTurn(playerKey, autoMode) {
    const selfName = playerKey === 'white' ? '白' : '黒';
    addLog(`${selfName}: パス${autoMode ? ' (AUTO)' : ''}`);
    const passedPlayer = gameState.currentPlayer;
    const passedPlayerKey = passedPlayer === BLACK ? 'black' : 'white';

    const result = applyPassViaPipeline(passedPlayerKey);
    if (!result.ok) {
        console.warn('[PASS-HANDLER] Pass was rejected, continuing anyway');
    }

    emitBoardUpdate();
    emitGameStateChange();

    if (isGameOver(gameState)) {
        showResult();
        isProcessing = false;
        return true;
    }

    const nextPlayer = gameState.currentPlayer;
    if (typeof getLegalMoves === 'undefined') {
        console.error('getLegalMoves undefined');
        return true;
    }

    const nextProtection = (typeof getActiveProtectionForPlayer === 'function')
        ? getActiveProtectionForPlayer(nextPlayer)
        : [];

    const nextPerma = (typeof getFlipBlockers === 'function')
        ? getFlipBlockers()
        : [];

    const nextMoves = getLegalMoves(gameState, nextProtection, nextPerma);

    if (!nextMoves.length) {
        if (isGameOver(gameState)) {
            showResult();
            isProcessing = false;
            return true;
        }

        if (nextPlayer === WHITE) {
            isProcessing = true;
            if (typeof onTurnStart === 'function') onTurnStart(WHITE);
            if (timers && typeof timers.waitMs === 'function') {
                timers.waitMs(CPU_TURN_DELAY_MS).then(processCpuTurn);
            } else {
                processCpuTurn();
            }
        } else {
            if (nextPlayer === WHITE) {
                isProcessing = true;
                if (timers && typeof timers.waitMs === 'function') {
                    timers.waitMs(CPU_TURN_DELAY_MS).then(processCpuTurn);
                } else {
                    processCpuTurn();
                }
            } else {
                handleBlackPassWhenNoMoves();
            }
        }
        return true;
    }

    if (nextPlayer === WHITE) {
        isProcessing = true;
        if (typeof onTurnStart === 'function') onTurnStart(WHITE);
        if (timers && typeof timers.waitMs === 'function') {
            timers.waitMs(CPU_TURN_DELAY_MS).then(processCpuTurn);
        } else {
            processCpuTurn();
        }
    } else {
        isProcessing = false;
        if (typeof onTurnStart === 'function') onTurnStart(BLACK);
        emitBoardUpdate();
    }
    return true;
}
})();
