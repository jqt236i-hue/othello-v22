# Ready to push: ci/presentation-e2e

状況: ブランチ `ci/presentation-e2e` はローカルでコミット済です。以下はリモートへ push と PR 作成を行うための手順（2つの方法）。

## A) 私に push / PR 作成を任せる（推奨）
- 必要なもの: リモート URL (例 `git@github.com:org/repo.git` または `https://github.com/org/repo.git`).
- オプション: PR をドラフトにするか（`draft`）レビュー担当者（例: `@frontend-team`）を指定できます。
- 私ができること:
  - `git remote add origin <URL>`（未登録時）
  - `git push -u origin ci/presentation-e2e`
  - PR 作成（本文: `PR_DRAFT_CI_PRESENTATION.md`、レビュワー付与）

*注: この環境に `gh` が無いので、PR の自動作成には GitHub API トークン（PAT）が必要になる可能性があります。トークンを渡せない場合は push まで私が行い、PR は Web で作成してください。*

## B) 別マシンでバンドルを適用して push する（ネットワーク制限がある場合）
- 手順（別マシンで実行）:
  - `git clone file:///path/to/ci-presentation-e2e.bundle -b ci/presentation-e2e <dest>`
  - `cd <dest>`
  - `git remote add origin <https-or-ssh-url>`
  - `git push -u origin ci/presentation-e2e`
  - Web or `gh` CLI で PR を作成

## 追加情報
- 生成済バンドル: `ci-presentation-e2e.bundle`（リポジトリルート）
- PR 下書き: `PR_DRAFT_CI_PRESENTATION.md`
- 主要テスト: 単体テスト・プレゼンE2E（複数シナリオ）・ビジュアルスモーク・強化シーケンスはローカルで PASS
- アーティファクト: `artifacts/visual_presentation/` に baseline と試行スクショ/差分あり

---
ファイルを確認・承認いただければ、リモート URL を教えてください。私が続けて push & PR 作成を実行します。