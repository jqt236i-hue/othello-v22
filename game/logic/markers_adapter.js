/**
 * @file markers_adapter.js
 * @description Adapter layer for transitioning from specialStones/bombs to unified markers[].
 * Provides bidirectional conversion during the migration period.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MarkersAdapter = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Marker kinds
     */
    const MARKER_KINDS = {
        SPECIAL_STONE: 'specialStone',
        BOMB: 'bomb'
    };

    /**
     * Create a marker from a special stone
     * @param {Object} stone - Special stone object
     * @param {number} id - Unique marker ID
     * @returns {Object} Marker object
     */
    function fromSpecialStone(stone, id) {
        return {
            id,
            row: stone.row,
            col: stone.col,
            kind: MARKER_KINDS.SPECIAL_STONE,
            owner: stone.owner,
            data: {
                type: stone.type,
                remainingOwnerTurns: stone.remainingOwnerTurns,
                expiresForPlayer: stone.expiresForPlayer,
                autoRemove: stone.autoRemove,
                hyperactiveSeq: stone.hyperactiveSeq,
                regenRemaining: stone.regenRemaining,
                ownerColor: stone.ownerColor,
                chainPriority: stone.chainPriority
            }
        };
    }

    /**
     * Create a marker from a bomb
     * @param {Object} bomb - Bomb object
     * @param {number} id - Unique marker ID
     * @returns {Object} Marker object
     */
    function fromBomb(bomb, id) {
        return {
            id,
            row: bomb.row,
            col: bomb.col,
            kind: MARKER_KINDS.BOMB,
            owner: bomb.owner,
            data: {
                remainingTurns: bomb.remainingTurns,
                placedTurn: bomb.placedTurn
            }
        };
    }

    /**
     * Convert marker back to special stone format
     * @param {Object} marker
     * @returns {Object|null} Special stone or null if not a special stone marker
     */
    function toSpecialStone(marker) {
        if (marker.kind !== MARKER_KINDS.SPECIAL_STONE) return null;

        return {
            row: marker.row,
            col: marker.col,
            type: marker.data.type,
            owner: marker.owner,
            remainingOwnerTurns: marker.data.remainingOwnerTurns,
            expiresForPlayer: marker.data.expiresForPlayer,
            autoRemove: marker.data.autoRemove,
            hyperactiveSeq: marker.data.hyperactiveSeq,
            regenRemaining: marker.data.regenRemaining,
            ownerColor: marker.data.ownerColor,
            chainPriority: marker.data.chainPriority
        };
    }

    /**
     * Convert marker back to bomb format
     * @param {Object} marker
     * @returns {Object|null} Bomb or null if not a bomb marker
     */
    function toBomb(marker) {
        if (marker.kind !== MARKER_KINDS.BOMB) return null;

        return {
            row: marker.row,
            col: marker.col,
            remainingTurns: marker.data.remainingTurns,
            owner: marker.owner,
            placedTurn: marker.data.placedTurn
        };
    }

    /**
     * Convert markers array back to specialStones array
     * @param {Array} markers
     * @returns {Array} specialStones array
     */
    function markersToSpecialStones(markers) {
        return markers
            .filter(m => m.kind === MARKER_KINDS.SPECIAL_STONE)
            .map(toSpecialStone);
    }

    /**
     * Convert markers array back to bombs array
     * @param {Array} markers
     * @returns {Array} bombs array
     */
    function markersToBombs(markers) {
        return markers
            .filter(m => m.kind === MARKER_KINDS.BOMB)
            .map(toBomb);
    }

    /**
     * Convert specialStones and bombs to unified markers
     * @param {Array} specialStones
     * @param {Array} bombs
     * @param {number} [startId=1] - Starting ID for markers
     * @returns {{ markers: Array, nextId: number }}
     */
    function toMarkers(specialStones, bombs, startId = 1) {
        let id = startId;
        const markers = [];

        for (const stone of (specialStones || [])) {
            markers.push(fromSpecialStone(stone, id++));
        }

        for (const bomb of (bombs || [])) {
            markers.push(fromBomb(bomb, id++));
        }

        return { markers, nextId: id };
    }

    /**
     * Sync markers to legacy arrays (for backward compatibility)
     * @param {Object} cardState - Card state with markers, specialStones, bombs
     */
    function syncMarkersToLegacy(cardState) {
        if (!cardState.markers) return;
        cardState.specialStones = markersToSpecialStones(cardState.markers);
        cardState.bombs = markersToBombs(cardState.markers);
    }

    /**
     * Sync legacy arrays to markers (for migration)
     * @param {Object} cardState - Card state with specialStones, bombs
     */
    function syncLegacyToMarkers(cardState) {
        const result = toMarkers(
            cardState.specialStones,
            cardState.bombs,
            cardState._nextMarkerId || 1
        );
        cardState.markers = result.markers;
        cardState._nextMarkerId = result.nextId;
    }

    return {
        MARKER_KINDS,
        fromSpecialStone,
        fromBomb,
        toSpecialStone,
        toBomb,
        markersToSpecialStones,
        markersToBombs,
        toMarkers,
        syncMarkersToLegacy,
        syncLegacyToMarkers
    };
}));
