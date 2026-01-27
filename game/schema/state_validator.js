/**
 * @file state_validator.js
 * @description Validates game state for consistency and correctness.
 * Used to detect corruption, sync issues, or invalid modifications.
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.StateValidator = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const BOARD_SIZE = 8;
    const VALID_CELL_VALUES = [0, 1, -1]; // EMPTY, BLACK, WHITE
    const MAX_CHARGE = 30;
    const MAX_HAND_SIZE = 5;

    /**
     * Validate game state
     * @param {Object} gameState - Game state object
     * @returns {{ valid: boolean, errors: string[] }}
     */
    function validateGameState(gameState) {
        const errors = [];

        if (!gameState || typeof gameState !== 'object') {
            return { valid: false, errors: ['gameState must be an object'] };
        }

        // Board validation
        if (!Array.isArray(gameState.board)) {
            errors.push('gameState.board must be an array');
        } else {
            if (gameState.board.length !== BOARD_SIZE) {
                errors.push(`Board must have ${BOARD_SIZE} rows, got ${gameState.board.length}`);
            }
            for (let r = 0; r < gameState.board.length; r++) {
                const row = gameState.board[r];
                if (!Array.isArray(row) || row.length !== BOARD_SIZE) {
                    errors.push(`Row ${r} must have ${BOARD_SIZE} columns`);
                } else {
                    for (let c = 0; c < row.length; c++) {
                        if (!VALID_CELL_VALUES.includes(row[c])) {
                            errors.push(`Invalid cell value at (${r},${c}): ${row[c]}`);
                        }
                    }
                }
            }
        }

        // Current player validation
        if (gameState.currentPlayer !== 1 && gameState.currentPlayer !== -1) {
            errors.push(`currentPlayer must be 1 or -1, got ${gameState.currentPlayer}`);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validate card state
     * @param {Object} cardState - Card state object
     * @returns {{ valid: boolean, errors: string[] }}
     */
    function validateCardState(cardState) {
        const errors = [];

        if (!cardState || typeof cardState !== 'object') {
            return { valid: false, errors: ['cardState must be an object'] };
        }

        // Deck validation
        if (!Array.isArray(cardState.deck)) {
            errors.push('cardState.deck must be an array');
        }

        // Hands validation
        if (!cardState.hands || typeof cardState.hands !== 'object') {
            errors.push('cardState.hands must be an object');
        } else {
            for (const player of ['black', 'white']) {
                if (!Array.isArray(cardState.hands[player])) {
                    errors.push(`cardState.hands.${player} must be an array`);
                } else if (cardState.hands[player].length > MAX_HAND_SIZE) {
                    errors.push(`${player} hand exceeds max size: ${cardState.hands[player].length}`);
                }
            }
        }

        // Charge validation
        if (!cardState.charge || typeof cardState.charge !== 'object') {
            errors.push('cardState.charge must be an object');
        } else {
            for (const player of ['black', 'white']) {
                const charge = cardState.charge[player];
                if (typeof charge !== 'number') {
                    errors.push(`cardState.charge.${player} must be a number`);
                } else if (charge < 0 || charge > MAX_CHARGE) {
                    errors.push(`${player} charge out of range: ${charge} (must be 0-${MAX_CHARGE})`);
                }
            }
        }

        // Turn index validation
        if (typeof cardState.turnIndex !== 'number' || cardState.turnIndex < 0) {
            errors.push(`Invalid turnIndex: ${cardState.turnIndex}`);
        }

        // Special stones validation
        if (cardState.specialStones && !Array.isArray(cardState.specialStones)) {
            errors.push('cardState.specialStones must be an array');
        }

        // Bombs validation
        if (cardState.bombs && !Array.isArray(cardState.bombs)) {
            errors.push('cardState.bombs must be an array');
        }

        // Validate marker positions are on board
        if (Array.isArray(cardState.specialStones)) {
            for (const stone of cardState.specialStones) {
                if (stone.row < 0 || stone.row >= BOARD_SIZE || stone.col < 0 || stone.col >= BOARD_SIZE) {
                    errors.push(`specialStone at (${stone.row},${stone.col}) is off-board`);
                }
            }
        }

        if (Array.isArray(cardState.bombs)) {
            for (const bomb of cardState.bombs) {
                if (bomb.row < 0 || bomb.row >= BOARD_SIZE || bomb.col < 0 || bomb.col >= BOARD_SIZE) {
                    errors.push(`bomb at (${bomb.row},${bomb.col}) is off-board`);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validate both game state and card state
     * @param {Object} gameState
     * @param {Object} cardState
     * @returns {{ valid: boolean, errors: string[] }}
     */
    function validateState(gameState, cardState) {
        const gameResult = validateGameState(gameState);
        const cardResult = validateCardState(cardState);

        return {
            valid: gameResult.valid && cardResult.valid,
            errors: [...gameResult.errors, ...cardResult.errors]
        };
    }

    return {
        validateGameState,
        validateCardState,
        validateState,
        BOARD_SIZE,
        MAX_CHARGE,
        MAX_HAND_SIZE
    };
}));
