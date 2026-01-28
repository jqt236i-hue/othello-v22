// Smoke test for Auto UI wiring (no Jest)
// Validates that UI handler can bind a click and toggles Auto backend without throwing.
(function () {
  function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion failed');
  }

  try {
    const { setupAutoToggle, triggerAutoIfNeeded } = require('../ui/handlers/auto');
    const Auto = require('../game/auto');

    // Mock button
    const handlers = {};
    const btn = {
      textContent: '',
      addEventListener: (evt, h) => { handlers[evt] = h; }
    };

    Auto.disable();
    setupAutoToggle(btn);
    assert(typeof handlers.click === 'function', 'setupAutoToggle did not register click handler');
    assert(btn.textContent === 'AUTO: OFF', 'initial AUTO button text should be OFF');

    const before = Auto.isEnabled();
    handlers.click();
    const after = Auto.isEnabled();
    assert(before !== after, 'AUTO toggle did not change enabled state');

    // triggerAutoIfNeeded should call global.processAutoBlackTurn when present
    let called = false;
    global.processAutoBlackTurn = () => { called = true; };
    const res = triggerAutoIfNeeded();
    assert(res === true, 'triggerAutoIfNeeded should return true when processAutoBlackTurn exists');
    assert(called === true, 'triggerAutoIfNeeded did not call processAutoBlackTurn');
    delete global.processAutoBlackTurn;

    console.log('OK: smoke_auto_ui');
    process.exit(0);
  } catch (e) {
    console.error('FAIL: smoke_auto_ui', e && e.stack ? e.stack : e);
    process.exit(2);
  }
})();

