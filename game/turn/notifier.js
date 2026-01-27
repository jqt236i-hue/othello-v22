/**
 * UI Notifier
 * Centralizes creation of presentation events to notify UI of state changes.
 * Important: This module must NOT call UI APIs (emitBoardUpdate/renderBoard/etc.).
 * It only emits presentation events using existing helpers if available (prefer
 * global emitPresentationEvent or BoardOps.emitPresentationEvent), otherwise
 * falls back to pushing into cardState.presentationEvents.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../../game/logic/board_ops'));
    } else {
        root.Notifier = factory(root.BoardOps);
    }
}(typeof self !== 'undefined' ? self : this, function (BoardOpsModule) {
    'use strict';

    function _pushEvent(cardState, ev) {
        if (!cardState) return;
        // prefer global helper emitPresentationEvent if present
        try {
            if (typeof emitPresentationEvent === 'function') {
                emitPresentationEvent(cardState, ev);
                return;
            }
        } catch (e) { /* ignore */ }
        // next prefer BoardOpsModule emit
        try {
            if (BoardOpsModule && typeof BoardOpsModule.emitPresentationEvent === 'function') {
                BoardOpsModule.emitPresentationEvent(cardState, ev);
                return;
            }
        } catch (e) { /* ignore */ }
        // fallback: push directly
        cardState.presentationEvents = cardState.presentationEvents || [];
        const out = Object.assign({}, ev, { turnIndex: (cardState.turnIndex || 0) });
        cardState.presentationEvents.push(out);
        if (!cardState._presentationEventsPersist) cardState._presentationEventsPersist = [];
        cardState._presentationEventsPersist.push(out);
    }

    function notifyUI(cardState, gameState, flags = {}) {
        // flags: { stateChanged, cardStateChanged, render }
        const ev = {
            type: 'STATE_UPDATED',
            stateChanged: !!flags.stateChanged,
            cardStateChanged: !!flags.cardStateChanged,
            render: !!flags.render,
            meta: {
                // include minimal info for UI; do not call UI APIs here
                currentPlayer: gameState && gameState.currentPlayer !== undefined ? gameState.currentPlayer : null
            }
        };
        _pushEvent(cardState, ev);
        return ev; // return for tests/DI
    }

    return {
        notifyUI,
        _pushEvent
    };
}));