// UI implementation for visual-effects-map
// This file contains DOM-manipulating visual helpers intended to run in the browser UI.
console.log('[VISUAL_EFFECTS] ui/visual-effects-map.js loaded');

// (File content is intentionally a copy of the former game-side implementation so UI can own DOM work.)

const UI_STONE_VISUAL_EFFECTS = (typeof window !== 'undefined' && typeof window.STONE_VISUAL_EFFECTS !== 'undefined') ? window.STONE_VISUAL_EFFECTS : {
    goldStone: {
        cssClass: 'gold-stone',
        cssMethod: 'background',
        imagePath: 'assets/images/stones/gold_stone.png',
        dataAttributes: {}
    },

    silverStone: {
        cssClass: 'silver-stone',
        cssMethod: 'background',
        imagePath: 'assets/images/stones/silver.stone.png',
        dataAttributes: {}
    },
    protectedStone: {
        cssClass: 'protected-stone',
        cssMethod: 'background',
        imagePathByOwner: {
            '1': 'assets/images/stones/perma_protect_next_stone-black.png',
            '-1': 'assets/images/stones/perma_protect_next_stone-white.png'
        },
        backgroundSize: '100% 100%',
        dataAttributes: {},
        clearStyles: {
            'background-color': 'transparent',
            'box-shadow': 'none',
            'border': 'none'
        }
    },
    protectedStoneTemporary: {
        cssClass: 'protected-gray',
        cssMethod: 'background',
        imagePath: 'assets/images/stones/protected_next_stone.png',
        backgroundSize: '100% 100%',
        dataAttributes: {},
        clearStyles: {
            'background-color': 'transparent',
            'box-shadow': 'none',
            'border': 'none'
        }
    },
    ultimateDragon: {
        cssClass: 'ultimate-dragon',
        cssMethod: 'pseudoElement',
        imagePathByOwner: {
            '1': 'assets/images/stones/ultimate_reverse_dragon-black.png',
            '-1': 'assets/images/stones/ultimate_reverse_dragon-white.png'
        },
        dataAttributes: {}
    },
    breedingStone: {
        cssClass: 'breeding-stone',
        cssMethod: 'pseudoElement',
        imagePathByOwner: {
            '1': 'assets/images/stones/BREEDING_WILL-black.png',
            '-1': 'assets/images/stones/BREEDING_WILL-white.png'
        },
        dataAttributes: {}
    },
    ultimateDestroyGod: {
        cssClass: 'ultimate-destroy-god',
        cssMethod: 'pseudoElement',
        imagePathByOwner: {
            '1': 'assets/images/stones/ULTIMATE_DESTROY_GOD-black.png',
            '-1': 'assets/images/stones/ULTIMATE_DESTROY_GOD-white.png'
        },
        dataAttributes: {}
    },
    hyperactiveStone: {
        cssClass: 'hyperactive-stone',
        cssMethod: 'pseudoElement',
        imagePathByOwner: {
            '1': 'assets/images/stones/HYPERACTIVE_WILL-black.png',
            '-1': 'assets/images/stones/HYPERACTIVE_WILL-white.png'
        },
        dataAttributes: {}
    },
    regenStone: {
        cssClass: 'regen-stone',
        cssMethod: 'pseudoElement',
        imagePathByOwner: {
            '1': 'assets/images/stones/regen_stone-black.png',
            '-1': 'assets/images/stones/regen_stone-white.png'
        },
        dataAttributes: {}
    },
    workStone: {
        cssClass: 'work-stone',
        cssMethod: 'pseudoElement',
        imagePathByOwner: {
            '1': 'assets/images/stones/work_stone-black.png',
            '-1': 'assets/images/stones/work_stone-white.png'
        },
        backgroundSize: '100% 100%',
        dataAttributes: {}
    }
};

// Use UI-local names to avoid redeclaring globals when multiple bundles/scripts are present.
const UI_PENDING_TYPE_TO_EFFECT_KEY = (typeof window !== 'undefined' && typeof window.PENDING_TYPE_TO_EFFECT_KEY !== 'undefined') ? window.PENDING_TYPE_TO_EFFECT_KEY : {
    'PROTECTED_NEXT_STONE': 'protectedStoneTemporary',
    'PERMA_PROTECT_NEXT_STONE': 'protectedStone',
    'ULTIMATE_REVERSE_DRAGON': 'ultimateDragon',
    'BREEDING_WILL': 'breedingStone',
    'ULTIMATE_DESTROY_GOD': 'ultimateDestroyGod',
    'HYPERACTIVE_WILL': 'hyperactiveStone',
    'REGEN_WILL': 'regenStone',
    'GOLD_STONE': 'goldStone',
    'SILVER_STONE': 'silverStone',
    'WORK_WILL': 'workStone'
};

const UI_SPECIAL_TYPE_TO_EFFECT_KEY = (typeof window !== 'undefined' && typeof window.SPECIAL_TYPE_TO_EFFECT_KEY !== 'undefined') ? window.SPECIAL_TYPE_TO_EFFECT_KEY : {
    'PROTECTED': 'protectedStoneTemporary',
    'PERMA_PROTECTED': 'protectedStone',
    'DRAGON': 'ultimateDragon',
    'BREEDING': 'breedingStone',
    'ULTIMATE_DESTROY_GOD': 'ultimateDestroyGod',
    'HYPERACTIVE': 'hyperactiveStone',
    'REGEN': 'regenStone',
    'GOLD': 'goldStone',
    'SILVER': 'silverStone',
    'WORK': 'workStone'
};

function getEffectKeyForPendingType(pendingType) {
    return UI_PENDING_TYPE_TO_EFFECT_KEY[pendingType] || null;
}

function getEffectKeyForSpecialType(type) {
    return UI_SPECIAL_TYPE_TO_EFFECT_KEY[type] || null;
} 

async function applyStoneVisualEffect(discElement, effectKey, options = {}) {
    console.log('[VISUAL_DEBUG] applyStoneVisualEffect called', effectKey, options);
    const effect = UI_STONE_VISUAL_EFFECTS[effectKey];
    try { if (!discElement) console.warn('[VISUAL_DEBUG] applyStoneVisualEffect: discElement missing for', effectKey); } catch (e) {}
    try { console.log('[VISUAL_DEBUG] effect lookup:', effectKey, effect ? effect.cssClass : null); } catch (e) {}
    if (!effect) {
        console.warn(`[VISUAL_EFFECTS] Unknown effect key: ${effectKey}`);
        return false;
    }

    if (effectKey === 'workStone') {
        console.log('[VISUAL_DEBUG] applyStoneVisualEffect(workStone) called, options:', options, 'effect:', effect);
        try { window._lastApplyWorkTs = Date.now(); } catch (e) {}
    }

    discElement.classList.add('special-stone');
    discElement.classList.add(effect.cssClass);

    try { console.log('[VISUAL_DEBUG] after apply classes:', discElement.className, 'cssVar:', discElement.style.getPropertyValue('--special-stone-image')); } catch(e){}

    // Helper: wait for paint using rAF + short timeout
    async function waitForNextPaint() {
        return new Promise(resolve => {
            try {
                requestAnimationFrame(() => setTimeout(resolve, 20));
            } catch (e) { setTimeout(resolve, 20); }
        });
    }

    // detect function for current painting state
    function hasVisibleBackground(discEl) {
        try {
            const beforeBg = getComputedStyle(discEl, '::before').getPropertyValue('background-image');
            const inlineBg = discEl.style.backgroundImage || '';
            const hasBefore = beforeBg && beforeBg !== 'none' && beforeBg.trim().length > 0;
            const hasInline = inlineBg && inlineBg !== 'none' && inlineBg.trim().length > 0;
            return { hasBefore, hasInline };
        } catch (e) { return { hasBefore: false, hasInline: false }; }
    }

    // Background-based effects
    if (effect.cssMethod === 'background') {
        let imagePath = effect.imagePath;
        if (effect.imagePathByOwner && options.owner !== undefined) {
            const ownerKey = options.owner.toString();
            imagePath = effect.imagePathByOwner[ownerKey];
            console.log(`[VISUAL_EFFECTS] PermaProtected stone - owner: ${options.owner}, ownerKey: "${ownerKey}", imagePath: "${imagePath}"`);
        } else if (effect.imagePathByPlayer && options.player !== undefined) {
            imagePath = effect.imagePathByPlayer[options.player];
        }
        if (imagePath) {
            // Resolve relative paths against document.baseURI to avoid file:// / server mismatches
            let resolvedPath = imagePath;
            try {
                if (typeof document !== 'undefined' && document.baseURI) {
                    resolvedPath = new URL(imagePath, document.baseURI).href;
                }
            } catch (e) { /* ignore: fallback to original imagePath */ }

            discElement.style.setProperty('--special-stone-image', `url('${resolvedPath}')`);
            try { discElement.style.backgroundImage = `url('${resolvedPath}')`; } catch (e) { }

            // Poll a few frames to allow browser to paint pseudo/inline bg. If not painted, inject fallback <img>.
            let success = false;
            const maxAttempts = 6;
            for (let i = 0; i < maxAttempts; i++) {
                const { hasBefore, hasInline } = hasVisibleBackground(discElement);
                if (hasBefore || hasInline) { success = true; break; }
                await waitForNextPaint();
            }

            const existing = discElement.querySelector('.special-stone-img');
            if (!success) {
                if (!existing) {
                    const img = document.createElement('img');
                    img.className = 'special-stone-img';
                    img.src = resolvedPath;
                    img.alt = effectKey;
                    img.setAttribute('aria-hidden', 'true');
                    img.style.position = 'absolute';
                    img.style.top = '0';
                    img.style.left = '0';
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                    img.style.pointerEvents = 'none';
                    img.style.zIndex = '60';
                    discElement.appendChild(img);
                    console.warn('[VISUAL_EFFECTS] Injected fallback image for', effectKey, resolvedPath);
                    try { window._lastWorkInjected = { key: effectKey, imgPath: resolvedPath, ts: Date.now() }; } catch (e) {}
                }
                return true;
            }
            // If inline or before background applied, ensure existing fallback is removed
            if (existing) existing.remove();
            return true;
        } else {
            console.warn(`[VISUAL_EFFECTS] No imagePath found for effect: ${effectKey}, options:`, options);
            return false;
        }
    } else if (effect.cssMethod === 'pseudoElement') {
        if (effect.imagePathByOwner && options.owner !== undefined) {
            let ownerKey;
            let ownerNum;
            if (options.owner === 'black' || options.owner === '1' || options.owner === 1) {
                ownerKey = '1';
                ownerNum = 1;
            } else if (options.owner === 'white' || options.owner === '-1' || options.owner === -1) {
                ownerKey = '-1';
                ownerNum = -1;
            } else {
                const s = String(options.owner);
                ownerKey = (s === '-1') ? '-1' : '1';
                ownerNum = (ownerKey === '1') ? 1 : -1;
            }
            const ownerClass = ownerNum === 1 ? 'ud-black' : 'ud-white';
            const dataUdValue = ownerNum === 1 ? 'black' : 'white';

            discElement.classList.add(ownerClass);
            discElement.dataset.ud = dataUdValue;

            let imagePath = effect.imagePathByOwner[ownerKey];
            if (imagePath) {
                // Resolve path
                let resolvedPath = imagePath;
                try {
                    if (typeof document !== 'undefined' && document.baseURI) {
                        resolvedPath = new URL(imagePath, document.baseURI).href;
                    }
                } catch (e) {}

                discElement.style.setProperty('--dragon-image-path', `url('${resolvedPath}')`);
                discElement.style.setProperty('--special-stone-image', `url('${resolvedPath}')`);
                try { discElement.style.backgroundImage = `url('${resolvedPath}')`; } catch (e) { }

                // Wait for paint similar to background
                let success = false;
                const maxAttempts = 6;
                for (let i = 0; i < maxAttempts; i++) {
                    const { hasBefore, hasInline } = hasVisibleBackground(discElement);
                    if (hasBefore || hasInline) { success = true; break; }
                    await waitForNextPaint();
                }

                const existing = discElement.querySelector('.special-stone-img');
                if (!success) {
                    if (!existing) {
                        const img = document.createElement('img');
                        img.className = 'special-stone-img';
                        img.src = resolvedPath;
                        img.alt = effectKey;
                        img.setAttribute('aria-hidden', 'true');
                        img.style.position = 'absolute';
                        img.style.top = '0';
                        img.style.left = '0';
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'contain';
                        img.style.pointerEvents = 'none';
                        img.style.zIndex = '60';
                        discElement.appendChild(img);
                        console.warn('[VISUAL_EFFECTS] Injected fallback image for', effectKey, resolvedPath);
                        try { window._lastWorkInjected = { key: effectKey, imgPath: resolvedPath, ts: Date.now() }; } catch (e) {}
                    }
                    return true;
                }

                if (existing) existing.remove();
                return true;
            } else {
                console.warn(`[VISUAL_EFFECTS] No imagePath found for ownerKey=${ownerKey}`);
                return false;
            }
        }
    }

    if (effectKey === 'breedingStone' && effect.imagePathByOwner && options.owner !== undefined) {
        const breedingClass = options.owner === 1 ? 'breeding-black' : 'breeding-white';
        const dataBreedingValue = options.owner === 1 ? 'black' : 'white';
        discElement.classList.add(breedingClass);
        discElement.dataset.breeding = dataBreedingValue;
        const imagePath = effect.imagePathByOwner[options.owner.toString()];
        if (imagePath) {
            discElement.style.setProperty('--breeding-image-path', `url('${imagePath}')`);
            discElement.style.setProperty('--special-stone-image', `url('${imagePath}')`);
        }
    }

    Object.entries(effect.dataAttributes || {}).forEach(([key, value]) => {
        discElement.dataset[key] = value;
    });

    if (effect.clearStyles) {
        Object.entries(effect.clearStyles).forEach(([property, value]) => {
            discElement.style.setProperty(property, value, 'important');
        });
    }

    // Default success if we reached here (some effects are purely class-based)
    return true;
}

function removeStoneVisualEffect(discElement, effectKey) {
    const effect = UI_STONE_VISUAL_EFFECTS[effectKey];
    if (!effect) return;

    discElement.classList.remove(effect.cssClass);

    if (effect.cssMethod === 'background') {
        discElement.style.backgroundImage = '';
        discElement.style.backgroundSize = '';
        discElement.style.backgroundPosition = '';
        discElement.style.backgroundRepeat = '';
    } else if (effect.cssMethod === 'pseudoElement') {
        discElement.classList.remove('ud-black', 'ud-white');
        delete discElement.dataset.ud;
    }

    Object.keys(effect.dataAttributes || {}).forEach(key => {
        delete discElement.dataset[key];
    });
}

function getSupportedEffectKeys() {
    return Object.keys(UI_STONE_VISUAL_EFFECTS);
}

if (typeof module === 'object' && module.exports) {
    module.exports = {
        UI_STONE_VISUAL_EFFECTS,
        PENDING_TYPE_TO_EFFECT_KEY: UI_PENDING_TYPE_TO_EFFECT_KEY,
        getEffectKeyForPendingType,
        SPECIAL_TYPE_TO_EFFECT_KEY: UI_SPECIAL_TYPE_TO_EFFECT_KEY,
        getEffectKeyForSpecialType,
        applyStoneVisualEffect,
        removeStoneVisualEffect,
        getSupportedEffectKeys
    };
}

// In UI, export globals for backward compatibility (ensure we don't overwrite an existing global)
if (typeof window !== 'undefined' && typeof window.STONE_VISUAL_EFFECTS === 'undefined') {
    window.STONE_VISUAL_EFFECTS = UI_STONE_VISUAL_EFFECTS;
}
// Do not overwrite existing globals if present; prefer existing definitions.
if (typeof window !== 'undefined') {
    window.PENDING_TYPE_TO_EFFECT_KEY = window.PENDING_TYPE_TO_EFFECT_KEY || UI_PENDING_TYPE_TO_EFFECT_KEY;
    window.getEffectKeyForPendingType = window.getEffectKeyForPendingType || getEffectKeyForPendingType;
    window.SPECIAL_TYPE_TO_EFFECT_KEY = window.SPECIAL_TYPE_TO_EFFECT_KEY || UI_SPECIAL_TYPE_TO_EFFECT_KEY;
    window.getEffectKeyForSpecialType = window.getEffectKeyForSpecialType || getEffectKeyForSpecialType;
} 
window.applyStoneVisualEffect = applyStoneVisualEffect;
window.removeStoneVisualEffect = removeStoneVisualEffect;
window.getSupportedEffectKeys = getSupportedEffectKeys;

window.setSpecialStoneScale = function setSpecialStoneScale(scale) {
    const n = Number(scale);
    if (!Number.isFinite(n) || n <= 0) {
        console.warn('[VISUAL_EFFECTS] Invalid special stone scale:', scale);
        return;
    }
    if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.style.setProperty('--special-stone-scale', String(n));
    }
};

// Notify game/ module that UI implementations are available so game can delegate without using window.
try {
    const gameVisualsMap = require('../game/visual-effects-map');
    if (gameVisualsMap && typeof gameVisualsMap.setUIImpl === 'function') {
        gameVisualsMap.setUIImpl({
            applyStoneVisualEffect,
            removeStoneVisualEffect,
            getSupportedEffectKeys,
            // Expose any UI-level helpers that might be useful
            __setSpecialStoneScaleImpl__: function(scale) { window.setSpecialStoneScale(scale); }
        });
    }
} catch (e) { /* ignore in non-module UI contexts */ }
