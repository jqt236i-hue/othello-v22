jest.useFakeTimers();

const cpu = require('../../../cpu/cpu-turn');

describe('processCpuTurn scheduling guard', () => {
    let originalAddLog;
    beforeEach(() => {
        // Stubs to allow processCpuTurn to run into pass branch without errors
        global.getActiveProtectionForPlayer = () => [];
        global.getFlipBlockers = () => [];
        global.generateMovesForPlayer = () => [];
        global.getLegalMoves = () => [];
        global.applyPass = (gs) => ({ ...gs, passed: true });
        global.clearExpiredProtections = () => {};
        global.emitBoardUpdate = jest.fn();
        global.emitGameStateChange = jest.fn();
        global.isGameOver = () => false;
        global.showResult = jest.fn();
        global.addLog = jest.fn();
        // Ensure CPU delay constant
        global.CPU_TURN_DELAY_MS = 600;
        // Mark last move as just completed (module API)
        cpu.setLastMoveCompletedAt(Date.now());
        // Ensure initial flags
        global.isCardAnimating = false;
        global.isProcessing = false;
        global.gameState = { currentPlayer: -1 };
        global.cardState = { hasUsedCardThisTurnByPlayer: { white: false, black: false }, pendingEffectByPlayer: { white: null, black: null } };
        global.cpuMaybeUseCardWithPolicy = jest.fn();
        global.cpuSelectDestroyWithPolicy = jest.fn();
        global.cpuSelectInheritWillWithPolicy = jest.fn();
        global.cpuSelectSwapWithEnemyWithPolicy = jest.fn();
        global.cpuSelectTemptWillWithPolicy = jest.fn();

        originalAddLog = global.addLog;
    });

    afterEach(() => {
        cpu.setLastMoveCompletedAt(null);
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('processCpuTurn defers execution when called too soon', () => {
        // Call processCpuTurn - it should schedule itself via setTimeout
        cpu.processCpuTurn();
        // addLog should not have been called immediately (pass handling happens after scheduled invocation)
        expect(global.addLog).not.toHaveBeenCalled();

        // Advance to just before delay
        jest.advanceTimersByTime(599);
        expect(global.addLog).not.toHaveBeenCalled();

        // Advance past the delay
        jest.advanceTimersByTime(2);
        expect(global.addLog).toHaveBeenCalled();
    });
});
