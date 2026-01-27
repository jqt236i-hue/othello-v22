const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const scriptSrcs = Array.from(indexHtml.matchAll(/<script\s+src="([^"]+)"/g)).map(m => m[1]);

console.log('Found', scriptSrcs.length, 'script tags.');

for (const src of scriptSrcs) {
  const filePath = path.join(root, src.replace('/', path.sep));
  if (!fs.existsSync(filePath)) {
    console.warn('[MISSING]', src, '->', filePath, 'not found');
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    // Quick syntax check by attempting to compile the script as a function body
    // (This will throw if there are top-level invalid statements like `return`)
    new Function(content);
  } catch (e) {
    console.error('\n=== SYNTAX ERROR DETECTED ===');
    console.error('file:', src);
    console.error('message:', e && e.message);
    // Heuristic: find first 'return' occurrence to estimate line number
    const lines = content.split(/\r?\n/);
    let foundLine = null;
    for (let i = 0; i < lines.length; i++) {
      if (/\breturn\b/.test(lines[i])) { foundLine = i + 1; break; }
    }
    if (foundLine) {
      console.error('heuristic: first `return` at line', foundLine, '->', lines[foundLine - 1].trim());
    } else {
      console.error('heuristic: no `return` token found; consider manual inspection');
    }
    // Also try to detect duplicate var declarations that may cause "Identifier ... already been declared"
    const varMatches = content.match(/\b(var|let|const)\s+(isProcessing|isCardAnimating)\b/g);
    if (varMatches) console.error('found declarations:', varMatches.join(', '));
    process.exit(1);
  }
}
console.log('No top-level syntax errors detected by quick check.');
