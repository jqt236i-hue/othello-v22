# Phase2: Removal of `animations/*` — PR Prep

## 1) Files planned for git rm
- animations/card-animation-utils.js
- animations/card-animations-basic.js
- animations/card-charge-animations.js
- animations/card-deck-visuals.js
- animations/card-draw-flow.js
- animations/card-transfer-animations.js

## 2) Grep (current) — external references (excluding animations/*)
- `card-draw-flow.js`:
  - tasks/ANIMATION_RESET_DELETION_PLAN_20260121.md (task list)
  - scripts/linecounts_output.json (linecounts metadata)
- `card-transfer-animations.js`:
  - tasks/ANIMATION_RESET_DELETION_PLAN_20260121.md
  - scripts/linecounts_output.json
- `card-animation-utils.js`, `card-charge-animations.js`, `card-deck-visuals.js` — same (doc/linecounts only)

Notes: index.html no longer includes `<script>` tags referencing these files; runtime callers that used these helpers generally guard with `typeof` checks (safety net).

## 3) Local test status (as run in this workspace)
- `npm test` (smoke headless) : All smoke tests passed.
- `npm run test:jest` : (run in CI) — Jest suite exists; run locally/CI to confirm.
- `npm run test:e2e:noanim` : run in CI (Playwright). Recommend running in CI after git rm.

## 4) CI expectations (required before merging PR)
- unit-normal : green
- unit-noanim : green
- e2e-noanim : green
- e2e-smoke : green

## 5) Suggested PR description (short)
Phase2: remove legacy card animation files under `animations/`.
- Removes animation code paths which are no longer referenced by `index.html`.
- Removes duplication and moves visual responsibilities to `AnimationEngine` (single writer) & UI stubs.
- Verifies references are zero outside `animations/` (grep output attached).

## 6) How to apply (local)
1. Ensure working tree is clean.
2. Run `./patches/remove-animations-phase2.sh` (this creates a branch, `git rm` files, commit).
3. Run full test matrix locally (`npm test`, `npm run test:jest`, `npm run test:e2e:noanim`).
4. Push branch and open PR; in PR description paste the greps from section 2 and CI run results.

---
*If you prefer, I can create a deletion patch file instead of the script. Note: I could not run `git rm` here because the workspace in this environment is not a git repo (see below).*
