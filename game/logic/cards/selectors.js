/**
 * @file selectors.js
 * @description Card selectable-target helpers (Shared between Browser and Headless)
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../../../shared-constants'), require('./utils'));
    } else {
        root.CardSelectors = factory(root.SharedConstants, root.CardUtils);
    }
}(typeof self !== 'undefined' ? self : this, function (SharedConstants, CardUtils) {
    'use strict';

    const { EMPTY } = SharedConstants || {};

    if (EMPTY === undefined) {
        throw new Error('SharedConstants not loaded');
    }

    // Return all non-empty cells (for DESTROY_ONE_STONE)
    function getDestroyTargets(cardState, gameState) {
        const res = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (gameState.board[r][c] !== EMPTY) res.push({ row: r, col: c });
            }
        }
        return res;
    }

    // Return swap targets: opponent stones excluding protected/bomb
    function getSwapTargets(cardState, gameState, playerKey) {
        const opponentKey = playerKey === 'black' ? 'white' : 'black';
        const opponentVal = (playerKey === 'black') ? (SharedConstants.BLACK) * -1 : (SharedConstants.WHITE) * -1; // not used, we'll just compare values

        const protectedSet = new Set(
            (cardState.specialStones || [])
                .filter(s => s.type === 'PROTECTED' || s.type === 'PERMA_PROTECTED' || s.type === 'DRAGON' || s.type === 'BREEDING' || s.type === 'ULTIMATE_DESTROY_GOD')
                .map(s => `${s.row},${s.col}`)
        );
        const bombSet = new Set((cardState.bombs || []).map(b => `${b.row},${b.col}`));

        const res = [];
        const opVal = playerKey === 'black' ? SharedConstants.WHITE : SharedConstants.BLACK;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (gameState.board[r][c] !== opVal) continue;
                const key = `${r},${c}`;
                if (protectedSet.has(key) || bombSet.has(key)) continue;
                res.push({ row: r, col: c });
            }
        }
        return res;
    }

    // Return inherit targets: normal stones for player (uses CardUtils if available)
    function getInheritTargets(cardState, gameState, playerKey) {
        if (CardUtils && typeof CardUtils.isNormalStoneForPlayer === 'function') {
            const res = [];
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (CardUtils.isNormalStoneForPlayer(cardState, gameState, playerKey, r, c)) {
                        res.push({ row: r, col: c });
                    }
                }
            }
            return res;
        }
        // Fallback: replicate minimal logic
        const res = [];
        const playerVal = playerKey === 'black' ? SharedConstants.BLACK : SharedConstants.WHITE;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (gameState.board[r][c] !== playerVal) continue;
                const specials = cardState.specialStones || [];
                if (specials.some(s => s.row === r && s.col === c)) continue;
                const bombs = cardState.bombs || [];
                if (bombs.some(b => b.row === r && b.col === c)) continue;
                res.push({ row: r, col: c });
            }
        }
        return res;
    }

    return {
        getDestroyTargets,
        getSwapTargets,
        getInheritTargets
    };
}));