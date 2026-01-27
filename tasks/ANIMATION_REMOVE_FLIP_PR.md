# PR Draft: Suppress `flip` animations (visual-only)

## Summary
This PR suppresses the UI-only `flip` animation class from being added during gameplay flows (breeding flips, dragon conversions, hyperactive flips, etc.). The change is strictly visual-only: game rules and state transitions are unchanged. Tests and a Playwright regression harness ensure no `flip` classes are created during the affected flows.

## Changes
- Remove `classList.add('flip')` occurrences and centralize suppression in helpers.
- Remove redundant `breeding-spawn` class/opacity manipulation in move-executor and breeding handlers (timing preserved).
- Add unit test: `tests/unit/flip_suppression.test.js` to assert suppression.
- Add unit test: `tests/unit/no_breeding_spawn_class.test.js` to assert breeding spawn no longer toggles `breeding-spawn`.
- Add E2E regression: `scripts/playwright_no_flip_regression.js` that fails if a flip class is observed during flows.
- Add `npm run test:e2e:flip-suppression` to exercise the regression.
- **Stage 1 (this PR):** Comment out `.disc.flip` CSS and `@keyframes flipDisc` to disable flip visuals while keeping code discoverable.
- **Stage 2 (follow-up):** After visual verification, delete the commented CSS blocks and remove any remaining references; add screenshot-based visual diff if desired.

## Work completed in this branch
- Removed redundant `.breeding-spawn` class/opacity operations in JS (preserved pacing) and centralized flip suppression in `dragons.js` to use `applyFlipAnimations`.
- Added `tests/unit/no_breeding_spawn_class.test.js` and related stubs to assert behavior.
- Ran unit tests (`npm run test:jest`) and E2E flip-suppression (`npm run test:e2e:flip-suppression`) — both pass locally.
- Committed changes; branch ready to push and open PR for review.

## Why
- Prevents stale/leftover flip animations from firing after prior animation removal work (opacity/overlay removal).
- Preserves game logic; reduces visual churn and accessibility issues.

## Testing checklist (to run locally / CI)
- [ ] `npm run test:jest` (unit tests)
- [ ] `npm run test:e2e:flip-suppression` (Playwright regression)
- [ ] `npm run test:e2e` (full e2e matrix) if needed

## Rollback
- Reintroduce flip-class adds or revert this branch if a regression PDF/visual mismatch occurs.

---

Please review: I can open a PR (branch + push) if you'd like or prepare the final PR body for you to paste.