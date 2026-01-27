const { readCpuSmartness, clearLogUI, pulseDeckUI, whenDocumentReady, isDocumentHidden, __setSpecialStoneScaleImpl__ } = require('../../ui/ui-adapters');

describe('UI adapters', () => {
    beforeEach(() => {
        // Ensure clean global document mock
        global.document = undefined;
        delete global.window;
    });

    test('readCpuSmartness returns defaults when no document', () => {
        const vals = readCpuSmartness();
        expect(vals.black).toBe(1);
        expect(vals.white).toBe(1);
    });

    test('readCpuSmartness reads input values from document', () => {
        global.document = { getElementById: (id) => ({ value: id === 'smartBlack' ? '3' : '2' }) };
        const vals = readCpuSmartness();
        expect(vals.black).toBe(3);
        expect(vals.white).toBe(2);
    });

    test('clearLogUI clears log element when present', () => {
        let inner = 'x';
        const elem = { innerHTML: inner };
        global.document = { getElementById: (id) => id === 'log' ? elem : null };
        clearLogUI();
        expect(global.document.getElementById('log').innerHTML).toBe('');
    });

    test('pulseDeckUI adds deck-pulse class when elements present', () => {
        const fakeEl = { classList: new Set(), addEventListener: jest.fn(), removeEventListener: jest.fn() };
        fakeEl.classList.add = (c) => fakeEl.classList.addCalled = c;
        fakeEl.classList.remove = (c) => fakeEl.classList.removed = c;
        global.document = { getElementById: (id) => fakeEl };
        pulseDeckUI();
        expect(fakeEl.classList.addCalled).toBe('deck-pulse');
    });

    test('whenDocumentReady calls callback immediately if ready', (done) => {
        global.document = { readyState: 'complete', addEventListener: () => {} };
        whenDocumentReady(() => done());
    });

    test('isDocumentHidden reflects document.hidden', () => {
        global.document = { hidden: true };
        expect(isDocumentHidden()).toBe(true);
        global.document = { hidden: false };
        expect(isDocumentHidden()).toBe(false);
    });

    test('__setSpecialStoneScaleImpl__ sets CSS variable when document present', () => {
        const style = { props: {}, setProperty: (k, v) => style.props[k] = v };
        global.document = { documentElement: { style } };
        __setSpecialStoneScaleImpl__(2);
        expect(style.props['--special-stone-scale']).toBe('2');
    });
});