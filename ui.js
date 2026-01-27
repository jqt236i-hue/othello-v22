/**
 * @file ui.js
 * @description メインUIモジュール（縮小版）
 * ボード描画、ステータス更新、BGMボタン更新を担当
 * 
 * 分割されたモジュール:
 * - ui/animation-utils.js - アニメーション関数
 * - ui/result-overlay.js - 結果表示
 * - ui/event-handlers.js - イベントハンドラ
 */

// ===== Global UI State =====
// (shared with other modules via window scope)

let isProcessing = false;
let mccfrPolicy = null;
let cpuSmartness = { black: 1, white: 1 }; // 1:標準,2:位置重視,3:反転重視

// Expose all state variables globally for sub-modules
window.isProcessing = isProcessing;
window.mccfrPolicy = mccfrPolicy;
window.cpuSmartness = cpuSmartness; 

// Debug flags
window.DEBUG_HUMAN_VS_HUMAN = false; // Enable human control of both black and white

// DOM要素キャッシュ
const boardEl = document.getElementById('board');
const logEl = document.getElementById('log');
const cpuCharacterImg = document.getElementById('cpu-character-img');
const cpuLevelLabel = document.getElementById('cpu-level-label');
const handLayer = document.getElementById('handLayer');
const handWrapper = document.getElementById('handWrapper');
const heldStone = document.getElementById('heldStone');

// Expose DOM elements globally for sub-modules (board-renderer, etc.)
window.boardEl = boardEl;
window.logEl = logEl;



// ===== Event System Integration =====
if (typeof GameEvents !== 'undefined' && GameEvents.gameEvents) {
    GameEvents.gameEvents.on(GameEvents.EVENT_TYPES.BOARD_UPDATED, () => {
        renderBoard();
    });
    GameEvents.gameEvents.on(GameEvents.EVENT_TYPES.STATUS_UPDATED, () => {
        updateStatus();
    });
}

// ===== Board Rendering =====

/**
 * ボードを描画
 * Render the game board with all discs, legal moves, and special effects
 */
// ===== Board Rendering =====

/**
 * Render the board with all stones and visual effects
 * @description Main rendering function that displays:
 * - Board cells with legal move highlights
 * - Stone discs with appropriate colors
 * - Protection visuals (temporary/permanent)
 * - Special effects (bombs, dragons, pending card effects)
 */
function renderBoard() {
    if (!boardEl) return;

    // Single Visual Writer detection: prevent full rerender during playback
    try {
        if (typeof window !== 'undefined' && window.VisualPlaybackActive === true) {
            // dev: throw to make tests fail loudly
            if (typeof window !== 'undefined' && window.__DEV__ === true) {
                throw new Error('renderBoard called during active VisualPlayback. Aborting (dev fail-fast)');
            } else {
                console.error('renderBoard called during active VisualPlayback. Aborting playback and syncing final state (prod fallback)');
                if (typeof window !== 'undefined') { window.__telemetry__ = window.__telemetry__ || { watchdogFired: 0, singleVisualWriterHits: 0, abortCount: 0 }; window.__telemetry__.singleVisualWriterHits = (window.__telemetry__.singleVisualWriterHits || 0) + 1; }
                // Prefer module/global AnimationEngine, but fall back to window.AnimationEngine
                const engine = (typeof AnimationEngine !== 'undefined') ? AnimationEngine : ((typeof window !== 'undefined') ? window.AnimationEngine : undefined);
                if (engine && typeof engine.abortAndSync === 'function') {
                    engine.abortAndSync();
                }
                return;
            }
        }
    } catch (e) {
        throw e;
    }

    boardEl.innerHTML = '';

    const player = gameState.currentPlayer;
    const playerKey = player === BLACK ? 'black' : 'white';
    const context = CardLogic.getCardContext(cardState);
    const pending = cardState.pendingEffectByPlayer[playerKey];
    // Target-selection cards must not show normal "placeable" hints until the target is chosen.
    const isSelectingTarget = !!(
        pending && (
            pending.stage === 'selectTarget' ||
            pending.type === 'DESTROY_ONE_STONE' ||
            pending.type === 'SWAP_WITH_ENEMY' ||
            pending.type === 'INHERIT_WILL' ||
            pending.type === 'TEMPT_WILL'
        )
    );
    // Force a deterministic visual state for selection mode (CSS can suppress legal markers).
    try {
        boardEl.classList.toggle('selection-mode', isSelectingTarget);
    } catch (e) {
        // UI only
    }
    const legal = getLegalMoves(gameState, player, context);
    const legalSet = new Set(legal.map(m => m.row + ',' + m.col));
    const selectableTargets = CardLogic.getSelectableTargets
        ? CardLogic.getSelectableTargets(cardState, gameState, playerKey) : [];
    const selectableTargetSet = new Set(selectableTargets.map(p => p.row + ',' + p.col));
    // Human move hints: BLACK always, WHITE only when DEBUG_HUMAN_VS_HUMAN is enabled
    const isHumanTurn = (player === BLACK) || (window.DEBUG_HUMAN_VS_HUMAN && player === WHITE);
    const showLegalHints = isHumanTurn && !isSelectingTarget;

    // Build unified specialStones map
    const specialMap = new Map();
    if (cardState.specialStones && cardState.specialStones.length) {
        cardState.specialStones.forEach(s => {
            specialMap.set(`${s.row},${s.col}`, s);
        });
    }

    // Helper to normalize owner
    const getOwnerVal = (owner) => {
        if (owner === 'black' || owner === BLACK || owner === 1) return BLACK;
        return WHITE;
    };

    // Build protection set from specialStones for swap/destroy targets
    const protectedSet = new Set(
        (cardState.specialStones || [])
            .filter(s => s.type === 'PROTECTED' || s.type === 'PERMA_PROTECTED' || s.type === 'DRAGON' || s.type === 'BREEDING' || s.type === 'ULTIMATE_DESTROY_GOD')
            .map(s => `${s.row},${s.col}`)
    );

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;

            const key = r + ',' + c;
            const isLegalEmpty = showLegalHints && gameState.board[r][c] === EMPTY && legalSet.has(key);

            // FREE_PLACEMENT: highlight all empty cells
            if (pending && pending.type === 'FREE_PLACEMENT' && showLegalHints && gameState.board[r][c] === EMPTY) {
                cell.classList.add('legal-free');
            }
            // SWAP_WITH_ENEMY: target selection mode (no normal placement hints)
            else if (pending && pending.type === 'SWAP_WITH_ENEMY' && pending.stage === 'selectTarget') {
                const opponent = -gameState.currentPlayer;
                if (isHumanTurn && gameState.board[r][c] === opponent && !protectedSet.has(key)) {
                    cell.classList.add('swap-target');
                }
            }
            // DESTROY_ONE_STONE: highlight enemy stones
            else if (pending && pending.type === 'DESTROY_ONE_STONE' && pending.stage === 'selectTarget') {
                const opponent = -gameState.currentPlayer;
                // Perma-protected cannot be destroyed, but we still show them
                if (isHumanTurn && gameState.board[r][c] === opponent) {
                    cell.classList.add('destroy-target');
                }
            } else {
                if (isLegalEmpty) cell.classList.add('legal');
            }

            // Highlight selectable friendly stones for pending effects that require it
            if (isHumanTurn && selectableTargetSet.has(key)) {
                cell.classList.add('selectable-friendly');
            }

            // Disc rendering
            if (gameState.board[r][c] !== EMPTY) {
                const disc = document.createElement('div');
                disc.className = 'disc ' + (gameState.board[r][c] === BLACK ? 'black' : 'white');

                // Unified special stone visual effect
                const special = specialMap.get(key);
                if (special) {
                    const effectKey = (typeof getEffectKeyForSpecialType === 'function')
                        ? getEffectKeyForSpecialType(special.type)
                        : null;
                    try { console.log('[RENDER] special at', key, 'type:', special.type, 'effectKey:', effectKey); } catch (e) {}
                    if (effectKey) {
                        applyStoneVisualEffect(disc, effectKey, { owner: getOwnerVal(special.owner) });
                    }

                    // Add timer for effects with remaining turns
                    if (special.remainingOwnerTurns !== undefined) {
                        const timer = document.createElement('div');
                        timer.className =
                            special.type === 'DRAGON' ? 'dragon-timer'
                                : (special.type === 'ULTIMATE_DESTROY_GOD' ? 'udg-timer' : 'breeding-timer');
                        const remaining = special.remainingOwnerTurns;
                        timer.textContent = special.type === 'DRAGON'
                            ? Math.min(5, remaining)
                            : (special.type === 'BREEDING'
                                ? Math.min(3, remaining)
                                : (special.type === 'ULTIMATE_DESTROY_GOD' ? Math.min(3, remaining) : remaining));
                        disc.appendChild(timer);
                    }

                    // Defensive fallback: if UI visual application missed the special class, try applying now
                    try {
                        if (special && effectKey && typeof applyStoneVisualEffect === 'function' && (!disc.classList || !disc.classList.contains('special-stone'))) {
                            applyStoneVisualEffect(disc, effectKey, { owner: getOwnerVal(special.owner) });
                            console.log('[RENDER] fallback applied visual effect for', key, effectKey);
                        }
                    } catch (e) { console.warn('[RENDER] fallback applyStoneVisualEffect failed', e); }

                    // Last-resort fallback: directly set class and CSS var based on STONE_VISUAL_EFFECTS map
                    try {
                        if (special && effectKey && (!disc.classList || !disc.classList.contains('special-stone'))) {
                            if (disc.classList) disc.classList.add('special-stone');
                            const uiMap = (typeof window !== 'undefined' && window.STONE_VISUAL_EFFECTS) ? window.STONE_VISUAL_EFFECTS : undefined;
                            const effectDef = (uiMap && uiMap[effectKey]) ? uiMap[effectKey] : null;
                            let imagePath = '';
                            if (effectDef) {
                                if (effectDef.imagePathByOwner && special.owner !== undefined) {
                                    const ownerKey = (special.owner === 'black' || special.owner === 1) ? '1' : '-1';
                                    imagePath = effectDef.imagePathByOwner[ownerKey] || '';
                                } else if (effectDef.imagePath) {
                                    imagePath = effectDef.imagePath;
                                }
                            }
                            if (imagePath) {
                                try {
                                    const resolved = (typeof document !== 'undefined' && document.baseURI) ? new URL(imagePath, document.baseURI).href : imagePath;
                                    disc.style.setProperty('--special-stone-image', `url('${resolved}')`);
                                    try { disc.style.backgroundImage = `url('${resolved}')`; } catch (ex) {}
                                    console.log('[RENDER] last-resort applied image for', key, resolved);
                                } catch (err) {
                                    console.warn('[RENDER] failed to resolve image path for fallback', err);
                                }
                            }
                        }
                    } catch (e) { /* non-fatal */ }
                }

                // Bomb indicator (bombs are separate from specialStones)
                const bomb = cardState.bombs && cardState.bombs.find(b => b.row === r && b.col === c);
                if (bomb) {
                    disc.classList.add('bomb');
                    const timeLabel = document.createElement('div');
                    timeLabel.className = 'bomb-timer';
                    timeLabel.textContent = bomb.remainingTurns;
                    disc.appendChild(timeLabel);
                    const bombIcon = document.createElement('div');
                    bombIcon.className = 'bomb-icon';
                    bombIcon.textContent = '⚠';
                    disc.appendChild(bombIcon);
                }

                // Attach stoneId for presentation mapping if available
                try {
                    const stoneId = (cardState && cardState.stoneIdMap) ? cardState.stoneIdMap[r][c] : null;
                    if (stoneId) disc.setAttribute('data-stone-id', stoneId);
                } catch (e) { /* visuals only */ }

                cell.appendChild(disc);
            }

            cell.addEventListener('click', () => handleCellClick(r, c));
            boardEl.appendChild(cell);
        }
    }
    updateOccupancyUI();
    renderCardUI();

    // Ensure WORK visuals are applied after a full render (defensive: covers skipped diffs/animations)
    try {
        ensureWorkVisualsApplied();
    } catch (e) {
        /* non-fatal */
    }
}

// ===== Occupancy UI =====

/**
 * 占有率UIを更新
 * Update occupancy percentage display
 */
function updateOccupancyUI() {
    const counts = countDiscs(gameState);
    const total = counts.black + counts.white;

    let blackPct = 50, whitePct = 50;
    if (total > 0) {
        blackPct = Math.round((counts.black / total) * 100);
        whitePct = 100 - blackPct;
    }

    const blackEl = document.getElementById('occ-black');
    const whiteEl = document.getElementById('occ-white');

    if (blackEl) blackEl.innerHTML = `<div class="occ-dot"></div>黒 ${blackPct}%`;
    if (whiteEl) whiteEl.innerHTML = `<div class="occ-dot"></div>白 ${whitePct}%`;
}

/**
 * Defensive helper: ensure WORK stones always have visual effect applied
 * This runs after a render and fixes cases where diff rendering or animation
 * skipping prevents the normal effect application path from running.
 */
function ensureWorkVisualsApplied() {
    try {
        // Diagnostic log to capture invocation in user environments
        try { window._lastEnsureVisualsTs = Date.now(); } catch (e) {}
        console.log('[VISUAL_DEBUG] ensureWorkVisualsApplied invoked; specialStones:', (cardState && cardState.specialStones) ? cardState.specialStones.length : 0);
        if (!cardState || !Array.isArray(cardState.specialStones) || cardState.specialStones.length === 0) return;
        const works = cardState.specialStones.filter(s => s && s.type === 'WORK');
        if (!works.length) return;

        const normalizeOwner = (owner) => (owner === 'black' || owner === BLACK || owner === 1) ? BLACK : WHITE;

        for (const w of works) {
            const sel = `.cell[data-row="${w.row}"][data-col="${w.col}"] .disc`;
            const disc = document.querySelector(sel);
            if (!disc) continue;
            const imgVar = (disc.style && disc.style.getPropertyValue) ? disc.style.getPropertyValue('--special-stone-image') : null;
            const hasImage = imgVar && String(imgVar).trim().length > 0;
            const hasClass = disc.classList && disc.classList.contains('work-stone');
            if (!hasImage || !hasClass) {
                applyStoneVisualEffect(disc, 'workStone', { owner: normalizeOwner(w.owner) });
            }
        }
    } catch (e) {
        // Defensive: don't let UI crash for visuals
        console.warn('[UI] ensureWorkVisualsApplied failed', e && e.message ? e.message : e);
    }
}

// Expose helper for diagnostics/tests
window.ensureWorkVisualsApplied = ensureWorkVisualsApplied;

// Simple debounce helper used by observer
function debounce(fn, wait) {
    let t = null;
    return function() {
        const args = arguments;
        clearTimeout(t);
        t = setTimeout(() => fn.apply(null, args), wait);
    };
}

// Preload WORK stone images to avoid timing / network race conditions
function preloadWorkStoneImages() {
    if (window._workStoneImagesPreloaded) return;
    window._workStoneImagesPreloaded = true;
    const paths = [
        'assets/images/stones/work_stone-black.png',
        'assets/images/stones/work_stone-white.png'
    ];
    // Consider loaded once all either loaded or errored (we don't want to block forever)
    window._workStoneImagesLoaded = false;
    let resolvedCount = 0;
    const finalize = () => {
        resolvedCount++;
        if (resolvedCount >= paths.length) window._workStoneImagesLoaded = true;
    };
    paths.forEach(p => {
        try {
            const img = new Image();
            img.onload = finalize;
            img.onerror = finalize;
            img.src = p;
        } catch (e) {
            finalize();
        }
    });
    // Timeout safety: mark loaded after 5s to avoid blocking indefinitely
    // Avoid starting long timeout during tests (prevents open handles)
    if (!(typeof process !== 'undefined' && process.env && (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test'))) {
        setTimeout(() => { if (typeof window !== 'undefined') { window._workStoneImagesLoaded = true; } }, 5000);
    }
}

// MutationObserver fallback: watches board DOM changes and reapplies missing WORK visuals
function setupWorkVisualsObserver() {
    if (window._workVisualsObserver) return; // already set
    const board = document.getElementById('board');
    if (!board) return;

    const run = debounce(() => {
        try {
            ensureWorkVisualsApplied();
        } catch (e) { /* defensive */ }
    }, 50);

    const mo = new MutationObserver(() => run());
    mo.observe(board, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'data-row', 'data-col'] });
    window._workVisualsObserver = mo;
    window._teardownWorkVisualsObserver = () => { mo.disconnect(); window._workVisualsObserver = null; };
}

// Try to initialize: if DOM already ready, set up immediately, otherwise on DOMContentLoaded
(function initWorkVisualsHelpers() {
    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                preloadWorkStoneImages();
                setupWorkVisualsObserver();
                // ensure visuals once at init time
                setTimeout(() => ensureWorkVisualsApplied(), 60);
            });
        } else {
            preloadWorkStoneImages();
            setupWorkVisualsObserver();
            setTimeout(() => ensureWorkVisualsApplied(), 60);
        }
    } catch (e) { /* defensive */ }
})();


// ===== Work visual diagnostics (temporary) =====
function collectWorkVisualDiagnostics() {
    const res = {};
    res.timestamp = Date.now();
    res.specialStonesCount = (cardState && Array.isArray(cardState.specialStones)) ? cardState.specialStones.filter(s => s && s.type === 'WORK').length : 0;
    res.fullSpecialStonesCount = (cardState && Array.isArray(cardState.specialStones)) ? cardState.specialStones.length : 0;
    res.workImagesPreloaded = !!window._workStoneImagesPreloaded;
    res.workImagesLoadedFlag = !!window._workStoneImagesLoaded;
    res.observerActive = !!window._workVisualsObserver;
    res.lastApplyWorkTs = window._lastApplyWorkTs || null;
    res.lastEnsureVisualsTs = window._lastEnsureVisualsTs || null;
    res.lastInjected = window._lastWorkInjected || null;
    // Arm status for Work next placement
    res.workArmedBy = (cardState && cardState.workNextPlacementArmedByPlayer) ? cardState.workNextPlacementArmedByPlayer : { black: false, white: false };

    // resource check
    const entries = (performance && performance.getEntriesByType) ? performance.getEntriesByType('resource').filter(e => /work_stone/.test(e.name)) : [];
    res.resources = entries.map(e => ({ name: e.name, size: e.transferSize || e.encodedBodySize || 0 }));

    // per-special diagnostics
    res.perSpecial = [];
    if (cardState && Array.isArray(cardState.specialStones)) {
        for (const s of cardState.specialStones) {
            if (!s || s.type !== 'WORK') continue;
            const item = { row: s.row, col: s.col, owner: s.owner || s.ownerColor || null };
            const sel = `.cell[data-row="${s.row}"][data-col="${s.col}"] .disc`;
            const disc = document.querySelector(sel);
            if (!disc) {
                item.discPresent = false;
            } else {
                item.discPresent = true;
                item.classes = [...disc.classList];
                item.inlineVar = disc.style.getPropertyValue('--special-stone-image') || null;
                item.inlineBg = disc.style.backgroundImage || null;
                item.computedBefore = getComputedStyle(disc, '::before').getPropertyValue('background-image') || null;
                item.injectImg = !!disc.querySelector('.special-stone-img');
            }
            res.perSpecial.push(item);
        }
    }

    return res;
}

function updateWorkVisualDiagnosticsBadge() {
    try {
        let badge = document.getElementById('work-visual-diagnostics');
        if (!badge) return;
        const d = collectWorkVisualDiagnostics();
        let html = '';
        html += `WORK markers: ${d.specialStonesCount} / total markers: ${d.fullSpecialStonesCount}\n`;
        html += `preloaded: ${d.workImagesPreloaded} loadedFlag: ${d.workImagesLoadedFlag} observer:${d.observerActive}\n`;
        html += `lastApply: ${d.lastApplyWorkTs ? new Date(d.lastApplyWorkTs).toLocaleTimeString() : '-'} lastEnsure: ${d.lastEnsureVisualsTs ? new Date(d.lastEnsureVisualsTs).toLocaleTimeString() : '-'}\n`;
        if (d.lastInjected) html += `injected: ${d.lastInjected.key} ${d.lastInjected.imgPath}\n`;
        if (d.resources && d.resources.length) {
            html += `resources: ${d.resources.map(r => r.name.split('/').pop() + '(' + r.size + ')').join(', ')}\n`;
        }
        for (const s of d.perSpecial) {
            html += `(${s.row},${s.col}) disc:${s.discPresent} classes:${s.classes ? s.classes.join('|') : '-'} var:${s.inlineVar ? 'yes' : 'no'} bg:${s.inlineBg ? 'yes' : 'no'} before:${s.computedBefore ? 'yes' : 'no'} img:${s.injectImg}\n`;
        }
        badge.textContent = html;
    } catch (e) { /* defensive */ }
}

function teardownWorkVisualDiagnosticsBadge() {
    try {
        const existing = document.getElementById('work-visual-diagnostics');
        if (existing) existing.remove();
        if (window._workDiagInterval) {
            clearInterval(window._workDiagInterval);
            window._workDiagInterval = null;
        }
    } catch (e) { /* defensive */ }
}

function initWorkVisualDiagnosticsBadge() {
    try {
        if (!document || !document.body) return;
        // dont initialize twice
        if (document.getElementById('work-visual-diagnostics')) return;
        const badge = document.createElement('pre');
        badge.id = 'work-visual-diagnostics';
        badge.title = 'Work visual diagnostics (temporary) - click to copy data';
        badge.style.position = 'fixed';
        badge.style.right = '8px';
        badge.style.bottom = '8px';
        badge.style.background = 'rgba(0,0,0,0.6)';
        badge.style.color = '#fff';
        badge.style.padding = '8px';
        badge.style.fontSize = '12px';
        badge.style.zIndex = '99999';
        badge.style.maxWidth = '320px';
        badge.style.maxHeight = '220px';
        badge.style.overflow = 'auto';
        badge.style.borderRadius = '6px';
        badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.6)';
        badge.style.whiteSpace = 'pre-wrap';
        badge.style.cursor = 'pointer';
        badge.addEventListener('click', () => {
            try { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(collectWorkVisualDiagnostics(), null, 2)); } catch (e) {}
        });
        document.body.appendChild(badge);
        // periodic update
        window._workDiagInterval = setInterval(updateWorkVisualDiagnosticsBadge, 600);
        // one immediate update
        setTimeout(updateWorkVisualDiagnosticsBadge, 80);

        // expose getter
        window.getWorkVisualDiagnostics = collectWorkVisualDiagnostics;
    } catch (e) { /* defensive */ }
}

// Auto init at DOM ready (only when DEBUG_WORK_VISUALS is true)
// default: hidden
if (typeof window.DEBUG_WORK_VISUALS === 'undefined') window.DEBUG_WORK_VISUALS = false;
// Always expose diagnostic getter for tests / programmatic access
window.getWorkVisualDiagnostics = collectWorkVisualDiagnostics;
window.toggleWorkVisualDiagnostics = function(show) {
    if (show) initWorkVisualDiagnosticsBadge(); else teardownWorkVisualDiagnosticsBadge();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.DEBUG_WORK_VISUALS) initWorkVisualDiagnosticsBadge(); else teardownWorkVisualDiagnosticsBadge();
    });
} else {
    if (window.DEBUG_WORK_VISUALS) initWorkVisualDiagnosticsBadge(); else teardownWorkVisualDiagnosticsBadge();
}


// ===== BGM UI Helper =====

// Delegating shims — actual implementations live in ui/bootstrap.js so they are
// available during early initialization. Define light fallbacks only if they
// aren't already present (e.g., in test environments).
if (typeof updateBgmButtons === 'undefined') {
    function updateBgmButtons() {
        if (typeof window !== 'undefined' && typeof window.updateBgmButtons === 'function' && window.updateBgmButtons !== updateBgmButtons) {
            return window.updateBgmButtons();
        }
        // fallback: try to update if DOM exists
        try {
            const bgmPlayBtn = document.getElementById('bgmPlayBtn');
            const bgmPauseBtn = document.getElementById('bgmPauseBtn');
            if (typeof SoundEngine !== 'undefined' && SoundEngine.allowBgmPlay && !SoundEngine.bgm?.paused) {
                if (bgmPlayBtn) bgmPlayBtn.classList.add('btn-active');
                if (bgmPauseBtn) bgmPauseBtn.classList.remove('btn-active');
            } else {
                if (bgmPlayBtn) bgmPlayBtn.classList.remove('btn-active');
                if (bgmPauseBtn) bgmPauseBtn.classList.add('btn-active');
            }
        } catch (e) { /* defensive */ }
    }
}

// ===== Logging =====

/**
 * Log entry delegation shim: prefer global implementation
 */
if (typeof addLog === 'undefined') {
    function addLog(text) {
        if (typeof window !== 'undefined' && typeof window.addLog === 'function' && window.addLog !== addLog) {
            return window.addLog(text);
        }
        if (typeof console !== 'undefined' && console.log) console.log('[log]', String(text));
    }
}

// ===== Status Display =====

/**
 * ステータスを更新
 * Update status display
 */
if (typeof updateStatus === 'undefined') {
    function updateStatus() {
        if (typeof window !== 'undefined' && typeof window.updateStatus === 'function' && window.updateStatus !== updateStatus) {
            return window.updateStatus();
        }
        if (typeof updateCpuCharacter === 'function') updateCpuCharacter();
    }
}

/**
 * CPUキャラクター表示を更新
 * Update CPU character image and level label
 */
    function updateCpuCharacter() {
        const level = cpuSmartness.white || 1;
        const levelNames = ['不明', '盤喰いの小鬼', '反転の影', '布石を紡ぐ者', '盤面支配者', '終局を告げる者', '盤理の観測者'];

        if (cpuCharacterImg && cpuLevelLabel) {
            const primaryPath = `assets/images/cpu/level${level}.png`;
            const fallbackPath = `assets/cpu-characters/level${level}.png`;

            const img = new Image();
            img.onload = () => {
                cpuCharacterImg.src = img.src;
                cpuCharacterImg.style.opacity = '1';

                const scaleLevel = Math.min(level, 5);
                let baseScale = 1 + ((scaleLevel - 1) * 0.06);
                if (scaleLevel >= 5) {
                    const scaleLevel4 = 1 + ((4 - 1) * 0.06);
                    baseScale = scaleLevel4 * 1.10;
                }
                const SIZE_SHRINK = 0.62;
                const MONSTER_BOOST = 1.23;
                const scaleValue = baseScale * 1.3 * MONSTER_BOOST * SIZE_SHRINK;
                cpuCharacterImg.style.transform = `scale(${scaleValue})`;
                cpuCharacterImg.style.width = '343px';
                cpuCharacterImg.style.height = '343px';
            };
            img.onerror = () => {
                if (img.src.endsWith(primaryPath)) {
                    img.src = fallbackPath;
                } else {
                    cpuCharacterImg.style.opacity = '0.3';
                    cpuCharacterImg.style.width = '';
                    cpuCharacterImg.style.height = '';
                    console.warn(`敵キャラクター画像が見つかりません: ${primaryPath} / ${fallbackPath}`);
                }
            };
            img.src = primaryPath;

            cpuLevelLabel.textContent = levelNames[level] || 'レベル ' + level;
        }
    }

    // Export for module systems
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            renderBoard,
            updateOccupancyUI,
            updateBgmButtons,
            addLog,
            updateStatus,
            updateCpuCharacter
        };
    }
