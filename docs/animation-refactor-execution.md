# 盤面アニメーション分離・拡張 実行計画書（精密版）

最終更新: 2026-01-28
対象: `othello_v2`

---

## 目的（Goal）
- 盤面の石アニメーション（反転/移動/消滅/出現/特殊演出）を **ゲームロジックから完全に分離**して実装する。
- オンライン同期・リプレイ・将来拡張に耐える **イベント駆動の一貫した再生基盤** を整える。
- バグりにくい（再現性/安全性/切り戻し容易）運用を前提に **小さなPR単位**で進める。

---

## 非目的（Non‑Goals）
- ルールや勝敗ロジックの変更はしない（必要なら `01-rulebook.md` 先行更新）。
- 旧UIの全面刷新や大規模UI改修は行わない。
- ネット対戦の通信実装そのものは本計画に含めない（ただし、後工程で実装できる状態を担保する）。

---

## 前提・制約
- `game/**` は **ブラウザAPI/時間API/DOM** を使わない。
- 盤面演出は `presentationEvents[]` / `PLAYBACK_EVENTS` を通じて **UIのみが再生**する。
- テスト/コマンド実行は **提案 → 承認 → 実行**（デフォルトで自動実行しない）。

---

## 現行アーキテクチャ（前提となる流れ）
1) 盤面変更の事実: `game/logic/board_ops.js` が `SPAWN/DESTROY/CHANGE/MOVE` を `presentationEvents` に追加
2) 変換: `game/turn/pipeline_ui_adapter.js` が `presentationEvents → playbackEvents`
3) 再生: `ui/playback-engine.js` が `AnimationEngine.play(payload)` を呼ぶ
4) 単一再生: `ui/animation-engine.js` が `place/flip/destroy/spawn/move` を実再生

> 重要: `CHANGE -> type: 'change'` と `AnimationEngine` の `flip` が不一致であるため、**反転が再生されない可能性がある**。

---

## 実装優先度付き一覧（短く）
1) **Flip（反転）** — 最優先
   - トリガー: `CHANGE` → pipeline で `flip` にマップ
   - 視覚: 「色を差し替え → 回転/めくりモーション（swap‑first then motion）」
   - 受入基準: final state 一致 / no‑anim 即時反映
2) **Destroy（消滅/フェード）** — 高
   - トリガー: `DESTROY`
   - 視覚: フェードアウト（必要なら ghost 残像）
3) **Move（移動/多動石）** — 高
   - トリガー: `MOVE`（from→to）
   - 視覚: translate + easing + optional 微バウンド
4) **Spawn/Place（出現）** — 中
5) **Cross‑fade（特殊石オーバーレイ）** — 中
6) **Hand/Card animations** — 中/低
7) **HUD/Charge/Deck** — 低
8) **Timers/Overlays** — 低
9) **Phase/Turn transitions** — 低
10) **NOANIM 対応** — 全体必須

---

## 実行手順（精密・小PR）

### PR‑0: 棚卸し（ドキュメントのみ）
**目的**: 残骸/現役を明確化し、二重実装を防ぐ。
- 成果物: 現役フロー図（BoardOps → Adapter → Playback → AnimationEngine）
- 残骸: `animations/*` の stub を「残留扱い」として明記

**PR Template / Checklist (必須)**
- すべてのアニメ PR は `.github/PULL_REQUEST_TEMPLATE/animation-pr-template.md` を使用して作成すること。
- PR 作成者は下のチェックリストを埋め、レビュワーの承認を得ること。


### PR‑1: プロトコル整合（最優先）
**目的**: 反転が必ず `AnimationEngine.handleFlip` に届くようにする。
- 変更: `pipeline_ui_adapter.js` の `CHANGE` を `flip` にマップ
- 受入: flip が再生経路に乗る（未知イベント扱いにならない）

### PR‑2: Flip モーション実装
**目的**: 反転の見た目を確定させる。
- 変更: `ui/animation-engine.js` の `handleFlip` 実装、`styles-animations.css`
- 受入: no‑anim で即時反映 / 最終状態一致

### PR‑3: Destroy フェード
**目的**: 消滅演出を UI で実装。
- 変更: `handleDestroy` + CSS

### PR‑4: Move（多動石移動）
**目的**: from→to のスムーズ移動
- 変更: `handleMove` + CSS

### PR‑5: Spawn / Cross‑fade / Hand / 低優先度
**目的**: UX の底上げ（任意・順次）

### PR‑6: 旧残骸（animations/*）の扱いを決定
- 選択肢A: 参照ゼロ確認後に削除
- 選択肢B: READMEで「残す理由」を明記（誤読防止）

---

## 受入基準（DoD）
- `presentationEvents` が UI で **意図したモーション**として再生される
- `game/**` から UI/DOM/時間API への直接依存が増えていない
- NOANIM / DISABLE_ANIMATIONS で即時反映にフォールバック
- 失敗時に即 revert できる小PR構成

---

## オンライン/リプレイ互換（必須観点）
- アニメは **状態を変えない**（UIは再生のみ）
- `presentationEvents` は **JSON‑safe** であること
- 同じ action 列で再生結果が一致する（視覚は差異があっても state は一致）

---

## 検証方針（実行は承認制）
- まず手動確認（ブラウザで反転/消滅/移動が視認できる）
- 必要なら軽量チェックのみ提案

---

## リスクと対策
- **イベント不一致** → PR‑1 を最優先で実施
- **二重実装** → `AnimationEngine` を単一再生に寄せる
- **長時間テストで停止** → 原則「提案→承認→実行」

---

## 進め方（運用ルール）
- 1アニメ = 1PR（小さく・可逆）
- 「実装/検証/ロールバック手順」をPR本文に記載

---

## 非技術向け短い説明（1文）
盤面で起きたことはゲーム側が「合図」を出し、見た目の動きは画面側が担当する形で、ひとつずつ安全に追加します。
