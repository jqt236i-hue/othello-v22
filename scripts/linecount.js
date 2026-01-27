const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const excludePatterns = ['node_modules', 'coverage', 'assets', 'archive', '.git'];
const ext = '.js';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        const rel = path.relative(root, full);
        if (excludePatterns.some(p => rel.split(path.sep).includes(p))) continue;
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(full));
        } else {
            if (path.extname(full) === ext) results.push(full);
        }
    }
    return results;
}

const files = walk(root);
const arr = files.map(f => {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split(/\r?\n/).length;
    return { path: path.relative(root, f), lines };
});

arr.sort((a,b) => b.lines - a.lines);
fs.writeFileSync(path.join(__dirname,'linecounts_output.json'), JSON.stringify(arr, null, 2), 'utf8');
console.log('WROTE linecounts_output.json');
