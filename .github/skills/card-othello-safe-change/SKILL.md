---
name: card-othello-safe-change
description: カードオセロで安全に変更を完遂するための手順（仕様→テスト→実装→検証）
---

このファイルは「特定作業を完遂するための手順書」です（ゲーム仕様そのものは `01-rulebook.md`）。

## 必読（一次情報）
- 仕様（最優先）: `01-rulebook.md`
- カード定義: `cards/catalog.json`（ブラウザ用ミラー: `cards/catalog.js`）
- 作業の段取り: `AGENTS.md`
- オンライン/リプレイ計画: `ONLINE_REFACTOR_PLAN.md`

## 共通フロー
- 基本の段取り/完了条件は `AGENTS.md` に従う（この SKILL は “作業タイプ別の追加チェック” だけを書く）。
- テストやコマンド実行は「提案→ユーザー承認→実行」。まずは軽量（対象限定）を優先。

## 手順（カード追加）
1) `cards/catalog.json` を更新する（id/type/cost/desc）。
2) （必要なら）`npm run check:consistency` を実行して整合チェックを確認する。
3) 代表例 + 境界条件のテストを追加する。
4) 実装を追加し、仕様（`01-rulebook.md`）と同期する。

## 手順（既存カードのルール変更）
1) `01-rulebook.md` を先に更新する。
2) テストを更新する。
3) 実装を更新する（既存の共通経路を再利用）。
4) コスト/説明が変わるなら `cards/catalog.json` も同期する。

## 手順（UI/演出の変更）
1) ルールの意味を変えない。
2) `events[] / presentationEvents[]` を元に表示する（UIがルール状態を直接いじらない）。

