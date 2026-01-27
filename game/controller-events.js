// ===== Controller Event Helpers =====

/**
 * Emit a game event with optional fallback handlers
 * @param {string} eventType - The event type (from GameEvents.EVENT_TYPES)
 * @param {Array<Function>} fallbackHandlers - Functions to call if event system is unavailable
 */
function emitGameEvent(eventType, fallbackHandlers = []) {
    if (typeof GameEvents !== 'undefined' && GameEvents.gameEvents && eventType) {
        GameEvents.gameEvents.emit(eventType);
    } else {
        // Fallback: call provided handler functions if event system is unavailable
        fallbackHandlers.forEach(handler => {
            if (typeof handler === 'function') handler();
        });
    }
}

function emitBoardUpdate() {
    const eventType = (typeof GameEvents !== 'undefined' && GameEvents.EVENT_TYPES)
        ? GameEvents.EVENT_TYPES.BOARD_UPDATED
        : null;
    emitGameEvent(eventType, [
        () => { if (typeof renderBoard === 'function') renderBoard(); }
    ]);
}

function emitGameStateChange() {
    const eventType = (typeof GameEvents !== 'undefined' && GameEvents.EVENT_TYPES)
        ? GameEvents.EVENT_TYPES.GAME_STATE_CHANGED
        : null;
    emitGameEvent(eventType, [
        () => { if (typeof renderBoard === 'function') renderBoard(); },
        () => { if (typeof updateStatus === 'function') updateStatus(); }
    ]);
}

function emitCardStateChange() {
    const eventType = (typeof GameEvents !== 'undefined' && GameEvents.EVENT_TYPES)
        ? GameEvents.EVENT_TYPES.CARD_STATE_CHANGED
        : null;
    emitGameEvent(eventType, [
        () => { if (typeof renderCardUI === 'function') renderCardUI(); }
    ]);
}
