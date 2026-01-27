/**
 * @file result.js
 * @description Result Schema for Online/Replay support
 * Handles result structure and state hash computation.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ResultSchema = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Stable JSON stringify with sorted keys
     * Handles special values consistently:
     * - undefined → null (JSON standard)
     * - NaN → null (for consistency)
     * - Infinity/-Infinity → null (for consistency)
     * - Functions → excluded
     * @param {*} obj - Object to stringify
     * @returns {string} Stable JSON string
     */
    function stableStringify(obj) {
        if (obj === null) {
            return 'null';
        }
        if (obj === undefined) {
            return 'null'; // Normalize undefined to null
        }
        if (typeof obj === 'number') {
            if (Number.isNaN(obj) || !Number.isFinite(obj)) {
                return 'null'; // Normalize NaN/Infinity to null
            }
            return JSON.stringify(obj);
        }
        if (typeof obj !== 'object') {
            return JSON.stringify(obj);
        }
        if (Array.isArray(obj)) {
            return '[' + obj.map(stableStringify).join(',') + ']';
        }
        const keys = Object.keys(obj).sort();
        const pairs = keys
            .filter(k => typeof obj[k] !== 'function') // Exclude functions
            .map(k => JSON.stringify(k) + ':' + stableStringify(obj[k]));
        return '{' + pairs.join(',') + '}';
    }

    /**
     * Extract hashable state from gameState and cardState.
     * 
     * === HASH SPECIFICATION ===
     * 
     * INCLUDED (ルール状態 - 再現に必須):
     * - gameState.board (8x8 array)
     * - gameState.currentPlayer
     * - gameState.consecutivePasses
     * - cardState.deck (array)
     * - cardState.discard (array)
     * - cardState.hands.black, cardState.hands.white
     * - cardState.turnIndex
     * - cardState.turnCountByPlayer
     * - cardState.charge.black, cardState.charge.white
     * - cardState.specialStones (array)
     * - cardState.bombs (array)
     * - cardState.markers (array) - if present
     * - cardState.hyperactiveSeqCounter
     * - cardState.extraPlaceRemainingByPlayer
     * - cardState.pendingEffectByPlayer (effect selection state)
     * - cardState.activeEffectsByPlayer
     * - cardState.hasUsedCardThisTurnByPlayer
     * - prngState (if provided)
     * 
     * EXCLUDED (UI一時値 - 再現不要):
     * - gameState.gameOver (derived)
     * - gameState.winner (derived)
     * - cardState.selectedCardId (UI state)
     * - cardState.lastUsedCardByPlayer (display only)
     * - cardState.lastTurnStartedFor (internal tracking)
     * - cardState._nextMarkerId (internal counter)
     * - Any UI-specific fields added later
     * 
     * @param {Object} gameState
     * @param {Object} cardState
     * @param {Object} [prngState] - Optional PRNG state for full reproducibility
     * @returns {Object} Hashable state object
     */
    function extractHashableState(gameState, cardState, prngState) {
        const hashable = {
            // Game state (core)
            board: gameState.board,
            currentPlayer: gameState.currentPlayer,
            consecutivePasses: gameState.consecutivePasses || 0,

            // Card state (core)
            deck: cardState.deck,
            discard: cardState.discard,
            hands: {
                black: cardState.hands.black,
                white: cardState.hands.white
            },
            turnIndex: cardState.turnIndex,
            turnCountByPlayer: cardState.turnCountByPlayer,
            charge: cardState.charge,

            // Effects
            specialStones: cardState.specialStones || [],
            bombs: cardState.bombs || [],
            markers: cardState.markers || [],
            hyperactiveSeqCounter: cardState.hyperactiveSeqCounter || 0,

            // Actions
            extraPlaceRemainingByPlayer: cardState.extraPlaceRemainingByPlayer,
            hasUsedCardThisTurnByPlayer: cardState.hasUsedCardThisTurnByPlayer,
            pendingEffectByPlayer: cardState.pendingEffectByPlayer,
            activeEffectsByPlayer: cardState.activeEffectsByPlayer
        };

        // Optional: include PRNG state for full replay determinism
        if (prngState) {
            hashable.prngState = prngState;
        }

        return hashable;
    }

    /**
     * Compute SHA-256 hash of state (async for browser, sync fallback for Node)
     * @param {Object} state - State object to hash
     * @returns {Promise<string>} Hex hash string
     */
    async function computeStateHash(state) {
        const json = stableStringify(state);
        const encoder = new TextEncoder();
        const data = encoder.encode(json);

        // Browser: use crypto.subtle
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        // Node.js: use crypto module
        if (typeof require !== 'undefined') {
            try {
                const cryptoModule = require('crypto');
                return cryptoModule.createHash('sha256').update(json).digest('hex');
            } catch (e) {
                // SHA-256 unavailable
                throw new Error('HASH_UNAVAILABLE: SHA-256 not available in this environment');
            }
        }

        // No SHA-256 available in browser either -> protocol requires SHA-256
        throw new Error('HASH_UNAVAILABLE: SHA-256 not available in this environment');
    }

    /**
     * Compute SHA-256 hash synchronously (Node.js only)
     * @param {Object} state - State object to hash
     * @returns {string} Hex hash string
     */
    function computeStateHashSync(state) {
        const json = stableStringify(state);

        // Node.js: use crypto module
        if (typeof require !== 'undefined') {
            try {
                const cryptoModule = require('crypto');
                return cryptoModule.createHash('sha256').update(json).digest('hex');
            } catch (e) {
                throw new Error('HASH_UNAVAILABLE: SHA-256 not available in this environment');
            }
        }

        // No SHA-256 available -> protocol requires SHA-256
        throw new Error('HASH_UNAVAILABLE: SHA-256 not available in this environment');
    }

    /**
     * Create a result object
     * @param {boolean} ok - Whether the action succeeded
     * @param {Object} options - Result options
     * @param {Object} options.gameState - New game state
     * @param {Object} options.cardState - New card state
     * @param {Array} options.events - Event log
     * @param {number} options.nextStateVersion - Next state version
     * @param {string} [options.stateHash] - State hash (optional)
     * @param {string} [options.rejectedReason] - Rejection reason if failed
     * @param {string} [options.errorMessage] - Error message if failed
     * @returns {Object} Result object
     */
    function createResult(ok, options) {
        const result = {
            ok,
            gameState: options.gameState,
            cardState: options.cardState,
            events: options.events || [],
            nextStateVersion: options.nextStateVersion
        };

        if (options.stateHash) {
            result.stateHash = options.stateHash;
        }

        if (!ok) {
            result.rejectedReason = options.rejectedReason || 'UNKNOWN';
            if (options.errorMessage) {
                result.errorMessage = options.errorMessage;
            }
        }

        return result;
    }

    /**
     * Version manager for state versioning
     */
    const VersionManager = {
        _version: 0,

        /**
         * Get current version
         * @returns {number}
         */
        getVersion() {
            return this._version;
        },

        /**
         * Increment version (call on successful action)
         * @returns {number} New version
         */
        increment() {
            return ++this._version;
        },

        /**
         * Reset version (for new game)
         */
        reset() {
            this._version = 0;
        },

        /**
         * Set version (for replay/reconnect)
         * @param {number} version
         */
        setVersion(version) {
            this._version = version;
        }
    };

    return {
        stableStringify,
        extractHashableState,
        computeStateHash,
        computeStateHashSync,
        createResult,
        VersionManager
    };
}));
