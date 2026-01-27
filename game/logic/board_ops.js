(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('../../shared-constants'));
    } else {
        root.BoardOps = factory(root.SharedConstants);
    }
}(typeof self !== 'undefined' ? self : this, function (SharedConstants) {
    'use strict';

    const { EMPTY } = SharedConstants || {};

    function _ensureCardState(cardState) {
        if (!cardState.presentationEvents) cardState.presentationEvents = [];
        if (cardState._nextStoneId === undefined || cardState._nextStoneId === null) cardState._nextStoneId = 1;
    }

    function allocateStoneId(cardState) {
        _ensureCardState(cardState);
        return 's' + String(cardState._nextStoneId++);
    }

    function emitPresentationEvent(cardState, ev) {
        _ensureCardState(cardState);
        // Populate action meta fields if available on cardState._currentActionMeta
        const metaSource = cardState._currentActionMeta || {};
        const actionId = (ev.actionId !== undefined && ev.actionId !== null) ? ev.actionId : (metaSource.actionId || null);
        const turnIndex = (ev.turnIndex !== undefined && ev.turnIndex !== null) ? ev.turnIndex : (typeof metaSource.turnIndex === 'number' ? metaSource.turnIndex : (cardState.turnIndex || 0));
        const plyIndex = (ev.plyIndex !== undefined && ev.plyIndex !== null) ? ev.plyIndex : (typeof metaSource.plyIndex === 'number' ? metaSource.plyIndex : null);

        const out = Object.assign({}, ev, { actionId, turnIndex, plyIndex });
        cardState.presentationEvents.push(out);
        // Also store a persistent copy for UI-level consumption to avoid races where
        // CardLogic.flushPresentationEvents may be called before the UI handler runs.
        if (!cardState._presentationEventsPersist) cardState._presentationEventsPersist = [];
        cardState._presentationEventsPersist.push(out);
        try { if (typeof console !== 'undefined' && console.log) console.log('[BOARDOPS] emitPresentationEvent pushed, persist len', cardState._presentationEventsPersist.length); } catch (e) {}

        // Advance the ply index if using metaSource
        if (metaSource && typeof metaSource.plyIndex === 'number') {
            metaSource.plyIndex = metaSource.plyIndex + 1;
        }

        // Best-effort: notify UI to process updates immediately when in browser
        try {
            if (typeof globalThis !== 'undefined' && typeof globalThis.emitBoardUpdate === 'function') {
                globalThis.emitBoardUpdate();
            } else if (typeof emitBoardUpdate === 'function') {
                emitBoardUpdate();
            }
        } catch (e) { /* ignore in non-browser environments */ }
    }

    function spawnAt(cardState, gameState, row, col, ownerKey, cause, reason, meta = {}) {
        _ensureCardState(cardState);
        const ownerVal = ownerKey === 'black' ? (SharedConstants.BLACK || 1) : (SharedConstants.WHITE || -1);
        gameState.board[row][col] = ownerVal;
        const stoneId = allocateStoneId(cardState);

        // Track stoneId in map
        if (!cardState.stoneIdMap) cardState.stoneIdMap = Array(8).fill(null).map(() => Array(8).fill(null));
        cardState.stoneIdMap[row][col] = stoneId;

        emitPresentationEvent(cardState, {
            type: 'SPAWN',
            stoneId,
            row,
            col,
            ownerAfter: ownerKey,
            cause: cause || null,
            reason: reason || null,
            meta
        });
        return { stoneId };
    }

    function destroyAt(cardState, gameState, row, col, cause, reason, meta = {}) {
        _ensureCardState(cardState);
        const prev = gameState.board[row][col];
        if (prev === EMPTY) return { destroyed: false };

        let stoneId = null;
        if (cardState.stoneIdMap) {
            stoneId = cardState.stoneIdMap[row][col];
            cardState.stoneIdMap[row][col] = null;
        }

        // clear board
        gameState.board[row][col] = EMPTY;
        // remove markers/specials referring to this cell
        if (Array.isArray(cardState.specialStones)) {
            cardState.specialStones = cardState.specialStones.filter(s => !(s.row === row && s.col === col));
        }
        if (Array.isArray(cardState.bombs)) {
            cardState.bombs = cardState.bombs.filter(b => !(b.row === row && b.col === col));
        }
        emitPresentationEvent(cardState, {
            type: 'DESTROY',
            stoneId,
            row,
            col,
            ownerBefore: (prev === (SharedConstants.BLACK || 1)) ? 'black' : 'white',
            cause: cause || null,
            reason: reason || null,
            meta
        });
        return { destroyed: true };
    }

    function changeAt(cardState, gameState, row, col, ownerAfterKey, cause, reason, meta = {}) {
        _ensureCardState(cardState);
        const prev = gameState.board[row][col];
        const ownerAfterVal = ownerAfterKey === 'black' ? (SharedConstants.BLACK || 1) : (SharedConstants.WHITE || -1);
        if (prev === ownerAfterVal) return { changed: false };

        const stoneId = cardState.stoneIdMap ? cardState.stoneIdMap[row][col] : null;

        gameState.board[row][col] = ownerAfterVal;
        emitPresentationEvent(cardState, {
            type: 'CHANGE',
            stoneId,
            row,
            col,
            ownerBefore: (prev === (SharedConstants.BLACK || 1)) ? 'black' : 'white',
            ownerAfter: ownerAfterKey,
            cause: cause || null,
            reason: reason || null,
            meta
        });
        return { changed: true };
    }

    function moveAt(cardState, gameState, fromRow, fromCol, toRow, toCol, cause, reason, meta = {}) {
        _ensureCardState(cardState);
        const prev = gameState.board[fromRow][fromCol];
        if (prev === EMPTY) return { moved: false };
        // If dest occupied, we consider it invalid for now
        if (gameState.board[toRow][toCol] !== EMPTY) return { moved: false, reason: 'dest_not_empty' };

        const stoneId = cardState.stoneIdMap ? cardState.stoneIdMap[fromRow][fromCol] : null;
        if (cardState.stoneIdMap) {
            cardState.stoneIdMap[fromRow][fromCol] = null;
            cardState.stoneIdMap[toRow][toCol] = stoneId;
        }

        gameState.board[fromRow][fromCol] = EMPTY;
        gameState.board[toRow][toCol] = prev;
        emitPresentationEvent(cardState, {
            type: 'MOVE',
            stoneId,
            row: toRow,
            col: toCol,
            prevRow: fromRow,
            prevCol: fromCol,
            ownerBefore: (prev === (SharedConstants.BLACK || 1)) ? 'black' : 'white',
            ownerAfter: (prev === (SharedConstants.BLACK || 1)) ? 'black' : 'white',
            cause: cause || null,
            reason: reason || null,
            meta
        });
        return { moved: true };
    }

    function setActionContext(cardState, meta) {
        _ensureCardState(cardState);
        cardState._currentActionMeta = meta;
    }

    function clearActionContext(cardState) {
        if (cardState && cardState._currentActionMeta !== undefined) delete cardState._currentActionMeta;
    }

    return {
        spawnAt,
        destroyAt,
        changeAt,
        moveAt,
        allocateStoneId,
        emitPresentationEvent,
        setActionContext,
        clearActionContext
    };
}));