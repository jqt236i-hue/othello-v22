const LOG_MESSAGES = require('../../game/log-messages');

describe('LOG_MESSAGES templates', () => {
    test('no template contains "??" placeholder', () => {
        for (const key of Object.keys(LOG_MESSAGES)) {
            const val = LOG_MESSAGES[key];
            if (typeof val === 'function') {
                const sample = val(3) || '';
                expect(sample.includes('??')).toBe(false);
            }
        }
    });

    test('gold and silver messages match expected format', () => {
        expect(LOG_MESSAGES.goldCharge(8)).toBe('金の意志：布石 +8（4倍）');
        expect(LOG_MESSAGES.silverCharge(9)).toBe('銀の意志：布石 +9（3倍）');
    });
});