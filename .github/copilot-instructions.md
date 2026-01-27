# GitHub Copilot 指示（カードオセロ）

このリポジトリは「特殊Markdown」を役割ごとに分けて使います。役割を混ぜないでください。
- `*.instructions.md`: 禁止/必須などの強制ルール（手順は書かない）
- `AGENTS.md`: その場所での作業の進め方（段取り・チェック・完了条件）
- `SKILL.md`: 特定作業を完遂するための手順書（マニュアル）

## 一次情報（必ず従う）
- ゲームルール（最優先）: `01-rulebook.md`
  - UI/演出仕様（ルールではない）: `01-rulebook.md`（末尾の Visual / UI / Animation Spec）
- カードID/名前/コスト: `cards/catalog.json`（ブラウザ用ミラー: `cards/catalog.js`）

## 強制ルール（必ず守る）
- 仕様・テスト・実装が食い違う場合、一次情報に合わせてテストと実装を直す。
- ルール変更の順序は必ずこれ：`01-rulebook.md` → テスト → 実装。
- カードのコード名（id/enum）は永続ID：改名しない（表示名はカタログ側で変更する）。
- Flip（反転）と Destroy（破壊）は別物：
  - Destroy は EMPTY 化（Flip ではない）
  - チャージは Flip のみで加算する（Destroy では加算しない）
- エンジン/UI分離：
  - ゲーム/ルール層はブラウザAPI（`window`, `document`, DOM, 時間API）に依存しない。
  - UIはルール状態を推測して直接書き換えない。`events[]` / `presentationEvents[]` を元に表示する。

## 返信ルール
- 最後に、専門用語を使わない短い日本語の説明を付ける。
