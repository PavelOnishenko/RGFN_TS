# World map optimization pass #4 — hot-path and redraw-cause pass (April 12, 2026)

## Objective

Incremental optimization on top of the existing chunk cache + invalidation architecture, focused on:

- chunk rebuild hot loops,
- dynamic overlay cost,
- canvas state churn,
- redraw trigger diagnostics,
- diagnostics-panel overhead.

## What changed

### 1) Chunk rebuild hot-path reductions (terrain + roads)

- Terrain chunk redraw now reuses a mutable tile cell descriptor object per chunk redraw instead of allocating a fresh object per tile.
- Terrain chunk redraw hoists render options (`showFogOverlay`, `detailLevel`) out of the nested loops.
- Road chunk redraw no longer mutates `grid` offsets per chunk render. Instead, road rendering now supports a chunk-local coordinate mode.
- Road link sample points are now precomputed once when the road network is generated and reused for subsequent segment extraction.

### 2) Canvas state churn reductions

- Day/night tint draw removed redundant `save`/`restore` in the hot path.
- Chunk drawing now uses layer cell size directly for destination projection.
- Repeated road segment sampling/path setup work was reduced by reusing precomputed road sample points.

### 3) Dynamic overlays separated from static redraw work

- Added a static frame snapshot canvas cache path:
  - when static world layers redraw, renderer snapshots the static result,
  - when only overlay invalidation is active, renderer reuses static snapshot and redraws only dynamic overlays.
- This keeps hover/selection-style interactions from always forcing full static terrain/road/location recomposition in the common case.

### 4) Redraw-cause diagnostics

Added cumulative counters surfaced in `getPerformanceSnapshot().redrawCauses`:

- `cameraMovement`
- `zoomChange`
- `hoverTileChange`
- `selectionChange`
- `diagnosticsUiChange`
- `visibilityFogChange`
- `mapContentChange`
- `forcedFullRedraw`

These counters are incremented at the corresponding invalidation/interaction points.

### 5) Diagnostics overhead optimizations

- Developer profiling panel output now memoizes the JSON payload and avoids re-rendering the text block when telemetry did not change.
- Auto-refresh now resets that memoized key when stopped to keep behavior intuitive.

### 6) Allocation reductions in hot paths

- Reused terrain cell descriptor object in chunk terrain rebuild loops.
- Precomputed road sample point arrays and reused them for segment extraction.
- Avoided repeated temporary structures in cache redraw paths where safe.

## Behavior validation notes

- Cache/invalidation architecture remains in place (no full rewrite).
- World-map tests and developer profiling panel tests still pass after updates.
- Visual behavior remained stable in test-covered paths for terrain/fog/roads/cursor toggles.

## Measured checks run during implementation

- `npm run build:rgfn`
- `node --test rgfn_game/test/systems/worldMap.test.js rgfn_game/test/systems/scenarios/developerEventController.test.js`

Result: all targeted world-map + developer-controller tests passed in this pass.

## Remaining likely hot paths

- Full-detail (`near`) terrain cell rendering still uses per-cell path/pattern/icon work by design.
- Named location rendering at high visible-cell counts can still be significant depending on density.
- Full repository `npm run test:rgfn` currently includes at least one unrelated encounter-system test failure (outside this world-map pass scope).
