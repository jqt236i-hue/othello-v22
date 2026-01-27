const ME = require('../../../game/move-executor');

jest.useFakeTimers();

describe('move-executor CPU scheduling fallback', () => {
    let originalProcessCpu;
    beforeEach(() => {
        // Ensure no UI scheduler is installed
        ME.setUIImpl({});
        // Provide a fake TurnPipelineUIAdapter
        global.TurnPipelineUIAdapter = {
            runTurnWithAdapter: () => ({
                ok: true,
                nextGameState: { currentPlayer:  -1 /* WHITE is -1 in codebase? ensure value used by tests */ },
                nextCardState: {},
                phases: {},
                playbackEvents: null
            })
        };
        global.TurnPipeline = {};
        // Execution state flags expected by move-executor
        global.isProcessing = false;
        global.isCardAnimating = false;
        // Minimal constants
        global.BLACK = 1;
        global.WHITE = -1;
        global.CPU_TURN_DELAY_MS = 600;
        global.ANIMATION_SETTLE_DELAY_MS = 100;
        // Minimal game helpers
        global.isGameOver = () => false;
        global.showResult = jest.fn();
        global.emitBoardUpdate = jest.fn();
        global.emitGameStateChange = jest.fn();
        // Minimal ActionManager (try-catch guarded in executor)
        global.ActionManager = { ActionManager: { recordAction: () => {}, incrementTurnIndex: () => {} } };
        // Spy on processCpuTurn
        originalProcessCpu = global.processCpuTurn;
        global.processCpuTurn = jest.fn();
    });

    afterEach(() => {
        try { delete global.TurnPipelineUIAdapter; } catch (e) {}
        try { global.processCpuTurn = originalProcessCpu; } catch (e) {}
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('fallback schedules processCpuTurn with delay when scheduleCpuTurn missing', async () => {
        // Simulate a minimal move + state. We invoke executeMoveViaPipeline with a move and ensure fallback schedules CPU
        const move = { player: 1, row: 0, col: 0 };
        // Call executeMoveViaPipeline (it will run TurnPipelineUIAdapter.runTurnWithAdapter and then hit fallback scheduling)
        // Provide minimal globals expected by executor
        global.cardState = { turnIndex: 0, pendingEffectByPlayer: { black: null, white: null } };
        global.gameState = { currentPlayer: 1 };

        // call and do not await scheduling
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const p = ME.executeMoveViaPipeline(move, false, 'black');

        // processCpuTurn should not have been called immediately
        expect(global.processCpuTurn).not.toHaveBeenCalled();

        // Fast-forward time to just before CPU_TURN_DELAY_MS (600ms)
        jest.advanceTimersByTime(599);
        expect(global.processCpuTurn).not.toHaveBeenCalled();

        // Advance past the delay
        jest.advanceTimersByTime(2);
        // Ensure any remaining timers fire
        jest.runOnlyPendingTimers();

        // Debug: check for fallback scheduling log
        const logs = logSpy.mock.calls.map(c => c[0]).join('\n');
        const warns = warnSpy.mock.calls.map(c => c[0]).join('\n');
        // If scheduleCpuTurn missing, we should have the fallback log message
        expect(logs + warns).toEqual(expect.stringMatching(/scheduleCpuTurn not available|scheduled CPU callback firing/));

        // processCpuTurn should eventually be called (allow for microtask delays)
        expect(global.processCpuTurn).toHaveBeenCalled();

        logSpy.mockRestore(); warnSpy.mockRestore();
        await p; // await completion to avoid leaking promises
    });
});
