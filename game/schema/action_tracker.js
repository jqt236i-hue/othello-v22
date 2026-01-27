/**
 * @file action_tracker.js
 * @description Tracks applied actions to prevent duplicates and ensure ordering.
 * Used for online play to detect replay attacks and out-of-order actions.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ActionTracker = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Create a new action tracker
     * @returns {Object} ActionTracker instance
     */
    function createActionTracker() {
        return {
            _appliedActionIds: new Set(),
            _lastAppliedTurnIndex: -1,
            _lastAppliedActionId: null,

            /**
             * Check if an action can be applied (not duplicate, in order)
             * @param {Object} action - Action to check
             * @returns {{ canApply: boolean, reason?: string }}
             */
            canApply: function (action) {
                if (!action || typeof action !== 'object') {
                    return { canApply: false, reason: 'INVALID_ACTION' };
                }

                // Check for duplicate actionId
                if (action.actionId !== undefined && this._appliedActionIds.has(action.actionId)) {
                    return { canApply: false, reason: 'DUPLICATE_ACTION' };
                }

                // Check for out-of-order turnIndex
                if (action.turnIndex !== undefined && action.turnIndex < this._lastAppliedTurnIndex) {
                    return { canApply: false, reason: 'OUT_OF_ORDER' };
                }

                return { canApply: true };
            },

            /**
             * Record that an action was applied
             * @param {Object} action - Applied action
             */
            recordApplied: function (action) {
                if (action.actionId !== undefined) {
                    this._appliedActionIds.add(action.actionId);
                    this._lastAppliedActionId = action.actionId;
                }
                if (action.turnIndex !== undefined) {
                    this._lastAppliedTurnIndex = action.turnIndex;
                }
            },

            /**
             * Get tracker state for serialization
             * @returns {Object}
             */
            getState: function () {
                return {
                    appliedActionIds: Array.from(this._appliedActionIds),
                    lastAppliedTurnIndex: this._lastAppliedTurnIndex,
                    lastAppliedActionId: this._lastAppliedActionId
                };
            },

            /**
             * Restore tracker from saved state
             * @param {Object} savedState
             */
            restoreState: function (savedState) {
                this._appliedActionIds = new Set(savedState.appliedActionIds || []);
                this._lastAppliedTurnIndex = savedState.lastAppliedTurnIndex || -1;
                this._lastAppliedActionId = savedState.lastAppliedActionId || null;
            },

            /**
             * Reset tracker (for new game)
             */
            reset: function () {
                this._appliedActionIds.clear();
                this._lastAppliedTurnIndex = -1;
                this._lastAppliedActionId = null;
            },

            /**
             * Get last applied action ID
             * @returns {number|null}
             */
            getLastActionId: function () {
                return this._lastAppliedActionId;
            },

            /**
             * Get last applied turn index
             * @returns {number}
             */
            getLastTurnIndex: function () {
                return this._lastAppliedTurnIndex;
            }
        };
    }

    /**
     * Create tracker from saved state
     * @param {Object} savedState
     * @returns {Object} ActionTracker instance
     */
    function fromState(savedState) {
        const tracker = createActionTracker();
        tracker.restoreState(savedState);
        return tracker;
    }

    return {
        createActionTracker,
        fromState
    };
}));
