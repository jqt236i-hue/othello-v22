// CPU行動制御モジュール
// CPUの思考と行動実行を担当

/**
 * CPU (白) のターン処理
 */
let __lastMoveCompletedAt = null;

function setLastMoveCompletedAt(ms) { __lastMoveCompletedAt = (typeof ms === 'number') ? ms : null; }
function getLastMoveCompletedAt() { return __lastMoveCompletedAt; }

function setIsProcessing(val) {
    if (typeof isProcessing !== 'undefined') { isProcessing = val; }
    else if (typeof global !== 'undefined') { global.isProcessing = val; }
    else if (typeof window !== 'undefined') { window.isProcessing = val; }
}

let __cpuRunning = false;
let __cpuScheduled = false; // indicates a delayed CPU turn is already scheduled
let __cpuTriggerWindow = false; // short window to dedupe rapid sequential triggers

async function processCpuTurn() {
    const playerKey = 'white';

    // Respect UI-configured human play mode: if white is human, do not run CPU turn
    try {
        if (typeof gameState !== 'undefined' && gameState && gameState.currentPlayer !== WHITE) {
            console.log('[CPU] processCpuTurn skipped: not WHITE turn (current=', gameState.currentPlayer, ')');
            return;
        }
        const humanMode = (typeof window !== 'undefined' && typeof window.HUMAN_PLAY_MODE === 'string') ? window.HUMAN_PLAY_MODE : null;
        if (humanMode === 'white' || humanMode === 'both') {
            console.log('[CPU] processCpuTurn ignored: HUMAN_PLAY_MODE indicates white is human (', humanMode, ')');
            return;
        }
        // Diagnostic entry log: record small stack and human mode
        try { console.log('[DIAG][CPU] processCpuTurn enter', { humanMode, time: Date.now(), stack: (new Error()).stack.split('\n').slice(1, 6).join('\n') }); } catch (e) { }
    } catch (e) { /* ignore */ }

    // Prevent re-entrance / duplicate scheduling using module-local guards
    try {
        if (__cpuRunning || __cpuScheduled || __cpuTriggerWindow) {
            console.log('[CPU] processCpuTurn ignored due to already running or scheduled');
            return;
        }
        // Short dedupe window to collapse rapid sequential triggers into one
        __cpuTriggerWindow = true;
        setTimeout(() => { __cpuTriggerWindow = false; }, 20);

        __cpuRunning = true;
        __cpuScheduled = true; // mark as active to prevent duplicate immediate scheduling
        // Record last CPU run timestamp to allow external callers to dedupe short-window calls
        try { if (typeof window !== 'undefined') window.__cpuLastRunAt = Date.now(); else if (typeof global !== 'undefined') global.__cpuLastRunAt = Date.now(); } catch (e) { }
    } catch (e) { /* ignore */ }

    try {
        // Defensive scheduling: if CPU was triggered before visuals had time to present the last move,
        // defer execution until a minimum delay has elapsed since last move completion.
        try {
            const last = (typeof __lastMoveCompletedAt === 'number') ? __lastMoveCompletedAt : ((typeof global !== 'undefined' && typeof global.__lastMoveCompletedAt === 'number') ? global.__lastMoveCompletedAt : (typeof window !== 'undefined' ? window.__lastMoveCompletedAt : undefined));
            const minDelay = (typeof global !== 'undefined' && typeof global.CPU_TURN_DELAY_MS === 'number') ? global.CPU_TURN_DELAY_MS : (typeof CPU_TURN_DELAY_MS === 'number' ? CPU_TURN_DELAY_MS : 600);
            if (typeof last === 'number') {
                const elapsed = Date.now() - last;
                if (elapsed < minDelay) {
                    const wait = minDelay - elapsed;
                    // Schedule a single-shot CPU turn and mark as scheduled to avoid duplicates
                    __cpuScheduled = true;
                    const scheduleFn = () => { try { __cpuScheduled = false; processCpuTurn(); } catch (e) { __cpuScheduled = false; } };
                    if (typeof setTimeout === 'function') { setTimeout(scheduleFn, wait); return; }
                    if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') { window.setTimeout(scheduleFn, wait); return; }
                }
            }
        } catch (e) { /* defensive */ }

        // Minimal environment check — bail early to avoid throwing in very limited test envs
        // Proceed if either move generation or card-usage decision helpers are available
        if (typeof generateMovesForPlayer !== 'function' && typeof cpuMaybeUseCardWithPolicy !== 'function') {
            console.warn('[CPU] core functions not available; skipping CPU turn in this environment');
            return;
        }

        setIsProcessing(true);

        // アニメーション中は待機
        if (typeof isCardAnimating !== 'undefined' && isCardAnimating) {
            __cpuScheduled = true;
            setTimeout(() => { __cpuScheduled = false; processCpuTurn(); }, 80);
            return;
        }

        // Delegate actual move selection/execution to the game-level CPU handler
        const handler = (typeof require === 'function') ? require('../game/cpu-turn-handler') : null;
        if (handler && typeof handler.runCpuTurn === 'function') {
            await handler.runCpuTurn('white');
            // The handler performs a full CPU turn; do not continue with local duplicate logic.
            return;
        } else if (typeof runCpuTurn === 'function') {
            // compatibility fallback (unlikely in modern code paths)
            await runCpuTurn('white');
            // fallback performed the CPU turn; avoid duplicating logic below.
            return;
        } else {
            console.error('[CPU] runCpuTurn handler not available');
            // Even if fallback is missing, we MUST NOT run duplicate logic here
            // as it lacks proper turn-gate guards and async handling.
            return;
        }

    } finally {
        __cpuRunning = false;
        __cpuScheduled = false;
    }
}

/**
 * 自動プレイ時の黒（プレイヤー側）のターン処理
 */
function processAutoBlackTurn() {
    // Defensive: only operate when Auto is enabled and UI indicates black should be auto-played.
    try {
        const Auto = (typeof require === 'function') ? (function () { try { return require('../game/auto'); } catch (e) { return null; } })() : (typeof window !== 'undefined' ? window.autoSimple : null);
        if (Auto && typeof Auto.isEnabled === 'function' && !Auto.isEnabled()) {
            console.log('[CPU] processAutoBlackTurn ignored: Auto disabled');
            return;
        }
        if (typeof gameState !== 'undefined' && gameState && gameState.currentPlayer !== BLACK) {
            console.log('[CPU] processAutoBlackTurn ignored: not BLACK turn');
            return;
        }
        // Respect explicit HUMAN_PLAY_MODE UI setting: do not auto-play black if humans control black
        if (typeof window !== 'undefined' && typeof window.HUMAN_PLAY_MODE === 'string') {
            if (window.HUMAN_PLAY_MODE === 'black' || window.HUMAN_PLAY_MODE === 'both') {
                console.log('[CPU] processAutoBlackTurn ignored: HUMAN_PLAY_MODE indicated black is human (', window.HUMAN_PLAY_MODE, ')');
                return;
            }
        }
    } catch (e) { /* ignore defensive checks */ }

    // Diagnostic entry log for auto-black: record stack, Auto and HUMAN_PLAY_MODE
    try { const humanMode = (typeof window !== 'undefined' && typeof window.HUMAN_PLAY_MODE === 'string') ? window.HUMAN_PLAY_MODE : null; const autoEnabled = (typeof Auto !== 'undefined' && Auto && typeof Auto.isEnabled === 'function') ? Auto.isEnabled() : null; try { console.log('[DIAG][CPU] processAutoBlackTurn enter', { humanMode, autoEnabled, time: Date.now(), stack: (new Error()).stack.split('\n').slice(1, 6).join('\n') }); } catch (e) { } } catch (e) { }

    // Suppress auto-black if a human interaction was recent (avoid racing human clicks)
    try {
        const lastHuman = (typeof window !== 'undefined' && window.__lastHumanActionAt) ? window.__lastHumanActionAt : ((typeof global !== 'undefined' && global.__lastHumanActionAt) ? global.__lastHumanActionAt : null);
        if (lastHuman && (Date.now() - lastHuman) < 300) {
            console.log('[CPU] processAutoBlackTurn suppressed due to recent human action', { lastHuman, elapsed: Date.now() - lastHuman });
            setTimeout(processAutoBlackTurn, 200); // retry small delay
            return;
        }
    } catch (e) { /* ignore */ }

    // Record last CPU run timestamp so external callers can dedupe near-simultaneous calls
    try { if (typeof window !== 'undefined') window.__cpuLastRunAt = Date.now(); else if (typeof global !== 'undefined') global.__cpuLastRunAt = Date.now(); } catch (e) { }

    // Delegate to the shared CPU handler if available
    const handler = (typeof require === 'function') ? require('../game/cpu-turn-handler') : null;
    if (handler && typeof handler.processAutoBlackTurn === 'function') {
        return handler.processAutoBlackTurn();
    } else if (typeof window !== 'undefined' && typeof window.runCpuTurn === 'function') {
        // Use global runCpuTurn if available (exposed by cpu-turn-handler.js)
        return window.runCpuTurn('black', { autoMode: true });
    }

    // Duplicate logic below removed to ensure single source of truth in cpu-turn-handler.js
    console.error('[CPU] processAutoBlackTurn: No CPU handler available');

}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { processCpuTurn, processAutoBlackTurn, setLastMoveCompletedAt, getLastMoveCompletedAt };
}
