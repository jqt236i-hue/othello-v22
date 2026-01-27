const SharedConstants = require('../../shared-constants');

describe('shared constants', () => {
    test('TIME_BOMB_TURNS is defined and equals 3', () => {
        expect(SharedConstants.TIME_BOMB_TURNS).toBe(3);
    });
});
