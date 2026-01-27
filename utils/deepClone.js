function detectUnsupported(val) {
  const t = Object.prototype.toString.call(val);
  if (t === '[object Map]' || t === '[object Set]' || t === '[object Function]') return true;
  if (val && typeof val === 'object') {
    if (Array.isArray(val)) {
      for (const v of val) if (detectUnsupported(v)) return true;
    } else {
      for (const k of Object.keys(val)) if (detectUnsupported(val[k])) return true;
    }
  }
  return false;
}

function deepClone(obj) {
  // Fail-fast on unsupported types for predictable behavior (always enforced)
  if (detectUnsupported(obj)) {
    throw new Error('deepClone: unsupported types (Map/Set/Function) present');
  }

  // Prefer structuredClone when available for fidelity
  if (typeof globalThis !== 'undefined' && typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(obj);
  }

  // JSON-safe fallback
  return JSON.parse(JSON.stringify(obj));
}

module.exports = deepClone;
