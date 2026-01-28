# ゲームロジックと表示層（UI＋アニメーション）完全分離 計画書 v3

最終更新: 2026-01-27
対象リポジトリ: `othello_v2`
一次情報: `01-rulebook.md`

---

## 0. 目的（Goal）

ゲームロジック（ルール・状態遷移）と表示層（UI＋アニメーション：見た目・入力・演出）を完全分離し、オンライン同期・リプレイ・テストで共通に使える単一パイプラインを確立する。

達成すべき状態（ロジック↔表示の境界）:
- ルール層はブラウザAPIに依存しない（`window`/`document`/DOM/時間API/`Math.random()` なし）
- 表示層（UI＋アニメーション）はルール状態を直接書き換えない（アクション発行とイベント再生のみ）
- 状態遷移は単一入口（`TurnPipeline.applyTurnSafe`）に集約されている

---

## 1. 非目的（Non-goals）

- ルールの意味変更はしない（必要な場合は先に `01-rulebook.md` を更新）
- 演出の大改修は目的ではない（正しい再生のための最小限の調整は可）

---

## 2. 完了条件（Definition of Done）

### 2.1 単一入口（重要）

- 状態を変えるルール操作は `TurnPipeline.applyTurnSafe(...) -> Result` のみ
- UIから `CardLogic` の書き換え系関数を直接呼び出さない（例外ゼロを目指す）

### 2.2 ルール層の純粋性

- `game/**` は DOM/window/time/random/UI import に依存しない
- ルールの事実は `events[]` / `presentationEvents[]` で表現する

### 2.3 表示層（UI＋アニメーション）の役割限定

- 表示層（UI＋アニメーション）は `Result` を受け取って再生するだけ（状態推測・補完をしない）
- オプティミスティック表示は「状態はいじらず、ハイライトのみ」に限定する

### 2.4 機械的ゲート（CI/静的検査）

- 既存: `npm run check:game-purity`, `npm run check:ui-writers`, `npm test`
- 追加: `game/**` から UI関数参照を禁止するチェックを導入
- 追加: `game/**` から時間API（`Date`, `performance`, `setTimeout`, `setInterval`, `requestAnimationFrame`）および `Math.random()` の使用を禁止するチェックを導入

---

## 3. アーキテクチャ原則（ロジック↔表示層のBoundary Contract）

### 3.1 正式フロー（Input -> Logic -> State -> Presentation）

1) UIが入力から `action` を生成
2) UIが `TurnPipeline.applyTurnSafe(...)` を呼ぶ
3) 状態管理レイヤーが `Result` を state store に適用する（UIは state を直接変更しない／ここまでがルール側の責務）
4) 表示層（UI＋アニメーション）が `presentationEvents[]` を再生する（ここから先が表示側の責務）

### 3.2 命名規約（重要）

- ルール層: `*.logic.js` を基本とする（または `game/logic/**` に集約）
- UI層: `*.visual.js` / `*.ui.js` を基本とする（または `ui/**` に集約）
- 中立層（やむを得ない場合のみ）: `*.adapter.js`

### 3.3 禁止事項（ルール側）

- `game/**` から `emitBoardUpdate|renderBoard|renderCardUI|addLog|animate|timers.waitMs` 等の表示層APIを参照しない
- ルール側の「時間」は「論理順」で表現し、待機やタイマーはUIで行う

---

## 4. 段階計画（Phases）

### Phase 0: 安全柵の固定（Gate First）

目標:
- いまより悪化しない状態を先に作る

実行項目:
- `TurnPipeline.applyTurnSafe` を単一入口とする方針を明文化
- 追加チェックを導入（例: `check:game-no-ui-calls`）
- 普段の確認は `npm run test:quick` を基準にする

成果物:
- 方針とゲートが揃っている（後戻り防止）

### Phase 1: 棚卸しと分類（Inventory -> Classification）

目標:
- スコープの爆発を防ぐ（どこを直すかを先に確定）

実行項目:
- 対象を「A: state mutationあり」「B: UIのみ」「C: 両方」に分類する
- 「C: 両方」について「分割後の移動先（logic / visual）」を行単位で決める
- 代表候補: `game/turn-manager.js`, `game/card-effects/**`, `game/special-effects/**`, `game/move-executor*.js`

成果物（必須）:
- 「分類表」をMDで作成（ファイル/主関数/分類/移動先/備考）

### Phase 2: イベント拡充（UI推測をゼロに）

目標:
- UIがstate diffや暗黙のルールを推測しない状態にする

互換/移行:
- 既存のUI補完はイベント拡充が終わるまで段階的に残し、互換レイヤーで吸収して段階的に新スキーマへ移行する。互換期間終了後に旧形式を削除する手順を明記する

実行項目:
- `events[]` / `presentationEvents[]` の「UIが必要な最終情報」を統一定義する
- 特殊石の表示に必要な属性（owner, timer, overlay）をイベントに載せる
- イベントが足りないためのUI補完を削る（足りない情報はルール側から出す）

成果物:
- イベントスキーマの確定版
- presentation系E2Eの代表テスト

### Phase 3: 単一Writer化（表示層Playback Engine集約）

目標:
- DOM更新とアニメーション再生を「表示エンジン」1箇所に集約する

実行項目:
- `PlaybackEngine`（名称は任意）を表示層（UI＋アニメーション）側の単一writerにする
- 再生中の全体再描画を禁止するルールを責務として集約する
- 楽観UIは「ハイライト系の仮表示のみ」に限定する

成果物:
- DOM更新経路の一本化

### Phase 4: `game/**` からUIの区分を完成

目標:
- ルール側からUI都合の責務をゼロにする

実行項目:
- `game/**` 内のUI関数参照をゼロにする
- UI側ハンドラの置き場を `ui/**` に寄せる（`*.visual.js`推奨）
- 後戻り防止の静的検査をCIに入れる

成果物:
- DoD達成（分離完了）

---

## 5. 実務用チェックリスト（各PRで確認）

- ルール層の変更は `01-rulebook.md` と整合しているか
- 表示層からのルール書き換えを増やしていないか
- イベントを足さずに表示層で推測していないか
- 下記コマンドが通るか:
  - `npm run test:quick`
  - `npm run check:ui-writers`
  - `npm run check:game-purity`

---

## 6. 推奨コマンド

普段用（速い）:
- `npm run test:quick`
- `npm run check:ui-writers`
- `npm run check:game-purity`

必要なときだけ（遅い）:
- `npm run test:jest:changed`
- `npm run test:jest:coverage`
- `npm run test:e2e:noanim`

---

## 7. 次の一手（推奨）

- まずPhase 0の追加ゲートを入れる（悪化を止める）
- 次にPhase 1の「分類表」を作る（これが計画の要）
