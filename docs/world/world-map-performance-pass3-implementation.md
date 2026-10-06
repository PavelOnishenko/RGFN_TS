# World map performance optimization pass #3 — implementation log (March 2026)

## Scope

This pass targets the RGFN world map rendering path in `rgfn_game/js/systems/world/WorldMap.ts`.

Goals:

- Reduce redraw work outside low detail mode.
- Avoid expensive terrain cache rebuilds triggered by frequent fog updates.
- Keep visual semantics (fog + unknown + hidden overlays) unchanged.

## What was changed

### 1) Terrain cache generalized from low-only to low+medium

- Replaced single `lowDetailLayerCache` with `terrainLayerCaches` keyed by detail level (`low`, `medium`).
- Added `TerrainLayerCache` shape with:
  - cache canvas,
  - cell size,
  - terrain revision,
  - detail level.

### 2) Cache now stores terrain-only layer

- During cache build, cells are rendered with `showFogOverlay: false`.
- This means cache content is stable when only fog visibility changes.

### 3) Fog overlay rendered as lightweight visible-bounds pass

- New pass draws only non-discovered states (`unknown`, `hidden`) over the cached terrain.
- Uses existing renderer logic to preserve visual behavior.

### 4) Cache invalidation policy changed

Cache is rebuilt only when terrain/layout-relevant values change:

- detail level,
- `cellSize`,
- `terrainRevision`.

Fog changes no longer trigger full terrain cache rebuild.

## Why this should improve performance

- Player movement updates visibility often (`refreshVisibility`); old policy could invalidate cache too frequently.
- Decoupling fog from terrain cache removes repeated full-map terrain repaints caused by visibility updates.
- Medium zoom mode now gets cached terrain blits (previously full per-cell terrain repaint each frame).

## Added regression test

`rgfn_game/test/systems/worldMap.test.js` now includes:

- **WorldMap medium-detail caching avoids full terrain redraw on subsequent frames**

The test uses mocked `document.createElement` and `drawImage` to enable cache path in Node test runtime and asserts first draw performs substantially more `drawCell` calls than second draw (cache reuse).

## Validation commands

- `npm run build:rgfn`
- `node --test rgfn_game/test/systems/worldMap.test.js rgfn_game/test/systems/worldMapRenderer.test.js`

Both pass after this change.

## Known repository-wide test status

- `npm test` still reports unrelated failures outside this scope:
  - missing `eva_game/dist` artifacts for eva tests,
  - existing projectile test failures in root game suites.

These were pre-existing and are not modified by this pass.

## Next profiling step (recommended)

Run browser Performance recordings for three scenarios:

1. constant pan (60s),
2. repeated movement with fog updates (60s),
3. zoom-in/out stress (60s),

and compare before/after:

- P95 frame time,
- long tasks count,
- input-to-frame latency,
- sustained CPU usage trend.
