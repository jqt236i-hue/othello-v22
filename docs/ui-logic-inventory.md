# UI / Logic Inventory — 初期分類表

最終更新: 2026-01-27

このドキュメントは Phase 1 の『棚卸しと分類』用の初期ドラフトです。各ファイルの現在の振る舞いを調査し、"A: state mutationあり (logic)" / "B: UIのみ" / "C: 両方 (分割要)" に分類しています。移動先の提案（簡易）を併記しています。

| Path | 現状分類 | 説明 | 推奨アクション |
|---|---:|---|---|
| `game/turn-manager.js` | C | 内部で `renderBoard` / `renderCardUI` を直接呼ぶなど UI 呼び出しが混在 | 分割: ルール側はイベント生成に限定、UI 呼び出し部分を `ui/` 側に移動。ファイルを `game/turn-manager.logic.js` / `ui/turn-manager.visual.js` に分割。
| `game/move-executor.js` | C → now improved | 既に `AnimationEngine.play` 呼び出しや UI スケジューラ参照（`setUIImpl`）がある。setTimeout は除去済み（SCHEDULE_CPU_TURN eventを導入） | 分割/移行プラン: `executeMove` は `game` 側の API のまま保ち、視覚再生は UI 側の `PlaybackEngine` に完全移す。`setUIImpl`は暫定的に adapter として残すが移譲を進める。
| `game/turn/pipeline_ui_adapter.js` | C (adapter) | Pipeline の結果を presentationEvents に整形している（UIとの境界として重要） | 残す（adapterの役割を明文化）。将来的に schema のバリデーションを追加。
| `game/special-effects/helpers.js` | A | ロジック専用ヘルパ（getFlipBlockers など）。ブラウザ公開のための `globalThis` 割当は残すが `window` 参照は削除済み | 維持。UIのグローバル公開は `ui/` 側で行う。
| `game/*.js` (その他) | TBD | 広範囲にわたるため逐次分類必要 | 自動スキャン + PR 単位で分類表を更新する。

---

次のステップ（短期）:
1. 上表の「C」に挙がったファイルを優先的に細分化し、最小差分で移譲可能なインターフェースを定義する（`pipeline -> presentationEvents` を安定化）。
2. それぞれの変更に対して単体テストと小さな統合テストを追加する。
3. CI に `check:game-no-ui-calls` を追加したので、PR 作成前に必ず実行してガードを追加。

管理メモ: このドキュメントは Phase 1 の「最初の1日分」の成果物として想定しています。