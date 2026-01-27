Phase1 E2E (noanim) & CI Gate Summary

Status: Implementation complete (Phase1)

1) E2E (no-animation) test
- Test script: `scripts/playwright_presentation_sequences.js`
- Invocation (local): `npm run test:e2e:noanim` (internally runs `node scripts/playwright_presentation_sequences.js --noanim`)
- What it does (minimal representative flow):
  1. Launches `index.html?noanim=1` in headless Playwright
  2. Runs a Bomb+Breeding cascade scenario (deterministic PRNG fallback)
  3. When `--noanim` is active, additionally runs representative card scenario (plays at least 2 of: `chain_01`, `regen_01`, `bomb_01`, `hyperactive_01`) by invoking `TurnPipelineUIAdapter.runTurnWithAdapter()` and then `AnimationEngine.play()` on returned `playbackEvents` (noanim flow resolves immediately)
  4. Asserts at end (must pass):
     - `window.TimerRegistry.pendingCount() === 0`
     - `window.VisualPlaybackActive === false`
     - `console.error` emission count is 0 (no errors logged during scenario)
  5. Fails with explicit exit codes if any assertion fails (used by CI)

- File locations to inspect for checks:
  - Assertions are in `scripts/playwright_presentation_sequences.js` (pending count/VisualPlaybackActive/consoleErrors checks near the end of the main scenario and representative-cards block).

2) CI jobs (pull request gate)
- Workflow file: `.github/workflows/ci.yml`
- Jobs added:
  - `unit-normal` - runs `npm run test:jest`
  - `unit-noanim` - runs `npm run test:jest:noanim` (env NOANIM=1 / DISABLE_ANIMATIONS=1)
  - `e2e-noanim` - runs `npm run test:e2e:noanim` (Playwright headless tests with NOANIM=1)
- PR merge requirement: all three jobs must be green (configured via GitHub branch protection rules by repo admins).

3) Where pendingCount() and VisualPlaybackActive are asserted
- Unit: `tests/unit/ui/animation-engine.noanim.test.js` asserts `TimerRegistry.pendingCount() === 0` after `AnimationEngine.play()` and also checks `abortAndSync()` idempotence.
- E2E: `scripts/playwright_presentation_sequences.js` asserts both `TimerRegistry.pendingCount()` and `window.VisualPlaybackActive === false` at the end of the scenarios.

4) Local commands / README to run
- Unit tests (normal): `npm run test:jest`
- Unit tests (noanim): `npm run test:jest:noanim` (or `NOANIM=1 jest`)
- E2E noanim (long run): `npm run test:e2e:noanim` (uses Playwright headless and runs `index.html?noanim=1`) — performs 50 AUTO turns + skip/reset checks
- E2E normal-mode smoke (short run): `npm run test:e2e` — performs 10 AUTO turns + skip/reset checks

5) Notes & next steps
- The `TimerRegistry` supports scopes via `newScope()` / `clearScope()` and is used by `AnimationEngine.play()` to capture play-scoped timers; watchdog/abort/cleanup clear the scope.
- `AnimationEngine` sets `window._currentPlaybackScope` during playback so legacy animation helpers can register timers under the current scope.
- Single Visual Writer checks are in `ui.js` and `ui/diff-renderer.js` (dev: throw; prod: `AnimationEngine.abortAndSync()`), and legacy helpers call `AnimationEngine.abortAndSync()` in prod.

If you want, I can now:
- Expand the E2E card scenario (add AUTO/CPU multiple-turn run) and add a dedicated Playwright test file under `tests/e2e/`.
- Add telemetry hooks for Watchdog / Single Writer events to gather metrics in CI.

Let me know which of the above to proceed with next.