# 盤面アニメーション（石の移動/反転/消滅）分離・追加：実行計画書 v2

最終更新: 2026-01-28

## 目的
- 盤面で起こる石の動き（多動石の移動・破壊のフェードアウト・反転モーション等）を **ゲームロジックから分離**して実装できる状態にする。
- 「古いアニメーション実装の残骸」が混ざって二重実装にならないように、現状を棚卸しして整理する。

## 前提（このリポジトリの設計方針）
- `game/**` はブラウザAPI/時間APIに依存しない（`.github/instructions/game-layer.instructions.md`）。
- 視覚演出は `presentationEvents[]` / `PLAYBACK_EVENTS` を通じて UI が再生する（直接 `game/**` から DOM/アニメ関数を呼ばない）。
- テスト/コマンド実行は **提案→承認→実行**（デフォルトで自動実行しない）。

---

## 現状整理（重要：すでに存在する仕組み）
盤面アニメーションの「分離の土台」はすでに概ね揃っています。

- ルール層のイベント出力: `game/logic/board_ops.js`
  - `SPAWN` / `DESTROY` / `CHANGE` / `MOVE` を `cardState.presentationEvents` に積む
  - 競合回避用に `cardState._presentationEventsPersist` も保持
- 変換（橋渡し）: `game/turn/pipeline_ui_adapter.js`
  - `presentationEvents` → UI向け `playbackEvents` に変換
- UI 側の消費: `ui/playback-engine.js`
  - `PLAYBACK_EVENTS` を消費し `AnimationEngine.play(payload)` を呼ぶ
- 盤面の単一再生エンジン: `ui/animation-engine.js`
  - `place / flip / destroy / spawn / move` を（理想は）ここだけで再生

### いまボトルネックになり得る点
- `game/turn/pipeline_ui_adapter.js` が `CHANGE -> type: 'change'` を出しているが、`ui/animation-engine.js` 側は `flip` を期待している（`ui/animation-constants.js` の `EVENT_TYPES.FLIP`）。
  - この不一致がある限り「反転モーション」を作っても再生されない（未知イベント扱いのフォールバックになる）。

---

## 旧アニメーション残骸（現状の確認結果）
### 1) `animations/` フォルダ
- `animations/*` は Phase2 の **REMOVED stub** が残っています（読み込まれると `console.warn` するだけ）。
- 参照はほぼ「ドキュメント/テンプレ」側に限られ、実行経路の中心は `ui/animation-engine.js` に寄っています。
- ただし、**物理的に残っている**ため「残留していないか不安」の原因になります。

### 2) ゲーム層からの“直接アニメ呼び出し”の残留
- `game/special-effects/dragons.js` / `game/special-effects/hyperactive.js` などに `applyFlipAnimations` のような UI 関数呼び出しが残り得ます。
- これらは最終的に **presentationEvents ベースへ移譲**してゼロにするのが目標です。

---

## ゴール（受け入れ条件 / DoD）
最低限、次が満たされること。

1. 盤面イベント（`MOVE/DESTROY/CHANGE`）が UI で **意図したモーション**として再生される
   - 多動石の移動: スムーズ移動
   - 破壊: フェードアウト → 消える
   - 反転: flip モーション（または仕様に沿う動き）
2. `game/**` から UI/DOM/時間APIを直接呼ばない（分離が崩れない）
3. 旧残骸（`animations/*`）が「参照ゼロ」かつ、必要なら削除できる状態

---

## 実行手順（小PRで段階的）

---

## 進捗（現時点）
- ステータス: **95% 完了** ✅ (ローカル作業完了 + CIトリアージ/修正を実行。残り: PR CI 最終確認、Visual E2E のベースライン取りと PR の統合)
- 実施済み:
  - `CHANGE` -> `flip` のマッピング修正（`game/turn/pipeline_ui_adapter.js`）
  - タイマーの抽象化を利用するようにフォールバック改修（`game/move-executor-visuals.js`）
  - UI 側アニメ API 土台の追加（`ui/animation-api.js` シム）
  - 特殊効果（`game/special-effects/*`）の UI 直接呼び出しを `presentationEvent` 発行へ置換（`hyperactive.js`, `dragons.js`）
  - 単体テストの追加（`tests/unit/game/*`, `tests/unit/ui/*`）とローカルでのテスト実行パス
  - 旧 `window` 参照の削除と `globalThis` への置換、コメント内の直接 `setTimeout` 言及の削除（`game/*`） → `check:game-purity` を通過
  - `animations/*` の Phase2 stub を削除（ローカル）および修正を `feature/animation-foundation` にコミット・push
  - Visual E2E CI のワークフローを別ブランチ `feature/visual-e2e-ci` に追加（非ブロッキングジョブ、アーティファクトをアップロード）
- 未完了:
  - PR 上の CI（GitHub Actions）での完全合格確認（実行中／監視中）
  - Visual E2E のベースライン取得（ローカルで `npm run test:e2e:present-visual` → baseline 作成 → baseline をレビューしてコミット）
  - Visual E2E を PR gate（必須チェック）に昇格させるプランニング

**注:** `animations/*` の Phase2 stub は削除済（ローカルコミット・リモート push 済）。PR #1（`feature/animation-foundation`）および `feature/visual-e2e-ci` を作成済。

---



### PR0: 棚卸し（ドキュメントのみ）
目的: どれが “現役のアニメ基盤” で、どれが “残骸” かを明文化。
- 追記する内容（この計画書に追記でOK）
  - 現役: `BoardOps -> TurnPipelineUIAdapter -> PlaybackEngine -> AnimationEngine`
  - 残骸: `animations/*`（REMOVED stub）
  - “直接呼び出し”候補: `applyFlipAnimations`, `playHandAnimation` など

### PR1: イベント名/プロトコル整合（最優先）
目的: `CHANGE` が UI で “flip” として確実に再生されるようにする。
- 変更案
  - `game/turn/pipeline_ui_adapter.js`: `CHANGE -> pEvent.type = 'flip'` に変更
- 受け入れ
  - 反転が `AnimationEngine.handleFlip` を通ること

### PR2: 盤面アニメの実装（UI側のみ）
目的: `flip/destroy/move` の見た目を仕様に沿って整備する。
- 変更候補
  - `ui/animation-engine.js`
    - `handleFlip`: いま suppressed なら、仕様に合わせて flip motion を有効化
    - `handleDestroy`: フェードアウト（CSS class + animationend）
    - `handleMove`: from→to の translate アニメ（セル座標差分を使う）
  - `ui/stone-visuals.js` / `ui/animation-utils.js` / CSS
    - アニメ用クラス/キーframes/transition を集約
- 重要
  - UI は「状態を書き換えない」。`events` を再生して見た目を変えるだけ。

### PR3: “直接呼び出し”の残留を presentationEvents へ移譲
目的: `game/**` から UI 関数を直接呼ぶ残骸を減らす。
- 方針
  - `applyFlipAnimations(...)` のような呼び出しは削除し、代わりに `BoardOps.changeAt/moveAt/destroyAt` が出すイベントで表現する
  - 追加の演出が必要なら `CROSSFADE_STONE` 等の presentationEvent を足す（UIが解釈）

### PR4: `animations/*` の扱いを確定
目的: “残骸が残っている不安” を消す。
- 選択肢A（おすすめ）: **削除**
  - 参照がゼロであることを確認した上で `animations/*` を削除
- 選択肢B: **隔離**
  - `animations/README.ai.md` に「残す理由（互換/履歴）」を明記し、誤読を防ぐ

---

## 検証（デフォルトは提案のみ）
- 手動確認（最優先）
  - ブラウザで「多動石の移動」「破壊」「反転」が目視で分かること
- コマンド（必要なら実行、実行前に承認を取る）
  - 軽量: `npm run check:consistency`
  - 短時間: `npm run test:quick`
  - 視覚E2E（時間がかかる場合あり）: `npm run test:e2e:present`

---

## リスクと対策
- リスク: UIがイベントを消費できず演出が飛ぶ
  - 対策: `AnimationEngine` の watchdog / abortAndSync を前提に、最終状態へ同期できるようにする
- リスク: “change/flip” のようなプロトコル不一致で何も再生されない
  - 対策: PR1 を最優先にする（プロトコル整合が先）

---

## 非技術向け短い説明（1文）
盤面で起きたことを「合図」として出し、見た目の動きは画面側だけが担当するように整理してから、移動・消える・反転のアニメを安全に追加します。
