const ME = require('../game/move-executor');
const CPU = require('../cpu/cpu-turn');
// Ensure a minimal window shim so presentation-handler can attach wrappers
global.window = global.window || {};
global.window.requestAnimationFrame = global.window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
const PH = require('../ui/presentation-handler');

// Set up environment
ME.setUIImpl({});
global.TurnPipelineUIAdapter = {
    runTurnWithAdapter: () => ({
        ok: true,
        nextGameState: { currentPlayer: -1 },
        nextCardState: {},
        phases: {},
        playbackEvents: null
    })
};
global.TurnPipeline = {};
global.isProcessing = false; global.isCardAnimating = false; global.BLACK=1; global.WHITE=-1; global.CPU_TURN_DELAY_MS = 600; global.ANIMATION_SETTLE_DELAY_MS = 100; global.isGameOver = () => false; global.showResult = () => {}; global.emitBoardUpdate = () => {}; global.emitGameStateChange = () => {}; global.ActionManager = { ActionManager: { recordAction: () => {}, incrementTurnIndex: () => {} } };

// Provide current state
global.cardState = { turnIndex: 0, pendingEffectByPlayer: { black: null, white: null } };
global.gameState = { currentPlayer: 1 };

// Wrap global processCpuTurn to log
const orig = global.processCpuTurn;
global.processCpuTurn = function () { console.log('[DEBUG][test] processCpuTurn invoked (wrapper)'); if (typeof orig === 'function') try { orig(); } catch (e) { console.error('[DEBUG][test] original processCpuTurn threw', e); } };

(async function(){
    console.log('--- Starting debug end-to-end simulation ---');
    const p = ME.executeMoveViaPipeline({ player: 1, row: 0, col: 0 }, false, 'black');
    await p;
    console.log('After pipeline execute, cardState:', global.cardState);

    // Simulate UI update cycle
    try { await PH.onBoardUpdated(); } catch (e) { console.error('onBoardUpdated error', e); }

    // Advance timers to allow scheduled CPU callback
    console.log('Advancing timers (simulated) using setTimeout delay');
    await new Promise((resolve) => setTimeout(resolve, global.CPU_TURN_DELAY_MS + 10));

    console.log('--- End simulation ---');
})();
