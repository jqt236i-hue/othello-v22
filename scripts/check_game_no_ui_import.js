const fs = require('fs');
const path = require('path');

function walk(dir, cb) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p, cb);
    else if (p.endsWith('.js')) cb(p);
  }
}

const root = path.resolve(__dirname, '..', 'game');
if (!fs.existsSync(root)) {
  console.error('game/ directory not found');
  process.exit(2);
}

// detect require('../ui') or require("../ui/..."), conservative match
const pattern = /require\(['"].*\b\/ui(\/|['"]).*\)?\)/g;
let found = false;
const matches = [];
walk(root, (p) => {
  const txt = fs.readFileSync(p, 'utf8');
  const lines = txt.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (line.match(/require\(['"].*\/ui/)) {
      found = true;
      matches.push({ file: p, line: idx + 1, text: line.trim() });
    }
  });
});

if (found) {
  console.error('\nERROR: `require(.../ui...)` detected under game/ (UI imports must be removed).');
  matches.forEach(m => console.error(`${m.file}:${m.line}    ${m.text}`));
  process.exit(2);
}

console.log('OK: No UI imports detected under game/');
process.exit(0);
