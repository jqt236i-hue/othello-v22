#!/usr/bin/env bash
# Phase2 removal helper: removes animations/* files and prepares a branch/commit for PR
# USAGE: run this in your local git repo (root of project)
# 1) Make sure your working tree is clean
# 2) ./patches/remove-animations-phase2.sh

set -euo pipefail

BRANCH=${1:-remove/phase2-remove-animations}
FILES=( \
  animations/card-animation-utils.js \
  animations/card-animations-basic.js \
  animations/card-charge-animations.js \
  animations/card-deck-visuals.js \
  animations/card-draw-flow.js \
  animations/card-transfer-animations.js \
)

echo "Creating branch: $BRANCH"
git checkout -b "$BRANCH"

echo "Removing animation files:"
for f in "${FILES[@]}"; do
  echo " - $f"
  git rm -f -- "$f"
done

git commit -m "Phase2: remove animations/* (card visuals) — prepare for Phase2 cleanup"

echo "Run tests locally:"
echo "  npm test"
echo "  npm run test:jest"
echo "  npm run test:e2e:noanim"
echo "  npm run test:e2e (optional/CI)"

echo "If tests pass, push branch and open PR: git push origin $BRANCH"

echo "Helper script complete."
