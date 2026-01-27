Patch 0002: presentation meta and adapter changes

Modified files:
- game/logic/cards.js
  - Replaced direct `cardState.presentationEvents.push(...)` uses with centralized `emitPresentationEvent(...)` that delegates to `BoardOps.emitPresentationEvent` when available.
  - Updated local `emitPresentationEvent` to delegate to `BoardOpsModule`.
- game/turn/pipeline_ui_adapter.js
  - Removed dependence on final-card-state snapshot to populate `after`.
  - Adapter now injects minimal `t.after` per target using event fields (ownerAfter, meta).
- ui/animation-engine.js
  - Updated visual handlers to use `t.after` (per-target) instead of `ev.after` snapshot Map.
- tests/unit/presentation_events_mandatory_meta.test.js (NEW)
  - Added tests asserting `actionId`, `turnIndex`, `plyIndex` are present and `plyIndex` increments.

Notes:
- All changes follow the single-responsibility/small-patch principle and are covered by unit tests added/updated.
- Run the test commands: `npm run check:ui-writers`, `npm run test:jest -i`, `npm run test:cpu-fuzz`.
