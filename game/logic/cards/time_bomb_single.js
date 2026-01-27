// Helper wrapper for single-bomb tick processing - thin adapter to time_bomb
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../../../shared-constants'));
    } else {
        root.CardTimeBombSingle = factory(root.SharedConstants);
    }
}(typeof self !== 'undefined' ? self : this, function (SharedConstants) {
    'use strict';

    const TIME_BOMB_TURNS = (SharedConstants && SharedConstants.TIME_BOMB_TURNS) || 3;

    function tickBombAt(cardState, gameState, bomb, activeKey, deps = {}) {
        const destroyAt = deps.destroyAt || ((cs, gs, r, c) => {
            if (gs.board[r][c] === 0) return false;
            if (cs.specialStones) cs.specialStones = cs.specialStones.filter(s => !(s.row === r && s.col === c));
            if (cs.bombs) cs.bombs = cs.bombs.filter(b => !(b.row === r && b.col === c));
            gs.board[r][c] = 0;
            return true;
        });

        // Find bomb in cardState.bombs to operate on (if not the same object)
        const idx = (cardState.bombs || []).findIndex(b => b.row === bomb.row && b.col === bomb.col && b.owner === bomb.owner && b.createdSeq === bomb.createdSeq);
        if (idx === -1) return { exploded: [], destroyed: [], removed: false };
        const b = cardState.bombs[idx];

        // Active check
        if (activeKey && b.owner !== activeKey) return { exploded: [], destroyed: [], removed: false };
        if (b.placedTurn === cardState.turnIndex) return { exploded: [], destroyed: [], removed: false };

        b.remainingTurns--;
        if (b.remainingTurns <= 0) {
            const exploded = [{ row: b.row, col: b.col }];
            const destroyed = [];
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const r = b.row + dr;
                    const c = b.col + dc;
                    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                        let destroyedRes = false;
                        if (deps.BoardOps && typeof deps.BoardOps.destroyAt === 'function') {
                            const res = deps.BoardOps.destroyAt(cardState, gameState, r, c, 'TIME_BOMB', 'bomb_explosion');
                            destroyedRes = !!res.destroyed;
                        } else {
                            destroyedRes = destroyAt(cardState, gameState, r, c);
                        }
                        if (destroyedRes) destroyed.push({ row: r, col: c });
                    }
                }
            }
            // remove the bomb from list
            cardState.bombs.splice(idx, 1);
            return { exploded, destroyed, removed: true };
        }

        // Not exploded; update stored bomb
        cardState.bombs[idx] = b;
        return { exploded: [], destroyed: [], removed: false };
    }

    return { tickBombAt };
}));