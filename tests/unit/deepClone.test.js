const deepClone = require('../../utils/deepClone');

test('deepClone clones plain objects', () => {
  const obj = { a: 1, b: { c: 2 }, arr: [1, { x: 3 }] };
  const c = deepClone(obj);
  expect(c).not.toBe(obj);
  expect(c).toEqual(obj);
  c.b.c = 99;
  expect(obj.b.c).toBe(2);
});

test('deepClone rejects Map/Set/Function', () => {
  expect(() => deepClone(new Map())).toThrow(/unsupported types/);
  expect(() => deepClone(new Set())).toThrow(/unsupported types/);
  expect(() => deepClone({ fn: () => {} })).toThrow(/unsupported types/);
});
