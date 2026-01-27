/**
 * @file test-helpers.js
 * @description Common test utilities including mock PRNG
 */

/**
 * Create a mock PRNG for testing
 * @param {number} [seed=0] - Seed value for deterministic behavior
 * @returns {Object} Mock PRNG object
 */
function createMockPrng(seed = 0) {
    let state = seed;

    return {
        random: () => {
            // Simple LCG for deterministic pseudo-random numbers
            state = (state * 1664525 + 1013904223) >>> 0;
            return state / 0xffffffff;
        },
        shuffle: (array) => {
            // Fisher-Yates shuffle with deterministic random
            for (let i = array.length - 1; i > 0; i--) {
                state = (state * 1664525 + 1013904223) >>> 0;
                const j = Math.floor((state / 0xffffffff) * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }
    };
}

/**
 * Create a simple no-op PRNG that doesn't shuffle (for tests that don't care about order)
 * @returns {Object} No-op PRNG object
 */
function createNoopPrng() {
    return {
        random: () => 0,
        shuffle: () => { } // Do nothing
    };
}

module.exports = { createMockPrng, createNoopPrng };
