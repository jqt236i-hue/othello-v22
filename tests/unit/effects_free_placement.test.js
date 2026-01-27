const fp = require('../../game/logic/effects/free_placement');

describe('effects/free_placement', () => {
    test('applyFreePlacement returns applied true', () => {
        const res = fp.applyFreePlacement({}, 'black');
        expect(res.applied).toBe(true);
    });
});