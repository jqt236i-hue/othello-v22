PR Draft: Animation Foundation (branch: feature/animation-foundation)

概要:
- Pipeline mapping: `CHANGE` presentation events are mapped to `flip` playback events (`game/turn/pipeline_ui_adapter.js`).
- Timers: Use game timers abstraction in `game/move-executor-visuals.js` fallback (no raw setTimeout).
- API shim: Added `ui/animation-api.js` as the canonical stub for animation APIs (no visual changes yet).
- Special-effects: Replaced direct UI helper calls with `emitPresentationEvent` calls in `game/special-effects/hyperactive.js` and `dragons.js` so UI handles visuals.
- Tests: Added unit tests validating mapping, timers abstraction usage, and that special-effects emit presentation events.

変更点のポイント:
- 既存のゲームロジックに直接DOM/timing呼び出しを入れない方針を守りつつ、UIが将来的にアニメーションを受け取れる土台を用意しました。
- すべての変更はテストとローカル実行でパスしています。

レビューチェックリスト (PR):
- [ ] All new/modified tests pass locally
- [ ] No new direct use of `setTimeout/setInterval/requestAnimationFrame` in `game/` (purity test)
- [ ] Changes documented in `docs/animation-refactor-execution.md` (progress updated)
- [ ] Add visual-diff tickets to follow-up PRs for actual animation addition

次作業 (PRに添える推奨作業):
1. Run CI with `check:game-purity` and insist it passes
2. Create small PR(s) to delete `animations/*` files after verifying no references
3. Add visual E2E (visual-diff) work for when animations are actually implemented

備考:
- Remote push is required to open the PR. The branch `feature/animation-foundation` exists locally. Run:
  - `git push -u origin feature/animation-foundation` (after adding remote)
  - Open PR with the above description and set reviewers

