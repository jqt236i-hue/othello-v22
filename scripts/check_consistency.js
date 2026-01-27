/**
 * Consistency checks (safe / no game behavior changes).
 *
 * - Ensures `cards/catalog.json` and `cards/catalog.js` match.
 * - Ensures `shared-constants.js` card defs reflect the catalog.
 * - Ensures `SharedConstants.CARD_TYPES` covers all catalog types.
 *
 * Run: `node scripts/check_consistency.js`
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');

function normalizeFromJsonCard(c) {
  return {
    id: c.id,
    name: c.name_ja,
    type: c.type,
    cost: c.cost,
    desc: c.desc_ja
  };
}

function normalizeFromJsCard(c) {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    cost: c.cost,
    desc: c.desc
  };
}

function sortById(a, b) {
  return String(a.id).localeCompare(String(b.id));
}

function stableStringify(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function compareCardArrays(labelA, a, labelB, b, issues) {
  const aa = [...a].sort(sortById);
  const bb = [...b].sort(sortById);

  if (aa.length !== bb.length) {
    issues.push(`${labelA} count=${aa.length} != ${labelB} count=${bb.length}`);
  }

  const byIdA = new Map(aa.map(x => [x.id, x]));
  const byIdB = new Map(bb.map(x => [x.id, x]));

  const allIds = new Set([...byIdA.keys(), ...byIdB.keys()]);
  for (const id of [...allIds].sort()) {
    const ca = byIdA.get(id);
    const cb = byIdB.get(id);
    if (!ca) {
      issues.push(`Missing in ${labelA}: ${id}`);
      continue;
    }
    if (!cb) {
      issues.push(`Missing in ${labelB}: ${id}`);
      continue;
    }
    const sa = stableStringify(ca);
    const sb = stableStringify(cb);
    if (sa !== sb) {
      issues.push(`Mismatch for ${id}: ${labelA}=${sa} ${labelB}=${sb}`);
    }
  }
}

function loadCatalogJson() {
  const jsonPath = path.join(rootDir, 'cards', 'catalog.json');
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!raw || !Array.isArray(raw.cards)) {
    throw new Error('Invalid cards/catalog.json: expected { cards: [...] }');
  }
  return raw.cards.map(normalizeFromJsonCard);
}

function loadCatalogJs() {
  const jsPath = path.join(rootDir, 'cards', 'catalog.js');
  const code = fs.readFileSync(jsPath, 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'cards/catalog.js' });
  const catalog = context.window.CardCatalog;
  if (!catalog || !Array.isArray(catalog.cards)) {
    throw new Error('Invalid cards/catalog.js: expected window.CardCatalog.cards');
  }
  return catalog.cards.map(normalizeFromJsCard);
}

function loadSharedConstantsCards() {
  // This module prefers catalog.json in Node, so this check validates the load path too.
  // eslint-disable-next-line global-require
  const Shared = require(path.join(rootDir, 'shared-constants.js'));
  if (!Shared || !Array.isArray(Shared.CARD_DEFS)) {
    throw new Error('Invalid shared-constants.js export: expected CARD_DEFS[]');
  }
  return { Shared, cards: Shared.CARD_DEFS.map(c => ({ id: c.id, name: c.name, type: c.type, cost: c.cost, desc: c.desc })) };
}

function main() {
  const issues = [];

  const jsonCards = loadCatalogJson();
  const jsCards = loadCatalogJs();
  compareCardArrays('catalog.json', jsonCards, 'catalog.js', jsCards, issues);

  const { Shared, cards: sharedCards } = loadSharedConstantsCards();
  compareCardArrays('catalog.json', jsonCards, 'SharedConstants.CARD_DEFS', sharedCards, issues);

  const catalogTypes = new Set(jsonCards.map(c => c.type));
  const typeList = new Set(Array.isArray(Shared.CARD_TYPES) ? Shared.CARD_TYPES : []);
  for (const t of [...catalogTypes].sort()) {
    if (!typeList.has(t)) {
      issues.push(`SharedConstants.CARD_TYPES missing: ${t}`);
    }
  }

  const reportPath = path.join(rootDir, 'inconsistencies_report.md');
  const lines = [];
  lines.push('# Consistency Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  if (issues.length === 0) {
    lines.push('✅ No inconsistencies found.');
  } else {
    lines.push(`❌ Inconsistencies found: ${issues.length}`);
    lines.push('');
    for (const it of issues) lines.push(`- ${it}`);
  }
  fs.writeFileSync(reportPath, lines.join('\n') + '\n', 'utf8');

  if (issues.length) {
    console.error(`[check_consistency] FAIL (${issues.length}) - see inconsistencies_report.md`);
    process.exitCode = 1;
  } else {
    console.log('[check_consistency] OK');
  }
}

if (require.main === module) {
  main();
}

