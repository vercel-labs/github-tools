#!/usr/bin/env python3
"""
Search reference files.
Usage:
    python search_references.py --list
    python search_references.py --tag <tag>
    python search_references.py --search <query>
"""

import sys
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_ROOT = SCRIPT_DIR.parent
REFS_DIR = (SKILL_ROOT / "references").resolve()

_INJECTION_RE = re.compile(
    r"^\s*("
    r"you are|you must|ignore previous|disregard|forget all|override|"
    r"system:|<\||<system>|<\/?instruction"
    r")",
    re.IGNORECASE,
)


def _validate_refs_dir() -> None:

    if not str(REFS_DIR).startswith(str(SKILL_ROOT)):
        print(f"Error: references directory ({REFS_DIR}) is outside the skill root ({SKILL_ROOT})")
        sys.exit(1)
    if not REFS_DIR.is_dir():
        print(f"Error: references directory not found: {REFS_DIR}")
        sys.exit(1)


def sanitize_body(text: str) -> str:

    return "\n".join(
        line for line in text.splitlines()
        if not _INJECTION_RE.match(line)
    )


def parse_frontmatter(text: str) -> tuple[dict, str]:

    if not text.startswith("---"):
        return {}, text

    end = text.find("---", 3)
    if end == -1:
        return {}, text

    raw = text[3:end].strip()
    body = text[end + 3:].strip()
    metadata = {}

    for line in raw.splitlines():
        match = re.match(r'^(\w+):\s*(.+)$', line)
        if not match:
            continue
        key = match.group(1)
        value = match.group(2).strip()

        if (value.startswith('"') and value.endswith('"')) or \
           (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]

        if value.startswith("[") and value.endswith("]"):
            items = [item.strip().strip('"').strip("'")
                     for item in value[1:-1].split(",")]
            value = [item for item in items if item]

        metadata[key] = value

    return metadata, body


def load_references() -> list[dict]:

    _validate_refs_dir()

    results = []
    for md_file in sorted(REFS_DIR.glob("*.md")):

        resolved = md_file.resolve()
        if not str(resolved).startswith(str(SKILL_ROOT)):
            continue

        text = md_file.read_text()
        metadata, body = parse_frontmatter(text)

        body = sanitize_body(body)

        results.append({
            "file": str(md_file),
            "name": metadata.get("name", md_file.stem),
            "description": metadata.get("description", ""),
            "tags": metadata.get("tags", []),
            "body": body,
        })

    return results


def print_ref(ref: dict, include_body: bool = False) -> None:

    tags = ref["tags"]
    tag_str = ", ".join(tags) if isinstance(tags, list) else str(tags)
    print(f"  Name:        {ref['name']}")
    print(f"  Description: {ref['description']}")
    print(f"  Tags:        {tag_str}")
    print(f"  File:        {ref['file']}")
    if include_body and ref.get("body"):
        print("  --- BEGIN REFERENCE CONTENT ---")
        print(ref["body"])
        print("  --- END REFERENCE CONTENT ---")
    print()


def cmd_list(refs: list[dict]) -> None:

    print(f"Found {len(refs)} reference files:\n")
    for ref in refs:
        print_ref(ref, include_body=False)


def cmd_tag(refs: list[dict], tag: str) -> None:

    tag_lower = tag.lower()
    matches = [r for r in refs if tag_lower in
               [t.lower() for t in r["tags"]] if isinstance(r["tags"], list)]

    if not matches:
        print(f"No references found with tag: {tag}")
        return

    print(f"Found {len(matches)} reference(s) matching tag '{tag}':\n")
    for ref in matches:
        print_ref(ref, include_body=True)


def cmd_search(refs: list[dict], query: str) -> None:

    query_lower = query.lower()
    matches = []

    for ref in refs:
        tag_str = " ".join(ref["tags"]) if isinstance(ref["tags"], list) else str(ref["tags"])
        searchable = " ".join([
            ref["name"],
            ref["description"],
            tag_str,
            ref["body"],
        ]).lower()

        if query_lower in searchable:
            matches.append(ref)

    if not matches:
        print(f"No references found matching: {query}")
        return

    print(f"Found {len(matches)} reference(s) matching '{query}':\n")
    for ref in matches:
        print_ref(ref, include_body=True)


def main():
    if len(sys.argv) < 2:
        print(__doc__.strip())
        sys.exit(1)

    refs = load_references()
    arg = sys.argv[1]

    if arg == "--list":
        cmd_list(refs)
    elif arg == "--tag":
        if len(sys.argv) < 3:
            print("Usage: search_references.py --tag <tag>")
            sys.exit(1)
        cmd_tag(refs, sys.argv[2])
    elif arg == "--search":
        if len(sys.argv) < 3:
            print("Usage: search_references.py --search <query>")
            sys.exit(1)
        cmd_search(refs, sys.argv[2])
    else:
        print(f"Unknown argument: {arg}")
        print(__doc__.strip())
        sys.exit(1)


if __name__ == "__main__":
    main()