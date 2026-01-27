/**
 * STEAL_CARD (略奪の意志)
 * Steals up to flipCount cards from opponent's hand into player's hand.
 */

function applyStealCard(cardState, playerKey, flipCount) {
    const result = { stolenCount: 0, stolenCards: [] };
    const opponentKey = playerKey === 'black' ? 'white' : 'black';
    const available = cardState.hands[opponentKey] || [];
    const maxSteal = Math.min(flipCount, available.length, (cardState.maxHandSize || 5) - (cardState.hands[playerKey] || []).length);
    if (maxSteal > 0) {
        const stolen = available.splice(0, maxSteal);
        cardState.hands[playerKey] = (cardState.hands[playerKey] || []).concat(stolen);
        result.stolenCards = stolen;
        result.stolenCount = stolen.length;
    }
    return result;
}

module.exports = { applyStealCard };
