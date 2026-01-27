/**
 * FREE_PLACEMENT (自由の意志) helper
 * applyFreePlacement(cardState, playerKey)
 * This card doesn't modify board on placement, it only allows placement without flips.
 * The function exists to centralize behavior and allow tests.
 */

function applyFreePlacement(cardState, playerKey) {
    return { applied: true };
}

module.exports = { applyFreePlacement };