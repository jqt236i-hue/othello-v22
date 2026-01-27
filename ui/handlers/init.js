/**
 * @file init.js
 * @description UI event handler initialization
 */

/**
 * UI初期化
 * Initialize all UI event listeners and elements
 */
function initializeUI() {
    const resetBtn = document.getElementById('resetBtn');
    const muteBtn = document.getElementById('muteBtn');
    const seTypeSelect = document.getElementById('seTypeSelect');
    const seVolSlider = document.getElementById('seVolSlider');
    const bgmPlayBtn = document.getElementById('bgmPlayBtn');
    const bgmPauseBtn = document.getElementById('bgmPauseBtn');
    const bgmTrackSelect = document.getElementById('bgmTrackSelect');
    const bgmVolSlider = document.getElementById('bgmVolSlider');
    const autoToggleBtn = document.getElementById('autoToggleBtn');
    const smartBlack = document.getElementById('smartBlack');
    const smartWhite = document.getElementById('smartWhite');
    const debugModeBtn = document.getElementById('debugModeBtn');
    const humanVsHumanBtn = document.getElementById('humanVsHumanBtn');
    const visualTestBtn = document.getElementById('visualTestBtn');

    // Reset
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetGame();
            SoundEngine.init();
        });
    }

    // Debug / Visual test controls
    if (typeof setupDebugControls === 'function') {
        setupDebugControls(debugModeBtn, humanVsHumanBtn, visualTestBtn);
    }



    // Auto Toggle (simple)
    if (typeof setupAutoToggle === 'function') {
        setupAutoToggle(autoToggleBtn, smartBlack, smartWhite);
    }

    // Smart Level Selects
    if (typeof setupSmartSelects === 'function') {
        setupSmartSelects(smartBlack, smartWhite);
    }

    // SE Controls
    if (typeof setupSoundControls === 'function') {
        setupSoundControls(muteBtn, seTypeSelect, seVolSlider);
    }

    // BGM Controls
    if (typeof setupBgmControls === 'function') {
        setupBgmControls(bgmPlayBtn, bgmPauseBtn, bgmTrackSelect, bgmVolSlider);
    }

    // Initialize card UI handlers
    const useBtn = document.getElementById('use-card-btn');
    if (useBtn) {
        useBtn.addEventListener('click', useSelectedCard);
    }

    // Load CPU policy based on CPU level
    if (typeof loadCpuPolicy === 'function') {
        loadCpuPolicy();
    }

    // Load LvMax Deep CFR models
    if (typeof initLvMaxModels === 'function') {
        initLvMaxModels();
    }

    // Initialize the game (guarded: resetGame may not be present in minimal test harness)
    try {
        if (typeof resetGame === 'function') resetGame();
    } catch (e) { console.error('[init] resetGame threw', e && e.message); }

    // NOTE: Do NOT inject or write to `window.cardState` from UI init here to preserve the
    // single-writer invariant. Reset/bootstrapping is handled in `resetGame()` when needed.


    // Mirror internal animation flags to window for telemetry and Playwright checks
    if (typeof window !== 'undefined') {
        // Respect query param or pre-set global flag
        try {
            const qs = (typeof location !== 'undefined' && location.search) ? location.search : '';
            if (qs.indexOf('?noanim=1') !== -1 || qs.indexOf('&noanim=1') !== -1) window.DISABLE_ANIMATIONS = true;
        } catch (e) { /* ignore */ }

        // Expose TimerRegistry if available
        if (typeof TimerRegistry !== 'undefined') window.TimerRegistry = TimerRegistry;

        // Initialize monitoring flags
        window.isCardAnimating = typeof isCardAnimating !== 'undefined' ? isCardAnimating : false;
        window.isProcessing = typeof isProcessing !== 'undefined' ? isProcessing : false;

        // Telemetry: minimal counters for watchdog and single-writer events
        window.__telemetry__ = window.__telemetry__ || { watchdogFired: 0, singleVisualWriterHits: 0, abortCount: 0 };
        window.getTelemetrySnapshot = function () { return Object.assign({}, window.__telemetry__); };
        window.resetTelemetry = function () { window.__telemetry__ = { watchdogFired: 0, singleVisualWriterHits: 0, abortCount: 0 }; };

        // If no-anim mode is enabled, ensure flags are not stuck true
        if (window.DISABLE_ANIMATIONS === true) {
            window.isCardAnimating = false;
            isCardAnimating = false;
            isProcessing = false;
        }

        // Mirror internal animation flags to window for telemetry and Playwright checks
        window._uiMirrorIntervalId = setInterval(() => {
            if (typeof window !== 'undefined') {
                window.isCardAnimating = typeof isCardAnimating !== 'undefined' ? isCardAnimating : false;
                window.isProcessing = typeof isProcessing !== 'undefined' ? isProcessing : false;
            }
        }, 100);
    }
}

// Auto-initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', initializeUI);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeUI,
        setupSmartSelects: (typeof setupSmartSelects !== 'undefined') ? setupSmartSelects : function () {},
        setupSoundControls: (typeof setupSoundControls !== 'undefined') ? setupSoundControls : function () {},
        setupBgmControls: (typeof setupBgmControls !== 'undefined') ? setupBgmControls : function () {},
        loadCpuPolicy: (typeof loadCpuPolicy !== 'undefined') ? loadCpuPolicy : function () {}
    };
} 

if (typeof window !== 'undefined') {
    window.initializeUI = initializeUI;
}
