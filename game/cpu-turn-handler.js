// CPU turn orchestration extracted from turn-manager

// Timers abstraction (injected by UI)
(function () {
let timers = null;
if (typeof require === 'function') {
    try { timers = require('./timers'); } catch (e) { /* ignore */ }
}

async function processCpuTurn() {
    if (typeof gameState !== 'undefined' && gameState && gameState.currentPlayer !== WHITE) {
        console.log('[CPU] processCpuTurn skipped: not WHITE turn');
        return;
    }
    console.log('[DEBUG][processCpuTurn] enter', { isProcessing, isCardAnimating, gameStateCurrentPlayer: gameState && gameState.currentPlayer });
    runCpuTurn('white');
    console.log('[DEBUG][processCpuTurn] exit');
}

async function processAutoBlackTurn() {
    // Re-enabled for Auto mode: invoke black run with autoMode flag
    if (isProcessing || isCardAnimating) return;
    if (typeof gameState !== 'undefined' && gameState && gameState.currentPlayer !== BLACK) {
        console.log('[CPU] processAutoBlackTurn skipped: not BLACK turn');
        return;
    }
    return runCpuTurn('black', { autoMode: true });
}

// Browser exposure
if (typeof globalThis !== 'undefined') {
    globalThis.processCpuTurn = processCpuTurn;
    globalThis.processAutoBlackTurn = processAutoBlackTurn;
    globalThis.runCpuTurn = runCpuTurn;
}


async function runCpuTurn(playerKey, { autoMode = false } = {}) {
    const isWhite = playerKey === 'white';
    const selfColor = isWhite ? WHITE : BLACK;
    const selfName = isWhite ? '白' : '黒';

    if (isDebugLogAvailable()) {
        debugLog(`[AI] Starting CPU turn for ${playerKey}`, 'info', {
            playerKey,
            isWhite,
            autoMode,
            hasUsedCard: cardState.hasUsedCardThisTurnByPlayer[playerKey],
            pendingEffect: !!cardState.pendingEffectByPlayer[playerKey]
        });
    }

    isProcessing = true;

    if (isCardAnimating) {
        if (timers && typeof timers.waitMs === 'function') {
            timers.waitMs(ANIMATION_RETRY_DELAY_MS).then(() => runCpuTurn(playerKey, { autoMode }));
        } else {
            runCpuTurn(playerKey, { autoMode });
        }
        return;
    }

    try {
        if (!cardState.hasUsedCardThisTurnByPlayer[playerKey] && cardState.pendingEffectByPlayer[playerKey] === null) {
            cpuMaybeUseCardWithPolicy(playerKey);
            if (isCardAnimating) {
                isProcessing = false; // Reset before retry
                if (timers && typeof timers.waitMs === 'function') {
                    timers.waitMs(ANIMATION_RETRY_DELAY_MS).then(() => runCpuTurn(playerKey, { autoMode }));
                } else {
                    runCpuTurn(playerKey, { autoMode });
                }
                return;
            }
        }

        let pending = cardState.pendingEffectByPlayer[playerKey];
        if (pending && pending.type === 'DESTROY_ONE_STONE' && pending.stage === 'selectTarget') {
            if (isDebugLogAvailable()) {
                debugLog(`[AI] CPU selecting destroy target`, 'debug', {
                    playerKey,
                    pendingEffect: pending
                });
            }
            await cpuSelectDestroyWithPolicy(playerKey);
            pending = cardState.pendingEffectByPlayer[playerKey];
        }
        if (pending && pending.type === 'INHERIT_WILL' && pending.stage === 'selectTarget') {
            if (isDebugLogAvailable()) {
                debugLog(`[AI] CPU selecting inherit target`, 'debug', {
                    playerKey,
                    pendingEffect: pending
                });
            }
            await cpuSelectInheritWillWithPolicy(playerKey);
            pending = cardState.pendingEffectByPlayer[playerKey];
        }
        if (pending && pending.type === 'SWAP_WITH_ENEMY' && pending.stage === 'selectTarget') {
            if (isDebugLogAvailable()) {
                debugLog(`[AI] CPU selecting swap target`, 'debug', {
                    playerKey,
                    pendingEffect: pending
                });
            }
            if (typeof cpuSelectSwapWithEnemyWithPolicy === 'function') {
                await cpuSelectSwapWithEnemyWithPolicy(playerKey);
            } else {
                cardState.pendingEffectByPlayer[playerKey] = null;
            }
            pending = cardState.pendingEffectByPlayer[playerKey];
        }
        if (pending && pending.type === 'TEMPT_WILL' && pending.stage === 'selectTarget') {
            if (isDebugLogAvailable()) {
                debugLog(`[AI] CPU selecting tempt target`, 'debug', {
                    playerKey,
                    pendingEffect: pending
                });
            }
            if (typeof cpuSelectTemptWillWithPolicy === 'function') {
                await cpuSelectTemptWillWithPolicy(playerKey);
            } else {
                cardState.pendingEffectByPlayer[playerKey] = null;
            }
            pending = cardState.pendingEffectByPlayer[playerKey];
        }

        const protection = getActiveProtectionForPlayer(selfColor); // Fixed to use selfColor
        const perma = (typeof getFlipBlockers === 'function') ? getFlipBlockers() : [];
        const candidateMoves = generateMovesForPlayer(selfColor, pending, protection, perma);

        if (!candidateMoves.length) {
            processPassTurn(playerKey, autoMode);
            return;
        }

        const move = selectCpuMoveWithPolicy(candidateMoves, playerKey);
        if (isDebugLogAvailable()) {
            debugLog(`[AI] Move selected`, 'info', {
                playerKey,
                selectedMove: { row: move.row, col: move.col },
                candidateCount: candidateMoves.length,
                flips: move.flips ? move.flips.length : 0
            });
        }

        playHandAnimation(selfColor, move.row, move.col, () => {
            if (isCardAnimating) {
                if (timers && typeof timers.waitMs === 'function') {
                    timers.waitMs(ANIMATION_SETTLE_DELAY_MS).then(() => executeMove(move));
                } else {
                    executeMove(move);
                }
            } else {
                executeMove(move);
            }
        });
    } catch (error) {
        console.error(`[AI] Error in runCpuTurn for ${playerKey}:`, error);
        console.error(`[AI] Error message: ${error.message}`);
        console.error(`[AI] Error stack: ${error.stack}`);
        if (isDebugLogAvailable()) {
            debugLog(`[AI] CPU Error for ${playerKey}: ${error.message}`, 'error', {
                errorStack: error.stack,
                playerKey
            });
        }
        isProcessing = false;
        // If it's a critical logic error, we might want to skip the turn or alert the user
        addLog(`${selfName}の思考中にエラーが発生しました`);
    }
}

})();

// Export symbols for use by other modules
if (typeof module !== 'undefined' && module.exports) {
    try {
        module.exports = { processCpuTurn, processAutoBlackTurn, runCpuTurn };
    } catch (e) { /* defensive: running in non-CommonJS env */ }
}
