/**
 * @file multiplier_stone.js
 * @description Shared helper for "next flip reward multiplier" cards (e.g., GOLD_STONE, SILVER_STONE).
 */

function computeMultiplierStoneEffect(flipCount, multiplier) {
    const result = { used: false, chargeDelta: 0 };
    if (flipCount <= 0) return result;
    if (!Number.isFinite(multiplier) || multiplier <= 0) return result;

    result.used = true;
    result.chargeDelta = flipCount * multiplier;
    return result;
}

module.exports = { computeMultiplierStoneEffect };

