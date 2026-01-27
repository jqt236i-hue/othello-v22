#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Config: file globs to scan (relative to repo root)
const ROOT = path.resolve(__dirname, '..');
// Focused detection scope: only UI-facing files where rule-writer calls are disallowed.
const SCAN_PATHS = [
  'ui.js',
  'ui',
  'game/move-executor.js',
  'game/move-executor-visuals.js',
  'game/turn-manager.js',
  'game/pass-handler.js',
  'game/card-effects/destroy.js',
  'game/card-effects/placement.js',
  'game/special-effects/bombs.js',
  'game/special-effects/hyperactive.js',
  'game/special-effects/dragons.js'
];

// Blacklisted CardLogic methods that are considered rule-writers / direct mutators
const BLACKLIST = [
  'onTurnEnd',
  'onTurnStart',
  'tickBombs',
  'processBombs',
  'processHyperactiveMoves',
  'applyDestroyEffect',
  'applyPlacementEffects',
  'applySwapEffect',
  'applyRegenAfterFlips'
];

// Use a non-global regex for per-line checks to avoid lastIndex state issues
const blacklistRegex = new RegExp('CardLogic\\.(' + BLACKLIST.join('|') + ')');// Detect direct state writes to rule state from UI modules (e.g., cardState.charge = ...)
const stateWriteRegex = new RegExp('(cardState|gameState)\.[A-Za-z0-9_$]+\s*=');
function walk(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(full));
    else files.push(full);
  }
  return files;
}

function scanFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const results = [];
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = blacklistRegex.exec(lines[i]);
    if (m) {
      results.push({ line: i + 1, fn: m[1], text: lines[i].trim() });
      continue;
    }
    const w = stateWriteRegex.exec(lines[i]);
    if (w) {
      results.push({ line: i + 1, fn: 'STATE_WRITE', text: lines[i].trim() });
    }
  }
  return results;
}

let violations = [];

for (const p of SCAN_PATHS) {
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs)) continue;
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) {
    const files = walk(abs).filter(f => f.endsWith('.js'));
    for (const f of files) {
      const res = scanFile(f);
      if (res.length) violations.push({ file: path.relative(process.cwd(), f), matches: res });
    }
  } else if (stat.isFile()) {
    if (abs.endsWith('.js')) {
      const res = scanFile(abs);
      if (res.length) violations.push({ file: path.relative(process.cwd(), abs), matches: res });
    }
  }
}

if (violations.length === 0) {
  console.log('✅ No UI-side CardLogic rule-writer calls detected in scan scope.');
  process.exit(0);
}

console.error('❌ Detected CardLogic rule-writer calls in UI/game scan scope:');
for (const v of violations) {
  console.error('\n-- ' + v.file);
  for (const m of v.matches) {
    console.error(`  L${m.line}: ${m.fn} -> ${m.text}`);
  }
}

console.error('\nAction required: Review each location and either move the logic into the pipeline (preferred) or whitelist this call with a comment: // allowed-ui-rule-call <reason>');
process.exit(1);
