const TurnPipeline = require('../../game/turn/turn_pipeline');

afterEach(() => {
  // Ensure require is restored if we altered it
  if (typeof global._originalRequire !== 'undefined') {
    global.require = global._originalRequire;
    delete global._originalRequire;
  }
});

test('applyTurnSafe works when require is not available (browser-like)', () => {
  // Simulate browser-like environment where specific schema modules are not available
  if (typeof global.require === 'function') {
    global._originalRequire = global.require;
    global.require = (path) => {
      if (path && (path.endsWith('/schema/state_validator') || path.endsWith("\\schema\\state_validator") || path.endsWith('/schema/result') || path.endsWith("\\schema\\result"))) {
        throw new Error('Cannot find module');
      }
      return global._originalRequire(path);
    };
  }

  const cs = { presentationEvents: [], turnIndex: 0 };
  const gs = { board: Array(8).fill(0).map(() => Array(8).fill(0)), currentPlayer: 1 };

  const res = TurnPipeline.applyTurnSafe(cs, gs, 'black', { type: 'pass' }, null, { currentStateVersion: 0 });
  console.log('applyTurnSafe res:', res);
  // Ensure applyTurnSafe returns a well-formed result even when schema modules are missing
  expect(res).toBeTruthy();
  expect(Array.isArray(res.events)).toBe(true);

});