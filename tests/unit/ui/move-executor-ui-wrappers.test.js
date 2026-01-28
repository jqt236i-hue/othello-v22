const uiMv = require('../../../ui/move-executor-visuals');

describe('UI move executor wrappers', () => {
  test('animateCardToCharge/playDrawAnimation exist and resolve', async () => {
    expect(typeof uiMv.animateCardToCharge).toBe('function');
    expect(typeof uiMv.playDrawAnimation).toBe('function');
    await expect(uiMv.animateCardToCharge(null, true)).resolves.toBeUndefined();
    await expect(uiMv.playDrawAnimation('black', 'card_001')).resolves.toBeUndefined();
  });
});
