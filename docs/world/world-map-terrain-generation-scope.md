# World Map Terrain Generation Scope (RGFN)

## Current terrain generation policy

As of this update, **procedural world map generation only emits**:

- `grass`
- `forest`
- `water`

`mountain` and `desert` remain valid terrain types in the broader codebase (rendering, combat palettes, LoS rules, manual/test overrides), but they are intentionally **not produced** by world generation right now.

## Why this was changed

- Mountain/desert were present in settings but not needed in current map plans.
- Keeping dormant generation branches increased configuration noise and made outcomes harder to reason about.
- This pass simplifies generation without flattening map quality by preserving:
  - forest quantile targeting (`forestCoverage`),
  - seeded lakes/rivers,
  - highland-to-forest conversion in elevated/moist cells.

## Stability/quality guardrails

- Forest coverage still comes from quantile selection (`getForestCoverageTarget` + `getQuantileThreshold`), so biome distribution remains seed-stable.
- Water remains a combination of explicit lake/river carving and suitability checks.
- Highlands no longer become a separate `mountain` biome; they can still resolve to `forest` when moisture supports it, otherwise they fall back to `grass`.

## Config notes

`balanceConfig.worldMap` now uses:

- `terrainWeights.grass`
- `terrainWeights.forest`
- `terrainWeights.water`
- `highlandThreshold` (renamed from `mountainThreshold`)

Removed map-generation-only config knobs:

- `terrainWeights.mountain`
- `terrainWeights.desert`
- `desertHeatThreshold`
- `desertDrynessThreshold`

## Testing note

A regression test was added to ensure generated worlds contain no `mountain` or `desert` cells.
