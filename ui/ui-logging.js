/* ui/ui-logging.js — DEPRECATED
   Replaced by the inlined implementation in `ui.js` during refactor.
   Kept as a harmless stub to avoid potential 3rd-party load-order issues.
*/
function addLog(text) {
    // Delegate to global implementation if available; otherwise no-op
    try {
        if (typeof window !== 'undefined' && typeof window.addLog === 'function' && window.addLog !== addLog) {
            // call the main implementation
            return window.addLog(text);
        }
    } catch (e) { /* ignore */ }
    // fallback: write to console so important messages are not lost
    if (typeof console !== 'undefined' && console.log) console.log('[log]', String(text));
}
