# Presentation Events 移行 TODO（エージェント向け）

> 目的: カード演出を「4つの演出コア（DESTROY / SPAWN / CHANGE / MOVE）」に統一し、ルール層が再現性のある presentation events を出力、UI は eventLog を唯一の一次情報として再生できるようにする。

## ステータス更新（2026-01-21）
- BoardOps はブラウザでロード済みです。ブラウザ側のコアロジックから `presentationEvents` が発行されることを確認しました。CI による E2E 統合（Playwright）の実行に進めます。

### 完了（2026-01-21） ✅
- BoardOps のブラウザ統合、E2E シナリオ（`playwright_presentation_sequences.js`）の検証、及び GitHub Actions ワークフロー（`.github/workflows/playwright-e2e.yml`）の追加が完了しました。
- `npm run test:e2e` はローカルでパスし、失敗時のスクリーンショット/ログが `artifacts/` に保存されることを確認しました。
- 次のアクション: PR をマージして CI を回してください。問題が発生した場合は、CI の artifacts（`artifacts/e2e.log` や保存されたスクリーンショット）を確認してください。

---

## ✅ 高レベルゴール
- 各石に永続的な `stoneId` を導入する。
- ルールエンジンが `presentationEvents[]` を生成（各種演出は `DESTROY` / `SPAWN` / `CHANGE` / `MOVE` のいずれかで表現）。
- UI は `presentationEvents[]` を再生し、既存の DOM 操作/ログ出力はイベント駆動で行われる。
- 既存の挙動（リプレイ互換・イベントログ）を保持しつつ段階的に移行可能とする。

---

## 🔒 Non-negotiables（AGENTS.md と同期必須）
- Flip（反転）と Destroy（破壊/EMPTY化）は別概念。Destroy は Flip ではない。
- チャージ加算対象は Flip のみ。Destroy は加算対象外。
- Protected / PermaProtected は「反転不可・交換不可」。Destroy は貫通する。
- Protected は合法手判定にも影響し得る（挟み列成立に影響）。
- ルール処理と UI 演出は分離。UI は状態を推測せず `events[]` / `presentationEvents[]` を一次情報として再生する。
- 乱数は必ず DI（ルール層で `Math.random()` を使わない）。
- `actionId` / `turnIndex` / `plyIndex` をイベントに含め、重複適用を防ぐ。
- Anchor が Destroy 等で消えたら、関連する継続効果を即終了する。

---

## 📋 提案イベントスキーマ（雛形）
- 基本型:
```json
{
  "type": "DESTROY|SPAWN|CHANGE|MOVE",
  "stoneId": "string",
  "row": 0,
  "col": 0,
  "prevRow": null,
  "prevCol": null,
  "ownerBefore": "black|white|null",
  "ownerAfter": "black|white|null",
  "cause": "CARD_ID|SYSTEM|BOMB|DRAGON|BREEDING|REGEN|...",
  "reason": "human_readable_tag",
  "meta": { },
  "actionId": "uuid",
  "turnIndex": 0,
  "plyIndex": 0
}
```

### stoneId ポリシー（重要）
- `stoneId` は「盤面上に存在する石（個体）」の永続ID。
- `SPAWN` で新規採番、`DESTROY` で終端。
- `CHANGE` は **stoneId を維持**（色/属性/見た目の変化）。
- `MOVE` は **stoneId を維持**（座標だけ変更）。
- EMPTY には stoneId を割り当てない。
- deterministic replay のため、採番は **state 内の increment（推奨）** か **DI された PRNG 由来**で決定できるようにする。

---

## 🧩 イベント意味論（4系統の定義を固定化）
### 1) DESTROY（石→EMPTY）
- 例: 破壊神/究極破壊神、爆弾爆発、効果終了消滅、多動の行き場なし消滅、繁殖アンカーの期限終了破壊
- UI は「消える」だけを表現。理由は `reason`（例: `udg_immediate`, `bomb_explode`, `anchor_expired`）でタグ付け。

### 2) SPAWN（EMPTY→石）
- 例: 繁殖の生成石
- UI は「出現」だけを表現。
- 直後に反転が起きる場合は **別イベント `CHANGE`**（Spawn には混ぜない）。

### 3) CHANGE（石→石：色/属性/見た目の変更）
- 例: 通常反転、SWAP、ドラゴン周囲変換、誘惑、再生の戻り、多動解除、保護付与/解除（見た目変更がある場合）
- UI はクロスフェード/色変更など。実際の変更理由は `cause` / `reason` で分岐。
- ルール側では `meta` に `flip_count` と `destroy_count` を **分離して記録**し、`charge_delta` は flip のみから算出する。

### 4) MOVE（同一個体の座標変更）
- 例: 多動の意志
- Destroy+Spawn で代替しない（同一 stoneId の維持が必須）。
- 付帯状態（`remainingTurns` / `regenRemaining` / `bombCount` 等）を同一個体として追跡できる必要がある。

---

## 🧭 主要タスク（優先度付き）
以下は小さな独立タスクへ分割してエージェントに渡せる形式です。

### 1) 仕様 & PoC（高優先・小規模）
- 目的: まず PoC を作り、設計合意を得る。
- タスク:
  1. `docs/presentation_events_spec.md` を作成（イベントスキーマ、stoneId ポリシー、4系統の意味論、例シーケンス）
  2. `CardLogic.createCardState` に `stoneId` 採番の仕組みを追加（increment 推奨、DI-PRNG も許容）
  3. ルール層に「presentation events 収集口」を追加（例: `cardState.presentationEvents` / `emitPresentationEvent()`）
  4. PoC カード: **`breeding_01`（繁殖）**
    - アンカー設置: `CHANGE`（見た目が変わるなら）
    - 生成: `SPAWN`（新規 stoneId）
    - 生成直後の反転がある場合: `CHANGE`（別イベント）
  5. ユニットテスト: `tests/unit/presentation_events_poc.test.js`
    - `SPAWN` が出ること
    - `SPAWN` と `CHANGE` を混ぜないこと
    - イベントに `actionId/turnIndex/plyIndex` が入り、順序が deterministic であること
- 期待成果: PoC が `npm test` に通り、最低1つの UI 再生（イベント→DOM更新）が Playwright で検証できること
- 目安工数: 1-2 日

### 2) ルール層の API（中優先・中規模）
- 目的: 既存ルールロジックから presentation events を発行するための API を整備
- タスク:
  1. ルール層に `emitPresentationEvent(event)` / `flushPresentationEvents()` を追加（置き場は `game/logic/*` 配下で統一）
  2. 盤面操作の共通経路を作る（直書き EMPTY化/色変更でイベントを迂回しない）
     - destroyAt / spawnAt / changeAt / moveStone のような共通APIを用意し、必ずそこで emit する
  3. 主要副作用箇所（破壊/繁殖/移動/再生/ドラゴン/UDG/爆弾）を共通APIへ寄せる
  4. `turn_pipeline_phases.js` の固定順序を前提に、
     - `flip_count` と `destroy_count` を分離
     - `charge_delta` は flip のみから算出（Destroy は 0）
  5. 既存 `events[]` は当面維持し、`pipeline_ui_adapter.js` 等で `presentationEvents` 併用へ誘導
- テスト: 各変更に対して小さな単体テストを追加（期待された presentation event が発行されること）
- 目安工数: 3-5 日

### 3) UI 側の受け口（高優先・中規模）
- 目的: ハンドルするイベントを標準化して、DOM/アニメーションをイベント再生で駆動
- タスク:
  1. `presentation-replayer` を作成し、UI は **state を推測せず** `presentationEvents` を再生するだけに寄せる
  2. DOM 要素に `data-stone-id` を付与し、stoneId→DOM のマッピングを UI 側で管理
  3. `MOVE` は同一 DOM を移動（軌跡/追従エフェクトが可能な構造に）
  4. `CHANGE` は stoneId を維持してクロスフェード（色/見た目/属性）
  5. `DESTROY` は stoneId の DOM を消す（reason で演出差し替え可）
- テスト: Playwright シナリオで `presentationEvents` に基づくアニメが意図通り発火することを検証（スクリーンショット比較 or DOM state assertion）
- 目安工数: 4-7 日

### 4) マイグレーション（高優先・段階的）
- 目的: 既存コードと互換を保ちつつ段階移行
- タスク:
  1. フィーチャーフラグ `FEATURE_PRESENTATION_EVENTS` を導入（既定OFF）
  2. 短期は「既存のログ/演出」と「イベント駆動」を併存（差分検出しやすくする）
  3. カード移行順（推奨）:
     - 繁殖（SPAWN）→ 爆弾（DESTROY）→ 通常反転（CHANGE）→ 多動（MOVE）→ 残り
  4. 各カード移行で、presentationEvents の期待シーケンスをテストに固定
- 目安工数: カードあたり 0.5-2 日（複雑度依存）

### 5) テスト整備 & CI（中優先）
- 目的: 回帰防止と自動検証
- タスク:
  1. ユニットテスト: 各カードごとに期待される `presentationEvents` シーケンスを追加
  2. Playwright: `scripts/playwright_test.js` を拡張し、`presentationEvents` をキャプチャして DOM の変化と照合
  3. CI: GitHub Actions に `presentation-events` ワークフローを追加（ユニット + Playwright を走らせる）
- 目安工数: 2-4 日

### 6) ドキュメント & 開発者 UX（低〜中優先）
- タスク:
  1. `docs/presentation_events_spec.md` と `AGENTS.md` の更新（移行方針と API デベロッパーガイド）
  2. `TESTING.md` に新テストフローを追記
  3. デバッグ用ツール: `scripts/dump_presentation_events.js` を追加して再生ログを可視化
- 目安工数: 1-2 日

### 7) QA / ロールアウト（高優先）
- タスク:
  1. ステージ環境で Playwright 全カード走行 → スクリーンショット比較
  2. ブラウザ上で手動確認（複数ブラウザ/リソース条件）
  3. ステージ合格後、本番リリース・フラグオン
- 目安工数: 2-3 日

---

## ✅ Acceptance Criteria（各段階）
- PoC: `breeding_01` の placement で `SPAWN` event が出力され、UI が同イベントを再生して石が出現する。ユニットテスト + Playwright がパス。
- 各カード移行: 当該カードの placement で期待する `presentationEvents` が出力され、既存の視認ログと UI 動作に差異がないこと。
- 全体: 任意の replay をイベント再生すると、描画・アニメが deterministic に再現できること。

---

## 🔧 PR チェックリスト（各 PR）
- [ ] ユニットテストを追加/更新
- [ ] Playwright/E2E テストを追加/更新（影響範囲のあるカード）
- [ ] `FEATURE_PRESENTATION_EVENTS` フラグで挙動確認ができる
- [ ] ドキュメント（`docs/presentation_events_spec.md` / `AGENTS.md`）更新
- [ ] 既存イベントログとの互換性確認（比較テスト）

---

## 🧭 注意点 / Blockers
- `stoneId` を導入すると既存リプレイのフォーマットが変わる可能性あり → 互換レイヤ必須
- 一部カードで stone の `個体性` に依存したロジックが散らばっている（直接配列 index を参照している等） → 移行時に都度対応が必要
- アニメ性能/GC に注意（大量 SPAWN / MOVE の短時間発生）

---

## 🧪 最低限カバーすべきテスト（AGENTS.md 準拠）
- Destroy は charge に入らない / Flip は入る（色変更カードも含む）
- Protected/PermaProtected の挙動（挟み成立・交換不可・Destroy貫通）
- FREE_PLACEMENT の反転0配置
- DOUBLE_PLACE: 2回目も合法手のみ、1回目で終了確定なら2回目なし、チャージは2回分の flip 合計
- Anchor 消滅で継続効果即終了

---

## 推定合計工数（ラフ）
- 初期 PoC + 基盤: 1週間
- カード20枚を段階移行 + テスト整備: 2~4 週間（チーム並列度による）

---

## 担当割り振り（例）
- 仕様 & PoC: エンジニア A
- ルール層イベント emit: エンジニア B
- UI replayer: エンジニア C
- テスト/CI: QA / エンジニア D

---

### 最初の 3 タスク（短期）
1. `docs/presentation_events_spec.md` を書く（イベントスキーマ + stoneId ルール）
2. `CardLogic.createCardState` に `stoneId` generator を追加し、単体テストを作成
3. `breeding_01` を PoC として `SPAWN` event を発行 → `tests/unit/presentation_events_poc.test.js` を作成

---

必要であれば、上記タスク群を個別の issue（GitHub Issues）と PR テンプレートに分割して作ります。ご希望を教えてください。
