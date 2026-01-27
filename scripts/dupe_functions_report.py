import hashlib
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class FuncDef:
    name: str
    file: str  # posix-style, repo-relative
    start: int
    body: str
    sha256: str
    lines: int
    loaded_order: int | None  # script tag order in index.html (0-based)


FUNC_DECL_RE = re.compile(r"(^|\n)(?P<indent>[ \t]*)(?:async\s+)?function\s+(?P<name>[A-Za-z_$][\w$]*)\s*\(", re.M)


def _normalize_rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def _load_index_scripts(root: Path) -> dict[str, int]:
    index_path = root / "index.html"
    if not index_path.exists():
        return {}
    text = index_path.read_text(encoding="utf-8", errors="ignore")
    # Keep order. Ignore inline scripts.
    srcs = re.findall(r'<script\s+src="([^"]+)"\s*>\s*</script>', text)
    return {src: i for i, src in enumerate(srcs)}


def _extract_function(text: str, start_idx: int) -> str | None:
    # Find opening '{' after the decl.
    open_idx = text.find("{", start_idx)
    if open_idx == -1:
        return None

    depth = 0
    in_str: str | None = None
    esc = False
    in_line_comment = False
    in_block_comment = False

    i = open_idx
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""

        if in_line_comment:
            if ch == "\n":
                in_line_comment = False
            i += 1
            continue

        if in_block_comment:
            if ch == "*" and nxt == "/":
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue

        if in_str is not None:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == in_str:
                in_str = None
        else:
            # Comments (only when not in string)
            if ch == "/" and nxt == "/":
                in_line_comment = True
                i += 2
                continue
            if ch == "/" and nxt == "*":
                in_block_comment = True
                i += 2
                continue

            if ch in ("'", '"', "`"):
                in_str = ch
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return text[start_idx : i + 1]
        i += 1

    return None


def scan_functions(root: Path) -> list[FuncDef]:
    scripts = _load_index_scripts(root)

    js_files: list[Path] = []
    for p in root.rglob("*.js"):
        if "node_modules" in p.parts:
            continue
        if "archive" in p.parts:
            continue
        if ".playwright-mcp" in p.parts:
            continue
        js_files.append(p)

    out: list[FuncDef] = []
    for p in js_files:
        rel = _normalize_rel(p, root)
        loaded_order = scripts.get(rel)

        text = p.read_text(encoding="utf-8", errors="ignore")
        for m in FUNC_DECL_RE.finditer(text):
            name = m.group("name")
            start = m.start("indent")
            body = _extract_function(text, start)
            if body is None:
                continue
            sha = hashlib.sha256(body.encode("utf-8", errors="ignore")).hexdigest()
            out.append(
                FuncDef(
                    name=name,
                    file=rel,
                    start=start,
                    body=body,
                    sha256=sha,
                    lines=body.count("\n") + 1,
                    loaded_order=loaded_order,
                )
            )
    return out


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    defs = scan_functions(root)

    by_name: dict[str, list[FuncDef]] = defaultdict(list)
    for d in defs:
        by_name[d.name].append(d)

    dupes = [(n, ds) for (n, ds) in by_name.items() if len(ds) > 1]
    dupes.sort(key=lambda x: (-len(x[1]), x[0]))

    print(f"DUPLICATE_FUNCTION_NAMES={len(dupes)}")
    print("")

    for name, group in dupes:
        uniq_bodies = {d.sha256 for d in group}
        loaded = [d for d in group if d.loaded_order is not None]
        loaded.sort(key=lambda d: d.loaded_order)  # type: ignore[arg-type]

        flag = ""
        if len(loaded) >= 2:
            flag = " [RUNTIME_OVERRIDE]"

        print(f"NAME={name} OCCURS={len(group)} DISTINCT_BODIES={len(uniq_bodies)} LOADED_DEFS={len(loaded)}{flag}")

        # Show loaded ones first, in actual script order.
        def _fmt(d: FuncDef) -> str:
            order = "-" if d.loaded_order is None else str(d.loaded_order)
            return f"  order={order:>3} hash={d.sha256[:12]} lines={d.lines:4d} file={d.file}"

        for d in loaded:
            print(_fmt(d))
        for d in sorted([d for d in group if d.loaded_order is None], key=lambda d: d.file)[:10]:
            print(_fmt(d))

        if len(loaded) >= 2:
            winner = loaded[-1]
            print(f"  WINNER (last loaded): {winner.file}")
        print("")


if __name__ == "__main__":
    main()
