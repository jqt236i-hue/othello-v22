# Testing

Run the default (fast) local checks:

1. Install dependencies:

```bash
npm ci
```

2. Run tests:

```bash
npm run test:quick
```

Notes:
- Tests use `jest` and are located under `tests/`.
- Some modules assume browser globals; tests are written for pure logic and use Node environment.
- CI is configured via `.github/workflows/ci.yml` to run `npm ci && npm test` on `push`/`pull_request`.

Quick local browser-init check:
- A lightweight helper `scripts/debug_browser_init.js` opens `http://localhost:8000`, captures the first red console error and the initial state snippet automatically. Run it after `npm run serve` to reproduce the init failure and collect the first-error + diagnostic snippet.

Minimal local verification sequence (recommended):
- npm run check:ui-writers
- npm run test:quick
- node scripts/debug_browser_init.js
- node scripts/playwright_cpu_fuzzer.js --iterations=6 --timeoutMs=30000 --injectMock=false --failOnFailure (short smoke run)

Optional (slower):
- npm run test:jest:changed
- npm run test:jest:coverage
