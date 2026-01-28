#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'artifacts', 'animation_refs.json');
const IGNORES = ['node_modules', '.git', 'coverage', 'dist', 'artifacts', '_flatten_backup_20260127_131541'];

const KEYWORDS = [
  'animation', 'animate', 'fade', 'fade-out', 'fadeout', 'transition', 'opacity', 'transform', 'translate',
  'requestAnimationFrame', 'rAF', 'tween', 'gsap', 'velocity', 'anime', 'keyframes', '@keyframes', 'animation-name',
  'fade-in', 'fade-out', 'old-animation', 'legacy', 'DEPRECATED', 'REMOVED', 'no-anim'
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
      // only search text files
      if (/(\.js|\.ts|\.css|\.html|\.md|\.json|\.jsx|\.tsx)$/.test(d.name)) {
        results.push(full);
      }
    }
  }
  return results;
}

function searchFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    for (const kw of KEYWORDS) {
      if (l.indexOf(kw) !== -1) {
        hits.push({ line: i + 1, text: l.trim(), keyword: kw });
        break; // avoid duplicate hits on same line
      }
    }
  }
  if (hits.length) {
    return { file, hits };
  }
  return null;
}

function main() {
  const files = walk(ROOT);
  const found = [];
  for (const f of files) {
    const r = searchFile(f);
    if (r) found.push(r);
  }
  const summary = { generatedAt: new Date().toISOString(), count: found.length, entries: found };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log('Animation refs saved to', OUT);
  console.log('Matches:', found.length);
  // also print top 10 files
  for (let i = 0; i < Math.min(10, found.length); i++) {
    console.log(i + 1, found[i].file, '-', found[i].hits.length, 'hits');
  }
}

main();
