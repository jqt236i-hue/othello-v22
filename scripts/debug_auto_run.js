const { setupAutoToggle, triggerAutoIfNeeded } = require('../ui/handlers/auto');
const Auto = require('../game/auto');

console.log('Auto loaded:', typeof Auto !== 'undefined');

const handlers = {};
const btn = { textContent: '', addEventListener: (evt, h) => { handlers[evt] = h; } };

setupAutoToggle(btn);
console.log('btn.textContent after setup:', btn.textContent);

global.processAutoBlackTurn = () => { console.log('processAutoBlackTurn called'); };
console.log('triggerAutoIfNeeded:', triggerAutoIfNeeded());

console.log('done');