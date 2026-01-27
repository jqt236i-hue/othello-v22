/**
 * Gold stone effect helper (pure)
 * - Computes charge delta only; does not mutate cardState.
 */

const { computeMultiplierStoneEffect } = require('./multiplier_stone');

function applyGoldStoneEffect(flipCount) {
    const res = computeMultiplierStoneEffect(flipCount, 4);
    return { goldUsed: res.used, chargeDelta: res.chargeDelta };
}

module.exports = { applyGoldStoneEffect };
