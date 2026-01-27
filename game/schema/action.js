/**
 * @file action.js
 * @description Action Schema for Online/Replay support
 * Generates and validates action objects with required metadata.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ActionSchema = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * @deprecated Numeric actionId generation is removed.
     * Use ActionManager (string actionId) instead.
     */
    let actionIdCounter = 0;

    /**
     * @deprecated Numeric actionId generation is removed.
     * @throws {Error} Always throws to prevent numeric actionId usage.
     */
    function generateActionId() {
        throw new Error('generateActionId is deprecated. Use ActionManager string actionId instead.');
    }

    /**
     * @deprecated Numeric actionId counter is removed.
     */
    function resetActionIdCounter() {
        actionIdCounter = 0;
    }

    /**
     * Create a new action object with required metadata
     * @param {string} type - Action type ('place' | 'pass')
     * @param {string} playerKey - Player key ('black' | 'white')
     * @param {number} turnIndex - Current turn index
     * @param {Object} [payload] - Additional action data (row, col, useCardId, etc.)
     * @returns {Object} Action object
     */
    function createAction(type, playerKey, turnIndex, payload) {
        if (!type || typeof type !== 'string') {
            throw new Error('Action type is required');
        }
        if (!playerKey || (playerKey !== 'black' && playerKey !== 'white')) {
            throw new Error('Invalid playerKey');
        }
        if (typeof turnIndex !== 'number' || turnIndex < 0) {
            throw new Error('Invalid turnIndex');
        }

        const basePayload = payload || {};
        const actionId = basePayload.actionId;
        if (typeof actionId !== 'string' || actionId.length === 0) {
            throw new Error('actionId must be a non-empty string');
        }

        return {
            turnIndex,
            playerKey,
            type,
            ...basePayload,
            actionId
        };
    }

    /**
     * Validate an action object
     * @param {Object} action - Action to validate
     * @returns {{ valid: boolean, errors: string[], normalized: Object|null }}
     */
    function validateAction(action) {
        const errors = [];

        if (!action || typeof action !== 'object') {
            return { valid: false, errors: ['Action must be an object'], normalized: null };
        }

        // Required fields
        if (typeof action.actionId !== 'string' || action.actionId.length === 0) {
            errors.push('actionId must be a non-empty string');
        }
        if (typeof action.turnIndex !== 'number' || action.turnIndex < 0) {
            errors.push('turnIndex must be a non-negative number');
        }
        if (action.playerKey !== 'black' && action.playerKey !== 'white') {
            errors.push('playerKey must be "black" or "white"');
        }
        if (typeof action.type !== 'string') {
            errors.push('type must be a string');
        }

        // Type-specific validation
        if (action.type === 'place') {
            if (typeof action.row !== 'number' || action.row < 0 || action.row > 7) {
                errors.push('row must be 0-7 for place action');
            }
            if (typeof action.col !== 'number' || action.col < 0 || action.col > 7) {
                errors.push('col must be 0-7 for place action');
            }
        }

        if (errors.length > 0) {
            return { valid: false, errors, normalized: null };
        }

        // Normalize: ensure consistent structure
        const normalized = {
            actionId: action.actionId,
            turnIndex: action.turnIndex,
            playerKey: action.playerKey,
            type: action.type
        };

        if (action.type === 'place') {
            normalized.row = action.row;
            normalized.col = action.col;
        }

        // Optional fields
        if (action.useCardId) normalized.useCardId = action.useCardId;
        if (action.destroyTarget) normalized.destroyTarget = action.destroyTarget;
        if (action.temptTarget) normalized.temptTarget = action.temptTarget;
        if (action.inheritTarget) normalized.inheritTarget = action.inheritTarget;

        return { valid: true, errors: [], normalized };
    }

    /**
     * Normalize a raw input action (from UI) to standard format.
     * This should be called before passing to TurnPipeline.
     * 
     * @param {Object} rawAction - Raw action from UI
     * @param {string} playerKey - Current player
     * @param {number} turnIndex - Current turn index
     * @returns {Object} Normalized action with actionId, turnIndex, playerKey
     */
    function normalizeAction(rawAction, playerKey, turnIndex) {
        if (!rawAction || typeof rawAction !== 'object') {
            throw new Error('Invalid action: must be an object');
        }

        if (typeof rawAction.actionId !== 'string' || rawAction.actionId.length === 0) {
            throw new Error('Invalid action: actionId must be a non-empty string');
        }

        const action = {
            actionId: rawAction.actionId,
            turnIndex: rawAction.turnIndex !== undefined ? rawAction.turnIndex : turnIndex,
            playerKey: rawAction.playerKey || playerKey,
            type: rawAction.type
        };

        // Copy type-specific fields
        if (rawAction.type === 'place') {
            action.row = rawAction.row;
            action.col = rawAction.col;
        }

        // Optional fields
        if (rawAction.useCardId) action.useCardId = rawAction.useCardId;
        if (rawAction.destroyTarget) action.destroyTarget = rawAction.destroyTarget;
        if (rawAction.temptTarget) action.temptTarget = rawAction.temptTarget;
        if (rawAction.inheritTarget) action.inheritTarget = rawAction.inheritTarget;
        if (rawAction.swapTarget) action.swapTarget = rawAction.swapTarget;

        return action;
    }

    /**
     * Rejection reason codes (stable enum for protocol)
     */
    const REJECTION_REASONS = {
        ILLEGAL_MOVE: 'ILLEGAL_MOVE',
        CARD_USE_FAILED: 'CARD_USE_FAILED',
        MISSING_REQUIRED_TARGET: 'MISSING_REQUIRED_TARGET',
        UNKNOWN_ACTION_TYPE: 'UNKNOWN_ACTION_TYPE',
        INVALID_ACTION: 'INVALID_ACTION',
        DUPLICATE_ACTION: 'DUPLICATE_ACTION',
        OUT_OF_ORDER: 'OUT_OF_ORDER',
        VERSION_MISMATCH: 'VERSION_MISMATCH',
        UNKNOWN: 'UNKNOWN'
    };

    return {
        createAction,
        validateAction,
        normalizeAction,
        generateActionId,
        resetActionIdCounter,
        REJECTION_REASONS
    };
}));
