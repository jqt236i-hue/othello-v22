/**
 * @file time_bomb.js
 * @description Time Bomb helpers (Shared between Browser and Headless)
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../../../shared-constants'));
    } else {
        root.CardTimeBomb = factory(root.SharedConstants);
    }
}(typeof self !== 'undefined' ? self : this, function (SharedConstants) {
    'use strict';

    const { TIME_BOMB_TURNS } = SharedConstants || {};

    function applyTimeBomb(cardState, playerKey, row, col, deps = {}) {
        const addMarker = deps.addMarker || ((cs, kind, r, c, owner, data) => {
            if (!cs.bombs) cs.bombs = [];
            cs.bombs.push({ row: r, col: c, remainingTurns: data.remainingTurns, owner, placedTurn: data.placedTurn });
            return { placed: true };
        });

        const bombs = cardState.bombs || [];
        if (bombs.some(b => b.row === row && b.col === col)) return { placed: false, reason: 'exists' };

        addMarker(cardState, 'bomb', row, col, playerKey, {
            remainingTurns: TIME_BOMB_TURNS,
            placedTurn: cardState.turnIndex
        });
        return { placed: true };
    }

    function tickBombs(cardState, gameState, playerKey, deps = {}) {
        const destroyAt = deps.destroyAt || ((cs, gs, r, c) => {
            if (gs.board[r][c] === 0) return false;
            // remove markers if applicable
            if (cs.specialStones) cs.specialStones = cs.specialStones.filter(s => !(s.row === r && s.col === c));
            if (cs.bombs) cs.bombs = cs.bombs.filter(b => !(b.row === r && b.col === c));
            gs.board[r][c] = 0;
            return true;
        });

        const exploded = [];
        const destroyed = [];
        const remaining = [];
        const activeKey = playerKey || cardState.lastTurnStartedFor;

        for (const bomb of (cardState.bombs || [])) {
            if (activeKey && bomb.owner !== activeKey) {
                remaining.push(bomb);
                continue;
            }
            if (bomb.placedTurn === cardState.turnIndex) {
                remaining.push(bomb);
                continue;
            }
            bomb.remainingTurns--;
            if (bomb.remainingTurns <= 0) {
                exploded.push({ row: bomb.row, col: bomb.col });
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const r = bomb.row + dr;
                        const c = bomb.col + dc;
                        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                            let destroyedRes = false;
                            if (deps.BoardOps && typeof deps.BoardOps.destroyAt === 'function') {
                                const res = deps.BoardOps.destroyAt(cardState, gameState, r, c, 'TIME_BOMB', 'bomb_explosion');
                                destroyedRes = !!res.destroyed;
                            } else {
                                destroyedRes = destroyAt(cardState, gameState, r, c);
                            }
                            if (destroyedRes) {
                                destroyed.push({ row: r, col: c });
                            }
                        }
                    }
                }
            } else {
                remaining.push(bomb);
            }
        }

        cardState.bombs = remaining;
        return { exploded, destroyed };
    }

    return {
        applyTimeBomb,
        tickBombs
    };
}));