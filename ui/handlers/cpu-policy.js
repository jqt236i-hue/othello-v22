/**
 * @file cpu-policy.js
 * @description CPU policy loading handlers
 */

/**
 * LvMax Deep CFR モデルの読み込み
 * Load LvMax Deep CFR models
 */
async function initLvMaxModels() {
    if (typeof loadLvMaxModels === 'undefined') {
        console.warn('[LvMax] loadLvMaxModels function not available');
        return;
    }

    try {
        console.log('[LvMax] Loading Deep CFR models...');
        const success = await window.loadLvMaxModels('/ai/deepcfr/models/final');
        if (success) {
            console.log('[LvMax] Models loaded successfully');
            // Silent loading - only log to console, not UI
        } else {
            console.warn('[LvMax] Model loading failed');
        }
    } catch (err) {
        console.error('[LvMax] Model loading error:', err);
    }
}

/**
 * CPUポリシー読み込み
 * Load MCCFR policy based on CPU level
 */
async function loadCpuPolicy() {
    if (typeof CpuPolicy === 'undefined' || !CpuPolicy.loadPolicyForLevel) {
        console.warn('CpuPolicy.loadPolicyForLevel not available');
        return;
    }
    try {
        const whiteLevel = cpuSmartness.white || 3;
        console.log(`Attempting to load policy for level ${whiteLevel}`);
        mccfrPolicy = await CpuPolicy.loadPolicyForLevel(whiteLevel);
        console.log('Policy loaded successfully:', mccfrPolicy);
        addLog(`MCCFRポリシー (レベル ${whiteLevel}) を読み込みました`);
    } catch (err) {
        console.error('Policy load failed - Full error:', err);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        addLog(`ポリシー読み込みに失敗しました: ${err.message}`);
    }
}

if (typeof window !== 'undefined') {
    window.initLvMaxModels = initLvMaxModels;
    window.loadCpuPolicy = loadCpuPolicy;
}
