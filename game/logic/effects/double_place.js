/**
 * DOUBLE_PLACE effect
 * Grants extra place remaining counter for the owner
 */

function applyDoublePlace(cardState, playerKey) {
    const result = { activated: false };
    cardState.extraPlaceRemainingByPlayer = cardState.extraPlaceRemainingByPlayer || {};
    cardState.extraPlaceRemainingByPlayer[playerKey] = (cardState.extraPlaceRemainingByPlayer[playerKey] || 0) + 1;
    result.activated = true;
    return result;
}

module.exports = { applyDoublePlace };
