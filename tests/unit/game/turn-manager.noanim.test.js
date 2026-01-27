/* eslint-env jest */

const TM = require('../../../game/turn-manager.js');
let CardSys;

describe('turn-manager Phase2 safe-guards (no animation scripts)', () => {
    let origDeal, origOnTurnStart, origCardLogicOnTurnStart, origPlayDraw;

    beforeEach(() => {
        // Mock minimal CardLogic dependency before loading CardSys
        global.CardLogic = global.CardLogic || {};
        global.CardLogic.createCardState = global.CardLogic.createCardState || (() => ({
            deck: [], discard: [],
            hands: { black: [], white: [] },
            turnCountByPlayer: { black: 0, white: 0 },
            pendingEffectByPlayer: { black: null, white: null },
            charge: { black: 0, white: 0 },
            selectedCardId: null
        }));
        global.CardLogic.onTurnStart = global.CardLogic.onTurnStart || ((cardStateArg, playerKey, gs) => {});

        // Mock a minimal SeededPRNG for deterministic init in tests
        global.SeededPRNG = global.SeededPRNG || { createPRNG: (seed) => ({ _seed: seed || 1234, next: () => 0.5 }) };

        // Now load CardSys module under Node environment
        CardSys = require('../../../card-system.js');
        if (typeof CardSys.initCardState === 'function') CardSys.initCardState();

        // Minimal UI flags (align with runtime: prefer global + window mirrors)
        if (typeof window === 'undefined') global.window = {};
        global.isProcessing = false;
        global.isCardAnimating = false;
        window.isProcessing = false;
        window.isCardAnimating = false;

        // Ensure TurnPipelinePhases is available so turn-start behavior runs via the pipeline (not UI fallback)
        global.TurnPipelinePhases = require('../../../game/turn/turn_pipeline_phases.js');

        // Minimal Core shim used by pipeline phases (only constants required by tests)
        global.Core = global.Core || { BLACK: global.BLACK, WHITE: global.WHITE, EMPTY: 0 };

        // Minimal player constants expected by game logic
        global.BLACK = typeof global.BLACK !== 'undefined' ? global.BLACK : 1;
        global.WHITE = typeof global.WHITE !== 'undefined' ? global.WHITE : -1;

        // Minimal cpuSmartness and cardState exposure for modules that expect globals
        global.cpuSmartness = global.cpuSmartness || { black: 1, white: 1 };
        // Ensure a global cardState reference that other modules can use directly
        global.cardState = CardSys.getCardState ? CardSys.getCardState() : (global.cardState || { hands: { black: [], white: [] }, turnCountByPlayer: { black: 0, white: 0 } });

        // Minimal gameState initializer and debug utilities used by turn-manager
        global.createGameState = global.createGameState || (() => ({ currentPlayer: BLACK, turnNumber: 0 }));
        global.isDebugLogAvailable = global.isDebugLogAvailable || (() => false);
        global.debugLog = global.debugLog || (() => {});

        // Minimal event hooks used by the UI / pipeline
        global.emitBoardUpdate = global.emitBoardUpdate || (() => {});
        global.emitGameStateChange = global.emitGameStateChange || (() => {});
        global.emitCardStateChange = global.emitCardStateChange || (() => {});

        // Preserve originals
        origDeal = global.dealInitialCards;
        origOnTurnStart = global.onTurnStart;
        origPlayDraw = global.playDrawAnimation;
        // Mock addLog to suppress DOM writes
        global.addLog = jest.fn();
    });

    afterEach(() => {
        // Restore
        global.dealInitialCards = origDeal;
        global.onTurnStart = origOnTurnStart;
        global.playDrawAnimation = origPlayDraw;
        global.addLog = undefined;
        if (origCardLogicOnTurnStart) {
            global.CardLogic.onTurnStart = origCardLogicOnTurnStart;
            origCardLogicOnTurnStart = null;
        }
        // Clean up the injected TurnPipelinePhases and Core shim to avoid test contamination
        delete global.TurnPipelinePhases;
        delete global.Core;
        delete global.isProcessing;
        delete global.isCardAnimating;
        if (typeof window !== 'undefined') {
            delete window.isProcessing;
            delete window.isCardAnimating;
        }
    });

    test('resetGame falls back when dealInitialCards is missing', () => {
        // Ensure dealInitialCards is not defined
        delete global.dealInitialCards;

        // Spy on onTurnStart so we can verify it is called
        global.onTurnStart = jest.fn();
        if (typeof window === 'undefined') global.window = {};
        window.onTurnStart = global.onTurnStart;

        // Call resetGame via exported API
        expect(() => TM.resetGame()).not.toThrow();

        // It should have invoked onTurnStart synchronously or in fallback
        expect(global.onTurnStart).toHaveBeenCalledWith(BLACK);

        // Flags should be cleared (via window)
        expect(window.isCardAnimating).toBe(false);
        expect(window.isProcessing).toBe(false);

        // addLog should have been called with no anim message
        expect(global.addLog).toHaveBeenCalled();
        const calls = global.addLog.mock.calls.flat();
        expect(calls.join(' ')).toMatch(/カード配布完了/);
    });

    test('onTurnStart does not throw when playDrawAnimation is missing', async () => {
        // Mock CardLogic.onTurnStart to simulate a draw
        origCardLogicOnTurnStart = global.CardLogic && global.CardLogic.onTurnStart ? global.CardLogic.onTurnStart : null;
        if (!global.CardLogic) global.CardLogic = {};
        global.CardLogic.onTurnStart = (cardStateArg, playerKey) => {
            cardStateArg.hands[playerKey].push(999);
        };

        // Ensure playDrawAnimation is absent
        delete global.playDrawAnimation;

        // Initialize a minimal cardState for BLACK via CardSys
        const cs = CardSys.getCardState ? CardSys.getCardState() : (global.cardState || {});
        if (!cs.hands) cs.hands = { black: [], white: [] };
        if (!cs.turnCountByPlayer) cs.turnCountByPlayer = { black: 0, white: 0 };
        cs.hands.black = [];
        cs.turnCountByPlayer.black = 0;

        // Call onTurnStart via exported API and expect no throw
        await expect(TM.onTurnStart(BLACK)).resolves.not.toThrow();

        // Hand should have grown
        const cs2 = CardSys.getCardState ? CardSys.getCardState() : (global.cardState || {});
        expect(cs2.hands.black.length).toBeGreaterThan(0);
    });
});