"""Clean and regroup the raw crawler output.

Reads  out/        (never modified)
Writes out-clean/  (same modules, cleaned formatting, one file per submodule section)

Fixes applied:
  - eyebrow line "TeachingStreaming Responses·16 min" -> "*Teaching | Streaming Responses | 16 min*"
  - whitespace-only lines become empty, runs of blank lines collapse
  - Markdown tables get the separator row after the header row
  - the duplicated "### Title" under "## Title" is dropped
  - modules whose raw export is one file per screen are grouped by the section named in each eyebrow
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "out"
DST = ROOT / "out-clean"

# longest first so "Watch Out" wins over a shorter prefix
TYPES = ["Module Complete", "Module Quiz", "Watch Out", "Orientation", "Teaching", "Checkpoint", "Cumulative",
         "Exercise", "Recap", "Identify", "Glossary", "Fix", "Takeaways", "Key terms", "Complete"]
# the player's section labels for wrap-up screens are inconsistent across modules; normalise them
ALIASES = {"Key Terms": "Glossary", "Developer Path": "Module Complete", "Module-Wide": "Cumulative Task",
           "All topics": "Cumulative Task"}
TIME = re.compile(r"\s*[·\s]\s*(\d+)\s*min\s*$")


def slug(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return (s[:60] or "section")


def parse_eyebrow(line: str):
    """Return (type, section, minutes) or None when the line is not an eyebrow."""
    m = TIME.search(line)
    if not m or len(line) > 120:
        return None
    rest = line[:m.start()].strip(" ·")
    rest = re.sub(r"^(Module \d|Developer Module \d)\s*", "", rest)
    for t in TYPES:
        if rest.startswith(t):
            sec = rest[len(t):].strip(" ·") or t
            sec = ALIASES.get(sec, sec)
            if t == "Recap" and re.fullmatch(r"Module \d", sec):
                sec = "Key Takeaways"
            return t, sec, m.group(1)
    return "", ALIASES.get(rest, rest), m.group(1)


def fix_tables(lines):
    out, i = [], 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("|") and (i == 0 or not lines[i - 1].startswith("|")):
            cols = ln.count(" | ") + 1
            out.append(ln.rstrip())
            out.append("|" + "---|" * cols)
            i += 1
            continue
        out.append(ln.rstrip())
        i += 1
    return out


def clean(text: str) -> str:
    lines = [ln.rstrip() for ln in text.splitlines()]
    res, last_h2 = [], None
    for idx, ln in enumerate(lines):
        if ln.startswith("## "):
            last_h2 = ln[3:].strip()
        elif ln.startswith("### ") and last_h2 and ln[4:].strip() == last_h2:
            last_h2 = None
            continue  # duplicate of the "## " heading just above
        elif ln.strip() and (idx > 0):
            prev = next((l for l in reversed(res) if l.strip()), "")
            if prev.startswith("## "):
                eb = parse_eyebrow(ln.strip())
                if eb:
                    ln = "*" + " | ".join(p for p in (eb[0], eb[1], eb[2] + " min") if p) + "*"
        res.append(ln)
    res = fix_tables(res)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(res)).strip() + "\n"


def screens_of(path: Path):
    """Split a raw per-screen file into (title, body, section)."""
    txt = path.read_text(encoding="utf-8")
    m = re.match(r"# .*?\n\n## (.*?)\n\n(.*)", txt, re.S)
    title, body = (m.group(1), m.group(2)) if m else (path.stem, txt)
    first = next((l.strip() for l in body.splitlines() if l.strip()), "")
    eb = parse_eyebrow(first)
    return title, body, (eb[1] if eb else None)


def main():
    if not SRC.is_dir():
        sys.exit(f"missing {SRC}")
    DST.mkdir(exist_ok=True)
    for mod in sorted(p for p in SRC.iterdir() if p.is_dir()):
        out_dir = DST / mod.name
        out_dir.mkdir(parents=True, exist_ok=True)
        files = sorted(f for f in mod.glob("[0-9]*.md"))
        raw_index = (mod / "index.md").read_text(encoding="utf-8") if (mod / "index.md").exists() else ""
        # modules 1-2 were already grouped by the crawler, so some section has more than one screen
        multi = any(int(n) > 1 for n in re.findall(r"\((\d+) screens\)", raw_index))
        index = [f"# {mod.name}", ""]
        if multi:  # modules 1-2: already one file per section
            for f in files:
                (out_dir / f.name).write_text(clean(f.read_text(encoding="utf-8")), encoding="utf-8")
                index.append(f"- {f.name}")
        else:  # modules 3-5: group consecutive screens that share a section
            groups = []  # [(section, [(title, body)])] in screen order; a new group starts when the section changes
            for f in files:
                title, body, section = screens_of(f)
                # screens without a recognisable eyebrow stay with the previous section
                section = section or (groups[-1][0] if groups else "Overview")
                if not groups or groups[-1][0] != section:
                    groups.append((section, []))
                groups[-1][1].append((title, body))
            for n, (key, items) in enumerate(groups, 1):
                parts = [f"# {key}", ""]
                for title, body in items:
                    parts += [f"## {title}", "", body.strip(), ""]
                name = f"{n:02d}-{slug(key)}.md"
                (out_dir / name).write_text(clean("\n".join(parts)), encoding="utf-8")
                index.append(f"- {name} ({len(items)} screens)")
        (out_dir / "index.md").write_text("\n".join(index) + "\n", encoding="utf-8")
        print(mod.name, "->", len(list(out_dir.glob('[0-9]*.md'))), "files")


if __name__ == "__main__":
    main()
