#!/usr/bin/env python3
"""
Insert UDG placement log in game/card-effects-applier.js using UTF-8 output.
"""

from __future__ import annotations

from pathlib import Path

PATH = Path("game/card-effects-applier.js")


def main() -> int:
    text = PATH.read_text(encoding="utf-8")
    marker = "if (effects.dragonPlaced) {\n"
    if "ultimateDestroyGodPlaced" in text:
        return 0
    if marker not in text:
        raise SystemExit("marker not found")

    insert = (
        "    if (effects.ultimateDestroyGodPlaced) {\n"
        "        addLog(`${ownerName}: 究極破壊神を配置`);\n"
        "    }\n"
    )

    # insert after dragonPlaced block
    idx = text.find(marker)
    block_end = text.find("}", idx)
    if block_end < 0:
        raise SystemExit("dragonPlaced block end not found")
    block_end = text.find("\n", block_end) + 1
    new_text = text[:block_end] + insert + text[block_end:]
    PATH.write_text(new_text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

