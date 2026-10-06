# World Map Stage-2 Rendering Optimizations (April 2026)

This update builds on the existing world-map diagnostics + first-stage redraw gating.

## Implemented optimizations

- Added chunked offscreen caching for world-map **terrain** (low/medium detail tiers).
- Added chunked offscreen caching for world-map **roads** (low/medium detail tiers).
- Added separate redraw accounting across:
  - static terrain/roads,
  - dynamic entities and cursor/selection,
  - full recomposition cycles.
- Added local chunk invalidation hooks for fog/visibility-driven road changes.
- Added zoom tier tracking (`near`/`mid`/`far`) so cache pressure stays bounded and tier transitions are explicit in diagnostics.
- Added visibility-aware runtime behavior:
  - rendering pauses while tab is hidden,
  - redraws are invalidated on resume to preserve correctness.

## Caching and invalidation approach

- Chunk size: fixed tile chunking (`20x20` tiles per chunk).
- Caches are partitioned by layer and tier:
  - `terrain.low`, `terrain.medium`
  - `roads.low`, `roads.medium`
- Cache lifecycle:
  - rebuilt lazily only for visible chunks,
  - invalidated by local visibility/fog updates around player movement,
  - terrain cache revision keyed by terrain revision,
  - road cache revision keyed by terrain + fog revisions.

## New diagnostics surfaced via existing profiling panel JSON

`worldMap.getPerformanceSnapshot()` now includes:

- `cacheHits`
- `cacheRebuilds`
- `chunkRedrawCount`
- `invalidatedChunkCount`
- `staticRedrawCount`
- `dynamicRedrawCount`
- `fullRecompositionCount`
- `renderPausedForVisibility`
- `visibilityPauseCount`

## Test instructions

1. Run build + tests:
   - `npm run test:rgfn`
2. Open dev profiling panel and validate:
   - `cacheHits` rises during panning in same zoom tier.
   - `cacheRebuilds` grows mostly when entering new view/chunks or changing tier.
   - `invalidatedChunkCount` increments on movement/fog updates.
   - `renderPausedForVisibility` toggles to `true` when tab hidden.
3. Pan, hover, and zoom repeatedly:
   - confirm map remains visually correct,
   - confirm no gameplay behavior changes.

## Before/after measurement workflow (using existing diagnostics)

Capture 30s baseline and 30s post-change using the profiling panel JSON output.

Suggested scenario:

1. Start in world mode at default zoom.
2. Perform 10 seconds of keyboard panning.
3. Perform 10 seconds of middle-mouse panning.
4. Perform 10 seconds of mixed hover + zoom in/out in same tier.

Compare these fields:

- `avgFrameMs`
- `drawnTileCount`
- `approximateDrawCalls`
- `fullRecompositionCount`
- `cacheHits` / `cacheRebuilds`
- `chunkRedrawCount`

Expected directional result:

- lower `drawnTileCount` and `approximateDrawCalls` during medium/low tier motion,
- materially higher cache hit ratio during panning,
- reduced full recomposition growth for repeated local interactions.
