/**
 * @file tempt.js
 * @description Tempt Will card handlers
 */

async function handleTemptSelection(row, col, playerKey) {
    if (isProcessing || isCardAnimating) return;
    isProcessing = true;
    isCardAnimating = true;

    try {
        const pending = cardState.pendingEffectByPlayer[playerKey];
        if (!pending || pending.type !== 'TEMPT_WILL' || pending.stage !== 'selectTarget') return;

        // Get info of the stone being tempted BEFORE logic clears it or changes it
        const stone = cardState.specialStones.find(s => s.row === row && s.col === col);
        if (!stone) return;
        const effectKey = getEffectKeyForType(stone.type);
        const newColor = playerKey === 'black' ? 1 : -1;

        const res = CardLogic.applyTemptWill(cardState, gameState, playerKey, row, col);
        if (!res || !res.applied) {
            addLog(LOG_MESSAGES.temptSelectPrompt());
            return;
        }

        addLog(LOG_MESSAGES.temptApplied(playerKey === 'black' ? '黒' : '白', posToNotation(row, col)));

        // Visuals are driven by presentationEvents populated by BoardOps/changeAt. UI should
        // perform crossfade animations. Just trigger update hooks here.
        if (typeof emitCardStateChange === 'function') emitCardStateChange();
        if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
        if (typeof emitGameStateChange === 'function') emitGameStateChange();
    } finally {
        isProcessing = false;
        isCardAnimating = false;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { handleTemptSelection };
}
