const { execSync } = require('child_process');

describe('UI writers static check', () => {
  test('move-executor no longer calls UI CardLogic onTurnEnd and turn-manager no longer calls CardLogic.onTurnStart', () => {
    let out = '';
    try {
      out = execSync('node scripts/check_ui_calls.js', { cwd: process.cwd(), encoding: 'utf8' });
    } catch (e) {
      out = e.stdout || e.stderr || e.message;
    }
    expect(out).not.toMatch(/move-executor\.js[\s\S]*onTurnEnd/);
    expect(out).not.toMatch(/turn-manager\.js[\s\S]*onTurnStart/);
  }, 10000);
});