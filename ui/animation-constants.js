/**
 * @file animation-constants.js
 * @description Centralized timing and geometric constants for the Playback Engine.
 * Aligns with 03-visual-rulebook.v2.txt.
 */

const AnimationConstants = {
    // Timing (ms)
    FLIP_MS: 600,
    PHASE_GAP_MS: 200,
    TURN_TRANSITION_GAP_MS: 200,
    FADE_IN_MS: 300,
    FADE_OUT_MS: 300,
    OVERLAY_CROSSFADE_MS: 600,
    MOVE_MS: 300,

    // Geometry
    OVERLAY_SIZE_PERCENT: 82, // Percentage of the base disc size

    // Core Enums
    EVENT_TYPES: {
        PLACE: 'place',
        FLIP: 'flip',
        DESTROY: 'destroy',
        SPAWN: 'spawn',
        MOVE: 'move',
        STATUS_APPLIED: 'status_applied',
        STATUS_REMOVED: 'status_removed',
        HAND_ADD: 'hand_add',
        HAND_REMOVE: 'hand_remove',
        LOG: 'log'
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnimationConstants;
} else {
    window.AnimationConstants = AnimationConstants;
}
