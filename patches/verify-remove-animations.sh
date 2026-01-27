#!/usr/bin/env bash
# Verify there are no remaining references to removed animation files
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "$(pwd)")
# Directories to scan for runtime references (source + ui + cards + game)
SCANDIRS=( "game" "ui" "cards" "index.html" "scripts" )

PATTERNS=(
  "card-draw-flow"
  "card-transfer-animations"
  "card-animations-basic"
  "card-charge-animations"
  "card-deck-visuals"
  "card-animation-utils"
  "animations/"
)

echo "Scanning for references to removed animation files..."
FAIL=0
for p in "${PATTERNS[@]}"; do
  echo " - Searching for: $p"
  if grep -R --line-number --exclude-dir=node_modules --exclude-dir=coverage -- "${p}" "${SCANDIRS[@]}"; then
    echo "  -> FOUND references to '$p' in source paths above. Make sure these are only in docs/tasks/tests before proceeding." >&2
    FAIL=1
  else
    echo "  -> OK (no matches)"
  fi
done

if [ "$FAIL" -ne 0 ]; then
  echo "One or more references remain. Please review the grep output and remove/replace references before merging." >&2
  exit 2
fi

echo "Reference scan OK. You should now run tests to verify no runtime regressions:"
echo "  npm run test:jest"
echo "  npm run test:e2e:noanim"
echo "  npm run test:e2e  # optional/CI"

echo "If tests pass, commit the deletions and open the PR using .github/PULL_REQUEST_TEMPLATE/animation-removal.md"

exit 0
