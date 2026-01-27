/* Auto mode removed: compatibility stubs for removed API */

function startAutoLoop() { console.warn('[AUTO-LOOP] Removed: startAutoLoop is a no-op'); }
function stopAutoLoop() { console.warn('[AUTO-LOOP] Removed: stopAutoLoop is a no-op'); }
function isAutoLoopRunning() { return false; }
function setAutoLoopSpeed(ms) { console.warn('[AUTO-LOOP] Removed: setAutoLoopSpeed is a no-op'); }
function getAutoLoopSpeed() { return 0; }
async function stepAutoMove() { console.warn('[AUTO-LOOP] Removed: stepAutoMove is a no-op'); return Promise.resolve(); }

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        startAutoLoop,
        stopAutoLoop,
        stepAutoMove,
        setAutoLoopSpeed,
        getAutoLoopSpeed,
        isAutoLoopRunning
    };
}

