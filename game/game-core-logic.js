// game-core-logic.js
// Wrapper for CoreLogic (Shared between Browser and Headless)
// This file maintains the legacy global function interface for browser compatibility.

// Check if CoreLogic is loaded
if (typeof CoreLogic === 'undefined') {
    console.error('CoreLogic is not loaded. Please include game/logic/core.js');
}

// ===== Game State Management =====

function createGameState() {
    return CoreLogic.createGameState();
}

function copyGameState(state) {
    return CoreLogic.copyGameState(state);
}

// ===== Move Logic =====

// Legacy signature support: splits context params into arguments and global lookups
function getFlips(state, row, col, player, protectedStones, permaProtectedStones) {
    let context;
    if (typeof CardLogic !== 'undefined' && typeof cardState !== 'undefined') {
        context = CardLogic.getCardContext(cardState);
    } else {
        context = {
            protectedStones: protectedStones || [],
            permaProtectedStones: permaProtectedStones || [],
            bombs: (typeof cardState !== 'undefined' && cardState.bombs) ? cardState.bombs : []
        };
    }
    return CoreLogic.getFlipsWithContext(state, row, col, player, context);
}

function applyMove(state, move) {
    return CoreLogic.applyMove(state, move);
}

function applyPass(state) {
    const newState = CoreLogic.applyPass(state);

    // Maintain logging side-effect
    if (typeof isDebugLogAvailable === 'function' && isDebugLogAvailable()) {
        debugLog(`[MOVE] Pass applied`, 'debug', {
            passedPlayer: state.currentPlayer === 1 ? 'black' : 'white',
            nextPlayer: newState.currentPlayer === 1 ? 'black' : 'white',
            consecutivePasses: newState.consecutivePasses
        });
    }

    return newState;
}

function isGameOver(state) {
    return CoreLogic.isGameOver(state);
}

function countDiscs(state) {
    return CoreLogic.countDiscs(state);
}
