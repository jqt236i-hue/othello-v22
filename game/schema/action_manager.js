/**
 * @file action_manager.js
 * @description ActionManager for actionId generation, tracking, and replay support.
 * Manages the lifecycle of actions from generation to storage.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ActionManager = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Action ID generator and time provider are injectable to avoid Date.now/Math.random calls
     * in the rule layer. By default we use a deterministic local counter-based generator
     * (format: local-<counter>) and no time provider (timestamps are null) to preserve
     * determinism and avoid environment-specific values.
     */
    let _actionIdCounter = 0;
    let _actionIdGenerator = () => `local-${++_actionIdCounter}`;
    function setActionIdGenerator(fn) { if (typeof fn === 'function') _actionIdGenerator = fn; }

    let _timeProvider = null;
    function setTimeProvider(tp) { _timeProvider = tp && typeof tp.now === 'function' ? tp : null; }

    function generateActionId() {
        return _actionIdGenerator();
    }

    /**
     * ActionManager - tracks actions for replay
     */
    const ActionManager = {
        _actions: [],
        _currentTurnIndex: 0,
        _storageKey: 'othello_action_log',

        /**
         * Reset action log (new game)
         */
        reset() {
            this._actions = [];
            this._currentTurnIndex = 0;
        },

        /**
         * Get current turn index
         * @returns {number}
         */
        getTurnIndex() {
            return this._currentTurnIndex;
        },

        /**
         * Increment turn index (after successful action)
         */
        incrementTurnIndex() {
            this._currentTurnIndex++;
        },

        /**
         * Create a new action with required fields
         * @param {string} type - 'place' | 'pass' | 'use_card' | etc.
         * @param {string} playerKey - 'black' | 'white'
         * @param {Object} [data] - Additional action data (row, col, cardId, target, etc.)
         * @returns {Object} Action with actionId, turnIndex, playerKey, type, and data
         */
        createAction(type, playerKey, data) {
            const action = {
                actionId: generateActionId(),
                turnIndex: this._currentTurnIndex,
                playerKey,
                type,
                timestamp: (_timeProvider ? _timeProvider.now() : null),
                ...data
            };
            return action;
        },

        /**
         * Record an action (after it succeeds)
         * - persist to storage immediately for reliability across reloads
         * @param {Object} action - The action to record
         */
        recordAction(action) {
            const entry = {
                ...action,
                recordedAt: (_timeProvider ? _timeProvider.now() : null),
                acknowledged: false
            };
            this._actions.push(entry);
            // Keep history reasonably bounded to avoid localStorage exhaustion
            if (typeof this._maxHistory === 'number' && this._actions.length > this._maxHistory) {
                this._actions = this._actions.slice(-this._maxHistory);
            }
            // Persist immediately
            try { this.saveToStorage(); } catch (e) { /* swallow save errors */ }
        },

        /**
         * Get all recorded actions
         * @returns {Array}
         */
        getActions() {
            return [...this._actions];
        },

        /**
         * Get recent action ids (most recent first)
         * @param {number} [limit]
         * @returns {Array<string>}
         */
        getRecentActionIds(limit) {
            const ids = this._actions.map(a => a.actionId).filter(Boolean).reverse();
            return typeof limit === 'number' ? ids.slice(0, limit) : ids;
        },

        /**
         * Get unacknowledged actions (for server sync)
         * @returns {Array}
         */
        getUnacknowledgedActions() {
            return this._actions.filter(a => !a.acknowledged).map(a => ({ ...a }));
        },

        /**
         * Mark an action as acknowledged by server
         * @param {string} actionId
         */
        acknowledgeAction(actionId) {
            let changed = false;
            for (const a of this._actions) {
                if (a.actionId === actionId) {
                    a.acknowledged = true;
                    changed = true;
                }
            }
            if (changed) {
                try { this.saveToStorage(); } catch (e) { /* ignore */ }
            }
            return changed;
        },

        /**
         * Prune acknowledged actions older than keepRecent (keep number of most recent actions)
         * @param {number} keepRecent
         */
        pruneAcknowledged(keepRecent) {
            if (typeof keepRecent !== 'number') return;
            const recent = this._actions.slice(-keepRecent);
            this._actions = recent.concat(this._actions.slice(-keepRecent).filter(a => !a.acknowledged));
            try { this.saveToStorage(); } catch (e) { /* ignore */ }
        },

        /**
         * Reconcile local actions with server-known actionIds.
         * Marks locally-known actions that the server already has as acknowledged and
         * returns the local actions that are missing on the server (to be uploaded).
         * @param {Array<string>} serverActionIds
         * @returns {Array} local actions missing on server
         */
        reconcileWithServer(serverActionIds) {
            if (!Array.isArray(serverActionIds)) serverActionIds = [];
            const missing = [];
            for (const a of this._actions) {
                if (serverActionIds.includes(a.actionId)) {
                    a.acknowledged = true;
                } else {
                    missing.push({ ...a });
                }
            }
            try { this.saveToStorage(); } catch (e) { /* ignore */ }
            return missing;
        },


        /**
         * Get actions for export (minimal format for replay)
         * @returns {Array}
         */
        exportActions() {
            return this._actions.map(a => ({
                actionId: a.actionId,
                turnIndex: a.turnIndex,
                playerKey: a.playerKey,
                type: a.type,
                row: a.row,
                col: a.col,
                useCardId: a.useCardId,
                destroyTarget: a.destroyTarget,
                swapTarget: a.swapTarget,
                inheritTarget: a.inheritTarget,
                temptTarget: a.temptTarget
            }));
        },

        /**
         * Export actions as JSON string (minimal replay-facing format)
         * @returns {string}
         */
        exportAsJSON() {
            return JSON.stringify(this.exportActions(), null, 2);
        },

        /**
         * Import actions from array (for replay)
         * @param {Array} actions
         */
        importActions(actions) {
            this._actions = actions.map(a => ({
                ...a,
                importedAt: (_timeProvider ? _timeProvider.now() : null),
                acknowledged: !!a.acknowledged
            }));
            if (actions.length > 0) {
                const maxTurnIndex = Math.max(...actions.map(a => a.turnIndex || 0));
                this._currentTurnIndex = maxTurnIndex + 1;
            }
        },

        /**
         * Save actions to localStorage (if available)
         * Stores full internal actions (includes acknowledged/timestamp)
         */
        saveToStorage() {
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.setItem(this._storageKey, JSON.stringify({ actions: this._actions, _maxHistory: this._maxHistory }, null, 2));
                    return true;
                } catch (e) {
                    console.warn('[ActionManager] Failed to save to localStorage:', e);
                    return false;
                }
            }
            return false;
        },

        /**
         * Load actions from localStorage (if available)
         * Supports older format (array) and new format ({actions, _maxHistory})
         * @returns {boolean} true if loaded successfully
         */
        loadFromStorage() {
            if (typeof localStorage !== 'undefined') {
                try {
                    const data = localStorage.getItem(this._storageKey);
                    if (data) {
                        const parsed = JSON.parse(data);
                        if (Array.isArray(parsed)) {
                            // Old format: array of minimal actions
                            this.importActions(parsed);
                        } else if (parsed && Array.isArray(parsed.actions)) {
                            this._actions = parsed.actions.map(a => ({ ...a }));
                            if (typeof parsed._maxHistory === 'number') this._maxHistory = parsed._maxHistory;
                            if (this._actions.length > 0) {
                                const maxTurnIndex = Math.max(...this._actions.map(a => a.turnIndex || 0));
                                this._currentTurnIndex = maxTurnIndex + 1;
                            }
                        }
                        return true;
                    }
                } catch (e) {
                    console.warn('[ActionManager] Failed to load from localStorage:', e);
                }
            }
            return false;
        },

        /**
         * Clear saved actions from storage
         */
        clearStorage() {
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.removeItem(this._storageKey);
                } catch (e) {
                    // Ignore
                }
            }
        },

        /**
         * Get action count
         * @returns {number}
         */
        getActionCount() {
            return this._actions.length;
        },

        /**
         * Get last action
         * @returns {Object|null}
         */
        getLastAction() {
            return this._actions.length > 0
                ? this._actions[this._actions.length - 1]
                : null;
        }
    };

    // Defaults and initialization
    ActionManager._maxHistory = 200;

    /**
     * Set maximum saved action history to retain in memory/storage
     * @param {number} n
     */
    ActionManager.setMaxHistory = function (n) {
        if (typeof n === 'number' && n > 0) {
            this._maxHistory = n;
            if (this._actions.length > n) this._actions = this._actions.slice(-n);
            try { this.saveToStorage(); } catch (e) { /* ignore */ }
        }
    };

    // Attempt to restore previously-saved actions on load
    try {
        ActionManager.loadFromStorage();
        if (ActionManager.getActionCount() > 0) console.log('[ActionManager] Restored', ActionManager.getActionCount(), 'actions from storage');
    } catch (e) {
        // Ignore failures during module init
    }

    return {
        generateActionId,
        ActionManager,
        // Injectable hooks for environments/online server
        setActionIdGenerator,
        setTimeProvider
    };
}));
