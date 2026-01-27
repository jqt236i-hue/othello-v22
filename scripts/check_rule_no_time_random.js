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

const targets = [
  path.resolve(__dirname, '..', 'game', 'turn'),
  path.resolve(__dirname, '..', 'game', 'logic')
];
const pattern = /(Math\.random\(|Date\.now\()/g;
let found = false;
const matches = [];

for (const root of targets) {
  if (!fs.existsSync(root)) continue;
  walk(root, (p) => {
    const txt = fs.readFileSync(p, 'utf8');
    const lines = txt.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (pattern.test(line)) {
        found = true;
        matches.push({ file: p, line: idx + 1, text: line.trim() });
      }
    });
  });
}

if (found) {
  console.error('\nERROR: Math.random()/Date.now() usage detected under rule layer (game/turn or game/logic).');
  matches.forEach(m => console.error(`${m.file}:${m.line}    ${m.text}`));
  process.exit(2);
}

console.log('OK: No Math.random/Date.now usage detected under rule layer');
process.exit(0);
