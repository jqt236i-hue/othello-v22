#!/usr/bin/env python3
"""
ASCII-only patcher to update 01-rulebook.md for the new card:
ULTIMATE_DESTROY_GOD (究極破壊神).

This avoids embedding Japanese in the command payload (some toolchains choke),
but the file content written is UTF-8 Japanese.
"""

from __future__ import annotations

from pathlib import Path
import re


RULEBOOK = Path("01-rulebook.md")


UDG_SECTION = """10.13 ULTIMATE_DESTROY_GOD（究極破壊神）

次に置く石を究極破壊神（UDG）にする

持続：**3ターン（所有者のターン開始時に最大3回発動）**

効果：所有者のターン開始時に、UDG が盤上にあるなら周囲8マスの **敵色の石** をすべて破壊する（Destroy）

- **UDG石の耐性**：持続中、UDG は **反転不可・交換不可（Protected相当）**。ただし **破壊は可能**
- **破壊の扱い**：破壊神/時限爆弾と同じ Destroy（EMPTY化）として扱う（破壊はチャージ対象外）
- **処理順（固定）**：
  1) 周囲8マスの敵石を Destroy
  2) remainingTurns -= 1
  3) remainingTurns == 0 なら UDG 自身を Destroy（EMPTY化）
- **アンカー消失時**：ターン開始時点でアンカー座標に「所有者の石」が存在しない場合、効果は即終了する

"""


def insert_udg_section(text: str) -> str:
    if "10.13 ULTIMATE_DESTROY_GOD" in text:
        return text

    # Insert after 10.11 section and before 10.12 cost table.
    marker = "10.12 カードコスト（一次情報）"
    if marker not in text:
        raise SystemExit("Could not find cost table marker (10.12).")

    parts = text.split(marker)
    if len(parts) != 2:
        raise SystemExit("Unexpected rulebook structure around 10.12.")

    before, after = parts
    before = before.rstrip() + "\n\n" + UDG_SECTION + "\n"
    return before + marker + after


def patch_cost_table(text: str) -> str:
    # Add cost 25 entry.
    if "`udg_01`" in text:
        return text

    # Insert between cost 30 and cost 24.
    needle = "- cost 24"
    if needle not in text:
        raise SystemExit("Could not find '- cost 24' in cost table.")

    insert = "\n- cost 25\n  - `udg_01` ? **究極破壊神** (`ULTIMATE_DESTROY_GOD`) ? 枚数: 1\n"
    text = text.replace(needle, insert + "\n" + needle, 1)

    # Update total card count line to 23.
    text = re.sub(r"合計枚数（現状実装準拠）：\d+枚", "合計枚数（現状実装準拠）：23枚", text)
    return text


def patch_10_list(text: str) -> str:
    # Add 10.13 entry in "10. カード効果" list if present.
    if "10.13 ULTIMATE_DESTROY_GOD" in text:
        return text

    lines = text.splitlines(True)
    out = []
    inserted = False
    for line in lines:
        out.append(line)
        if not inserted and line.strip() == "10.11 BREEDING_WILL（繁殖の意志）":
            out.append("10.13 ULTIMATE_DESTROY_GOD（究極破壊神）\n")
            inserted = True
    return "".join(out)


def main() -> int:
    text = RULEBOOK.read_text(encoding="utf-8")
    text = patch_10_list(text)
    text = insert_udg_section(text)
    text = patch_cost_table(text)
    RULEBOOK.write_text(text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

