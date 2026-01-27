/**
 * PERMA_PROTECT_NEXT_STONE (強い意志)
 * Adds a permanent protection marker to the placed stone.
 */

const CardLogic = require('../cards');

function applyPermaProtectNextStone(cardState, playerKey, row, col) {
    const result = { applied: false };

    CardLogic.addMarker(cardState, 'specialStone', row, col, playerKey, {
        type: 'PERMA_PROTECTED'
    });

    result.applied = true;
    return result;
}

module.exports = { applyPermaProtectNextStone };
