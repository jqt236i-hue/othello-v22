const TM = require('../../../game/turn-manager');

describe('turn-manager draw event', () => {
    let origApply;
    beforeEach(() => {
        // Ensure a clean cardState and gameState
        global.BLACK = 1; global.WHITE = -1;
        global.cardState = { hands: { black: [], white: [] }, presentationEvents: [], turnIndex: 0, turnCountByPlayer: { black: 0, white: 0 } };
        global.gameState = { currentPlayer: 1, turnNumber: 0 };
        // Minimal global stubs used by turn-manager
        global.CardLogic = global.CardLogic || {};
        global.Core = global.Core || {};
        global.addLog = global.addLog || (() => {});
        global.updateDeckVisual = global.updateDeckVisual || (() => {});
        global.processBombs = global.processBombs || (async () => {});
        global.processUltimateDestroyGodsAtTurnStart = global.processUltimateDestroyGodsAtTurnStart || (async () => {});
        global.processUltimateReverseDragonsAtTurnStart = global.processUltimateReverseDragonsAtTurnStart || (async () => {});
        global.processBreedingEffectsAtTurnStart = global.processBreedingEffectsAtTurnStart || (async () => {});
        global.processHyperactiveMovesAtTurnStart = global.processHyperactiveMovesAtTurnStart || (async () => {});
        global.emitGameStateChange = global.emitGameStateChange || (() => {});
        global.emitCardStateChange = global.emitCardStateChange || (() => {});
        // Provide minimal debug helpers used in module
        global.isDebugLogAvailable = () => false;
        global.debugLog = () => {};
        // Stub pipeline to simulate draw: push a card onto hands
        origApply = global.TurnPipelinePhases;
        global.TurnPipelinePhases = {
            applyTurnStartPhase: (CardLogic, Core, cs, gs, playerKey, events, runtimePrng) => {
                // simulate draw for black
                if (playerKey === 'black') {
                    cs.hands.black.push('free_01');
                }
            }
        };
    });
    afterEach(() => {
        global.TurnPipelinePhases = origApply;
        try { delete global.cardState; } catch (e) {}
        try { delete global.gameState; } catch (e) {}
        try { delete global.emitPresentationEvent; } catch (e) {}
    });

    test('emits DRAW_CARD via emitPresentationEvent when helper available', async () => {
        global.emitPresentationEvent = jest.fn();
        await TM.onTurnStart(1);
        expect(global.emitPresentationEvent).toHaveBeenCalled();
        const calledWith = global.emitPresentationEvent.mock.calls[0];
        expect(calledWith[0]).toBe(global.cardState);
        expect(calledWith[1] && calledWith[1].type).toBe('DRAW_CARD');
        expect(calledWith[1] && calledWith[1].player).toBe('black');
        expect(calledWith[1] && calledWith[1].cardId).toBe('free_01');
    });

    test('falls back to cardState.presentationEvents when helper missing', async () => {
        // remove helper
        try { delete global.emitPresentationEvent; } catch (e) {}
        await TM.onTurnStart(1);
        expect(global.cardState.presentationEvents.some(e => e.type === 'DRAW_CARD' && e.player === 'black' && e.cardId === 'free_01')).toBe(true);
    });
});
