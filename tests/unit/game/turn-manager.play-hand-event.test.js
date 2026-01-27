const TM = require('../../../game/turn-manager');

describe('turn-manager play hand animation event', () => {
    beforeEach(() => {
        global.BLACK = 1; global.WHITE = -1;
        global.cardState = { hands: { black: [], white: [] }, presentationEvents: [], turnIndex: 0 };
        global.gameState = { currentPlayer: 1 };
        global.isProcessing = false; global.isCardAnimating = false;
        // Initialize pending effects map
        global.cardState.pendingEffectByPlayer = { black: null, white: null };
        // Minimal stubs
        global.findMoveForCell = jest.fn(() => ({ flips: [], row: 2, col: 3 }));
        global.executeMove = jest.fn();
        global.playHandAnimation = jest.fn((player, r, c, cb) => { cb && cb(); });
        global.isDebugLogAvailable = () => false; global.debugLog = () => {};
        global.getActiveProtectionForPlayer = jest.fn(() => null);
        global.getFlipBlockers = jest.fn(() => []);
    });
    afterEach(() => {
        try { delete global.emitPresentationEvent; } catch (e) {}
        try { delete global.cardState; } catch (e) {}
        try { delete global.gameState; } catch (e) {}
        try { delete global.findMoveForCell; } catch (e) {}
        try { delete global.executeMove; } catch (e) {}
        try { delete global.playHandAnimation; } catch (e) {}
    });

    test('emits PLAY_HAND_ANIMATION via emitPresentationEvent when helper available', () => {
        global.emitPresentationEvent = jest.fn((cs, ev) => { cs.presentationEvents.push(ev); });
        TM.handleCellClick(2, 3);
        expect(global.emitPresentationEvent).toHaveBeenCalled();
        const calledWith = global.emitPresentationEvent.mock.calls[0];
        expect(calledWith[0]).toBe(global.cardState);
        expect(calledWith[1] && calledWith[1].type).toBe('PLAY_HAND_ANIMATION');
        expect(calledWith[1] && calledWith[1].player).toBe('black');
        expect(calledWith[1] && calledWith[1].row).toBe(2);
        expect(calledWith[1] && calledWith[1].col).toBe(3);
        // handler should still call playHandAnimation
        expect(global.playHandAnimation).toHaveBeenCalled();
    });

    test('falls back to cardState.presentationEvents when helper missing', () => {
        try { delete global.emitPresentationEvent; } catch (e) {}
        TM.handleCellClick(2, 3);
        expect(global.cardState.presentationEvents.some(e => e.type === 'PLAY_HAND_ANIMATION' && e.player === 'black' && e.row === 2 && e.col === 3)).toBe(true);
        expect(global.playHandAnimation).toHaveBeenCalled();
    });
});