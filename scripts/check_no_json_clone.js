const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '..', 'game', 'turn');
if (!fs.existsSync(target)) {
  console.error('game/turn not found');
  process.exit(2);
}

const pattern = /JSON\.parse\(JSON\.stringify\(/g;
let found = false;
const matches = [];

function walk(dir, cb) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p, cb);
    else if (p.endsWith('.js')) cb(p);
  }
}

walk(target, (p) => {
  const txt = fs.readFileSync(p, 'utf8');
  const lines = txt.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (pattern.test(line)) {
      found = true;
      matches.push({ file: p, line: idx + 1, text: line.trim() });
    }
  });
});

if (found) {
  console.error('\nERROR: JSON.parse(JSON.stringify(...)) detected under game/turn. Replace with utils/deepClone.js');
  matches.forEach(m => console.error(`${m.file}:${m.line}    ${m.text}`));
  process.exit(2);
}

console.log('OK: No JSON clone usage detected under game/turn');
process.exit(0);
