// ===== Card Animation Utilities (Basic) =====

// Get element position relative to viewport
function getCardPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height
    };
}

// Create flying card DOM for animation
function createFlyingCard(isFaceUp, cardName = '') {
    const card = document.createElement('div');
    card.className = `flying-card ${isFaceUp ? 'face-up' : 'face-down'}`;
    card.textContent = isFaceUp ? cardName : 'CARD';
    return card;
}

// ===== Card Deck Visual Management =====

// Update deck visual only (thickness/count) without touching hands
function updateDeckVisual() {
    const deckBlackEl = document.getElementById('deck-black');
    const deckWhiteEl = document.getElementById('deck-white');
    const deckCount = cardState.deck.length;
    const ratio = Math.max(0, Math.min(1, deckCount / 20));

    // Both decks show same count (shared deck)
    if (deckBlackEl) {
        deckBlackEl.style.setProperty('--deck-ratio', ratio);
        const countLabel = deckBlackEl.querySelector('.deck-count');
        if (countLabel) countLabel.textContent = `${deckCount}/20`;
    }
    if (deckWhiteEl) {
        deckWhiteEl.style.setProperty('--deck-ratio', ratio);
        const countLabel = deckWhiteEl.querySelector('.deck-count');
        if (countLabel) countLabel.textContent = `${deckCount}/20`;
    }
}
