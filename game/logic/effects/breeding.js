/**
 * BREEDING_WILL effect helper
 * processBreedingEffects(cardState, gameState, playerKey, prng)
 * This function selects an empty adjacent cell and spawns a stone, flips surrounding as per rules.
 */

function processBreedingEffects(cardState, gameState, playerKey, prng) {
    if (!prng || typeof prng.random !== 'function') {
        throw new Error('PRNG not provided: breeding effects require a seeded PRNG for reproducibility');
    }
    const p = prng;
    const spawned = [];
    const destroyed = [];
    const flipped = [];
    const anchors = [];
    const flippedSet = new Set();
    const clearBombAt = (row, col) => {
        if (!cardState.bombs || !cardState.bombs.length) return;
        const b = cardState.bombs.find(x => x.row === row && x.col === col);
        if (!b) return;
        cardState.bombs = cardState.bombs.filter(x => !(x.row === row && x.col === col));
    };

    const breedings = (cardState.specialStones || []).filter(s => s.type === 'BREEDING');
    // Build context similar to CardLogic.getCardContext
    const protectedStones = (cardState.specialStones || []).filter(s => s.type === 'PROTECTED');
    const permaProtected = (cardState.specialStones || []).filter(s => s.type === 'PERMA_PROTECTED' || s.type === 'DRAGON' || s.type === 'BREEDING').map(s => ({ row: s.row, col: s.col, owner: s.owner }));
    const context = { protectedStones, permaProtected, bombs: cardState.bombs };

    const { BLACK, WHITE } = require('../../../shared-constants');

    function getFlipsWithContextLocal(targetRow, targetCol, player) {
        if (gameState.board[targetRow][targetCol] !== 0) return [];

        const protectedSet = context.protectedStones && context.protectedStones.length
            ? new Set(context.protectedStones.map(p => `${p.row},${p.col}`))
            : null;
        const permaSet = context.permaProtected && context.permaProtected.length
            ? new Set(context.permaProtected.map(p => `${p.row},${p.col}`))
            : null;

        const DIRECTIONS = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        const allFlips = [];
        for (const [dr, dc] of DIRECTIONS) {
            const line = [];
            let r = targetRow + dr;
            let c = targetCol + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8 && gameState.board[r][c] === -player) {
                const key = `${r},${c}`;
                if ((protectedSet && protectedSet.has(key)) || (permaSet && permaSet.has(key))) {
                    line.length = 0;
                    break;
                }
                line.push([r, c]);
                r += dr;
                c += dc;
            }
            if (line.length > 0 && r >= 0 && r < 8 && c >= 0 && c < 8 && gameState.board[r][c] === player) {
                allFlips.push(...line);
            }
        }
        return allFlips;
    }

    for (const breeding of breedings) {
        if (breeding.owner !== playerKey) continue;

        const player = breeding.owner === 'black' ? BLACK : WHITE;
        // Anchor must still be player's stone
        if (gameState.board[breeding.row][breeding.col] !== player) {
            breeding.remainingOwnerTurns = -1;
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

        const emptyCells = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = breeding.row + dr;
                const c = breeding.col + dc;
                if (r >= 0 && r < 8 && c >= 0 && c < 8 && gameState.board[r][c] === 0) {
                    emptyCells.push({ row: r, col: c });
                }
            }
        }

        if (emptyCells.length > 0) {
            const index = Math.floor(p.random() * emptyCells.length);
            const target = emptyCells[index];
            const flips = getFlipsWithContextLocal(target.row, target.col, player);

            let stoneId = null;
            try {
                const BoardOps = require('../board_ops');
                const spawnRes = BoardOps.spawnAt(cardState, gameState, target.row, target.col, playerKey, 'BREEDING', 'breeding_spawned');
                stoneId = spawnRes.stoneId;
            } catch (e) {
                gameState.board[target.row][target.col] = player;
            }

            spawned.push({ row: target.row, col: target.col, anchorRow: breeding.row, anchorCol: breeding.col, stoneId });
            for (const [r, c] of flips) {
                gameState.board[r][c] = player;
                clearBombAt(r, c);
                const key = `${r},${c}`;
                if (!flippedSet.has(key)) {
                    flippedSet.add(key);
                    flipped.push({ row: r, col: c });
                }
            }
        }

        // If countdown reached 0 this turn, destroy anchor after generating
        if (afterDec === 0) {
            destroyed.push({ row: breeding.row, col: breeding.col });
            try {
                const BoardOps = require('../board_ops');
                BoardOps.destroyAt(cardState, gameState, breeding.row, breeding.col, 'BREEDING', 'anchor_expired');
            } catch (e) {
                gameState.board[breeding.row][breeding.col] = 0;
            }
            breeding.remainingOwnerTurns = -1;
        }
    }

    // Remove expired breeding anchors from specialStones
    if (cardState.specialStones) {
        cardState.specialStones = cardState.specialStones.filter(s =>
            s.type !== 'BREEDING' || (s.remainingOwnerTurns !== undefined && s.remainingOwnerTurns !== null && s.remainingOwnerTurns >= 0)
        );
    }

    if (flipped.length > 0 && cardState.specialStones) {
        const removeSet = new Set(flipped.map(p => `${p.row},${p.col}`));
        cardState.specialStones = cardState.specialStones.filter(s =>
            s.type !== 'HYPERACTIVE' || !removeSet.has(`${s.row},${s.col}`)
        );
    }

    return { spawned, destroyed, flipped, anchors };
}

function processBreedingEffectsAtTurnStartAnchor(cardState, gameState, playerKey, row, col, prng) {
    if (!prng || typeof prng.random !== 'function') {
        throw new Error('PRNG not provided: breeding effects require a seeded PRNG for reproducibility');
    }
    const p = prng;
    const spawned = [];
    const destroyed = [];
    const flipped = [];
    const flippedSet = new Set();
    const anchors = [];
    const clearBombAt = (r, c) => {
        if (!cardState.bombs || !cardState.bombs.length) return;
        const b = cardState.bombs.find(x => x.row === r && x.col === c);
        if (!b) return;
        cardState.bombs = cardState.bombs.filter(x => !(x.row === r && x.col === c));
    };

    const { BLACK, WHITE } = require('../../../shared-constants');
    const player = playerKey === 'black' ? BLACK : WHITE;

    const anchor = (cardState.specialStones || []).find(s =>
        s.type === 'BREEDING' && s.owner === playerKey && s.row === row && s.col === col
    );
    if (!anchor) return { spawned, destroyed, flipped, anchors };
    if (gameState.board[row][col] !== player) return { spawned, destroyed, flipped, anchors };

    // Turn countdown: decrement first, then fire if >= 0 (0 fires too)
    const before = (anchor.remainingOwnerTurns === undefined || anchor.remainingOwnerTurns === null)
        ? 0
        : anchor.remainingOwnerTurns;
    const afterDec = before - 1;
    anchor.remainingOwnerTurns = afterDec;
    if (afterDec < 0) return { spawned, destroyed, flipped, anchors };
    anchors.push({ row, col, remainingNow: afterDec });

    const protectedStones = (cardState.specialStones || []).filter(s => s.type === 'PROTECTED');
    const permaProtected = (cardState.specialStones || []).filter(s => s.type === 'PERMA_PROTECTED' || s.type === 'DRAGON' || s.type === 'BREEDING').map(s => ({ row: s.row, col: s.col, owner: s.owner }));
    const context = { protectedStones, permaProtected, bombs: cardState.bombs };

    const protectedSet = context.protectedStones && context.protectedStones.length
        ? new Set(context.protectedStones.map(p => `${p.row},${p.col}`))
        : null;
    const permaSet = context.permaProtected && context.permaProtected.length
        ? new Set(context.permaProtected.map(p => `${p.row},${p.col}`))
        : null;

    const DIRECTIONS = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];

    const emptyCells = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8 && gameState.board[r][c] === 0) {
                emptyCells.push({ row: r, col: c });
            }
        }
    }

    if (emptyCells.length > 0) {
        const index = Math.floor(p.random() * emptyCells.length);
        const target = emptyCells[index];

        const flips = [];
        for (const [dr, dc] of DIRECTIONS) {
            const line = [];
            let r = target.row + dr;
            let c = target.col + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8 && gameState.board[r][c] === -player) {
                const key = `${r},${c}`;
                if ((protectedSet && protectedSet.has(key)) || (permaSet && permaSet.has(key))) {
                    line.length = 0;
                    break;
                }
                line.push([r, c]);
                r += dr;
                c += dc;
            }
            if (line.length > 0 && r >= 0 && r < 8 && c >= 0 && c < 8 && gameState.board[r][c] === player) {
                flips.push(...line);
            }
        }

        let stoneId = null;
        try {
            const BoardOps = require('../board_ops');
            const spawnRes = BoardOps.spawnAt(cardState, gameState, target.row, target.col, playerKey, 'BREEDING', 'breeding_spawned');
            stoneId = spawnRes.stoneId;
        } catch (e) {
            gameState.board[target.row][target.col] = player;
        }

        spawned.push({ row: target.row, col: target.col, anchorRow: row, anchorCol: col, stoneId });
        for (const [r, c] of flips) {
            gameState.board[r][c] = player;
            clearBombAt(r, c);
            const key = `${r},${c}`;
            if (!flippedSet.has(key)) {
                flippedSet.add(key);
                flipped.push({ row: r, col: c });
            }
        }
    }

    if (flipped.length > 0 && cardState.specialStones) {
        const removeSet = new Set(flipped.map(p => `${p.row},${p.col}`));
        cardState.specialStones = cardState.specialStones.filter(s =>
            s.type !== 'HYPERACTIVE' || !removeSet.has(`${s.row},${s.col}`)
        );
    }

    return { spawned, destroyed, flipped, anchors };
}

function processBreedingEffectsAtAnchor(cardState, gameState, playerKey, row, col, prng) {
    if (!prng || typeof prng.random !== 'function') {
        throw new Error('PRNG not provided: breeding effects require a seeded PRNG for reproducibility');
    }
    const p = prng;
    const spawned = [];
    const destroyed = [];
    const flipped = [];
    const flippedSet = new Set();
    const clearBombAt = (r, c) => {
        if (!cardState.bombs || !cardState.bombs.length) return;
        const b = cardState.bombs.find(x => x.row === r && x.col === c);
        if (!b) return;
        cardState.bombs = cardState.bombs.filter(x => !(x.row === r && x.col === c));
    };

    const { BLACK, WHITE } = require('../../../shared-constants');
    const player = playerKey === 'black' ? BLACK : WHITE;

    const anchor = (cardState.specialStones || []).find(s =>
        s.type === 'BREEDING' && s.owner === playerKey && s.row === row && s.col === col
    );
    if (!anchor) return { spawned, destroyed, flipped };
    if (gameState.board[row][col] !== player) return { spawned, destroyed, flipped };

    const protectedStones = (cardState.specialStones || []).filter(s => s.type === 'PROTECTED');
    const permaProtected = (cardState.specialStones || []).filter(s => s.type === 'PERMA_PROTECTED' || s.type === 'DRAGON' || s.type === 'BREEDING').map(s => ({ row: s.row, col: s.col, owner: s.owner }));
    const context = { protectedStones, permaProtected, bombs: cardState.bombs };

    const protectedSet = context.protectedStones && context.protectedStones.length
        ? new Set(context.protectedStones.map(p => `${p.row},${p.col}`))
        : null;
    const permaSet = context.permaProtected && context.permaProtected.length
        ? new Set(context.permaProtected.map(p => `${p.row},${p.col}`))
        : null;

    const DIRECTIONS = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];

    const emptyCells = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8 && gameState.board[r][c] === 0) {
                emptyCells.push({ row: r, col: c });
            }
        }
    }

    if (emptyCells.length > 0) {
        const index = Math.floor(p.random() * emptyCells.length);
        const target = emptyCells[index];

        const flips = [];
        for (const [dr, dc] of DIRECTIONS) {
            const line = [];
            let r = target.row + dr;
            let c = target.col + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8 && gameState.board[r][c] === -player) {
                const key = `${r},${c}`;
                if ((protectedSet && protectedSet.has(key)) || (permaSet && permaSet.has(key))) {
                    line.length = 0;
                    break;
                }
                line.push([r, c]);
                r += dr;
                c += dc;
            }
            if (line.length > 0 && r >= 0 && r < 8 && c >= 0 && c < 8 && gameState.board[r][c] === player) {
                flips.push(...line);
            }
        }

        let stoneId = null;
        try {
            const BoardOps = require('../board_ops');
            const spawnRes = BoardOps.spawnAt(cardState, gameState, target.row, target.col, playerKey, 'BREEDING', 'breeding_spawned');
            stoneId = spawnRes.stoneId;
        } catch (e) {
            gameState.board[target.row][target.col] = player;
        }

        spawned.push({ row: target.row, col: target.col, anchorRow: row, anchorCol: col, stoneId });
        for (const [r, c] of flips) {
            gameState.board[r][c] = player;
            clearBombAt(r, c);
            const key = `${r},${c}`;
            if (!flippedSet.has(key)) {
                flippedSet.add(key);
                flipped.push({ row: r, col: c });
            }
        }
    }

    if (flipped.length > 0 && cardState.specialStones) {
        const removeSet = new Set(flipped.map(p => `${p.row},${p.col}`));
        cardState.specialStones = cardState.specialStones.filter(s =>
            s.type !== 'HYPERACTIVE' || !removeSet.has(`${s.row},${s.col}`)
        );
    }

    return { spawned, destroyed, flipped };
}

module.exports = { processBreedingEffects, processBreedingEffectsAtAnchor, processBreedingEffectsAtTurnStartAnchor };
