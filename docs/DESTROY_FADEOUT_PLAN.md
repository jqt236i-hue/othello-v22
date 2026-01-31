# 破壊（Destroy）500msフェードアウト：計画・設計・実行手順 ✅

## TL;DR
- 目的: 「破壊（石がEMPTYになる）」を**500msの透明度フェードアウト**で統一し、アニメ中は操作不可の前提を堅持する。  
- 要点: 仕様更新（`01-rulebook.md`）、JS定数を中央管理、CSSアニメを0.5sに統一、Playbackは`animationend`待ち＋安全タイムアウト。

---

## 範囲と制約 🔧
- 対象: 石の「空化（Destroy / EMPTY化）」に関わるすべての経路（カード効果、持続切れ、ターン開始消滅 等）。Flip（反転）は対象外。  
- 仕様優先: 変更は `01-rulebook.md` に従い、ルールと実装が矛盾しないようにテストを先に整備。  
- アクセシビリティ: `prefers-reduced-motion` に配慮（短縮または即時削除を選択）。  
- 安全: `animationend` が発火しない状況に備え JS 側で「(DESTROY_FADE_MS + 200ms)」のタイムアウトを設定。

---

## 主要設計決定（要約） 💡
- 定数: `DESTROY_FADE_MS = 500` を `shared-constants.js` に追加（ms）および `DESTROY_FADE_S = 0.5`（任意）。  
- イベント整合: すべての発生源が `presentationEvent.type == 'DESTROY'` を使うことを保証。ペイロードに `{row, col, stoneId, reason, sourceCardId}` を含める。  
- 再生（Playback）: DESTROY を受けたら UI は
  1. ボード入力ロックを確実にセット、
  2. 対象DOMにクラス `destroy-fade` を付与、
  3. `animationend` を待つ（または transitionend と整合）、
  4. DOM/表示を除去して board を EMPTY として確定、
  5. 全ての DESTROY が完了したらロック解除。  
- CSS: `styles-animations.css` の `fadeOutDestroy` / `.destroy-fade` を 0.5s に統一し、重複定義/`!important` を解消する。  
- テスト: 単体、統合、E2E で破壊の同時間性・操作ロックを検証。

---

## 変更ファイル（候補）📁
- 仕様
  - `01-rulebook.md` — Destroyの視覚仕様（500ms）と「再生中ロック」の明記
- 定数
  - `shared-constants.js` — `DESTROY_FADE_MS = 500`
- ルール/ゲーム層（確認/修正）
  - `game/**`（Destroy発生箇所：カードロジック） — 全発生源が `presentationEvents` へ DESTROY を出すか確認
  - `game-events.js`（または相応ファイル） — DESTROY イベント定義スキーマの確認
- UI/Playback
  - `ui.js` / `playback/*.js`（Playback Engine / Visual Writer） — DESTROY の再生処理（ロック、class付与、待ち、除去、解除）
- CSS
  - `styles-animations.css` — `@keyframes fadeOutDestroy` / `.destroy-fade` を 0.5s に並列変更、重複解消
  - 可能なら `.destroy-fade` の定義を1箇所に集約
- テスト
  - `tests/unit/` — DESTROY プレゼンイベント→DOM変更の単体テスト
  - `tests/integration/` — Playback がアニメを待ち、lock を保持することのテスト
  - `tests/e2e/ci-presentation-e2e.bundle` — 実機的E2Eシナリオ（下記検証ケース）

---

## 実行手順（開発者向け、順序付き） 🛠️
1. 仕様更新  
   - `01-rulebook.md` に「Destroy は 500ms のフェードアウトで消える。UI は animationend を待つ／prefers-reduced-motion で短縮」の記述を追加。  
2. 定数追加  
   - `shared-constants.js` に `export const DESTROY_FADE_MS = 500;` を追加。  
3. ゲーム層確認/統一（必須）  
   - 各カード効果実装（`destroy_01`, `udg_01`, `bomb_01`, `hyperactive_01`, `udr_01`, `breeding_01`, `gold_stone`, `silver_stone` 等）を点検し、DESTROY イベントを正しい形式で出すことを確認。必要ならイベント生成を共通関数へ移す。  
4. Playback 実装変更  
   - DESTROY を受けたとき: 入力ロックセット → 対象 DOM に `destroy-fade` を付与 → `animationend` を待って DOM を削除 & board state を EMPTY に反映 → 全 DESTROY 終了後に入力ロック解除。  
   - 安全タイムアウト: `setTimeout` を `DESTROY_FADE_MS + 200` に設定して必ず解除されるようにする。  
5. CSS修正  
   - `styles-animations.css`（または既存定義がある場所）で `@keyframes fadeOutDestroy` を定義、`.stone.destroy-fade { animation: fadeOutDestroy 0.5s forwards; }` にする。既存の `transition: opacity 0.3s` などは削除/統一する。  
6. prefers-reduced-motion 対応  
   - `@media (prefers-reduced-motion: reduce)` で `.destroy-fade { animation: none; opacity: 0; }` のように短縮/即時化する。  
7. テスト追加/修正  
   - Unit: DESTROY イベントの発行・プレゼン変換のテスト。  
   - Integration: Playback が animationend を待ち、lock を保持すること。安全タイムアウトが働くこと。  
   - E2E: 以下検証ケースを走らせ、破壊が視覚的に0.5sで消え、操作がその間ブロックされることを確認。  
8. CI / Review / Merge  
   - テスト合格 → PR 作成（テンプレートに沿う）→ レビュー→マージ。

---

## 検証ケース（必ず含める） ✅
- 単発Destroy: `destroy_01`（選択1マス）  
- バッチDestroy同時性: `udg_01`, `bomb_01`（複数石が同時にフェードして、全て完了後ロック解除）  
- 自己消滅/持続切れ: `udr_01`, `breeding_01`, `hyperactive_01`  
- ターン開始消滅: `gold_stone`, `silver_stone`  
- Edge: `prefers-reduced-motion` の挙動、`animationend` 不発時のタイムアウト、連続DESTROY（キュー処理）

各ケースで確認する項目:
- 見た目: 石が0.5秒でフェード → 最終的に消失
- 入力: フェード中はboardとカード操作が不可、全DESTROY終了後に解除
- Board state: DOM上の石消失後に内部状態が EMPTY に合致

---

## テスト / CI チェックリスト ✔️
- [ ] Unit tests 通過（Destroyイベントの生成とハンドリング）  
- [ ] Integration tests 通過（Playback がアニメを待ち lock を管理）  
- [ ] E2E tests: 各検証ケースを通す（視覚＆状態）  
- [ ] パフォーマンススモーク: 連続爆発等でUIが固まらないこと確認  
- [ ] Accessibility: `prefers-reduced-motion` の挙動確認

---

## PRテンプレート（短縮版） 📝
- 概要: 破壊を500msのフェードアウトに統一。UIはアニメ完了まで入力をロック。  
- 主な変更点: `01-rulebook.md`, `shared-constants.js`, `ui.js`（playback）, `styles-animations.css`, テスト追加。  
- 検証方法: 上記検証ケースのスクショ/録画を添付し、テスト結果を示す。  
- 影響範囲: 見た目と入力のタイミングのみ（ルールは変更していない）。

---

## ロールバック / フェールセーフ
- 重大不具合発生時は `shared-constants.js` の `DESTROY_FADE_MS` を元に戻すか、Playback側で `noFadeMode` を一時オンにして即時消去へフォールバックできるようにしておく。

---

## 推奨スケジュール（短期案）
1. 仕様反映・定数追加（0.5日）  
2. ゲーム層のイベント整理（1日）  
3. Playback + CSS 実装（1–2日）  
4. テスト整備・CI（1日）  
5. レビュー・修正（1日）  
合計: 4–6営業日（レビュー待ち等込み）

---

> 重要: 「アニメ中は操作不可」の前提を守るため、**JSの待ち時間とCSSの実時間を必ず揃えてください**。また `animationend` 不発の保険として必ずタイムアウトを置くこと。

---

短い日本語説明（専門用語を使わない）  
石が消えるのを0.5秒かけてフェードさせ、その間は操作できないようにしておきます。
