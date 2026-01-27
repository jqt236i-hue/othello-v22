/**
 * Silver stone effect helper (pure)
 * - Computes charge delta only; does not mutate cardState.
 */

const { computeMultiplierStoneEffect } = require('./multiplier_stone');

function applySilverStoneEffect(flipCount) {
    const res = computeMultiplierStoneEffect(flipCount, 3);
    return { silverUsed: res.used, chargeDelta: res.chargeDelta };
}

module.exports = { applySilverStoneEffect };
