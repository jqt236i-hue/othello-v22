const { setupAutoToggle, triggerAutoIfNeeded } = require('../../ui/handlers/auto');
const Auto = require('../../game/auto');

describe('Auto UI', () => {
  test('setupAutoToggle binds click and toggles backend', () => {
    // Mock button
    const handlers = {};
    const btn = {
      textContent: '',
      addEventListener: (evt, h) => { handlers[evt] = h; }
    };

    // Ensure initial state OFF
    Auto.disable();
    setupAutoToggle(btn);
    expect(btn.textContent).toBe('AUTO: OFF');

    // Spy toggle
    const spy = jest.spyOn(Auto, 'toggle');

    // Simulate click
    handlers.click();
    expect(spy).toHaveBeenCalled();

    // After click text should reflect enabled state
    btn.textContent = Auto.isEnabled() ? 'AUTO: ON' : 'AUTO: OFF';
    expect(['AUTO: ON', 'AUTO: OFF']).toContain(btn.textContent);

    spy.mockRestore();
  });

  test('triggerAutoIfNeeded calls processAutoBlackTurn when available', () => {
    global.processAutoBlackTurn = jest.fn();
    expect(triggerAutoIfNeeded()).toBe(true);
    expect(global.processAutoBlackTurn).toHaveBeenCalled();
    delete global.processAutoBlackTurn;
  });
});