/**
 * @file helpers.js
 * @description Shared helpers for card effects
 */

// Map player const to string key
function getPlayerKey(player) {
    return player === BLACK ? 'black' : 'white';
}

function getPlayerDisplayName(player) {
    return player === BLACK ? '黒' : '白';
}

function getOwner(player) {
    return player === BLACK ? BLACK : WHITE;
}

/**
 * 指定プレイヤーのアクティブな保護石リストを取得
 * @param {number} player - BLACK (1) or WHITE (-1)
 * @returns {Array} 保護石リスト [{row, col, remainingTurns}]
 */
function getActiveProtectionForPlayer(player) {
    if (!cardState || !cardState.specialStones) return [];
    const playerKey = player === BLACK ? 'black' : 'white';
    return cardState.specialStones.filter(s =>
        s.owner === playerKey && s.type === 'PROTECTED'
    );
}

/**
 * Map special stone type to visual effect key
 * @param {string} type - Special stone type
 * @returns {string|null} Effect key for applyStoneVisualEffect
 */
function getEffectKeyForType(type) {
    const map = {
        'PROTECTED': 'protectedStoneTemporary',
        'PERMA_PROTECTED': 'protectedStone',
        'DRAGON': 'ultimateDragon',
        'BREEDING': 'breedingStone',
        'ULTIMATE_DESTROY_GOD': 'ultimateDestroyGod',
        'HYPERACTIVE': 'hyperactiveStone',
        'GOLD': 'goldStone',
        'REGEN': 'regenStone'
    };
    return map[type] || null;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getPlayerKey,
        getPlayerDisplayName,
        getOwner,
        getActiveProtectionForPlayer,
        getEffectKeyForType
    };
}
