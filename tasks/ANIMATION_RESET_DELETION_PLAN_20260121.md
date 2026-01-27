# アニメーション系ロジック削除（リセット）計画書（ブラウザ版）

作成日: 2026-01-21

## 0. 目的 / 背景
- ブラウザ版で「カード効果に伴うアニメーション」起因のバグが多発している。
- 20種類のカードを個別に直すより、**アニメーション系の実装を一旦リセット（安全に無効化→削除）**し、後から再構築できる状態にする。
- ルール処理（TurnPipeline / CardLogic / CoreLogic）は一次情報（01-rulebook.md）に従う。UI/演出は `eventLog` から派生させ、状態を書き換えない（AGENTS.md準拠）。

## 1. 非交渉の安全要件（Invariants）
- ルールエンジンの状態遷移は維持: 盤面、チャージ、カード使用制約、終了判定は変更しない。
- `eventLog` は一次情報（演出は派生）。演出削除で `events[]` の生成・記録が壊れないこと。
- Destroy と Flip の区別、チャージ加算（Flipのみ）は維持。
- UI側の削除は「視覚・入力ロック・待ち時間」に限定し、ロジック層に副作用を持ち込まない。

## 2. 対象範囲の定義（今回消すもの / 残すもの）

### 2.1 今回「削除対象」とする候補（アニメーション/演出層）
**カードの飛翔/配布/チャージ等の演出**
- animations/ 以下（カードFX）
  - animations/card-animation-utils.js
  - animations/card-animations-basic.js
  - animations/card-charge-animations.js
  - animations/card-deck-visuals.js
  - animations/card-draw-flow.js
  - animations/card-transfer-animations.js

**盤面アニメーション（PlaybackEngine/手/破壊/フェード等）**
- ui/animation-engine.js（PlaybackEngine）
- constants/animation-constants.js（AnimationConstants）
- ui/animation-utils.js（animateDestroyAt / animateFadeOutAt / playHandAnimation 等）
- ui/stone-visuals.js（crossfadeStoneVisual）

**アニメーション用CSS/DOMレイヤ**
- styles-animations.css
- index.html の `#card-fx-layer` / `#handLayer`（アニメーション用DOM）

### 2.2 原則「削除しない」もの（静的UI or ルール/状態表示）
- TurnPipeline / CardLogic / CoreLogic（ゲームルール）
- ui/board-renderer.js 等の静的レンダリング（石を表示し、クリックできる最低限）
- game/turn/pipeline_ui_adapter.js（※ただし最終段階で「PlaybackEvents を不要化」できれば削除候補）
- game/visual-effects-map.js（※アニメではなく“見た目”だが、リセット範囲を拡大する場合は別途計画）

> 注: バグ原因が「アニメーション」と「石ビジュアル（特殊石の画像適用）」の相互作用の場合があるため、
> **(A) 動きだけ消す** と **(B) 動き+特殊石ビジュアルも消す** の2段階で切り戻せるようにする。

## 3. 事前準備（削除前に必ずやる）

### 3.1 ブランチ/復旧策
- 作業は専用ブランチ（例: `reset/visual-layer`）で実施。
- 小さいステップでコミット（または作業ログ）を残す。
- 失敗時に即戻せること（1〜2コミット戻しで起動できる状態）。

### 3.2 “削除の前に無効化” を必須にする（安全弁）
**いきなりファイル削除しない。**
1) まず実行時フラグで完全にアニメを無効化し、ゲームが動く状態を作る。
2) その後に参照を外し、最後にファイルを削除。

理由:
- 参照箇所が多く、グローバル関数（例: `playHandAnimation`）の有無で分岐しているため。
- 先に無効化して「動作が安定するか」を検証してから削除すると、原因切り分けとロールバックが容易。

### 3.3 CI/ローカル検証コマンド
- `npm run check:consistency`
- `npm run test:jest`
- `npm test`（headless smoke）
- 可能なら `npm run test:e2e`

## 4. 依存関係の現状（削除が波及する主要ポイント）

### 4.1 起動時ロード（index.html）
- CSS: styles-animations.css を読み込み。
- JS: constants/animation-constants.js, ui/animation-utils.js, ui/stone-visuals.js, ui/animation-engine.js, animations/* を読み込み。

### 4.2 主要な実行経路
- ゲーム進行: game/move-executor.js が TurnPipelineUIAdapter を使い、`playbackEvents` を `AnimationEngine.play()` に渡す。
- ターン開始: game/turn-manager.js が `runTurnStartWithAdapter()` → `AnimationEngine.play()`。
- 盤面クリック: game/turn-manager.js が `playHandAnimation()` を呼ぶ。
- 特殊効果: game/special-effects/* と game/card-effects/* が `animateFadeOutAt` / `animateDestroyAt` / `crossfadeStoneVisual` を呼ぶ。

### 4.3 UI入力ロック（isCardAnimating / isProcessing）
- 多数モジュールが `isCardAnimating` を参照し、操作禁止/CPU待機/描画スキップに使用。
- アニメ削除後は **isCardAnimating が常に false で安全**、かつ **CPU/Autoが暴走しない** ように調整が必要。

## 5. 実行計画（フェーズ分割）

以下は「常に起動可能」を保つための段階的手順。

### フェーズ0: ベースライン固定
- 現状で全テストを実行し、結果を保存（失敗があるなら“既知の失敗”として記録）。
- ブラウザで最低限の手動スモーク:
  - ゲーム開始→数手置ける
  - カードを1枚使用できる
  - パス/終了まで進行できる

完了条件:
- 以降の変更で「増えた失敗」を追跡できる。

---

### フェーズ1: まず“無効化モード（No-Animation）”を導入
**目的:** ファイル削除前に、実行時にアニメを完全停止できる安全弁を作る。

必須追加（設計固定）:
- Canonical Contract v2.0.1 を遵守（events[] が一次情報）。UI の状態推測は禁止。
- 再生中の full rerender を禁止（Single Visual Writer の原則）。
- VisualPlaybackActive を唯一の真として管理し、AnimationEngine.play の最外周で try/finally により `true/false` を保証する（noanim も同経路を通す）。
- Watchdog は再生期間中に必ず動作し、発火時は `TimerRegistry.clearScope()` (または clearAll)、`emitBoardUpdate()`、`VisualPlaybackActive=false` を確実に行う。
- Single Visual Writer 検知は dev で即 throw、prod で error log + 再生中止→最終状態へ即時同期（renderBoard/renderBoardDiff/盤面直叩き補助の優先）
- TimerRegistry は再生単位で切れるように `newScope()/clearScope()` を導入（当面 clearAll で代替可能だが早期スコープ化推奨）。

やること（例）:
- `window.DISABLE_ANIMATIONS = true`（クエリ `?noanim=1` 等でON）を導入。
- 入口関数をすべて no-op 化（ただし noanim でも AnimationEngine.play の経路を通し、待機は即時完了する実装）：
  - `AnimationEngine.play(events)` → 通常経路だが待機は即時（Promise即解決）
  - `playHandAnimation()` → 即 `onComplete()`（isCardAnimating を立てない）
  - `animateFadeOutAt()` / `animateDestroyAt()` → 即 resolve
  - `crossfadeStoneVisual()` → 即時に最終状態へ同期（または no-op）
  - `playDrawAnimation()` / カード飛翔系 → 即 resolve
- `isCardAnimating` を no-anim 中は常に false を保ち、CPU/Auto のデッドロックを防ぐ。

完了条件:
- `?noanim=1` でブラウザ実行してもゲーム進行が成立。
- テストが通る（または差分が意図通りで説明可能）。
- Phase1 の必須受け入れ条件（noanim で代表カードを含む手が完走、TimerRegistry.pending=0、再生中 full rerender 発生ゼロ）が満たされること。
---

### フェーズ2: カード系アニメーション（animations/）の参照を外す
**目的:** カード演出を無くしてもゲーム進行が壊れない状態にする。

手順:
1) index.html から animations/* の `<script>` を外す。
2) それに依存する呼び出し側（例: `dealInitialCards()` / `playDrawAnimation()` / `updateDeckVisual()`）を
   - 無効化モードなら即時処理
   - 非無効化でも「関数が無いなら即時処理」
   に統一する。
3) DOM `#card-fx-layer` を削除するか、残しても副作用がないようにする（CSSも含めて整理）。

完了条件:
- カード使用/ドロー/捨て札等が “演出なし” で成立する。

---

### フェーズ3: PlaybackEngine（ui/animation-engine.js）を外す
**目的:** `playbackEvents` 再生の中核を停止し、状態同期を静的レンダリング一本にする。

手順（安全順）:
1) game/move-executor.js と game/turn-manager.js で `AnimationEngine.play()` を呼ぶ部分を
   - No-Animation では呼ばない
   - 最終的には「呼ばない」
   に変更。
2) `playbackEvents` が無い/不要でも `TurnPipelineUIAdapter` の戻り値処理が成立するようにする。
   - 例: `TurnPipelineUIAdapter.runTurnWithAdapter()` は state 更新だけ使い、`playbackEvents` は捨てる。
3) ここまでできたら index.html から ui/animation-engine.js と constants/animation-constants.js を外す。

完了条件:
- カード効果（爆弾/ドラゴン等）による盤面変化が「即時反映」で見える。

---

### フェーズ4: 盤面アニメ系ユーティリティ（ui/animation-utils.js / ui/stone-visuals.js）を外す
**目的:** `animateFadeOutAt` / `crossfadeStoneVisual` などを呼ぶ側を整理し、演出依存を消す。

手順:
1) game/special-effects/* と game/card-effects/* の呼び出しを
   - 演出関数が無い前提に変更（状態更新→`emitBoardUpdate()` に一本化）
2) `isCardAnimating` フラグの用途を縮小（ロック不要に）。
3) index.html から ui/animation-utils.js / ui/stone-visuals.js を外す。

完了条件:
- 特殊効果処理が UI を待たずに完走し、ターンが進む。
- フリーズ監視（watchdog）が頻繁に発火しない。

---

### フェーズ5: CSS/DOMの掃除（残骸除去）
**目的:** アニメーション関連CSS・DOMが残って誤作動しないようにする。

候補:
- styles-animations.css の削除、index.html の `<link>` 解除。
- `#handLayer`（石を持つ手）を削除する場合は、クリック→置くのUIが動くように代替（即時配置のみ）。
- styles-board.css 内の `@keyframes flipDisc` など、アニメ依存クラスの削除。

完了条件:
- CSSや未使用DOMが原因のクリック不能・重なり・z-index問題が消える。

---

### フェーズ6: ファイル削除（物理削除）
**目的:** 参照が完全に外れていることを確認してから削除。

削除前チェック:
- `grep` で参照がゼロ（`AnimationEngine`, `playHandAnimation`, `animateFadeOutAt`, `crossfadeStoneVisual`, `card-fx-layer` 等）。
- `index.html` に script/link の残りがない。

削除対象（最終候補）:
- animations/*
- ui/animation-engine.js
- ui/animation-utils.js
- ui/stone-visuals.js
- constants/animation-constants.js
- styles-animations.css

完了条件:
- ブラウザ版が起動し、カード/特殊効果込みで最後までプレイできる。

## 6. 追加の注意点（よくある事故ポイント）

### 6.1 「待ち時間」をアニメと一緒に消すとCPU/Autoが暴走し得る
- 現状、CPU処理やターン遷移で `setTimeout` を使っている。
- アニメを消す場合でも、
  - UX目的の遅延は最小限残す
  - または delay=0 にする代わりに “1ターン1回だけ処理” のガードを強化
  のどちらかが必要。

### 6.2 isCardAnimating が true のままになると詰む
- 入口で必ず `try/finally` で false に戻す。
- 無効化モードでは “基本 true にしない” を徹底。

### 6.3 特殊石ビジュアル（workStone等）とアニメの混線
- `ensureWorkVisualsApplied` / MutationObserver 等があり、DOM変化をトリガに再適用が走る。
- アニメ削除と同時に消すと原因切り分けが難しくなるため、
  - まず動きだけ停止
  - その後、必要ならビジュアル系も整理
  を推奨。

## 7. 受け入れ基準（この計画のゴール）
- アニメーション関連ファイルが参照ゼロで削除できる。
- ルール挙動（チャージ/反転/破壊/終了判定）が変わらない。
- ブラウザ版で「カード使用→盤面変化→次ターン」が必ず進む（フリーズしない）。

## 8. 次のアクション（この計画の実施順）
以下は **Phase1 の実装順（固定）** です。各ステップは小さなコミットで段階的に適用し、CI を通して安全性を確認します。

1) `ui/animation-engine.js`：noanim 即時解決＋watchdog（デフォルト 10000ms、可設定）＋VisualPlaybackActive 管理（try/finally）
2) Single Visual Writer 検知：`ui.js.renderBoard()` / `ui/diff-renderer.js.renderBoardDiff()` / 盤面直叩き補助関数に検知を追加。（dev: throw / prod: log + abortAndSync）
3) `game/move-executor-visuals.js`：noanim 即時化 + TimerRegistry 置換（呼び出し側は await を期待）※最終的には削除予定
4) Unit テスト（engine noanim / single-writer）を追加
5) E2E（noanim）を追加: `index.html?noanim=1` で代表シナリオ（通常手＋代表カード2つ）を実行し、pending=0 を検証
6) CI に noanim ジョブを統合（unit + e2e） — PR マージ前のゲートに設定

注: `runMoveVisualSequence` の扱い
- 既存の `runMoveVisualSequence` は当面残すが、`move-executor.js` は優先的に `res.playbackEvents` を `AnimationEngine.play()` に委譲するように変更済み。最終段階で `runMoveVisualSequence` を削除し、演出経路を `eventLog → PlaybackEvents → AnimationEngine.play()` に一本化します。
