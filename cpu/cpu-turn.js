// CPU行動制御モジュール
// CPUの思考と行動実行を担当

/**
 * CPU (白) のターン処理
 */
function processCpuTurn() {
    const playerKey = 'white';
    isProcessing = true;
    
    // アニメーション中は待機
    if (isCardAnimating) {
        setTimeout(processCpuTurn, 80);
        return;
    }
    
    const protection = getActiveProtectionForPlayer(gameState.currentPlayer);
    const perma = (typeof getFlipBlockers === 'function') ? getFlipBlockers() : [];

    // カードを使用するか判断
    if (!cardState.hasUsedCardThisTurnByPlayer[playerKey] && 
        cardState.pendingEffectByPlayer[playerKey] === null) {
        cpuMaybeUseCardWithPolicy(playerKey);
        if (isCardAnimating) {
            setTimeout(processCpuTurn, 80);
            return;
        }
    }
    
    const pending = cardState.pendingEffectByPlayer[playerKey];

    // 破壊神カード使用時、ターゲットを選択
    if (pending && pending.type === 'DESTROY_ONE_STONE' && pending.stage === 'selectTarget') {
        cpuSelectDestroyWithPolicy(playerKey);
    }

    const candidateMoves = generateMovesForPlayer(gameState.currentPlayer, pending, protection, perma);

    // 合法手がない場合（パス）
    if (!candidateMoves.length) {
        addLog('白: パス');
        const passedPlayer = gameState.currentPlayer;
        gameState = applyPass(gameState);
        clearExpiredProtections(passedPlayer);
        if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
        if (typeof emitGameStateChange === 'function') emitGameStateChange();

        if (isGameOver(gameState)) {
            showResult();
            isProcessing = false;
            return;
        }

        const blackMoves = getLegalMoves(gameState, getActiveProtectionForPlayer(gameState.currentPlayer), (typeof getFlipBlockers === 'function') ? getFlipBlockers() : []);
        if (blackMoves.length === 0) {
            if (isGameOver(gameState)) {
                showResult();
                isProcessing = false;
                return;
            }
            setTimeout(processCpuTurn, 600);
        } else {
            isProcessing = false;
            onTurnStart(BLACK);
        }
        return;
    }

    // 最良手を選択して実行
    const move = selectCpuMoveWithPolicy(candidateMoves, playerKey);
    playHandAnimation(WHITE, move.row, move.col, () => {
        if (isCardAnimating) {
            setTimeout(() => executeMove(move), 100);
        } else {
            executeMove(move);
        }
    });
}

/**
 * 自動プレイ時の黒（プレイヤー側）のターン処理
 */
function processAutoBlackTurn() {
    // Compatibility: when auto-mode is enabled, CPU will play black automatically.
    // This function implements the auto-black turn. It is intentionally symmetric to
    // `processCpuTurn` but keeps playerKey='black' and uses the public helpers.
    const playerKey = 'black';
    isProcessing = true;

    // Wait for animations to settle
    if (isCardAnimating) {
        setTimeout(processAutoBlackTurn, 80);
        return;
    }

    const protection = getActiveProtectionForPlayer(gameState.currentPlayer);
    const perma = (typeof getFlipBlockers === 'function') ? getFlipBlockers() : [];

    // Card usage decision
    if (!cardState.hasUsedCardThisTurnByPlayer[playerKey] &&
        cardState.pendingEffectByPlayer[playerKey] === null) {
        cpuMaybeUseCardWithPolicy(playerKey);
        if (isCardAnimating) {
            setTimeout(processAutoBlackTurn, 80);
            return;
        }
    }

    const pending = cardState.pendingEffectByPlayer[playerKey];

    if (pending && pending.type === 'DESTROY_ONE_STONE' && pending.stage === 'selectTarget') {
        cpuSelectDestroyWithPolicy(playerKey);
    }

    const candidateMoves = generateMovesForPlayer(gameState.currentPlayer, pending, protection, perma);

    // No legal moves => pass
    if (!candidateMoves.length) {
        addLog('黒: パス (AUTO)');
        const passedPlayer = gameState.currentPlayer;
        gameState = applyPass(gameState);
        clearExpiredProtections(passedPlayer);
        if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
        if (typeof emitGameStateChange === 'function') emitGameStateChange();

        if (isGameOver(gameState)) {
            showResult();
            isProcessing = false;
            return;
        }

        const whiteMoves = getLegalMoves(gameState, getActiveProtectionForPlayer(gameState.currentPlayer), (typeof getFlipBlockers === 'function') ? getFlipBlockers() : []);
        if (whiteMoves.length === 0) {
            if (isGameOver(gameState)) {
                showResult();
                isProcessing = false;
                return;
            }
            setTimeout(processCpuTurn, 600);
        } else {
            isProcessing = true;
            onTurnStart(WHITE);
            setTimeout(processCpuTurn, 600);
        }
        return;
    }

    // Choose and execute best move
    const move = selectCpuMoveWithPolicy(candidateMoves, playerKey);
    playHandAnimation(BLACK, move.row, move.col, () => {
        if (isCardAnimating) {
            setTimeout(() => executeMove(move), 100);
        } else {
            executeMove(move);
        }
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { processCpuTurn, processAutoBlackTurn };
}
