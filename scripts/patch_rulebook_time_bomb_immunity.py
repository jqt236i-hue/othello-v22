#!/usr/bin/env python3
"""
ASCII-only patcher to update 01-rulebook.md without embedding Japanese
directly in the command payload (some toolchains choke on non-ASCII).

Adds a TIME_BOMB note: bomb stones are not flippable/swappable, but destroyable.
"""

from __future__ import annotations

from pathlib import Path


RULEBOOK = Path("01-rulebook.md")


def main() -> int:
    text = RULEBOOK.read_text(encoding="utf-8")

    section_header = "10.6 TIME_BOMB\n"
    if section_header not in text:
        raise SystemExit("TIME_BOMB section header not found")

    anchor = "爆発は 石を破壊するだけ\n"
    insert = (
        "爆弾石は 反転不可・交換不可（Protected / PermaProtected と同様）。ただし破壊は可能\n\n"
    )

    if insert in text:
        return 0

    if anchor not in text:
        raise SystemExit("Insertion anchor line not found")

    text = text.replace(anchor, anchor + "\n" + insert)
    RULEBOOK.write_text(text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

