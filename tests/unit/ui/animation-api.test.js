const API = require('../../ui/animation-api');

describe('ui/animation-api shim', () => {
    test('defaults resolve without impl', async () => {
        API.clearUIImpl();
        await expect(API.animateFadeOutAt(1,2,{})).resolves.toBeUndefined();
        await expect(API.animateMove({r:1,c:1},{r:2,c:2},{})).resolves.toBeUndefined();
        await expect(API.animateFlip(3,4,{})).resolves.toBeUndefined();
    });

    test('calls injected impl when present', async () => {
        let called = 0;
        API.setUIImpl({
            animateFadeOutAt: () => { called++; return Promise.resolve('fade'); },
            animateMove: () => { called++; return Promise.resolve('move'); },
            animateFlip: () => { called++; return Promise.resolve('flip'); }
        });
        await expect(API.animateFadeOutAt(1,2,{})).resolves.toBe('fade');
        await expect(API.animateMove({r:1,c:1},{r:2,c:2},{})).resolves.toBe('move');
        await expect(API.animateFlip(3,4,{})).resolves.toBe('flip');
        expect(called).toBe(3);
        API.clearUIImpl();
    });
});
