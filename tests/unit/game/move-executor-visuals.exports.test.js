const mv = require('../../../game/move-executor-visuals');

describe('game/move-executor-visuals exports', () => {
  test('exports animation wrapper functions', () => {
    expect(typeof mv.animateFadeOutAt).toBe('function');
    expect(typeof mv.animateDestroyAt).toBe('function');
    expect(typeof mv.animateHyperactiveMove).toBe('function');
  });

  test('wrapper functions are safe no-ops when UI not present', async () => {
    // Call each and ensure they return a Promise or resolve safely
    const p1 = mv.animateFadeOutAt(1,1);
    expect(typeof p1 === 'object' || typeof p1 === 'function').toBeTruthy();
    await expect(p1).resolves.toBeUndefined();

    const p2 = mv.animateDestroyAt(2,2);
    expect(typeof p2 === 'object' || typeof p2 === 'function').toBeTruthy();
    await expect(p2).resolves.toBeUndefined();

    const p3 = mv.animateHyperactiveMove({row:0,col:0},{row:1,col:1});
    expect(typeof p3 === 'object' || typeof p3 === 'function').toBeTruthy();
    await expect(p3).resolves.toBeUndefined();
  });
});
