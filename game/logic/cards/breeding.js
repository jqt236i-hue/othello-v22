/**
 * @file breeding.js
 * @description Breeding effect helpers (Shared between Browser and Headless)
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../../../shared-constants'));
    } else {
        root.CardBreeding = factory(root.SharedConstants);
    }
}(typeof self !== 'undefined' ? self : this, function (SharedConstants) {
    'use strict';

    const { BLACK, WHITE, DIRECTIONS, EMPTY } = SharedConstants || {};

    if (BLACK === undefined || WHITE === undefined || DIRECTIONS === undefined || EMPTY === undefined) {
        throw new Error('SharedConstants missing required values');
    }

    function processBreedingEffects(cardState, gameState, playerKey, prng, deps = {}) {
        const p = prng || (deps.defaultPrng || { random: () => 0 });
        const player = playerKey === 'black' ? (BLACK || 1) : (WHITE || -1);
        const spawned = [];
        const destroyed = [];
        const flipped = [];
        const anchors = [];
        const flippedSet = new Set();

        const breedings = (cardState.specialStones || []).filter(s => s.type === 'BREEDING');
        const getCardContext = deps.getCardContext || (() => ({ protectedStones: cardState.specialStones ? cardState.specialStones.filter(s => s.type === 'PROTECTED').map(s => ({ row: s.row, col: s.col })) : [], permaProtectedStones: cardState.specialStones ? cardState.specialStones.filter(s => s.type === 'PERMA_PROTECTED' || s.type === 'DRAGON' || s.type === 'BREEDING' || s.type === 'ULTIMATE_DESTROY_GOD').map(s => ({ row: s.row, col: s.col, owner: s.owner === 'black' ? BLACK : WHITE })) : [] }));
        const getFlipsWithContext = deps.getFlipsWithContext || ((gs, r, c, playerVal, ctx) => []);
        const clearBombAt = deps.clearBombAt || ((cs, r, c) => { if (cs.bombs) cs.bombs = cs.bombs.filter(b => !(b.row === r && b.col === c)); });

        const context = getCardContext(cardState);

        for (const breeding of breedings) {
            if (breeding.owner !== playerKey) continue;

            // Anchor must still be the owner's stone
            if (gameState.board[breeding.row][breeding.col] !== player) {
                breeding.remainingOwnerTurns = -1; // Terminate effect
                continue;
            }

            // Turn countdown: decrement first, then fire if >= 0 (0 fires too)
            const before = (breeding.remainingOwnerTurns === undefined || breeding.remainingOwnerTurns === null)
                ? 0
                : breeding.remainingOwnerTurns;
            const afterDec = before - 1;
            breeding.remainingOwnerTurns = afterDec;
            if (afterDec < 0) continue;
            anchors.push({ row: breeding.row, col: breeding.col, remainingNow: afterDec });

            // Find empty surrounding cells (8 squares)
            const emptyCells = [];
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue; // Skip anchor itself
                    const r = breeding.row + dr;
                    const c = breeding.col + dc;
                    if (r >= 0 && r < 8 && c >= 0 && c < 8 && gameState.board[r][c] === EMPTY) {
                        emptyCells.push({ row: r, col: c });
                    }
                }
            }

            if (emptyCells.length > 0) {
                const index = Math.floor(p.random() * emptyCells.length);
                const target = emptyCells[index];
                const flips = getFlipsWithContext(gameState, target.row, target.col, player, context);
                let spawnRes = null;
                if (deps.BoardOps && typeof deps.BoardOps.spawnAt === 'function') {
                    spawnRes = deps.BoardOps.spawnAt(cardState, gameState, target.row, target.col, playerKey, 'BREEDING', 'breeding_spawn');
                } else {
                    gameState.board[target.row][target.col] = player;
                }

                spawned.push({ row: target.row, col: target.col, anchorRow: breeding.row, anchorCol: breeding.col, stoneId: spawnRes ? spawnRes.stoneId : undefined });

                for (const [r, c] of flips) {
                    if (deps.BoardOps && typeof deps.BoardOps.changeAt === 'function') {
                        deps.BoardOps.changeAt(cardState, gameState, r, c, playerKey, 'BREEDING', 'breeding_flip');
                    } else {
                        gameState.board[r][c] = player;
                    }
                    clearBombAt(cardState, r, c);
                    const key = `${r},${c}`;
                    if (!flippedSet.has(key)) {
                        flippedSet.add(key);
                        flipped.push({ row: r, col: c });
                    }
                }
            }

            if (afterDec === 0) {
                destroyed.push({ row: breeding.row, col: breeding.col });
                if (deps.BoardOps && typeof deps.BoardOps.destroyAt === 'function') {
                    deps.BoardOps.destroyAt(cardState, gameState, breeding.row, breeding.col, 'BREEDING', 'anchor_expired');
                } else {
                    gameState.board[breeding.row][breeding.col] = EMPTY;
                }
                breeding.remainingOwnerTurns = -1;
            }
        }

        // Remove expired breeding anchors
        cardState.specialStones = (cardState.specialStones || []).filter(s => s.type !== 'BREEDING' || (s.remainingOwnerTurns !== undefined && s.remainingOwnerTurns !== null && s.remainingOwnerTurns >= 0));

        if (flipped.length > 0 && typeof deps.clearHyperactiveAtPositions === 'function') {
            deps.clearHyperactiveAtPositions(cardState, flipped);
        }

        return { spawned, destroyed, flipped, anchors };
    }

    function processBreedingEffectsAtAnchor(cardState, gameState, playerKey, row, col, prng, deps = {}) {
        const p = prng || (deps.defaultPrng || { random: () => 0 });
        const player = playerKey === 'black' ? (BLACK || 1) : (WHITE || -1);
        const spawned = [];
        const destroyed = [];
        const flipped = [];
        const flippedSet = new Set();

        const anchor = (cardState.specialStones || []).find(s => s.type === 'BREEDING' && s.owner === playerKey && s.row === row && s.col === col);
        if (!anchor) return { spawned, destroyed, flipped };
        if (gameState.board[row][col] !== player) return { spawned, destroyed, flipped };

        const getCardContext = deps.getCardContext || (() => ({ protectedStones: cardState.specialStones ? cardState.specialStones.filter(s => s.type === 'PROTECTED').map(s => ({ row: s.row, col: s.col })) : [], permaProtectedStones: cardState.specialStones ? cardState.specialStones.filter(s => s.type === 'PERMA_PROTECTED' || s.type === 'DRAGON' || s.type === 'BREEDING' || s.type === 'ULTIMATE_DESTROY_GOD').map(s => ({ row: s.row, col: s.col, owner: s.owner === 'black' ? BLACK : WHITE })) : [] }));
        const getFlipsWithContext = deps.getFlipsWithContext || ((gs, r, c, playerVal, ctx) => []);
        const clearBombAt = deps.clearBombAt || ((cs, r, c) => { if (cs.bombs) cs.bombs = cs.bombs.filter(b => !(b.row === r && b.col === c)); });

        const context = getCardContext(cardState);
        const emptyCells = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = row + dr;
                const c = col + dc;
                if (r >= 0 && r < 8 && c >= 0 && c < 8 && gameState.board[r][c] === EMPTY) {
                    emptyCells.push({ row: r, col: c });
                }
            }
        }

        if (emptyCells.length > 0) {
            const index = Math.floor(p.random() * emptyCells.length);
            const target = emptyCells[index];
            const flips = getFlipsWithContext(gameState, target.row, target.col, player, context);

            let spawnRes = null;
            if (deps.BoardOps && typeof deps.BoardOps.spawnAt === 'function') {
                spawnRes = deps.BoardOps.spawnAt(cardState, gameState, target.row, target.col, playerKey, 'BREEDING', 'breeding_spawn_immediate');
            } else {
                gameState.board[target.row][target.col] = player;
            }

            spawned.push({ row: target.row, col: target.col, anchorRow: row, anchorCol: col, stoneId: spawnRes ? spawnRes.stoneId : undefined });

            for (const [fr, fc] of flips) {
                if (deps.BoardOps && typeof deps.BoardOps.changeAt === 'function') {
                    deps.BoardOps.changeAt(cardState, gameState, fr, fc, playerKey, 'BREEDING', 'breeding_flip_immediate');
                } else {
                    gameState.board[fr][fc] = player;
                }
                clearBombAt(cardState, fr, fc);
                const key = `${fr},${fc}`;
                if (!flippedSet.has(key)) {
                    flippedSet.add(key);
                    flipped.push({ row: fr, col: fc });
                }
            }
        }

        if (flipped.length > 0 && typeof deps.clearHyperactiveAtPositions === 'function') {
            deps.clearHyperactiveAtPositions(cardState, flipped);
        }

        return { spawned, destroyed, flipped };
    }

    return {
        processBreedingEffects,
        processBreedingEffectsAtAnchor
    };
}));