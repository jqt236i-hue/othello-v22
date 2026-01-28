const ME = require('../game/move-executor');

// Set up environment like the test
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

(async function(){
    try {
        const p = ME.executeMoveViaPipeline({ player: 1, row: 0, col: 0 }, false, 'black');
        await p;
        console.log('After execute, cardState:', global.cardState);
    } catch (e) {
        console.error('Error: ', e);
    }
})();
