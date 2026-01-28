// ===== Card UI State & Interaction (Refactored to use CardLogic) =====

if (typeof CardLogic === 'undefined') {
    console.error('CardLogic is not loaded. Please include game/logic/cards.js');
}

// Note: Debug mode flags are stored on window object:
// - window.DEBUG_HUMAN_VS_HUMAN: HvH mode enabled
// - window.DEBUG_UNLIMITED_USAGE: Unlimited card usage mode

// Fill hand with all card types for debug testing
function fillDebugHand() {
    if (!window.DEBUG_HUMAN_VS_HUMAN && !window.DEBUG_UNLIMITED_USAGE) return;
    // Add one card of each type (one of each unique card type)
    const typeMap = {};
    for (const card of CARD_DEFS) {
        if (!typeMap[card.type]) {
            typeMap[card.type] = card.id;
        }
    }
    // Add to black's hand if not already there
    for (const cardId of Object.values(typeMap)) {
        if (!cardState.hands.black.includes(cardId)) {
            cardState.hands.black.push(cardId);
        }
    }
    addLog('🐛 デバッグ: 全種類のカードを手札に追加');
}

function updateCardDetailPanel() {
    const nameEl = document.getElementById('card-detail-name');
    const descEl = document.getElementById('card-detail-desc');
    const useBtn = document.getElementById('use-card-btn');
    const reasonEl = document.getElementById('use-card-reason');
    const cancelBtn = document.getElementById('cancel-card-btn');

    if (!nameEl || !descEl || !useBtn || !reasonEl) return;

    const selectedId = cardState.selectedCardId;

    if (selectedId) {
        const cardDef = CardLogic.getCardDef(selectedId);
        nameEl.textContent = cardDef ? cardDef.name : '?';
        descEl.textContent = cardDef && cardDef.desc ? cardDef.desc : '効果はPhase3で実装';
    } else {
        nameEl.textContent = '-';
        descEl.textContent = 'カードを選択してください';
    }

    // Determine if use button should be enabled
    const isDebugHvH = window.DEBUG_HUMAN_VS_HUMAN === true;
    const playerKey = isDebugHvH ? (gameState.currentPlayer === BLACK ? 'black' : 'white') : 'black';
    const isBlackTurn = gameState.currentPlayer === BLACK;
    const isDebugUnlimited = window.DEBUG_UNLIMITED_USAGE === true || isDebugHvH;
    const hasSelection = selectedId !== null;
    // 毎ターン1回使用可能（毎ターン開始時にリセット）、ただしデバッグモードでは制限なし
    const hasNotUsedThisTurn = isDebugUnlimited ? true : !cardState.hasUsedCardThisTurnByPlayer[playerKey];
    const canInteract = !isProcessing && !isCardAnimating;

    // Check charge (デバッグモードでは無視)
    const cardDef = selectedId ? CardLogic.getCardDef(selectedId) : null;
    const cost = cardDef ? (cardDef.cost || 0) : 0;
    const canAfford = isDebugUnlimited ? true : (cardState.charge[playerKey] || 0) >= cost;

    let canUse = (isBlackTurn || isDebugHvH) && hasSelection && hasNotUsedThisTurn && canInteract && canAfford;
    let reason = '';

    if (!hasSelection) {
        reason = '';
    } else if (!isBlackTurn && !isDebugHvH) {
        reason = '自分のターンではありません';
        canUse = false;
    } else if (!hasNotUsedThisTurn) {
        reason = 'このターンは既に使用済み';
        canUse = false;
        // Diagnostic: unexpected same-turn block
        try { console.warn('[CARD_UI] USE DISABLED - already used this turn', { selectedId, hasUsedThisTurn: cardState.hasUsedCardThisTurnByPlayer && cardState.hasUsedCardThisTurnByPlayer[playerKey], playerKey, gameStateCurrentPlayer: gameState && gameState.currentPlayer }); } catch (e) {}
    } else if (!canAfford) {
        reason = '';
        canUse = false;
    } else if (!canInteract) {
        reason = '演出中...';
        canUse = false;
    }

    useBtn.disabled = !canUse;

    if (hasSelection && !canAfford) {
        useBtn.textContent = '布石不足';
        // Diagnostic: log situations where UI shows charge but button disabled unexpectedly
        try {
            const chargeVal = (cardState && cardState.charge) ? cardState.charge[playerKey] : undefined;
            if (typeof chargeVal === 'number' && typeof cost === 'number' && chargeVal >= cost) {
                console.warn('[CARD_UI] USE DISABLED despite sufficient charge', { selectedId, cardId: selectedId, cost, charge: chargeVal, hasUsedThisTurn: cardState.hasUsedCardThisTurnByPlayer && cardState.hasUsedCardThisTurnByPlayer[playerKey], isProcessing: !!isProcessing, isCardAnimating: !!isCardAnimating, currentPlayer: gameState && gameState.currentPlayer });
            }
        } catch (e) { /* ignore */ }
    } else {
        useBtn.textContent = '使用';
    }

    reasonEl.textContent = reason;

    // 選択モード用のキャンセルボタン表示制御
    const pending = cardState.pendingEffectByPlayer[playerKey];
    const selecting = pending && pending.stage === 'selectTarget' &&
        (pending.type === 'DESTROY_ONE_STONE' || pending.type === 'INHERIT_WILL');
    if (cancelBtn) {
        cancelBtn.style.display = selecting ? 'block' : 'none';
        // Add specific listener for HvH mode to ensure it uses the correct context
        cancelBtn.onclick = () => cancelPendingSelection(playerKey);
    }
    if (selecting) {
        reasonEl.textContent = pending.type === 'INHERIT_WILL'
            ? '対象の通常石を選んでください（キャンセル可）'
            : '破壊対象を選んでください（キャンセル可）';
    }
}

function onCardClick(cardId) {
    if (isCardAnimating) return;
    const isDebugHvH = window.DEBUG_HUMAN_VS_HUMAN === true;
    if (gameState.currentPlayer !== BLACK && !isDebugHvH) return;

    if (cardState.selectedCardId === cardId) {
        cardState.selectedCardId = null;
    } else {
        cardState.selectedCardId = cardId;
    }

    renderCardUI();
}

function useSelectedCard() {
    if (isProcessing || isCardAnimating) return;
    const isDebugHvH = window.DEBUG_HUMAN_VS_HUMAN === true;
    if (gameState.currentPlayer !== BLACK && !isDebugHvH) return;
    if (cardState.selectedCardId === null) return;

    // Determine playerKey
    const playerKey = isDebugHvH ? (gameState.currentPlayer === BLACK ? 'black' : 'white') : 'black';

    const isDebugUnlimited = window.DEBUG_UNLIMITED_USAGE === true || isDebugHvH;
    if (!isDebugUnlimited && cardState.hasUsedCardThisTurnByPlayer[playerKey]) return;

    const cardId = cardState.selectedCardId;
    const cardDef = CardLogic.getCardDef(cardId);

    // Charge Check (in debug mode, skip)
    const cost = cardDef ? cardDef.cost : 0;
    if (!isDebugUnlimited && (cardState.charge[playerKey] || 0) < cost) {
        addLog(`布石不足: ${cardDef ? cardDef.name : cardId} (必要: ${cost}, 所持: ${cardState.charge[playerKey] || 0})`);
        return;
    }

    // Get element for animation before modifying state
    const usedCardEl = document.querySelector(`[data-card-id="${cardId}"]`);

    // Capture state before modification for debug undo
    const preChargePlayer = cardState.charge[playerKey];
    const preUsedFlagPlayer = cardState.hasUsedCardThisTurnByPlayer[playerKey];

    // Determine ownerKey (actual hand holding the card)
    let ownerKey = playerKey;
    if (isDebugHvH && !cardState.hands[playerKey].includes(cardId)) {
        ownerKey = playerKey === 'black' ? 'white' : 'black';
    }
    const preChargeOwner = cardState.charge[ownerKey];
    const preUsedFlagOwner = cardState.hasUsedCardThisTurnByPlayer[ownerKey];

    // Debug mode: temporarily increase charge for both to ensure applyCardUsage succeeds
    if (isDebugUnlimited) {
        cardState.charge[playerKey] = 30; // Boost player
        cardState.charge[ownerKey] = 30;  // Boost owner (crucial for cross-hand use)
    }

    // Execute Logic using correct API
    // In debug HvH mode, the selected card may be in the other player's hand, but the effect should belong to playerKey.
    const success = CardLogic.applyCardUsage(cardState, gameState, playerKey, cardId, ownerKey);

    if (!success) {
        // Fallback restoration in case of unexpected failure inside CardLogic
        if (isDebugUnlimited) {
            cardState.charge[playerKey] = preChargePlayer;
            cardState.charge[ownerKey] = preChargeOwner;
        }
        addLog(`カード使用に失敗しました`);
        return;
    }

    // Debug Mode Adjustments: Restore values after success
    if (isDebugUnlimited) {
        cardState.charge[playerKey] = preChargePlayer; // Restore player charge
        cardState.charge[ownerKey] = preChargeOwner;   // Restore owner charge
        cardState.hasUsedCardThisTurnByPlayer[playerKey] = preUsedFlagPlayer; // Restore player flag
        cardState.hasUsedCardThisTurnByPlayer[ownerKey] = preUsedFlagOwner;   // Restore owner flag
        addLog(`🐛 デバッグ: コスト無視 & 回数制限無視`);
    }

    // Set pendingEffect stage for selection cards (applyCardUsage sets type but not stage)
    const pending = cardState.pendingEffectByPlayer[playerKey];
    if (pending && (pending.type === 'DESTROY_ONE_STONE' || pending.type === 'INHERIT_WILL')) {
        pending.stage = 'selectTarget';
    }

    // Store card def for display
    if (cardDef) {
        cardState.lastUsedCardByPlayer[playerKey] = { id: cardDef.id, name: cardDef.name, desc: cardDef.desc };
    }

    // Log
    const playerName = playerKey === 'black' ? '黒' : '白';
    addLog(`${playerName}がカードを使用: ${cardDef ? cardDef.name : cardId} (布石 -${isDebugUnlimited ? 0 : cost})`);

    // Clear selection
    cardState.selectedCardId = null;

    // Animation
    if (typeof window !== 'undefined') window.isCardAnimating = true; else isCardAnimating = true;

    // Use ui/move-executor-visuals helper when available; fallback to legacy global
    try {
        const uiMv = require('../ui/move-executor-visuals');
        if (uiMv && typeof uiMv.animateCardToCharge === 'function' && usedCardEl) {
            uiMv.animateCardToCharge(usedCardEl, true).then(() => {
                if (typeof window !== 'undefined') window.isCardAnimating = false; else isCardAnimating = false;
                renderCardUI();
                if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
                else if (typeof renderBoard === 'function') renderBoard();
            });
        } else if (typeof window !== 'undefined' && typeof window.animateCardToCharge === 'function' && usedCardEl) {
            window.animateCardToCharge(usedCardEl, true).then(() => {
                if (typeof window !== 'undefined') window.isCardAnimating = false; else isCardAnimating = false;
                renderCardUI();
                if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
                else if (typeof renderBoard === 'function') renderBoard();
            });
        } else {
            if (typeof window !== 'undefined') window.isCardAnimating = false; else isCardAnimating = false;
            renderCardUI();
            if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
            else if (typeof renderBoard === 'function') renderBoard();
        }
    } catch (e) {
        // If require fails (browser-only), fallback to existing global or no-op
        if (typeof window !== 'undefined' && typeof window.animateCardToCharge === 'function' && usedCardEl) {
            window.animateCardToCharge(usedCardEl, true).then(() => {
                if (typeof window !== 'undefined') window.isCardAnimating = false; else isCardAnimating = false;
                renderCardUI();
                if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
                else if (typeof renderBoard === 'function') renderBoard();
            });
        } else {
            if (typeof window !== 'undefined') window.isCardAnimating = false; else isCardAnimating = false;
            renderCardUI();
            if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
            else if (typeof renderBoard === 'function') renderBoard();
        }
    }
}

function cancelPendingSelection(specificPlayerKey) {
    const isDebugHvH = window.DEBUG_HUMAN_VS_HUMAN === true;
    const playerKey = specificPlayerKey || (isDebugHvH ? (gameState.currentPlayer === BLACK ? 'black' : 'white') : 'black');

    const pending = cardState.pendingEffectByPlayer[playerKey];
    if (!pending || pending.stage !== 'selectTarget') return;
    if (pending.type !== 'DESTROY_ONE_STONE' && pending.type !== 'INHERIT_WILL') return;

    const isDebugUnlimited = window.DEBUG_UNLIMITED_USAGE === true || isDebugHvH;
    const cardId = pending.cardId;
    const cardDef = CardLogic.getCardDef(cardId);
    const cost = cardDef ? cardDef.cost : 0;

    if (!isDebugUnlimited) {
        cardState.charge[playerKey] = (cardState.charge[playerKey] || 0) + cost;
        cardState.hasUsedCardThisTurnByPlayer[playerKey] = false;
    }

    if (cardId) {
        // Prefer returning to current player's hand, but fall back to black (HvH shared hand)
        const handKey = cardState.hands[playerKey] ? playerKey : 'black';
        cardState.hands[handKey].push(cardId);
        const discardIndex = cardState.discard.lastIndexOf(cardId);
        if (discardIndex >= 0) {
            cardState.discard.splice(discardIndex, 1);
        }
    }

    cardState.pendingEffectByPlayer[playerKey] = null;
    addLog(pending.type === 'INHERIT_WILL'
        ? `${playerKey === 'black' ? '黒' : '白'}の意志の継承をキャンセルしました`
        : `${playerKey === 'black' ? '黒' : '白'}の破壊神をキャンセルしました`);
    renderCardUI();
    if (typeof emitBoardUpdate === 'function') emitBoardUpdate();
    else if (typeof renderBoard === 'function') renderBoard();
}

function cancelPendingDestroy(specificPlayerKey) {
    cancelPendingSelection(specificPlayerKey);
}

// Export functions to global window scope for event binding (onclick in HTML etc)
window.fillDebugHand = fillDebugHand;
window.updateCardDetailPanel = updateCardDetailPanel;
window.onCardClick = onCardClick;
window.useSelectedCard = useSelectedCard;
window.cancelPendingDestroy = cancelPendingDestroy;
window.cancelPendingSelection = cancelPendingSelection;
