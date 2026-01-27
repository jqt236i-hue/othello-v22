# Presentation Events Spec (PoC)

目的: 盤面演出を deterministic な `presentationEvents[]` で表現するための最小仕様（PoC 用）

## イベント基本構造
- type: DESTROY | SPAWN | CHANGE | MOVE
- stoneId: (string|null) — 個体識別子。SPAWN で採番、MOVE/CHANGE は維持、DESTROY で終端
- row, col: 発生座標（MOVE の場合は after 座標）
- prevRow, prevCol: MOVE の前座標（任意）
- ownerBefore/ownerAfter: 石の所有者の変化
- cause: カードID / SYSTEM 等の列挙（例: BREEDING, BOMB, DRAGON, UDG）
- reason: 人間可読のタグ（例: "breeding_spawned", "bomb_explode"）
- meta: オプションメタ（flip_count, remainingTurns など）
- actionId / turnIndex / plyIndex: 再生/重複防止のために含める

## PoC の狙い
- 最小変更で PoC を通し、UI で `SPAWN` を受け取って石が出現することを確認する。
- 確認対象: `breeding_01` の `processBreedingEffectsAtAnchor` が `SPAWN` を発行し、stoneId が付与される。

## 採番ルール（PoC）
- `cardState._nextStoneId` をインクリメントして `s<cnt>` を生成
- 生成位置は `spawn` イベントの `stoneId` に紐づく

## 将来の拡張メモ
- `presentationEvents` は `emitPresentationEvent()` を通して発行する（イベントバス経由やロギングとの整合を考慮）
- 1 action による複数イベントは `actionId` でグルーピングする（UI の chaining/sequence 制御用）
- replay 互換のために、古い replays を読み込む際の stoneId フォールバック処理を設計する
