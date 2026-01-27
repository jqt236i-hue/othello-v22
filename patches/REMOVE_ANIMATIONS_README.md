Phase2: Physical removal of legacy `animations/*` (card visuals)

Purpose
-------
This patch permanently deletes the legacy animation files that were stubbed during Phase1. The goal is "reference-zero": no remaining runtime references in source code paths. CI must pass before merging.

Files removed
-------------
- animations/card-animation-utils.js
- animations/card-animations-basic.js
- animations/card-charge-animations.js
- animations/card-deck-visuals.js
- animations/card-draw-flow.js
- animations/card-transfer-animations.js

How to apply (local steps)
-------------------------
1. Ensure your working tree is clean:
   git status

2. Create feature branch:
   git checkout -b remove/phase2-remove-animations

3. Apply patch file (this repo includes `patches/0001-remove-animations-phase2.patch`):
   git apply patches/0001-remove-animations-phase2.patch

4. Stage deletions and commit:
   git add -A
   git commit -m "chore: Phase2 remove legacy animations/* (card visuals)"

5. Run local tests (must pass before pushing):
   npm run test:jest
   npm run test:e2e:noanim
   npm run test:e2e  # optional / heavy; CI will run smoke suites too

6. Run verification script (optional but recommended):
   ./patches/verify-remove-animations.sh

7. Push branch and open PR using the template `.github/PULL_REQUEST_TEMPLATE/animation-removal.md`.

Grep commands and expected results
---------------------------------
These commands help confirm "reference-zero" in runtime source paths.

- Search by filename:
  grep -R --line-number "card-draw-flow" game/ ui/ cards/ || true
  grep -R --line-number "card-animations-basic" game/ ui/ cards/ || true

Expected: No matches (exit 1 / no lines printed). If matches exist, they should only be in docs, tests, or the `patches/` folder.

- Search for any mention of the animations directory (broader):
  grep -R --line-number "animations/" --exclude-dir=node_modules || true

Expected: Ideally no matches in `game/`, `ui/`, `cards/` or `index.html`. Some matches may exist in `tasks/` or `patches/` and are acceptable as documentation.

Notes
-----
- This is a destructive change; the project policy prefers deletion over long-lived stubs to avoid future regressions.
- If CI shows missing references in `unit-noanim` or `e2e-noanim`, fix by replacing references with AnimationEngine-compatible calls before merging.
- See `tasks/ANIMATION_REMOVAL_PR_PREP.md` for a pre-PR checklist and grep outputs captured during the Phase2 readiness run.
