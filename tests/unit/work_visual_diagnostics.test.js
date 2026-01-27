// Test that diagnostics collects expected fields
if (typeof document === 'undefined') {
    describe('work visual diagnostics (skipped - no DOM)', () => {
        test('skipped', () => expect(true).toBe(true));
    });
} else {
    describe('work visual diagnostics', () => {
        beforeEach(() => {
            document.body.innerHTML = '<div id="board"></div>';
            global.cardState = { specialStones: [{ row: 4, col: 4, type: 'WORK', owner: 'black' }] };
            require('../../ui');
        });
        afterEach(() => {
            jest.resetModules();
            document.body.innerHTML = '';
            global.cardState = undefined;
        });

        test('getWorkVisualDiagnostics returns structure', () => {
            const d = window.getWorkVisualDiagnostics();
            expect(d).toBeTruthy();
            expect(typeof d.specialStonesCount).toBe('number');
            expect(Array.isArray(d.perSpecial)).toBe(true);
            expect(d.perSpecial.length).toBe(1);
        });
    });
}
