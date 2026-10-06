#!/usr/bin/env python3
"""Calculate the RGFN project's LOC distribution."""

from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

EXTENSION_LANGUAGE = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".css": "CSS",
    ".html": "HTML",
    ".json": "JSON",
    ".md": "Markdown",
    ".py": "Python",
    ".sh": "Shell",
    ".yml": "YAML",
    ".yaml": "YAML",
}

SKIP_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "coverage",
    "build",
    ".next",
}


@dataclass
class FolderLoc:
    files: int
    lines: int
    per_language: Counter


def iter_source_files(base: Path) -> Iterable[Path]:
    for path in base.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in EXTENSION_LANGUAGE:
            yield path


def count_non_empty_lines(path: Path) -> int:
    text = path.read_text(encoding="utf-8", errors="ignore")
    return sum(1 for line in text.splitlines() if line.strip())


def analyze_folder(base: Path) -> FolderLoc:
    per_language: Counter = Counter()
    files = 0
    lines = 0

    for file_path in iter_source_files(base):
        language = EXTENSION_LANGUAGE[file_path.suffix.lower()]
        loc = count_non_empty_lines(file_path)
        per_language[language] += loc
        files += 1
        lines += loc

    return FolderLoc(files=files, lines=lines, per_language=per_language)


def print_report(title: str, data: FolderLoc) -> None:
    print(f"\n{title}")
    print("-" * len(title))
    print(f"Files counted: {data.files}")
    print(f"Non-empty LOC: {data.lines}")
    if data.lines == 0:
        print("No matching files found.")
        return

    print("Language split:")
    for language, loc in data.per_language.most_common():
        pct = (loc / data.lines) * 100
        print(f"  - {language:<12} {loc:>7} lines ({pct:>6.2f}%)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Calculate RGFN LOC by language.")
    parser.add_argument("--project-root", default=Path(__file__).resolve().parents[1], type=Path, help="RGFN repository root.")
    args = parser.parse_args()

    project_root = args.project_root.resolve()
    if not project_root.exists():
        raise SystemExit(f"RGFN directory not found: {project_root}")

    print_report("RGFN Game", analyze_folder(project_root))


if __name__ == "__main__":
    main()
