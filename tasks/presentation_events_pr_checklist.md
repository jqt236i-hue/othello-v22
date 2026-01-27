# PR Checklist — Presentation Events / BoardOps

Use this checklist for PRs that touch the BoardOps / presentation events migration.

## Code
- [ ] New module `game/logic/board_ops.js` added with tests
- [ ] No duplicated board mutation code (destroy/spawn/change/move) remains
- [ ] `stoneId` allocation is deterministic or DI-able via PRNG
- [ ] `presentationEvents` are emitted for SPAWN/DESTROY/CHANGE/MOVE
- [ ] `cardState.stoneIdMap` is updated atomically with board changes

## Tests
- [ ] Unit tests added for BoardOps API (`tests/unit/board_ops.test.js`)
- [ ] Existing smoke tests pass locally (`npm test`)
- [ ] Playwright scenario for breeding PoC passes

## Documentation
- [ ] `docs/presentation_events_spec.md` updated
- [ ] Issue linked and description updated

## CI
- [ ] `presentation-events` workflow (unit + Playwright) added or updated

## QA
- [ ] Message to QA team with steps to reproduce (Playwright scripts)
- [ ] Manual checks: spawn/destroy/change/move visual correctness and event->DOM mapping

## Offline / No-remote steps
- If this environment cannot push to a remote, provide the following bundle and artifacts to a person with repo push access:
  1. `ci-presentation-e2e.bundle` (repo root)
  2. `patches/*.patch` (repo root)
  3. `artifacts/artifacts_bundle_2026-01-25.zip` (contains visual and fuzzer artifacts)
- Receiver steps:
  - `git clone file:///path/to/ci-presentation-e2e.bundle -b ci/presentation-e2e <dest>`
  - `cd <dest>` → `git remote add origin <URL>` → `git push -u origin ci/presentation-e2e`
  - Create PR using `PR_DRAFT_CI_PRESENTATION.md` as body and assign reviewers

## Notes
- If rollback is needed, flip `FEATURE_PRESENTATION_EVENTS` to OFF and ensure nothing breaks.