#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GLOB_DIR = path.join(ROOT, 'game');
const IGNORES = ['node_modules', '.git', 'artifacts'];
const PATTERNS = [
  'playDrawAnimation',
  'animateCardToCharge',
  'animateCardTransfer',
  // UI-only helpers that should be called via game/move-executor-visuals
  'animateFadeOutAt',
  'animateDestroyAt',
  'animateHyperactiveMove'
];

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const d of list) {
    if (IGNORES.includes(d.name)) continue;
    const full = path.join(dir, d.name);
    if (d.isDirectory()) {
      results.push(...walk(full));
    } else {
      if (/\.js$/.test(d.name)) results.push(full);
    }
  }
  return results;
}

const files = walk(GLOB_DIR).filter(p => !/move-executor-visuals\.js$/.test(p));

const matches = [];
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  const lines = txt.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    for (const p of PATTERNS) {
      // Match only standalone usages not preceded by '.' or common wrappers (mv., uiMv., __uiImpl, __uiImpl_move_exec_visuals, window., global.)
      const re = new RegExp("(^|[^.\w$])" + p + "\\b");
      if (re.test(l) && !/mv\.|uiMv\.|__uiImpl|__uiImpl_move_exec_visuals|window\.|global\./.test(l)) {
        matches.push({ file: f, line: i + 1, text: l.trim(), pattern: p });
      }
    }
  }
}

if (matches.length > 0) {
  console.error('[check_ui_direct_refs] Found direct UI reference(s) in game/');
  for (const m of matches) console.error(`${m.file}:${m.line}  [${m.pattern}] ${m.text}`);
  process.exit(2);
}
console.log('[check_ui_direct_refs] OK — no direct UI references found in game/');
process.exit(0);
