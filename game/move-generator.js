/**
 * @file move-generator.js
 * @description 合法手生成モジュール
 * 
 * CoreLogic を使用して合法手を生成する。
 * CPU評価関数は別ファイル (game/ai/level-system.js) に移行予定。
 */

if (typeof CoreLogic === 'undefined') {
    console.error('CoreLogic is not loaded.');
}

// ===== Move Generation & Legal Move Lookup =====

/**
 * 合法手リストを取得
 * @param {Object} state - ゲーム状態
 * @param {Array} protectedStones - 保護石リスト
 * @param {Array} permaProtectedStones - 永久保護石リスト
 * @returns {Array} 合法手リスト
 */
function getLegalMoves(state, protectedStones, permaProtectedStones) {
    let context;
    if (typeof CardLogic !== 'undefined' && typeof cardState !== 'undefined') {
        // Prefer caller-provided protection arrays when available (safer during early bootstrap when cardState may be incomplete)
        try {
            if (Array.isArray(protectedStones) && Array.isArray(permaProtectedStones)) {
                context = {
                    protectedStones: protectedStones,
                    permaProtectedStones: permaProtectedStones,
                    bombs: (cardState && cardState.bombs) ? cardState.bombs : []
                };
            } else {
                context = CardLogic.getCardContext(cardState);
            }
        } catch (e) {
            console.warn('[getLegalMoves] CardLogic.getCardContext threw — falling back to safe context:', e && e.message);
            context = {
                protectedStones: protectedStones || [],
                permaProtectedStones: permaProtectedStones || [],
                bombs: (cardState && cardState.bombs) ? cardState.bombs : []
            };
        }
    } else {
        context = {
            protectedStones: protectedStones || [],
            permaProtectedStones: permaProtectedStones || [],
            bombs: (typeof cardState !== 'undefined' && cardState.bombs) ? cardState.bombs : []
        };
    }

    return CoreLogic.getLegalMoves(state, state.currentPlayer, context);
}

// ===== Shared Move Helpers =====

/**
 * 保護セルのセットを作成
 */
function createProtectedCellSet(protection, perma) {
    const set = new Set();
    if (protection && protection.length) {
        protection.forEach(p => set.add(p.row + ',' + p.col));
    }
    if (perma && perma.length) {
        perma.forEach(p => set.add(p.row + ',' + p.col));
    }
    return set;
}

/**
 * プレイヤーの手を生成（カード効果考慮）
 */
function generateMovesForPlayer(player, pending, protection, perma) {
    const legal = getLegalMoves(gameState, protection, perma);
    if (!pending) {
        return legal.map(m => ({ ...m, effectUsed: null, player }));
    }

    const pendingType = pending.type;
    // Target-selection cards must be resolved BEFORE any placement can happen.
    if (pending.stage === 'selectTarget' && (
        pendingType === 'DESTROY_ONE_STONE' ||
        pendingType === 'SWAP_WITH_ENEMY' ||
        pendingType === 'INHERIT_WILL' ||
        pendingType === 'TEMPT_WILL'
    )) {
        return [];
    }
    if (pendingType === 'FREE_PLACEMENT') {
        return generateFreePlacementMoves(player, protection, perma);
    }
    if (pendingType === 'SWAP_WITH_ENEMY') {
        return generateSwapMoves(player, legal, protection, perma);
    }

    return legal.map(m => ({ ...m, effectUsed: pendingType, player }));
}

/**
 * 自由配置モードの手を生成
 */
function generateFreePlacementMoves(player, protection, perma) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (gameState.board[r][c] !== EMPTY) continue;
            const flips = getFlips(gameState, r, c, player, protection, perma);
            moves.push({ row: r, col: c, flips, effectUsed: 'FREE_PLACEMENT', player });
        }
    }
    return moves;
}

/**
 * スワップモードの手を生成
 */
function generateSwapMoves(player, legal, protection, perma) {
    const moves = [];
    const legalSet = new Set(legal.map(m => m.row + ',' + m.col));
    const protectedCells = createProtectedCellSet(protection, perma);

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cellVal = gameState.board[r][c];
            const key = r + ',' + c;

            if (cellVal === -player && !protectedCells.has(key)) {
                const original = gameState.board[r][c];
                gameState.board[r][c] = EMPTY;
                const swapFlips = getFlips(gameState, r, c, player, protection, perma);
                gameState.board[r][c] = original;
                moves.push({ row: r, col: c, flips: swapFlips, effectUsed: 'SWAP_WITH_ENEMY', player });
            }
        }
    }
    return moves;
}

/**
 * 特定セルの手を検索
 */
function findMoveForCell(player, row, col, pending, protection, perma) {
    const moves = generateMovesForPlayer(player, pending, protection, perma);
    return moves.find(m => m.row === row && m.col === col) || null;
}

// ===== Utility Functions =====

/**
 * 座標を表記法に変換
 */
function posToNotation(row, col) {
    const cols = 'abcdefgh';
    return cols[col] + (row + 1);
}

/**
 * 角かどうか判定
 */
function isCorner(row, col) {
    return (row === 0 || row === 7) && (col === 0 || col === 7);
}

/**
 * 辺かどうか判定
 */
function isEdge(row, col) {
    return row === 0 || row === 7 || col === 0 || col === 7;
}

// ===== Exports =====

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getLegalMoves,
        generateMovesForPlayer,
        generateFreePlacementMoves,
        generateSwapMoves,
        findMoveForCell,
        posToNotation,
        isCorner,
        isEdge
    };
}
