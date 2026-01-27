Title: ci(presentation): add presentation E2E suite, visual smoke check, and CI workflow

Summary:
- Adds Playwright E2E suite `scripts/playwright_presentation_events_suite.js` to validate that presentation events result in DOM visuals for several effect keys (regenStone, breedingStone, workStone, protectedStone).
- Adds a visual regression smoke script `scripts/playwright_presentation_visual_check.js` that captures a baseline screenshot for a breeding visual and diffs subsequent runs using `pixelmatch`.
- Adds GitHub Actions workflow `.github/workflows/e2e-presentation.yml` that runs the suite on push/PR.
- Adds small UI bridge files under `ui/` and removes debug logging from `ui/presentation-handler.js`.
- Baseline images created at `artifacts/visual_presentation/breeding_baseline.png` and `artifacts/visual_presentation/breeding_sequence_baseline.png` (review required). Note: the breeding sequence script has been **hardened** (added polling, retries, and debug screenshots) and passes locally; recommend monitoring CI and preserving artifacts on failures for further tuning.

Testing:
- Locally: `npm run test:e2e:present-suite` and `npm run test:e2e:present-visual` pass.
- Unit and smoke tests pass (`npm test`).

Notes for reviewers:
- The branch `ci/presentation-e2e` exists locally and contains the commits. For convenience I produced artifacts you can use to push or review offline:
  - Git bundle: `ci-presentation-e2e.bundle` (in parent directory of repo root). Use `git bundle unbundle CI-presentation-e2e.bundle` or `git clone file://.../ci-presentation-e2e.bundle -b ci/presentation-e2e` on another machine.
  - Patch set: `patches/0001-*.patch` ... `patches/0030-*.patch` (in repo root) — apply with `git am patches/*.patch`.
- If you prefer I can attempt to add a remote and push from this environment, but repository remote is not configured; provide the remote URL or run `git remote add origin <url>` and then I can push for you.

Files of interest:
- `scripts/playwright_presentation_events_suite.js`
- `scripts/playwright_presentation_visual_check.js`
- `.github/workflows/e2e-presentation.yml`
- `artifacts/visual_presentation/breeding_baseline.png`
- `tasks/REFACTOR_PLAN_ENGINE_UI_SEPARATION_20260125.md` (updated with notes)

Suggested reviewers: @frontend-team, @ci-team
