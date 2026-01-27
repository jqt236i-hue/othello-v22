const CardLogic = require('../../game/logic/cards');
const Core = require('../../game/logic/core');
const CpuDec = require('../../game/cpu-decision');
const { createNoopPrng } = require('../test-helpers');

describe('CPU card fallback usage', () => {
    test('CPU at high level uses an available cheap card (fallback)', () => {
        const cs = CardLogic.createCardState(createNoopPrng());
        const gs = Core.createGameState();

        // Give WHITE a cheap card and sufficient charge
        cs.hands.white.push('hard_01');
        cs.charge.white = 10;

        // Expose globals used by cpu-decision
        global.cardState = cs;
        global.gameState = gs;
        global.cpuSmartness = { black: 1, white: 7 };

        // Ensure AISystem undefined so fallback is used
        global.AISystem = undefined;

        // Provide minimal global helpers/constants expected by cpu-decision
        global.BLACK = Core.BLACK;
        global.WHITE = Core.WHITE;
        global.CardLogic = CardLogic;
        global.getActiveProtectionForPlayer = () => [];
        global.getFlipBlockers = () => [];
        global.getLegalMoves = () => [{ row: 2, col: 3, flips: [] }];
        global.addLog = () => { };

        CpuDec.cpuMaybeUseCardWithPolicy('white');

        expect(cs.hasUsedCardThisTurnByPlayer.white).toBe(true);
        expect(cs.discard.includes('hard_01')).toBe(true);
    });
});