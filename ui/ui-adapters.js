// UI adapter helpers — safe to call from game/ code. Attach to window and export for tests.
function readCpuSmartness() {
    try {
        if (typeof document !== 'undefined') {
            const sb = document.getElementById('smartBlack');
            const sw = document.getElementById('smartWhite');
            return {
                black: sb ? Number(sb.value) || 1 : 1,
                white: sw ? Number(sw.value) || 1 : 1
            };
        }
    } catch (e) { }
    return { black: 1, white: 1 };
}

function clearLogUI() {
    try {
        if (typeof document !== 'undefined') {
            const logEl = document.getElementById('log');
            if (logEl) logEl.innerHTML = '';
        }
    } catch (e) { }
}

function pulseDeckUI() {
    try {
        if (typeof document !== 'undefined') {
            const deckEls = [document.getElementById('deck-black'), document.getElementById('deck-white')];
            deckEls.forEach(el => {
                if (!el) return;
                el.classList.add('deck-pulse');
                // Remove after animationend (safety: also remove after 1s fallback)
                const onEnd = () => { try { el.classList.remove('deck-pulse'); el.removeEventListener('animationend', onEnd); } catch (e) {} };
                el.addEventListener('animationend', onEnd, { once: true });
                setTimeout(onEnd, 1000);
            });
        }
    } catch (e) { }
}

function whenDocumentReady(cb) {
    try {
        if (typeof document === 'undefined') {
            setTimeout(cb, 0);
            return;
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', cb, { once: true });
        } else {
            setTimeout(cb, 0);
        }
    } catch (e) { setTimeout(cb, 0); }
}

function isDocumentHidden() {
    try {
        if (typeof document !== 'undefined' && typeof document.hidden !== 'undefined') return !!document.hidden;
    } catch (e) { }
    return false;
}

function __setSpecialStoneScaleImpl__(scale) {
    try {
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.style.setProperty('--special-stone-scale', String(scale));
        }
    } catch (e) { }
}

// Attach to window for game/ code to call
if (typeof window !== 'undefined') {
    window.readCpuSmartness = window.readCpuSmartness || readCpuSmartness;
    window.clearLogUI = window.clearLogUI || clearLogUI;
    window.pulseDeckUI = window.pulseDeckUI || pulseDeckUI;
    window.whenDocumentReady = window.whenDocumentReady || whenDocumentReady;
    window.isDocumentHidden = window.isDocumentHidden || isDocumentHidden;
    window.__setSpecialStoneScaleImpl__ = window.__setSpecialStoneScaleImpl__ || __setSpecialStoneScaleImpl__;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        readCpuSmartness,
        clearLogUI,
        pulseDeckUI,
        whenDocumentReady,
        isDocumentHidden,
        __setSpecialStoneScaleImpl__
    };
}
