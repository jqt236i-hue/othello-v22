const Adapter = require('../../../game/turn/pipeline_ui_adapter');

describe('pipeline_ui_adapter.mapToPlaybackEvents', () => {
    test('maps CHANGE presentation event to flip playback event', () => {
        const pres = [ { type: 'CHANGE', row: 2, col: 3, ownerBefore: 'black', ownerAfter: 'white' } ];
        const playback = Adapter.mapToPlaybackEvents(pres, {}, {});
        expect(playback).toBeDefined();
        expect(playback.length).toBe(1);
        expect(playback[0].type).toBe('flip');
        expect(playback[0].targets[0].r).toBe(2);
        expect(playback[0].targets[0].col).toBe(3);
        expect(playback[0].targets[0].after.color).toBe(-1); // white -> -1
    });
});
