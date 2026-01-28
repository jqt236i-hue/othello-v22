const mv = require('../../../game/move-executor-visuals');

describe('playDrawAnimation wrapper', () => {
  test('exists and is a function', () => {
    expect(typeof mv.playDrawAnimation).toBe('function');
  });

  test('resolves when UI not present', async () => {
    await expect(mv.playDrawAnimation('black', 'card_001')).resolves.toBeUndefined();
  });
});
