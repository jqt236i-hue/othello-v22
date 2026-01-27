#!/usr/bin/env python3
"""
Fixes 01-rulebook.md after an earlier patch inserted the 10.13 header
in the wrong place (inside 10.11 section).

Ensures:
- Any stray standalone "10.13 ..." lines are removed
- The full 10.13 section exists exactly once before 10.12
"""

from __future__ import annotations

from pathlib import Path
import re


RULEBOOK = Path("01-rulebook.md")

LIST_LINE = "10.13 ULTIMATE_DESTROY_GOD（究極破壊神）"

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


def remove_all_udg_headers(text: str) -> str:
    # Remove any standalone header lines (they may have been injected in the wrong spot).
    # This will also remove the correct section header if it exists; we'll reinsert the full section later.
    lines = text.splitlines(True)
    out = []
    for ln in lines:
        if ln.strip() == LIST_LINE:
            continue
        out.append(ln)
    return "".join(out)


def remove_existing_udg_section(text: str) -> str:
    # Remove an existing UDG section if already present (to avoid duplicates).
    # Match from header to the next "10.12" marker.
    pattern = re.compile(r"^10\.13 ULTIMATE_DESTROY_GOD（究極破壊神）\n(?:.*\n)*?(?=^10\.12 カードコスト（一次情報）\n)", re.M)
    return re.sub(pattern, "", text)


def insert_udg_section_before_cost_table(text: str) -> str:
    marker = "10.12 カードコスト（一次情報）"
    idx = text.find(marker)
    if idx < 0:
        raise SystemExit("Could not find 10.12 marker")
    before = text[:idx].rstrip() + "\n\n" + UDG_SECTION + "\n"
    after = text[idx:]
    return before + after


def main() -> int:
    text = RULEBOOK.read_text(encoding="utf-8")
    text = remove_existing_udg_section(text)
    text = remove_all_udg_headers(text)
    text = insert_udg_section_before_cost_table(text)
    RULEBOOK.write_text(text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

