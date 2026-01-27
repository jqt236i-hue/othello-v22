/**
 * TIME_BOMB effect helper
 * Registers a bomb placed at (row,col) with a remaining turn counter
 */

const CardLogic = require('../cards');

const TIME_BOMB_TURNS = 3;

function applyTimeBomb(cardState, playerKey, row, col) {
    const result = { placed: false };

    CardLogic.addMarker(cardState, 'bomb', row, col, playerKey, {
        remainingTurns: TIME_BOMB_TURNS,
        placedTurn: cardState.turnIndex
    });

    result.placed = true;
    return result;
}

module.exports = { applyTimeBomb, TIME_BOMB_TURNS };
