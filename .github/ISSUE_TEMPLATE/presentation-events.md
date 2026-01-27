---
name: 'Feature: Presentation Events / BoardOps'
about: 'Introduce unified BoardOps and presentationEvents to standardize board mutations and UI replay'
labels: enhancement, area:logic, area:ui
assignees: ''
---

## Summary
Introduce `BoardOps` (spawnAt/destroyAt/changeAt/moveAt) and `presentationEvents` to ensure consistent board manipulation and deterministic UI replay via stoneId tracking.

## Acceptance Criteria
- Unit tests cover BoardOps APIs and existing card flows (Dragon, UDG, Chain, Regen, Hyperactive).
- presentationEvents emitted with consistent stoneId for SPAWN/DESTROY/CHANGE/MOVE.
- Playwright E2E asserts DOM changes match presentationEvents for at least `breeding_01` PoC.
- No regressions in existing smoke tests.

## Implementation Notes
- Add `game/logic/board_ops.js` and centralize board operations.
- Add `stoneIdMap` to cardState and ensure stoneId allocation is deterministic / injectable via PRNG.
- Migrate card effects to call BoardOps APIs.
- Keep backward-compatible event logs and use feature flag `FEATURE_PRESENTATION_EVENTS` during migration.

## Tasks
- [ ] Add BoardOps module
- [ ] Migrate `breeding`, `destroy_one_stone`, `dragon`, `udg`, `chain`, `regen`, `hyperactive` to BoardOps
- [ ] Add unit tests and Playwright checks
- [ ] Add docs in `docs/presentation_events_spec.md`

## Additional Notes
Include `actionId` / `turnIndex` / `plyIndex` in presentation events for grouping and replay determinism.