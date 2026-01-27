/**
 * PROTECTED_NEXT_STONE (弱い意志)
 * Adds a temporary protected marker to the placed stone that expires on owner's next turn start.
 */

const CardLogic = require('../cards');

function applyProtectedNextStone(cardState, playerKey, row, col) {
    const result = { applied: false };

    CardLogic.addMarker(cardState, 'specialStone', row, col, playerKey, {
        type: 'PROTECTED',
        expiresForPlayer: playerKey
    });

    result.applied = true;
    return result;
}

module.exports = { applyProtectedNextStone };
