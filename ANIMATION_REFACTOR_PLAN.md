# アニメーション分離 & 残骸除去計画 📦🔧

## 概要 ✅
ゲームロジック（`game/*`）と視覚アニメーション（`ui/*`, `animations/*`, `styles-*.css`）を明確に分離し、古いアニメーション実装の残骸を段階的に安全に削除します。作業は段階的に行い、CI とテストを強化して回帰を防ぎます。実行中は**必ず進行度を％表記**で報告してください（例: `進捗: 25%`）。

---

## 目的 🎯
- ゲームロジックを DOM/視覚実装から独立させる
- アニメーション呼び出しを DI 経由（`AnimationService`）に統一する
- 使われていない / レガシーなアニメーションファイルを安全に削除する
- CI で再発を防止する静的チェックとテストを導入する

---

## 範囲（含む / 除外）
- 含む: 石の移動・消去（フェードアウト）・反転モーション・特殊効果の視覚化の分離作業
- 除外: UI 全体のリデザイン（見た目の細かな変更は別タスク）

---

## 主要成果物 📦
- `AnimationService` の設計仕様（メソッド一覧とエラー/タイムアウト仕様）
- `game/*` の呼び出しを DI 経由に置換するパッチ群（複数 PR）
- 削除対象ファイル一覧 + 削除 PR（段階的）
- CI の静的チェックルール（UI 直接参照検出）
- テスト群: Unit / Integration / E2E（no-anim モード, モック UI）
- ドキュメント: 実装方針 + 進捗レポート（％）テンプレ

---

## 現状（実施済み・進捗） 🚧
**進捗: 70%**

実施済み:
- `scripts/find_animation_refs.js` を作成しリポジトリ全体のアニメーション参照を抽出（112 件を検出）。
- UI 側 (`ui/move-executor-visuals.js`) に安全なアニメーションラッパ（`animateFadeOutAt` / `animateDestroyAt` / `animateHyperactiveMove`）を追加。
- game 側 (`game/move-executor-visuals.js`) に `playDrawAnimation` 等のラッパを追加して DI 境界を拡充。
- `game/special-effects/*`（`hyperactive.js`, `bombs.js`, `udg.js`, `dragons.js`）の直接グローバル呼び出しを DI 経由（`require('../move-executor-visuals')` または `mv.*`）に置換。
- `cards/card-interaction.js` の `animateCardToCharge` 呼び出しを UI ラッパ経由に置換。
- 単体テストと UI テストを追加（ラッパ関数の存在と no-op 動作を検証）。
- CI 用チェックスクリプト `scripts/check_ui_direct_refs.js` を追加し、`game/` に直接 UI 参照が無いことを検出するようにした（ローカル実行で OK を確認）。

次の作業:
- `animations/*` の参照がゼロになっていることを `scripts/find_animation_refs.js` で確認 → 削除 PR を作成（小さな段階的 PR を推奨）。
- CI に `npm run check:animation-refs` をビルドパイプラインに追加（PR 前チェック）。
- Integration/E2E の Visual テストを追加して UI 変更の回帰を検出（no-anim と有効モード両方）。


---

## マイルストーン & 進行度（％）📊
各マイルストーン完了時に必ず `進捗: xx%` を報告してください（例: `進捗: 25%`）。

1. 0% — 準備
   - 現状の参照一覧の確定（`grep`/静的解析）
   - 影響範囲の最終確認
2. 25% — 設計完了
   - `AnimationService` API ドキュメント作成（例: `animateMove(from,to,opts)`, `animateFade(node,opts)`, `awaitAnimation(id)`）
   - テストの設計（no-anim 環境とモックインターフェース）
3. 50% — 置換実装（コア）
   - `game/*` の主要な直接呼び出しを DI 経由に置換
   - 単体テスト追加（対象: PLACE/FLIP/DESTROY/MOVE）
4. 75% — クリーンアップ & CI 強化
   - 参照がなくなった `animations/*` を段階的に削除（小さな PR に分割）
   - CI に「UI 直接参照検出」ルールを追加
   - 統合テスト（モック UI の注入で副作用がないことを確認）
5. 100% — 完了 & ドキュメント
   - ビジュアル差分テスト / E2E を完了
   - 最終報告（`進捗: 100%`）と移行手順を README に追記

---

## 詳細作業項目（チェックリスト）🧾
- [ ] 参照一覧の取得スクリプト作成（`scripts/` に `find_animation_refs.js`）
- [ ] `AnimationService` の Type / JSDoc 定義
- [ ] `game/*` → `AnimationService` への置換 PR（段階的）
- [ ] 単体テストの追加（no-anim モード）
- [ ] CI に静的チェックルールを追加（e.g., grep 禁止パターン）
- [ ] `animations/*` の削除 PR（各 PR 毎に参照消滅を確認）
- [ ] E2E の基本フローの Visual 回帰テスト追加
- [ ] ドキュメント（`ANIMATION_REFACTOR_PLAN.md`, PR テンプレ, `AGENTS.md` の更新）

---

## テスト計画 🧪
- Unit: `AnimationService` のスタブ挙動、`game` 側の呼び出しが副作用を生まないことを確認
- Integration: `game` にモック UI を注入してアニメーション呼び出しの置換が成功していることを検証
- E2E (Visual): 典型的なシナリオ（配置→反転→破壊→移動）をスクリーンショット差分で判定
- Regression: no-anim モードで既存テストを全てパスさせる

---

## CI / Lint 変更案 🔧
- 新ルール: `game` 側からの `ui/` ディレクトリ直参照を失敗させる静的チェック（例えば、正規表現を使った grep テスト）
- テストスイートは no-anim モードでの実行を CI の必須ステップに追加

---

## ロールバック & 安全策 ⚠️
- 各 PR は小さく、機能単位でマージする（リバートを容易にする）
- デフォルトで `no-anim`（UI無効）モードで動作確認可能に保つ
- 重要な UI 削除前に `find_animation_refs.js` による最終参照チェックを実行

---

## 報告ルール（必須）📣
- 進捗は常に**％表記**で報告（例: `進捗: 25%`）
- 報告タイミング:
  - マイルストーン完了時
  - 各 PR 作成時
  - 週次ステータス更新
- PR の説明には必ず「影響ファイル」「テストカバレッジ」「戻し方」を明記する

---

## 非技術者向け短い説明 💬
ゲームの中身（勝利/ルール）と「見た目の動き」を別々にします。これにより、将来的に視覚の変更がゲームの挙動を壊すことがなくなります。作業の進捗は常にパーセント（%）で報告します。

---

**ファイル名提案:** `ANIMATION_REFACTOR_PLAN.md`（このファイル）

**次の作業（推奨）:** `find_animation_refs.js` スクリプトを作成して、削除候補の最終リストを自動生成します（実行後に `進捗: 0%` → `進捗: 5%` 等で報告してください）。
