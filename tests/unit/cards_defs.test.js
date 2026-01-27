const CardDefs = require('../../game/logic/cards/defs');
const SharedConstants = require('../../shared-constants');

describe('Card definition helpers', () => {
    test('getCardDef returns definition for known id', () => {
        const def = SharedConstants.CARD_DEFS[0];
        const res = CardDefs.getCardDef(def.id);
        expect(res).toBe(def);
    });

    test('getCardType mirrors CARD_TYPE_BY_ID', () => {
        const def = SharedConstants.CARD_DEFS[0];
        const res = CardDefs.getCardType(def.id);
        expect(res).toBe(SharedConstants.CARD_TYPE_BY_ID[def.id]);
    });

    test('getCardDisplayName returns display name', () => {
        const def = SharedConstants.CARD_DEFS[0];
        const res = CardDefs.getCardDisplayName(def.id);
        expect(res).toBe(def.name);
    });

    test('getCardCodeName returns id for display name', () => {
        const def = SharedConstants.CARD_DEFS[0];
        const res = CardDefs.getCardCodeName(def.name);
        expect(res).toBe(def.id);
    });

    test('unknown ids return empty display name', () => {
        const res = CardDefs.getCardDisplayName('unknown_card_id');
        expect(res).toBe('');
    });

    test('unknown display names return null', () => {
        const res = CardDefs.getCardCodeName('unknown_display_name');
        expect(res).toBe(null);
    });
});
