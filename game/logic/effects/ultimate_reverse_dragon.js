/**
 * ULTIMATE_REVERSE_DRAGON placement helper
 * applyUltimateDragon(cardState, playerKey, row, col)
 */

const CardLogic = require('../cards');

function applyUltimateDragon(cardState, playerKey, row, col) {
    const result = { placed: false };
    const ULTIMATE_DRAGON_TURNS = 5;

    CardLogic.addMarker(cardState, 'specialStone', row, col, playerKey, {
        type: 'DRAGON',
        remainingOwnerTurns: ULTIMATE_DRAGON_TURNS
    });

    result.placed = true;
    return result;
}

module.exports = { applyUltimateDragon };
