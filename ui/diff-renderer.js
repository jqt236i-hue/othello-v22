/**
 * @file diff-renderer.js
 * @description 差分レンダリングシステム - Virtual DOM的なアプローチで盤面更新を最適化
 * Differential rendering system for optimized board updates
 */

/**
 * @typedef {Object} CellState
 * @property {number} value - セルの値 (BLACK=1, WHITE=-1, EMPTY=0)
 * @property {boolean} isLegal - 合法手かどうか
 * @property {boolean} isLegalFree - 自由配置可能かどうか
 * @property {boolean} isProtected - 一時保護されているか
 * @property {boolean} isPermaProtected - 永久保護されているか
 * @property {string|null} permaOwner - 永久保護の所有者 ('black'|'white'|null)
 * @property {Object|null} bomb - 爆弾情報 {remainingTurns: number}
 * @property {Object|null} dragon - 龍情報 {owner: number, remainingOwnerTurns: number}
 */

/**
 * 前回のレンダリング状態を保持
 * Stores previous render state for diff calculation
 * @type {Array<Array<CellState>>|null}
 */
let previousBoardState = null;

/**
 * DOM要素キャッシュ - セル要素の参照を保持
 * Cache of cell DOM elements for fast access
 * @type {Array<Array<HTMLElement>>}
 */
let cellCache = [];

/**
 * 盤面を初期化（最初の1回のみ全レンダリング）
 * Initialize board with full rendering (first time only)
 * @param {HTMLElement} boardEl - 盤面要素
 */
function initializeBoardDOM(boardEl) {
    boardEl.innerHTML = '';
    cellCache = [];

    for (let r = 0; r < 8; r++) {
        cellCache[r] = [];
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', () => handleCellClick(r, c));
            boardEl.appendChild(cell);
            cellCache[r][c] = cell;
        }
    }

    previousBoardState = null;
    console.log('[DiffRenderer] Board DOM initialized with cell cache');
}


/**
 * 現在のゲーム状態からセル状態を構築
 * Build cell state from current game state
 * @returns {Array<Array<CellState>>} 8x8セル状態配列
 */
function buildCurrentCellState() {
    const player = gameState.currentPlayer;
    // Minimal, single-site guard: if cardState is missing or incomplete, use an empty context
    // to avoid throwing inside CardLogic.getCardContext during early-init race.
    let context;
    if (cardState && Array.isArray(cardState.specialStones) && Array.isArray(cardState.bombs)) {
        context = CardLogic.getCardContext(cardState);
    } else {
        console.warn('[DiffRenderer] cardState missing or incomplete — using empty CardContext to continue rendering');
        context = { protectedStones: [], permaProtectedStones: [], bombs: [] };
    }
    const playerKey = getPlayerKey(player);
    const pending = (cardState && cardState.pendingEffectByPlayer) ? cardState.pendingEffectByPlayer[playerKey] : null;
    const freePlacementActive = pending && pending.type === 'FREE_PLACEMENT';
    const isHumanTurn = (gameState.currentPlayer === BLACK) ||
        (window.DEBUG_HUMAN_VS_HUMAN && gameState.currentPlayer === WHITE);
    const isSelectingTarget = !!(
        pending && (
            pending.stage === 'selectTarget' ||
            pending.type === 'DESTROY_ONE_STONE' ||
            pending.type === 'SWAP_WITH_ENEMY' ||
            pending.type === 'INHERIT_WILL' ||
            pending.type === 'TEMPT_WILL'
        )
    );
    const showLegalHints = isHumanTurn && !isSelectingTarget;

    const legalMoves = showLegalHints ? getLegalMoves(gameState, context.protectedStones, context.permaProtectedStones) : [];
    console.log('[DiffRenderer] getLegalMoves returned:', legalMoves.length, 'moves for player:', player);
    const legalSet = new Set(legalMoves.map(m => m.row + ',' + m.col));
    const selectableTargets = CardLogic.getSelectableTargets
        ? CardLogic.getSelectableTargets(cardState, gameState, playerKey)
        : [];
    const selectableTargetSet = new Set(selectableTargets.map(p => p.row + ',' + p.col));

    // Build unified specialStones map
    const specialMap = new Map();
    if (cardState && cardState.specialStones && cardState.specialStones.length) {
        cardState.specialStones.forEach(s => {
            specialMap.set(`${s.row},${s.col}`, s);
        });
    }

    // Bombs are separate
    const bombMap = (cardState && cardState.bombs && cardState.bombs.length)
        ? new Map(cardState.bombs.map(b => [b.row + ',' + b.col, b]))
        : null;

    const state = [];
    for (let r = 0; r < 8; r++) {
        state[r] = [];
        for (let c = 0; c < 8; c++) {
            const key = r + ',' + c;
            const val = gameState.board[r][c];
            const isLegal = showLegalHints && val === EMPTY && legalSet.has(key);
            const isLegalFree = showLegalHints && val === EMPTY && freePlacementActive;
            const isSelectableFriendly = isHumanTurn && selectableTargetSet.has(key);

            // Get special stone at this position
            const special = val !== EMPTY ? specialMap.get(key) : null;
            const bomb = val !== EMPTY && bombMap ? bombMap.get(key) : null;

            // Normalize owner to BLACK/WHITE constant
            const getOwnerVal = (owner) => {
                if (owner === 'black' || owner === BLACK || owner === 1) return BLACK;
                return WHITE;
            };

            state[r][c] = {
                value: val,
                isLegal: isLegal && !isLegalFree,
                isLegalFree,
                isSelectableFriendly,
                // Unified special stone field
                special: special ? {
                    type: special.type,
                    owner: getOwnerVal(special.owner),
                    remainingOwnerTurns: special.remainingOwnerTurns
                } : null,
                bomb: bomb ? { remainingTurns: bomb.remainingTurns } : null
            };
        }
    }
    return state;
}

/**
 * 2つのセル状態を比較
 * Compare two cell states for equality
 * @param {CellState|null} a - 前回の状態
 * @param {CellState} b - 現在の状態
 * @returns {boolean} 同一かどうか
 */
function cellStatesEqual(a, b) {
    if (!a) return false;
    if (a.value !== b.value) return false;
    if (a.isLegal !== b.isLegal) return false;
    if (a.isLegalFree !== b.isLegalFree) return false;
    if (a.isSelectableFriendly !== b.isSelectableFriendly) return false;

    // Compare unified special stone
    if ((a.special === null) !== (b.special === null)) return false;
    if (a.special && b.special) {
        if (a.special.type !== b.special.type) return false;
        if (a.special.owner !== b.special.owner) return false;
        if (a.special.remainingOwnerTurns !== b.special.remainingOwnerTurns) return false;
    }

    // Compare bomb state
    if ((a.bomb === null) !== (b.bomb === null)) return false;
    if (a.bomb && b.bomb && a.bomb.remainingTurns !== b.bomb.remainingTurns) return false;

    return true;
}

function updateCellDOM(cell, state, row, col, prevState) {
    // If we have an active cross-fade or instant animation on the disc,
    // skip re-rendering this cell to avoid nuking the animation state.
    const currentDisc = cell.querySelector('.disc');
    if (currentDisc && (
        currentDisc.classList.contains('stone-hidden') ||
        currentDisc.classList.contains('stone-hidden-all') ||
        currentDisc.classList.contains('stone-instant')
    )) {
        return;
    }

    // Also skip if an animation overlay is active in this cell
    if (cell.querySelector('.stone-fade-overlay')) {
        return;
    }

    // Clear existing classes and content
    cell.className = 'cell';
    cell.innerHTML = '';

    // Add legal move indicators
    if (state.isLegalFree) {
        cell.classList.add('legal-free');
    } else if (state.isLegal) {
        cell.classList.add('legal');
    }
    if (state.isSelectableFriendly) {
        cell.classList.add('selectable-friendly');
    }

    // Create disc if occupied
    if (state.value !== EMPTY) {
        const disc = document.createElement('div');
        disc.className = 'disc ' + (state.value === BLACK ? 'black' : 'white');

        const normalizeOwnerVal = (owner) => {
            if (owner === 'black' || owner === BLACK || owner === 1) return BLACK;
            return WHITE;
        };

        // Unified special stone visual effect
        if (state.special) {
            const effectKey = getEffectKeyForType(state.special.type);
            if (effectKey) {
                applyStoneVisualEffect(disc, effectKey, { owner: normalizeOwnerVal(state.special.owner) });
            }

            // Ensure WORK visuals are applied even if mapping lookup fails
            if (state.special.type === 'WORK') {
                applyStoneVisualEffect(disc, 'workStone', { owner: normalizeOwnerVal(state.special.owner) });
            }

            // Add timer for effects with remaining turns
            if (state.special.remainingOwnerTurns !== undefined) {
                const timer = document.createElement('div');
                timer.className =
                    state.special.type === 'DRAGON' ? 'dragon-timer'
                        : (state.special.type === 'ULTIMATE_DESTROY_GOD' ? 'udg-timer'
                            : (state.special.type === 'BREEDING' ? 'breeding-timer'
                                : (state.special.type === 'WORK' ? 'work-timer' : 'special-timer')));
                const remaining = state.special.remainingOwnerTurns;
                timer.textContent = state.special.type === 'DRAGON'
                    ? Math.min(5, remaining)
                    : (state.special.type === 'BREEDING'
                        ? Math.min(3, remaining)
                        : (state.special.type === 'ULTIMATE_DESTROY_GOD' ? Math.min(3, remaining)
                            : (state.special.type === 'WORK' ? Math.min(5, remaining) : remaining)));
                disc.appendChild(timer);
            }
        }

        // Add bomb UI (independent of special effects)
        if (state.bomb) {
            disc.classList.add('bomb');
            const timeLabel = document.createElement('div');
            timeLabel.className = 'bomb-timer';
            timeLabel.textContent = state.bomb.remainingTurns;
            disc.appendChild(timeLabel);
            const bombIcon = document.createElement('div');
            bombIcon.className = 'bomb-icon';
            bombIcon.textContent = '⚠';
            disc.appendChild(bombIcon);
        }

        cell.appendChild(disc);

    }
}

/**
 * Map special stone type to visual effect key
 * @param {string} type - Special stone type
 * @returns {string|null} Effect key for applyStoneVisualEffect
 */
function getEffectKeyForType(type) {
    // Delegate to the canonical map in visual-effects-map.js when available
    if (typeof getEffectKeyForSpecialType === 'function') {
        return getEffectKeyForSpecialType(type);
    }
    // Fallback: keep legacy local mapping for robustness
    const map = {
        'PROTECTED': 'protectedStoneTemporary',
        'PERMA_PROTECTED': 'protectedStone',
        'DRAGON': 'ultimateDragon',
        'BREEDING': 'breedingStone',
        'ULTIMATE_DESTROY_GOD': 'ultimateDestroyGod',
        'HYPERACTIVE': 'hyperactiveStone',
        'GOLD': 'goldStone',
        'REGEN': 'regenStone',
        'WORK': 'workStone'
    };
    return map[type] || null;
}

/**
 * 差分レンダリング実行
 * Execute differential rendering
 * @param {HTMLElement} boardEl - 盤面要素
 * @returns {number} 更新されたセル数
 */
function renderBoardDiff(boardEl) {
    // Single Visual Writer detection: prevent diff/rerender during active playback
    if (typeof window !== 'undefined' && window.VisualPlaybackActive === true) {
        if (typeof window !== 'undefined' && window.__DEV__ === true) {
            throw new Error('renderBoardDiff called during active VisualPlayback (dev fail-fast)');
        } else {
            console.error('renderBoardDiff called during active VisualPlayback. Aborting playback and syncing final state (prod fallback)');
            if (typeof window !== 'undefined') { window.__telemetry__ = window.__telemetry__ || { watchdogFired: 0, singleVisualWriterHits: 0, abortCount: 0 }; window.__telemetry__.singleVisualWriterHits = (window.__telemetry__.singleVisualWriterHits || 0) + 1; }
            if (typeof AnimationEngine !== 'undefined' && AnimationEngine && typeof AnimationEngine.abortAndSync === 'function') {
                AnimationEngine.abortAndSync();
            }
            return 0;
        }
    }

    // 初回またはキャッシュが空の場合は全レンダリング
    if (!cellCache.length || cellCache[0].length === 0) {
        initializeBoardDOM(boardEl);
        previousBoardState = buildCurrentCellState();
        // Initial full render
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                updateCellDOM(cellCache[r][c], previousBoardState[r][c], r, c, null);
            }
        }
        console.log('[DiffRenderer] Initial full render complete');
        return 64;
    }

    const currentState = buildCurrentCellState();
    let updatedCount = 0;

    // 差分検出と更新
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const prev = previousBoardState ? previousBoardState[r][c] : null;
            const curr = currentState[r][c];

            if (!cellStatesEqual(prev, curr)) {
                updateCellDOM(cellCache[r][c], curr, r, c, prev);
                updatedCount++;
            }
        }
    }

    previousBoardState = currentState;

    if (updatedCount > 0) {
        console.log(`[DiffRenderer] Updated ${updatedCount}/64 cells`);
    }

    return updatedCount;
}

/**
 * 強制的に全セルを再レンダリング
 * Force full re-render of all cells
 * @param {HTMLElement} boardEl - 盤面要素
 */
function forceFullRender(boardEl) {
    previousBoardState = null;
    cellCache = [];
    initializeBoardDOM(boardEl);
    renderBoardDiff(boardEl);
    console.log('[DiffRenderer] Full render forced');
}

/**
 * レンダリング統計をリセット
 * Reset rendering statistics
 */
function resetRenderStats() {
    previousBoardState = null;
}

// Export helpers for Node/Jest test harness
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeBoardDOM,
        buildCurrentCellState,
        renderBoardDiff,
        forceFullRender,
        resetRenderStats
    };
}
