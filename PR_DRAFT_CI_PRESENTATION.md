# PR Draft: ci(presentation): add presentation E2E suite + visual smoke checks

## 概要
- Playwright によるプレゼンテーション E2E スイートを追加し、presentation events が UI の視覚表現に確実に反映されることを検証します。
- ビジュアルスモークチェック（breeding のベースライン & pixelmatch による比較）を追加しました。
- ブリーディングシーケンス用のシナリオを追加（`scripts/playwright_presentation_sequence_breeding.js`）。このスクリプトはポーリング／リトライ／中間スクリーンショット保存を導入して強化済みで、ローカルでは安定して成功します。CI での運用監視を推奨します。

## 変更点（主なもの）
- scripts/
  - `playwright_presentation_events_suite.js`（複数効果の E2E）
  - `playwright_presentation_event_assert_strict.js`（厳密アサーション: クラスと `--special-stone-image` を検証）
  - `playwright_presentation_visual_check.js`（visual smoke check, baseline + pixelmatch）
  - `playwright_presentation_sequence_breeding.js`（ブリーディング sequence 実験 -> 強化済み）
- ui/
  - `ui/presentation-handler.js` などの UI 側ハンドラ追加/修正
- CI
  - `.github/workflows/e2e-presentation.yml` を追加（E2E/CD の入れ口）。ワークフローで **厳密アサーション（`playwright_presentation_event_assert_strict.js`）を先行実行**し、Playwright のアーティファクト（`playwright-report/`）を常にアップロードするようにしました。
- artifacts/
  - `artifacts/visual_presentation/` に baseline と試行スクショ/差分が含まれます

## テスト・確認方法
- ローカル（推奨順）
  1. `npm run test`（ユニット）
  2. `npm run test:e2e:present-suite`（プレゼン E2E スイート）
  3. `npm run test:e2e:present-visual`（ビジュアルスモークチェック）
  4. `node scripts/playwright_presentation_sequence_breeding.js`（実験シーケンス、初回は baseline 生成で exit code 2）

- CI（PR 作成後）
  - ワークフローは artifact（スクショ／差分）を失敗時に保存する設定を推奨

## 注意点 / 推奨事項
- ブリーディングシーケンスはローカルでは強化済みで成功していますが、環境差で CI でのフラッキネスが発生する可能性があります。CI 上では失敗時アーティファクトを必ず保存し、閾値やタイムアウトのチューニングを継続してください。
- ブランチは `ci/presentation-e2e` です。
### 現在の CI 状況（更新: 2026-01-26） ✅
- **Good news:** ローカルでユニットテストの不安定点を修正し、コミットしました（`bb09935`）。ローカル環境では `npm run test` が全て成功します。
- CI 上では依然いくつかのジョブが不安定または失敗しています（代表例: No-Animation E2E、visual-diff、cpu-fuzz）。失敗したジョブの **logs** と `playwright-report/` アーティファクト（スクリーンショット/差分）を優先して収集してください。

### 失敗ジョブのトリアージ手順（推奨） 🔍
1. GitHub Actions の該当 run を開いて、失敗ジョブを選択する。
2. Job の `Artifacts` から `playwright-report/`（スクリーンショット、diff）をダウンロードして確認する。
3. ローカルで再現する際は、該当環境変数を設定して実行（例: PowerShell では `$env:NOANIM='1'; npm run test:e2e:noanim`、Linux/macOS では `NOANIM=1 npm run test:e2e:noanim`）。
4. 視覚差分は pixelmatch の閾値・クロップ領域・比較方法（フルスクリーン vs 要素）を確認し、閾値を段階的に緩和して安定化を試みる。
5. cpu-fuzz 失敗はシードまたは再現ケースを切り出してデバッグする（再現性が取れればルール側の堅牢化またはテストの guard を追加）。

### 短期推奨（安定化のため）⚠️
- Visual-diff ワークフローは、閾値決定と安定化が完了するまでオプション扱い（fail-blocker ではなく警告）にすることを検討してください。
- Playwright の厳密アサーション（`test:e2e:present-strict`）は先行して実行するままにして、視覚差分は別段階で検証すると安定化が早く進みます。

**最近の修正（要点）**
- コミット `bb09935`: ユニットテストの不安定点を修正しました (`tests/unit/ui_adapters.test.js`, `tests/unit/no_breeding_spawn_class.test.js`, `game/move-executor-visuals.js`) — ローカルで `npm run test` が全て成功しています ✅
- 目的: CI 上のフラグや E2E の失敗時に、アーティファクト（Playwright レポート／スクリーンショット／差分）を用いて迅速にトリアージできる状態にすること。

**Windows (PowerShell) での再現コマンド**
- 単体（no-anim）: `$env:NOANIM='1'; npm run test:e2e:noanim`
- 厳密チェック: `npm run test:e2e:present-strict`
- ビジュアル: `npm run test:e2e:present-visual`

**次のアクション（提案）**
- CI の失敗ジョブがあれば、私がアーティファクトをダウンロードして解析します（スクショ・diff を見て閾値/タイムアウトの調整案を作成します）。解析を開始してよければ「解析して」と返信ください。

---
### リモートへ push できない場合（手順）
- 用意済みバンドル: `ci-presentation-e2e.bundle`（リポジトリルート）とパッチセット `patches/*.patch` を使用して別マシンで PR を作成できます。
- 別マシンでの適用手順（例）:
  1. バンドルを転送（scp / ファイル共有）
  2. `git clone file:///path/to/ci-presentation-e2e.bundle -b ci/presentation-e2e <dest>`
  3. `cd <dest>` → `git remote add origin <URL>` → `git push -u origin ci/presentation-e2e`
  4. GitHub 上で PR を作成（`PR_DRAFT_CI_PRESENTATION.md` を本文に利用）
- 代替: パッチセットを適用する場合は `git am patches/*.patch` を使用し、適用後に push してください。

## リモートへ push する手順（例）
- リモート追加（1回目のみ）:
  - `git remote add origin <URL>`
- push:
  - `git push -u origin ci/presentation-e2e`
- PR の作成（CLI 例）:
  - `gh pr create --base main --head ci/presentation-e2e --title "ci(presentation): add presentation E2E suite" --body-file PR_DRAFT_CI_PRESENTATION.md`

## レビュワー候補
- @frontend-team
- @ci-team

---
*Prepared by automated assistant for review.*