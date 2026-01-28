describe('cpu/processCpuTurn re-entrance guard', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    test('multiple calls to processCpuTurn do not re-enter runCpuTurn', async () => {
        const cpu = require('../../../cpu/cpu-turn');
        // Stub functions that runCpuTurn will call so we can observe side effects
        global.getActiveProtectionForPlayer = () => [];
        global.getFlipBlockers = () => [];
        global.generateMovesForPlayer = () => [];
        global.getLegalMoves = () => [];
        global.applyPass = (gs) => ({ ...gs, passed: true });
        global.clearExpiredProtections = () => {};
        global.emitBoardUpdate = jest.fn();
        global.emitGameStateChange = jest.fn();
        global.isGameOver = () => false;

        global.cardState = { hasUsedCardThisTurnByPlayer: { white: false, black: false }, pendingEffectByPlayer: { white: null, black: null } };
        global.gameState = { currentPlayer: -1 };

        // Spy a function that runCpuTurn would call (cpuMaybeUseCardWithPolicy)
        global.cpuMaybeUseCardWithPolicy = jest.fn();

        // Call processCpuTurn twice in quick succession
        cpu.processCpuTurn();
        cpu.processCpuTurn();

        // Wait a tick to allow async to run
        await new Promise((resolve) => setTimeout(resolve, 20));

        // cpuMaybeUseCardWithPolicy should be called only once
        expect(global.cpuMaybeUseCardWithPolicy).toHaveBeenCalledTimes(1);
    });
});