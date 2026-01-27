/**
 * @file utils.js
 * @description Card utility helpers (Shared between Browser and Headless)
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../../../shared-constants'));
    } else {
        root.CardUtils = factory(root.SharedConstants);
    }
}(typeof self !== 'undefined' ? self : this, function (SharedConstants) {
    'use strict';

    const { BLACK, WHITE, EMPTY } = SharedConstants || {};

    if (BLACK === undefined || WHITE === undefined || EMPTY === undefined) {
        throw new Error('SharedConstants not loaded');
    }

    function getSpecialMarkerAt(cardState, row, col) {
        const special = (cardState.specialStones || []).find(s => s.row === row && s.col === col);
        if (special) return { kind: 'specialStone', marker: special };
        const bomb = (cardState.bombs || []).find(b => b.row === row && b.col === col);
        if (bomb) return { kind: 'bomb', marker: bomb };
        return null;
    }

    function isSpecialStoneAt(cardState, row, col) {
        return !!getSpecialMarkerAt(cardState, row, col);
    }

    function getSpecialOwnerAt(cardState, row, col) {
        const entry = getSpecialMarkerAt(cardState, row, col);
        if (!entry) return null;
        return entry.marker && entry.marker.owner ? entry.marker.owner : null;
    }

    function isNormalStoneForPlayer(cardState, gameState, playerKey, row, col) {
        const playerVal = playerKey === 'black' ? BLACK : WHITE;

        if (gameState.board[row][col] !== playerVal) return false;

        const specials = cardState.specialStones || [];
        if (specials.some(s => s.row === row && s.col === col)) return false;

        const bombs = cardState.bombs || [];
        if (bombs.some(b => b.row === row && b.col === col)) return false;

        return true;
    }

    return {
        getSpecialMarkerAt,
        isSpecialStoneAt,
        getSpecialOwnerAt,
        isNormalStoneForPlayer
    };
}));
