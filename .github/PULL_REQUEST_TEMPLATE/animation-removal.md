# Phase2: Remove legacy card animations (animations/*)

## Summary ✅
Remove legacy card animation files under `animations/` to consolidate visual playback into `AnimationEngine` and remove duplicate/unused code paths.
See `tasks/ANIMATION_REMOVAL_PR_PREP.md` for context and pre-checks.

---

## Files removed (git rm) 🗑️
- animations/card-animation-utils.js
- animations/card-animations-basic.js
- animations/card-charge-animations.js
- animations/card-deck-visuals.js
- animations/card-draw-flow.js
- animations/card-transfer-animations.js

> NOTE: These files are removed physically (no stubs remain).

---

## Pre-merge Checklist (required) ☑️
- [ ] Deleted file list above is accurate and matches this PR
- [ ] Confirm **reference-zero** for these files (run below grep and paste summary in "Grep results" section)
  - Grep command (example):
    - `git grep -n "playDrawAnimation\|animateCardTransfer\|animateCardToCharge\|updateDeckVisual\|card-fx-layer"`
  - Expected: only references are docs/metadata (e.g., `tasks/ANIMATION_RESET_DELETION_PLAN_20260121.md`, `scripts/linecounts_output.json`).
- [ ] Local test run: `npm run test:jest` — **all unit tests must pass locally**
- [ ] Local e2e-noanim smoke: `npm run test:e2e:noanim` — completes without errors


## CI Results (required) 📡
Paste CI job URLs / logs or screenshot links here after running PR CI:
- unit-normal: <CI job URL or status>
- unit-noanim: <CI job URL or status>
- e2e-noanim: <CI job URL or status>
- e2e-smoke: <CI job URL or status>


## Local commands to run (quick) ▶️
- Unit tests: `npm run test:jest`
- E2E (no-anim): `npm run test:e2e:noanim`
- Smoke headless: `npm test`


## Impact / Short Notes (why safe) 🔧
- `turn-manager.js`: added `typeof` guards and `window`-safe flag handling so removing animations will not cause runtime ReferenceErrors during init/reset.
- UI init/export: `ui/handlers/init.js` now guards `resetGame()` and exposes telemetry getters safely for tests and Playwright checks.
- `AnimationEngine` remains the single visual writer; production playback flows use `AnimationEngine.play()`.


## Merge condition (explicit) ⚠️
This PR can be merged only when ALL the following are true:
1. CI: **unit-normal**, **unit-noanim**, **e2e-noanim**, **e2e-smoke** are all green ✔️
2. Reference-zero confirmed for `animations/*` (grep results match the expectation above) ✔️
3. `e2e-noanim` job completes successfully (not just queued) ✔️


---

## Grep results (paste below)
Paste the output (or a short summary) from the grep command here:
```
# Example:
# tasks/ANIMATION_RESET_DELETION_PLAN_20260121.md: lines referencing old animation functions
# scripts/linecounts_output.json: metadata entries
```


## CI job links / evidence (paste below)
- unit-normal: 
- unit-noanim: 
- e2e-noanim: 
- e2e-smoke: 


---

## Phase2 - Next (not part of this PR) ➡️
- Remove `#card-fx-layer` DOM/CSS (confirm ref-zero → delete → run E2E smoke)
- Shrink `runMoveVisualSequence` to a deprecated shim (Phase3: removal)
- Remove any leftover `animations/*` stubs and supporting CSS/DOM (final cleanup)


---

> For background and full pre-checks, see `tasks/ANIMATION_REMOVAL_PR_PREP.md`. Attach the greps & CI links above when ready.
