// Smoke test for UI -> game dependency injection
(async function () {
    try {
        const uiBootstrap = require('../ui/bootstrap');
        if (typeof uiBootstrap.installGameDI === 'function') {
            const res = uiBootstrap.installGameDI();
            // Optionally inspect timersImpl
            const gameTimers = require('../game/timers');
            if (!gameTimers || typeof gameTimers.waitMs !== 'function') {
                console.error('FAIL: game/timers not available or missing waitMs');
                process.exit(2);
            }
            // Quick sanity wait
            await gameTimers.waitMs(1);
            console.log('OK: installGameDI ran and timers.waitMs resolved');
            process.exit(0);
        } else {
            console.error('FAIL: installGameDI not exported from ui/bootstrap');
            process.exit(2);
        }
    } catch (e) {
        console.error('FAIL: smoke_ui_di threw', e && e.stack ? e.stack : e);
        process.exit(2);
    }
})();