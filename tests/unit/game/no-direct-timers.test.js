const fs = require('fs');
const path = require('path');

describe('game layer purity - no direct timing APIs', () => {
    test('no direct setTimeout/setInterval/requestAnimationFrame in game source files', () => {
        const root = path.resolve(__dirname, '../../../game');
        const jsFiles = (function list(dir) {
            let res = [];
            for (const f of fs.readdirSync(dir)) {
                const fp = path.join(dir, f);
                if (fs.statSync(fp).isDirectory()) res = res.concat(list(fp));
                else if (fp.endsWith('.js')) res.push(fp);
            }
            return res;
        })(root);

        const occurrences = [];
        for (const file of jsFiles) {
            const txt = fs.readFileSync(file, 'utf8');
            const re = /\bsetTimeout\s*\(|\bsetInterval\s*\(|\brequestAnimationFrame\s*\(/g;
            let m;
            while ((m = re.exec(txt)) !== null) {
                occurrences.push({ file, index: m.index, snippet: txt.substr(Math.max(0, m.index-40), 120).replace(/\s+/g, ' ') });
            }
        }

        if (occurrences.length > 0) {
            const lines = occurrences.map(o => `${o.file}: ... ${o.snippet}`);
            // Fail with helpful message
            throw new Error(`Direct timing API found in game/ files:\n${lines.join('\n')}`);
        }
    });
});
