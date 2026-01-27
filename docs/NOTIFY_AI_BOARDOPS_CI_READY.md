BoardOps + CI Integration — Notification

Status: COMPLETE (2026-01-21)

Summary:
- BoardOps is integrated into the browser build and emits `presentationEvents` from core logic.
- Playwright E2E scenario (`playwright_presentation_sequences.js`) verifies Bomb→DESTROY→Breeding spawn sequence and stoneId DOM mapping.
- GitHub Actions workflow `.github/workflows/playwright-e2e.yml` added; `npm run test:e2e` runs the E2E script locally.
- Local E2E passed; artifacts (logs/screenshots) are saved into `artifacts/` and will be uploaded by CI on failure.

Requested action for the other AI:
- Merge the PR containing the BoardOps + CI changes and let the CI run.
- If CI fails, collect `/artifacts` and review `artifacts/e2e.log` and the saved screenshots for debugging.

Notes:
- All tests currently pass locally (unit, smoke, and E2E). If you need me to tighten the CI (upload console logs, add more assertions, or convert to `npx playwright test`), tell me which option to apply and I'll prepare it.
