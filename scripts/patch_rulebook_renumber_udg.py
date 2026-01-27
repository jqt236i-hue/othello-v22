#!/usr/bin/env python3
"""
Renumber sections in 01-rulebook.md:
- UDG becomes 10.12
- Cost table becomes 10.13
"""

from __future__ import annotations

from pathlib import Path


RULEBOOK = Path("01-rulebook.md")


def main() -> int:
    text = RULEBOOK.read_text(encoding="utf-8")
    text = text.replace("10.13 ULTIMATE_DESTROY_GOD（究極破壊神）", "10.12 ULTIMATE_DESTROY_GOD（究極破壊神）")
    text = text.replace("10.12 カードコスト（一次情報）", "10.13 カードコスト（一次情報）")
    RULEBOOK.write_text(text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

