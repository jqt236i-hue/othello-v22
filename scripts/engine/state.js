/**
 * @file state.js
 * @description Headlessゲーム状態遷移エンジン
 * 純粋な状態遷移でゲームを進行、ISMCTS AIと統合
 */

'use strict';

const { createPrng } = require('./prng');
const CoreLogic = require('./core-logic-headless');
const CardState = require('./card-state-headless');
const { checkAllInvariants, InvariantViolationError } = require('./invariants');
const { createHistoryEntry } = require('./replay');
const SharedConstants = require('../../shared-constants');
const ISMCTS_API = require('../../ai/ismcts/api');
const PositionWeights = require('../../game/logic/position-weights');

const { BLACK, WHITE } = SharedConstants;

// ===== 設定 =====

/**
 * レベル別ISMCTS設定（簡易版）
 * @param {number} level
 * @returns {Object}
 */
function getConfigForLevel(level) {
    const configs = {
        1: { maxSimulations: 50, timeLimitMs: 50, explorationConstant: 2.5, randomActionProb: 0.4 },
        2: { maxSimulations: 100, timeLimitMs: 100, explorationConstant: 2.2, randomActionProb: 0.25 },
        3: { maxSimulations: 200, timeLimitMs: 150, explorationConstant: 2.0, randomActionProb: 0.15 },
        4: { maxSimulations: 400, timeLimitMs: 200, explorationConstant: 1.8, randomActionProb: 0.08 },
        5: { maxSimulations: 800, timeLimitMs: 300, explorationConstant: 1.5, randomActionProb: 0.03 },
        6: { maxSimulations: 1500, timeLimitMs: 500, explorationConstant: 1.2, randomActionProb: 0.0 }
    };
    return configs[Math.max(1, Math.min(6, level))] || configs[3];
}

// ===== 状態管理 =====

/**
 * 初期状態を生成
 * @param {number} seed - PRNGシード
 * @param {Object} options
 * @param {number} [options.p1Level=3] - 黒プレイヤーのレベル
 * @param {number} [options.p2Level=3] - 白プレイヤーのレベル
 * @param {boolean} [options.checkInvariants=true] - 不変条件チェック有効化
 * @returns {Object} 統合状態オブジェクト
 */
function createInitialState(seed, options = {}) {
    const {
        p1Level = 3,
        p2Level = 3,
        checkInvariants = true
    } = options;

    const prng = createPrng(seed);
    const gameState = CoreLogic.createGameState();
    const cardState = CardState.createCardState(prng);

    // 初期手札配布
    CardState.dealInitialHands(cardState, prng);

    // 初期ターン開始（黒から）
    CardState.onTurnStart(cardState, 'black', gameState, prng);

    return {
        seed,
        prng,
        gameState,
        cardState,
        config: {
            p1Level,
            p2Level,
            checkInvariants
        },
        history: [],
        turnNumber: 0,
        phase: 'card', // 'card' -> 'target' -> 'move' -> 'end_turn'
        done: false
    };
}

/**
 * 現在のプレイヤーキーを取得
 * @param {Object} state
 * @returns {string} 'black' or 'white'
 */
function getCurrentPlayerKey(state) {
    return state.gameState.currentPlayer === BLACK ? 'black' : 'white';
}

/**
 * 現在のプレイヤーのCPUレベルを取得
 * @param {Object} state
 * @returns {number}
 */
function getCurrentPlayerLevel(state) {
    const playerKey = getCurrentPlayerKey(state);
    return playerKey === 'black' ? state.config.p1Level : state.config.p2Level;
}

// ===== AI決定 =====

/**
 * カード使用判断（ヒューリスティック版）
 * @param {Object} state
 * @param {string} playerKey
 * @returns {{useCard: boolean, cardId: string|null, cardType: string|null}}
 */
function decideCardUsage(state, playerKey) {
    const { cardState, prng } = state;
    const hand = cardState.hands[playerKey];
    const charge = cardState.charge[playerKey];
    const level = getCurrentPlayerLevel(state);

    // Lv4以上ならISMCTSを使用
    if (level >= 4) {
        // カード使用済みチェック
        if (cardState.hasUsedCardThisTurnByPlayer[playerKey]) {
            return { useCard: false, cardId: null, cardType: null };
        }
        // シード生成
        const seed = prng.randInt(0, 0x7FFFFFFF);
        return ISMCTS_API.selectISMCTSCardAction(state.gameState, state.cardState, playerKey, level, seed);
    }

    // 以下、Lv1-3用簡易ロジック

    // 既にこのターンでカードを使用済み
    if (cardState.hasUsedCardThisTurnByPlayer[playerKey]) {
        return { useCard: false, cardId: null, cardType: null };
    }

    // レベルに応じたカード使用確率
    const useProb = 0.1 + level * 0.1; // レベル1で20%、レベル3で40%

    // 使用可能なカードを探す
    const affordableCards = hand.filter(cardId => {
        const cost = CardState.getCardCost(cardId);
        return charge >= cost;
    });

    if (affordableCards.length === 0) {
        return { useCard: false, cardId: null, cardType: null };
    }

    // 確率チェック
    if (!prng.chance(useProb)) {
        return { useCard: false, cardId: null, cardType: null };
    }

    // コストの安いカードを優先
    affordableCards.sort((a, b) => CardState.getCardCost(a) - CardState.getCardCost(b));
    const selectedCard = affordableCards[0];
    const cardType = CardState.getCardType(selectedCard);

    return { useCard: true, cardId: selectedCard, cardType };
}

/**
 * ターゲット選択（DESTROY, SWAP等）
 * @param {Object} state
 * @param {string} playerKey
 * @param {string} effectType
 * @returns {{row: number, col: number}|null}
 */
function selectTarget(state, playerKey, effectType) {
    const { gameState, prng } = state;
    const level = getCurrentPlayerLevel(state);

    // Lv4以上ならISMCTSを使用
    if (level >= 4) {
        const seed = prng.randInt(0, 0x7FFFFFFF);
        const target = ISMCTS_API.selectISMCTSTarget(state.gameState, state.cardState, playerKey, effectType, level, seed);
        if (target) return target;
        // フォールバック: ターゲットが見つからない場合はnull
    }

    // 以下、Lv1-3用簡易ロジック
    const player = playerKey === 'black' ? BLACK : WHITE;
    const opponent = -player;

    const targets = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (effectType === 'DESTROY_ONE_STONE') {
                if (gameState.board[r][c] !== CoreLogic.EMPTY) {
                    targets.push({ row: r, col: c });
                }
            } else if (effectType === 'SWAP_WITH_ENEMY') {
                if (gameState.board[r][c] === opponent) {
                    targets.push({ row: r, col: c });
                }
            }
        }
    }

    if (targets.length === 0) return null;

    // 角優先
    const corners = targets.filter(t =>
        (t.row === 0 || t.row === 7) && (t.col === 0 || t.col === 7)
    );
    if (corners.length > 0) {
        return prng.pick(corners);
    }

    // ランダム
    return prng.pick(targets);
}

/**
 * 手選択（配置またはパス）
 * @param {Object} state
 * @param {string} playerKey
 * @returns {Object} action
 */
function selectMove(state, playerKey) {
    const { gameState, cardState, prng } = state;
    const player = playerKey === 'black' ? BLACK : WHITE;
    const context = CardState.getCardContext(cardState);
    const pending = cardState.pendingEffectByPlayer[playerKey];

    // FREE_PLACEMENT効果中
    if (pending && pending.type === 'FREE_PLACEMENT') {
        const moves = CoreLogic.getFreePlacementMoves(gameState, player, context);
        if (moves.length > 0) {
            // 通常の合法手があればそちらを優先
            const legalMoves = moves.filter(m => m.flips.length > 0);
            if (legalMoves.length > 0) {
                return selectBestMove(legalMoves, state, playerKey);
            }
            // 角優先
            const corners = moves.filter(m =>
                (m.row === 0 || m.row === 7) && (m.col === 0 || m.col === 7)
            );
            if (corners.length > 0) {
                const move = prng.pick(corners);
                return { type: 'place', row: move.row, col: move.col, flips: move.flips };
            }
            const move = prng.pick(moves);
            return { type: 'place', row: move.row, col: move.col, flips: move.flips };
        }
    }

    // 通常の合法手
    const legalMoves = CoreLogic.getLegalMoves(gameState, player, context);

    if (legalMoves.length === 0) {
        return { type: 'pass' };
    }

    // Lv4以上ならISMCTSを使用
    const level = getCurrentPlayerLevel(state);
    if (level >= 4) {
        const seed = prng.randInt(0, 0x7FFFFFFF);

        // ISMCTSに「移動選定のみ」を行わせるため、カード使用済みフラグを立てた状態を渡す
        const tempCardState = structuredClone(state.cardState);
        tempCardState.hasUsedCardThisTurnByPlayer[playerKey] = true;

        const move = ISMCTS_API.selectISMCTSMove(legalMoves, state.gameState, tempCardState, playerKey, level, seed);
        if (move) {
            return { type: 'place', row: move.row, col: move.col, flips: move.flips };
        }
        // フォールバック: selectBestMoveへ
    }

    return selectBestMove(legalMoves, state, playerKey);
}

/**
 * 最良の手を選択（ヒューリスティック）
 * @param {Array} moves
 * @param {Object} state
 * @param {string} playerKey
 * @returns {Object} action
 */
function selectBestMove(moves, state, playerKey) {
    const { prng } = state;
    const level = getCurrentPlayerLevel(state);
    const config = getConfigForLevel(level);

    // ランダム選択確率
    if (prng.chance(config.randomActionProb)) {
        const move = prng.pick(moves);
        return { type: 'place', row: move.row, col: move.col, flips: move.flips };
    }

    // 評価値でソート
    const scored = moves.map(m => ({
        move: m,
        score: evaluateMove(m, state)
    }));
    scored.sort((a, b) => b.score - a.score);

    // 上位からレベルに応じた範囲で選択
    const topN = Math.max(1, Math.min(moves.length, 7 - level));
    const selected = scored.slice(0, topN);
    const pick = prng.pick(selected);

    return { type: 'place', row: pick.move.row, col: pick.move.col, flips: pick.move.flips };
}

/**
 * 手の評価（共通位置マトリックス使用）
 * @param {Object} move
 * @param {Object} state
 * @returns {number}
 */
function evaluateMove(move, state) {
    const { row, col, flips } = move;
    // 反転数ボーナス + 位置評価
    return flips.length * 10 + PositionWeights.getPositionScore(row, col);
}

// ===== ステップ実行 =====

/**
 * 1アクションを実行
 * @param {Object} state - 現在の状態
 * @returns {{state: Object, action: Object, done: boolean}} 新しい状態と実行したアクション
 */
function step(state) {
    if (state.done) {
        return { state, action: null, done: true };
    }

    const playerKey = getCurrentPlayerKey(state);
    const { cardState, gameState, prng, config } = state;
    let action = null;

    // フェーズに応じた処理
    switch (state.phase) {
        case 'card': {
            // カード使用フェーズ
            const decision = decideCardUsage(state, playerKey);

            if (decision.useCard) {
                CardState.applyCardUsage(cardState, playerKey, decision.cardId);
                action = {
                    type: 'useCard',
                    cardId: decision.cardId,
                    cardType: decision.cardType
                };

                // ターゲット選択が必要なカード
                const needsTarget = ['DESTROY_ONE_STONE', 'SWAP_WITH_ENEMY'];
                if (needsTarget.includes(decision.cardType)) {
                    state.phase = 'target';
                } else {
                    state.phase = 'move';
                }
            } else {
                action = { type: 'skipCard' };
                state.phase = 'move';
            }
            break;
        }

        case 'target': {
            // ターゲット選択フェーズ
            const pending = cardState.pendingEffectByPlayer[playerKey];
            if (!pending) {
                state.phase = 'move';
                break;
            }

            const target = selectTarget(state, playerKey, pending.type);

            if (target) {
                if (pending.type === 'DESTROY_ONE_STONE') {
                    CardState.applyDestroyEffect(cardState, gameState, playerKey, target.row, target.col);
                } else if (pending.type === 'SWAP_WITH_ENEMY') {
                    CardState.applySwapEffect(cardState, gameState, playerKey, target.row, target.col);
                }
                action = { type: 'selectTarget', effectType: pending.type, row: target.row, col: target.col };
            } else {
                // ターゲットなし→キャンセル
                cardState.pendingEffectByPlayer[playerKey] = null;
                action = { type: 'cancelEffect' };
            }
            state.phase = 'move';
            break;
        }

        case 'move': {
            // 配置/パスフェーズ
            const moveAction = selectMove(state, playerKey);

            if (moveAction.type === 'place') {
                const prevGameState = CoreLogic.copyGameState(gameState);

                // 配置実行
                const newGameState = CoreLogic.applyMove(gameState, moveAction);
                Object.assign(gameState, newGameState);

                // カード効果適用
                const effects = CardState.applyPlacementEffects(
                    cardState, gameState, playerKey,
                    moveAction.row, moveAction.col,
                    moveAction.flips.length
                );

                action = {
                    type: 'place',
                    row: moveAction.row,
                    col: moveAction.col,
                    flips: moveAction.flips,
                    effects
                };

                // GOLD_STONE: Disappears after placement
                if (effects.goldStoneUsed) {
                    gameState.board[moveAction.row][moveAction.col] = EMPTY;
                }

                // 二連投石チェック
                if (cardState.extraPlaceRemainingByPlayer[playerKey] > 0) {
                    cardState.extraPlaceRemainingByPlayer[playerKey]--;
                    // 同じプレイヤーがもう一度置ける
                    gameState.currentPlayer = prevGameState.currentPlayer;
                    state.phase = 'move';
                } else {
                    state.phase = 'end_turn';
                }
            } else {
                // パス
                const newGameState = CoreLogic.applyPass(gameState);
                Object.assign(gameState, newGameState);
                action = { type: 'pass' };
                state.phase = 'end_turn';
            }
            break;
        }

        case 'end_turn': {
            // ターン終了処理
            const nextPlayerKey = getCurrentPlayerKey(state);

            // 爆弾処理
            const exploded = CardState.tickBombs(cardState, gameState, nextPlayerKey);
            if (exploded.length > 0) {
                action = { type: 'bombExplode', bombs: exploded };
            }

            // ドラゴン処理 is now handled in onTurnStart (Rule 10.9)

            // ゲーム終了チェック
            if (CoreLogic.isGameOver(gameState)) {
                state.done = true;
                state.phase = 'finished';
            } else {
                // 次のターン開始（Dragon効果もここで処理される）
                CardState.onTurnStart(cardState, nextPlayerKey, gameState, prng);
                state.turnNumber++;
                state.phase = 'card';
            }

            if (!action) {
                action = { type: 'endTurn' };
            }
            break;
        }
    }

    // 履歴に追加
    if (action && action.type !== 'endTurn') {
        state.history.push(createHistoryEntry(action, state.turnNumber, playerKey));
    }

    // 不変条件チェック
    if (config.checkInvariants && action) {
        checkAllInvariants(gameState, cardState);
    }

    return { state, action, done: state.done };
}

/**
 * ゲームを最後まで実行
 * @param {number} seed
 * @param {number} p1Level
 * @param {number} p2Level
 * @param {Object} options
 * @param {boolean} [options.checkInvariants=true]
 * @param {number} [options.maxTurns=200] - 無限ループ防止
 * @returns {Object} 結果
 */
function runGame(seed, p1Level, p2Level, options = {}) {
    const { checkInvariants = true, maxTurns = 200 } = options;

    const state = createInitialState(seed, { p1Level, p2Level, checkInvariants });

    // 初期状態を保存（リプレイ用）
    const initialGameState = CoreLogic.copyGameState(state.gameState);
    const initialCardState = CardState.copyCardState(state.cardState);

    let stepCount = 0;
    const maxSteps = maxTurns * 10; // 1ターンあたり最大10アクション

    while (!state.done && stepCount < maxSteps) {
        const result = step(state);
        stepCount++;

        if (result.done) break;
    }

    // 結果集計
    const counts = CoreLogic.countDiscs(state.gameState);
    let winner = null;
    if (counts.black > counts.white) winner = 'black';
    else if (counts.white > counts.black) winner = 'white';
    else winner = 'draw';

    return {
        seed,
        winner,
        blackCount: counts.black,
        whiteCount: counts.white,
        turnCount: state.turnNumber,
        stepCount,
        history: state.history,
        initialGameState,
        initialCardState,
        config: state.config,
        exceededMaxSteps: stepCount >= maxSteps
    };
}

module.exports = {
    // State management
    createInitialState,
    getCurrentPlayerKey,
    getCurrentPlayerLevel,

    // Execution
    step,
    runGame,

    // AI
    decideCardUsage,
    selectTarget,
    selectMove,
    selectBestMove,
    evaluateMove,

    // Config
    getConfigForLevel
};
