# RGFN LOC Analysis Script

A utility script computes **non-empty lines of code (LOC)** by language for the RGFN repository.

## Script location

- `scripts/loc_report.py`

## What it counts

- Traverses files recursively.
- Ignores common generated/vendor folders: `.git`, `node_modules`, `dist`, `coverage`, `build`, `.next`.
- Counts only files with known source/doc extensions (`.ts`, `.js`, `.css`, `.html`, `.json`, `.md`, `.py`, `.sh`, `.yml`, `.yaml`, etc.).
- LOC metric is **non-empty lines**.

## Usage

From repository root:

```bash
python3 scripts/loc_report.py
```

Optional custom paths:

```bash
python3 scripts/loc_report.py --project-root /path/to/rgfn
```

## Output format

The `RGFN Game` section includes:

- files counted,
- total non-empty LOC,
- language breakdown with percentages.

## Example workflow

```bash
python3 scripts/loc_report.py
```

Then copy the language percentages into planning docs or PR notes when estimating implementation complexity or ownership split.
