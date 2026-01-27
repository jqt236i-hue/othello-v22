const bootstrap = require('../../ui/bootstrap');
const breeding = require('../../../game/special-effects/breeding');

beforeAll(() => {
    bootstrap.installGameDI();
});

describe('Special effects timing uses timers abstraction', () => {
    test('processBreedingImmediateAtPlacement resolves quickly with timers', async () => {
        const precomputed = {
            spawned: [{ row: 3, col: 3 }],
            flipped: [],
            anchors: []
        };
        await expect(breeding.processBreedingImmediateAtPlacement(1, 3, 3, precomputed)).resolves.toBeUndefined();
    });
});