#!/usr/bin/env python3
"""
Repairs `01-rulebook.md` for sections 10.11 (BREEDING_WILL) and 10.12 (ULTIMATE_DESTROY_GOD).

The file previously got corrupted while inserting 10.13, causing the 10.11 body to disappear.
This script replaces the entire block from "10.11 ..." up to (but not including) "10.13 ...".
"""

from __future__ import annotations

from pathlib import Path


RULEBOOK = Path("01-rulebook.md")


BREEDING_AND_UDG_BLOCK = """10.11 BREEDING_WILL（繁殖の意志）

次に置く石を儀式石（アンカー）にする

持続：**3ターン（所有者のターン開始時に最大3回発動）**
※配置ターンに1回即時生成するため、合計の生成回数は最大4回

処理順：通常の反転（配置による挿み） → 石生成 →（生成石による反転）

効果：**配置したターンの即時**、および **所有者のターン開始時**に、儀式石の周囲8マスから空きマスを **ランダムに1マス** 選び、石を1個生成する（空きがない場合は生成しない）

- **反転**：生成した石で挿める相手石がある場合は通常の反転を行う
  - 反転枚数はチャージ対象
- **ターンカウント**：所有者のターン開始時に残り回数を 1 減らし、その値が 0 以上なら生成する（0 の時も生成する）。生成後、残り回数が 0 の場合は効果終了
- **効果終了**：最終回の生成後、儀式石は破壊される
  - 最後のターンは「石生成 → 儀式石破壊」の順で処理する
- **アンカー消失時**：ターン開始時点でアンカー座標に「所有者の石」が存在しない場合、効果は即終了する


10.12 ULTIMATE_DESTROY_GOD（究極破壊神）

次に置く石を究極破壊神（UDG）にする

持続：**3ターン（所有者のターン開始時に最大3回発動）**
※配置ターンに1回即時発動するため、合計の発動回数は最大4回

効果：**配置したターンの即時**、および **所有者のターン開始時**に、UDG が盤上にあるなら周囲8マスの **敵色の石** をすべて破壊する（Destroy）

- **UDG石の耐性**：持続中、UDG は **反転不可・交換不可（Protected相当）**。ただし **破壊は可能**
- **破壊の扱い**：破壊神/時限爆弾と同じ Destroy（EMPTY化）として扱う（破壊はチャージ対象外）
- **処理順（固定）**：
  1) 周囲8マスの敵石を Destroy
  2) remainingTurns -= 1
  3) remainingTurns == 0 なら UDG 自身を Destroy（EMPTY化）
- **アンカー消失時**：ターン開始時点でアンカー座標に「所有者の石」が存在しない場合、効果は即終了する

"""


def main() -> int:
    text = RULEBOOK.read_text(encoding="utf-8")

    start = text.find("10.11 BREEDING_WILL（繁殖の意志）")
    end = text.find("10.13 カードコスト（一次情報）")
    if start < 0 or end < 0 or end <= start:
        raise SystemExit("Could not locate 10.11..10.12 range in rulebook")

    new_text = text[:start] + BREEDING_AND_UDG_BLOCK + text[end:]
    RULEBOOK.write_text(new_text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
