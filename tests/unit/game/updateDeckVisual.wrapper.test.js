const mv = require('../../../game/move-executor-visuals');

describe('updateDeckVisual wrapper', () => {
  test('exists and resolves', async () => {
    expect(typeof mv.updateDeckVisual).toBe('function');
    await expect(mv.updateDeckVisual()).resolves.toBeUndefined();
  });
});
