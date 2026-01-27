/**
 * PLUNDER_WILL (吸収の意志)
 * Transfers up to flipCount charge from opponent to player
 */

function applyPlunderWill(cardState, playerKey, flipCount) {
    const result = { plundered: 0 };
    const opponentKey = playerKey === 'black' ? 'white' : 'black';
    const stolen = Math.min(flipCount, cardState.charge[opponentKey] || 0);
    cardState.charge[opponentKey] = (cardState.charge[opponentKey] || 0) - stolen;
    cardState.charge[playerKey] = Math.min(30, (cardState.charge[playerKey] || 0) + stolen);
    result.plundered = stolen;
    return result;
}

module.exports = { applyPlunderWill };
